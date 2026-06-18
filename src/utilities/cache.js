import { isFunction, randomId } from './core.js';

const instances = new Map();
const timers = new Map();

/**
 * 创建或获取带缓存的类实例。
 *
 * 支持按 cacheKey 缓存实例，并可通过 ttl 设置空闲释放时间。
 * @template T
 * @param {new (...args:any[])=>T} Class 构造函数。
 * @param {any[]} [args=[]] 构造参数。
 * @param {string} [cacheKey=""] 缓存键；为空时自动生成。
 * @param {boolean} [isReset=false] 是否忽略已有缓存并重新创建。
 * @param {number|null} [ttl=null] 空闲释放时间，单位毫秒。
 * @returns {T} 实例代理。
 */
export const singleton = (
  Class,
  args = [],
  cacheKey = '',
  isReset = false,
  ttl = null
) => {
  if (!isFunction(Class)) {
    throw new Error('First argument expects a class/constructor function.');
  }
  if (!Array.isArray(args)) {
    throw new Error('Second argument must be an array of arguments.');
  }
  if (typeof cacheKey !== 'string') {
    throw new Error('Third argument expects a string.');
  }
  if (typeof isReset !== 'boolean') {
    throw new Error('Fourth argument expects a boolean.');
  }
  if (typeof ttl !== 'number' && ttl !== null) {
    throw new Error('Fifth argument expects a number or null.');
  }

  const key = cacheKey.trim() === '' ? randomId() : cacheKey;

  if (instances.has(key) && !isReset) {
    return instances.get(key).proxy;
  }

  const instance = new Class(...args);
  const proxy = new Proxy(instance, {
    get(target, name, receiver) {
      if (ttl) refreshTimer(key, ttl);
      return Reflect.get(target, name, receiver);
    },
    set(target, name, value, receiver) {
      return Reflect.set(target, name, value, receiver);
    },
  });

  instances.set(key, { instance, proxy });
  return proxy;
};

function refreshTimer(key, ttl) {
  if (timers.has(key)) {
    clearTimeout(timers.get(key));
  }

  const timeId = setTimeout(() => {
    release(key);
  }, ttl);

  timers.set(key, timeId);
}

/**
 * 释放指定缓存实例。
 *
 * 若实例存在 destroy 方法，会先调用 destroy。
 * @param {string} key 缓存键。
 * @returns {void}
 */
export function release(key) {
  if (instances.has(key)) {
    const { instance } = instances.get(key);

    if (typeof instance.destroy === 'function') {
      try {
        instance.destroy();
      } catch {
        throw new Error(
          `release(): destroy() failed on instance with key "${key}".`
        );
      }
    }

    instances.delete(key);
  }

  if (timers.has(key)) {
    clearTimeout(timers.get(key));
    timers.delete(key);
  }
}

/**
 * 释放 singleton 管理的全部实例。
 * @returns {void}
 */
export function destroyAll() {
  for (const { instance } of instances.values()) {
    if (typeof instance.destroy === 'function') {
      try {
        instance.destroy();
      } catch {}
    }
  }

  instances.clear();

  for (const timerId of timers.values()) {
    clearTimeout(timerId);
  }

  timers.clear();
}

/**
 * 简易服务缓存容器。
 *
 * 用于按 key 缓存工厂创建的服务实例，并提供销毁能力。
 */
export const service = {
  instances: new Map(),

  get(key, factory) {
    if (!this.instances.has(key)) {
      this.instances.set(key, factory());
    }
    return this.instances.get(key);
  },

  destroy(key) {
    if (this.instances.has(key)) {
      const instance = this.instances.get(key);
      if (instance.destroy) {
        instance.destroy();
      }
      this.instances.delete(key);
    }
  },

  destroyAll() {
    for (const instance of this.instances.values()) {
      if (instance.destroy) {
        instance.destroy();
      }
    }
    this.instances.clear();
  },
};

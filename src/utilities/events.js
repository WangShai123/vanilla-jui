const NOOP = () => {};

/**
 * 绑定 DOM 事件并返回一次性解绑函数。
 *
 * 语法糖，不做target等参数的校验。
 *
 * @param {EventTarget} target 事件目标。
 * @param {string} type 事件类型。
 * @param {EventListenerOrEventListenerObject} handler 事件处理器。
 * @param {AddEventListenerOptions|boolean} [options] 事件选项。
 * @returns {Function} 解绑函数，可重复调用。
 */
export function listen(target, type, handler, options) {
  let active = true;
  target.addEventListener(type, handler, options);
  return () => {
    if (!active) return;
    active = false;
    target.removeEventListener(type, handler, options);
  };
}

/**
 * 创建实例级事件管理器。
 *
 * - `on()` 绑定事件并自动记录解绑函数。
 * - 同一个 key 重复绑定时会先解绑旧事件，避免组件重渲染时重复监听。
 * - `off(key)` 和 `clear()` 用于跨作用域精确释放。
 * @returns {{on: Function, off: Function, clear: Function, size: Function}}
 */
export function createEventManager() {
  const records = new Map();

  const off = (key) => {
    const dispose = records.get(key);
    if (!dispose) return false;
    dispose();
    records.delete(key);
    return true;
  };

  return {
    on(key, target, type, handler, options) {
      if (typeof key !== 'string' || key.trim() === '') {
        throw new TypeError('EventManager.on: key expects a non-empty string.');
      }

      off(key);

      if (target == null) return NOOP;

      const dispose = listen(target, type, handler, options);
      records.set(key, dispose);
      return dispose;
    },

    off,

    clear() {
      for (const dispose of records.values()) dispose();
      records.clear();
    },

    size() {
      return records.size;
    },
  };
}

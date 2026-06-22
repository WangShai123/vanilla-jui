import { createDeepStore, flushSync } from 'vanilla-signal';

import { createEventManager } from '../utilities/events.js';

/**
 * 轻量级组件基类，集成 vanilla-signal 响应式状态和插件系统
 * 为所有 UI 组件提供统一的状态管理、生命周期钩子和插件支持
 */
export default class Component {
  /** 全局插件注册表，所有新创建的组件实例会自动安装这些插件 */
  static globalPlugins = new Map();

  /**
   * @param {Object} props - 组件初始属性配置
   */
  constructor(props = {}) {
    /** 组件属性配置对象 */
    this.props = props || {};

    /** DOM 引用容器，存储根元素及其他 DOM 节点引用 */
    this.dom = { root: null };

    /** 已安装的插件映射表 */
    this.plugins = new Map();

    /** 资源清理管理器，包含事件监听器和插件的清理函数 */
    this.cleanup = { events: createEventManager(), plugins: new Map() };

    /** 内部事件监听器注册表，用于生命周期和自定义事件 */
    this._listeners = {
      init: [], // 初始化完成事件
      beforeUpdate: [], // 更新前事件
      afterUpdate: [], // 更新后事件
      destroy: [], // 销毁事件
    };

    /** 响应式状态存储，使用 vanilla-signal 的深层响应式 store */
    this.state = createDeepStore({});

    /** 运行时状态标记 */
    this.runtime = { destroyed: false };

    /** 自动安装全局插件 */
    this.installGlobalPlugins();
  }

  /**
   * 获取组件的根 DOM 元素
   * @returns {HTMLElement|null} 根 DOM 元素或 null
   */
  get root() {
    return this.dom?.root || null;
  }

  /**
   * 设置组件的根 DOM 元素
   * @param {HTMLElement} value - 要设置的根 DOM 元素
   */
  set root(value) {
    if (!this.dom) this.dom = {};
    this.dom.root = value;
  }

  /**
   * 安装实例插件
   * 插件可以是函数形式 plugin(instance, options) 或对象形式 { install(instance, options) }
   * 插件应返回清理函数或清理对象，在组件销毁时自动执行
   * @param {Function|Object} plugin - 插件函数或包含 install 方法的插件对象
   * @param {Object} [options] - 插件配置选项
   * @returns {Component} 返回当前实例，支持链式调用
   */
  use(plugin, options) {
    if (!plugin) return this;
    const cleanup =
      typeof plugin === 'function'
        ? plugin(this, options)
        : plugin.install?.(this, options);
    this.cleanup.plugins.set(plugin, cleanup);
    return this;
  }

  /**
   * 注册事件监听器
   * 用于监听组件生命周期事件（init、beforeUpdate、afterUpdate、destroy）或自定义事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 事件回调函数
   * @returns {Component} 返回当前实例，支持链式调用
   */
  on(event, callback) {
    if (!this._listeners[event] || typeof callback !== 'function') return this;
    this._listeners[event].push(callback);
    return this;
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 要移除的回调函数引用
   * @returns {Component} 返回当前实例，支持链式调用
   */
  off(event, callback) {
    if (!this._listeners[event]) return this;
    this._listeners[event] = this._listeners[event].filter(
      (listener) => listener !== callback
    );
    return this;
  }

  /**
   * 安装全局插件到当前实例
   * 遍历全局插件注册表并依次安装
   * @private
   */
  installGlobalPlugins() {
    for (const plugin of Component.globalPlugins.values()) {
      this.use(plugin);
    }
  }

  /**
   * 注册全局插件
   * 所有之后创建的组件实例都会自动安装此插件
   * @static
   * @param {string} name - 插件名称标识
   * @param {Function|Object} plugin - 插件函数或插件对象
   */
  static useGlobal(name, plugin) {
    if (!name || !plugin) return;
    Component.globalPlugins.set(name, plugin);
  }

  /**
   * 触发指定事件，执行所有注册的监听器
   * @param {string} event - 事件名称
   * @param {...*} args - 传递给监听器的参数
   * @returns {Component} 返回当前实例，支持链式调用
   */
  emit(event, ...args) {
    const listeners = this._listeners[event];
    if (!listeners) return this;
    for (const listener of listeners) {
      try {
        listener(...args);
      } catch {
        // 忽略监听器执行错误，防止影响其他监听器
      }
    }
    return this;
  }

  /**
   * 初始化组件
   * 合并传入的属性，调用 onInit 钩子（如果存在），并触发 init 事件
   * @param {Object} [props={}] - 初始化属性配置
   * @returns {Component} 返回当前实例，支持链式调用
   * @throws {Error} 如果组件已被销毁则抛出异常
   */
  init(props = {}) {
    if (this.runtime.destroyed)
      throw new Error('Component.init: instance destroyed');
    if (props && typeof props === 'object' && !Array.isArray(props)) {
      this.props = Object.assign({}, this.props, props);
    }
    if (typeof this.onInit === 'function') this.onInit(this.props);
    this.emit('init', this.props);
    return this;
  }

  /**
   * 批量更新响应式状态
   * 支持两种调用方式：setState(key, value) 或 setState({ key1: value1, key2: value2 })
   * 使用 flushSync 确保状态更新的同步性和批量处理
   * @param {string|Object} keyOrPatch - 状态键名或包含多个键值对的补丁对象
   * @param {*} [value] - 当第一个参数为字符串时的状态值
   * @returns {Component} 返回当前实例，支持链式调用
   * @throws {Error} 如果组件已被销毁或参数格式不正确则抛出异常
   */
  setState(keyOrPatch = {}, value) {
    if (this.runtime.destroyed)
      throw new Error('Component.setState: instance destroyed');

    const patch =
      typeof keyOrPatch === 'string' && arguments.length > 1
        ? { [keyOrPatch]: value }
        : keyOrPatch;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new Error('Component.setState: expects a plain object patch.');
    }

    flushSync(() => {
      for (const [k, v] of Object.entries(patch)) {
        this.state[k] = v;
      }
    });
    return this;
  }

  /**
   * 更新组件属性和触发更新生命周期
   * 合并新的属性配置，触发 beforeUpdate 和 afterUpdate 事件
   * 子类可以重写 onUpdate 方法实现自定义更新逻辑
   * @param {Object} [propsPatch={}] - 要合并的属性补丁对象
   * @param {Object} [options] - 更新选项
   * @param {boolean} [options.force=false] - 是否强制更新（由子类处理）
   * @returns {Component} 返回当前实例，支持链式调用
   * @throws {Error} 如果组件已被销毁则抛出异常
   */
  update(propsPatch = {}, { force = false } = {}) {
    if (this.runtime.destroyed)
      throw new Error('Component.update: instance destroyed');
    if (propsPatch && typeof propsPatch === 'object') {
      this.props = Object.assign({}, this.props, propsPatch);
    }
    this.emit('beforeUpdate', propsPatch, { force });
    if (typeof this.onUpdate === 'function')
      this.onUpdate(propsPatch, { force });
    this.emit('afterUpdate', propsPatch, { force });
    return this;
  }

  /**
   * 销毁组件实例
   * 执行 onDestroy 钩子，触发 destroy 事件，清理所有插件和资源
   * 这是组件生命周期的最后一步，销毁后实例不可再使用
   */
  destroy() {
    if (this.runtime.destroyed) return;
    this.runtime.destroyed = true;

    if (typeof this.onDestroy === 'function') this.onDestroy();
    this.emit('destroy');

    // 执行所有插件的清理函数
    for (const cleanup of this.cleanup.plugins.values()) {
      try {
        if (typeof cleanup === 'function') cleanup();
        else if (cleanup && typeof cleanup.destroy === 'function')
          cleanup.destroy();
      } catch {
        // 忽略清理函数执行错误
      }
    }
    this.cleanup.plugins.clear();
    this.cleanup.events.clear();
    this.dom = { root: null };
    this.state = null;
  }
}

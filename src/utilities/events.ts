/**
 * 绑定 DOM 事件并返回一次性解绑函数。
 *
 * @template T - 事件目标类型（如 HTMLElement, Window 等）
 * @template K - 事件类型字符串（如 'click', 'scroll'）
 * @param {T} target - 事件目标。
 * @param {K} type - 事件类型。
 * @param {(this: T, ev: HTMLElementEventMap[K extends keyof HTMLElementEventMap ? K : never]) => any} handler - 事件处理器。
 * @param {boolean | AddEventListenerOptions} [options] - 事件选项。
 * @returns {() => void} 解绑函数，可重复调用。
 */
export function listen<T extends EventTarget, K extends string>(
  target: T,
  type: K,
  handler: (this: T, ev: Event) => any,
  options?: boolean | AddEventListenerOptions
): () => void {
  let active = true;
  target.addEventListener(type, handler as EventListener, options);

  return () => {
    if (!active) return;
    active = false;
    target.removeEventListener(type, handler as EventListener, options);
  };
}

/**
 * 事件管理器实例的接口定义
 */
export interface IEventManager {
  /**
   * 绑定事件并自动记录解绑函数。
   * 同一个 key 重复绑定时会先解绑旧事件，避免组件重渲染时重复监听。
   */
  on<T extends EventTarget, K extends string>(
    key: string,
    target: T,
    type: K,
    handler: (this: T, ev: Event) => any,
    options?: boolean | AddEventListenerOptions
  ): () => void;

  /** 根据 key 解绑特定事件 */
  off(key: string): boolean;

  /** 清除所有已绑定的事件 */
  clear(): void;

  /** 获取当前绑定的事件数量 */
  size(): number;
}

/**
 * 创建实例级事件管理器。
 *
 * - `on()` 绑定事件并自动记录解绑函数。
 * - 同一个 key 重复绑定时会先解绑旧事件，避免组件重渲染时重复监听。
 * - `off(key)` 和 `clear()` 用于跨作用域精确释放。
 */
export function createEventManager(): IEventManager {
  const records = new Map<string, () => void>();

  const off = (key: string): boolean => {
    const dispose = records.get(key);
    if (!dispose) return false;
    dispose();
    records.delete(key);
    return true;
  };

  return {
    on<T extends EventTarget, K extends string>(
      key: string,
      target: T,
      type: K,
      handler: (this: T, ev: Event) => any,
      options?: boolean | AddEventListenerOptions
    ): () => void {
      if (typeof key !== 'string' || key.trim() === '') {
        throw new TypeError('EventManager.on: key expects a non-empty string.');
      }

      // 先解绑旧事件
      off(key);

      // 防御性编程：如果 target 为空，返回空函数
      if (target == null) return () => {};

      const dispose = listen(target, type, handler, options);
      records.set(key, dispose);
      return dispose;
    },

    off,

    clear(): void {
      for (const dispose of records.values()) dispose();
      records.clear();
    },

    size(): number {
      return records.size;
    },
  };
}

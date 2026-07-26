/**
 * 定义可销毁服务的接口契约
 */
export interface Destroyable {
  destroy?: () => void;
}

/**
 * 简易服务缓存容器。
 * 用于按 key 缓存工厂创建的服务实例，并提供销毁能力。
 */
export const service = (() => {
  // 使用闭包封装 Map，避免 this 指向问题，实现私有化
  const instances = new Map<string, Destroyable>();

  return {
    /**
     * 获取服务实例。如果不存在，则通过工厂函数创建并缓存。
     * @template T - 期望返回的服务类型（需继承自 Destroyable）
     * @param {string} key - 服务的唯一标识
     * @param {() => T} factory - 创建服务实例的工厂函数
     * @returns {T} 服务实例
     */
    get<T extends Destroyable>(key: string, factory: () => T): T {
      if (!instances.has(key)) {
        instances.set(key, factory());
      }
      return instances.get(key) as T;
    },

    /**
     * 销毁指定 key 的服务实例并从缓存中移除。
     * @param {string} key - 服务的唯一标识
     */
    destroy(key: string): void {
      const instance = instances.get(key);
      if (instance) {
        if (typeof instance.destroy === 'function') {
          instance.destroy();
        }
        instances.delete(key);
      }
    },

    /**
     * 销毁所有缓存的服务实例并清空容器。
     */
    destroyAll(): void {
      for (const instance of instances.values()) {
        if (typeof instance.destroy === 'function') {
          instance.destroy();
        }
      }
      instances.clear();
    },
  };
})();

/**
 * 定时器管理器
 */
export const timer = {
  // 存储定时器 { key: timerId }
  timers: {} as Record<string, ReturnType<typeof setTimeout>>,

  /**
   * 注册并开始一个定时器
   * @param {string} key - 定时器的唯一标识
   * @param {number} duration - 延迟执行的时间（毫秒）
   * @param {function} callback - 延迟执行的回调函数
   */
  start(key: string, duration: number, callback: () => void) {
    // 1. 如果该 key 已经存在，先清除旧的定时器，防止重复触发
    if (this.timers[key]) {
      clearTimeout(this.timers[key]);
    }
    // 2. 设置新的定时器，并保存其 ID
    this.timers[key] = setTimeout(() => {
      callback();
      // 3. 执行完毕后，自动从管理器中注销该定时器
      delete this.timers[key];
    }, duration);
  },

  /**
   * 明确注销一个定时器
   * @param {string} key - 需要取消的定时器唯一标识
   */
  cancel(key: string) {
    if (this.timers[key]) {
      clearTimeout(this.timers[key]);
      // 从管理器中移除该记录
      delete this.timers[key];
    }
  },
};

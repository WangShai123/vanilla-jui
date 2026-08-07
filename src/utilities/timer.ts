const timers: Record<string, ReturnType<typeof setTimeout>> = {};

export const timer = {
  timers,
  start(key: string, duration: number, callback: () => void): void {
    if (timers[key]) clearTimeout(timers[key]);
    timers[key] = setTimeout(() => {
      callback();
      delete timers[key];
    }, duration);
  },
  cancel(key: string): void {
    if (timers[key]) {
      clearTimeout(timers[key]);
      delete timers[key];
    }
  },
};

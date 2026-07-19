export const JUI_DEBUG_DISABLED =
  typeof __JUI__ !== 'undefined' && __JUI__.debug === false;

const NOOP = () => {};

let activeCleanup = null;

/**
 * 判断当前构建是否启用调试验证。
 * @returns {boolean}
 */
export function isDebug() {
  return !JUI_DEBUG_DISABLED;
}

/**
 * 判断当前构建是否需要启用防调试守卫。
 * @returns {boolean}
 */
export function shouldPreventDebugger() {
  return (
    JUI_DEBUG_DISABLED &&
    typeof window !== 'undefined' &&
    typeof window.setInterval === 'function'
  );
}

/**
 * 启用防调试守卫。
 *
 * 守卫通过 debugger 暂停造成的时间差判断调试行为；不会使用死循环阻塞页面。
 * @param {object} [options={}] 守卫配置。
 * @param {number} [options.interval=1000] 检测间隔，单位毫秒。
 * @param {number} [options.threshold=120] 触发判定的暂停阈值，单位毫秒。
 * @param {'blank'|'reload'|'throw'|Function} [options.action='blank'] 触发后的动作。
 * @param {string} [options.redirect='about:blank'] action 为 blank 时跳转地址。
 * @returns {Function} 清理函数；未启用时返回空函数。
 */
export function preventDebugger(options = {}) {
  if (!shouldPreventDebugger()) return NOOP;
  if (activeCleanup) return activeCleanup;

  const interval = normalizeNumber(options.interval, 1000, 100);
  const threshold = normalizeNumber(options.threshold, 120, 30);
  const action = options.action || 'blank';
  const redirect = options.redirect || 'about:blank';

  let disposed = false;

  const cleanup = () => {
    disposed = true;
    window.clearInterval(timer);
    activeCleanup = null;
  };

  const detect = () => {
    if (disposed) return;

    const startedAt = Date.now();
    runDebuggerStatement();
    const elapsed = Date.now() - startedAt;

    if (elapsed >= threshold) {
      cleanup();
      handleDebuggerDetected(action, redirect, elapsed);
    }
  };

  const timer = window.setInterval(detect, interval);
  activeCleanup = cleanup;
  detect();

  return cleanup;
}

function normalizeNumber(value, fallback, min) {
  return Number.isFinite(value) && value >= min ? value : fallback;
}

function runDebuggerStatement() {
  // eslint-disable-next-line no-debugger
  debugger;
}

function handleDebuggerDetected(action, redirect, elapsed) {
  if (typeof action === 'function') {
    action({ elapsed });
    return;
  }

  if (action === 'reload') {
    window.location.reload();
    return;
  }

  if (action === 'throw') {
    throw new Error('JUI: debugger detected.');
  }

  window.location.replace(redirect);
}

// preventDebugger();

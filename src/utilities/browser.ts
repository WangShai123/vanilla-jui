declare global {
  interface Navigator {
    userAgentData?: {
      mobile: boolean;
      brands: Array<{ brand: string; version: string }>;
      platform: string;
      getHighEntropyValues: (hints: string[]) => Promise<any>;
    };
  }
  interface Window {
    opera?: string;
  }
}

/**
 * 判断当前环境是否为移动设备。
 * @returns {boolean}
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // 1. 优先使用现代 Client Hints API
  if (
    navigator.userAgentData &&
    typeof navigator.userAgentData.mobile === 'boolean'
  ) {
    return navigator.userAgentData.mobile;
  }

  // 提取 UA 字符串并做安全处理
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';

  // 2. 核心 UA 正则匹配
  const mobileUaRegex =
    /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUa = mobileUaRegex.test(ua);

  // 3. 排除平板设备 (Tablet)
  const isTabletUa = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);

  // 4. 综合判定逻辑（针对 iOS 和 Android 分别处理）
  if (isMobileUa && !isTabletUa) {
    // 对于 iOS 设备，UA 匹配通常足够
    if (
      /iPhone|iPod|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    ) {
      return true;
    }
    // Android 设备需结合屏幕尺寸或触摸能力，避免大屏安卓平板被误判
    if (/Android/i.test(ua)) {
      const hasTouchSupport =
        'maxTouchPoints' in navigator
          ? navigator.maxTouchPoints > 0
          : 'ontouchstart' in window;
      const screenWidth = Math.min(window.screen.width, window.screen.height);
      return screenWidth <= 768 || hasTouchSupport;
    }
  }

  // 5. 针对 iOS 13+ iPad 伪装成 Mac 的特殊兜底
  const isLikelyIPad = /Macintosh|MacIntel/i.test(ua);
  if (isLikelyIPad) {
    const hasTouchSupport =
      'maxTouchPoints' in navigator
        ? navigator.maxTouchPoints > 0
        : 'ontouchstart' in window;
    const screenWidth = Math.min(window.screen.width, window.screen.height);
    return hasTouchSupport && screenWidth <= 768;
  }

  return false;
}

/**
 * 复制文本到剪贴板。
 *
 * 优先使用 Clipboard API，不可用时降级到 textarea + execCommand。
 * @param {unknown} text 需要复制的文本（接受任意类型，内部会安全转换为字符串）。
 * @returns {Promise<boolean>} 是否复制成功。
 */
export async function copy(text: unknown): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false);
  }

  const value = String(text);

  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return fallbackCopy(value);
    }
  }

  return fallbackCopy(value);
}

/**
 * 降级复制方案：使用隐藏的 textarea 和 execCommand
 * @param {string} text 需要复制的文本
 * @returns {boolean} 是否复制成功
 */
function fallbackCopy(text: string): boolean {
  let textarea = null;

  try {
    textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    if (textarea && textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
  }
}

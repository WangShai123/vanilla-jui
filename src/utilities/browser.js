/**
 * 判断当前环境是否为移动设备。
 * @returns {boolean}
 */
export function isMobile() {
  // 1. 优先使用现代 Client Hints API (如果浏览器支持)
  // 这是目前最准确、最符合隐私规范的方式
  if (
    navigator.userAgentData &&
    typeof navigator.userAgentData.mobile === 'boolean'
  ) {
    return navigator.userAgentData.mobile;
  }

  const ua = navigator.userAgent || navigator.vendor || window.opera;

  // 2. 核心 UA 正则匹配 (覆盖主流手机及移动端浏览器)
  // 注意：这里包含了 Mobile, iPhone, Android 等，但排除了明确标识为 Tablet 的安卓设备
  const mobileUaRegex =
    /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUa = mobileUaRegex.test(ua);

  // 3. 排除平板设备 (Tablet)
  // 安卓平板通常包含 "Android" 但不包含 "Mobile"，或者明确包含 "Tablet"
  const isTabletUa = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);

  // 4. 触摸能力检测 (作为兜底和验证)
  // 现代 PC 也可能有触摸屏，因此触摸仅作为辅助验证，不能单独作为判定标准
  const hasTouchSupport =
    'maxTouchPoints' in navigator
      ? navigator.maxTouchPoints > 0
      : 'ontouchstart' in window;

  // 5. 屏幕尺寸检测 (CSS 像素)
  // 取宽高中较小的一边，防止横屏状态下宽度超过常规手机阈值
  const screenWidth = Math.min(window.screen.width, window.screen.height);
  const isSmallScreen = screenWidth <= 768;

  // 6. 综合判定逻辑
  // 必须是移动端 UA，且不是平板，并且具备小屏幕或触摸特征
  // 这样能有效防止桌面浏览器修改 UA 导致的误判，以及 iPad 伪装成 Mac 的问题
  if (isMobileUa && !isTabletUa) {
    // 对于 iOS 设备，UA 匹配通常足够；对于 Android，需要屏幕尺寸辅助确认
    if (
      /iPhone|iPod|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    ) {
      return true;
    }
    // Android 设备需结合屏幕尺寸或触摸能力，避免大屏安卓平板被误判
    if (/Android/i.test(ua)) {
      return isSmallScreen || hasTouchSupport;
    }
  }

  // 7. 针对 iOS 13+ iPad 伪装成 Mac 的特殊兜底
  // 如果 UA 显示为 Mac，但支持多点触控且屏幕较小，极大概率是 iPad
  const isLikelyIPad =
    /Macintosh|MacIntel/i.test(ua) && hasTouchSupport && isSmallScreen;

  return isLikelyIPad;
}

/**
 * 复制文本到剪贴板。
 *
 * 优先使用 Clipboard API，不可用时降级到 textarea + execCommand。
 * @param {*} text 需要复制的文本。
 * @returns {Promise<boolean>} 是否复制成功。
 */
export async function copy(text) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false);
  }

  const value = typeof text === 'string' ? text : String(text);

  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    return navigator.clipboard
      .writeText(value)
      .then(() => true)
      .catch(() => fallbackCopy(value));
  }

  return Promise.resolve(fallbackCopy(value));
}

function fallbackCopy(text) {
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
    return !!document.execCommand('copy');
  } catch {
    return false;
  } finally {
    if (textarea && textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
  }
}

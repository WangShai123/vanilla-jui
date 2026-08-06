declare global {
  interface Navigator {
    userAgentData?: {
      mobile: boolean;
      brands: Array<{ brand: string; version: string }>;
      platform: string;
      getHighEntropyValues: (
        hints: string[]
      ) => Promise<Record<string, unknown>>;
    };
    msMaxTouchPoints?: number;
  }
  interface Window {
    opera?: string;
  }
}

/**
 * 采用 MDN 推荐的组合策略：特性检测优先，UA 嗅探兜底
 */
export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;

  if (typeof navigator.userAgentData?.mobile === 'boolean') {
    return navigator.userAgentData.mobile;
  }

  const ua = navigator.userAgent || '';
  if (
    /\b(BlackBerry|webOS|iPhone|IEMobile|Android|Windows Phone|iPad|iPod)\b/i.test(
      ua
    )
  ) {
    return true;
  }

  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }

  return (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 820px)').matches
  );
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

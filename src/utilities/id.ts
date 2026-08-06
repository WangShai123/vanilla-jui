/**
 * 生成标准 UUID v4 字符串。
 *
 * 优先使用浏览器原生的 crypto.randomUUID()，
 * 不支持时使用 polyfill 实现。
 *
 * @returns UUID v4 字符串（如 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）
 */
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto.getRandomValues !== 'function') {
    throw new Error('Your browser is too old to support secure login.');
  }
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * 生成适合 DOM id 的随机字符串。
 *
 * 使用安全的随机数生成器，生成的字符串适合作为 HTML 元素的 id 属性。
 *
 * @param [length=8] - 字符串长度，范围 1 到 87381
 * @returns 随机字符串
 * @throws {Error} 长度不在有效范围内时抛出错误
 */
export function randomId(length: number = 8): string {
  if (!Number.isInteger(length) || length < 1 || length > 87381) {
    throw new Error('Length must be an integer between 1 and 87381');
  }

  const byteLength = Math.ceil((length * 3) / 4);
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);

  return base64.substring(0, length).replace(/\+/g, '-').replace(/\//g, '_');
}

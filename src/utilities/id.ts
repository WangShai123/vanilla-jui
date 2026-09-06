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

/**
 * 查询参数值类型
 */
type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | QueryParamValue[]
  | { [key: string]: QueryParamValue };

/**
 * 查询参数对象类型
 */
type QueryParams = Record<string, QueryParamValue>;

/**
 * 对查询参数进行 SHA-256 哈希编码，生成用于缓存的 key
 *
 * @param params - 查询参数对象
 * @param bytes - 取哈希前 N 字节，默认为 8，范围 1-32
 * @returns 36 进制哈希字符串
 *
 * @example
 * ```typescript
 * const key = await hashQueryParams({ page: 1, sort: 'desc' });
 * // 返回: "2k7x9f3m4n5p"
 * ```
 */
export async function hashQueryParams(
  params: QueryParams,
  bytes: number = 8
): Promise<string> {
  // 1. 参数验证
  if (typeof params !== 'object' || params === null) {
    throw new TypeError('params must be a non-null object');
  }

  if (bytes < 1 || bytes > 32) {
    throw new RangeError('bytes must be between 1 and 32');
  }

  // 2. 排序并规范化参数
  const normalized: QueryParams = {};
  const sortedKeys = Object.keys(params).sort();

  for (const key of sortedKeys) {
    const value = params[key];
    // 字符串 trim 处理
    normalized[key] = typeof value === 'string' ? value.trim() : value;
  }

  // 3. 序列化
  const str = JSON.stringify(normalized);
  const buffer = new TextEncoder().encode(str);

  // 4. SHA-256 哈希
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);

  // 5. 取前 N 字节（防越界）
  const safeBytes = Math.min(bytes, hashBuffer.byteLength);
  const slice = new Uint8Array(hashBuffer, 0, safeBytes);

  // 6. 转为 BigInt 再转 36 进制
  let num = 0n;
  for (const byte of slice) {
    num = (num << 8n) | BigInt(byte);
  }

  return num.toString(36);
}

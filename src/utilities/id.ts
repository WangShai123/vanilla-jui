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

// const SHA256_K = new Uint32Array([
//   0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
//   0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
//   0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
//   0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
//   0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
//   0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
//   0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
//   0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
//   0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
//   0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
//   0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
// ]);

// const SHA256_INITIAL = new Uint32Array([
//   0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
//   0x1f83d9ab, 0x5be0cd19,
// ]);

// function rotateRight(value: number, bits: number): number {
//   return (value >>> bits) | (value << (32 - bits));
// }

// function sha256Fallback(input: Uint8Array): Uint8Array {
//   const message = new Uint8Array(Math.ceil((input.length + 9) / 64) * 64);
//   message.set(input);
//   message[input.length] = 0x80;

//   const bitLength = BigInt(input.length) * 8n;
//   for (let i = 0; i < 8; i += 1) {
//     message[message.length - 1 - i] = Number(
//       (bitLength >> BigInt(i * 8)) & 0xffn
//     );
//   }

//   const hash = new Uint32Array(SHA256_INITIAL);
//   const words = new Uint32Array(64);

//   for (let offset = 0; offset < message.length; offset += 64) {
//     for (let i = 0; i < 16; i += 1) {
//       const index = offset + i * 4;
//       words[i] =
//         ((message[index] << 24) |
//           (message[index + 1] << 16) |
//           (message[index + 2] << 8) |
//           message[index + 3]) >>>
//         0;
//     }

//     for (let i = 16; i < 64; i += 1) {
//       const s0 =
//         rotateRight(words[i - 15], 7) ^
//         rotateRight(words[i - 15], 18) ^
//         (words[i - 15] >>> 3);
//       const s1 =
//         rotateRight(words[i - 2], 17) ^
//         rotateRight(words[i - 2], 19) ^
//         (words[i - 2] >>> 10);
//       words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
//     }

//     let a = hash[0];
//     let b = hash[1];
//     let c = hash[2];
//     let d = hash[3];
//     let e = hash[4];
//     let f = hash[5];
//     let g = hash[6];
//     let h = hash[7];

//     for (let i = 0; i < 64; i += 1) {
//       const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
//       const ch = (e & f) ^ (~e & g);
//       const temp1 = (h + s1 + ch + SHA256_K[i] + words[i]) >>> 0;
//       const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
//       const maj = (a & b) ^ (a & c) ^ (b & c);
//       const temp2 = (s0 + maj) >>> 0;

//       h = g;
//       g = f;
//       f = e;
//       e = (d + temp1) >>> 0;
//       d = c;
//       c = b;
//       b = a;
//       a = (temp1 + temp2) >>> 0;
//     }

//     hash[0] = (hash[0] + a) >>> 0;
//     hash[1] = (hash[1] + b) >>> 0;
//     hash[2] = (hash[2] + c) >>> 0;
//     hash[3] = (hash[3] + d) >>> 0;
//     hash[4] = (hash[4] + e) >>> 0;
//     hash[5] = (hash[5] + f) >>> 0;
//     hash[6] = (hash[6] + g) >>> 0;
//     hash[7] = (hash[7] + h) >>> 0;
//   }

//   const output = new Uint8Array(32);
//   for (let i = 0; i < hash.length; i += 1) {
//     output[i * 4] = hash[i] >>> 24;
//     output[i * 4 + 1] = hash[i] >>> 16;
//     output[i * 4 + 2] = hash[i] >>> 8;
//     output[i * 4 + 3] = hash[i];
//   }
//   return output;
// }

async function sha256(input: Uint8Array): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle && typeof subtle.digest === 'function') {
    const source = new ArrayBuffer(input.byteLength);
    new Uint8Array(source).set(input);
    return new Uint8Array(await subtle.digest('SHA-256', source));
  }
  // return sha256Fallback(input);
  throw new Error('hashQueryParams only works in secure context.');
}

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
  const hashBuffer = await sha256(buffer);

  // 5. 取前 N 字节（防越界）
  const safeBytes = Math.min(bytes, hashBuffer.byteLength);
  const slice = hashBuffer.subarray(0, safeBytes);

  // 6. 转为 BigInt 再转 36 进制
  let num = 0n;
  for (const byte of slice) {
    num = (num << 8n) | BigInt(byte);
  }

  return num.toString(36);
}

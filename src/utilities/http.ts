/**
 * 发送 JSON POST 请求并解析 JSON 响应。
 * @template T - 期望返回的 JSON 数据类型
 * @param {string} url - 请求地址
 * @param {unknown} body - 请求体，会被 JSON.stringify
 * @param {RequestInit} [options] - 透传给 fetch 的请求配置（排除 method 和 body）
 * @returns {Promise<T>} 解析后的 JSON 响应体
 */
export async function postJson<T = unknown>(
  url: string,
  body: unknown,
  options: Omit<RequestInit, 'method' | 'body'> = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  return res.json() as Promise<T>;
}

/**
 * 当前站点 WordPress REST API 根地址。
 * @type {string}
 */
export const restUrl: string =
  typeof window !== 'undefined' ? `${window.location.origin}/wp-json` : '';

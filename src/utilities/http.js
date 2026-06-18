/**
 * 发送 JSON POST 请求并解析 JSON 响应。
 * @param {string} url 请求地址。
 * @param {*} body 请求体，会被 JSON.stringify。
 * @param {RequestInit} [options] 透传给 fetch 的请求配置。
 * @returns {Promise<any>} JSON 响应体。
 */
export async function postJson(url, body, options = {}) {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    method: options.method || 'POST',
    headers,
    body: JSON.stringify(body),
  });

  return res.json();
}

/**
 * 当前站点 WordPress REST API 根地址。
 * @type {string}
 */
export const restUrl =
  typeof window !== 'undefined' ? `${window.location.origin}/wp-json` : '';

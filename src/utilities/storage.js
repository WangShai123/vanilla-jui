/**
 * 读取 Cookie。
 * @param {string} name Cookie 名称。
 * @returns {string|null}
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

/**
 * 写入 Cookie。
 * @param {string} name Cookie 名称。
 * @param {string} value Cookie 值。
 * @param {number} [seconds=86400] 有效期，单位秒。
 * @returns {boolean} 写入后是否能读取到相同值。
 */
export function setCookie(name, value, seconds = 60 * 60 * 24) {
  if (typeof document === 'undefined') return false;

  const expires = new Date(Date.now() + seconds * 1000).toUTCString();
  document.cookie = [
    `${name}=${value}`,
    `expires=${expires}`,
    'path=/',
    'sameSite=strict',
  ].join('; ');

  return getCookie(name) === value;
}

/**
 * 删除 Cookie。
 * @param {string} name Cookie 名称。
 * @returns {boolean} 删除后是否不可读取。
 */
export function removeCookie(name) {
  if (typeof document === 'undefined') return true;

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  return !getCookie(name);
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const escapedName = escapeRegExp(name);
  const match = document.cookie.match(
    new RegExp('(?:^|;\\s*)' + escapedName + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function setCookie(
  name: string,
  value: string,
  seconds: number = 60 * 60 * 24 // 默认有效期为 24 小时
): boolean {
  if (typeof document === 'undefined') return false;

  const encodedName = encodeURIComponent(name);
  const encodedValue = encodeURIComponent(value);

  let cookieStr = `${encodedName}=${encodedValue}; path=/; SameSite=Lax`;

  if (seconds > 0) {
    const expires = new Date(Date.now() + seconds * 1000).toUTCString();
    cookieStr += `; expires=${expires}`;
  }

  if (location.protocol === 'https:') {
    cookieStr += '; Secure';
  }

  document.cookie = cookieStr;

  return getCookie(name) === value;
}

export function removeCookie(name: string): boolean {
  if (typeof document === 'undefined') return true;

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  return !getCookie(name);
}

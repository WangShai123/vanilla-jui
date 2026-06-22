# Storage Utilities

从 `vanilla-jui` 导入：

```js
import { getCookie, setCookie, removeCookie } from 'vanilla-jui';
```

---

## getCookie

读取指定名称的 Cookie 值。

```
getCookie(name) → string | null
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | Cookie 名称 |

**返回值**: `string | null` — Cookie 值，不存在或 SSR 环境返回 `null`。

```js
getCookie('theme');    // 'dark'（示例）
getCookie('missing');  // null
```

---

## setCookie

写入 Cookie。默认有效期 24 小时。

```
setCookie(name, value, seconds?) → boolean
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `name` | `string` | — | Cookie 名称 |
| `value` | `string` | — | Cookie 值 |
| `seconds` | `number` | `86400` | 有效期（秒），默认 1 天 |

**返回值**: `boolean` — 写入后能否读取到相同值。SSR 环境返回 `false`。

```js
// 写入，有效期 1 天（默认）
setCookie('theme', 'dark'); // → true

// 自定义有效期：1 小时
setCookie('session', 'abc123', 3600); // → true
```

---

## removeCookie

删除指定 Cookie。

```
removeCookie(name) → boolean
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | Cookie 名称 |

**返回值**: `boolean` — 删除后是否不可读取。SSR 环境返回 `true`。

```js
removeCookie('theme'); // → true（已删除）
```

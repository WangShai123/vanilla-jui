# HTTP Utilities

从 `vanilla-jui` 导入：

```js
import { postJson, restUrl } from 'vanilla-jui';
```

---

## postJson

发送 JSON POST 请求并解析 JSON 响应。自动设置 `Content-Type: application/json`。

```
postJson(url, body, options?) → Promise<any>
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | `string` | — | 请求地址 |
| `body` | `*` | — | 请求体，会被 `JSON.stringify` |
| `options` | `RequestInit` | `{}` | 透传给 `fetch` 的请求配置 |

**返回值**: `Promise<any>` — 解析后的 JSON 响应体。

```js
// 基本 POST
const data = await postJson('/api/users', { name: 'Alice', age: 25 });
console.log(data); // → 响应 JSON

// 带自定义 headers
const res = await postJson('/api/login', { user: 'admin', pass: '123' }, {
  headers: { 'Authorization': 'Bearer token...' },
});

// 覆盖 method
const del = await postJson('/api/users/1', null, { method: 'DELETE' });
```

---

## restUrl

当前站点 WordPress REST API 根地址（仅浏览器环境有效）。

```
restUrl → string
```

**类型**: `string`

```js
// 浏览器中
restUrl; // 'https://example.com/wp-json'

// Node/SSR 环境
restUrl; // ''
```

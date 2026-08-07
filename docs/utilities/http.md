# HTTP Utilities

```ts
import { postJson, restUrl } from 'vanilla-jui';
```

## `restUrl`

模块加载时根据 `window.location.origin` 生成当前站点的 WordPress REST 根地址：

```ts
restUrl; // "https://example.com/wp-json"
```

非浏览器环境为 `''`。它是加载时常量，history/navigation 后不会重新计算。

## `postJson<T>(url, body, options?)`

固定发送 `POST` 请求，以 `JSON.stringify(body)` 作为 body，并返回
`response.json()` 的 Promise。

```ts
const result = await postJson<{ id: number }>('/api/items', { title: 'One' }, {
  signal: controller.signal,
  headers: { Authorization: 'Bearer token' },
});
```

`options` 类型为 `Omit<RequestInit, 'method' | 'body'>`。调用方不能覆盖 method 或
body；其他 fetch 选项会透传。未提供 `Content-Type` 时自动设置
`application/json`，自定义值会保留。

该函数不检查 `response.ok`，也不包装网络错误或 JSON 解析错误。非 2xx 响应若包含
合法 JSON 仍会正常返回；需要状态码策略、重试和统一错误模型时应使用专门的 request
层。

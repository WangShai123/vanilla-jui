# ID Utilities

```ts
import { randomId, uuid } from 'vanilla-jui';
```

## `uuid()`

生成 RFC 4122 v4 形式的 UUID。优先使用 `crypto.randomUUID()`；否则通过
`crypto.getRandomValues()` 生成 16 字节并设置 version/variant 位。

```ts
const id = uuid(); // 例如 "3b241101-e2bb-4d7a-8702-9e3c0a2b6c7d"
```

环境既不支持 `randomUUID` 也不支持 `getRandomValues` 时抛出错误。

## `randomId(length = 8)`

使用 `crypto.getRandomValues()` 生成 Base64 URL-safe 的短字符串，适合作为当前文档
内的 DOM id 或内部 key。

```ts
randomId();
randomId(16);
```

`length` 必须是 `1..87381` 的整数，否则抛出 `Error`。该函数不是 UUID，也不承诺
跨系统的永久唯一性；安全令牌应使用专门的协议与编码。

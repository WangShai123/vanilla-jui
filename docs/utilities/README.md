# Utilities API

`vanilla-jui` 内置工具方法，均可通过顶层导入直接使用：

```js
import { hasOwn, canRenderDOM, listen, timer } from 'vanilla-jui';
```

## 模块列表

| 模块 | 说明 | 文档 |
|------|------|------|
| **core** | 类型判断、参数校验、ID 生成 | [core.md](./core.md) |
| **dom** | DOM 环境检测、元素查询、内容归一化 | [dom.md](./dom.md) |
| **events** | 事件绑定/解绑、实例级事件管理器 | [events.md](./events.md) |
| **cache** | 单例缓存、TTL 释放、服务容器 | [cache.md](./cache.md) |
| **http** | JSON POST 请求、WordPress REST 地址 | [http.md](./http.md) |
| **storage** | Cookie 读写删除 | [storage.md](./storage.md) |
| **browser** | 移动端检测、剪贴板复制 | [browser.md](./browser.md) |

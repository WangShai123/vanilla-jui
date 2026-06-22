# Cache Utilities

从 `vanilla-jui` 导入：

```js
import { singleton, release, destroyAll, service } from 'vanilla-jui';
```

---

## singleton

创建或获取带缓存的类实例。支持按 `cacheKey` 缓存，可通过 `ttl` 设置空闲释放时间。返回值为原始实例的 Proxy，每次访问属性会刷新 TTL 计时器。

```
singleton(Class, args?, cacheKey?, isReset?, ttl?) → T
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `Class` | `new (...args) => T` | — | 构造函数 |
| `args` | `any[]` | `[]` | 传递给构造函数的参数数组 |
| `cacheKey` | `string` | `''` | 缓存键，为空时自动生成随机 key |
| `isReset` | `boolean` | `false` | 为 `true` 时忽略已有缓存并重新创建 |
| `ttl` | `number \| null` | `null` | 空闲释放时间（毫秒），`null` 表示不过期 |

**返回值**: `T` — 实例的 Proxy 代理对象。相同 `cacheKey` 返回同一代理。

**抛出**: `Error` — `Class` 不是构造函数或参数类型错误时。

```js
class Tooltip {
  constructor(container) { this.container = container; }
  destroy() { console.log('destroyed'); }
}

// 按 cacheKey 缓存
const tip1 = singleton(Tooltip, [document.body], 'my-tooltip');
const tip2 = singleton(Tooltip, [document.body], 'my-tooltip');
tip1 === tip2; // true（同一代理）

// 强制重建
const tip3 = singleton(Tooltip, [document.body], 'new-tooltip', true);

// 手动释放
release('my-tooltip');
```

**带 TTL 的缓存：**

```js
// 5 秒无访问自动销毁
const cached = singleton(Tooltip, [el], 'tooltip-1', false, 5000);

// 每次属性访问都重置计时器
cached.container; // 重置 5 秒倒计时
// 5 秒内无新访问 → 自动调用 destroy() 并从缓存移除
```

---

## release

释放指定缓存实例。若实例存在 `destroy()` 方法会先调用。

```
release(key) → void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `key` | `string` | 缓存键 |

```js
release('my-tooltip'); // 销毁并从缓存移除
```

---

## destroyAll

释放 `singleton` 管理的全部实例，清空所有缓存和定时器。

```
destroyAll() → void
```

```js
destroyAll(); // 全部销毁
```

---

## service

简易服务缓存容器。按 `key` 缓存工厂创建的实例，首次 `get` 时调用工厂创建，后续直接返回缓存。

```
service.get(key, factory) → T
service.destroy(key) → void
service.destroyAll() → void
```

### service.get

| 参数 | 类型 | 说明 |
|------|------|------|
| `key` | `string` | 服务标识 |
| `factory` | `() => T` | 工厂函数，首次调用时执行 |

**返回值**: `T` — 缓存的实例。

### service.destroy

| 参数 | 类型 | 说明 |
|------|------|------|
| `key` | `string` | 服务标识 |

销毁实例（调用 `destroy()`）并从缓存移除。

### service.destroyAll

销毁所有缓存实例并清空。

```js
class EventBus {
  constructor() { this.listeners = []; }
  on(evt, fn) { this.listeners.push({ evt, fn }); }
  destroy() { this.listeners = []; }
}

const bus1 = service.get('event-bus', () => new EventBus());
const bus2 = service.get('event-bus', () => new EventBus());
bus1 === bus2; // true

service.destroy('event-bus');  // 销毁单个
service.destroyAll();          // 销毁全部
```

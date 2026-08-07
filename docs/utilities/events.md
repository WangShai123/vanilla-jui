# Event Utilities

```ts
import { createEventManager, listen } from 'vanilla-jui';
```

## `listen(target, type, handler, options?)`

调用 `addEventListener` 并返回幂等解绑函数。解绑使用与绑定相同的 `handler` 和
`options`。

```ts
const stop = listen(window, 'resize', () => measure());
stop();
stop(); // 无副作用
```

## `createEventManager()`

创建实例级事件注册表。每个监听器由非空字符串 key 标识。

| 方法 | 返回值 | 行为 |
| --- | --- | --- |
| `on(key, target, type, handler, options?)` | `() => void` | 同 key 重绑前先解绑旧监听器 |
| `off(key)` | `boolean` | 解绑并删除；不存在时返回 `false` |
| `clear()` | `void` | 解绑全部已记录监听器 |
| `size()` | `number` | 当前记录数 |

```ts
const events = createEventManager();
events.on('root-click', root, 'click', handleClick);
events.on('window-resize', window, 'resize', handleResize, { passive: true });

componentOwn(() => events.clear());
```

重复 key 是替换语义，适合组件重建后重新绑定。空 key 抛出 `TypeError`。`on()` 的
返回函数只解绑底层事件，不会从 manager 的 Map 删除记录；需要同步更新注册表时用
`off(key)`，生命周期结束统一使用 `clear()`。

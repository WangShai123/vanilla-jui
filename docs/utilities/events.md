# Events Utilities

从 `vanilla-jui` 导入：

```js
import { listen, createEventManager } from 'vanilla-jui';
```

---

## listen

绑定 DOM 事件并返回一次性解绑函数。支持所有合法 `EventTarget`（HTMLElement、document、window、AbortSignal 等）。

```
listen(target, type, handler, options?) → () => void
```

| 参数      | 类型                                 | 默认值      | 说明                             |
| --------- | ------------------------------------ | ----------- | -------------------------------- |
| `target`  | `EventTarget`                        | —           | 事件目标                         |
| `type`    | `string`                             | —           | 事件类型                         |
| `handler` | `Function \| EventListenerObject`    | —           | 事件处理器                       |
| `options` | `AddEventListenerOptions \| boolean` | `undefined` | 传递给 `addEventListener` 的选项 |

**返回值**: `Function` — 解绑函数，可重复调用（多次调用无副作用）。

**抛出**: `TypeError` — 参数类型不合法时。

```js
const btn = document.querySelector('#my-btn');

const off = listen(btn, 'click', (e) => {
  console.log('clicked!', e.target);
});

// 解绑
off();

// 重复调用安全
off(); // 无副作用
```

---

## createEventManager

创建实例级事件管理器。同一 `key` 重复绑定时自动先解绑旧事件，避免组件重渲染时重复监听。

```
createEventManager() → { on, off, clear, size }
```

**返回值**: 事件管理器对象：

| 方法    | 签名                                                  | 说明                                  |
| ------- | ----------------------------------------------------- | ------------------------------------- |
| `on`    | `(key, target, type, handler, options?) → () => void` | 绑定事件并记录解绑函数                |
| `off`   | `(key) → boolean`                                     | 精确解绑指定 key 的事件，返回是否成功 |
| `clear` | `() → void`                                           | 清理所有已绑定事件                    |
| `size`  | `() → number`                                         | 返回当前监听数量                      |

### on 参数

| 参数      | 类型                                 | 默认值      | 说明                                                              |
| --------- | ------------------------------------ | ----------- | ----------------------------------------------------------------- |
| `key`     | `string`                             | —           | 事件标识（唯一 key）                                              |
| `target`  | `EventTarget \| null`                | —           | 事件目标。`null` 时跳过绑定，返回空解绑函数（便于条件性绑定场景） |
| `type`    | `string`                             | —           | 事件类型                                                          |
| `handler` | `Function \| EventListenerObject`    | —           | 事件处理器                                                        |
| `options` | `AddEventListenerOptions \| boolean` | `undefined` | `addEventListener` 选项                                           |

```js
const events = createEventManager();

events.on('resize', window, 'resize', () => {
  console.log('window resized');
});

events.on('click-overlay', overlay, 'click', () => {
  overlay.classList.add('hidden');
});

events.off('resize'); // 精确解绑 → true
events.clear(); // 清理所有
events.size(); // → 0
```

**抛出**: `TypeError` — `key` 非法类型或空字符串时。

**典型用法 — 组件 `destroy()` 清理：**

```js
class MyComponent {
  constructor(el) {
    this.events = createEventManager();
    this.events.on('click', el, 'click', this.handleClick);
    this.events.on('resize', window, 'resize', this.handleResize);
  }

  handleClick(e) {
    console.log('clicked');
  }
  handleResize(e) {
    console.log('resized');
  }

  destroy() {
    this.events.clear(); // 一次性解绑所有事件
  }
}
```

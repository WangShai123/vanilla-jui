# Events

Events 是 DOM 事件管理工具，源码位于 `src/utilities/events.js`。它面向组件生命周期设计，避免组件内部重复书写 `addEventListener` / `removeEventListener` 样板代码。

## 设计目标

- `listen()` 是无全局状态的低层绑定函数，支持所有合法 `EventTarget`，包括 `HTMLElement`、`document`、`window` 和自定义 `EventTarget`。
- `createEventManager()` 是实例级事件管理器，由组件持有，适合在 `destroy()`、`hide()`、`reInit()` 等生命周期中统一释放。
- 同一个 key 重复绑定会先解绑旧监听，避免重渲染或重复初始化造成重复绑定。
- 所有解绑函数都可重复调用，重复释放不会抛错。
- 参数非法时尽早抛出明确错误；条件性目标为 `null` 时，事件管理器会返回空解绑函数，便于组件写出稳定流程。

## 基础用法

```js
import { listen } from 'vanilla-jui';

const dispose = listen(window, 'resize', () => {
  // ...
});

dispose();
```

## 组件实例用法

```js
import { createEventManager } from 'vanilla-jui';

class Component {
  constructor(root) {
    this.root = root;
    this.events = createEventManager();
  }

  bind() {
    this.events.on('click', this.root, 'click', (event) => {
      // ...
    });
    this.events.on('keydown', document, 'keydown', (event) => {
      // ...
    });
  }

  destroy() {
    this.events.clear();
  }
}
```

## API

| 方法                                             | 说明                                        |
| ------------------------------------------------ | ------------------------------------------- |
| `listen(target, type, handler, options)`         | 绑定事件并返回一次性解绑函数                |
| `unlisten(target, type, handler, options)`       | 按原始参数解绑事件                          |
| `createEventManager()`                           | 创建实例级事件管理器                        |
| `events.on(key, target, type, handler, options)` | 绑定并记录事件；同 key 重复绑定会先解绑旧值 |
| `events.off(key)`                                | 解绑指定 key，返回是否释放了事件            |
| `events.clear()`                                 | 释放当前管理器记录的全部事件                |
| `events.size()`                                  | 返回当前记录数量                            |

## 组件改造约定

组件内部优先使用 `createEventManager()`：

```js
this.events = createEventManager();
this.events.on('root-click', this.root, 'click', this.handleClick);
this.events.clear();
```

`utilities/dom.js` 中的 `on/off` 仅作为兼容导出保留，新组件应直接使用 `utilities/events.js`。

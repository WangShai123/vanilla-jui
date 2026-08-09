# Popup

Popup 是一个轻量 DOM 工厂，源码位于 `src/components/popup.ts`。它只负责生成通用弹层布局节点，不维护实例状态、不绑定事件，也不提供 `show()` / `hide()`。

## 导入

```js
import { createPopup } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const popup = createPopup({
  position: 'center',
  component: 'modal',
  content: 'Popup content',
});

document.body.appendChild(popup);
```

生成结构：

```html
<div
  class="j-popup-layout is-center"
  role="dialog"
  data-modal="root"
  aria-modal="true"
  aria-labelledby="dialog-title"
>
  ...
</div>
```

`component` 为空字符串时，不渲染 `data-${component}` 和 `aria-${component}`；`labelledby` 为空字符串时，不渲染 `aria-labelledby`。

## 自定义 className

`className` 是根节点基础类名，默认值是 `j-popup-layout`。最终类名会拼成 `${className} is-${position}`。

```js
const popup = createPopup({
  className: 'app-popup-layer',
  position: 'bottom-right',
  content: 'Saved',
});
```

生成：

```html
<div class="app-popup-layer is-bottom-right" role="dialog">Saved</div>
```

## content

`content` 使用项目通用的 `RenderableContent` 规则，支持字符串、数字、布尔值、DOM 节点、节点数组、函数和空值。字符串始终按文本渲染，不解析 HTML。

```js
const popup = createPopup({
  content: () => {
    const button = document.createElement('button');
    button.textContent = 'Close';
    return button;
  },
});
```

函数型 `content` 会由 `vanilla-signal` 的 `jsx()` children 机制消费，适合和响应式状态一起使用。

## 参数

| 参数         | 类型                | 默认值             | 说明                                               |
| ------------ | ------------------- | ------------------ | -------------------------------------------------- |
| `className`  | `string`            | `'j-popup-layout'` | 根节点基础类名                                     |
| `position`   | `string`            | `'center'`         | 弹层位置，最终追加为 `is-${position}`              |
| `component`  | `string`            | `''`               | 组件名；非空时渲染 `data-${component}` 和对应 ARIA |
| `labelledby` | `string`            | `''`               | 非空时渲染 `aria-labelledby`                       |
| `content`    | `RenderableContent` | `''`               | 弹层内容                                           |

## 返回值

`createPopup(props)` 返回 `HTMLElement`，也就是已经创建好的根节点。调用方负责挂载、移除、事件绑定和状态管理。

# Drop

Drop 是通用浮层组件，源码位于 `src/components/drop.js`。支持点击或 hover 触发，自动计算视口内位置。DOM 在 `show()` 时懒挂载到 `document.body`，`hide()` 时移除。

## 导入

```js
import { Drop } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const drop = new Drop(button, {
  mode: 'click',
  position: 'bottom-left',
  content: '<strong>Drop content</strong>',
});

drop.show();
drop.hide();
```

`content` 支持字符串、DOM 节点、节点数组、函数和 `null`。传入 Element 节点时会直接作为内容 wrapper 使用。

## Hover 模式

```js
const hover = new Drop(button, {
  mode: 'hover',
  position: 'top-center',
  delay: { show: 100, hide: 50 },
  hoverIntent: true,
  content: 'Hover tooltip content',
});
```

`hoverIntent: true`（默认）会在鼠标快速划过时不触发显示，减少误触。

## 位置

`position` 支持：`auto`（默认，智能选择上/下）、`top-left`、`top-center`、`top-right`、`bottom-left`、`bottom-center`、`bottom-right`、`left`、`right`。

```js
new Drop(button, { position: 'right', content: '...' });
```

## 参数

| 参数                 | 类型                                           | 默认值    | 说明                                 |
| -------------------- | ---------------------------------------------- | --------- | ------------------------------------ |
| `mode`               | `'click' \| 'hover'`                           | `'click'` | 触发方式                             |
| `position`           | `string`                                       | `'auto'`  | 浮层位置                             |
| `offset`             | `number`                                       | `10`      | 与目标元素间距                       |
| `content`            | `string \| Node \| Node[] \| Function \| null` | `''`      | 浮层内容                             |
| `delay`              | `number \| { show?: number, hide?: number }`   | `0`       | 展示/隐藏延迟（毫秒）                |
| `hoverIntent`        | `boolean`                                      | `true`    | hover 模式下启用意图判断，减少误触发 |
| `name`               | `string \| null`                               | `null`    | 浮层名称，写入 `data-drop`           |
| `id`                 | `string \| null`                               | `null`    | 浮层 id，不传时自动生成              |
| `className`          | `string \| null`                               | `null`    | 浮层额外类名                         |
| `containerClassName` | `string \| null`                               | `null`    | 内容容器额外类名                     |
| `onShown`            | `Function \| null`                             | `null`    | 展示后回调                           |
| `onHidden`           | `Function \| null`                             | `null`    | 隐藏后回调                           |

## 实例属性

| 属性        | 说明           |
| ----------- | -------------- |
| `props`     | 归一化后的配置 |
| `root`      | 浮层 DOM 节点  |
| `target`    | 触发元素       |
| `isVisible` | 当前是否可见   |

## 实例方法

| 方法             | 说明                         |
| ---------------- | ---------------------------- |
| `show(useDelay)` | 展示浮层，默认应用延迟       |
| `hide(useDelay)` | 隐藏浮层，默认应用延迟       |
| `toggle()`       | 切换显示状态                 |
| `destroy()`      | 销毁实例，解绑事件并移除 DOM |

`show(false)` / `hide(false)` 可跳过延迟立即执行。

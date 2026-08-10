# Drop

Drop 是通用浮层行为控制器，源码位于 `src/primitives/drop.ts`。它通过 `createDrop(reference, props)` 创建实例，围绕一个已有触发元素工作，负责点击或 hover 触发、显示延迟、视口内定位、外部点击关闭和资源清理。

Drop 的根节点在实例创建时生成，但只在 `show()` 时挂载到 `document.body`，`hide()` 时从文档移除。实例没有 `build()` / `mount()` 生命周期；业务侧通过 `show()`、`hide()`、`toggle()` 和 `destroy()` 控制它。

## 导入

```js
import { createDrop } from 'vanilla-jui';
```

## 基础用法

```js
const drop = createDrop(button, {
  mode: 'click',
  position: 'bottom-left',
  content: 'Drop content',
});

drop.show();
drop.hide();
```

`reference` 可以是选择器或 DOM 节点，会在创建时解析为触发元素。`content` 支持字符串、DOM 节点、节点数组、函数和 `null`。字符串始终按文本渲染，不解析 HTML。内容始终渲染在默认 `.drop-container` 容器或自定义 `className.container` 容器内。

## 异步内容

`content` 为函数时会收到当前 Drop 实例，并在 `show()` 时执行。函数可以同步返回可渲染内容，也可以返回 Promise。异步结果返回前，内容容器会插入 `createLoading()` 生成的加载节点，并标记 `aria-busy="true"`。

```js
const drop = createDrop(button, {
  content: async (instance) => {
    const html = await fetchMenu(instance.target);
    return html.title;
  },
  cache: true,
  ttl: 2000,
});
```

`cache: true` 会缓存函数返回值；`ttl` 是缓存有效期，单位毫秒。`ttl: 0` 表示缓存不过期。隐藏或销毁期间返回的旧异步结果会被忽略，避免覆盖下一次展示的内容。

## Hover 模式

```js
const hover = createDrop(button, {
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
createDrop(button, { position: 'right', content: '...' });
```

## 参数

| 参数          | 类型                                         | 默认值    | 说明                                 |
| ------------- | -------------------------------------------- | --------- | ------------------------------------ |
| `mode`        | `'click' \| 'hover'`                         | `'click'` | 触发方式                             |
| `position`    | `string`                                     | `'auto'`  | 浮层位置                             |
| `offset`      | `number`                                     | `10`      | 与目标元素间距                       |
| `content`     | `RenderableContent \| Function`              | `''`      | 浮层内容，函数支持异步返回           |
| `cache`       | `boolean`                                    | `false`   | 是否缓存函数内容返回值               |
| `ttl`         | `number`                                     | `0`       | 内容缓存有效期，单位毫秒             |
| `delay`       | `number \| { show?: number, hide?: number }` | `0`       | 展示/隐藏延迟（毫秒）                |
| `hoverIntent` | `boolean`                                    | `true`    | hover 模式下启用意图判断，减少误触发 |
| `name`        | `string \| null`                             | `null`    | 浮层名称，写入 `data-drop`           |
| `id`          | `string \| null`                             | `null`    | 浮层 id，不传时自动生成              |
| `className`   | `object`                                     | 见下表    | 覆盖组件结构类名                     |
| `onShown`     | `Function \| null`                           | `null`    | 展示后回调                           |
| `onHidden`    | `Function \| null`                           | `null`    | 隐藏后回调                           |

## className

| 字段        | 默认值           | 说明       |
| ----------- | ---------------- | ---------- |
| `root`      | `j-drop`         | 浮层根节点 |
| `container` | `drop-container` | 内容容器   |

组件内部交互不依赖这些类名，根节点使用 `data-drop`，默认内容容器使用 `data-drop-container`。

## 实例属性

| 属性        | 说明                                |
| ----------- | ----------------------------------- |
| `props`     | 归一化后的配置                      |
| `element`   | 浮层根节点；`destroy()` 后为 `null` |
| `target`    | 触发元素；`destroy()` 后为 `null`   |
| `isVisible` | 当前是否可见                        |
| `delayShow` | 归一化后的展示延迟，单位毫秒        |
| `delayHide` | 归一化后的隐藏延迟，单位毫秒        |

## 实例方法

| 方法             | 说明                         |
| ---------------- | ---------------------------- |
| `show(useDelay)` | 展示浮层，默认应用延迟       |
| `hide(useDelay)` | 隐藏浮层，默认应用延迟       |
| `toggle()`       | 切换显示状态                 |
| `destroy()`      | 销毁实例，解绑事件并移除 DOM |

`show(false)` / `hide(false)` 可跳过延迟立即执行。

`destroy()` 会清理 show/hide timer、触发元素事件、document 事件、mousemove hover-intent 监听，并移除浮层节点。销毁后 `element` 和 `target` 都返回 `null`，后续 `show()` / `hide()` 不再产生效果。

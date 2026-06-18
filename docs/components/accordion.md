# Accordion

Accordion 是轻量命令式手风琴组件，源码位于 `src/components/accordion.js`。它保留 `new Accordion(element, options)` 实例模式，内部直接同步 class、ARIA 和面板显示状态；动态创建时使用 `vanilla-signal` 的 `jsx` 作为 DOM 创建工具，因此可以自然接收 JSX 产物、DOM 节点或函数内容。

## 导入

```js
import { Accordion } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 动态创建

传入 `false` 时，Accordion 会根据 `items` 创建完整根节点。创建后可把 `accordion.root` 插入页面。

```js
const accordion = new Accordion(false, {
  active: 'usage',
  items: [
    {
      name: 'intro',
      title: 'Intro',
      content: 'Intro content',
    },
    {
      name: 'usage',
      title: 'Usage',
      content: '<strong>Usage</strong> content',
    },
  ],
});

document.querySelector('#demo').appendChild(accordion.root);
```

`title` 和 `content` 支持字符串、DOM 节点、节点数组、函数和 `null`。字符串会按 HTML 片段渲染；函数会收到 `{ accordion, item, index, type, active }` 上下文，适合按需生成节点。

## 绑定已有 DOM

也可以把已有 `.j-accordion` 结构交给 Accordion 接管：

```html
<div id="faq" class="j-accordion">
  <div class="accordion-header" data-item="install">
    <span class="header-title">Install</span>
    <span class="header-arrow"></span>
  </div>
  <div class="accordion-panel">
    <div class="panel-content">Install content</div>
  </div>
</div>
```

```js
const faq = new Accordion(document.querySelector('#faq'), {
  active: 'install',
  collapsible: true,
});
```

绑定已有 DOM 时，组件会补充 `role`、`tabindex`、`aria-expanded`、`aria-controls`、`aria-hidden` 等基础无障碍属性，并同步 `is-active` 与 `hidden`。

## 单开、折叠和多开

默认是单开模式，点击另一个面板会关闭当前面板。

```js
const single = new Accordion(false, {
  active: 0,
  items,
});
```

`collapsible: true` 允许再次点击当前项时关闭全部面板：

```js
const collapsible = new Accordion(false, {
  active: 0,
  collapsible: true,
  items,
});
```

`multiple: true` 允许同时展开多个面板，`active` 可以传数组：

```js
const multiple = new Accordion(false, {
  multiple: true,
  active: [0, 'api'],
  items,
});
```

## 动态替换条目

`setItems(items, active)` 会替换全部面板并同步 DOM 状态。

```js
accordion.setItems(
  [
    { name: 'basic', title: 'Basic', content: 'Basic content' },
    { name: 'advanced', title: 'Advanced', content: 'Advanced content' },
  ],
  'advanced'
);
```

## 实例属性

| 属性      | 说明                                          |
| --------- | --------------------------------------------- |
| `root`    | 根节点                                        |
| `state`   | 只读状态快照，包含 `activeNames` 和 `current` |
| `headers` | 当前所有 `.accordion-header` 节点             |
| `panels`  | 当前所有 `.accordion-panel` 节点              |
| `current` | 当前第一个激活项索引；无激活项时为 `null`     |
| `options` | 归一化后的配置                                |

## 实例方法

| 方法                      | 说明                                            |
| ------------------------- | ----------------------------------------------- |
| `active(indexOrName)`     | 激活或折叠指定面板，支持索引或 `data-item` 名称 |
| `setItems(items, active)` | 替换全部动态条目并设置默认激活项                |
| `destroy()`               | 销毁实例，释放事件并清理激活状态                |

`destroy()` 会移除由 `new Accordion(false, options)` 动态创建的根节点；绑定已有 DOM 的实例只解绑事件和清理激活状态，不会移除传入的宿主元素。

## 参数

| 参数          | 类型                                | 默认值  | 说明                             |
| ------------- | ----------------------------------- | ------- | -------------------------------- |
| `id`          | `string \| null`                    | `null`  | 根节点 id；为空时自动生成        |
| `active`      | `number \| string \| Array \| null` | `0`     | 初始激活项，支持索引、名称或数组 |
| `collapsible` | `boolean`                           | `false` | 是否允许关闭当前已激活项         |
| `multiple`    | `boolean`                           | `false` | 是否允许同时展开多个面板         |
| `items`       | `AccordionItem[]`                   | `[]`    | 动态创建时使用的条目配置         |
| `onChange`    | `Function \| null`                  | `null`  | 激活项变化回调                   |

`onChange(index, name, header, panel, instance)` 会在用户或代码调用 `active()` 并产生状态变化后触发。初始化默认激活不会触发 `onChange`。

## 无障碍

默认渲染包含基础 a11y 支持：

| 区域     | 支持                                                              |
| -------- | ----------------------------------------------------------------- |
| header   | `role="button"`、`tabindex="0"`、`aria-expanded`、`aria-controls` |
| panel    | `role="region"`、`aria-hidden`、`aria-labelledby`                 |
| keyboard | `Enter` 和 `Space` 可切换当前 header                              |

如果完全自定义已有 DOM，建议保留 `.accordion-header`、`.accordion-panel`、`.header-title` 和 `.header-arrow` 这些结构类名，以便样式和交互都能正确接管。

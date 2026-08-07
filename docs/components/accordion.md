# Accordion

Accordion 是基于函数式 component controller 的响应式手风琴组件。

API: `createAccordion(props)`。Accordion 只导出工厂函数，不导出组件 class。

源码位于 `src/components/accordion.ts`。

## 导入

```js
import { createAccordion } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 创建与挂载

```js
const accordion = createAccordion({
  active: 'usage',
  data: [
    { name: 'intro', title: 'Intro', content: 'Intro content' },
    {
      name: 'usage',
      title: 'Usage',
      content: '<strong>Usage</strong> content',
    },
  ],
});

const container = document.querySelector('#demo');
if (container) accordion.build().mount(container);
```

`createAccordion(props)` 只创建 controller 并校验初始配置。`build()` 创建稳定 DOM、绑定响应式视图和事件，但不会自动挂载；可以继续调用 `mount(container)`，也可以由上层手动插入 `accordion.element`。

## 单开、折叠和多开

```js
// 单开，默认激活第一项。
const single = createAccordion({ active: 0, data });
single.build();

// 折叠，点击当前项可关闭。
const collapsible = createAccordion({ active: 0, collapsible: true, data });
collapsible.build();

// 多开，同时展开 intro 和 api。
const multiple = createAccordion({
  multiple: true,
  active: ['intro', 'api'],
  data,
});
multiple.build();
```

`active` 可以是索引、`name`、数组或 `null`。当 `multiple` 为 `false` 时，只使用第一个有效激活项。

## 布局方向

`direction` 默认为 `vertical`。组件会把方向写入根节点
`data-direction`，同时选择对应布局和 Collapse Motion 轴。

```js
const horizontal = createAccordion({
  direction: 'horizontal',
  data,
});
```

| direction | 根布局 | panel 动画尺寸 |
| --- | --- | --- |
| `vertical` | `flex-direction: column` | height / scrollHeight |
| `horizontal` | `flex-direction: row` | width / scrollWidth |

## 内容

`title` 和 `content` 支持字符串、DOM 节点、节点数组、数字、布尔值、`null`、`undefined` 或返回这些值的函数。字符串会按 HTML 片段解析。

```js
const dynamic = createAccordion({
  data: [
    {
      name: 'profile',
      title: ({ index }) => `Panel ${index + 1}`,
      content: ({ item }) => `<p>${item.name}</p>`,
    },
  ],
});
dynamic.build();
```

## 响应式条目

`data` 会写入 `accordion.state.data`。`build()` 后，替换或变异 `state.data` 会自动重建面板 DOM，不需要调用额外的刷新方法。

```js
accordion.state.data = [
  { name: 'basic', title: 'Basic', content: 'Basic content' },
  { name: 'advanced', title: 'Advanced', content: 'Advanced content' },
];

accordion.state.data.push({
  name: 'faq',
  title: 'FAQ',
  content: 'FAQ content',
});
```

组件会按 `name` 关联状态、DOM ref 和 Motion controller；`current` 会忽略已不存在的名称。`name` 可以省略或留空，此时组件会自动生成唯一值；如果业务代码传入固定 `name`，同一组 `data` 内必须保持唯一，否则组件会抛出错误。

## 展开与收起动画

Accordion panel 始终稳定挂载，不使用 CSS `display:none` 或 HTML `hidden` 切换。
组件通过公共 `createCollapseTransition()` 按 direction 测量内容尺寸，并用 Web
Animations API 执行 `height: 0 -> scrollHeight` 或
`width: 0 -> scrollWidth`，同时插值 opacity。

展开完成后会恢复原始 inline height、overflow、opacity 和 visibility，因此内容变化
仍按 `height:auto` 的布局语义计算；收起完成后保持 `height:0`、
`overflow:hidden` 和 `visibility:hidden`。动画不依赖默认 className 或
`style.css`。

`state.activeNames` 仍是唯一状态源。调用 `activate()` 或直接通过 `setState()` 更新
`activeNames` 都会触发相同 Motion 投影。快速反向操作从当前渲染高度重新开始，不会
跳回完整展开或完整收起边界。

## 实例属性

| 属性                | 说明                                   |
| ------------------- | -------------------------------------- |
| `props`             | 归一化后的创建期配置                   |
| `state.data`       | 响应式面板数据，变更后自动重建面板 DOM |
| `state.activeNames` | 当前展开的面板名称列表                 |
| `current`           | 当前主面板，包含 `index` 和 `name`     |
| `element`           | `build()` 后生成的稳定根节点           |
| `runtime`           | `built`、`mounted`、`destroyed` 状态   |

## 实例方法

| 方法                    | 说明                                |
| ----------------------- | ----------------------------------- |
| `build()`               | 创建 DOM、绑定事件并同步初始状态    |
| `mount(container)`      | 构建并挂载到指定容器                |
| `unmount()`             | 从当前容器移除根节点                |
| `activate(indexOrName)` | 激活、展开或折叠指定面板            |
| `destroy()`             | 销毁实例，移除已挂载 DOM 并释放资源 |

公共 controller 方法还包括 `setState()`、`own()`、`on()`、`off()`、`emit()` 和 `use()`。

Accordion 不提供 `setItems()`。条目变化直接写 `state.data`，例如 `accordion.state.data = nextItems` 或 `accordion.setState({ data: nextItems })`。

## 参数

| 参数          | 类型                                | 默认值  | 说明                      |
| ------------- | ----------------------------------- | ------- | ------------------------- |
| `data`       | `AccordionItem[]`                   | 必填    | 初始非空面板配置列表      |
| `id`          | `string \| null`                    | `null`  | 根节点 id；为空时自动生成 |
| `active`      | `number \| string \| Array \| null` | `0`     | 初始激活项                |
| `collapsible` | `boolean`                           | `false` | 允许关闭当前已激活项      |
| `multiple`    | `boolean`                           | `false` | 允许同时展开多个面板      |
| `direction`   | `'vertical' \| 'horizontal'`        | `vertical` | 布局与展开动画方向     |
| `className`   | `object`                            | 见下表  | 覆盖组件结构类名          |
| `onChange`    | `Function \| null`                  | `null`  | 用户切换面板后的回调      |

### `data`

| 字段      | 类型                | 说明                                                                 |
| --------- | ------------------- | -------------------------------------------------------------------- |
| `name`    | `string`            | 可选；为空时自动生成。传入固定值时必须唯一，响应式更新时建议保持稳定 |
| `title`   | `RenderableContent` | 面板头内容                                                           |
| `content` | `RenderableContent` | 面板内容                                                             |

### `className`

| 字段      | 默认值             | 说明     |
| --------- | ------------------ | -------- |
| `root`    | `j-accordion`      | 根节点   |
| `header`  | `accordion-header` | 面板头   |
| `title`   | `header-title`     | 标题区域 |
| `arrow`   | `header-arrow`     | 箭头区域 |
| `panel`   | `accordion-panel`  | 面板区域 |
| `content` | `panel-content`    | 内容区域 |

## 回调

```js
const callbackAccordion = createAccordion({
  data,
  onChange(index, name, header, panel, accordion) {
    console.log(index, name, header, panel, accordion.current);
  },
});
callbackAccordion.build();
```

`onChange` 只在用户交互或调用 `activate()` 后触发，初始 `active` 同步不会触发回调。

## 无障碍

| 区域     | 支持                                                              |
| -------- | ----------------------------------------------------------------- |
| header   | `role="button"`、`tabindex="0"`、`aria-expanded`、`aria-controls` |
| panel    | `role="region"`、`aria-hidden`、`aria-labelledby`、关闭态 `inert` |
| keyboard | `Enter` / `Space` 切换                                            |

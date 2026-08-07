# Tabs

Tabs 是基于 `Component` 和 `vanilla-signal` 的响应式标签页组件，支持横向/纵向布局、异步面板、缓存、禁用项、动态增删和溢出拖拽。

```js
import { createTabs } from "vanilla-jui";
import "vanilla-jui/style.css";
```

实例化不会创建 DOM，也不会自动挂载。调用 `build()` 后，用户手动挂载 `tabs.element`。

```js
const tabs = createTabs({
  active: "profile",
  data: [
    { name: "account", title: "Account", panel: "Account content" },
    { name: "profile", title: "Profile", panel: "Profile content" },
  ],
}).build();

document.querySelector("#demo").appendChild(tabs.element);
tabs.refresh();
```

`refresh()` 用于挂载后重新计算标签列表溢出和拖拽状态。

## DOM 结构

Tabs 创建扁平内容结构。标题直接渲染在 `.tab-item` 内，面板内容直接渲染在 `.panel-item` 内。

```html
<div class="j-tabs" id="tabs-id" data-tabs="root" data-tabs-direction="top">
  <div class="tab-wrap" data-tabs-wrap>
    <nav class="tab-list" data-tabs-list>
      <div class="tab-item" data-tabs-tab="account" role="tab">Account</div>
      <div class="tab-item" data-tabs-tab="profile" role="tab">Profile</div>
    </nav>
  </div>
  <div class="tab-panel" data-tabs-panel-wrap>
    <div class="panel-item" data-tabs-panel="account" role="tabpanel">Account content</div>
    <div class="panel-item" data-tabs-panel="profile" role="tabpanel">Profile content</div>
  </div>
</div>
```

内部交互使用 `data-tabs`、`data-tabs-list`、`data-tabs-wrap`、`data-tabs-tab`、`data-tabs-panel-wrap` 和 `data-tabs-panel`，不依赖可覆盖的 CSS 类名。

## Props

| 字段        | 类型                                          | 默认值  | 说明                                                   |
| ----------- | --------------------------------------------- | ------- | ------------------------------------------------------ |
| `id`        | `string \| null`                              | 自动生成 | 根节点 `id`                                            |
| `direction` | `"top" \| "bottom" \| "left" \| "right"`      | `"top"` | 标签方向                                               |
| `active`    | `number \| string`                            | `0`     | 默认激活项，可传索引或 `name`                          |
| `disabled`  | `number \| string \| Array<number \| string>` | `[]`    | 默认禁用项                                             |
| `data`      | `TabItem[]`                                   | `[]`    | 标签项列表，替换后自动重建视图                         |
| `className` | `object`                                      | 默认类名 | 覆盖结构类名                                           |
| `onChange`  | `Function \| null`                            | `null`  | 激活项切换后触发                                       |

## TabItem

| 字段    | 类型                        | 必填 | 说明                                    |
| ------- | --------------------------- | ---- | --------------------------------------- |
| `name`  | `string`                    | 否   | 标签唯一名称，不传时自动生成            |
| `title` | `RenderableContent`         | 是   | 标签标题内容                            |
| `panel` | `RenderableContent \| Function` | 是   | 面板内容；函数会在激活时执行            |
| `cache` | `boolean`                   | 否   | 函数型 panel 是否缓存结果               |
| `ttl`   | `number`                    | 否   | 缓存有效时间，单位毫秒；`0` 表示不过期  |

函数型 `panel` 会收到 `{ tabs, item, index, name }`，可以直接返回内容，也可以返回 Promise。异步加载期间会在当前面板渲染 `createLoading()`，并设置 `aria-live="polite"` 和 `aria-busy`。

## className

| 字段        | 默认值       |
| ----------- | ------------ |
| `root`      | `j-tabs`     |
| `wrap`      | `tab-wrap`   |
| `list`      | `tab-list`   |
| `tab`       | `tab-item`   |
| `panelWrap` | `tab-panel`  |
| `panel`     | `panel-item` |
| `disabled`  | `is-disabled` |
| `dragging`  | `dragging`   |

## State

| 字段             | 类型       | 说明                       |
| ---------------- | ---------- | -------------------------- |
| `data`           | `TabItem[]` | 标签项数据源，替换后自动重建视图 |
| `active`         | `number \| string` | 当前期望激活项，可传索引或名称 |
| `disabled`       | `number \| string \| Array<number \| string>` | 当前禁用项 |
| `direction`      | `"top" \| "bottom" \| "left" \| "right"` | 当前方向，会同步到 `data-tabs-direction` |
| `current.index`  | `number`   | 当前激活索引               |
| `current.name`   | `string \| null` | 当前激活名称          |
| `isVertical`     | `boolean`  | 当前方向是否为纵向         |
| `draggable`      | `boolean`  | 标签列表是否可拖拽         |
| `loading`        | `boolean`  | 当前是否加载异步面板       |

## 数据更新

替换 `state.data` 会自动重建标签和面板：

```js
tabs.state.data = [
  { name: "intro", title: "Intro", panel: "Intro content" },
  { name: "api", title: "API", panel: "API content" },
];
```

也可以通过 `setState()` 同步多个状态：

```js
tabs.setState({
  active: "api",
  data: [{ name: "api", title: "API", panel: "API content" }],
});
```

禁用项和方向同样通过响应式状态更新：

```js
tabs.state.disabled = ["api"];
tabs.state.direction = "left";
```

## Methods

| 方法              | 说明                             |
| ----------------- | -------------------------------- |
| `build()`         | 创建 Tabs DOM，不自动挂载         |
| `refresh()`       | 挂载后重新计算拖拽状态           |
| `activate(value)` | 激活指定索引或名称               |
| `setState(patch)` | 更新响应式状态                   |
| `destroy()`       | 销毁实例并移除组件创建的根节点   |

`refresh()` 和 `activate()` 需要在 `build()` 后调用。`setState()` 可在 `build()` 前后使用。

# Menu

Menu 是轻量菜单组件，支持常规桌面菜单、移动端侧边菜单和底部菜单。组件根据 `data` 创建 DOM，通过 data 标记绑定交互，并支持通过响应式 `state.data` 更新渲染。

```js
import { createMenu } from "vanilla-jui";
import "vanilla-jui/style.css";
```

## 基础用法

组件需要显式 `build()`，然后由用户手动挂载 `dom.root`。

```js
const menu = createMenu({
  type: "mobile",
  data: [
    { id: "home", title: "Home", url: "#home" },
    {
      id: "docs",
      title: "Docs",
      children: [{ id: "api", title: "API", url: "#api" }],
    },
  ],
}).build();

document.querySelector("#demo").appendChild(menu.element);
```

## State 更新

菜单数据通过 `state.data` 管理。更新 `state.data` 后，菜单会自动重新渲染：

```js
menu.setState({
  data: [{ id: "new", title: "New", url: "#new" }],
});

menu.state.data = [
  { id: "home", title: "Home", url: "#home" },
  { id: "about", title: "About", url: "#about" },
];
```

## 菜单类型

| type       | 行为                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| `undefined` | 常规桌面菜单，只渲染 DOM，不启用移动端或底部菜单交互                             |
| `mobile`   | 点击含子菜单的项展开下级，自动注入带 `arrow-left` 图标的返回项                   |
| `bottom`   | 点击第一层含子菜单的项切换激活状态，点击其他区域收起；子菜单链接允许正常跳转     |

`type` 是实例化配置，默认值为 `undefined`，只验证为 `string` 或 `undefined`，不做枚举限制。组件只在传入 `type` 时写入 `data-menu-type`；样式应通过 `[data-menu-type="..."]` 扩展，不需要依赖根节点类型类名。

## MenuItem

| 字段       | 类型                 | 默认值   | 说明                                               |
| ---------- | -------------------- | -------- | -------------------------------------------------- |
| `id`       | `string \| number`   | 自动生成 | 菜单项 id，用于 DOM `id` 属性（`menu-item-${id}`） |
| `title`    | `string \| number`   | 必填     | 菜单项标题文本                                     |
| `url`      | `string`             | `""`     | 链接地址                                           |
| `target`   | `string`             | -        | 链接 target 属性                                   |
| `classes`  | `string \| string[]` | -        | 额外类名，追加到菜单项节点；字符串会按空白拆分     |
| `children` | `MenuItem[]`         | -        | 子菜单列表，递归渲染                               |

`MenuItem` 可以携带额外字段，例如 `meta`、`icon`、`badge` 或 WordPress 菜单字段。组件只校验和渲染上表字段，额外字段会保留在 `state.data` 中。

## DOM 结构

`build()` 会创建离线 DOM：

```html
<nav class="j-menu" data-menu="root" data-menu-type="mobile">
  <ul id="menu-id" class="menu" data-menu-list="root">
    <li id="menu-item-home" class="menu-item" data-menu-item="home">
      <a class="menu-link" href="#home" data-menu-link>Home</a>
    </li>
    <li
      id="menu-item-docs"
      class="menu-item menu-item-has-children"
      data-menu-item="docs"
      data-menu-has-children
    >
      <a class="menu-link" href="" data-menu-link>Docs</a>
      <ul class="sub-menu" data-menu-list="sub">
        <li id="menu-item-api" class="menu-item" data-menu-item="api">
          <a class="menu-link" href="#api" data-menu-link>API</a>
        </li>
      </ul>
    </li>
  </ul>
</nav>
```

组件内部交互依赖 `data-menu`、`data-menu-type`、`data-menu-list`、`data-menu-item`、`data-menu-link`、`data-menu-has-children` 和 `data-menu-back`，不依赖默认 CSS 类。

只有叶子项且 `url` 不存在或 `trim()` 后为空时，标题节点才会渲染为 `span`。存在 `children` 的父项会继续渲染为 `a`，用于移动端和底部菜单交互。

## Props

| 字段        | 类型                 | 默认值       | 说明                                      |
| ----------- | -------------------- | ------------ | ----------------------------------------- |
| `type`      | `string \| undefined` | `undefined`  | 菜单类型，实例化后固定                    |
| `id`        | `string \| null`     | 自动生成     | 根列表 `<ul>` 节点 id                     |
| `data`      | `MenuItem[]`         | `[]`         | 初始菜单数据                              |
| `backText`  | `string`             | `"Back"`     | 移动端子菜单返回项文案                    |
| `className` | `object`             | 默认类名对象 | 覆盖根、列表、菜单项、链接、子菜单等类名  |

## State

| 字段          | 类型         | 说明                       |
| ------------- | ------------ | -------------------------- |
| `state.data`  | `MenuItem[]` | 当前菜单数据，更新后重渲染 |

## className

| 字段          | 默认值                   |
| ------------- | ------------------------ |
| `root`        | `j-menu`                 |
| `list`        | `menu`                   |
| `item`        | `menu-item`              |
| `hasChildren` | `menu-item-has-children` |
| `link`        | `menu-link`              |
| `subMenu`     | `sub-menu`               |
| `active`      | `is-active`              |
| `backItem`    | `menu-item back`         |
| `backIcon`    | `el-icon el-prefix`      |
| `text`        | `menu-text`              |

`className.root` 只作为根节点基础类名使用，不会根据 `type` 自动生成额外类名。

## Methods

| 方法                | 说明                         |
| ------------------- | ---------------------------- |
| `build()`           | 创建离线 DOM                 |
| `setState({ ... })` | 更新菜单状态并自动重渲染     |
| `destroy()`         | 销毁实例，释放事件和 DOM     |

`destroy()` 会移除已经挂载的 `dom.root`。

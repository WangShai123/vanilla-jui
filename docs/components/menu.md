# Menu

Menu 是轻量菜单组件，支持常规桌面菜单、移动端侧边菜单和底部菜单。组件根据 `data` 创建 DOM，通过 data 标记绑定交互，并支持通过响应式 `state.user` / `state.data` 更新菜单项视图。

```js
import { createMenu } from 'vanilla-jui';
```

## 基础用法

组件需要显式 `build()`，然后由用户手动挂载 `menu.element`，或调用 `menu.mount(container)`。

```js
const menu = createMenu({
  type: 'mobile',
  data: [
    { id: 'home', title: 'Home', url: '#home' },
    { id: 'account', title: 'Account', type: 1, url: '#account' },
    { id: 'login', title: 'Login', type: 2, url: '#login' },
    {
      id: 'docs',
      title: 'Docs',
      children: [{ id: 'api', title: 'API', url: '#api' }],
    },
  ],
}).mount(document.querySelector('#demo'));
```

## State 更新

菜单数据通过 `state.data` 管理，用户态通过 `state.user` 管理。更新后，根节点保持稳定，菜单项由 keyed `For` 按 item key 更新：

```js
menu.setState({ user: 12 });

menu.setState({
  data: [{ id: 'new', title: 'New', url: '#new' }],
});

menu.state.data = [
  { id: 'home', title: 'Home', url: '#home' },
  { id: 'about', title: 'About', url: '#about' },
];
```

`user` 和 `data` 也可以传入 accessor。组件会在内部同步到 `state.user` / `state.data`，渲染层再基于 state 派生可见菜单项：

```js
import { createDeepStore } from 'vanilla-signal';
import { createMenu } from 'vanilla-jui';

const store = createDeepStore({
  userId: 0,
  menuData: [
    { id: 'home', title: 'Home', url: '#home' },
    { id: 'account', title: 'Account', type: 1, url: '#account' },
    { id: 'login', title: 'Login', type: 2, url: '#login' },
  ],
});

const menu = createMenu({
  user: () => store.userId,
  data: () => store.menuData,
}).mount(document.querySelector('#demo'));
```

## 菜单类型

| type        | 行为                                                                         |
| ----------- | ---------------------------------------------------------------------------- |
| `undefined` | 常规桌面菜单，只渲染 DOM，不启用移动端或底部菜单交互                         |
| `mobile`    | 点击含子菜单的项展开下级，自动注入带 `arrow-left` 图标的返回项               |
| `bottom`    | 点击第一层含子菜单的项切换激活状态，点击其他区域收起；子菜单链接允许正常跳转 |

`type` 是实例化配置，默认值为 `undefined`，只验证为 `string` 或 `undefined`，不做枚举限制。组件只在传入 `type` 时写入 `data-menu-type`；样式应通过 `[data-menu-type="..."]` 扩展，不需要依赖根节点类型类名。

## 用户态渲染

`user` 是实例化配置，默认值为 `0`。当 `user` 是大于 `0` 的数字时，Menu 视为用户已登录；否则视为未登录。

菜单项通过 `MenuItem.type` 控制是否参与渲染：

| MenuItem.type | 行为               |
| ------------- | ------------------ |
| `0`           | 始终渲染，默认值   |
| `1`           | 仅用户已登录时渲染 |
| `2`           | 仅用户未登录时渲染 |

过滤会递归作用于子菜单。父菜单是否拥有子菜单以过滤后的 `children` 为准；如果子项全部被隐藏，父项不会渲染子菜单结构。

## MenuItem

| 字段       | 类型                 | 默认值   | 说明                                                |
| ---------- | -------------------- | -------- | --------------------------------------------------- |
| `id`       | `string \| number`   | 自动生成 | 菜单项 id，用于 DOM `id` 属性（`menu-item-${id}`）  |
| `title`    | `string \| number`   | 必填     | 菜单项标题文本                                      |
| `type`     | `0 \| 1 \| 2`        | `0`      | 用户态渲染条件，和 MenuProps 的菜单布局 `type` 不同 |
| `url`      | `string`             | `""`     | 链接地址                                            |
| `target`   | `string`             | -        | 链接 target 属性                                    |
| `classes`  | `string \| string[]` | -        | 额外类名，追加到菜单项节点；字符串会按空白拆分      |
| `children` | `MenuItem[]`         | -        | 子菜单列表，递归渲染                                |

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

| 字段        | 类型                             | 默认值       | 说明                                     |
| ----------- | -------------------------------- | ------------ | ---------------------------------------- |
| `type`      | `string \| undefined`            | `undefined`  | 菜单类型，实例化后固定                   |
| `id`        | `string \| null`                 | 自动生成     | 根列表 `<ul>` 节点 id                    |
| `user`      | `number \| () => number`         | `0`          | 用户 id，大于 `0` 时按已登录渲染         |
| `data`      | `MenuItem[] \| () => MenuItem[]` | `[]`         | 初始菜单数据或外部响应式菜单数据源       |
| `backText`  | `string`                         | `"Back"`     | 移动端子菜单返回项文案                   |
| `className` | `object`                         | 默认类名对象 | 覆盖根、列表、菜单项、链接、子菜单等类名 |

## State

| 字段               | 类型         | 说明                                  |
| ------------------ | ------------ | ------------------------------------- |
| `state.user`       | `number`     | 当前用户 id，大于 `0` 时视为已登录    |
| `state.data`       | `MenuItem[]` | 当前菜单数据，更新后由 keyed 列表更新 |
| `state.activeKeys` | `string[]`   | 当前展开或激活的菜单项 key            |

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

| 方法                | 说明                     |
| ------------------- | ------------------------ |
| `build()`           | 创建离线 DOM             |
| `mount(container)`  | 构建并挂载根节点         |
| `unmount()`         | 移除根节点，保留 state   |
| `setState({ ... })` | 更新菜单状态             |
| `destroy()`         | 销毁实例，释放事件和 DOM |

`destroy()` 会移除已经挂载的 `element`，并释放 bottom 模式的 document 点击监听。

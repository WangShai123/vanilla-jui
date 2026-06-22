# Menu

Menu 是轻量命令式菜单组件，源码位于 `src/components/menu.js`。支持绑定已有菜单 DOM，也支持通过 `items` 动态创建移动菜单或底部菜单。

## 导入

```js
import { Menu } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 动态创建

```js
const menu = new Menu({
  type: 'mobile',
  items: [
    { id: 'home', title: 'Home', url: '#home' },
    {
      id: 'docs',
      title: 'Docs',
      children: [{ id: 'api', title: 'API', url: '#api' }],
    },
  ],
}).build();

document.querySelector('#demo').appendChild(menu.root);
```

## 绑定已有 DOM

```js
const menu = new Menu(
  {
    type: 'mobile',
    items: [{ id: 'home', title: 'Home', url: '#home' }],
  },
  '#existing-nav'
).build();
```

传入选择器或 HTMLElement 时，`build()` 会查找并绑定该节点，不会新建 DOM。

## 菜单类型

| type               | 行为                                                                             |
| ------------------ | -------------------------------------------------------------------------------- |
| `'mobile'`（默认） | 点击含子菜单的项展开下级，自动注入带 `arrow-left` 图标的返回按钮                 |
| `'bottom'`         | 点击第一层含子菜单的项切换 `is-active`，点击其他区域收起；子菜单链接允许正常跳转 |

## MenuItem

| 属性       | 类型               | 默认值   | 说明                                               |
| ---------- | ------------------ | -------- | -------------------------------------------------- |
| `id`       | `string \| number` | 自动生成 | 菜单项 id，用于 DOM `id` 属性（`menu-item-${id}`） |
| `title`    | `string`           | —        | 菜单项标题文本                                     |
| `url`      | `string`           | `'#'`    | 链接地址                                           |
| `target`   | `string`           | —        | 链接 target 属性                                   |
| `classes`  | `string[]`         | —        | 额外类名，追加到 `.menu-item`                      |
| `children` | `MenuItem[]`       | —        | 子菜单列表，递归渲染                               |

## 参数

| 参数       | 类型                   | 默认值     | 说明                                      |
| ---------- | ---------------------- | ---------- | ----------------------------------------- |
| `type`     | `'mobile' \| 'bottom'` | `'mobile'` | 菜单类型，对应根节点类名 `j-${type}-menu` |
| `id`       | `string`               | 自动生成   | 菜单 `<ul>` 节点 id                       |
| `items`    | `MenuItem[]`           | `[]`       | 菜单数据                                  |
| `backText` | `string`               | `'Back'`   | 移动端子菜单返回按钮文案                  |

## 实例属性

| 属性   | 说明                                               |
| ------ | -------------------------------------------------- |
| `root` | 菜单根节点（`<nav>`），动态创建时 `build()` 后可用 |

## 实例方法

| 方法              | 说明                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| `build()`         | 构建菜单，返回 `this`。已构建时幂等                                     |
| `setItems(items)` | 替换菜单数据；动态菜单重建 DOM，绑定 DOM 替换 `.menu` 内容。返回 `this` |
| `removeItem(id)`  | 按 id 移除菜单项（同时更新内部数据和 DOM）。返回 `this`                 |
| `destroy()`       | 销毁实例，解绑事件，移除动态创建的 DOM，清空 `options`。幂等            |

## CSS 类约定

| 类名                                | 说明                                  |
| ----------------------------------- | ------------------------------------- |
| `.j-mobile-menu` / `.j-bottom-menu` | 根 `<nav>` 节点类名（由 `type` 决定） |
| `.menu`                             | `<ul>` 列表节点                       |
| `.menu-item`                        | `<li>` 菜单项                         |
| `.menu-item-has-children`           | 含子菜单的 `<li>`                     |
| `.sub-menu`                         | 子菜单 `<ul>`                         |
| `.menu-item.back`                   | 移动端动态注入的返回按钮              |
| `.is-active`                        | 当前展开/激活的菜单项                 |

## 测试

可视化半自动测试页面：`index.html#menu`。

# Tabs

Tabs 是基于 `defineComponent()` 和 `vanilla-signal` 的响应式标签页组件，支持横向/纵向布局、异步面板、缓存、禁用项、动态增删和溢出拖拽。

```js
import { createTabs } from 'vanilla-jui';
```

实例化不会创建 DOM，也不会自动挂载。可以调用 `mount(container)` 让组件自动构建并挂载，
也可以调用 `build()` 显式构建，然后手动挂载 `tabs.element`。

```js
const tabs = createTabs({
  active: 'profile',
  data: [
    { name: 'account', title: 'Account', content: 'Account content' },
    { name: 'profile', title: 'Profile', content: 'Profile content' },
  ],
});

tabs.mount(document.querySelector('#demo'));
// 或者
tabs.build();
document.querySelector('#demo').appendChild(tabs.element);
```

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
  <div class="panel-list" data-tabs-panel-wrap>
    <div class="panel-item" data-tabs-panel="account" role="tabpanel">
      Account content
    </div>
    <div class="panel-item" data-tabs-panel="profile" role="tabpanel">
      Profile content
    </div>
  </div>
</div>
```

内部交互使用 `data-tabs`、`data-tabs-list`、`data-tabs-wrap`、`data-tabs-tab`、`data-tabs-panel-wrap` 和 `data-tabs-panel`，不依赖可覆盖的 CSS 类名。

## Props

| 字段        | 类型                                          | 默认值   | 说明                                    |
| ----------- | --------------------------------------------- | -------- | --------------------------------------- |
| `id`        | `string \| null`                              | 自动生成 | 根节点 `id`                             |
| `direction` | `"top" \| "bottom" \| "left" \| "right"`      | `"top"`  | 标签方向                                |
| `active`    | `number \| string`                            | `0`      | 默认激活项，可传索引或 `name`           |
| `disabled`  | `number \| string \| Array<number \| string>` | `[]`     | 默认禁用项                              |
| `data`      | `TabItem[]`                                   | `[]`     | 标签项列表，使用 `name` 作为 keyed 身份 |
| `className` | `object`                                      | 默认类名 | 覆盖结构类名                            |
| `onChange`  | `Function \| null`                            | `null`   | 激活项切换后触发                        |

## TabItem

| 字段    | 类型                            | 必填 | 说明                                 |
| ------- | ------------------------------- | ---- | ------------------------------------ |
| `name`  | `string`                        | 否   | 标签唯一名称，不传时自动生成         |
| `title` | `RenderableContent`             | 是   | 标签标题内容                         |
| `content` | `RenderableContent \| Function` | 是   | 面板内容；函数会在激活时执行         |
| `cache` | `boolean`                       | 否   | 函数型 content 是否缓存结果            |
| `ttl`   | `number`                        | 否   | 缓存有效时间，单位毫秒；`0` 表示不过期 |

`RenderableContent` 支持类型: `访问器`、`数组`、`DocumentFragment`、`Node`、`null`、`boolean` 和普通文本值

函数型 `content` 上下文：`tabs`, `item`, `index`, `name`

## className

| 字段        | 默认值        |
| ----------- | ------------- |
| `root`      | `j-tabs`      |
| `wrap`      | `tab-wrap`    |
| `list`      | `tab-list`    |
| `tab`       | `tab-item`    |
| `panelWrap` | `panel-list`  |
| `panel`     | `panel-item`  |
| `disabled`  | `is-disabled` |
| `dragging`  | `dragging`    |

## State

| 字段            | 类型                                          | 说明                                         |
| --------------- | --------------------------------------------- | -------------------------------------------- |
| `data`          | `TabItem[]`                                   | 标签项数据源，由 keyed 列表更新 tab 和 content |
| `active`        | `number \| string`                            | 当前期望激活项，可传索引或名称               |
| `disabled`      | `number \| string \| Array<number \| string>` | 当前禁用项                                   |
| `current.index` | `number`                                      | 当前激活索引                                 |
| `current.name`  | `string \| null`                              | 当前激活名称                                 |
| `draggable`     | `boolean`                                     | 标签列表是否可拖拽                           |
| `dragging`      | `boolean`                                     | 当前是否处于拖拽滚动中                       |
| `loading`       | `boolean`                                     | 当前是否加载异步面板                         |

## 数据更新

Tabs 是状态驱动组件。列表局部更新直接修改 `tabs.state.data`，组件通过 keyed `For`
响应数据变化：

```js
tabs.state.data.push({ name: 'faq', title: 'FAQ', content: 'FAQ content' });

const faqIndex = tabs.state.data.findIndex((item) => item.name === 'faq');
const [faq] = tabs.state.data.splice(faqIndex, 1);
tabs.state.data.splice(0, 0, faq);

tabs.state.data = tabs.state.data.filter((item) => item.name !== 'intro');
```

`name` 是运行时身份，应在同一组 `data` 内保持稳定和唯一。需要改变身份时，删除旧项
再插入新项。删除项时，对应 content cache、loader 和 DOM refs 会随 keyed item owner
清理。

整组替换可以直接赋值，也可以使用 `setState({ data })`：

```js
// 直接赋值
tabs.state.data = [
  { name: 'intro', title: 'Intro', content: 'Intro content' },
  { name: 'api', title: 'API', content: 'API content' },
];

// 批量更新
tabs.setState({
  data: tabs.state.data,
  active: 'api',
  disabled: ['intro'],
});
// 单个更新
tabs.setState('active', 'api');

// 动态编辑，如：追加
tabs.state.data.push({ name: 'faq', title: 'FAQ', content: 'FAQ content' });
```

禁用项可以直接通过响应式状态更新：

```js
tabs.state.disabled = ['api'];
```

## Methods

Tabs 实例包含 `defineComponent()` 提供的通用方法，并额外提供 `activate()`：

| 方法                    | 说明                           |
| ----------------------- | ------------------------------ |
| `build()`               | 构建 Tabs DOM，不自动挂载      |
| `mount(container)`      | 构建并挂载根节点               |
| `unmount()`             | 移除根节点，保留 state         |
| `setState(patch)`       | 批量更新响应式 state           |
| `setState(key, value)`  | 更新单个 state 字段            |
| `own(cleanup)`          | 注册随组件销毁释放的资源       |
| `use(plugin, options?)` | 安装组件插件                   |
| `on(event, listener)`   | 监听组件生命周期或自定义事件   |
| `off(event, listener)`  | 移除组件事件监听               |
| `emit(event, ...args)`  | 触发组件事件                   |
| `destroy()`             | 销毁实例并移除组件创建的根节点 |
| `activate(value)`       | 激活指定索引或名称             |

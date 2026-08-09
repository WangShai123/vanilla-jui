# Pagination

Pagination 是分页组件。它根据 `total`、`page.size`、`page.current` 和页码窗口配置渲染分页按钮，并在页码变化时通过 `onChange(page, instance)` 通知业务层加载数据。

```js
import { createPagination } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

组件需要显式 `build()`，然后由用户手动挂载 `pagination.element`，或调用 `pagination.mount(container)`。

```js
const pagination = createPagination({
  total: 100,
  page: { size: 10, current: 1 },
  count: { sibling: 1, boundary: 1 },
  onChange(page, instance) {
    loadPage(page, instance.state.page.size);
  },
}).build();

document.querySelector('#pager').appendChild(pagination.element);
```

`total` 表示总数据数，不是总页数。总页数由 `Math.ceil(total / page.size)` 计算，最小为 `1`。

## State 更新

Pagination 支持通过响应式 `state` 刷新 DOM。更新 `total`、`page` 或 `count` 后，会自动重新计算 `pageCount`、夹取当前页并刷新页码窗口。

```js
pagination.setState({ total: 60 });

pagination.setState({
  page: {
    ...pagination.state.page,
    size: 20,
    current: 1,
  },
});

pagination.state.count.sibling = 2;
pagination.state.count.boundary = 1;
```

如果新的 `total` 或 `page.size` 让当前页超出总页数，`state.page.current` 会自动夹取到最后一页。

## 异步数据加载

Pagination 只负责页码状态和 DOM，不内置数据请求。通常在 `onChange` 中加载数据：

```js
const pagination = createPagination({
  total: 100,
  page: { size: 10, current: 1 },
  lock: true,
  async onChange(page, instance) {
    const rows = await getRows({
      page,
      size: instance.state.page.size,
    });
    renderRows(rows);
  },
}).build();
```

默认 `lock: true`。如果 `onChange` 返回 Promise，Promise settled 前会锁定分页控件，阻止继续点击切换。同步 `onChange` 会立即释放锁。

初始页数据建议由业务代码主动加载一次：

```js
loadPage(1);
```

## DOM 结构

`build()` 会创建离线 DOM：

```html
<div
  class="j-pagination"
  role="navigation"
  aria-label="Pagination"
  data-pagination="root"
>
  <ul class="pagination" data-pagination-list aria-live="polite">
    <li class="item" data-pagination-control="prev">
      <button class="j-button is-icon is-ghost" data-page-action="prev">
        ...
      </button>
    </li>
    <li class="item" data-pagination-item="2">
      <button class="j-button is-icon is-ghost" data-page="2">2</button>
    </li>
    <li class="item" data-pagination-item="3">
      <span class="j-button is-icon is-active" aria-current="page">3</span>
    </li>
    <li class="item more" data-pagination-more="more-3-8">
      <span class="j-button is-icon is-ghost">...</span>
    </li>
    <li class="item" data-pagination-control="next">
      <button class="j-button is-icon is-ghost" data-page-action="next">
        ...
      </button>
    </li>
  </ul>
</div>
```

组件内部交互依赖 `data-pagination-list`、`data-pagination-item`、`data-pagination-more`、`data-page` 和 `data-page-action`，不依赖默认 CSS 类。

## 页码窗口

`count.boundary` 控制首尾固定显示的页数，`count.sibling` 控制当前页左右相邻显示的页数。

```js
const pagination = createPagination({
  total: 200,
  page: { size: 10, current: 8 },
  count: { sibling: 1, boundary: 1 },
}).build();
```

上面的配置会保留首页、末页、当前页及当前页左右各 1 页，中间断层以 `data-pagination-more` 显示。

## Props

| 字段        | 类型               | 默认值                        | 说明                                      |
| ----------- | ------------------ | ----------------------------- | ----------------------------------------- |
| `total`     | `number`           | `0`                           | 总数据数，必须是大于等于 `0` 的有限数     |
| `page`      | `object`           | `{ size: 10, current: 1 }`    | 初始分页状态                              |
| `count`     | `object`           | `{ sibling: 1, boundary: 1 }` | 初始页码窗口配置                          |
| `lock`      | `boolean`          | `true`                        | 异步切换未完成前是否锁定分页              |
| `onChange`  | `Function \| null` | `null`                        | 页码变化后触发，参数为 `(page, instance)` |
| `className` | `object`           | 默认类名对象                  | 覆盖结构类名                              |

### page

| 字段      | 类型     | 说明                              |
| --------- | -------- | --------------------------------- |
| `size`    | `number` | 每页数据量，必须是大于 `0` 的整数 |
| `current` | `number` | 当前页码，必须是大于 `0` 的整数   |

### count

| 字段       | 类型     | 说明                                     |
| ---------- | -------- | ---------------------------------------- |
| `sibling`  | `number` | 当前页左右保留的相邻页数，必须是非负整数 |
| `boundary` | `number` | 首尾边界保留页数，必须是非负整数         |

## State

| 字段                   | 类型      | 说明                       |
| ---------------------- | --------- | -------------------------- |
| `state.total`          | `number`  | 总数据数                   |
| `state.page.size`      | `number`  | 每页数据量                 |
| `state.page.current`   | `number`  | 当前页码                   |
| `state.count.sibling`  | `number`  | 当前页左右相邻页数         |
| `state.count.boundary` | `number`  | 首尾边界页数               |
| `state.locked`         | `boolean` | 当前是否处于异步切换锁定中 |

`pageCount` 是实例只读 getter，不在 `state` 内。

## className

| 字段      | 默认值                       |
| --------- | ---------------------------- |
| `root`    | `j-pagination`               |
| `list`    | `pagination`                 |
| `item`    | `item`                       |
| `more`    | `more`                       |
| `button`  | `j-button is-icon is-ghost`  |
| `current` | `j-button is-icon is-active` |
| `loading` | `animate-spin`               |

## Methods

| 方法                | 说明                     |
| ------------------- | ------------------------ |
| `build()`           | 创建离线 DOM             |
| `mount(container)`  | 构建并挂载根节点         |
| `unmount()`         | 移除根节点，保留 state   |
| `go(page)`          | 跳转到指定页码           |
| `setState({ ... })` | 更新分页状态             |
| `destroy()`         | 销毁实例，释放事件和 DOM |

`go(page)` 需要在 `build()` 后调用。`destroy()` 会移除已经挂载的 `element`。

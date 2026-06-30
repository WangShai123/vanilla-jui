# Pagination

Pagination 是分页组件，源码位于 `src/components/pagination.js`。它根据总数据数、每页数量和当前页渲染分页按钮，并在页码变化时通过 `onChange(page, instance)` 通知调用方加载数据。

组件继承 `Component`。构造函数只验证参数、归一化配置和初始化实例状态；调用 `build()` 后才会创建 DOM、绑定事件并挂载到 `container`。

## 导入

```js
import { Pagination, createPagination } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const pagination = new Pagination('#pagination', {
  total: 20,
  page: {
    size: 2,
    current: 1,
  },
  count: {
    sibling: 1,
    boundary: 1,
  },
  onChange(page, instance) {
    fetchPage(page);
  },
});

pagination.build();
```

也可以使用工厂函数：

```js
const pagination = createPagination(document.querySelector('#pagination'), {
  total: 100,
  page: { size: 10, current: 1 },
  count: { sibling: 1, boundary: 1 },
  onChange(page) {
    console.log('new page:', page);
  },
});

pagination.build();
```

`total` 表示总数据数，不是总页数。总页数由 `Math.ceil(total / page.size)` 计算，最小为 `1`。

## 异步数据加载

Pagination 只负责页码状态和 DOM，不内置数据请求。通常在 `onChange` 中加载数据：

```js
const pager = new Pagination('#pager', {
  total: 20,
  page: { size: 2, current: 1 },
  count: { sibling: 1, boundary: 1 },
  async onChange(page) {
    const rows = await getRows({ page, size: 2 });
    renderRows(rows);
  },
}).build();
```

初始页数据建议由业务代码主动加载一次：

```js
loadPage(1);
pager.build();
```

## DOM 和 ARIA

`build()` 会在 `container` 内创建如下结构：

```html
<div class="j-pagination" role="navigation" aria-label="Pagination">
  <ul class="pagination" aria-live="polite">
    <li class="item">
      <a class="j-button is-icon is-ghost" data-page-action="prev">...</a>
    </li>
    <li class="item">
      <a class="j-button is-icon is-ghost" data-page="2">2</a>
    </li>
    <li class="item">
      <span class="j-button is-icon is-active" aria-current="page">3</span>
    </li>
    <li class="item more" aria-hidden="true">
      <span class="j-button is-icon is-ghost">...</span>
    </li>
    <li class="item">
      <a class="j-button is-icon is-ghost" data-page-action="next">...</a>
    </li>
  </ul>
</div>
```

- 上一页/下一页图标分别使用 `icon('arrow-left')` 和 `icon('arrow-right')`。
- 省略号使用 `icon('more')`。
- 当前页使用 `span` 和 `aria-current="page"`。
- 可点击页码使用 `a[data-page]`，并带有 `aria-label="Go to page N"`。
- 上一页/下一页禁用时会设置 `.is-disabled`、`aria-disabled="true"` 和 `tabindex="-1"`。

## 页码窗口

`count.boundary` 控制首尾固定显示的页数，`count.sibling` 控制当前页左右相邻显示的页数。

```js
new Pagination('#pager', {
  total: 200,
  page: { size: 10, current: 8 },
  count: { sibling: 1, boundary: 1 },
}).build();
```

上面的配置会保留首页、末页、当前页及当前页左右各 1 页，中间断层以 `.more` 显示。

## 参数

### `new Pagination(container, props)`

| 参数        | 类型                                 | 必填 | 说明            |
| ----------- | ------------------------------------ | ---- | --------------- |
| `container` | `string \| Element \| Node \| Array` | 是   | 分页挂载容器    |
| `props`     | `object`                             | 否   | Pagination 配置 |

构造函数会立即要求当前环境可渲染 DOM，并解析 `container`。如果容器不存在会抛出错误。构造函数不会向容器写入 DOM，也不会绑定事件。

### Props

| 字段       | 类型               | 默认值                        | 说明                                      |
| ---------- | ------------------ | ----------------------------- | ----------------------------------------- |
| `total`    | `number`           | `0`                           | 总数据数，必须是大于等于 `0` 的有限数     |
| `page`     | `object`           | `{ size: 10, current: 1 }`    | 分页状态配置                              |
| `count`    | `object`           | `{ sibling: 1, boundary: 1 }` | 页码窗口配置                              |
| `onChange` | `Function \| null` | `null`                        | 页码变化后触发，参数为 `(page, instance)` |

### `page`

| 字段      | 类型     | 必填 | 说明                              |
| --------- | -------- | ---- | --------------------------------- |
| `size`    | `number` | 是   | 每页数据量，必须是大于 `0` 的整数 |
| `current` | `number` | 是   | 当前页码，必须是大于 `0` 的整数   |

`current` 会被限制在 `[1, pageCount]` 内。比如总页数为 `3` 时传入 `current: 10`，实例会归一化为第 `3` 页。

### `count`

| 字段       | 类型     | 必填 | 说明                                     |
| ---------- | -------- | ---- | ---------------------------------------- |
| `sibling`  | `number` | 是   | 当前页左右保留的相邻页数，必须是非负整数 |
| `boundary` | `number` | 是   | 首尾边界保留页数，必须是非负整数         |

### `onChange(page, instance)`

| 参数       | 类型         | 说明                 |
| ---------- | ------------ | -------------------- |
| `page`     | `number`     | 新页码，即 `newPage` |
| `instance` | `Pagination` | 当前 Pagination 实例 |

`go()` 传入当前页时不会触发 `onChange`。

## 返回值

### `new Pagination(container, props)`

返回 `Pagination` 实例。

```js
const pagination = new Pagination('#pager', props);
```

### `createPagination(container, props)`

返回 `Pagination` 实例。它只是 `new Pagination(container, props)` 的工厂函数封装。

```js
const pagination = createPagination('#pager', props);
```

## 实例属性

| 属性      | 类型              | 说明                   |
| --------- | ----------------- | ---------------------- |
| `props`   | `object`          | 归一化后的配置对象     |
| `dom`     | `object`          | DOM 引用集合           |
| `state`   | `DeepStore`       | 响应式状态             |
| `runtime` | `object`          | 运行时状态             |
| `root`    | `Element \| null` | `.j-pagination` 根节点 |

### `props`

| 属性             | 类型               | 说明             |
| ---------------- | ------------------ | ---------------- |
| `props.total`    | `number`           | 总数据数         |
| `props.page`     | `object`           | 当前分页配置     |
| `props.count`    | `object`           | 当前页码窗口配置 |
| `props.onChange` | `Function \| null` | 页码变化回调     |

### `dom`

| 属性            | 类型              | 说明                             |
| --------------- | ----------------- | -------------------------------- |
| `dom.container` | `Element \| null` | 挂载容器                         |
| `dom.list`      | `Element \| null` | `.pagination` 列表节点           |
| `dom.prev`      | `Element \| null` | 上一页 `li.item` 节点            |
| `dom.next`      | `Element \| null` | 下一页 `li.item` 节点            |
| `dom.pageNodes` | `Element[]`       | 当前渲染的页码和 more 节点       |
| `dom.items`     | `Array`           | 保留字段，当前不作为公开数据使用 |

### `state`

| 属性                   | 类型     | 说明                       |
| ---------------------- | -------- | -------------------------- |
| `state.total`          | `number` | 总数据数                   |
| `state.page.size`      | `number` | 每页数据量                 |
| `state.page.current`   | `number` | 当前页码                   |
| `state.count.sibling`  | `number` | 当前页左右相邻页数         |
| `state.count.boundary` | `number` | 首尾边界页数               |
| `state.pageCount`      | `number` | 计算后的总页数，最小为 `1` |

### `runtime`

`runtime` 属于内部运行时状态，不建议业务代码依赖。常见字段包括：

| 属性                | 类型      | 说明                         |
| ------------------- | --------- | ---------------------------- |
| `runtime.destroyed` | `boolean` | 实例是否已销毁               |
| `runtime.built`     | `boolean` | 是否已经调用并完成 `build()` |
| `runtime.itemsKey`  | `string`  | 当前页码窗口的内部缓存键     |

## 实例方法

### `build()`

创建分页 DOM、挂载到 `container`，绑定点击事件和响应式属性。

```js
pagination.build();
```

| 项     | 说明                  |
| ------ | --------------------- |
| 参数   | 无                    |
| 返回值 | `Pagination` 当前实例 |

重复调用 `build()` 会直接返回当前实例，不会重复渲染。

### `go(page)`

跳转到指定页码。

```js
pagination.go(3);
```

| 项     | 说明                                 |
| ------ | ------------------------------------ |
| 参数   | `page: number`，目标页码，必须是整数 |
| 返回值 | `Pagination` 当前实例                |

`page` 会被限制到有效范围内。页码实际变化后会更新 `state.page.current`、`props.page.current`，并触发 `onChange(newPage, instance)`。

### `update(newProps)`

更新分页配置。

```js
pagination.update({
  total: 60,
  page: { current: 1 },
});
```

| 项     | 说明                             |
| ------ | -------------------------------- |
| 参数   | `newProps: object`，分页配置补丁 |
| 返回值 | `Pagination` 当前实例            |

`update()` 会把 `newProps.page` 和当前 `props.page` 浅合并，把 `newProps.count` 和当前 `props.count` 浅合并，然后重新校验配置、计算 `pageCount` 并更新响应式状态。

常见用法：

```js
pagination.update({ total: result.total });
pagination.update({ page: { size: 20, current: 1 } });
pagination.update({ count: { sibling: 2, boundary: 1 } });
pagination.update({ onChange: nextHandler });
```

如果新的 `total` 或 `page.size` 让当前页超出总页数，`current` 会自动夹取到最后一页。

### `destroy()`

销毁实例，解绑事件、释放响应式绑定并清空 `container`。

```js
pagination.destroy();
```

| 项     | 说明   |
| ------ | ------ |
| 参数   | 无     |
| 返回值 | `void` |

销毁后继续调用 `build()`、`go()` 或 `update()` 会抛出实例已销毁错误。继承自 `Component` 的 `on()`、`off()`、`emit()`、`use()` 也可使用。

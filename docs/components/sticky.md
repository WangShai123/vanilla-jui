# Sticky

Sticky 是用于侧边栏 widget 的吸附组件，源码位于 `src/components/sticky.js`。

它会给一个或多个目标元素设置 `position: sticky`，并按照元素顺序自动累加 `top` 偏移，避免多个 widget 在滚动吸附时重叠。组件继承 `Component`，使用 `props`、`dom`、`runtime`、`state` 的实例结构，并在 `destroy()` 时恢复目标元素原始的内联样式。

## 导入

```js
import { Sticky, createSticky } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const sticky = new Sticky({
  target: '.sidebar .widget',
  top: 16,
  gap: 16,
});

sticky.build();
```

`target` 可以是单个元素、CSS 选择器或元素数组。传入多个目标时，组件会按解析顺序从上到下计算：

```js
new Sticky({
  target: [
    document.querySelector('#toc'),
    document.querySelector('#latest-posts'),
  ],
}).build();
```

也可以使用工厂函数：

```js
const sticky = createSticky({
  target: '.widget',
});

sticky.build();
```

## Parent 作用域

推荐在复杂布局中传入 `parent`，把 selector 查询限制在指定父级内。

```js
const leftSticky = new Sticky({
  parent: '.layout-left',
  target: '.widget',
}).build();

const rightSticky = new Sticky({
  parent: '.layout-right',
  target: '.widget',
}).build();
```

使用 `parent` 后：

- `target` 是字符串时，只会在 `parent` 内查询匹配元素。
- `target` 是元素或元素数组时，只保留属于 `parent` 的元素。

如果不传 `parent`，字符串 `target` 会从整个 document 查询。

## 单一交互

单个 widget 直接传入目标元素或选择器：

```js
const toc = new Sticky({
  parent: '.article-layout',
  target: '.table-of-contents',
  top: 24,
}).build();
```

## 多元素堆叠

多个 widget 在同一实例内会按元素顺序堆叠：

```js
new Sticky({
  parent: '.sidebar',
  target: '.widget',
  top: 16,
  gap: 12,
}).build();
```

第一个元素的 `top` 是 `top`；下一个元素的 `top` 是前一个元素的 `top + offsetHeight + gap`。

## 数量控制

`max` 控制当前实例最多管理多少个目标元素。超出时由 `overflow` 决定策略：

```js
new Sticky({
  parent: '.sidebar',
  target: '.widget',
  max: 3,
  overflow: 'destroy',
}).build();
```

| `overflow`  | 行为                                                    |
| ----------- | ------------------------------------------------------- |
| `'destroy'` | 保留当前实例解析结果中最后 `max` 个目标，忽略更早的目标 |
| `'ignore'`  | 当前实例保持空状态，不修改目标元素                      |

## 参数

### `new Sticky(props)`

| 参数    | 类型     | 必填 | 说明            |
| ------- | -------- | ---- | --------------- |
| `props` | `object` | 否   | Sticky 配置对象 |

构造函数只归一化配置并初始化实例结构，不解析 DOM、不应用样式。调用 `build()` 后才会解析 `parent` / `target` 并启动 sticky 行为。

### Props

| 字段       | 类型                                         | 默认值      | 说明                                            |
| ---------- | -------------------------------------------- | ----------- | ----------------------------------------------- |
| `target`   | `string \| Element \| Node \| Array \| null` | `null`      | 需要设置 sticky 的目标元素                      |
| `parent`   | `string \| Element \| Node \| null`          | `null`      | 可选单一作用域，用于限制目标查询                |
| `max`      | `number`                                     | `10`        | 当前实例最多允许管理的目标元素数量              |
| `top`      | `number`                                     | `16`        | 第一项 sticky 的顶部偏移，单位 px               |
| `gap`      | `number`                                     | `16`        | 多个 sticky 元素之间的间距，单位 px             |
| `overflow` | `'destroy' \| 'ignore'`                      | `'destroy'` | 超出 `max` 时的处理策略                         |
| `onUpdate` | `Function \| null`                           | `null`      | 每次重新计算 top 后触发，参数为当前 Sticky 实例 |

## 实例属性

| 属性      | 类型        | 说明               |
| --------- | ----------- | ------------------ |
| `props`   | `object`    | 归一化后的配置对象 |
| `dom`     | `object`    | DOM 引用集合       |
| `state`   | `DeepStore` | 响应式状态         |
| `runtime` | `object`    | 运行时状态         |

### `dom`

| 属性          | 类型              | 说明                       |
| ------------- | ----------------- | -------------------------- |
| `dom.parent`  | `Element \| null` | 第一个解析到的 parent      |
| `dom.targets` | `Element[]`       | 当前实例管理的 sticky 目标 |

### `state`

| 属性          | 类型                                       | 说明                         |
| ------------- | ------------------------------------------ | ---------------------------- |
| `state.count` | `number`                                   | 当前实例管理的目标数量       |
| `state.top`   | `number`                                   | 第一个目标当前计算出的 top   |
| `state.items` | `Array<{ element: Element, top: number }>` | 当前实例内每个目标的计算结果 |

### `runtime`

`runtime` 属于内部运行时状态，不作为公开 API 依赖。常见字段包括 `destroyed`、`active` 和 `ignored`。

## 实例方法

### `build()`

解析 `parent` / `target`，应用 sticky 样式并写入 `dom.targets`、`state.items`。

```js
sticky.build();
```

| 项     | 说明              |
| ------ | ----------------- |
| 参数   | 无                |
| 返回值 | `Sticky` 当前实例 |

### `refresh()`

重新计算当前实例内所有 Sticky 目标的 top。适合内容高度变化后手动调用。

```js
sticky.refresh();
```

| 项     | 说明              |
| ------ | ----------------- |
| 参数   | 无                |
| 返回值 | `Sticky` 当前实例 |

### `destroy()`

销毁实例，恢复目标元素原始的内联 `position`、`top` 和 `zIndex`。

```js
sticky.destroy();
```

| 项     | 说明   |
| ------ | ------ |
| 参数   | 无     |
| 返回值 | `void` |

继承自 `Component` 的 `on()`、`off()`、`emit()`、`use()` 也可使用。

# Sticky

Sticky 是用于侧边栏 widget 的吸附原语，源码位于 `src/primitives/sticky.ts`。

它是围绕已有 DOM 工作的行为控制器，不基于 `defineComponent()`，不会创建根节点。Sticky 会给一个或多个目标元素设置 `position: sticky`，并按照元素顺序自动累加 `top` 偏移，避免多个 widget 在滚动吸附时重叠。实例使用 `props`、`runtime` 和 `state` 描述配置、生命周期和计算结果，并在 `destroy()` 时恢复目标元素原始的内联样式。

Sticky 默认不会观察 DOM 变化。需要在用户浏览过程中动态加入广告 widget、推荐模块等新目标时，可以设置 `reactive: true`，组件会观察 `parent`（未传时为 `document.body`）并在目标增删后重新解析 target。默认关闭是为了避免静态侧边栏产生不必要的 `MutationObserver` 开销。

## 导入

```js
import { createSticky } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const sticky = createSticky({
  target: '.sidebar .widget',
  top: 16,
  gap: 16,
});

sticky.build();
```

`target` 可以是单个元素、CSS 选择器或元素数组。传入多个目标时，组件会按解析顺序从上到下计算：

```js
createSticky({
  target: [
    document.querySelector('#toc'),
    document.querySelector('#latest-posts'),
  ],
}).build();
```

## Parent 作用域

推荐在复杂布局中传入 `parent`，把 selector 查询限制在指定父级内。

```js
const leftSticky = createSticky({
  parent: '.layout-left',
  target: '.widget',
}).build();

const rightSticky = createSticky({
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
const toc = createSticky({
  parent: '.article-layout',
  target: '.table-of-contents',
  top: 24,
}).build();
```

## 多元素堆叠

多个 widget 在同一实例内会按元素顺序堆叠：

```js
createSticky({
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
createSticky({
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

### `createSticky(props)`

| 参数    | 类型     | 必填 | 说明            |
| ------- | -------- | ---- | --------------- |
| `props` | `object` | 否   | Sticky 配置对象 |

工厂函数只归一化配置并初始化实例结构，不解析 DOM、不应用样式。调用 `build()` 后才会解析 `parent` / `target` 并启动 sticky 行为。

### Props

| 字段        | 类型                                         | 默认值      | 说明                                            |
| ----------- | -------------------------------------------- | ----------- | ----------------------------------------------- |
| `target`    | `string \| Element \| Node \| Array \| null` | `null`      | 需要设置 sticky 的目标元素                      |
| `parent`    | `string \| Element \| Node \| null`          | `null`      | 可选单一作用域，用于限制目标查询                |
| `max`       | `number`                                     | `10`        | 当前实例最多允许管理的目标元素数量              |
| `top`       | `number`                                     | `16`        | 第一项 sticky 的顶部偏移，单位 px               |
| `gap`       | `number`                                     | `16`        | 多个 sticky 元素之间的间距，单位 px             |
| `overflow`  | `'destroy' \| 'ignore'`                      | `'destroy'` | 超出 `max` 时的处理策略                         |
| `reactive`  | `boolean`                                    | `false`     | 是否观察父容器 DOM 变化并自动重新解析目标       |
| `onReBuild` | `Function \| null`                           | `null`      | 每次重新计算 top 后触发，参数为当前 Sticky 实例 |

## 实例属性

| 属性      | 类型        | 说明               |
| --------- | ----------- | ------------------ |
| `props`   | `object`    | 归一化后的配置对象 |
| `state`   | `DeepStore` | 响应式状态         |
| `runtime` | `object`    | 运行时状态         |

Sticky 的 parent、targets 和原始 style 快照保存在闭包内，不作为公开 DOM map 暴露。

### `state`

| 属性          | 类型                                                 | 说明                         |
| ------------- | ---------------------------------------------------- | ---------------------------- |
| `state.items` | `Array<{ key: string, index: number, top: number }>` | 当前实例内每个目标的计算结果 |

### `runtime`

`runtime` 包含 `built` 和 `destroyed`。

## 实例方法

### `build()`

解析 `parent` / `target`，应用 sticky 样式并写入 `state.items`。

```js
sticky.build();
```

| 项     | 说明             |
| ------ | ---------------- |
| 参数   | 无               |
| 返回值 | 当前 Sticky 实例 |

### `reBuild()`

重新解析目标集合并计算当前实例内所有 Sticky 目标的 top。适合目标增删或内容高度变化后手动调用；`reactive: true` 时，父容器 DOM 变化会自动调度该方法。

```js
sticky.reBuild();
```

| 项     | 说明             |
| ------ | ---------------- |
| 参数   | 无               |
| 返回值 | 当前 Sticky 实例 |

### `destroy()`

销毁实例，恢复目标元素原始的内联 `position`、`top` 和 `zIndex`。

```js
sticky.destroy();
```

| 项     | 说明   |
| ------ | ------ |
| 参数   | 无     |
| 返回值 | `void` |

Sticky 不创建根节点，也不提供 `mount()`、`setState()`、`on()`、`off()`、`emit()` 或 `use()`；运行时变化通过 `reBuild()` 重新计算。

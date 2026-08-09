# Parabola

Parabola 是抛物线动画 UI 原语，源码位于 `src/primitives/parabola.ts`。它通过 `createParabola(props)` 创建实例，内部使用 `requestAnimationFrame` 驱动小球从起点元素飞向终点元素，适合加入购物车、收藏飞入等高频触发的业务动效。

创建实例时只会创建一个实例根节点。每次调用 `show()` 都会生产一个新的小球并启动一轮独立动画；动画结束后只移除本轮小球，不会销毁实例，也不会影响其他正在飞行的小球。

## 导入

```js
import { createParabola } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const parabola = createParabola({
  from: document.querySelector('#add-to-cart'),
  to: document.querySelector('#cart'),
  direction: 'center',
});

await parabola.show();
```

`show()` 返回 `Promise<boolean>`。小球成功生产并开始动画时 resolve `true`；实例已销毁、起点或终点不存在时 resolve `false`。返回 `false` 不会销毁实例，修复端点后可以继续调用 `show()`。

## 参数

### `createParabola(props)`

| 参数    | 类型     | 必填 | 说明              |
| ------- | -------- | ---- | ----------------- |
| `props` | `object` | 否   | Parabola 配置对象 |

### Props

| 字段        | 类型                                | 默认值            | 说明                         |
| ----------- | ----------------------------------- | ----------------- | ---------------------------- |
| `from`      | `string \| Element \| Node \| null` | `null`            | 起点元素                     |
| `to`        | `string \| Element \| Node \| null` | `null`            | 终点元素                     |
| `direction` | `string`                            | `'center'`        | 起点取样位置                 |
| `showDelay` | `number`                            | `0`               | 开始动画前的延迟，单位毫秒   |
| `ball`      | `object`                            | 见下表            | 小球样式配置                 |
| `className` | `object`                            | `{ ball: '...' }` | 小球类名配置                 |
| `onShow`    | `Function \| null`                  | `null`            | 单次小球开始动画时触发       |
| `onHidden`  | `Function \| null`                  | `null`            | 单次小球动画结束并移除时触发 |

### `direction`

| 值               | 说明                 |
| ---------------- | -------------------- |
| `'center'`       | 从起点元素中心出发   |
| `'top-right'`    | 从起点元素右上方出发 |
| `'top-left'`     | 从起点元素左上方出发 |
| `'bottom-right'` | 从起点元素右下方出发 |
| `'bottom-left'`  | 从起点元素左下方出发 |

### `ball`

| 字段    | 默认值              | 说明     |
| ------- | ------------------- | -------- |
| `color` | `var(--tone-solid)` | 小球颜色 |
| `size`  | `12px`              | 小球尺寸 |

### `className`

| 字段   | 默认值          | 说明     |
| ------ | --------------- | -------- |
| `ball` | `parabola-ball` | 小球类名 |

实例根节点固定输出 `data-parabola="root"`，每个小球固定输出 `data-parabola="ball"`。内部行为不依赖 CSS 类选择器。

## 实例结构

| 属性                | 说明                                  |
| ------------------- | ------------------------------------- |
| `props`             | 归一化后的配置                        |
| `element`           | 实例根节点，销毁且小球清空后为 `null` |
| `runtime.destroyed` | 实例是否已销毁                        |

`runtime.destroyed` 只表示实例已经被手动销毁，不表示单次动画已经结束。单次动画结束后只移除对应小球，实例仍可继续生产新的小球。

起点、终点、当前小球集合和延迟启动定时器保存在实例闭包内，不作为公开 DOM map 暴露。

## 定时器

`showDelay` 通过项目统一的 `timer` 工具管理。每次调用 `show()` 都会注册一轮独立的开始定时器；`destroy()` 会取消尚未触发、尚未生产小球的定时器。

## 方法

### `show()`

延迟后重新解析起点和终点元素，计算坐标，生产一个新小球，并开始一轮独立动画。

```js
const started = await parabola.show();
```

| 项     | 说明                                     |
| ------ | ---------------------------------------- |
| 参数   | 无                                       |
| 返回值 | `Promise<boolean>`，表示动画是否成功开始 |

### `destroy()`

销毁实例，之后 `show()` 永远返回 `false`。销毁会取消尚未生产小球的延迟任务，但不会手动结束已经生产出来的小球动画；这些小球会继续飞行，并在动画结束后自行移除。

```js
parabola.destroy();
```

| 项     | 说明   |
| ------ | ------ |
| 参数   | 无     |
| 返回值 | `void` |

Parabola 不再提供 `start()` 别名，请直接使用 `show()`。

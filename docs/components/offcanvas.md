# Offcanvas

Offcanvas 是全局侧滑面板组件，适用于侧边菜单、筛选面板和移动端抽屉。

```js
import { createOffcanvas } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const panel = createOffcanvas({
  direction: 'right',
  content: 'Hello Panel',
}).build();

await panel.show();
await panel.hide();
```

`content` 支持字符串、DOM 节点、节点数组、函数和 `null`。函数型 `content` 会在 `show()` 时执行，可返回普通内容或 Promise；Promise resolve 前会在内容区显示 `createLoading()`。

## 内容状态

`content` 是响应式状态。更新 `state.content` 会自动刷新内容区：

```js
panel.state.content = 'Updated content';

panel.setState({
  content: 'updated content',
});
```

如果新的 `content` 是函数且面板当前已显示，会立即重新加载；如果面板未显示，会等下次 `show()` 时加载。

## 异步内容和缓存

```js
const panel = createOffcanvas({
  direction: 'right',
  cache: true,
  ttl: 60 * 1000,
  content: async (offcanvas) => {
    const res = await fetch('/api/offcanvas');
    return await res.text();
  },
}).build();
```

`cache: true` 时，函数型 `content` 的结果会缓存在当前实例中。`ttl` 为缓存有效期，单位毫秒；`0` 或省略表示不过期。缓存有效期内再次 `show()` 不会重复执行 `content` 回调。

## 动效模式

`animate: 'slide'` 启用内置 Motion，按 `direction` 从对应方向滑入、反向滑出。传入其他字符串时，面板 Motion 不会接管 `transform`，仅将值写入 `data-animate`，便于业务层实现其他视觉策略。

```js
const panel = createOffcanvas({
  animate: 'none',
  className: {
    root: 'app-drawer',
    overlay: 'app-drawer-mask',
    content: 'app-drawer-content',
  },
}).build();
```

## DOM 结构

`build()` 会创建离线 DOM；`show()` 时插入 `document.body`：

```html
<div
  id="offcanvas-id"
  class="j-offcanvas"
  role="dialog"
  aria-modal="true"
  aria-expanded="false"
  data-offcanvas="root"
  data-direction="right"
  data-animate="slide"
>
  <div class="offcanvas-content" data-offcanvas-content="offcanvas-id"></div>
</div>
```

开启 overlay 时还会创建：

```html
<div class="j-offcanvas-overlay" data-offcanvas-overlay="offcanvas-id"></div>
```

组件内部定位使用 `data-offcanvas`、`data-offcanvas-overlay`、`data-offcanvas-content` 和 `data-action`，不依赖默认 CSS 类。

## 关闭方式

```js
const panel = createOffcanvas({
  content: '...',
  bgClose: true,
  escClose: true,
}).build();
```

点击遮罩、按 `Escape`、或点击面板内 `data-action="close"` / `data-action="cancel"` 的元素都会触发关闭。

启用 overlay 时，遮罩挂载期间会接收 pointer events，用于阻断页面其它元素点击并支持 `bgClose`。`pointer-events: none` 会让事件穿透到页面元素，不适合作为 Offcanvas 打开态的遮罩行为。

默认情况下，面板展示时会给 `document.body` 设置 `overflow: hidden`，隐藏后恢复。多个 Offcanvas 同时展示时会共享滚动锁，直到最后一个面板隐藏或销毁后才恢复原值。需要保留页面自身滚动行为时，可以设置 `bodyOverflow: false`。

## Props

| 参数           | 类型                                           | 默认值    | 说明                                  |
| -------------- | ---------------------------------------------- | --------- | ------------------------------------- |
| `content`      | `string \| Node \| Node[] \| Function \| null` | `""`      | 面板内容。函数型 content 支持异步返回 |
| `overlay`      | `boolean`                                      | `true`    | 是否显示遮罩                          |
| `filter`       | `boolean`                                      | `true`    | 遮罩层是否启用模糊滤镜                |
| `bodyOverflow` | `boolean`                                      | `true`    | 展示时是否控制 body overflow          |
| `cache`        | `boolean`                                      | `false`   | 是否缓存函数型 content 的结果         |
| `ttl`          | `number`                                       | `0`       | 缓存有效时间，单位毫秒                |
| `direction`    | `"top" \| "right" \| "bottom" \| "left"`       | `"left"`  | 滑出方向，写入 `data-direction`       |
| `animate`      | `string`                                       | `"slide"` | 动效名称，写入 `data-animate`         |
| `bgClose`      | `boolean`                                      | `true`    | 点击遮罩关闭                          |
| `escClose`     | `boolean`                                      | `true`    | Escape 关闭                           |
| `id`           | `string \| null`                               | 自动生成  | 面板 id                               |
| `className`    | `object`                                       | 默认类名  | 覆盖组件结构类名                      |
| `onShow`       | `Function \| null`                             | `null`    | 展示前回调，支持 Promise              |
| `onShown`      | `Function \| null`                             | `null`    | 展示后回调                            |
| `onHide`       | `Function \| null`                             | `null`    | 隐藏前回调，支持 Promise              |
| `onHidden`     | `Function \| null`                             | `null`    | 隐藏后回调                            |

## State

| 字段      | 类型               | 说明                        |
| --------- | ------------------ | --------------------------- |
| `content` | `OffcanvasContent` | 当前内容，更新后自动渲染    |
| `visible` | `boolean`          | 面板当前是否可见            |
| `loading` | `boolean`          | 函数型 content 是否正在加载 |

## className

| 字段      | 默认值                |
| --------- | --------------------- |
| `root`    | `j-offcanvas`         |
| `overlay` | `j-offcanvas-overlay` |
| `content` | `offcanvas-content`   |

## Methods

| 方法                    | 说明                              |
| ----------------------- | --------------------------------- |
| `build()`               | 创建离线 DOM                      |
| `show()`                | 插入到 `document.body` 并展示面板 |
| `hide()`                | 隐藏并从 `document.body` 移除面板 |
| `setState({ content })` | 更新内容状态并刷新内容区          |
| `destroy()`             | 销毁实例，释放事件、定时器和 DOM  |

`show()` 和 `hide()` 需要在 `build()` 后调用。

两者通过公共 presence 协调器管理 DOM 生命周期。`show()` 在挂载后播放面板和遮罩的进入 Motion；`hide()` 播放对应的离场 Motion，全部完成后再卸载。动画不依赖默认 className 或 `style.css`。

机制说明和自定义组件接入方式见 [Presence 与 Motion](../core/presence.md)。

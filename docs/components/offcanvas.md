# Offcanvas

Offcanvas 继承 `Component`，侧滑面板组件，源码位于 `src/components/offcanvas.js`。适用于侧边菜单、筛选面板和移动端抽屉，内部负责 body 滚动锁、遮罩、动画类名和关闭事件。

## 导入

```js
import { Offcanvas } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const panel = new Offcanvas({
  direction: 'right',
  content: '<button data-action="close">Close</button><p>Panel</p>',
});

await panel.show();
await panel.hide();
```

`content` 支持字符串、DOM 节点、节点数组、函数和 `null`。函数型 `content` 会在 `show()` 时执行，可返回普通内容或 Promise；Promise resolve 前会在内容区显示 `createLoading()`。

## 异步内容和缓存

```js
const panel = new Offcanvas({
  direction: 'right',
  cache: true,
  ttl: 60 * 1000,
  content: async (offcanvas) => {
    const res = await fetch('/api/offcanvas');
    return await res.text();
  },
});
```

`cache: true` 时，函数型 `content` 的结果会缓存在当前实例中。`ttl` 为缓存有效期，单位毫秒；`0` 或省略表示不过期。缓存有效期内再次 `show()` 不会重复执行 `content` 回调。

## 动画类型

### slide（默认）

面板从侧边滑入，遮罩层覆盖在内容上方。

```js
new Offcanvas({ animation: 'slide', direction: 'right' });
```

### push

面板从侧边滑入，同时将页面内容向反方向推移。

```js
new Offcanvas({ animation: 'push', direction: 'left' });
```

### none

无过渡动画，直接显示/隐藏。

```js
new Offcanvas({ animation: 'none' });
```

## 关闭方式

```js
const panel = new Offcanvas({
  content: '...',
  bgClose: true, // 点击遮罩关闭（默认 true）
  escClose: true, // 按 Esc 关闭（默认 true）
});
```

面板内的 `data-action="close"` 或 `data-action="cancel"` 按钮也会触发关闭。

## 回调

```js
const panel = new Offcanvas({
  content: '...',
  onShow: () => console.log('showing'),
  onShown: () => console.log('shown'),
  onHide: () => console.log('hiding'),
  onHidden: () => console.log('hidden'),
});
```

`onShow` 和 `onHide` 支持返回 Promise，resolve 后继续执行。

## 实例属性

| 属性    | 说明                                |
| ------- | ----------------------------------- |
| `root`  | 面板 DOM 节点                       |
| `props` | 归一化后的配置                      |
| `state` | 响应式状态，含 `visible`、`loading` |

`state.visible` 是响应式布尔值，表示面板当前是否可见。
`state.loading` 表示函数型 `content` 是否正在加载。

## 实例方法

| 方法        | 说明                     |
| ----------- | ------------------------ |
| `show()`    | 展示面板，返回 Promise   |
| `hide()`    | 隐藏面板，返回 Promise   |
| `destroy()` | 销毁实例，释放事件和 DOM |

继承自 `Component` 的方法也可使用：`setState()`、`on()`、`off()`、`emit()`、`use()`。

## 参数

| 参数        | 类型                                           | 默认值    | 说明                                  |
| ----------- | ---------------------------------------------- | --------- | ------------------------------------- |
| `content`   | `string \| Node \| Node[] \| Function \| null` | `''`      | 面板内容。函数型 content 支持异步返回 |
| `overlay`   | `boolean`                                      | `true`    | 是否显示遮罩                          |
| `filter`    | `boolean`                                      | `true`    | 遮罩层是否启用模糊滤镜                |
| `cache`     | `boolean`                                      | `false`   | 是否缓存函数型 content 的结果         |
| `ttl`       | `number`                                       | `0`       | 缓存有效时间，单位毫秒                |
| `direction` | `'top' \| 'right' \| 'bottom' \| 'left'`       | `'left'`  | 滑出方向                              |
| `animation` | `'slide' \| 'push' \| 'none'`                  | `'slide'` | 动画类型                              |
| `bgClose`   | `boolean`                                      | `true`    | 点击遮罩关闭                          |
| `escClose`  | `boolean`                                      | `true`    | Esc 关闭                              |
| `id`        | `string \| null`                               | `null`    | 面板 id，不传时自动生成               |
| `onShow`    | `Function \| null`                             | `null`    | 展示前回调，支持 Promise              |
| `onShown`   | `Function \| null`                             | `null`    | 展示后回调                            |
| `onHide`    | `Function \| null`                             | `null`    | 隐藏前回调，支持 Promise              |
| `onHidden`  | `Function \| null`                             | `null`    | 隐藏后回调                            |

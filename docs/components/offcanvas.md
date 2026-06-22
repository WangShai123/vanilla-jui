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

`content` 支持字符串、DOM 节点、节点数组、函数和 `null`。

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
  bgClose: true,   // 点击遮罩关闭（默认 true）
  escClose: true,  // 按 Esc 关闭（默认 true）
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

| 属性    | 说明                   |
| ------- | ---------------------- |
| `root`  | 面板 DOM 节点          |
| `props` | 归一化后的配置         |
| `state` | 响应式状态，含 `visible` |

`state.visible` 是响应式布尔值，表示面板当前是否可见。

## 实例方法

| 方法      | 说明                           |
| --------- | ------------------------------ |
| `show()`  | 展示面板，返回 Promise         |
| `hide()`  | 隐藏面板，返回 Promise         |
| `destroy()` | 销毁实例，释放事件和 DOM     |

继承自 `Component` 的方法也可使用：`setState()`、`on()`、`off()`、`emit()`、`use()`。

## 参数

| 参数        | 类型                                     | 默认值    | 说明                           |
| ----------- | ---------------------------------------- | --------- | ------------------------------ |
| `content`   | `string \| Node \| Node[] \| Function \| null` | `''` | 面板内容                       |
| `overlay`   | `boolean`                                | `true`    | 是否显示遮罩                   |
| `filter`    | `boolean`                                | `true`    | 遮罩层是否启用模糊滤镜         |
| `direction` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'left'`  | 滑出方向                       |
| `animation` | `'slide' \| 'push' \| 'none'`            | `'slide'` | 动画类型                       |
| `bgClose`   | `boolean`                                | `true`    | 点击遮罩关闭                   |
| `escClose`  | `boolean`                                | `true`    | Esc 关闭                       |
| `id`        | `string \| null`                         | `null`    | 面板 id，不传时自动生成        |
| `onShow`    | `Function \| null`                       | `null`    | 展示前回调，支持 Promise       |
| `onShown`   | `Function \| null`                       | `null`    | 展示后回调                     |
| `onHide`    | `Function \| null`                       | `null`    | 隐藏前回调，支持 Promise       |
| `onHidden`  | `Function \| null`                       | `null`    | 隐藏后回调                     |

## 测试

可视化半自动测试页面：`tests/offcanvas.test.html`。

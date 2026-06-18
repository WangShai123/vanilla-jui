# Offcanvas

Offcanvas 是侧滑面板组件，源码位于 `src/components/offcanvas.js`。它适合侧边菜单、筛选面板和移动端抽屉，内部负责 body 滚动锁、遮罩、动画类名和关闭事件。

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

## 参数

| 参数        | 类型                                     | 默认值    | 说明         |
| ----------- | ---------------------------------------- | --------- | ------------ |
| `overlay`   | `boolean`                                | `true`    | 是否显示遮罩 |
| `direction` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'left'`  | 滑出方向     |
| `animation` | `'slide' \| 'push' \| 'none'`            | `'slide'` | 动画类型     |
| `bgClose`   | `boolean`                                | `true`    | 点击遮罩关闭 |
| `escClose`  | `boolean`                                | `true`    | Esc 关闭     |

## 测试

可视化半自动测试页面：`tests/offcanvas.test.html`。

# Drop

Drop 是通用浮层组件，源码位于 `src/components/drop.js`。它保持轻量命令式定位和事件管理，适合下拉面板、菜单浮层和自定义提示内容。

## 导入

```js
import { Drop } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const drop = new Drop(button, {
  mode: 'click',
  position: 'bottom-left',
  content: '<strong>Drop content</strong>',
});

drop.show();
drop.hide();
```

`content` 支持字符串、DOM 节点、节点数组、函数和 `null`。传入 Element 节点时会直接作为内容 wrapper 使用。

## 参数

| 参数          | 类型                                           | 默认值    | 说明             |
| ------------- | ---------------------------------------------- | --------- | ---------------- |
| `mode`        | `'click' \| 'hover'`                           | `'click'` | 触发方式         |
| `position`    | `string`                                       | `'auto'`  | 浮层位置         |
| `offset`      | `number`                                       | `10`      | 与目标元素间距   |
| `content`     | `string \| Node \| Node[] \| Function \| null` | `''`      | 浮层内容         |
| `delay`       | `number \| object`                             | `0`       | 展示/隐藏延迟    |
| `hoverIntent` | `boolean`                                      | `true`    | hover 模式防误触 |

## 测试

可视化半自动测试页面：`tests/drop.test.html`。

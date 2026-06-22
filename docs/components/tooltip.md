# Tooltip

Tooltip 基于 Drop 实现，源码位于 `src/components/tooltip.js`。只负责把文本包装成标准 Tooltip UI，定位和触发交给 Drop。

## 导入

```js
import { Tooltip } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const tooltip = new Tooltip(button, {
  message: '保存成功后会自动同步',
  position: 'top-center',
});

tooltip.show();
tooltip.hide();
```

## 参数

| 参数          | 类型                          | 默认值   | 说明                                             |
| ------------- | ----------------------------- | -------- | ------------------------------------------------ |
| `message`     | `string`                      | —        | 提示文案，不能为空                               |
| `mode`        | `'click' \| 'hover'`          | `'hover'`| 触发方式                                         |
| `position`    | `string`                      | `'auto'` | 浮层位置，取值与 Drop 一致                       |
| `offset`      | `number`                      | `8`      | 与目标元素间距                                   |
| `delay`       | `number \| object`            | `100`    | 展示/隐藏延迟（毫秒）                           |
| `hoverIntent` | `boolean`                     | `true`   | hover 模式下启用意图判断                         |
| `name`        | `string \| null`              | `null`   | 提示名称，写入 `data-drop`                       |
| `id`          | `string \| null`              | `null`   | 浮层 id，不传时自动生成                          |
| `className`   | `string \| null`              | `null`   | 浮层额外类名                                     |

## 实例方法

| 方法             | 说明                     |
| ---------------- | ------------------------ |
| `show(useDelay)` | 展示提示                 |
| `hide(useDelay)` | 隐藏提示                 |
| `toggle()`       | 切换展示状态             |
| `destroy()`      | 销毁 Tooltip 和底层 Drop |

## 测试

可视化半自动测试页面：`tests/tooltip.test.html`。

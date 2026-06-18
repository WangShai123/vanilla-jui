# Tooltip

Tooltip 是基于 Drop 的文本提示组件，源码位于 `src/components/tooltip.js`。它只负责把文本提示包装成标准 Tooltip UI，定位和触发交给 Drop。

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

## 方法

| 方法             | 说明                     |
| ---------------- | ------------------------ |
| `show(useDelay)` | 展示提示                 |
| `hide(useDelay)` | 隐藏提示                 |
| `toggle()`       | 切换展示状态             |
| `destroy()`      | 销毁 Tooltip 和底层 Drop |

## 测试

可视化半自动测试页面：`tests/tooltip.test.html`。

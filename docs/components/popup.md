# Popup

Popup 是轻量弹层容器，源码位于 `src/components/popup.js`。复杂表单弹窗应使用 Modal；简单内容浮层、全屏提示和自定义容器可以使用 Popup。

## 导入

```js
import { Popup } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const popup = new Popup({
  content: '<div>Popup content</div>',
  bgClose: true,
  escClose: true,
});

popup.show();
popup.hide();
```

`lazy: true` 时会延迟到首次 `show()` 才创建 DOM。

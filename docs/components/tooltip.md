# Tooltip

Tooltip 基于 Drop 实现，源码位于 `src/primitives/tooltip.ts`。它不继承 Component，只通过工厂函数创建实例。Tooltip 只负责把文本包装成标准 Tooltip UI，定位和触发交给 Drop。

## 导入

```js
import { createTooltip } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const tooltip = createTooltip(button, {
  message: '保存成功后会自动同步',
  position: 'top-center',
  theme: 'primary',
});

tooltip.show();
tooltip.hide();
```

## 参数

| 参数          | 类型                 | 默认值    | 说明                       |
| ------------- | -------------------- | --------- | -------------------------- |
| `message`     | `string`             | —         | 提示文案，不能为空         |
| `mode`        | `'click' \| 'hover'` | `'hover'` | 触发方式                   |
| `position`    | `string`             | `'auto'`  | 浮层位置，取值与 Drop 一致 |
| `offset`      | `number`             | `8`       | 与目标元素间距             |
| `theme`       | `string \| false`    | `false`   | 主题色，见下方说明         |
| `delay`       | `number \| object`   | `100`     | 展示/隐藏延迟（毫秒）      |
| `hoverIntent` | `boolean`            | `true`    | hover 模式下启用意图判断   |
| `name`        | `string \| null`     | `null`    | 提示名称，写入 `data-drop` |
| `id`          | `string \| null`     | `null`    | 浮层 id，不传时自动生成    |
| `className`   | `object`             | 见下表    | 覆盖 Tooltip 内容类名      |

## className

| 字段        | 默认值      | 说明             |
| ----------- | ----------- | ---------------- |
| `container` | `j-tooltip` | Tooltip 内容容器 |
| `message`   | `el-text`   | Tooltip 文案节点 |
| `ui`        | 见下表      | 主题类名映射     |

### className.ui

| 字段      | 默认值       | 说明         |
| --------- | ------------ | ------------ |
| `reverse` | `is-reverse` | 反色主题类名 |
| `primary` | `is-primary` | 主色主题类名 |
| `success` | `is-success` | 成功主题类名 |
| `warning` | `is-warning` | 警告主题类名 |
| `error`   | `is-error`   | 错误主题类名 |

Tooltip 内容节点使用 `data-tooltip` 和 `data-tooltip-message`；底层浮层定位、触发和根节点类名由 Drop 负责。

## theme

`theme` 默认为 `false`，不输出主题类名。设置为字符串时，只支持：

`reverse`、`primary`、`success`、`warning`、`error`

配置后会在 Tooltip 内容容器 `.j-tooltip` 上追加对应的 `className.ui` 类名：

```js
createTooltip(button, {
  message: '删除后不可恢复',
  theme: 'error',
});
```

```html
<div class="j-tooltip is-error">...</div>
```

## 实例方法

实例根节点统一通过 `tooltip.element` 访问。

| 方法             | 说明                     |
| ---------------- | ------------------------ |
| `show(useDelay)` | 展示提示                 |
| `hide(useDelay)` | 隐藏提示                 |
| `toggle()`       | 切换展示状态             |
| `destroy()`      | 销毁 Tooltip 和底层 Drop |

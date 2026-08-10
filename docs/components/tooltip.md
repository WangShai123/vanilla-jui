# Tooltip

Tooltip 是文本提示控制器，源码位于 `src/primitives/tooltip.ts`。它通过 `createTooltip(element, props)` 创建实例，把 `message` 包装为标准 Tooltip 内容，再交给 Drop 负责触发、定位、延迟和销毁。

Tooltip 自身不创建额外生命周期。实例方法会转发到底层 Drop；`tooltip.element` 始终指向当前 Drop 根节点，`destroy()` 后为 `null`。

## 导入

```js
import { createTooltip } from 'vanilla-jui';
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

| 参数          | 类型                                         | 默认值    | 说明                           |
| ------------- | -------------------------------------------- | --------- | ------------------------------ |
| `message`     | `string`                                     | `''`      | 提示文案，会 trim，不能为空    |
| `mode`        | `'click' \| 'hover'`                         | `'hover'` | 触发方式                       |
| `position`    | Drop position                                | `'auto'`  | 浮层位置，取值与 Drop 一致     |
| `offset`      | `number`                                     | `8`       | 与目标元素间距                 |
| `theme`       | `false \| 'reverse' \| 'primary' \| ...`     | `false`   | 主题色，见下方说明             |
| `cache`       | `boolean`                                    | `false`   | 透传给 Drop 的内容缓存开关     |
| `ttl`         | `number`                                     | `0`       | 透传给 Drop 的缓存有效期，毫秒 |
| `delay`       | `number \| { show?: number, hide?: number }` | `100`     | 展示/隐藏延迟，单位毫秒        |
| `hoverIntent` | `boolean`                                    | `true`    | hover 模式下启用意图判断       |
| `name`        | `string \| null`                             | `null`    | 提示名称，传给 Drop 和内容节点 |
| `id`          | `string \| null`                             | `null`    | 浮层 id，传给 Drop             |
| `className`   | `object`                                     | 见下表    | 覆盖 Tooltip 内容类名          |
| `onShown`     | `Function \| null`                           | `null`    | Drop 展示后回调                |
| `onHidden`    | `Function \| null`                           | `null`    | Drop 隐藏后回调                |

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

Tooltip 内容节点使用 `data-tooltip` 和 `data-tooltip-message`；底层浮层根节点、定位、触发和关闭行为由 Drop 负责。

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

## 实例属性

| 属性      | 说明                              |
| --------- | --------------------------------- |
| `element` | 底层 Drop 根节点；销毁后为 `null` |
| `drop`    | 底层 Drop 实例；销毁后为 `null`   |

## 实例方法

| 方法             | 说明                     |
| ---------------- | ------------------------ |
| `show(useDelay)` | 展示提示                 |
| `hide(useDelay)` | 隐藏提示                 |
| `toggle()`       | 切换展示状态             |
| `destroy()`      | 销毁 Tooltip 和底层 Drop |

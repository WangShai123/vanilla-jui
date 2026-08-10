# Toast

Toast 是静态消息提示工具，源码位于 `src/primitives/toast.ts`。它不需要实例化，直接通过静态方法展示消息。

Toast 的 `duration` 表示消息停留时间，不是动画时长。Toast 是静态 DOM 行为控制器，不使用 `defineComponent()`；入场和离场直接由 Web Animations API 处理，离场完成后才删除节点。动画不依赖默认 className 或 `style.css`。

## 导入

```js
import { Toast } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
Toast.success('保存成功');
Toast.error('保存失败', 5000);
Toast.lite('已更新');
```

## 方法

| 方法                                         | 说明                                 | 默认值                                             |
| -------------------------------------------- | ------------------------------------ | -------------------------------------------------- |
| `Toast.show(message, duration, type)`        | 展示指定类型消息，返回 `HTMLElement` | `message = ''`, `duration = 3000`, `type = 'info'` |
| `Toast.success/info/warning/error/primary()` | 展示快捷类型消息，返回 `HTMLElement` | `message = ''`, `duration = 3000`                  |
| `Toast.lite(message, duration)`              | 展示单例轻提示，返回 `HTMLElement`   | `message = ''`, `duration = 2000`                  |
| `Toast.action(message, props)`               | 展示操作型消息                       | `message = ''`, `props = {}`                       |
| `Toast.configure(options)`                   | 配置默认类名                         | `options = {}`                                     |
| `Toast.hide(toast)`                          | 隐藏指定节点                         |                                                    |
| `Toast.clearAll()`                           | 清理所有 Toast 和定时器              |                                                    |
| `Toast.destroyAll()`                         | `clearAll()` 的别名                  |                                                    |

**`type` 枚举值**: `'info'` | `'success'` | `'warning'` | `'error'` | `'primary'`

## 选项

Toast.action 方法的 `props` 有以下可选项：

| 选项           | 说明             | 默认值         |
| -------------- | ---------------- | -------------- |
| `text`         | 操作按钮文本     |                |
| `text.close`   | 关闭按钮文本     | 关闭 / Close   |
| `text.action`  | 确认按钮文本     | 确认 / Confirm |
| `onAction`     | 点击操作按钮回调 |                |
| `onClose`      | 点击关闭按钮回调 |                |

## className

`Toast.configure({ className })` 可覆盖全局默认类名；`show()`、快捷方法、`lite()`、`action()` 的最后一个参数也支持单次覆盖。

| 字段           | 默认值              | 说明           |
| -------------- | ------------------- | -------------- |
| `container`    | `j-toast-container` | 容器           |
| `toast`        | `j-toast`           | 普通 Toast     |
| `icon`         | `el-icon`           | 图标           |
| `message`      | `el-text`           | 文案           |
| `lite`         | `j-toast-lite`      | 轻提示         |
| `action`       | `j-toast is-action` | 操作型 Toast   |
| `actions`      | `toast-actions`     | 操作按钮区域   |
| `button`       | `j-button is-sm`    | 操作按钮基础类 |
| `closeBtn`     | `is-ghost`          | 关闭按钮类     |
| `actionBtn`    | `is-outline`        | 确认按钮类     |
| `info`         | `is-info`           | 信息类型类     |
| `success`      | `is-success`        | 成功类型类     |
| `warning`      | `is-warning`        | 警告类型类     |
| `error`        | `is-error`          | 错误类型类     |
| `primary`      | `is-primary`        | 主色类型类     |

组件内部定位使用 `data-toast-container`、`data-toast-lite`、`data-toast-message`、`data-action` 等稳定属性，不依赖默认 CSS 类。

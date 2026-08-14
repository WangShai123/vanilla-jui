# Toast

Toast 是静态消息提示工具，源码位于 `src/primitives/toast.ts`。它不需要实例化，直接通过静态方法展示消息。

Toast 的 `duration` 表示消息停留时间，不是动画时长。Toast 是静态 DOM 行为控制器，不使用 `defineComponent()`；入场和离场直接由 Web Animations API 处理，离场完成后才删除节点。动画不依赖默认 className 或 `style.css`。

## 导入

```js
import { Toast } from 'vanilla-jui';
```

## 基础用法

```js
Toast.success('保存成功');
Toast.error('保存失败', { duration: 5000 });
Toast.lite('已更新');
```

## 方法

| 方法                                         | 说明                                 | 默认值                            |
| -------------------------------------------- | ------------------------------------ | --------------------------------- |
| `Toast.show(message, options)`               | 展示指定主题消息，返回 `HTMLElement` | `message = ''`, `options = {}`    |
| `Toast.success/info/warning/error/primary()` | 展示快捷主题消息，返回 `HTMLElement` | `message = ''`, `options = {}`    |
| `Toast.lite(message, duration, className)`   | 展示单例轻提示，返回 `HTMLElement`   | `message = ''`, `duration = 2000` |
| `Toast.confirm(message, props)`              | 展示确认型消息                       | `message = ''`, `props = {}`      |
| `Toast.configure(options)`                   | 配置默认类名                         | `options = {}`                    |
| `Toast.hide(toast)`                          | 隐藏指定节点                         |                                   |
| `Toast.clearAll()`                           | 清理所有 Toast 和定时器              |                                   |
| `Toast.destroyAll()`                         | `clearAll()` 的别名                  |                                   |

**`theme` 枚举值**: `'info'` | `'success'` | `'warning'` | `'error'` | `'primary'`

## 选项

`show()` 和快捷方法的选项有以下可选项：

| 选项           | 说明                                                | 默认值     |
| -------------- | --------------------------------------------------- | ---------- |
| `loading`      | 响应式加载状态；为 `true` 时显示 loading 图标和文案 | `false`    |
| `duration`     | 消息停留时间，单位毫秒                              | `3000`     |
| `theme`        | 消息主题                                            | `info`     |
| `text`         | 文案配置                                            |            |
| `text.loading` | 加载中文案                                          | Loading... |
| `onClose`      | 用户点击 Toast 关闭后触发                           |            |
| `onCancel`     | 用户点击关闭且关闭瞬间 `loading` 仍为 `true` 时触发 |            |

当 `duration > 0` 时，普通 Toast 只会在 `loading` 为 `false` 时启动自动关闭计时。初始 `loading` 为 `true` 的 Toast 会保持显示，直到业务把响应式状态改为 `false` 后再按 `duration` 计时关闭。

用户点击关闭时，Toast 会先进入关闭流程并释放响应式绑定，再按关闭瞬间的 `loading` 状态决定是否执行 `onCancel`，最后执行 `onClose`。因此即使 `onCancel` 中取消请求并把 `loading` 改为 `false`，也不会在关闭中的 Toast 上短暂暴露普通 message。`duration` 自动关闭不会触发 `onCancel` 或 `onClose`。

```js
const [loading, setLoading] = createSignal(true);

Toast.info('保存完成', {
  duration: 3000,
  loading,
  text: { loading: '保存中...' },
  onCancel: () => controller.abort(),
});

submit().finally(() => setLoading(false));
```

Toast.confirm 方法的 `props` 有以下可选项：

| 选项           | 说明             | 默认值         |
| -------------- | ---------------- | -------------- |
| `theme`        | 操作型消息主题   | `info`         |
| `text`         | 操作按钮文本     |                |
| `text.close`   | 关闭按钮文本     | 关闭 / Close   |
| `text.confirm` | 确认按钮文本     | 确认 / Confirm |
| `onConfirm`    | 点击确认按钮回调 |                |
| `onClose`      | 点击关闭按钮回调 |                |

## className

`Toast.configure({ className })` 可覆盖全局默认类名；`show()`、快捷方法和 `confirm()` 通过选项中的 `className` 单次覆盖。`lite()` 面向最简洁场景，第三个参数直接传入 className 配置。

| 字段         | 默认值               | 说明           |
| ------------ | -------------------- | -------------- |
| `container`  | `j-toast-container`  | 容器           |
| `toast`      | `j-toast`            | 普通 Toast     |
| `icon`       | `el-icon`            | 图标           |
| `message`    | `el-text`            | 文案           |
| `lite`       | `j-toast-lite`       | 轻提示         |
| `confirm`    | `j-toast is-confirm` | 确认型 Toast   |
| `buttons`    | `toast-buttons`      | 按钮区域       |
| `button`     | `j-button is-sm`     | 操作按钮基础类 |
| `closeBtn`   | `is-ghost`           | 关闭按钮类     |
| `confirmBtn` | `is-outline`         | 确认按钮类     |
| `info`       | `is-info`            | 信息类型类     |
| `success`    | `is-success`         | 成功类型类     |
| `warning`    | `is-warning`         | 警告类型类     |
| `error`      | `is-error`           | 错误类型类     |
| `primary`    | `is-primary`         | 主色类型类     |

组件内部定位使用 `data-toast-container`、`data-toast-lite`、`data-toast-message`、`data-toast-button` 等稳定属性，不依赖默认 CSS 类。

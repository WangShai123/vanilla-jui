# Modal

Modal 继承 `Component`，基于 `vanilla-signal` 的 `createDeepStore` 和 `render` 实现，源码位于 `src/components/modal.ts`。实例创建时的结构配置保存在 `props`，运行时交互由 `state` 驱动。

核心 API：`createModal(props).build().show()`。

## 导入

```js
import { createModal } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础弹窗

```js
const dialog = createModal({
  text: {
    title: 'Delete item',
    confirm: 'Delete',
    cancel: 'Cancel',
  },
  content: 'Are you sure you want to delete this item?',
  bgClose: true,
  escClose: true,
  onConfirm: async (modal) => {
    await deleteItem();
    modal.hide();
  },
}).build();

dialog.show();

// 等价于：
dialog.state.visible = true;
```

`content` 支持字符串、数字、布尔值、DOM 节点、节点数组、函数和空值。函数型 `content` 会收到当前 Modal 实例，返回值会继续按同一套内容规则归一化。

```js
const dialog = createModal({
  text: { title: 'Preview' },
  content: (modal) => `Current title: ${modal.props.text.title}`,
}).build();
```

## 状态边界

把运行时需要关注的数据放入响应式 `state`：

| 字段         | 说明                                |
| ------------ | ----------------------------------- |
| `visible`    | 是否显示；显示和隐藏的响应式状态源  |
| `loading`    | 是否显示 loading 遮罩，并禁用按钮   |
| `processing` | 内部确认、取消或提交状态            |
| `mode`       | 内容区渲染模式，支持 `content/form` |
| `content`    | 普通内容模式下的内容                |
| `fields`     | 表单字段，表单模式下传给内部 Form   |
| `data`       | 最近一次表单提交数据                |
| `extraData`  | 下一次表单提交时合并的数据          |

## 响应式交互

```js
const modal = createModal({
  text: { title: 'Preview' },
  content: 'Draft',
}).build();

modal.state.visible = true;
modal.state.mode = 'content';
modal.state.content = 'Saved';
modal.state.loading = true;

modal.state.visible = false;
```

`build()` 用于创建 DOM。`state.visible` 是显示和隐藏的状态源，写成 `true` 时，Modal 会挂载已构建的根节点、锁定页面滚动、绑定关闭事件并聚焦第一个可交互元素；写成 `false` 时，会执行隐藏动画、清理事件、释放滚动锁并移除 DOM。

Modal 的入场和离场由公共 presence 机制协调，内部使用 `createTransition()` 创建 opacity/scale Web Animation。同一个 Animation 正向播放为入场、反向播放为离场；离场的 `finished` 完成后才卸载 DOM。快速连续调用 `show()` / `hide()` 时，过期任务不会卸载已重新打开的节点。详见 [Presence 与 Motion](../utilities/presence.md) 和 [Transition API](../utilities/motion.md)。

Modal 不会自动 build。调用 `show()` 或直接写 `state.visible = true` 前，必须先调用 `build()`。

需要批量写入并保留校验时，使用 `setState(patch)`：

```js
modal.setState({
  content: 'Saved',
  loading: true,
  visible: true,
});

modal.setState({ loading: false });
```

`setState()` 只接收状态补丁，会校验字段名和值类型。传入非状态字段会抛出错误。

## 渲染模式

Modal 的内容区由 `mode` 显式决定：

| 值        | 行为                                    |
| --------- | --------------------------------------- |
| `content` | 渲染 `state.content`                    |
| `form`    | 使用 `state.fields` 创建或更新内部 Form |

未传 `mode` 时，Modal 会在初始化时按 `fields` 推导一次：传入 `fields` 数组则初始为 `form`，否则初始为 `content`。实例创建后不再靠 `fields` 是否为数组推导渲染模式。

```js
const dialog = createModal({
  mode: 'content',
  content: 'Plain content',
  fields: [{ label: 'Name', name: 'name' }],
}).build();
```

上面的例子会渲染普通内容，`fields` 只是保存在 state 中。运行时切换模式时，显式写 `mode`：

```js
dialog.setState({
  mode: 'form',
  fields: [{ label: 'Name', name: 'name', required: true }],
});

dialog.setState({
  mode: 'content',
  content: 'Saved',
});
```

## 表单弹窗

表单模式下，Modal 内部会创建 `Form` 实例并设置 `buttons: false`，底部确认按钮会触发表单提交；校验通过后触发 `onSubmit(data, modal)`。

```js
const editor = createModal({
  mode: 'form',
  text: {
    title: 'User',
    confirm: 'Save',
    cancel: 'Cancel',
  },
  fields: [
    { label: 'Name', name: 'name', required: true },
    { label: 'Email', name: 'email', type: 'email' },
    {
      label: 'Role',
      name: 'role',
      type: 'select',
      value: 'admin',
      options: [
        { text: 'Admin', value: 'admin' },
        { text: 'User', value: 'user' },
      ],
    },
  ],
  onSubmit: async (data, modal) => {
    modal.setState({ loading: true });
    await saveUser(data);
    modal.setState({ loading: false });
    modal.hide();
  },
}).build();

editor.show();
```

同名字段会由 Form 合并为数组。额外提交数据可以直接写入 `state.extraData`，并会在下一次表单提交时合并到 data。

```js
editor.state.extraData = { source: 'profile-page' };
editor.requestSubmit();
```

更复杂的独立表单建议直接使用 `createForm()`，调用 `build()` 后把 `form.element` 作为普通内容传给 Modal。

## 动态更新

运行时数据通过 `state` 或 `setState()` 更新。`setState()` 会校验字段名和值类型，并通过 Modal 的状态 hook 处理表单字段克隆和内部 Form 同步。

```js
dialog.setState({
  content: 'Updated content',
  loading: true,
});
```

更新 `content` 只会改变内容数据；是否渲染它由 `state.mode` 决定。表单模式下更新内容后，需要显式切换到内容模式才会显示：

```js
dialog.setState({ content: 'Plain content' });
dialog.setState({ mode: 'content' });
```

同理，更新 `fields` 只会改变表单字段数据；需要显示表单时显式写入 `mode: 'form'`。

下面这些写法都无效，因为它们试图更新初始化配置：

```js
dialog.setState({ text: { confirm: 'Save' } });
dialog.setState({ position: 'bottom' });
dialog.setState({ className: { modal: 'app-modal' } });
dialog.setState({ showCancel: false });
```

如果运行时需要改变主体内容或表单字段，使用 `state.mode`、`state.content`、`state.fields` 或 `setState({ mode, content, fields })`。

## 实例属性

继承自 `Component` 的常用属性：

| 属性                | 说明                                      |
| ------------------- | ----------------------------------------- |
| `props`             | 归一化后的初始化配置                      |
| `state`             | 响应式状态对象，也是运行时 UI 的主要来源  |
| `dom`               | DOM 引用容器，含 `modal/body/footer/form` |
| `runtime.destroyed` | 实例是否已销毁                            |

Modal 还维护内部 `cache` 和 `cleanup`，用于初始快照、样式、焦点、计时器和事件清理；业务代码通常不需要直接访问。

## 实例方法

| 方法              | 说明                                                 |
| ----------------- | ---------------------------------------------------- |
| `build()`         | 创建 Modal DOM 并返回当前实例                        |
| `show()`          | 设置 `state.visible = true` 并返回当前实例           |
| `hide()`          | 设置 `state.visible = false` 并返回当前实例          |
| `setState(patch)` | 批量设置响应式状态字段并返回当前实例                 |
| `requestSubmit()` | 表单模式提交 Form；非表单模式执行确认逻辑            |
| `isBusy()`        | 返回 `loading` 或 `processing` 是否为 true           |
| `reset()`         | 恢复初始 `mode/content/fields`，并清空运行时提交状态 |
| `destroy()`       | 销毁实例，释放 DOM、Form、事件和响应式渲染资源       |

继承自 `Component` 的方法也可使用：`on()`、`off()`、`emit()`、`use()`。

## 参数

| 参数         | 类型                                                               | 默认值     | 说明                                       |
| ------------ | ------------------------------------------------------------------ | ---------- | ------------------------------------------ |
| `mode`       | `'content' \| 'form' \| null`                                      | 自动推导   | 内容区初始渲染模式                         |
| `content`    | `string \| number \| boolean \| Node \| Array \| Function \| null` | `''`       | 初始非表单内容，也是 `state.content` 初值  |
| `position`   | `string`                                                           | `'center'` | 弹窗布局位置，对应 `is-${position}`        |
| `showCancel` | `boolean`                                                          | `true`     | 是否显示取消按钮                           |
| `showClose`  | `boolean`                                                          | `true`     | 是否显示右上角关闭按钮                     |
| `fullscreen` | `boolean`                                                          | `false`    | 是否全屏                                   |
| `text`       | `object`                                                           | 见下表     | 初始化文案配置                             |
| `fields`     | `FormField[] \| null`                                              | `null`     | 初始表单字段，也是 `state.fields` 初值     |
| `header`     | `boolean`                                                          | `true`     | 是否显示头部                               |
| `footer`     | `boolean`                                                          | `true`     | 是否显示底部                               |
| `id`         | `string \| null`                                                   | 自动生成   | 弹窗 id；空字符串或 `null` 会自动生成      |
| `escClose`   | `boolean`                                                          | `false`    | 是否允许 Esc 关闭                          |
| `bgClose`    | `boolean`                                                          | `false`    | 是否允许点击背景关闭                       |
| `className`  | `object`                                                           | 见下表     | 覆盖组件结构类名，仅初始化时生效           |
| `onShow`     | `(modal) => void \| Promise<void>`                                 | `null`     | 开始显示时触发                             |
| `onShown`    | `(modal) => void \| Promise<void>`                                 | `null`     | 显示后触发                                 |
| `onHide`     | `(modal) => void \| Promise<void>`                                 | `null`     | 开始隐藏时触发                             |
| `onHidden`   | `(modal) => void \| Promise<void>`                                 | `null`     | 隐藏并移除 DOM 后触发                      |
| `onConfirm`  | `(modal) => void \| Promise<void>`                                 | `null`     | 非表单模式确认时触发，由调用方决定是否关闭 |
| `onSubmit`   | `(data, modal) => void \| Promise<void>`                           | `null`     | 表单模式提交时触发                         |
| `onCancel`   | `(modal) => void \| Promise<void>`                                 | `null`     | `data-action="cancel/close"` 触发          |

`mode`、`content` 和 `fields` 会作为初始状态进入 `state`，可在运行时通过 `state` 或 `setState()` 更新。其余参数都是实例结构或行为配置，实例创建后保持固定。

## text

| 字段      | 默认值      | 说明         |
| --------- | ----------- | ------------ |
| `title`   | `'Tip'`     | 标题文本     |
| `confirm` | `'Confirm'` | 确认按钮文本 |
| `cancel`  | `'Cancel'`  | 取消按钮文本 |

`text` 会和默认文案合并，只在实例创建和 DOM 渲染时使用，不进入 `state`，不能通过 `setState()` 修改。需要改变创建期配置时，创建新实例并显式销毁旧实例。

## className

| 字段         | 默认值                   | 说明           |
| ------------ | ------------------------ | -------------- |
| `layout`     | `j-popup-layout`         | 弹窗布局根节点 |
| `modal`      | `j-modal`                | 弹窗主体       |
| `header`     | `modal-header`           | 头部           |
| `body`       | `modal-body`             | 内容区         |
| `footer`     | `modal-footer`           | 底部           |
| `title`      | `modal-title`            | 标题           |
| `button`     | `j-button`               | 按钮基础类     |
| `closeBtn`   | `is-icon is-sm is-ghost` | 关闭按钮类     |
| `cancelBtn`  | `is-ghost`               | 取消按钮类     |
| `confirmBtn` | `is-primary`             | 确认按钮类     |

`className` 是结构类名配置，会和默认类名合并，未配置字段继续使用默认值。它只在实例创建和 DOM 构建时使用，不进入 `state`，也不能通过 `setState()` 运行时修改。

组件内部动作绑定使用 `data-action`，结构标记使用 `data-modal="root"` 和 `data-modal-dialog`，不依赖默认 CSS 类。Modal 根节点由 `createPopup()` 创建，因此包含 `role="dialog"`、`aria-modal="true"` 和 `is-${position}`。

## data-action

内容区可以放置带 `data-action` 的自定义按钮，Modal 会统一代理处理。

| 值        | 行为                                 |
| --------- | ------------------------------------ |
| `close`   | 执行 `onCancel(modal)`，成功后隐藏   |
| `cancel`  | 执行 `onCancel(modal)`，成功后隐藏   |
| `confirm` | 非表单模式执行 `onConfirm(modal)`    |
| `submit`  | 触发表单提交；非表单模式执行确认逻辑 |

`bgClose` 和 `escClose` 会直接隐藏 Modal，不会触发 `onCancel`。

## Field 配置

Modal 的 `fields` 直接传给内部 Form，因此字段配置和 `FormField` 保持一致。

| 字段           | 说明                                                          |
| -------------- | ------------------------------------------------------------- |
| `label`        | 字段标签；传 `false` 或省略时不渲染标签                       |
| `name`         | 表单字段名，用于 `FormData` 和 Validator 规则匹配             |
| `type`         | `text`、`email`、`password`、`textarea`、`select`、`radio` 等 |
| `options`      | `select`、`radio`、多选 `checkbox` 的选项数组                 |
| `value`        | 默认值；多选 checkbox 可传数组                                |
| `checked`      | 单个 checkbox、radio 或 switch 的默认选中状态                 |
| `required`     | 渲染原生 `required`，并让标签显示必填标记                     |
| `placeholder`  | 输入提示                                                      |
| `help`         | 字段下方帮助文本                                              |
| `disabled`     | 禁用控件                                                      |
| `readonly`     | 只读控件                                                      |
| `autocomplete` | 浏览器自动填充策略                                            |
| `multiple`     | `select` 是否多选                                             |
| `vertical`     | 单个字段的选项排列方向                                        |
| `group`        | radio/checkbox 组样式                                         |
| `size`         | 控件尺寸标记                                                  |
| `variant`      | 控件变体标记                                                  |
| `className`    | 单个字段额外类名                                              |
| `content`      | `type: 'custom'` 时渲染的自定义内容                           |

更多字段、校验和按钮能力见 `docs/components/form.md`。

# Modal

Modal 是基于 `defineComponent()` 的交互组件，源码位于 `src/components/modal.ts`。实例创建时的结构和行为配置保存在 `props`，运行时交互由 `createDeepStore` 创建的 `state` 驱动。`build()` 只创建 Modal 骨架，不解析 `content`；`show()` 时才根据 `content`、`cache` 和 `ttl` 幂等装载内容。

核心 API：`createModal(props).build().show()`。Modal 的常规显示流程由 `show()` / `hide()` 通过 `document.body` 管理。

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
```

`content` 支持字符串、数字、布尔值、DOM 节点、节点数组、函数和空值。字符串始终按文本渲染，不解析 HTML。函数型 `content` 会收到当前 Modal 实例，返回值继续按同一套内容规则渲染。

```js
const dialog = createModal({
  text: { title: 'Preview' },
  content: (modal) => `Current title: ${modal.props.text.title}`,
}).build();
```

## 异步内容

函数型 `content` 可以返回 Promise。只有异步 `content` 解析期间，Modal 才会把 `state.loading` 设为 `true`，并在统一遮罩层显示 `createLoading()`。同步 content 函数不会进入 loading。

```js
const dialog = createModal({
  text: { title: 'Remote preview' },
  cache: true,
  ttl: 30_000,
  content: async () => {
    const data = await loadPreview();
    return data.summary;
  },
}).build();
```

`cache: false` 时，每次 show 都会重新解析函数型 `content`。`cache: true` 时，Modal 会复用同一个 content 源的解析结果。`ttl` 为毫秒，`0` 表示不过期。

## 状态边界

把运行时需要关注的数据放入响应式 `state`：

| 字段         | 说明                                    |
| ------------ | --------------------------------------- |
| `visible`    | 是否显示；显示和隐藏的响应式状态源      |
| `content`    | 当前内容源                              |
| `loading`    | 异步函数型 `content` 正在解析           |
| `processing` | 异步 `onConfirm` 或 `onCancel` 正在处理 |

`loading` 只服务于异步内容解析。`processing` 只服务于确认/取消动作的异步回调；同步 `onConfirm` 和 `onCancel` 不会进入 processing。`loading` 和 `processing` 共用同一个遮罩层，processing 期间会阻止确认、取消、关闭、Esc 和背景点击等交互入口。

离场阶段不会给 Modal 内部节点设置 `aria-hidden`，而是使用 `data-mount="false"` 标记关闭中的 DOM，避免内部仍有可聚焦元素时触发可访问性冲突。

```js
modal.setState({
  content: 'Saved',
  visible: true,
});
```

`setState()` 只接收状态补丁，会校验字段名和值类型。传入非状态字段会抛出错误。

## 生命周期

`build()` 创建 owned view 和稳定根节点，但不解析内容、不插入文档。

`show()` 设置 `state.visible = true`，挂载根节点、锁定滚动、绑定事件，并按缓存策略解析 `state.content`。

`hide()` 设置 `state.visible = false`，触发离场动画。离场期间不会清空 body 内容；非缓存内容会在离场完成后清理，避免关闭动画过程中出现内容闪烁或尺寸突变。

Modal 的入场和离场由公共 presence 机制协调，遮罩根节点和 dialog 使用同一个 Motion group，因此 overlay 与面板同步进入和离开。详见 [Presence 与 Motion](../core/presence.md) 和 [Transition API](../core/motion.md)。

## 表单弹窗

Modal 不内置 form 模式，也不接收 `fields`、`validator` 或 `onSubmit`。需要表单弹窗时，直接创建 Form，并把 `form.element` 作为 Modal content。

```js
const form = createForm({
  fields: [
    {
      type: 'text',
      payload: { label: 'Name', name: 'name', required: true },
    },
  ],
  buttons: false,
  onSubmit: async (data) => {
    await saveUser(data);
    modal.hide();
  },
}).build();

const modal = createModal({
  text: {
    title: 'User',
    confirm: 'Save',
    cancel: 'Cancel',
  },
  content: () => form.element,
  onConfirm: () => {
    form.requestSubmit();
  },
}).build();
```

这种组合让 Modal 只负责弹层、异步内容和动作状态，Form 只负责字段、动态责任链、校验和提交。

## 实例属性

| 属性                | 说明                                     |
| ------------------- | ---------------------------------------- |
| `props`             | 归一化后的初始化配置                     |
| `state`             | 响应式状态对象，也是运行时 UI 的主要来源 |
| `runtime.built`     | 是否已创建 owned view                    |
| `runtime.mounted`   | 根节点当前是否挂载                       |
| `runtime.destroyed` | 实例是否已销毁                           |
| `element`           | build 后的稳定根节点                     |

## 实例方法

| 方法               | 说明                                      |
| ------------------ | ----------------------------------------- |
| `build()`          | 创建 Modal 骨架并返回当前实例             |
| `mount(container)` | 构建并挂载根节点；普通业务更常用 `show()` |
| `unmount()`        | 移除根节点，保留 state 和 view owner      |
| `show()`           | 设置 `state.visible = true`               |
| `hide()`           | 设置 `state.visible = false`              |
| `setState(patch)`  | 批量设置响应式状态字段                    |
| `reset()`          | 恢复初始 content，清空缓存和运行状态      |
| `destroy()`        | 销毁实例，释放 DOM、事件和响应式资源      |

公共控制器方法还包括 `own()`、`use()`、`on()`、`off()` 和 `emit()`，语义见 [Functional Component Runtime](./component.md)。

## 参数

| 参数         | 类型                                                               | 默认值     | 说明                                     |
| ------------ | ------------------------------------------------------------------ | ---------- | ---------------------------------------- |
| `content`    | `string \| number \| boolean \| Node \| Array \| Function \| null` | `''`       | 初始内容，也是 `state.content` 初值      |
| `cache`      | `boolean`                                                          | `false`    | 是否缓存函数型异步 `content` 的解析结果  |
| `ttl`        | `number`                                                           | `0`        | 内容缓存有效期，单位毫秒；`0` 表示不过期 |
| `position`   | `string`                                                           | `'center'` | 弹窗布局位置，对应 `is-${position}`      |
| `showCancel` | `boolean`                                                          | `true`     | 是否显示取消按钮                         |
| `showClose`  | `boolean`                                                          | `true`     | 是否显示右上角关闭按钮                   |
| `fullscreen` | `boolean`                                                          | `false`    | 是否全屏                                 |
| `text`       | `object`                                                           | 见下表     | 初始化文案配置                           |
| `header`     | `boolean`                                                          | `true`     | 是否渲染头部节点                         |
| `footer`     | `boolean`                                                          | `true`     | 是否渲染底部节点                         |
| `id`         | `string \| null`                                                   | 自动生成   | 弹窗 id；空字符串或 `null` 会自动生成    |
| `escClose`   | `boolean`                                                          | `false`    | 是否允许 Esc 关闭                        |
| `bgClose`    | `boolean`                                                          | `false`    | 是否允许点击背景关闭                     |
| `className`  | `object`                                                           | 见下表     | 覆盖组件结构类名，仅初始化时生效         |
| `onShow`     | `(modal) => void \| Promise<void>`                                 | `null`     | 开始显示时触发                           |
| `onShown`    | `(modal) => void \| Promise<void>`                                 | `null`     | 显示后触发                               |
| `onHide`     | `(modal) => void \| Promise<void>`                                 | `null`     | 开始隐藏时触发                           |
| `onHidden`   | `(modal) => void \| Promise<void>`                                 | `null`     | 隐藏并移除 DOM 后触发                    |
| `onConfirm`  | `(modal) => void \| Promise<void>`                                 | `null`     | 确认时触发，由调用方决定是否关闭         |
| `onCancel`   | `(modal) => void \| Promise<void>`                                 | `null`     | `data-action="cancel/close"` 触发        |

`content` 会作为初始状态进入 `state`，可在运行时通过 `state.content` 或 `setState({ content })` 更新。其余参数都是实例结构或行为配置，实例创建后保持固定。

## text

| 字段      | 默认值      | 说明         |
| --------- | ----------- | ------------ |
| `title`   | `'Tip'`     | 标题文本     |
| `confirm` | `'Confirm'` | 确认按钮文本 |
| `cancel`  | `'Cancel'`  | 取消按钮文本 |

`text` 会和默认文案合并，只在实例创建和 DOM 渲染时使用，不进入 `state`，不能通过 `setState()` 修改。

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

`className` 是结构类名配置，会和默认类名合并，未配置字段继续使用默认值。它只在实例创建和 DOM 构建时使用，不进入 `state`。

## data-action

内容区可以放置带 `data-action` 的自定义按钮，Modal 会统一代理处理。

| 值        | 行为                               |
| --------- | ---------------------------------- |
| `close`   | 执行 `onCancel(modal)`，成功后隐藏 |
| `cancel`  | 执行 `onCancel(modal)`，成功后隐藏 |
| `confirm` | 执行 `onConfirm(modal)`            |

`bgClose` 和 `escClose` 会直接隐藏 Modal，不会触发 `onCancel`。

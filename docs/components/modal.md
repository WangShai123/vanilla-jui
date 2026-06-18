# Modal

Modal 是基于 `vanilla-signal` 渲染的弹窗组件，源码位于 `src/components/modal.js`。运行时 UI 状态集中在 `modal.state`，实例方法只是对响应式状态的薄封装，适合在响应式项目里以 `new Modal(options)` 创建、复用和动态更新。

## 导入

```js
import { Modal } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础弹窗

```js
const dialog = new Modal({
  title: 'Delete item',
  content: 'Are you sure you want to delete this item?',
  confirmText: 'Delete',
  cancelText: 'Cancel',
  bgClose: true,
  escClose: true,
  onConfirm: async () => {
    await deleteItem();
  },
});

dialog.show();
// 等价于：
dialog.state.visible = true;
```

`content` 支持字符串、DOM 节点、节点数组、函数和 `null`。传函数时会收到当前 modal 实例。

## 响应式状态

```js
const modal = new Modal({
  title: 'Preview',
  content: 'Draft',
});

modal.state.visible = true;
modal.state.title = 'Published';
modal.state.content = 'Saved';
modal.state.fullscreen = true;
modal.state.loading = true;

modal.state.visible = false;
```

`state.visible` 是显示/隐藏的唯一状态源。`show()` 和 `hide()` 只是写入 `state.visible` 的便捷方法，因此可以按组件状态、业务 store 或事件回调直接驱动 Modal。

需要统一入口或链式写法时，使用 `setState(key, value)`：

```js
modal
  .setState('title', 'Saved')
  .setState('loading', true)
  .setState('visible', true);

modal.setState('loading', false);
```

## 表单弹窗

传入 `fields` 数组后进入表单模式。确认按钮会提交表单，浏览器原生校验通过后触发 `onSubmit(data)`。

```js
const editor = new Modal({
  title: 'User',
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
  onSubmit: async (data) => {
    editor.setState('loading', true);
    await saveUser(data);
    editor.setState('loading', false);
    editor.hide();
  },
  onCancel: () => {
    console.log('Closed by cancel or close button');
  },
});

editor.show();
```

同名字段会合并为数组。`addFields(data)` 可以给下一次提交额外合并业务字段。

## 动态更新

```js
dialog.update({
  title: 'Preview',
  content: 'Updated content',
  fullscreen: true,
  showCancel: false,
  confirmText: 'Done',
});
```

`update()` 会批量写入 `state`，适合一次性更新多个字段；直接写 `modal.state.title`、`modal.state.content`、`modal.state.fields`、`modal.state.visible` 等状态也会触发响应式渲染。`id`、`lazy` 只在初始化阶段生效，运行时通过 `update()` 更新会抛错。

`setState(key, value)` 只更新单个字段并返回当前实例，适合事件链路中逐步修改状态。`id`、`lazy` 同样不能通过 `setState()` 修改。

## Flow 适配层

传入 `flow` 后，Modal 会把内部或内容区里的 `data-action="next"`、`data-action="back"` 自动映射到 `flow.next(payload)` 和 `flow.back(payload)`。如果当前是表单模式，Modal 会先执行浏览器原生校验，再把表单数据作为 payload 缓存到 Flow；切换完成后会读取 `flow.currentStep.view` 并调用 `update()` 同步标题、内容、字段和按钮状态。

```js
import { Flow, Modal } from 'vanilla-jui';

const flow = new Flow({
  render: false,
  steps: [
    {
      id: 'account',
      view: {
        title: 'Account',
        fields: [{ label: 'Email', name: 'email', type: 'email' }],
        showBack: false,
        showNext: true,
      },
    },
    {
      id: 'confirm',
      view: {
        title: 'Confirm',
        content: (modal) => `Email: ${modal.state.flow.state.data.email}`,
        showBack: true,
        showNext: false,
      },
    },
  ],
});

const modal = new Modal({
  flow,
  ...flow.currentStep.view,
  backText: 'Back',
  nextText: 'Next',
});

modal.show();
```

返回到表单步骤时，Modal 会使用 Flow 的当前步骤缓存回填同名字段。`step.view` 仍然是普通 Modal 配置，因此可以按步骤控制 `title`、`content`、`fields`、`showBack`、`showNext`、`confirmText` 等 UI。需要完全自定义 next/back UI 时，把 `backText` 或 `nextText` 设为 `false`，再在内容区渲染自己的 `data-action="back"` / `data-action="next"` 控件。

## 实例属性

| 属性             | 说明                                     |
| ---------------- | ---------------------------------------- |
| `state`          | 响应式状态对象，也是运行时配置的唯一来源 |
| `visible`        | `state.visible` 的便捷属性，可读可写     |
| `initialOptions` | 初始配置快照                             |
| `initialFields`  | 初始表单字段快照                         |
| `initialContent` | 初始普通内容                             |
| `content`        | `state.content` 的只读便捷属性           |
| `data`           | 最近一次表单提交或 Flow payload 缓存     |

## 实例方法

| 方法                   | 说明                                 |
| ---------------------- | ------------------------------------ |
| `show()`               | 显示弹窗                             |
| `hide()`               | 隐藏弹窗                             |
| `setState(key, value)` | 设置单个响应式状态字段并返回当前实例 |
| `setContent(content)`  | 设置普通内容，表单模式下会抛错       |
| `setFields(fields)`    | 设置表单字段；传 `null` 退出表单模式 |
| `addFields(data)`      | 下一次表单提交时额外合并字段         |
| `reset()`              | 恢复初始配置、内容和字段             |
| `resetContent()`       | 恢复初始普通内容                     |
| `resetFields()`        | 恢复初始表单字段                     |
| `destroy()`            | 销毁实例，释放 DOM、事件和响应式渲染 |

## 参数

| 参数          | 类型                                           | 默认值      | 说明                                     |
| ------------- | ---------------------------------------------- | ----------- | ---------------------------------------- |
| `title`       | `string`                                       | `'Tip'`     | 弹窗标题                                 |
| `content`     | `string \| Node \| Node[] \| Function \| null` | `''`        | 非表单模式内容                           |
| `position`    | `string`                                       | `'center'`  | 对应 `.j-popup-layout.is-*`              |
| `confirmText` | `string`                                       | `'Confirm'` | 确认按钮文本                             |
| `cancelText`  | `string`                                       | `'Cancel'`  | 取消按钮文本                             |
| `backText`    | `string \| false`                              | `'Back'`    | 返回按钮文本；`false` 时不渲染内置按钮   |
| `nextText`    | `string \| false`                              | `'Next'`    | 下一步按钮文本；`false` 时不渲染内置按钮 |
| `showCancel`  | `boolean`                                      | `true`      | 是否显示取消按钮                         |
| `showClose`   | `boolean`                                      | `true`      | 是否显示右上角关闭按钮                   |
| `showBack`    | `boolean`                                      | `false`     | 是否显示返回按钮                         |
| `showNext`    | `boolean`                                      | `false`     | 是否显示下一步按钮                       |
| `fullscreen`  | `boolean`                                      | `false`     | 是否全屏                                 |
| `flow`        | `Flow \| null`                                 | `null`      | Flow 实例；存在时接管 next/back          |
| `fields`      | `Array<object> \| null`                        | `null`      | 表单字段配置                             |
| `header`      | `boolean`                                      | `true`      | 是否显示头部                             |
| `footer`      | `boolean`                                      | `true`      | 是否显示底部                             |
| `style`       | `string \| object \| null`                     | `null`      | `.j-modal` 内联样式                      |
| `id`          | `string \| null`                               | `null`      | 弹窗 id，为空时自动生成                  |
| `escClose`    | `boolean`                                      | `false`     | 是否允许 Esc 关闭                        |
| `bgClose`     | `boolean`                                      | `false`     | 是否允许点击遮罩关闭                     |
| `lazy`        | `boolean`                                      | `false`     | 是否延迟到首次 `show()` 创建 DOM         |
| `onShow`      | `Function \| null`                             | `null`      | 开始显示时触发                           |
| `onShown`     | `Function \| null`                             | `null`      | 显示完成后触发                           |
| `onHide`      | `Function \| null`                             | `null`      | 开始隐藏时触发                           |
| `onHidden`    | `Function \| null`                             | `null`      | 隐藏并移除 DOM 后触发                    |
| `onConfirm`   | `Function \| null`                             | `null`      | 非表单模式点击确认时触发                 |
| `onSubmit`    | `Function \| null`                             | `null`      | 表单模式提交时触发                       |
| `onCancel`    | `Function \| null`                             | `null`      | 点击取消按钮或右上角关闭按钮时触发       |
| `onBack`      | `Function \| null`                             | `null`      | 无 `flow` 时点击返回触发，不会自动关闭   |
| `onNext`      | `Function \| null`                             | `null`      | 无 `flow` 时点击下一步触发，不会自动关闭 |

## Field 配置

| 参数          | 类型                 | 说明                                                                       |
| ------------- | -------------------- | -------------------------------------------------------------------------- |
| `label`       | `string`             | 表单项标签，不传则隐藏 label                                               |
| `name`        | `string`             | 字段名，会作为 `FormData` 的 key                                           |
| `id`          | `string`             | 控件 id，不传会自动生成稳定 id                                             |
| `type`        | `string`             | 支持 `text`、`password`、`email`、`tel`、`hidden`、`textarea`、`select` 等 |
| `value`       | `string \| string[]` | 初始值                                                                     |
| `placeholder` | `string`             | 占位文本                                                                   |
| `required`    | `boolean`            | 是否必填                                                                   |
| `disabled`    | `boolean`            | 是否禁用                                                                   |
| `readonly`    | `boolean`            | 是否只读                                                                   |
| `checked`     | `boolean`            | checkbox/radio 初始选中状态                                                |
| `options`     | `Array`              | `select` 选项                                                              |
| `multiple`    | `boolean`            | `select` 是否多选                                                          |

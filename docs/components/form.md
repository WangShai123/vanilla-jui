# Form

Form 继承 `Component`，用于按字段配置渲染 `.j-form` 表单，并内置 `Validator` 校验与提交数据收集。源码位于 `src/components/form.js`。

## 导入

```js
import { Form, createForm } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const form = createForm(
  {
    fields: [
      {
        label: 'Email address',
        name: 'email',
        type: 'email',
        placeholder: 'Enter email',
        required: true,
      },
      {
        label: 'Password',
        name: 'password',
        type: 'password',
        required: true,
      },
      {
        label: 'Country',
        name: 'country',
        type: 'select',
        options: [
          { value: '', text: 'Please select' },
          { value: 'cn', text: 'China' },
          { value: 'us', text: 'United States' },
        ],
      },
    ],
    validator: {
      rules: {
        email: { required: true, email: true },
        password: { required: true, minLength: 6 },
        country: { selected: true },
      },
      messages: {
        email: { required: 'Email required', email: 'Invalid email' },
        password: { minLength: 'Password too short' },
        country: { selected: 'Country required' },
      },
    },
    onSubmit: async (data, form) => {
      form.setState({ submitting: true });
      await saveUser(data);
      form.setState({ submitting: false });
    },
  },
  '#user-form'
);

form.build();
```

`new Form(props, container)` 和 `createForm(props, container)` 都只创建实例并初始化状态，不会立即创建 DOM。需要调用 `build()` 才会构建 `.j-form` 并挂载到 `container`。

## 手动挂载

`container` 可以传 `false`，表示 `build(false)` 只创建表单根节点，不自动挂载。此时可以通过 `form.root` 或 `form.dom.root` 手动插入到业务容器。

```js
const form = new Form({
  fields: [
    { label: 'Name', name: 'name' },
    { label: 'Email', name: 'email', type: 'email' },
  ],
});

form.build(false);
modalBody.appendChild(form.root);
```

## 参数

| 参数           | 类型               | 默认值         | 说明                                           |
| -------------- | ------------------ | -------------- | ---------------------------------------------- |
| `id`           | `string \| null`   | 自动生成       | 表单根节点 id                                  |
| `vertical`     | `boolean`          | `true`         | 根表单使用 `is-vertical` 或 `is-horizontal`    |
| `itemVertical` | `boolean`          | `true`         | 字段项使用 `is-item-vertical` 或横向布局       |
| `style`        | `string \| object` | `''`           | 表单根节点内联样式                             |
| `fields`       | `Array<object>`    | `[]`           | 字段配置                                       |
| `buttons`      | `boolean \| Array` | Submit / Reset | `false` 隐藏按钮，`true` 使用默认按钮          |
| `validator`    | `object`           | `{}`           | 传给 `Validator` 的 `rules`、`messages` 等配置 |
| `onSubmit`     | `Function \| null` | `null`         | 校验通过后触发，参数为 `(data, form)`          |
| `onReset`      | `Function \| null` | `null`         | 重置时触发，参数为 `(event, form)`             |

## 字段配置

常用字段属性：

| 属性          | 说明                                                 |
| ------------- | ---------------------------------------------------- |
| `label`       | 字段标签；传 `false` 或省略时不渲染标签              |
| `name`        | 表单字段名，用于 `FormData` 和 Validator 规则匹配    |
| `type`        | `text`、`email`、`password`、`textarea`、`select` 等 |
| `options`     | `select`、`radio`、多选 `checkbox` 的选项数组        |
| `value`       | 默认值；多选 checkbox 可传数组                       |
| `checked`     | 单个 checkbox 或 switch 的默认选中状态               |
| `required`    | 渲染原生 `required`，并让标签显示必填标记            |
| `placeholder` | 输入提示                                             |
| `help`        | 字段下方帮助文本                                     |
| `disabled`    | 禁用控件                                             |
| `readonly`    | 只读控件                                             |
| `content`     | `type: 'custom'` 时渲染的自定义内容                  |

`type: 'radio'` 和带 `options` 的 `type: 'checkbox'` 会渲染 `.j-radio` / `.j-checkbox` 组。`type: 'switch'` 会渲染 `.j-switch`。

## 实例方法

| 方法                | 说明                                      |
| ------------------- | ----------------------------------------- |
| `validate()`        | 执行内置 Validator 校验，返回是否通过     |
| `collectData()`     | 返回当前 `FormData` 汇总后的普通对象      |
| `build(container?)` | 构建 DOM；传 `false` 时只生成 root 不挂载 |
| `requestSubmit()`   | 触发表单提交                              |
| `reset()`           | 重置校验状态和提交数据                    |
| `update(patch)`     | 更新表单 props 并触发响应式渲染           |
| `setFields(fields)` | 替换字段配置                              |
| `resetFields()`     | 恢复初始化字段                            |
| `destroy()`         | 销毁实例，释放 Validator、渲染和事件资源  |

同名字段会按提交顺序合并为数组，适合 checkbox 多选。

## 按钮

```js
const form = createForm({
  buttons: [
    { type: 'submit', text: '保存', theme: 'primary', action: 'submit' },
    { type: 'reset', text: '清空', theme: 'ghost', action: 'reset' },
  ],
});

form.build('#demo');
```

`buttons: false` 时不渲染按钮，适合把 Form 嵌入 Modal 这类外部容器，再由外部按钮通过 `form` 属性或实例的 `requestSubmit()` 触发提交。

## 注意事项

- Form 只负责通用表单 DOM、校验和数据收集，复杂业务交互放在 `onSubmit` 或外层组件中。
- 校验规则复用 `Validator` 组件的规则与消息格式。
- `build(container)` 会占用传入 container 的内容区域；销毁时会释放实例资源，但不会删除外层 container。

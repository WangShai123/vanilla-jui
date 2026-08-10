# Validator

Validator 是表单校验模块，源码位于 `src/validation/validator.ts`。

它只负责读取表单字段、执行规则校验、写入校验状态类名和错误提示节点。

## 导入

```js
import { createValidator } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const validator = createValidator(
  document.querySelector('form'),
  {
    rules: {
      email: { required: true, email: true },
      password: { required: true, minLength: 6 },
      plan: { selected: true },
    },
    messages: {
      email: { required: 'Email required', email: 'Invalid email' },
      password: { minLength: 'Password too short' },
      plan: { selected: 'Plan required' },
    },
    onSubmit: (validator) => {
      console.log(validator.runtime.valid);
    },
  },
  true
);
```

### bindEvents

第三个参数 `bindEvents` 为 `Boolean` 类型，默认值为 `false`。

- `true`: Validator 会绑定表单的 `submit` 和 `reset` 事件。`submit` 会阻止默认提交并自动执行 `validate()`；`reset` 会清理校验状态但不再次触发原生 reset。
- `false`: 用户需手动调用 `validate()` 进行校验。

## 参数

`createValidator(element, props, bindEvents)`

| 参数         | 类型                                | 默认值  | 说明                       |
| ------------ | ----------------------------------- | ------- | -------------------------- |
| `element`    | `string \| HTMLFormElement \| Node` | -       | 要绑定的表单元素           |
| `props`      | `object`                            | `{}`    | 校验配置                   |
| `bindEvents` | `boolean`                           | `false` | 是否绑定 submit/reset 事件 |

`element` 必须解析为 `HTMLFormElement`，否则会抛出错误。

### Props

| 字段       | 类型               | 默认值 | 说明                                      |
| ---------- | ------------------ | ------ | ----------------------------------------- |
| `rules`    | `object`           | `{}`   | 字段校验规则，key 必须匹配表单字段 `name` |
| `messages` | `object`           | `{}`   | 自定义错误提示，按字段名和规则名索引      |
| `onSubmit` | `Function \| null` | `null` | 所有字段通过校验后调用                    |

## 实例结构

| 属性              | 说明                          |
| ----------------- | ----------------------------- |
| `dom.root`        | 当前表单元素，销毁后为 `null` |
| `props`           | 归一化后的校验配置            |
| `runtime.valid`   | 最近一次校验是否通过          |
| `runtime.message` | 最近一次失败消息              |

`destroy()` 后，`dom.root` 和 `props` 都会被置为 `null`，事件监听和校验提示会被清理。

## 错误提示 DOM

Validator 优先使用最近的 `[data-form-control]` 作为字段容器；如果找不到，则使用字段的直接父元素。错误提示节点会写入当前字段容器：

```html
<div data-form-control="email">
  <input name="email" />
  <div class="help-block is-invalid" data-validator-help="email">
    Email required
  </div>
</div>
```

Validator 依赖属性名作为交互选择器。已有的 `[data-form-help]` 静态帮助文案不会被覆盖，动态错误提示只通过 `[data-validator-help]` 创建和删除。

校验失败时，非 checkbox 字段会添加 `is-invalid` 并移除 `is-valid`。校验通过时，会移除当前字段对应的 `[data-validator-help]`，并添加 `is-valid`。

## 内置规则

### 文本字段

| 规则        | 类型             | 说明                         |
| ----------- | ---------------- | ---------------------------- |
| `required`  | `boolean`        | 字符串值不能为空             |
| `minLength` | `number`         | 最短字符数                   |
| `maxLength` | `number`         | 最长字符数                   |
| `equalTo`   | `string`         | 必须与指定 `name` 字段值一致 |
| `email`     | `boolean`        | 邮箱格式校验                 |
| `noSpace`   | `boolean`        | 禁止空格                     |
| `noChinese` | `boolean`        | 禁止中文字符                 |
| `noSpecial` | `boolean`        | 禁止 `@#$%^&*` 等特殊字符    |
| `pattern`   | `string\|RegExp` | 自定义正则                   |

### 选择字段

| 规则       | 类型      | 说明                            |
| ---------- | --------- | ------------------------------- |
| `checked`  | `boolean` | checkbox 是否处于指定选中状态   |
| `selected` | `boolean` | select 是否选择了至少一个非空值 |
| `multiple` | `boolean` | 多选 select 是否至少选择了一项  |
| `min`      | `number`  | 多选 select 最少选择项数        |
| `max`      | `number`  | 多选 select 最多选择项数        |

### 文件字段

| 规则      | 类型      | 说明                                                |
| --------- | --------- | --------------------------------------------------- |
| `file`    | `boolean` | 文件是否必选                                        |
| `minSize` | `number`  | 文件最小字节数                                      |
| `maxSize` | `number`  | 文件最大字节数                                      |
| `accept`  | `string`  | 允许的文件类型，逗号分隔，如 `.jpg,.png`、`image/*` |

### 自定义规则

```js
const validator = createValidator('#form', {
  rules: {
    username: {
      validate: (element, validator) => {
        if (element.value.includes('admin')) return '不能包含 admin';
        return true;
      },
    },
  },
});
```

`validate` 函数接收字段元素和当前 Validator 实例，返回：

| 返回值   | 说明                                       |
| -------- | ------------------------------------------ |
| `true`   | 校验通过                                   |
| `false`  | 校验失败，使用 `messages` 中配置的错误文案 |
| `string` | 校验失败，并使用该字符串作为错误文案       |

## 方法

### `validate()`

执行表单校验，并返回是否通过。只会校验有 `name` 且在 `props.rules` 中配置了规则的字段。所有字段通过后会调用 `props.onSubmit(validator)`。

```js
if (validator.validate()) {
  // passed
}
```

### `reset(options)`

清理校验状态、`is-valid` / `is-invalid` 类名和 `[data-validator-help]` 错误节点。

```js
validator.reset();
validator.reset({ native: false });
```

| 参数     | 默认值 | 说明                   |
| -------- | ------ | ---------------------- |
| `native` | `true` | 是否调用表单原生 reset |

### `destroy()`

解绑事件、清理校验提示、释放表单引用，并将实例标记为 destroyed。

```js
validator.destroy();
```

## 与 Form 集成

`Form` 内部会使用 `createValidator()` 创建校验实例。`Form` 的 `validator.rules` 和 `validator.messages` 与本模块格式一致。

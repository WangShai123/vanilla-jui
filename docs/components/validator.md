# Validator

Validator 是表单校验组件，源码位于 `src/components/validator.js`。直接操作表单控件、错误类名和 `.help-block`，适合命令式表单校验场景。

## 导入

```js
import { Validator } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const validator = new Validator(
  document.querySelector('form'),
  {
    rules: {
      email: { required: true, email: true },
      password: { required: true, minLength: 6 },
      plan: { selected: true },
    },
    messages: {
      email: { required: 'Email required' },
      password: { minLength: 'Password too short' },
      plan: { selected: 'Plan required' },
    },
  },
  true
);
```

第三个参数为 `true` 时自动绑定 `submit` 和 `reset` 事件。

## 内置规则

### 文本类

| 规则        | 类型             | 说明                         |
| ----------- | ---------------- | ---------------------------- |
| `required`  | `bool`           | 字符串值不能为空             |
| `minLength` | `number`         | 最短字符数                   |
| `maxLength` | `number`         | 最长字符数                   |
| `equalTo`   | `string`         | 必须与指定 `name` 字段值一致 |
| `email`     | `bool`           | 邮箱格式校验                 |
| `noSpace`   | `bool`           | 禁止空格                     |
| `noChinese` | `bool`           | 禁止中文字符                 |
| `noSpecial` | `bool`           | 禁止 `@#$%^&*` 等特殊字符    |
| `pattern`   | `string\|RegExp` | 自定义正则                   |

### 选择类

| 规则       | 类型     | 说明                            |
| ---------- | -------- | ------------------------------- |
| `checked`  | `bool`   | checkbox 是否处于指定选中状态   |
| `selected` | `bool`   | select 是否选择了至少一个非空值 |
| `multiple` | `bool`   | 多选 select 是否至少选择了一项  |
| `min`      | `number` | 多选 select 最少选择项数        |
| `max`      | `number` | 多选 select 最多选择项数        |

### 文件类

| 规则      | 类型     | 说明                                                 |
| --------- | -------- | ---------------------------------------------------- |
| `file`    | `bool`   | 文件是否必选                                         |
| `minSize` | `number` | 文件最小字节数                                       |
| `maxSize` | `number` | 文件最大字节数                                       |
| `accept`  | `string` | 允许的文件类型，逗号分隔（`.jpg,.png` 或 `image/*`） |

### 自定义

| 规则       | 类型       | 说明                                                                                 |
| ---------- | ---------- | ------------------------------------------------------------------------------------ |
| `validate` | `Function` | 自定义验证函数，接收 element，返回 `boolean`（通过/失败）或 `string`（作为错误信息） |

## 文件校验示例

```js
const validator = new Validator(
  '#upload-form',
  {
    rules: {
      avatar: {
        required: true,
        file: true,
        maxSize: 5 * 1024 * 1024,
        accept: 'image/jpeg,image/png',
      },
      document: {
        file: true,
        minSize: 1024,
        maxSize: 10 * 1024 * 1024,
        accept: '.pdf,.doc,.docx',
      },
    },
    messages: {
      avatar: {
        file: '请选择头像文件',
        maxSize: '文件大小不能超过 5MB',
        accept: '仅支持 JPG 和 PNG 格式',
      },
    },
  },
  true
);
```

## 多选校验示例

```js
const validator = new Validator(
  '#form',
  {
    rules: {
      skills: {
        required: true,
        multiple: true,
        min: 2,
        max: 5,
      },
    },
    messages: {
      skills: {
        multiple: '请至少选择一项',
        min: '至少选择 2 项',
        max: '最多选择 5 项',
      },
    },
  },
  true
);
```

## 自定义验证函数示例

```js
const validator = new Validator(
  '#form',
  {
    rules: {
      username: {
        required: true,
        validate: (el) => {
          if (el.value.includes('admin')) return '不能包含 admin';
          return true;
        },
      },
      password: {
        required: true,
        validate: (el) =>
          el.value.length >= 8 && /[A-Z]/.test(el.value)
            ? true
            : '密码需至少8位且包含大写字母',
      },
    },
  },
  true
);
```

`validate` 函数接收 `element` 参数，返回：

- `true` — 校验通过
- `false` — 校验失败（使用 `messages` 中的配置）
- `string` — 校验失败，字符串作为错误信息

## 参数

| 参数       | 类型               | 默认值 | 说明                         |
| ---------- | ------------------ | ------ | ---------------------------- |
| `rules`    | `object`           | `{}`   | 字段校验规则，key 为字段名   |
| `messages` | `object`           | `{}`   | 自定义错误提示，key 为字段名 |
| `onSubmit` | `Function \| null` | `null` | 全部字段通过时调用的回调     |

## 实例属性

| 属性    | 说明                         |
| ------- | ---------------------------- |
| `valid` | `boolean` — 最近一次校验结果 |

## 方法

| 方法         | 说明                   |
| ------------ | ---------------------- |
| `validate()` | 执行校验并返回是否通过 |
| `reset()`    | 重置校验状态和提示     |
| `destroy()`  | 解绑事件并清理实例     |

`validate()` 返回 `boolean`，全部字段通过时调用 `onSubmit` 回调。

# Validator

Validator 是表单校验组件，源码位于 `src/components/validator.js`。它直接操作表单控件、错误类名和 `.help-block`，适合命令式表单校验场景。

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

第三个参数为 `true` 时会自动绑定 `submit` 和 `reset`。

## 内置规则

| 规则        | 说明                                 |
| ----------- | ------------------------------------ |
| `required`  | 字符串值不能为空                     |
| `minLength` | 最短字符数                           |
| `maxLength` | 最长字符数                           |
| `equalTo`   | 必须与指定 `name` 字段值一致         |
| `email`     | 邮箱格式                             |
| `checked`   | checkbox 是否处于指定选中状态        |
| `selected`  | select 是否选择了至少一个非空值      |
| `noSpace`   | 禁止空格                             |
| `noChinese` | 禁止中文字符                         |
| `noSpecial` | 禁止 `@#$%^&*` 等特殊字符            |
| `pattern`   | 自定义正则，支持字符串或 `RegExp` 值 |

## 方法

| 方法         | 说明                   |
| ------------ | ---------------------- |
| `validate()` | 执行校验并返回是否通过 |
| `reset()`    | 重置校验状态和提示     |
| `destroy()`  | 解绑事件并清理实例     |

## 测试

可视化半自动测试页面：`tests/validator.test.html`。

# Core Utilities

从 `vanilla-jui` 导入：

```js
import {
  hasOwn, timer, getType, isFunction, isClass, isPlainObject,
  validateParam, resolveProps, uuid, randomId,
} from 'vanilla-jui';
```

---

## hasOwn

判断对象是否包含指定自身属性。

```
hasOwn(obj, key) → boolean
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `obj` | `object` | 待检查的对象 |
| `key` | `string` | 属性名 |

**返回值**: `boolean` — 对象包含指定属性时返回 `true`。

```js
hasOwn({ foo: 1 }, 'foo');   // true
hasOwn({ foo: 1 }, 'bar');   // false
hasOwn(Object.create({ foo: 1 }), 'foo'); // false（原型属性）
```

---

## timer

定时器管理器。按 `key` 注册定时器，同一 `key` 重复注册会自动先取消旧的。

```
timer.start(key, duration, callback) → void
timer.cancel(key) → void
```

### timer.start

| 参数 | 类型 | 说明 |
|------|------|------|
| `key` | `string` | 定时器唯一标识 |
| `duration` | `number` | 延迟时间（毫秒） |
| `callback` | `Function` | 延迟执行的回调函数 |

### timer.cancel

| 参数 | 类型 | 说明 |
|------|------|------|
| `key` | `string` | 要取消的定时器标识 |

```js
// 注册定时器
timer.start('close-popup', 500, () => {
  console.log('popup closed');
});

// 同 key 重复注册会先取消旧的
timer.start('close-popup', 300, () => {
  console.log('replaces the previous one');
});

// 手动取消
timer.cancel('close-popup');
```

---

## getType

获取值的增强类型名称。

```
getType(val) → string
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `val` | `*` | 任意值 |

**返回值**: `string` — 类型名称，可能值：`'null'`、`'array'`、`'HTMLElement'`、`'Node'`、`'string'`、`'number'`、`'boolean'`、`'function'`、`'object'` 等。

```js
getType(null);                              // 'null'
getType([]);                                // 'array'
getType({ a: 1 });                          // 'object'
getType(document.createElement('div'));      // 'HTMLElement'
getType(new Text('hi'));                     // 'Node'
getType('hello');                           // 'string'
getType(42);                                // 'number'
```

---

## isFunction

判断是否为普通可构造函数（排除 class 和箭头函数）。

```
isFunction(fn) → boolean
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `fn` | `*` | 待判断的值 |

```js
isFunction(function Foo() {});   // true
isFunction(() => {});             // false（箭头函数）
isFunction(class {});             // false（class）
```

---

## isClass

判断是否为 ES6 class。

```
isClass(fn) → boolean
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `fn` | `*` | 待判断的值 |

```js
class MyComp {}
isClass(MyComp);       // true
isClass(function(){}); // false
isClass(() => {});     // false
```

---

## isPlainObject

判断是否为普通对象（`Object.prototype` 或 `null` 原型）。

```
isPlainObject(value) → boolean
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `value` | `*` | 待判断的值 |

```js
isPlainObject({ a: 1 });            // true
isPlainObject(Object.create(null)); // true
isPlainObject([]);                  // false
isPlainObject(new Date());          // false
```

---

## validateParam

按规则校验参数。支持 `type`/`types`、`required`、`enum`、`validate`、`message` 等字段。

```
validateParam(name, value, rule?, namespace?) → value
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `name` | `string` | — | 参数名 |
| `value` | `*` | — | 参数值 |
| `rule` | `string \| string[] \| object` | `{}` | 校验规则 |
| `namespace` | `string` | `''` | 错误命名空间前缀 |

**返回值**: `*` — 校验通过后的原值。

**抛出**: `Error` — 校验失败时。

**rule 对象字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `string \| string[]` | 允许的类型 |
| `types` | `string \| string[]` | 同 `type`（优先级更高） |
| `required` | `boolean` | 是否必填 |
| `enum` | `*[]` | 枚举值列表 |
| `conditions` | `Function \| Array<Function \| {test, message?}>` | 附加条件 |
| `validate` | `(value) => boolean` | 自定义校验函数 |
| `message` | `string` | 自定义错误消息 |

```js
// 基本类型校验
validateParam('size', 'md', { type: 'string' }); // → 'md'

// 必填 + 枚举
validateParam('color', 'red', {
  type: 'string',
  required: true,
  enum: ['red', 'green', 'blue'],
}); // → 'red'

// 自定义校验
validateParam('count', 5, {
  type: 'number',
  validate: (v) => v > 0,
  message: 'must be positive.',
}); // → 5

validateParam('age', -1, {
  type: 'number',
  validate: (v) => v >= 0,
  message: 'must be non-negative.',
});
// Error: Validator: age must be non-negative.
```

---

## resolveProps

合并默认值、执行 `normalize` 并校验配置。组件构造器的首选配置解析方法。

```
resolveProps(input?, schema?, namespace?) → object
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `input` | `object` | `{}` | 用户传入配置 |
| `schema` | `Record<string, object \| string \| string[]>` | `{}` | 配置 schema，每项可含 `default`、`factory`、`normalize` 和校验规则 |
| `namespace` | `string` | `'Options'` | 错误命名空间前缀 |

**返回值**: `object` — 合并默认值并校验后的配置对象。

**抛出**: `Error` — 校验失败时。

**schema 项字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `default` | `*` | 默认值 |
| `factory` | `boolean` | 若为 `true`，`default` 为函数时会调用获取返回值 |
| `normalize` | `(value, context) => *` | 归一化函数 |
| `type` / `types` | `string \| string[]` | 允许的类型 |
| 其他 | — | 同 `validateParam` 的 rule 字段 |

```js
const schema = {
  id: {
    default: null,
    types: ['string', 'null'],
    normalize: (v) => v ?? 'auto-id',
  },
  active: { default: 0, type: 'number' },
  multiple: { default: false, type: 'boolean' },
};

const props = resolveProps({ active: 2 }, schema, 'MyComponent');
// → { id: 'auto-id', active: 2, multiple: false }
```

---

## uuid

生成标准 UUID v4。

```
uuid() → string
```

**返回值**: `string` — UUID v4 字符串，如 `'3b241101-e2bb-4d7a-8702-9e3c0a2b6c7d'`。

```js
uuid(); // '3b241101-e2bb-4d7a-8702-9e3c0a2b6c7d'（示例值）
```

---

## randomId

生成适合 DOM `id` 的随机字符串。

```
randomId(length?) → string
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `length` | `number` | `8` | 字符串长度，范围 1 ~ 32 |

**返回值**: `string` — 随机字符串。

**抛出**: `Error` — length 不在 1~32 范围内时。

```js
randomId();     // 'a3f8k2m1'（示例值）
randomId(12);   // 'k9m2a7f3x1p5'（示例值）
```

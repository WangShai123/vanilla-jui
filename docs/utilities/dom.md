# DOM Utilities

从 `vanilla-jui` 导入：

```js
import {
  canUseDOM, canRenderDOM, isNode, isElement,
  resolveContainer,
  isRenderableContent, normalizeContentNodes,
  q, all, getEl,
} from 'vanilla-jui';
```

---

## canUseDOM

判断当前环境是否可访问 DOM（浏览器 vs SSR/Node）。

```
canUseDOM() → boolean
```

**返回值**: `boolean` — 浏览器环境为 `true`，Node/SSR 为 `false`。

```js
canUseDOM(); // true（浏览器）
```

---

## canRenderDOM

判断当前环境是否可执行 DOM 渲染。比 `canUseDOM` 更严格，确保 `createElement` 和 `insertBefore` 可用。

```
canRenderDOM() → boolean
```

**返回值**: `boolean` — 可安全创建 DOM 元素时为 `true`。

```js
if (canRenderDOM()) {
  const el = document.createElement('div');
}
```

---

## isNode

判断值是否为 DOM `Node`。

```
isNode(value) → boolean
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `value` | `*` | 待判断的值 |

**返回值**: `boolean`。

```js
isNode(document.createElement('div')); // true
isNode(new Text('hi'));                // true
isNode('hello');                       // false
```

---

## isElement

判断值是否为 DOM `Element`。

```
isElement(value) → boolean
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `value` | `*` | 待判断的值 |

**返回值**: `boolean`。

```js
isElement(document.createElement('div')); // true
isElement(document.createTextNode('hi')); // false（Text 不是 Element）
```

---

## resolveContainer

解析并验证容器元素。支持 CSS 选择器字符串或 DOM 元素。

```
resolveContainer(container, namespace?) → HTMLElement
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `container` | `HTMLElement \| string` | — | CSS 选择器字符串或 DOM 元素 |
| `namespace` | `string` | `'Component'` | 组件名称，用于错误提示 |

**返回值**: `HTMLElement` — 有效的 DOM 元素。

**抛出**: `Error` — 容器无效（非 Element 或选择器无匹配）时。

```js
resolveContainer('#app');             // → HTMLElement（选择器查询）
resolveContainer(document.body);     // → HTMLElement（直接传入）
resolveContainer('#missing');         // → Error
```

---

## isRenderableContent

判断值是否为组件可渲染内容。

```
isRenderableContent(value) → boolean
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `value` | `*` | 待判断的值 |

**返回值**: `boolean` — 以下类型返回 `true`：`null`、`undefined`、`string`、`number`、`boolean`、`function`、`Array`、`Node`。

```js
isRenderableContent('text');                           // true
isRenderableContent(42);                               // true
isRenderableContent(() => 'lazy');                     // true
isRenderableContent([document.createElement('span')]); // true
isRenderableContent({ foo: 1 });                      // false
```

---

## normalizeContentNodes

将常见内容值转换为 DOM 节点数组。字符串按 HTML 片段解析，函数以 `context` 调用后继续归一化，数组递归处理。

```
normalizeContentNodes(content, context?) → Node[]
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `content` | `string \| number \| boolean \| Function \| Node \| Array \| null` | — | 组件内容 |
| `context` | `*` | `undefined` | 传给函数内容的上下文参数 |

**返回值**: `Node[]` — 归一化后的 DOM 节点数组。`null`/`undefined`/`false`/`true` 返回空数组 `[]`。

```js
// 字符串 → HTML 片段
normalizeContentNodes('<strong>bold</strong>');
// → [HTMLStrongElement]

// 函数内容（带 context）
normalizeContentNodes(
  (ctx) => `<span>${ctx.name}</span>`,
  { name: 'World' }
);
// → [HTMLSpanElement]

// Node 直接返回
const btn = document.createElement('button');
normalizeContentNodes(btn); // [btn]

// 数组递归归一化
normalizeContentNodes(['hello', 42, null]);
// → [Text("hello"), Text("42")]

// 空值返回空数组
normalizeContentNodes(null);  // []
```

---

## q

CSS 选择器查询第一个匹配元素（`querySelector` 的简写）。

```
q(selector, context?) → Element | null
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `selector` | `string` | — | CSS 选择器 |
| `context` | `Document \| Element` | `document` | 查询范围 |

**返回值**: `Element | null` — 匹配的元素或 `null`。

```js
q('#app');                        // → HTMLElement | null
q('.btn', someContainer);        // 在 someContainer 内查找
```

---

## all

CSS 选择器查询所有匹配元素（返回数组）。

```
all(selector, context?) → Element[]
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `selector` | `string` | — | CSS 选择器 |
| `context` | `Document \| Element` | `document` | 查询范围 |

**返回值**: `Element[]` — 匹配的元素数组（空数组表示无匹配）。

```js
all('.tabs .tab');          // → Element[]
all('li', document.body);  // → Element[]
```

---

## getEl

将 Element、CSS 选择器或 `null`/`false` 解析为 DOM 元素。

```
getEl(ref, namespace?) → Element | null
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `ref` | `Element \| string \| false \| null \| undefined` | — | 元素引用、选择器或空值 |
| `namespace` | `string` | `'getEl'` | 错误命名空间 |

**返回值**: `Element | null` — 解析后的元素，`null`/`false`/`undefined` 输入返回 `null`。

**抛出**: `Error` — 输入不是 Element、string、false 或 null 时。

```js
getEl(document.getElementById('app')); // → HTMLElement
getEl('#app');                         // → HTMLElement（选择器查询）
getEl(false);                          // → null
getEl(null);                           // → null
```

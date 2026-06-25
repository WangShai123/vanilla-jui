# DOM Utilities

从 `vanilla-jui` 导入：

```js
import {
  canUseDOM,
  canRenderDOM,
  isNode,
  isElement,
  resolveContainer,
  requireContainer,
  resolveNode,
  resolveNodeList,
  resolveElement,
  isRenderableContent,
  normalizeContentNodes,
  q,
  all,
} from 'vanilla-jui';
```

## canUseDOM

判断当前环境是否可访问 DOM。

```js
canUseDOM() -> boolean
```

| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| 无   | -    | -    |

| 返回值    | 类型      | 说明                                       |
| --------- | --------- | ------------------------------------------ |
| `boolean` | `boolean` | 浏览器环境为 `true`，SSR/Node 为 `false`。 |

## canRenderDOM

判断当前环境是否可执行 DOM 渲染。

```js
canRenderDOM() -> boolean
```

| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| 无   | -    | -    |

| 返回值    | 类型      | 说明                                   |
| --------- | --------- | -------------------------------------- |
| `boolean` | `boolean` | 可安全创建和插入 DOM 元素时为 `true`。 |

## isNode

判断值是否为 DOM `Node`。

```js
isNode(value) -> boolean
```

| 参数    | 类型 | 说明         |
| ------- | ---- | ------------ |
| `value` | `*`  | 待判断的值。 |

| 返回值    | 类型      | 说明            |
| --------- | --------- | --------------- |
| `boolean` | `boolean` | 是否为 `Node`。 |

## isElement

判断值是否为 DOM `Element`。

```js
isElement(value) -> boolean
```

| 参数    | 类型 | 说明         |
| ------- | ---- | ------------ |
| `value` | `*`  | 待判断的值。 |

| 返回值    | 类型      | 说明               |
| --------- | --------- | ------------------ |
| `boolean` | `boolean` | 是否为 `Element`。 |

## resolveNodeList

将容器引用解析为节点列表。

```js
resolveNodeList(ref, namespace?) -> Node[] | null
```

| 参数        | 类型                                                               | 默认值        | 说明                         |
| ----------- | ------------------------------------------------------------------ | ------------- | ---------------------------- |
| `ref`       | `Element \| Node \| string \| Array \| null \| undefined \| false` | -             | 容器引用、选择器或节点数组。 |
| `namespace` | `string`                                                           | `'Component'` | 错误提示命名空间。           |

| 返回值           | 类型             | 说明                                  |
| ---------------- | ---------------- | ------------------------------------- |
| `Node[] \| null` | `Node[] \| null` | 节点数组；不匹配或空输入返回 `null`。 |

## resolveNode

将容器引用解析为单个节点。

```js
resolveNode(ref, namespace?) -> Node | null
```

| 参数        | 类型                                                               | 默认值        | 说明                         |
| ----------- | ------------------------------------------------------------------ | ------------- | ---------------------------- |
| `ref`       | `Element \| Node \| string \| Array \| null \| undefined \| false` | -             | 容器引用、选择器或节点数组。 |
| `namespace` | `string`                                                           | `'Component'` | 错误提示命名空间。           |

| 返回值         | 类型           | 说明                                |
| -------------- | -------------- | ----------------------------------- |
| `Node \| null` | `Node \| null` | 第一个可用节点；无结果返回 `null`。 |

## resolveElement

将容器引用解析为 `Element`。

```js
resolveElement(ref, namespace?) -> Element | null
```

| 参数        | 类型                                                               | 默认值        | 说明                         |
| ----------- | ------------------------------------------------------------------ | ------------- | ---------------------------- |
| `ref`       | `Element \| Node \| string \| Array \| null \| undefined \| false` | -             | 容器引用、选择器或节点数组。 |
| `namespace` | `string`                                                           | `'Component'` | 错误提示命名空间。           |

| 返回值            | 类型              | 说明                                  |
| ----------------- | ----------------- | ------------------------------------- |
| `Element \| null` | `Element \| null` | 解析到的元素；非元素节点返回 `null`。 |

## resolveContainer

统一解析容器引用。

```js
resolveContainer(container, namespace?, expect?) -> Node | Element | Node[] | null
```

| 参数        | 类型                                                               | 默认值        | 说明                         |
| ----------- | ------------------------------------------------------------------ | ------------- | ---------------------------- |
| `container` | `Element \| Node \| string \| Array \| null \| undefined \| false` | -             | 容器引用、选择器或节点数组。 |
| `namespace` | `string`                                                           | `'Component'` | 错误提示命名空间。           |
| `expect`    | `'node' \| 'element' \| 'array'`                                   | `'element'`   | 期望返回类型。               |

| 返回值                              | 类型                                | 说明                                            |
| ----------------------------------- | ----------------------------------- | ----------------------------------------------- |
| `Node \| Element \| Node[] \| null` | `Node \| Element \| Node[] \| null` | 按 `expect` 返回；不满足输入条件时返回 `null`。 |

### `expect`

| 值        | 说明           | 返回值            |
| --------- | -------------- | ----------------- |
| `element` | 解析为单个元素 | `Element \| null` |
| `node`    | 解析为单个节点 | `Node \| null`    |
| `array`   | 解析为节点列表 | `Node[] \| null`  |

## requireContainer

强制解析容器引用。

```js
requireContainer(container, namespace?, expect?) -> Node | Element | Node[]
```

| 参数        | 类型                                                               | 默认值        | 说明                         |
| ----------- | ------------------------------------------------------------------ | ------------- | ---------------------------- |
| `container` | `Element \| Node \| string \| Array \| null \| undefined \| false` | -             | 容器引用、选择器或节点数组。 |
| `namespace` | `string`                                                           | `'Component'` | 错误提示命名空间。           |
| `expect`    | `'node' \| 'element' \| 'array'`                                   | `'element'`   | 期望返回类型。               |

| 返回值                      | 类型                        | 说明               |
| --------------------------- | --------------------------- | ------------------ |
| `Node \| Element \| Node[]` | `Node \| Element \| Node[]` | 解析成功后的结果。 |

## isRenderableContent

判断值是否为组件可渲染内容。

```js
isRenderableContent(value) -> boolean
```

| 参数    | 类型 | 说明         |
| ------- | ---- | ------------ |
| `value` | `*`  | 待判断的值。 |

| 返回值    | 类型      | 说明                 |
| --------- | --------- | -------------------- |
| `boolean` | `boolean` | 是否可作为内容输入。 |

## normalizeContentNodes

将内容值转换为 DOM 节点数组。

```js
normalizeContentNodes(content, context?) -> Node[]
```

| 参数      | 类型                                                               | 默认值      | 说明                   |
| --------- | ------------------------------------------------------------------ | ----------- | ---------------------- |
| `content` | `string \| number \| boolean \| Function \| Node \| Array \| null` | -           | 组件内容。             |
| `context` | `*`                                                                | `undefined` | 传给函数内容的上下文。 |

| 返回值   | 类型     | 说明                 |
| -------- | -------- | -------------------- |
| `Node[]` | `Node[]` | 归一化后的节点数组。 |

## q

查询第一个匹配元素。

```js
q(selector, context?) -> Element | null
```

## all

查询所有匹配元素。

```js
all(selector, context?) -> Element[]
```

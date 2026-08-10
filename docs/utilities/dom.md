# DOM Utilities

```ts
import {
  all,
  isElement,
  isNode,
  isRenderableContent,
  lazyRender,
  q,
  requireContainer,
  resolveContainer,
  resolveElement,
  resolveNode,
  resolveNodeList,
} from 'vanilla-jui';
```

## 内容判定

`RenderableContent<TContext>` 支持：

- `Node`
- `string`、`number`、`boolean`
- `null`、`undefined`
- 上述值的递归只读数组
- `(context) => RenderableContent<TContext>`

`isRenderableContent(value)` 只做类别判定，不创建 DOM，也不解析字符串。组件内容渲染
遵循 `vanilla-signal` children 语义：字符串按文本处理；结构化内容应传 JSX、`Node`、
`DocumentFragment`、数组，或函数返回这些值。

## DOM 类型谓词

| 方法               | 返回值                     |
| ------------------ | -------------------------- |
| `isNode(value)`    | 当前环境中是否为 `Node`    |
| `isElement(value)` | 当前环境中是否为 `Element` |

无对应 DOM 构造器的 SSR 环境中，两者返回 `false`。

## 引用解析

`DOMReference` 可以是 `Node`、CSS selector、递归节点数组或
`false | null | undefined`。

| 方法                   | 结果                                                  |
| ---------------------- | ----------------------------------------------------- |
| `resolveNodeList(ref)` | 所有节点；空/无匹配/数组含非 Node 时为 `null`         |
| `resolveNode(ref)`     | 直接 Node、selector 第一个结果或数组第一个节点        |
| `resolveElement(ref)`  | 直接 Element、selector 第一个元素或数组第一个 Element |

```ts
resolveNodeList(['#app']); // null，数组成员必须已经是 Node
resolveNodeList('#app'); // [HTMLElement] 或 null
resolveElement([new Text('x'), document.body]); // document.body
```

`resolveContainer(container, namespace = 'Component', expect = 'element')`
统一分发上述解析。`expect` 可为 `element`、`node`、`array`；非法值抛出错误，未解析
到目标时返回 `null`。

`requireContainer(...)` 参数相同，但未找到时抛出
`"<namespace>: container not found."`，适合必须挂载的边界。

## 查询

```ts
q<HTMLElement>('.item', root); // 第一个 Element 或 null
all<HTMLButtonElement>('button', root); // Element[]
```

查询 context 支持 `Document | DocumentFragment | Element`，默认 `document`。

## `lazyRender(target, callback, options?)`

目标首次进入 IntersectionObserver 可视区域时调用 callback，并停止观察。target 可为
CSS selector 或 Element，返回幂等清理函数。

| 选项         | 默认值  | 说明                                     |
| ------------ | ------- | ---------------------------------------- |
| `threshold`  | `0.1`   | IntersectionObserver threshold           |
| `rootMargin` | `'0px'` | observer root margin                     |
| `root`       | `null`  | observer root                            |
| `waitForDOM` | `true`  | 目标未挂载时是否用 MutationObserver 等待 |

```ts
const stop = lazyRender('#chart', renderChart, {
  rootMargin: '200px',
});

stop();
```

不支持 IntersectionObserver 时立即渲染。目标尚不存在且 `waitForDOM: false`，或环境
不支持 MutationObserver 时也立即回调。target 类型非法时发出 warning 并返回空清理
函数；callback 不是函数时抛出 `TypeError`。

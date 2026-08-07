# DOM Utilities

```ts
import {
  all,
  isElement,
  isNode,
  isRenderableContent,
  lazyRender,
  normalizeContentNodes,
  normalizeRenderableContentNodes,
  q,
  requireContainer,
  resolveContainer,
  resolveElement,
  resolveNode,
  resolveNodeList,
} from 'vanilla-jui';
```

## 内容判定与归一化

`RenderableContent<TContext>` 支持：

- `Node`
- `string`、`number`、`boolean`
- `null`、`undefined`
- 上述值的递归只读数组
- `(context) => RenderableContent<TContext>`

`isRenderableContent(value)` 只做原子判定，不创建 DOM。当前规则接受任意数组和任意
函数，数组元素与函数返回值会在归一化阶段递归处理。

`normalizeContentNodes(content, context?)` 返回 `Node[]`：

| 输入 | 结果 |
| --- | --- |
| `Node` | 单节点数组 |
| 字符串 | 通过 `template.innerHTML` 解析的节点数组 |
| number | 文本节点 |
| `true` / `false` / nullish | 空数组 |
| 数组 | 递归展开 |
| 函数 | 传入 context 后递归归一化返回值 |

```ts
const nodes = normalizeContentNodes(
  ({ name }: { name: string }) => ['<strong>Hello</strong> ', name],
  { name: 'JUI' }
);
container.append(...nodes);
```

字符串按 HTML 解析，不执行转义。只应传入可信模板；用户输入应先转义或直接创建文本
节点。

`normalizeRenderableContentNodes(content, context)` 先调用
`isRenderableContent`。输入不合法返回 `null`，合法输入返回 `Node[]`，用于同时需要
运行时边界检查和节点转换的调用点。

## DOM 类型谓词

| 方法 | 返回值 |
| --- | --- |
| `isNode(value)` | 当前环境中是否为 `Node` |
| `isElement(value)` | 当前环境中是否为 `Element` |

无对应 DOM 构造器的 SSR 环境中，两者返回 `false`。

## 引用解析

`DOMReference` 可以是 `Node`、CSS selector、递归节点数组或
`false | null | undefined`。

| 方法 | 结果 |
| --- | --- |
| `resolveNodeList(ref)` | 所有节点；空/无匹配/数组含非 Node 时为 `null` |
| `resolveNode(ref)` | 直接 Node、selector 第一个结果或数组第一个节点 |
| `resolveElement(ref)` | 直接 Element、selector 第一个元素或数组第一个 Element |

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

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `threshold` | `0.1` | IntersectionObserver threshold |
| `rootMargin` | `'0px'` | observer root margin |
| `root` | `null` | observer root |
| `waitForDOM` | `true` | 目标未挂载时是否用 MutationObserver 等待 |

```ts
const stop = lazyRender('#chart', renderChart, {
  rootMargin: '200px',
});

stop();
```

不支持 IntersectionObserver 时立即渲染。目标尚不存在且 `waitForDOM: false`，或环境
不支持 MutationObserver 时也立即回调。target 类型非法时发出 warning 并返回空清理
函数；callback 不是函数时抛出 `TypeError`。

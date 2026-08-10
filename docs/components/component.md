# Functional Component Runtime

`defineComponent()` 是 vanilla-jui 的函数式组件运行时，源码位于 `src/core/component.ts`。它负责稳定视图、生命周期、状态补丁、插件和资源清理，不负责组件业务逻辑。

## Component shape

组件由工厂函数创建，公共结构如下：

| 字段或方法         | 说明                                                 |
| ------------------ | ---------------------------------------------------- |
| `props`            | schema 解析后的创建配置                              |
| `state`            | `createDeepStore` 创建的响应式状态                   |
| `runtime`          | `built`、`mounted`、`destroyed` 生命周期标记         |
| `element`          | build 后的稳定根节点，build 前和 destroy 后为 `null` |
| `build()`          | 创建一次 owned view，不自动挂载                      |
| `mount(container)` | 构建并挂载稳定根节点                                 |
| `unmount()`        | 解除挂载，保留 state 和 view owner                   |
| `setState()`       | 归一化、校验并同步提交状态补丁                       |
| `own(cleanup)`     | 注册实例拥有的资源清理函数                           |
| `use(plugin)`      | 安装实例插件                                         |
| `on/off/emit`      | 组件生命周期或扩展事件                               |
| `destroy()`        | 释放 view owner、资源、插件和节点                    |

组件不公开内部 DOM map。测量、焦点、滚动和动画需要的节点使用闭包内 refs；业务使用者只依赖 `element`。

## Definition

```ts
import { createDeepStore, jsx } from 'vanilla-signal';
import { defineComponent } from 'vanilla-jui';

export function createCounter(initial = 0) {
  const props = { initial };
  const state = createDeepStore({ count: initial });

  return defineComponent({
    name: 'Counter',
    props,
    state,
    actions: {
      increment() {
        state.count += 1;
      },
    },
    view: () =>
      jsx('button', {
        type: 'button',
        children: () => state.count,
      }),
  });
}
```

`view()` 在一次 build 生命周期中只执行一次。动态属性和文本直接读取 state；动态数组使用 keyed `For`。不要从 effect 清空并重建根节点。

## Lifecycle

```js
const counter = createCounter();

counter.build();
document.body.appendChild(counter.element);

counter.unmount();
counter.mount(document.body);
counter.destroy();
```

不变量：

- `build()` 和 `mount()` 幂等。
- state 更新不替换根节点。
- `unmount()` 后可以再次挂载。
- `destroy()` 幂等，销毁后不能 build 或 setState。
- `ownsElement: false` 用于绑定业务方既有根节点；销毁行为但不删除该节点。

## State patches

```js
component.setState({ loading: true, visible: false });
component.setState('loading', false);
```

`normalizeStatePatch` 用于把公开输入转成规范 state，`validateStatePatch` 用于限制字段和值。若未提供自定义校验，运行时会拒绝 state 中不存在的字段。直接写 `state` 仍是响应式的，但公共方法应在调用返回前需要同步可见结果时使用 `flushSync`。

## Resources

组件创建的事件、observer、timer、RAF、AbortController 和外部订阅都必须有 owner：

```ts
onBuild(context) {
  const observer = new ResizeObserver(refresh);
  observer.observe(context.element);
  context.own(() => observer.disconnect());
}
```

JSX 内创建的响应式 binding 由 owned view 自动释放；组件之外创建的资源通过 `context.own()` 或 `component.own()` 注册。

## Plugins

插件是围绕公共控制器的横切能力，返回清理函数或带 `destroy()` 的对象：

```js
const logger = (component) => {
  const onMount = () => console.log(component.element);
  component.on('mount', onMount);
  return () => component.off('mount', onMount);
};

component.use(logger);
```

全局插件使用 `useComponentPlugin(name, plugin)` 注册，使用 `removeComponentPlugin(name)` 删除。全局插件只作用于注册后创建的组件实例。

完整架构边界见 `docs/design/standard.md`。

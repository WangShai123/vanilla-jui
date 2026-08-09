# Owned View

```ts
import { createOwnedView } from 'vanilla-jui';
```

`createOwnedView(factory, options?)` 在独立的 vanilla-signal owner 中创建一个稳定
元素。`factory` 通过 `untrack()` 只执行一次，但其中创建的响应式 accessor 仍归该
owner 管理。

```ts
const view = createOwnedView(
  () => jsx('output', { children: () => state.value }),
  { removeOnDispose: true }
);

document.body.append(view.element);
view.dispose();
```

返回 `{ element, dispose }`。`removeOnDispose` 默认为 `true`，销毁 owner 时同时移除
元素；设为 `false` 时只释放响应式 owner，节点的后续处置由调用方负责。

该工具用于需要独立生命周期的稳定子视图，不用于根据 state 反复替换根节点。

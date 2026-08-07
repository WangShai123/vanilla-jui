# Presence

Presence 协调“先挂载再入场、先离场再卸载”的生命周期，适用于 Modal、Offcanvas、
Toast 和临时浮层。它不创建视图，也不定义视觉 keyframes。

```ts
import { createPresence, createTransition, waitForMotion } from 'vanilla-jui';
```

## `createPresence(options)`

```ts
const motion = createTransition(() => panel, {
  keyframes: [{ opacity: 0 }, { opacity: 1 }],
  options: { duration: 200 },
});

const presence = createPresence({
  elements: () => [panel],
  mount: () => document.body.append(panel),
  activate: () => { state.visible = true; },
  deactivate: () => { state.visible = false; },
  unmount: () => panel.remove(),
  motion,
});
```

| 选项 | 职责 |
| --- | --- |
| `elements()` | 返回参与 CSS motion 检测的已构建根节点 |
| `mount()` | 把节点放入文档 |
| `activate()` | 同步提交可见状态 |
| `deactivate()` | 同步提交隐藏状态 |
| `unmount()` | 离场完成后移除节点 |
| `motion` | 可选 MotionController；存在时不检测 CSS motion |

执行顺序：

```text
enter: mount -> commit initial styles -> flushSync(activate) -> await motion -> visible
leave: flushSync(deactivate) -> await motion -> unmount -> hidden
```

挂载后读取首个连接元素的 geometry，确保浏览器已提交隐藏端样式，避免入场只呈现最终
帧。`activate`/`deactivate` 应保持同步，不要自行增加 timeout 或 RAF。

返回的 controller：

| 成员 | 说明 |
| --- | --- |
| `phase` | `hidden | entering | visible | leaving` |
| `enter()` | 完成有效入场返回 `true`；已可见或被新操作取代返回 `false` |
| `leave()` | 完成有效离场返回 `true`；已隐藏或被新操作取代返回 `false` |
| `cancel()` | 使待处理操作失效，取消 motion，并把 phase 重置为 hidden |

同一方向正在执行时返回同一个 Promise。相反方向会中止旧等待并增加操作版本，因此旧
任务不会在重新打开后误卸载节点。`cancel()` 本身不调用 `unmount()`；组件 destroy
仍需负责最终 DOM 和 owner 清理。

## CSS motion 回退

不传 `motion` 时，Presence 调用 `waitForMotion(elements, signal?)`：

1. 支持 `getAnimations()` 时，等待根节点当前所有有限 Animation 的 `finished`。
2. 不支持时，从 computed style 计算 transition/animation 的 duration、delay 和
   iteration count，并以 timeout 回退。
3. 没有有限动画时立即完成。

只检查显式提供的根节点，不扫描子树，避免 loading 等无限子动画阻塞卸载。

```ts
await waitForMotion([panel, backdrop], abortController.signal);
```

新组件优先传入 MotionController，以保证行为动画不依赖默认 CSS。CSS 回退主要用于
调用方自行定义的 transition 或兼容已有组件。

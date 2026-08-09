# Motion API

Motion 用 Web Animations API 表达从隐藏端到可见端的时间线。行为动画不依赖默认
className 或 `style.css`，因此用户完全替换样式后，组件仍保留动画和离场时序。

```ts
import {
  createCollapseTransition,
  createMotionGroup,
  createTransition,
} from 'vanilla-jui';
```

## `createTransition(target, definition)`

```ts
const panelMotion = createTransition(() => panelRef.current, {
  keyframes: [
    { opacity: 0, transform: 'translateY(12px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  options: { duration: 240, easing: 'ease-out' },
});
```

| definition 字段        | 类型                       | 说明                                               |
| ---------------------- | -------------------------- | -------------------------------------------------- |
| `keyframes`            | `Keyframe[]                | PropertyIndexedKeyframes`                          | 隐藏端到可见端 |
| `options`              | `KeyframeAnimationOptions` | Web Animations 参数                                |
| `respectReducedMotion` | `boolean`                  | 默认 `true`；reduce 时清零 duration/delay/endDelay |

target 是延迟 getter，允许在元素 build 前创建 motion。内部 Animation 默认
`fill: 'both'`，在同一 Element 上复用；target 指向新元素时会取消旧 Animation 并
重建。环境或元素没有 `animate()` 时，enter/leave 立即完成。

返回的 `MotionController`：

| 方法             | 行为                          |
| ---------------- | ----------------------------- |
| `enter(signal?)` | 从当前进度正向播放到可见端    |
| `leave(signal?)` | 从当前进度反向播放到隐藏端    |
| `cancel()`       | 取消 Animation 并释放元素引用 |

`enter()`/`leave()` 返回 `Promise<void>`。播放失败或 Animation 被反向/取消时 Promise
仍正常完成。AbortSignal 结束本次等待，但不销毁 Animation；Presence 可据此让旧操作
失效并立即开始反向播放。

## `createMotionGroup(...motions)`

组合多个 controller。enter/leave 通过 `Promise.all` 并行播放并等待全部完成，cancel
逐个取消。

```ts
const motion = createMotionGroup(backdropMotion, panelMotion);
```

适合 Modal、Offcanvas 这类多个根节点共享一次 presence 生命周期的组件。

## `createCollapseTransition(target, definition?)`

用于稳定挂载元素沿一个布局轴展开和收起。它先读取当前渲染尺寸，再临时恢复原始轴
尺寸测量展开终点，因此支持内容动态变化以及动画中途反向。

```ts
const vertical = createCollapseTransition(() => panel, {
  axis: 'vertical',
  options: { duration: 250, easing: 'ease' },
});

const horizontal = createCollapseTransition(() => sidebar, {
  axis: 'horizontal',
  fade: false,
});

vertical.setExpanded(false); // 初始化关闭边界，不播放动画
await vertical.enter();
await vertical.leave();
vertical.cancel();
```

| definition 字段        | 默认值                    | 说明                                        |
| ---------------------- | ------------------------- | ------------------------------------------- |
| `axis`                 | `'vertical'`              | vertical 管理 height；horizontal 管理 width |
| `fade`                 | `true`                    | 是否同时插值 opacity                        |
| `options`              | duration 250、easing ease | Web Animations 参数                         |
| `respectReducedMotion` | `true`                    | 是否遵循 reduced-motion                     |

vertical 使用 `scrollHeight` 和实际 bounding height，horizontal 使用 `scrollWidth` 和
实际 bounding width。动画期间设置 `overflow:hidden`；展开完成后恢复调用方原始 inline
尺寸、opacity、overflow 和 visibility，使 `auto` 布局与后续内容变化继续生效。收起
完成后保持轴尺寸 `0px` 和 `visibility:hidden`。

返回的 `CollapseMotionController` 在普通 `MotionController` 之外提供
`setExpanded(expanded)`，用于初始渲染或无动画同步。没有 Web Animations API 时，
enter/leave 直接提交对应边界。

## 边界

- Motion 负责动画时间线，不负责节点挂载和卸载；需要 presence 生命周期时再与
  `createPresence()` 组合。
- 同一 CSS 属性不要同时交给 Web Animations 和 CSS transition 控制。
- hover、focus、主题与稳定视觉样式仍由 CSS 负责。
- 拖拽和滚动属于连续交互，不应建模为 enter/leave transition。

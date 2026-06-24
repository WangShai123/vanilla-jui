# Swiper

轻量轮播组件，继承 `Component`，源码位于 `src/components/Swiper.js`。

支持触摸/鼠标拖拽滑动、loop 无缝循环、分页指示器、前后导航、自动播放、图片 lazyload、窗口 resize 自适应。使用 `vanilla-signal` 的 `h()` 创建 DOM，通过 `createDeepStore` + `setState` 管理响应式状态，分页和导航按钮通过 `bindClass` / `bindAttr` 细粒度响应状态变化。

## 两种模式

Swiper 支持两种实例化模式，功能范围不同：

| 模式         | 实例化方式                                       | 功能范围                                   |
| ------------ | ------------------------------------------------ | ------------------------------------------ |
| **基础绑定** | `data: null`（默认），容器内已有 `.j-swiper` DOM | 滑动交互、loop、autoplay、分页、导航       |
| **动态创建** | 传入 `data` 数组（含空数组），组件自动创建 DOM   | 基础绑定全部功能 + `updateData()` 动态更新 |

### 基础绑定模式

绑定已有的 HTML 结构，仅提供交互能力。不支持 `updateData()`。

```js
const swiper = new Swiper(document.querySelector('.banner'), {
  loop: true,
  pagination: true,
  navigation: true,
}).build();
```

### 动态创建模式

传入 `data` 数组（可为空），组件自动创建完整的 `.j-swiper` DOM。支持 `updateData()` 动态替换数据。

```js
// 空实例化，后续动态填充
const swiper = new Swiper(document.querySelector('.banner'), {
  data: [],
}).build();

// 后续更新数据
swiper.updateData([
  { image: '/img/a.jpg', url: '/page-a', title: 'A' },
  { image: '/img/b.jpg', title: 'B' },
]);

// 带初始数据
const swiper2 = new Swiper(document.querySelector('.banner'), {
  data: [
    { image: '/img/a.jpg', url: '/page-a', title: 'A', sort: 1 },
    { image: '/img/b.jpg', title: 'B' },
  ],
}).build();
```

> **注意**：`data: null`（默认值）时，传入的容器内必须已有 `.j-swiper` DOM 结构。如果容器内没有 `.j-swiper`，会抛出错误。

---

## 导入

```js
import { Swiper } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

---

## DOM 结构

### 基础绑定模式的约束

- 容器内部必须且只能有一个 `.j-swiper`。
- `.j-swiper` 内部必须有 `.swiper-wrapper`，wrapper 内至少一个 `.swiper-slide`。
- 组件不会修改外部 `.j-swiper` 根节点的 class。

#### 最小 HTML

```html
<div class="j-swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide">Slide 1</div>
    <div class="swiper-slide">Slide 2</div>
  </div>
</div>
```

#### 初始化后的完整结构

```html
<div class="j-swiper">
  <div class="swiper-wrapper" aria-live="polite">
    <div class="swiper-slide" role="group" aria-label="Slide 1">...</div>
    <div class="swiper-slide" role="group" aria-label="Slide 2">...</div>
  </div>

  <!-- 分页（pagination: true 时） -->
  <div class="swiper-pagination is-horizontal is-clickable is-bullet">
    <button
      class="swiper-pagination-indicator swiper-pagination-bullet is-active"
      aria-label="Go to slide 1"
      aria-current="true"
    ></button>
    <button
      class="swiper-pagination-indicator swiper-pagination-bullet"
      aria-label="Go to slide 2"
    ></button>
  </div>

  <!-- 导航（navigation: true 时） -->
  <button
    class="swiper-navigation is-prev"
    type="button"
    aria-label="Previous slide"
  >
    <!-- arrow-left SVG -->
  </button>
  <button
    class="swiper-navigation is-next"
    type="button"
    aria-label="Next slide"
  >
    <!-- arrow-right SVG -->
  </button>
</div>
```

### 动态创建模式的结构

```html
<div class="banner-container">
  <!-- 以下 .j-swiper 由组件自动创建 -->
  <div class="j-swiper">
    <div class="swiper-wrapper" aria-live="polite">
      <a
        href="/page-a"
        class="swiper-slide"
        role="group"
        aria-label="Slide 1"
        target="_blank"
      >
        <img class="swiper-image" loading="lazy" alt="A" src="/img/a.jpg" />
        <span class="swiper-slide-title">A</span>
      </a>
      <div
        class="swiper-slide"
        role="group"
        aria-label="Slide 2"
        target="_self"
      >
        <img
          class="swiper-image"
          loading="lazy"
          alt="B"
          data-lazy="/img/b.jpg"
        />
        <span class="swiper-slide-title">B</span>
      </div>
    </div>
    <div class="swiper-pagination is-horizontal is-clickable is-bullet">
      ...
    </div>
    <button class="swiper-navigation is-prev" type="button">...</button>
    <button class="swiper-navigation is-next" type="button">...</button>
  </div>
</div>
```

- 有 `url` 的 slide 是 `<a href="...">`，否则是 `<div>`。
- `lazyload: true` 时图片地址写在 `data-lazy`，延迟到可见时才设置 `src`。
- 每个 slide 带 `data-swiper-index` 属性（排序后的位置索引）。
- `blank: true`（默认）时链接 `target="_blank"`，`blank: false` 时 `target="_self"`。

### 复用已有节点

如果 DOM 中已存在 `.swiper-pagination`、`.swiper-navigation.is-prev` 或 `.swiper-navigation.is-next`，Swiper 会复用它们并补充 class/图标；不存在时按需创建。

---

## 构造函数

```js
new Swiper(container, options?)
```

### 参数

| 参数        | 类型                    | 必填 | 说明                  |
| ----------- | ----------------------- | ---- | --------------------- |
| `container` | `HTMLElement \| string` | 是   | 挂载容器或 CSS 选择器 |
| `options`   | `object`                | 否   | 配置项，见下方参数表  |

### 返回值

返回 `Swiper` 实例。构造函数不执行 DOM 操作，需调用 `build()` 启动。

---

## 参数

### 数据

| 参数   | 类型            | 默认值 | 校验规则      | 说明                                                                                    |
| ------ | --------------- | ------ | ------------- | --------------------------------------------------------------------------------------- |
| `data` | `Array \| null` | `null` | `null` 或数组 | 动态创建 slide 的数据源。传入数组启用动态模式，支持 `updateData()`。`null` 时为绑定模式 |

`data` 数组每项支持以下字段：

| 字段       | 类型                      | 默认值 | 说明                                                                                     |
| ---------- | ------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| `image`    | `string`                  | —      | 生成 `<img class="swiper-image">`，`alt` 取 `title`                                      |
| `url`      | `string`                  | —      | slide 使用 `<a href="url">` 而非 `<div>`                                                 |
| `blank`    | `boolean`                 | `true` | 链接打开方式：`true` → `target="_blank"`，`false` → `target="_self"`                     |
| `title`    | `string`                  | —      | 生成 `<span class="swiper-slide-title">`                                                 |
| `sort`     | `number`                  | —      | 排序值；全部未设置时按数组自然顺序                                                       |
| `children` | `string \| Node \| Array` | —      | 自定义内容，优先级高于 `image` 和 `title`。渲染回调收到 `{ swiper, item, index }` 上下文 |

**排序规则**：有 `sort` 的项按升序排在前面，无 `sort` 的项排在后面并保持原始相对顺序。

**blank 默认值逻辑**：`item.blank !== false`，即未设置时等同于 `true`。

### 播放控制

| 参数       | 类型      | 默认值 | 校验规则 | 说明                                                |
| ---------- | --------- | ------ | -------- | --------------------------------------------------- |
| `autoplay` | `boolean` | `true` | —        | 是否自动播放。单张 slide 时自动禁用                 |
| `delay`    | `number`  | `3000` | `>= 0`   | 自动播放间隔（ms）。保底下限 `16ms`，防止卡死主线程 |
| `speed`    | `number`  | `300`  | `>= 0`   | 切换动画时长（ms），用于 CSS `transition`           |

**自动播放行为**：

- 鼠标进入根节点时 `pause()`，离开时 `resume()`。
- 触摸/拖拽开始时 `pause()`，结束/归位后 `resume()`。
- `play()` 仅在 `autoplay: true` 且 `realCount > 1` 时生效。

### 交互

| 参数              | 类型      | 默认值 | 校验规则 | 说明                                                   |
| ----------------- | --------- | ------ | -------- | ------------------------------------------------------ |
| `touchRatio`      | `number`  | `1`    | `> 0`    | 拖拽距离倍率。值 > 1 时拖拽"加速"，< 1 时"减速"        |
| `touchAngle`      | `number`  | `45`   | `0 ~ 90` | 横向滑动判定角度（度）。超过此值视为页面滚动，放弃滑动 |
| `longSwipesMs`    | `number`  | `300`  | `>= 0`   | 长滑动时间阈值（ms）。超过此值按距离比例判定切换张数   |
| `longSwipesRatio` | `number`  | `0.05` | `0 ~ 1`  | 切换所需滑动比例。默认需滑过 slide 宽度的 5%           |
| `preventClick`    | `boolean` | `true` | —        | 拖拽后阻止 `<a>`、`<button>` 等的误点击                |

### 功能开关

| 参数         | 类型      | 默认值 | 说明                                                    |
| ------------ | --------- | ------ | ------------------------------------------------------- |
| `loop`       | `boolean` | `true` | 循环播放。启用后首尾各克隆一张 slide，需 slide 数量 > 1 |
| `pagination` | `boolean` | `true` | 分页指示器。每个真实 slide 对应一个 bullet 按钮         |
| `navigation` | `boolean` | `true` | 前后导航按钮。非 loop 模式下到达首尾时自动禁用          |
| `lazyload`   | `boolean` | `true` | 图片延迟加载。加载当前及相邻 slide 的 `img[data-lazy]`  |

### 参数校验

所有参数通过 `resolveProps()` 统一校验。类型或范围不合法时抛出 `Swiper.options.<key>` 格式的错误：

```js
new Swiper(el, { touchAngle: 100 });
// → Swiper.options.touchAngle: expects a number between 0 and 90.

new Swiper(el, { touchRatio: -1 });
// → Swiper.options.touchRatio: expects a number greater than 0.
```

---

## 状态

Swiper 使用 `createDeepStore` 创建响应式状态，通过 `setState` 批量更新。setter 会做归一化处理，非法值静默回退为默认值。

| 属性         | 类型      | 说明                                                                    |
| ------------ | --------- | ----------------------------------------------------------------------- |
| `index`      | `number`  | 当前真实 slide 索引（不含 loop clone），范围 `0 ~ realCount - 1`        |
| `trackIndex` | `number`  | 内部轨道索引（含 loop clone）。loop 模式下比 `index` 大 1               |
| `transform`  | `number`  | wrapper 的 `translate3d` X 像素值，负值表示向左偏移                     |
| `animating`  | `boolean` | 是否正在进行切换动画。动画期间 `next()` / `prev()` / `slideTo()` 被忽略 |
| `width`      | `number`  | 根节点当前宽度（px），resize 时自动更新                                 |

### 便捷属性

| 属性        | 类型     | 说明                                                        |
| ----------- | -------- | ----------------------------------------------------------- |
| `realIndex` | `number` | 只读，等价于 `toRealIndex()`，返回当前真实索引              |
| `realCount` | `number` | 只读，返回真实 slide 数量（不含 clone）。destroy 后返回 `0` |

---

## 索引系统

Swiper 有两个坐标系：**真实索引（real index）** 和 **轨道索引（track index）**。

### loop 模式下的轨道结构

```
track:     [clone-last,  slide-0,  slide-1,  ...,  slide-N,  clone-first]
index:         0            1         2              N          N+1
real:        N-1            0         1              N-1          0
```

- `state.trackIndex` 是轨道上的绝对位置。
- `state.index`（即 `realIndex`）是去掉 clone 后的真实位置。
- `state.trackIndex = 0` 对应最后一张 slide 的 clone，`trackIndex = N+1` 对应第一张 slide 的 clone。

### loop 无缝回绕

动画结束后，`onTransitionEnd` 检测到 `trackIndex` 落在 clone 位置时，瞬间跳回对应的真实位置（无动画），实现视觉上的无缝循环。

### 非 loop 模式

轨道结构就是原始 slide 数组，`trackIndex === index`，无 clone。

### 索引转换方法

| 方法                                | 参数                                                  | 返回值   | 说明                |
| ----------------------------------- | ----------------------------------------------------- | -------- | ------------------- |
| `toRealIndex(trackIndex?)`          | `trackIndex: number`（可选，默认 `state.trackIndex`） | `number` | 轨道索引 → 真实索引 |
| `trackIndexForRealIndex(realIndex)` | `realIndex: number`                                   | `number` | 真实索引 → 轨道索引 |

---

## 滑动行为

### 触摸/拖拽流程

```
touchstart / mousedown
  │  记录起始点，暂停 autoplay，禁用 transition
  ▼
touchmove / mousemove
  │  累积位移，超过 SWIPE_THRESHOLD(6px) 后判定方向
  │  angle < touchAngle → 横向滑动，更新 transform
  │  angle >= touchAngle → 纵向滚动，放弃滑动，归位
  ▼
touchend / mouseup
  │  根据滑动距离和时间判定切换张数
  ▼
slideToTrack → 动画切换 → onTransitionEnd → loop 回绕
```

### 切换判定

**短滑动**（持续时间 ≤ `longSwipesMs`）：

- 滑动距离 / slide 宽度 ≥ `longSwipesRatio` 时切换，否则归位。
- 可以一次跳多张：`ceil(distance - longSwipesRatio)`。

**长滑动**（持续时间 > `longSwipesMs`）：

- 按距离比例计算跳过的张数：`ceil(distance / width - longSwipesRatio)`。

### 归位

未满足切换条件时，`resetDrag()` 将 wrapper 动画归位到当前 slide。

### 鼠标拖拽

- `mousedown` 挂在 wrapper，`mousemove` / `mouseup` 同时挂在 wrapper 和 `window`，确保指针移出 wrapper 时仍能完成拖拽。
- 拖拽时 wrapper cursor 设为 `grabbing`，结束后恢复 `grab`。
- `mouseleave` 只恢复 cursor，不触发归位。

---

## 实例方法

### build()

```js
build(): Swiper
```

解析 container、绑定已有 DOM 或动态创建 `.j-swiper`，初始化事件和渲染。

**参数**：无

**返回值**：`Swiper` 实例（支持链式调用）

**说明**：

- 可重复调用一次（重复调用返回 `this`，不重新初始化）。
- 除 `build()`、`destroy()`、状态读取和事件订阅外，其他方法都要求先调用 `build()`。

---

### next()

```js
next(): void
```

切换到下一张。

**参数**：无

**返回值**：无

**说明**：动画进行中忽略。

---

### prev()

```js
prev(): void
```

切换到上一张。

**参数**：无

**返回值**：无

**说明**：动画进行中忽略。

---

### slideTo(index)

```js
slideTo(index: number): void
```

切换到指定真实索引。

**参数**：

| 参数    | 类型     | 说明                                             |
| ------- | -------- | ------------------------------------------------ |
| `index` | `number` | 目标真实索引（0-based），越界时 clamp 到有效范围 |

**返回值**：无

**说明**：loop 模式下自动转换为轨道索引。

---

### slideToTrack(trackIndex)

```js
slideToTrack(trackIndex: number): void
```

切换到指定轨道索引。

**参数**：

| 参数         | 类型     | 说明                                  |
| ------------ | -------- | ------------------------------------- |
| `trackIndex` | `number` | 目标轨道索引，越界时 clamp 到有效范围 |

**返回值**：无

**说明**：动画进行中或无 slide 时忽略。

---

### play()

```js
play(): void
```

启动自动播放。

**参数**：无

**返回值**：无

**说明**：已销毁、已有 timer、或仅 1 张 slide 时无效。

---

### pause()

```js
pause(): void
```

停止自动播放，清除 timer。

**参数**：无

**返回值**：无

---

### resume()

```js
resume(): void
```

恢复自动播放。

**参数**：无

**返回值**：无

**说明**：已销毁时无效。仅在 `autoplay: true` 时生效。

---

### restartAutoplay()

```js
restartAutoplay(): void
```

先 `pause()` 再 `play()`，用于 `delay` / `autoplay` 配置变更后重启。

**参数**：无

**返回值**：无

---

### updateData(data)

```js
updateData(data?: Array | null): Swiper
```

替换数据源并重建所有 slide。**仅在动态创建模式下可用**。

**参数**：

| 参数   | 类型            | 默认值            | 说明                         |
| ------ | --------------- | ----------------- | ---------------------------- |
| `data` | `Array \| null` | `this.props.data` | 新的数据数组，或 `null` 清空 |

**返回值**：`Swiper` 实例（支持链式调用）

**行为**：

1. 验证数据合法性。
2. 如果 `data` 不是数组（如 `null`），调用 `reInitView()` 重新初始化视图。
3. 如果 `data` 是数组：
   - 保留当前 `realIndex`（超出范围时回退到最后一张）。
   - 清理旧的事件、响应式绑定、图片加载回调。
   - 重新创建所有 slide DOM。
   - 调用 `reInitView()` 完整重新初始化。

**限制**：基础绑定模式（`data: null` 实例化）下调用会抛出错误：

```
Swiper.updateData: not supported on DOM-bound instances.
```

**示例**：

```js
const swiper = new Swiper(el, { data: [] }).build();

// 首次填充
swiper.updateData([
  { image: '/img/a.jpg', title: 'A' },
  { image: '/img/b.jpg', title: 'B' },
]);

// 替换数据
swiper.updateData([{ image: '/img/c.jpg', title: 'C' }]);

// 清空
swiper.updateData([]);
```

---

### update(propsPatch, options?)

```js
update(propsPatch?: object, options?: { force?: boolean }): Swiper
```

运行时更新配置。

**参数**：

| 参数            | 类型      | 默认值  | 说明                       |
| --------------- | --------- | ------- | -------------------------- |
| `propsPatch`    | `object`  | `{}`    | 要更新的配置项             |
| `options.force` | `boolean` | `false` | 强制更新（传递给事件回调） |

**返回值**：`Swiper` 实例（支持链式调用）

**patch 处理逻辑**：

| patch 包含的 key                                  | 行为                                         |
| ------------------------------------------------- | -------------------------------------------- |
| `data`                                            | 委托给 `updateData()`                        |
| `loop` / `pagination` / `navigation` / `lazyload` | 清理旧状态，重新初始化视图（`reInitView()`） |
| `autoplay` / `delay`                              | 重启自动播放定时器                           |
| 其他（`speed` 等）                                | 仅更新尺寸和样式                             |

**示例**：

```js
swiper.update({ loop: false, pagination: false });
swiper.update({ delay: 5000 });
```

---

### destroy()

```js
destroy(): void
```

清理所有资源并销毁实例。

**参数**：无

**返回值**：无

**清理内容**：

- 停止 autoplay timer
- 清理图片加载回调
- 移除所有事件监听（包括 window 级别）
- 销毁响应式绑定（分页、导航）
- 移除 loop clone 的 slide
- 移除自动创建的 pagination / navigation 节点
- 移除动态创建的 `.j-swiper` 根节点（仅动态模式）
- 基础绑定模式下保留外部根节点

---

### 继承自 Component

以下方法继承自 `Component` 基类：

| 方法                   | 说明               |
| ---------------------- | ------------------ |
| `setState(patch)`      | 合并更新响应式状态 |
| `on(event, handler)`   | 订阅事件           |
| `off(event, handler)`  | 取消订阅           |
| `emit(event, ...args)` | 触发事件           |
| `use(plugin)`          | 安装插件           |

---

## 事件

Swiper 通过 `emit()` 在特定时机发出事件：

| 事件           | 回调签名                                   | 触发时机                                      |
| -------------- | ------------------------------------------ | --------------------------------------------- |
| `init`         | `(props: object)`                          | `build()` 完成后                              |
| `beforeUpdate` | `(propsPatch: object, { force: boolean })` | `update()` 合并 props 后、`onUpdate()` 执行前 |
| `afterUpdate`  | `(propsPatch: object, { force: boolean })` | `onUpdate()` 执行后                           |

```js
swiper.on('init', (props) => {
  console.log('swiper initialized', props);
});

swiper.on('afterUpdate', (patch, { force }) => {
  console.log('config changed:', patch);
});
```

---

## CSS 类

组件动态添加/移除的 class：

| class           | 所在元素                    | 触发条件                                           |
| --------------- | --------------------------- | -------------------------------------------------- |
| `is-active`     | `.swiper-pagination-bullet` | 当前 slide 对应的 bullet                           |
| `is-disabled`   | `.swiper-navigation`        | 非 loop 模式下到达首尾（同时设置 `disabled` 属性） |
| `is-horizontal` | `.swiper-pagination`        | 分页指示器初始化时添加                             |
| `is-clickable`  | `.swiper-pagination`        | 分页指示器初始化时添加                             |
| `is-bullet`     | `.swiper-pagination`        | 分页指示器初始化时添加                             |
| `loading`       | `img`                       | lazyload 开始加载时                                |
| `loaded`        | `img`                       | lazyload 加载成功                                  |
| `error`         | `img`                       | lazyload 加载失败                                  |

### CSS 自定义属性

| 属性                   | 所在元素    | 说明                                           |
| ---------------------- | ----------- | ---------------------------------------------- |
| `--swiper-slide-width` | `.j-swiper` | 当前 slide 宽度（px），由 `setupStyles()` 设置 |

---

## 生命周期

### 构造（constructor）

```
constructor(container, options)
  ├─ resolveProps(options)          校验参数
  ├─ 保存 container                 不解析 DOM、不创建节点、不绑定事件
  ├─ createDeepStore(state)         创建空状态
  └─ 返回实例
```

### 构建（build → onInit）

```
build()
  ├─ resolveContainer(container)    解析外层容器
  │
  ├─ [data 模式] createDataView()   创建 .j-swiper + wrapper + slides
  ├─ [绑定模式] resolveSwiperRoot() 查找唯一 .j-swiper
  │
  ├─ validateParam(wrapper)         校验 wrapper 存在
  └─ try { onInit() } catch { destroy(); throw }
       ├─ updateSize()              读取根节点宽度
       ├─ initLoop()                [loop && count>1] 克隆首尾 slide
       ├─ setupStyles()             设置 --swiper-slide-width
       ├─ setTrackIndex(0|1)        设置初始位置
       ├─ render(false)             应用 transform（无动画）
       ├─ bindEvents()              绑定所有事件监听
       ├─ initPagination()          [pagination] 创建 bullet + 响应式绑定
       ├─ initNavigation()          [navigation] 创建 prev/next 按钮
       ├─ loadImages()              [lazyload] 加载当前 slide 图片
       └─ play()                    [autoplay] 启动定时器
```

**空 data 数组的特殊处理**：`data: []` 时，`build()` 创建 `.j-swiper` 和空 wrapper，但 `realCount = 0`，`onInit()` 不触发。后续 `updateData([...])` 会触发完整初始化。

### 更新（update → reInitView）

```
update(patch)
  ├─ resolveProps(merged)           合并并校验新参数
  ├─ emit('beforeUpdate', ...)
  ├─ onUpdate(patch)
  │    ├─ [data 变更]  → updateData() → reInitView()
  │    ├─ [loop/pagination/navigation/lazyload 变更] → reInitView()
  │    ├─ [autoplay/delay 变更] → restartAutoplay()
  │    └─ [其他] → updateSize() + setupStyles()
  └─ emit('afterUpdate', ...)

reInitView()
  ├─ pause()
  ├─ clearImageCleanups()
  ├─ 清理 bindings / navBindings / events
  ├─ 移除旧 clone
  ├─ refreshSlides()               重新收集 slide 列表
  ├─ initLoop()                    [loop] 重新克隆
  ├─ updateSize() + setupStyles()
  ├─ setTrackIndex()               恢复当前位置
  ├─ render(false)
  ├─ bindEvents()                  重新绑定
  ├─ initPagination() / clearPagination()
  ├─ initNavigation() / clearNavigation()
  ├─ loadImages()
  └─ play()
```

### 销毁（destroy → onDestroy）

```
destroy()
  └─ onDestroy()
       ├─ pause()                  停止 autoplay
       ├─ clearImageCleanups()     清理图片加载回调
       ├─ events.clear()           移除所有事件监听
       ├─ bindings() / navBindings()  销毁响应式绑定
       ├─ 移除 [data-clone] slide
       ├─ 移除自动创建的 pagination / prev / next
       └─ 移除自动创建的 root（动态模式）
```

**模式差异**：基础绑定模式下，外部 `.j-swiper` 根节点不被移除。动态模式下，组件创建的 `.j-swiper` 根节点被移除，挂载容器保留。

---

## 可访问性

| 特性         | 实现                                                            |
| ------------ | --------------------------------------------------------------- |
| 实时播报     | wrapper 带 `aria-live="polite"`，slide 切换时屏幕阅读器播报     |
| slide 语义   | 每个 slide 带 `role="group"` + `aria-label="Slide N"`           |
| 分页键盘操作 | bullet 使用 `<button>` 元素，支持 Enter / Space 激活            |
| 分页状态指示 | 当前 bullet 带 `aria-current="true"`                            |
| 导航标签     | prev/next 按钮带 `aria-label="Previous slide"` / `"Next slide"` |
| 导航禁用     | 非 loop 模式下首尾时添加 `disabled` 属性 + `is-disabled` class  |

---

## 测试

- 可视化半自动测试：`tests/index.html#swiper`。

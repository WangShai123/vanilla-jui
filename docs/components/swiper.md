# Swiper

Swiper 是轻量轮播组件，继承 `Component`，源码位于 `src/components/swiper.js`。

支持触摸/鼠标拖拽滑动、loop 无缝循环、分页指示器、前后导航、自动播放、图片 lazyload、窗口 resize 自适应。内部使用 `vanilla-signal` 的 `h()` 创建 DOM，通过 `createDeepStore` + `setState` 管理响应式状态，分页和导航按钮通过 `bindClass` / `bindAttr` 细粒度响应状态变化。

## 导入

```js
import { Swiper } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 快速上手

### 绑定已有 DOM

第一个参数是外层容器（或选择器）。容器内部必须且只能有一个 `.j-swiper`，组件会把这个 `.j-swiper` 绑定为 root：

```js
const swiper = new Swiper(document.querySelector('.banner-container'), {
  loop: true,
  pagination: true,
  navigation: true,
}).build();
```

### 动态数据

传入 `data` 数组时，第一个参数是挂载容器（非根节点），组件自动创建完整的 `.j-swiper` DOM：

```js
const swiper = new Swiper(document.querySelector('.banner'), {
  data: [
    { image: '/img/a.jpg', url: '/page-a', title: 'A', blank: true, sort: 1 },
    { image: '/img/b.jpg', title: 'B' },
  ],
}).build();
```

---

## DOM 结构

### 约束

- 绑定已有 DOM 时，传入的 container 内部必须且只能有一个 `.j-swiper`。
- `.j-swiper` 内部必须有 `.swiper-wrapper`，wrapper 内至少一个 `.swiper-slide`。
- 组件不会修改外部 `.j-swiper` 根节点的 class。

### 最小 HTML

```html
<div class="j-swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide">Slide 1</div>
    <div class="swiper-slide">Slide 2</div>
  </div>
</div>
```

### 初始化后的完整结构

组件按配置自动补充分页和导航节点：

```html
<div class="j-swiper">
  <!-- wrapper -->
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

### 复用已有节点

如果 DOM 中已存在 `.swiper-pagination`、`.swiper-navigation.is-prev` 或 `.swiper-navigation.is-next`，Swiper 会复用它们并补充 class/图标；不存在时按需创建。导航图标使用内置 `arrow-left` / `arrow-right`。

### 动态数据模式的结构

```html
<div class="banner-container">
  <div class="j-swiper">
    <div class="swiper-wrapper" aria-live="polite">
      <a href="/page-a" class="swiper-slide" role="group" aria-label="Slide 1">
        <img
          class="swiper-image"
          loading="lazy"
          alt="A"
          src="/img/a.jpg"
          target="_blank"
        />
        <span class="swiper-slide-title">A</span>
      </a>
      <div class="swiper-slide" role="group" aria-label="Slide 2">
        <img
          class="swiper-image"
          loading="lazy"
          alt="B"
          data-lazy="/img/b.jpg"
          target="_self"
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

---

## 参数

### 数据

| 参数   | 类型            | 默认值 | 校验规则                            | 说明                                                                                                 |
| ------ | --------------- | ------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `data` | `array \| null` | `null` | `null` 或数组；数组元素需含可选字段 | 动态创建 slide 的数据源。传入数组时启用动态模式，组件自动创建 `.j-swiper` 根节点。`destroy()` 时移除 |

`data` 数组每项支持以下字段：

| 字段       | 类型                      | 默认行为                                                                                 |
| ---------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| `image`    | `string`                  | 生成 `<img class="swiper-image">`，`alt` 取 `title`                                      |
| `url`      | `string`                  | slide 使用 `<a href="url">` 而非 `<div>`                                                 |
| `blank`    | `boolean`                 | 是否在新窗口打开链接，`true` 为 `_blank`，`false` 为 `_self`                             |
| `title`    | `string`                  | 生成 `<span class="swiper-slide-title">`                                                 |
| `sort`     | `number`                  | 排序值；全部未设置时按数组自然顺序                                                       |
| `children` | `string \| Node \| Array` | 自定义内容，优先级高于 `image` 和 `title`。渲染回调收到 `{ swiper, item, index }` 上下文 |

排序规则：有 `sort` 的项按升序排在前面，无 `sort` 的项排在后面并保持原始相对顺序。

### 播放控制

| 参数       | 类型      | 默认值 | 校验规则 | 说明                                                                                     |
| ---------- | --------- | ------ | -------- | ---------------------------------------------------------------------------------------- |
| `autoplay` | `boolean` | `true` | —        | 是否自动播放。单张 slide 时自动禁用                                                      |
| `delay`    | `number`  | `3000` | `>= 0`   | 自动播放间隔（ms）。内部保底下限 `AUTOPLAY_DELAY_FLOOR = 16`，防止 `delay: 0` 卡死主线程 |
| `speed`    | `number`  | `300`  | `>= 0`   | 切换动画时长（ms），用于 CSS `transition`                                                |

自动播放行为：

- 鼠标进入根节点时 `pause()`，离开时 `resume()`。
- 触摸/拖拽开始时 `pause()`，结束/归位后 `resume()`。
- `play()` 仅在 `autoplay: true` 且 `realCount > 1` 时生效。

### 交互

| 参数              | 类型      | 默认值 | 校验规则 | 说明                                                                                  |
| ----------------- | --------- | ------ | -------- | ------------------------------------------------------------------------------------- |
| `touchRatio`      | `number`  | `1`    | `> 0`    | 拖拽距离倍率。值 > 1 时拖拽"加速"，< 1 时拖拽"减速"                                   |
| `touchAngle`      | `number`  | `45`   | `0 ~ 90` | 横向滑动判定角度（度）。拖拽方向与水平的夹角超过此值时视为页面滚动，放弃滑动          |
| `longSwipesMs`    | `number`  | `300`  | `>= 0`   | 长滑动时间阈值（ms）。拖拽持续时间超过此值时按距离比例判定切换张数                    |
| `longSwipesRatio` | `number`  | `0.05` | `0 ~ 1`  | 切换所需滑动比例。默认需滑过 slide 宽度的 5% 才触发切换                               |
| `preventClick`    | `boolean` | `true` | —        | 拖拽后阻止 `<a>`、`<button>`、`<input>`、`<textarea>`、`<select>`、`<label>` 的误点击 |

### 功能开关

| 参数         | 类型      | 默认值 | 说明                                                                           |
| ------------ | --------- | ------ | ------------------------------------------------------------------------------ |
| `loop`       | `boolean` | `true` | 循环播放。启用后首尾各克隆一张 slide，需 slide 数量 > 1                        |
| `pagination` | `boolean` | `true` | 分页指示器。每个真实 slide 对应一个 bullet 按钮                                |
| `navigation` | `boolean` | `true` | 前后导航按钮。非 loop 模式下到达首尾时自动禁用                                 |
| `lazyload`   | `boolean` | `true` | 图片延迟加载。加载当前及相邻 slide 的 `img[data-lazy]`，完成后移除 `data-lazy` |

### 校验

所有参数通过 `resolveProps()` 统一校验。类型或范围不合法时抛出 `Swiper.options.<key>` 格式的错误，例如：

- `new Swiper(el, { touchAngle: 100 })` → `Swiper.options.touchAngle: expects a number between 0 and 90.`
- `new Swiper(el, { touchRatio: -1 })` → `Swiper.options.touchRatio: expects a number greater than 0.`

---

## 状态

Swiper 使用 `createDeepStore` 创建响应式状态，通过 `setState` 批量更新。setter 会做 `normalizeNumber` / `!!v` 归一化，非法值静默回退为默认值。

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

### 索引转换

| 方法                                | 说明                |
| ----------------------------------- | ------------------- |
| `toRealIndex(trackIndex?)`          | 轨道索引 → 省实索引 |
| `trackIndexForRealIndex(realIndex)` | 真实索引 → 轨道索引 |

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

### 构建

| 方法      | 说明                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| `build()` | 解析 container、绑定已有 DOM 或动态创建 `.j-swiper`，初始化事件和渲染。可重复调用一次 |

除 `build()`、`destroy()`、状态读取和事件订阅外，导航、播放、更新类方法都要求先调用 `build()`。

### 导航

| 方法                       | 说明                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `next()`                   | 下一张。动画进行中忽略                                       |
| `prev()`                   | 上一张。动画进行中忽略                                       |
| `slideTo(index)`           | 切换到指定真实索引（0-based）。loop 模式下自动转换为轨道索引 |
| `slideToTrack(trackIndex)` | 切换到指定轨道索引。越界时 clamp 到有效范围                  |

### 播放控制

| 方法                | 说明                                                             |
| ------------------- | ---------------------------------------------------------------- |
| `play()`            | 启动自动播放。已销毁、已有 timer、或仅 1 张 slide 时无效         |
| `pause()`           | 停止自动播放，清除 timer                                         |
| `resume()`          | 恢复自动播放。已销毁时无效                                       |
| `restartAutoplay()` | 先 `pause()` 再 `play()`，用于 `delay`/`autoplay` 配置变更后重启 |

### 数据更新

| 方法                        | 说明                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `updateData(data)`          | 替换数据源并重建所有 slide。保留当前 `realIndex`（超出范围时回退到最后一张）。返回 `this`，支持链式调用 |
| `update(patch, { force? })` | 运行时更新配置。返回 `this`                                                                             |

`update()` 的 patch 处理逻辑：

| patch 包含的 key                                  | 行为                                         |
| ------------------------------------------------- | -------------------------------------------- |
| `data`                                            | 委托给 `updateData()`                        |
| `loop` / `pagination` / `navigation` / `lazyload` | 清理旧状态，重新初始化视图（`reInitView()`） |
| `autoplay` / `delay`                              | 重启自动播放定时器                           |
| 其他（`speed` 等）                                | 仅更新尺寸和样式                             |

### 销毁

| 方法        | 说明                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------- |
| `destroy()` | 清理所有资源：事件监听、autoplay timer、loop clone、分页/导航节点、图片加载回调、响应式绑定 |

### 继承自 Component

`setState()`、`on(event, handler)`、`off(event, handler)`、`emit(event, ...args)`、`use(plugin)`。

---

## 事件

Swiper 通过 `emit()` 在特定时机发出事件，可用 `on()` / `off()` 监听：

| 事件           | 回调签名                                   | 触发时机                                      |
| -------------- | ------------------------------------------ | --------------------------------------------- |
| `beforeUpdate` | `(propsPatch: object, { force: boolean })` | `update()` 合并 props 后、`onUpdate()` 执行前 |
| `afterUpdate`  | `(propsPatch: object, { force: boolean })` | `onUpdate()` 执行后                           |

```js
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

CSS 自定义属性：

| 属性                   | 所在元素    | 说明                                           |
| ---------------------- | ----------- | ---------------------------------------------- |
| `--swiper-slide-width` | `.j-swiper` | 当前 slide 宽度（px），由 `setupStyles()` 设置 |

---

## 生命周期

### 初始化（constructor）

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
  ├─ resolveSwiperRoot(container)   [非 data 模式] 查找唯一 .j-swiper
  ├─ createDataView(root, data)     [data 模式] 创建完整 DOM
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
       └─ 移除自动创建的 root（data 模式）
```

绑定已有 DOM 模式下，外部根节点不被移除。动态 data 模式下，组件创建的 `.j-swiper` 根节点被移除，挂载容器保留。

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

- 可视化半自动测试：`tests/swiper.test.html`（需先 `vp pack` 构建）。

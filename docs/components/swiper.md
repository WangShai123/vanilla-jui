# Swiper

Swiper 是轻量轮播组件，基于 `defineComponent()` 管理稳定根节点、状态和资源清理。它支持触摸/鼠标拖拽、loop、分页、导航、自动播放、图片 lazyload，以及基于 `state.data` 的数据模式更新。

```js
import { createSwiper } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

Swiper 支持两种模式：

| 模式     | 入口              | 说明                                                |
| -------- | ----------------- | --------------------------------------------------- |
| 数据模式 | `data`            | 创建新的 Swiper DOM，并支持 `state.data` keyed 更新 |
| 绑定模式 | `id` 命中已有 DOM | 绑定页面上已有的唯一根节点，并初始化交互            |

实例创建后不会自动构建，也不会自动挂载。数据模式需要显式调用 `build()`，然后手动把 `swiper.element` 挂载到页面。

```js
const swiper = createSwiper({
  data: [
    { image: '/img/a.jpg', title: 'A' },
    { image: '/img/b.jpg', title: 'B' },
  ],
  autoplay: false,
}).build();

document.querySelector('#banner').appendChild(swiper.element);
```

## 数据渲染

当 `id` 没有命中页面上的已有元素时，`build()` 会创建一个独立的 `data-swiper` 根节点，并根据 `data` 生成 wrapper、slide、分页和导航。即使 `data` 为空，也会创建可挂载的根节点。

```js
const swiper = createSwiper({
  id: 'banner-swiper',
  data: [],
  loop: true,
  pagination: true,
  navigation: true,
}).build();

container.appendChild(swiper.element);
```

运行时替换数据：

```js
swiper.setState({
  data: [{ image: '/img/c.jpg', title: 'C' }, { children: 'Custom slide' }],
});
```

也可以直接替换单个 state 成员：

```js
swiper.state.data = [{ image: '/img/d.jpg', title: 'D' }];
```

数据模式下，slide 和分页按钮由 keyed `For` 更新，根节点和 wrapper 保持稳定；`state.data` 变化后会调度一次布局刷新，清理图片加载回调、重新收集 slide、夹取当前索引并同步 transform。

## 绑定模式

绑定模式通过 `id` 找到页面上已有的唯一根节点，不通过 `data-swiper="root"` 判断根节点。已有根节点内部仍需要提供 `data-swiper-wrapper` 和 `data-swiper-slide` 结构标记。

```html
<section id="gallery-swiper" class="custom-swiper">
  <div class="custom-track" data-swiper-wrapper>
    <div class="custom-slide" data-swiper-slide>Slide 1</div>
    <div class="custom-slide" data-swiper-slide>Slide 2</div>
  </div>
</section>
```

```js
const swiper = createSwiper({
  id: 'gallery-swiper',
  loop: false,
  autoplay: false,
}).build();
```

绑定模式不会创建根节点，`destroy()` 时也不会移除这个已有根节点。`state.data` 的 keyed 更新仅用于数据模式；绑定模式主要管理已有 DOM 的交互、loop clone、分页和导航增强。

## DOM 结构

数据模式生成结构：

```html
<div class="j-swiper" data-swiper="root" id="">
  <div class="swiper-wrapper" data-swiper-wrapper aria-live="polite">
    <a
      class="swiper-slide"
      data-swiper-slide="0"
      data-swiper-index="0"
      role="group"
      aria-label="Slide 1"
    >
      <img class="swiper-image" loading="lazy" alt="A" />
      <span class="swiper-slide-title">A</span>
    </a>
  </div>
  <div
    class="swiper-pagination is-horizontal is-clickable is-bullet"
    data-swiper-pagination
  ></div>
  <button
    type="button"
    class="swiper-navigation is-prev"
    data-action="prev"
    data-swiper-navigation="prev"
  ></button>
  <button
    type="button"
    class="swiper-navigation is-next"
    data-action="next"
    data-swiper-navigation="next"
  ></button>
</div>
```

组件内部查询和事件绑定使用 `data-swiper`、`data-swiper-wrapper`、`data-swiper-slide`、`data-swiper-pagination`、`data-swiper-bullet`、`data-swiper-navigation` 和 `data-action`，不依赖默认 CSS 类。

## Data

`data` 数组每项支持：

| 字段       | 类型                        | 说明                                                      |
| ---------- | --------------------------- | --------------------------------------------------------- |
| `image`    | `string \| null`            | 图片地址；`lazyload: true` 时先写入 `data-lazy`           |
| `url`      | `string \| null`            | 有值时 slide 渲染为 `<a>`                                 |
| `title`    | `string \| null`            | 标题文本，渲染为 `.swiper-slide-title`                    |
| `sort`     | `number \| null`            | 排序值；有 sort 的项排在前面，升序排列                    |
| `blank`    | `boolean \| null`           | 链接打开方式；默认 `true` 为 `_blank`，`false` 为 `_self` |
| `children` | `RenderableContent \| null` | 自定义 slide 内容，优先级高于 `image/title`               |

`children` 函数会收到 `{ swiper, item, index }`。

## Props

| 参数              | 类型               | 默认值   | 说明                                  |
| ----------------- | ------------------ | -------- | ------------------------------------- |
| `id`              | `string \| null`   | `null`   | 根节点 id；命中已有元素时进入绑定模式 |
| `data`            | `SwiperDataItem[]` | `[]`     | 初始数据；数据模式下由 keyed 列表更新 |
| `loop`            | `boolean`          | `true`   | 是否循环播放                          |
| `autoplay`        | `boolean`          | `true`   | 是否自动播放                          |
| `delay`           | `number`           | `3000`   | 自动播放间隔，最低按 16ms 执行        |
| `lazyload`        | `boolean`          | `true`   | 是否延迟加载图片                      |
| `pagination`      | `boolean`          | `true`   | 是否显示分页指示器                    |
| `navigation`      | `boolean`          | `true`   | 是否显示前后导航                      |
| `speed`           | `number`           | `300`    | 切换动画时长                          |
| `touchRatio`      | `number`           | `1`      | 拖拽距离倍率                          |
| `touchAngle`      | `number`           | `45`     | 横向滑动判定角度，范围 `0-90`         |
| `longSwipesMs`    | `number`           | `300`    | 长滑动时间阈值                        |
| `longSwipesRatio` | `number`           | `0.05`   | 触发切换的滑动比例，范围 `0-1`        |
| `preventClick`    | `boolean`          | `true`   | 拖拽后是否阻止交互元素误点击          |
| `className`       | `object`           | 默认类名 | 覆盖数据模式生成 DOM 的结构类名       |

## State

| 字段         | 类型               | 说明                                      |
| ------------ | ------------------ | ----------------------------------------- |
| `data`       | `SwiperDataItem[]` | 数据源，数据模式下由 keyed 列表更新 slide |
| `index`      | `number`           | 当前真实 slide 索引，不含 loop clone      |
| `trackIndex` | `number`           | 内部轨道索引，loop 模式包含 clone         |
| `transform`  | `number`           | wrapper 的 X 轴偏移                       |
| `animating`  | `boolean`          | 是否处于切换动画中                        |
| `width`      | `number`           | 根节点宽度                                |

## className

| 字段                    | 默认值                        |
| ----------------------- | ----------------------------- |
| `root`                  | `j-swiper`                    |
| `wrapper`               | `swiper-wrapper`              |
| `slide`                 | `swiper-slide`                |
| `image`                 | `swiper-image`                |
| `title`                 | `swiper-slide-title`          |
| `pagination`            | `swiper-pagination`           |
| `paginationHorizontal`  | `is-horizontal`               |
| `paginationClickable`   | `is-clickable`                |
| `paginationBulletGroup` | `is-bullet`                   |
| `indicator`             | `swiper-pagination-indicator` |
| `bullet`                | `swiper-pagination-bullet`    |
| `navigation`            | `swiper-navigation`           |
| `prev`                  | `is-prev`                     |
| `next`                  | `is-next`                     |
| `active`                | `is-active`                   |
| `disabled`              | `is-disabled`                 |
| `loading`               | `loading`                     |
| `loaded`                | `loaded`                      |
| `error`                 | `error`                       |

## Methods

| 方法                            | 说明                                       |
| ------------------------------- | ------------------------------------------ |
| `build()`                       | 创建或绑定 Swiper DOM，并初始化交互        |
| `mount(container)`              | 构建并把当前 `element` 挂载到指定容器      |
| `unmount()`                     | 移除数据模式根节点；绑定模式保留已有根节点 |
| `refresh()`                     | 重新计算宽度、同步 transform 和 lazyload   |
| `next()`                        | 切换到下一张                               |
| `prev()`                        | 切换到上一张                               |
| `slideTo(index)`                | 切换到指定真实索引                         |
| `slideToTrack(trackIndex)`      | 切换到指定轨道索引                         |
| `toRealIndex(trackIndex?)`      | 轨道索引转换为真实索引                     |
| `trackIndexForRealIndex(index)` | 真实索引转换为轨道索引                     |
| `play()`                        | 启动自动播放                               |
| `pause()`                       | 停止自动播放                               |
| `resume()`                      | 按当前 `autoplay` 配置恢复播放             |
| `restartAutoplay()`             | 重启自动播放计时器                         |
| `setState(patch)`               | 更新响应式状态                             |
| `destroy()`                     | 销毁实例并清理事件、定时器、响应式绑定     |

## 行为细节

loop 模式会在首尾各克隆一张 slide。动画结束时如果轨道索引落在 clone 上，Swiper 会无动画跳回对应真实 slide，形成连续循环。

自动播放只在 `autoplay: true` 且真实 slide 数量大于 1 时启动。鼠标进入、触摸或拖拽开始会暂停，离开或拖拽结束后按配置恢复。

lazyload 会加载当前 slide 和相邻 slide 的 `img[data-lazy]`，并在图片上同步 `loading/loaded/error` 类名。

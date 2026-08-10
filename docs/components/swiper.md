# Swiper

Swiper 是轻量轮播组件，基于 `defineComponent()` 管理稳定根节点、响应式 state、事件、定时器和资源清理。它支持触摸/鼠标拖拽、loop、分页、导航、自动播放、图片 lazyload，以及运行时通过 `state.data` 响应式增删 slide。

```js
import { insert } from 'vanilla-signal';
import { createSwiper, q } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

实例创建后不会自动构建 DOM。按组件规范，先显式调用 `build()`，再挂载到目标容器。

```js
const swiper = createSwiper({
  data: [
    { image: '/img/a.jpg', title: 'A' },
    { image: '/img/b.jpg', title: 'B' },
  ],
  autoplay: false,
}).build();

const banner = q('#banner');
if (banner && swiper.element) insert(banner, swiper.element);
```

也可以在 `build()` 后使用组件生命周期挂载：

```js
const banner = q('#banner');
const swiper = createSwiper({
  data: [{ children: 'Slide 1' }],
}).build();

if (banner) swiper.mount(banner);
```

## 数据渲染

`build()` 始终创建一个由 Swiper 拥有的稳定根节点。`id` 只用于设置这个根节点的 `id`，不会绑定页面上已有的 DOM。

```js
const swiper = createSwiper({
  id: 'banner-swiper',
  data: [],
  loop: true,
  pagination: true,
  navigation: true,
}).build();

if (container && swiper.element) insert(container, swiper.element);
```

运行时替换数据：

```js
swiper.setState({
  data: [{ image: '/img/c.jpg', title: 'C' }, { children: 'Custom slide' }],
});
```

也可以直接替换 state 成员：

```js
swiper.state.data = [{ image: '/img/d.jpg', title: 'D' }];
```

slide 和分页按钮由 keyed `For` 更新。根节点、wrapper 和未删除数据项对应的节点保持稳定；`state.data` 变化后组件会自动同步宽度、索引、transform、lazyload 和自动播放状态，不提供命令式刷新方法。

## 异步数据

`data` 可以是函数，返回 `SwiperDataItem[]` 或 `Promise<SwiperDataItem[]>`。组件在 `build()` 后调用该函数；请求期间 `state.loading` 为 `true`，`data-swiper-wrapper` 的内容会切换为 `createLoading()` 生成的加载节点。

```js
const swiper = createSwiper({
  data: async () => {
    const response = await fetch('/api/product/1/images');
    return response.json();
  },
  autoplay: false,
}).build();

const gallery = q('#gallery');
if (gallery && swiper.element) insert(gallery, swiper.element);
```

异步函数没有 `cache` / `ttl` 参数。需要缓存时，由业务在函数内部按本地存储、IndexedDB 或请求策略自行控制再次请求的时机。

异步返回结果写入 `state.data`。如果组件已销毁，或后续请求已经开始，过期结果不会写入 state。

## DOM 结构

Swiper 生成结构：

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

`data` 支持 `SwiperDataItem[]` 或函数：

```ts
type SwiperDataLoader = (
  swiper: Swiper
) => SwiperDataItem[] | Promise<SwiperDataItem[]>;
```

数组每项支持：

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

| 参数              | 类型                                   | 默认值   | 说明                           |
| ----------------- | -------------------------------------- | -------- | ------------------------------ |
| `id`              | `string \| null`                       | `null`   | 组件创建的根节点 id            |
| `data`            | `SwiperDataItem[] \| SwiperDataLoader` | `[]`     | 初始数据或异步数据函数         |
| `loop`            | `boolean`                              | `true`   | 是否循环播放                   |
| `autoplay`        | `boolean`                              | `true`   | 是否自动播放                   |
| `delay`           | `number`                               | `3000`   | 自动播放间隔，最低按 16ms 执行 |
| `lazyload`        | `boolean`                              | `true`   | 是否延迟加载图片               |
| `pagination`      | `boolean`                              | `true`   | 是否显示分页指示器             |
| `navigation`      | `boolean`                              | `true`   | 是否显示前后导航               |
| `speed`           | `number`                               | `300`    | 切换动画时长                   |
| `touchRatio`      | `number`                               | `1`      | 拖拽距离倍率                   |
| `touchAngle`      | `number`                               | `45`     | 横向滑动判定角度，范围 `0-90`  |
| `longSwipesMs`    | `number`                               | `300`    | 长滑动时间阈值                 |
| `longSwipesRatio` | `number`                               | `0.05`   | 触发切换的滑动比例，范围 `0-1` |
| `preventClick`    | `boolean`                              | `true`   | 拖拽后是否阻止交互元素误点击   |
| `className`       | `Partial<SwiperClassNames>`            | 默认类名 | 覆盖生成 DOM 的结构类名        |

## State

| 字段         | 类型               | 说明                                 |
| ------------ | ------------------ | ------------------------------------ |
| `data`       | `SwiperDataItem[]` | 数据源，由 keyed 列表更新 slide      |
| `loading`    | `boolean`          | 异步数据函数请求中                   |
| `index`      | `number`           | 当前真实 slide 索引，不含 loop clone |
| `trackIndex` | `number`           | 内部轨道索引，loop 模式包含 clone    |
| `transform`  | `number`           | wrapper 的 X 轴偏移                  |
| `animating`  | `boolean`          | 是否处于切换动画中                   |
| `width`      | `number`           | 根节点宽度                           |

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

## Methods

| 方法                       | 说明                                   |
| -------------------------- | -------------------------------------- |
| `build()`                  | 创建 Swiper DOM，并初始化响应式绑定    |
| `mount(container)`         | 构建并把当前 `element` 挂载到指定容器  |
| `unmount()`                | 移除根节点，保留 state 和响应式 owner  |
| `next()`                   | 切换到下一张                           |
| `prev()`                   | 切换到上一张                           |
| `slideTo(index)`           | 切换到指定真实索引                     |
| `slideToTrack(trackIndex)` | 切换到指定轨道索引                     |
| `play()`                   | 启动自动播放                           |
| `pause()`                  | 停止自动播放                           |
| `resume()`                 | 按当前 `autoplay` 配置恢复播放         |
| `restartAutoplay()`        | 重启自动播放计时器                     |
| `setState(patch)`          | 更新响应式状态                         |
| `destroy()`                | 销毁实例并清理事件、定时器、响应式绑定 |

## 行为细节

loop 模式会在首尾各克隆一张 slide。动画结束时如果轨道索引落在 clone 上，Swiper 会无动画跳回对应真实 slide，形成连续循环。

自动播放只在 `autoplay: true` 且真实 slide 数量大于 1 时启动。鼠标进入、触摸或拖拽开始会暂停，离开或拖拽结束后按配置恢复。

lazyload 会加载当前 slide 和相邻 slide 的 `img[data-lazy]`，并在图片上同步 `data-status="loading"`、`data-status="loaded"` 或 `data-status="error"`。

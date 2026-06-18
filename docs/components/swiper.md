# Swiper

Swiper 是轻量轮播组件，源码位于 `src/components/swiper.js`。它围绕触摸、鼠标拖拽、transform、loop clone、分页、导航和 autoplay 定时器工作，因此保持命令式实现。

## 导入

```js
import { Swiper } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const swiper = new Swiper(document.querySelector('.j-swiper'), {
  loop: true,
  pagination: true,
  navigation: true,
});
```

## DOM 结构

绑定已有 DOM 时，根节点必须是 `.j-swiper`，且内部必须存在 `.swiper-wrapper` 和至少一个 `.swiper-slide`。组件不会自动给外部根节点添加 `j-swiper` 或 `is-horizontal`。

```html
<div class="j-swiper">
  <div class="swiper-wrapper">
    <a href="/a" class="swiper-slide">
      <img
        src="https://placehold.co/600x400?text=A"
        class="swiper-image"
        loading="lazy"
        alt="A"
      />
      <span class="swiper-slide-title">Slide A</span>
    </a>
    <a href="/b" class="swiper-slide">
      <img
        src="https://placehold.co/600x400?text=B"
        class="swiper-image"
        loading="lazy"
        alt="B"
      />
      <span class="swiper-slide-title">Slide B</span>
    </a>
  </div>
</div>
```

初始化后，组件会按配置补充分页和导航：

```html
<div class="j-swiper">
  <div class="swiper-wrapper">
    <a href="/a" class="swiper-slide">...</a>
    <a href="/b" class="swiper-slide">...</a>
  </div>
  <div class="swiper-pagination is-horizontal is-clickable is-bullet">
    <span class="swiper-pagination-indicator swiper-pagination-bullet"></span>
  </div>
  <button class="swiper-navigation is-prev" type="button">...</button>
  <button class="swiper-navigation is-next" type="button">...</button>
</div>
```

如果 DOM 中已经存在 `.swiper-pagination`、`.swiper-navigation.is-prev` 或 `.swiper-navigation.is-next`，Swiper 会复用它们；缺失时会按需创建。导航图标使用内置 `arrow-left` 和 `arrow-right`。

根节点不再支持只写 `.swiper` 后由组件自动补 class 的模式。这样可以让 DOM 契约更明确，也减少初始化和销毁时对外部 DOM class 的非必要修改。

## 动态数据

传入 `options.data` 后，Swiper 会创建一个完整的 `.j-swiper` DOM，并在其中生成 `.swiper-wrapper` 和 `.swiper-slide`。如果第一个参数是 Element 或选择器，它表示挂载容器，而不是 Swiper 根节点；如果第一个参数为 `false`、`null` 或未传有效容器，会把生成的 `.j-swiper` 挂载到 `document.body`。`destroy()` 时会移除这个生成的 `.j-swiper` 根节点。

```js
const swiper = new Swiper(document.querySelector('.banner-container'), {
  loop: true,
  data: [
    {
      image: 'https://placehold.co/600x400?text=Design',
      url: '/design',
      title: 'Design',
      sort: 1,
    },
    {
      image: 'https://placehold.co/600x400?text=Build',
      title: 'Build',
    },
  ],
});
```

`data` 每一项支持：

| 字段       | 类型                     | 说明                                                |
| ---------- | ------------------------ | --------------------------------------------------- |
| `image`    | `string`                 | 图片地址，会生成 `.swiper-image`                    |
| `url`      | `string`                 | 跳转地址，存在时 slide 使用 `<a>`                   |
| `title`    | `string`                 | 标题，会生成 `.swiper-slide-title`                  |
| `sort`     | `number`                 | 排序值；全部未设置时按数组自然顺序                  |
| `children` | `string` / `Node` / 数组 | 自定义内容，优先级高于 `image` 和 `title`，可传 JSX |

`children` 适合渲染 hero banner、按钮组合或由 `vanilla-signal` JSX 创建的动态内容：

```js
new Swiper(false, {
  data: [
    {
      children:
        '<section class="swiper-hero"><strong>Project Console</strong><span>Ready</span></section>',
    },
  ],
});
```

动态创建后的结构类似：

```html
<div class="banner-container">
  <div class="j-swiper">
    <div class="swiper-wrapper">
      <a href="/design" class="swiper-slide">...</a>
    </div>
    <div class="swiper-pagination is-horizontal is-clickable is-bullet">
      ...
    </div>
    <button class="swiper-navigation is-prev" type="button">...</button>
    <button class="swiper-navigation is-next" type="button">...</button>
  </div>
</div>
```

## Options

| 参数              | 类型             | 默认值  | 说明                                            |
| ----------------- | ---------------- | ------- | ----------------------------------------------- |
| `data`            | `array` / `null` | `null`  | 动态创建 slide 的数据源                         |
| `loop`            | `boolean`        | `false` | 是否循环播放；启用后会创建首尾 clone            |
| `autoplay`        | `boolean`        | `false` | 是否自动播放                                    |
| `delay`           | `number`         | `3000`  | 自动播放间隔，单位 ms                           |
| `lazyload`        | `boolean`        | `true`  | 是否加载相邻 slide 的 `img[data-lazy]`          |
| `pagination`      | `boolean`        | `true`  | 是否显示分页指示器                              |
| `navigation`      | `boolean`        | `true`  | 是否显示上一张/下一张导航按钮                   |
| `speed`           | `number`         | `300`   | 切换动画时长，单位 ms                           |
| `touchRatio`      | `number`         | `1`     | 拖拽距离倍率，必须大于 0                        |
| `touchAngle`      | `number`         | `45`    | 横向滑动判定角度，0-90；角度过大视为页面滚动    |
| `longSwipesMs`    | `number`         | `300`   | 长滑动时间阈值，单位 ms                         |
| `longSwipesRatio` | `number`         | `0.05`  | 切换所需比例；默认滑过 slide 宽度的 5% 才会切换 |
| `preventClick`    | `boolean`        | `true`  | 拖拽后是否阻止链接、按钮等交互元素的误点击      |

所有 options 会通过 `resolveOptions()` 校验。类型或范围不合法会抛出 `Swiper.options.*` 相关错误。

## 滑动规则

横向位移小于 `SWIPE_THRESHOLD` 时不会进入滑动状态。超过阈值后，组件会根据 `touchAngle` 判断这是横向滑动还是页面滚动。

切换规则：

- 向左滑动切到下一张，向右滑动切到上一张。
- 横向滑动距离达到 `longSwipesRatio * slideWidth` 才会切换。
- 默认 `longSwipesRatio` 是 `0.1`，即滑过当前 slide 宽度的 10% 会触发切换。
- 未达到比例、斜向滑动、`touchcancel` 或鼠标离开时，会自动归位到当前 slide。
- `loop: false` 时，`slideTo()` 会把索引限制在首尾范围内。

```js
new Swiper(el, {
  longSwipesRatio: 0.25,
});
```

上例表示需要滑过 slide 宽度的 25% 才切换。

## 方法

| 方法                              | 说明                          |
| --------------------------------- | ----------------------------- |
| `next()`                          | 下一张                        |
| `prev()`                          | 上一张                        |
| `slideTo(index)`                  | 切换到指定索引                |
| `play()` / `pause()` / `resume()` | 自动播放控制                  |
| `update()`                        | 重新计算尺寸                  |
| `destroy()`                       | 清理事件、定时器和 clone 节点 |

## 销毁行为

`destroy()` 会清理事件、autoplay 定时器、loop clone、自动创建的分页和导航按钮。

绑定已有 DOM 时，外部传入的 `.j-swiper` 根节点不会被移除，根节点 class 也不会被组件修改。动态 `data` 模式下，组件创建的完整 `.j-swiper` 根节点会在 `destroy()` 时移除，挂载容器会保留。

## 测试

可视化半自动测试页面：`tests/swiper.test.html`。

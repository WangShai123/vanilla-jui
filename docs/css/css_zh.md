# vanilla-jui CSS 文档

## 概述

vanilla-jui 使用统一的 CSS 系统，包含设计令牌和组件样式。

### 文件结构

```
src/css/
├── tokens.css        # 设计令牌 (布局、颜色、主题)
├── layout.css        # 布局系统 (flex、grid、容器)
├── content.css       # 文章/阅读模式样式
├── font.css          # 字体样式
├── icon.css          # 图标样式
├── animation.css     # 动画样式
├── status.css        # 状态指示器样式
├── components.css    # 基础组件样式
├── form.css          # 表单元素样式
├── button.css        # 按钮样式
├── badge.css         # 徽章样式
├── tag.css           # 标签样式
├── card.css          # 卡片样式
├── modal.css         # 模态框样式
├── toast.css         # 提示框样式
├── tabs.css          # 标签页样式
├── menu.css          # 菜单样式
├── accordion.css     # 手风琴样式
├── breadcrumb.css    # 面包屑样式
├── table.css         # 表格样式
├── pagination.css    # 分页样式
├── drop.css          # 下拉菜单样式
├── tooltip.css       # 工具提示样式
├── popup.css         # 弹窗样式
├── offcanvas.css     # 侧边栏样式
├── flow.css          # 步骤条样式
├── swiper.css        # 轮播样式
├── skeleton.css      # 骨架屏样式
├── loading.css       # 加载动画样式
├── divider.css       # 分割线样式
├── avatar.css        # 头像样式
├── tip.css           # 提示样式
├── toolbar.css       # 工具栏样式
└── theme-palette.css # 主题面板样式
```

---

## 1. 设计令牌 (`tokens.css`)

### 布局令牌

#### 间距

| 令牌      | 值        | 描述               |
| --------- | --------- | ------------------ |
| `--space` | `0.25rem` | 基础间距单位 (4px) |

#### 过渡时间

| 令牌         | 值      | 描述     |
| ------------ | ------- | -------- |
| `--speed-sm` | `0.15s` | 快速过渡 |
| `--speed-md` | `0.25s` | 中等过渡 |
| `--speed-lg` | `0.5s`  | 慢速过渡 |
| `--speed-xl` | `0.75s` | 超慢过渡 |

#### 字号比例

| 令牌         | 值         | 描述         |
| ------------ | ---------- | ------------ |
| `--text-xs`  | `0.75rem`  | 超小 (12px)  |
| `--text-sm`  | `0.875rem` | 小 (14px)    |
| `--text-md`  | `1rem`     | 中等 (16px)  |
| `--text-lg`  | `1.125rem` | 大 (18px)    |
| `--text-xl`  | `1.25rem`  | 超大 (20px)  |
| `--text-2xl` | `1.5rem`   | 2倍大 (24px) |
| `--text-3xl` | `1.875rem` | 3倍大 (30px) |
| `--text-4xl` | `2.25rem`  | 4倍大 (36px) |
| `--text-5xl` | `3rem`     | 5倍大 (48px) |

#### 组件字号

| 令牌              | 默认       | j-font-sm   | j-font-md  | 描述  |
| ----------------- | ---------- | ----------- | ---------- | ----- |
| `--font-size-xs`  | `0.75rem`  | `0.6875rem` | `0.75rem`  | 超小  |
| `--font-size-sm`  | `0.875rem` | `0.75rem`   | `0.875rem` | 小    |
| `--font-size`     | `0.875rem` | `0.875rem`  | `1rem`     | 基础  |
| `--font-size-md`  | `0.875rem` | `0.875rem`  | `1rem`     | 中等  |
| `--font-size-lg`  | `1rem`     | `1rem`      | `1.125rem` | 大    |
| `--font-size-xl`  | `1.125rem` | `1.125rem`  | `1.25rem`  | 超大  |
| `--font-size-2xl` | `1.25rem`  | `1.25rem`   | `1.5rem`   | 2倍大 |

#### 字重

| 令牌                | 值  |
| ------------------- | --- |
| `--font-thin`       | 100 |
| `--font-extraLight` | 200 |
| `--font-light`      | 300 |
| `--font-normal`     | 400 |
| `--font-medium`     | 500 |
| `--font-semiBold`   | 600 |
| `--font-bold`       | 700 |
| `--font-extraBold`  | 800 |
| `--font-black`      | 900 |

#### 行高

| 令牌                      | 值     | 描述       |
| ------------------------- | ------ | ---------- |
| `--line-height`           | `1.5`  | 默认行高   |
| `--line-height-paragraph` | `1.5`  | 段落行高   |
| `--line-height-pre`       | `1.4`  | 代码块行高 |
| `--line-height-heading`   | `1.25` | 标题行高   |
| `--line-height-self`      | `1`    | 单行行高   |

#### 元素高度

| 令牌              | 默认      | j-font-sm | j-font-md | 描述          |
| ----------------- | --------- | --------- | --------- | ------------- |
| `--el-height-3xs` | `1rem`    | `1rem`    | `1.25rem` | 超超小 (16px) |
| `--el-height-2xs` | `1.25rem` | `1.25rem` | `1.5rem`  | 超小 (20px)   |
| `--el-height-xs`  | `1.5rem`  | `1.5rem`  | `1.75rem` | 小 (24px)     |
| `--el-height-sm`  | `1.75rem` | `1.75rem` | `2rem`    | 中小 (28px)   |
| `--el-height-md`  | `2rem`    | `2rem`    | `2.25rem` | 默认 (32px)   |
| `--el-height-lg`  | `2.25rem` | `2.25rem` | `2.5rem`  | 中等 (36px)   |
| `--el-height-xl`  | `2.5rem`  | `2.5rem`  | `2.75rem` | 大 (40px)     |

**注意：** `--el-height` 默认值等于 sm 层级值，而其他高度变体默认值等于其 md 层级值。

#### 圆角

| 令牌            | 值         | 描述         |
| --------------- | ---------- | ------------ |
| `--radius-xs`   | `0.25rem`  | 小 (4px)     |
| `--radius-sm`   | `0.375rem` | 基础 (6px)   |
| `--radius-md`   | `0.5rem`   | 中等 (8px)   |
| `--radius-lg`   | `0.75rem`  | 大 (12px)    |
| `--radius-xl`   | `1rem`     | 超大 (16px)  |
| `--radius-2xl`  | `1.5rem`   | 2倍大 (24px) |
| `--radius-full` | `9999px`   | 全圆         |

#### 阴影

| 令牌          | 描述     |
| ------------- | -------- |
| `--shadow-xs` | 最小阴影 |
| `--shadow-sm` | 小阴影   |
| `--shadow`    | 基础阴影 |
| `--shadow-md` | 中等阴影 |
| `--shadow-lg` | 大阴影   |
| `--shadow-xl` | 超大阴影 |

#### 断点

| 令牌          | 值       |
| ------------- | -------- |
| `--screen-sm` | `576px`  |
| `--screen-md` | `768px`  |
| `--screen-lg` | `992px`  |
| `--screen-xl` | `1200px` |

#### 容器宽度

| 令牌            | 值      |
| --------------- | ------- |
| `--columns-xs`  | `20rem` |
| `--columns-sm`  | `24rem` |
| `--columns-md`  | `28rem` |
| `--columns-lg`  | `32rem` |
| `--columns-xl`  | `36rem` |
| `--columns-2xl` | `42rem` |
| `--columns-3xl` | `48rem` |
| `--columns-4xl` | `56rem` |
| `--columns-5xl` | `64rem` |

#### 层级

| 令牌                  | 值   | 描述     |
| --------------------- | ---- | -------- |
| `--z-index-0`         | 0    | 基础层   |
| `--z-index-1`         | 1    | 基础之上 |
| `--z-index-badge`     | 2    | 徽章     |
| `--z-index-submenu`   | 5    | 子菜单   |
| `--z-index-drop`      | 9900 | 下拉菜单 |
| `--z-index-overlay`   | 9950 | 遮罩层   |
| `--z-index-offcanvas` | 9960 | 侧边栏   |
| `--z-index-popup`     | 9970 | 弹窗     |
| `--z-index-toast`     | 9980 | 提示框   |

### 颜色令牌

#### UI 结构 (`ui-*`)

| 令牌                  | 亮色               | 暗色                     | 描述     |
| --------------------- | ------------------ | ------------------------ | -------- |
| `--ui-bg`             | `#ffffff`          | `#030712`                | 主背景   |
| `--ui-bg-subtle`      | `#f9fafb`          | `#111827`                | 微妙背景 |
| `--ui-bg-muted`       | `#f3f4f6`          | `#1f2937`                | 柔和背景 |
| `--ui-surface`        | `#ffffff`          | `#030712`                | 表面     |
| `--ui-surface-subtle` | `#f9fafb`          | `#111827`                | 微妙表面 |
| `--ui-surface-muted`  | `#f3f4f6`          | `#1f2937`                | 柔和表面 |
| `--ui-surface-hover`  | `rgba(0,0,0,0.02)` | `rgba(255,255,255,0.05)` | 悬停状态 |
| `--ui-surface-active` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.08)` | 激活状态 |
| `--ui-fg`             | `#111827`          | `#f9fafb`                | 主文本   |
| `--ui-fg-muted`       | `#6b7280`          | `#9ca3af`                | 次要文本 |
| `--ui-fg-soft`        | `#9ca3af`          | `#6b7280`                | 三级文本 |
| `--ui-fg-subtle`      | `#d1d5db`          | `#4b5563`                | 微妙文本 |
| `--ui-border-subtle`  | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)` | 浅边框   |
| `--ui-border`         | `rgba(0,0,0,0.1)`  | `rgba(255,255,255,0.12)` | 默认边框 |
| `--ui-border-strong`  | `rgba(0,0,0,0.2)`  | `rgba(255,255,255,0.2)`  | 强边框   |
| `--ui-disabled-bg`    | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.05)` | 禁用背景 |
| `--ui-disabled-fg`    | `#9ca3af`          | `#6b7280`                | 禁用文本 |

#### 固定主题色 (`ui-{theme}`)

15 个固定主题色，供 Theme 组件预览使用。

| 令牌          | 亮色      | 暗色      |
| ------------- | --------- | --------- |
| `--ui-gray`   | `#374151` | `#e5e7eb` |
| `--ui-olive`  | `#717762` | `#d4d9cc` |
| `--ui-tomato` | `#ef4444` | `#fca5a5` |
| `--ui-ruby`   | `#f43f5e` | `#fda4af` |
| `--ui-pink`   | `#ec4899` | `#f9a8d4` |
| `--ui-violet` | `#8b5cf6` | `#c4b5fd` |
| `--ui-indigo` | `#6366f1` | `#a5b4fc` |
| `--ui-blue`   | `#3b82f6` | `#93c5fd` |
| `--ui-teal`   | `#14b8a6` | `#5eead4` |
| `--ui-grass`  | `#22c55e` | `#86efac` |
| `--ui-mint`   | `#06b6d4` | `#67e8f9` |
| `--ui-lime`   | `#84cc16` | `#bef264` |
| `--ui-yellow` | `#eab308` | `#fde047` |
| `--ui-orange` | `#f97316` | `#fdba74` |
| `--ui-gold`   | `#b45309` | `#fbbf24` |

#### 主题色 (`tone-*`)

| 令牌                   | 描述           |
| ---------------------- | -------------- |
| `--tone-subtle`        | 极浅色调       |
| `--tone-soft`          | 浅色调         |
| `--tone-muted`         | 中等色调       |
| `--tone-wash`          | 极微色调       |
| `--tone-border`        | 默认边框       |
| `--tone-border-strong` | 强边框         |
| `--tone-solid`         | 主色           |
| `--tone-solid-hover`   | 悬停状态       |
| `--tone-solid-active`  | 激活状态       |
| `--tone-text`          | 品牌文本       |
| `--tone-fg`            | 主色上的前景色 |
| `--tone-ring`          | 聚焦环         |
| `--tone-heading`       | 标题文本       |
| `--tone-subtitle`      | 副标题文本     |
| `--tone-body`          | 正文文本       |
| `--tone-caption`       | 说明文本       |
| `--tone-muted`         | 柔和文本       |
| `--tone-link`          | 链接颜色       |
| `--tone-link-hover`    | 链接悬停       |
| `--tone-link-visited`  | 链接已访问     |
| `--tone-code-bg`       | 代码背景       |
| `--tone-code-fg`       | 代码文本       |

#### 语义状态 (`state-*`)

每个状态 (danger, success, warning, info) 包含：

| 令牌                    | 描述           |
| ----------------------- | -------------- |
| `--state-{name}`        | 主色           |
| `--state-{name}-hover`  | 悬停状态       |
| `--state-{name}-active` | 激活状态       |
| `--state-{name}-fg`     | 主色上的前景色 |
| `--state-{name}-text`   | 文本颜色       |
| `--state-{name}-subtle` | 微妙背景       |
| `--state-{name}-soft`   | 柔和背景       |
| `--state-{name}-muted`  | 中等背景       |
| `--state-{name}-border` | 边框颜色       |
| `--state-{name}-ring`   | 聚焦环         |

---

## 2. 布局系统 (`layout.css`)

### 基础重置

布局系统提供现代 CSS 重置：

```css
/* 应用于所有元素 */
*,
::after,
::backdrop,
::before,
::file-selector-button {
  box-sizing: border-box;
}

/* 应用于 html */
html {
  -webkit-text-size-adjust: 100%;
  tab-size: 4;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  scroll-behavior: smooth;
  font-family:
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Emoji,
    Helvetica,
    Arial,
    sans-serif;
  color: var(--ui-fg);
  background-color: var(--ui-bg);
}

/* 应用于 body */
body {
  min-width: 320px;
  min-height: 100vh;
  font-size: var(--font-size-md);
  margin: 0;
}
```

### 颜色方案

```html
<!-- 亮色模式 -->
<html class="light">
  <!-- 暗色模式 -->
  <html class="dark"></html>
</html>
```

### 重置工具

使用 `.is-reset` 重置特定元素：

```html
<a class="is-reset" href="#">链接</a>
<button class="is-reset">按钮</button>
<h1 class="is-reset">标题</h1>
<ul class="is-reset">
  <li>列表项</li>
</ul>
<p class="is-reset">段落</p>
<pre class="is-reset">代码</pre>
```

---

### 容器

#### 基础容器

```html
<div class="container">内容居中，最大宽度 1200px</div>
```

| 类名             | 描述                                                         |
| ---------------- | ------------------------------------------------------------ |
| `container`      | 居中容器，最大宽度 `--screen-xl` (1200px)，水平内边距 `1rem` |
| `auto-container` | 全宽可滚动容器                                               |
| `block-center`   | 块级居中，自动高度                                           |

#### 容器变量

```css
.container {
  --container-padding-inline: 1rem; /* 水平内边距 */
}
```

---

### Flex 布局

Flex 布局适合**一维**排列（导航、表单、行）。

#### 基础 Flex 容器

```html
<div class="flex-container">
  <div class="flex-col">项目 1</div>
  <div class="flex-col">项目 2</div>
  <div class="flex-col">项目 3</div>
</div>
```

| 类名             | 描述                                   |
| ---------------- | -------------------------------------- |
| `flex-container` | Flex 行容器，`flex-wrap: wrap`，带 gap |
| `flex-cols`      | 弹性列（等宽，`flex: 1 1 0%`）         |
| `flex-col-auto`  | 自动宽度列（内容自适应）               |

#### 自定义间距

```html
<div class="flex-container" style="--flex-container-gap: 2rem;">
  <div class="flex-col-6">左侧</div>
  <div class="flex-col-6">右侧</div>
</div>
```

#### 固定列宽 (1-12)

基于 12 列网格。列宽 = `(100% - (n-1) * gap) / n`。

```html
<!-- 半宽 -->
<div class="flex-container">
  <div class="flex-col-6">50%</div>
  <div class="flex-col-6">50%</div>
</div>

<!-- 三分之一宽 -->
<div class="flex-container">
  <div class="flex-col-4">33.3%</div>
  <div class="flex-col-4">33.3%</div>
  <div class="flex-col-4">33.3%</div>
</div>

<!-- 四分之一宽 -->
<div class="flex-container">
  <div class="flex-col-3">25%</div>
  <div class="flex-col-3">25%</div>
  <div class="flex-col-3">25%</div>
  <div class="flex-col-3">25%</div>
</div>

<!-- 混合宽度 -->
<div class="flex-container">
  <div class="flex-col-8">66.7%</div>
  <div class="flex-col-4">33.3%</div>
</div>
```

可用类：`flex-col-1` 到 `flex-col-12`

#### 响应式列

列根据视口宽度自适应：

| 断点 | 类前缀            | 最小宽度 |
| ---- | ----------------- | -------- |
| 默认 | `flex-col-{n}`    | 0        |
| sm   | `flex-col-sm-{n}` | 576px    |
| md   | `flex-col-md-{n}` | 768px    |
| lg   | `flex-col-lg-{n}` | 992px    |
| xl   | `flex-col-xl-{n}` | 1200px   |

```html
<!-- 移动端：全宽，平板：半宽，桌面：三分之一 -->
<div class="flex-container">
  <div class="flex-col-12 flex-col-sm-6 flex-col-md-4">内容</div>
  <div class="flex-col-12 flex-col-sm-6 flex-col-md-4">内容</div>
  <div class="flex-col-12 flex-col-sm-6 flex-col-md-4">内容</div>
</div>
```

#### 响应式示例：侧边栏布局

```html
<div class="flex-container">
  <!-- 侧边栏：移动端全宽，桌面端 3 列 -->
  <div class="flex-col-12 flex-col-md-3">
    <nav>侧边栏</nav>
  </div>
  <!-- 主内容：移动端全宽，桌面端 9 列 -->
  <div class="flex-col-12 flex-col-md-9">
    <main>内容</main>
  </div>
</div>
```

#### 响应式示例：仪表盘卡片

```html
<div class="flex-container">
  <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">卡片 1</div>
  <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">卡片 2</div>
  <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">卡片 3</div>
  <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">卡片 4</div>
</div>
```

---

### Grid 布局

Grid 布局适合**二维**布局（卡片网格、仪表盘、画廊）。

#### 基础 Grid 容器

```html
<div class="grid-container grid-col-3">
  <div>项目 1</div>
  <div>项目 2</div>
  <div>项目 3</div>
</div>
```

| 类名             | 描述                     |
| ---------------- | ------------------------ |
| `grid-container` | Grid 容器，带 gap 和全宽 |
| `grid-col-{n}`   | 固定列数 (1-12)          |

#### 固定列数 (1-12)

```html
<!-- 2 列 -->
<div class="grid-container grid-col-2">
  <div>项目 1</div>
  <div>项目 2</div>
</div>

<!-- 4 列 -->
<div class="grid-container grid-col-4">
  <div>项目 1</div>
  <div>项目 2</div>
  <div>项目 3</div>
  <div>项目 4</div>
</div>
```

可用类：`grid-col-1` 到 `grid-col-12`

#### 自动填充 Grid

自动填充根据最小宽度创建响应式列：

```html
<!-- 自动填充：每列最小 200px -->
<div class="grid-container grid-col-auto-200">
  <div>项目 1</div>
  <div>项目 2</div>
  <div>项目 3</div>
  <div>项目 4</div>
  <div>项目 5</div>
</div>
```

| 类名                | 最小宽度 | 描述     |
| ------------------- | -------- | -------- |
| `grid-col-auto-150` | 150px    | 小卡片   |
| `grid-col-auto-200` | 200px    | 中等卡片 |
| `grid-col-auto-250` | 250px    | 默认卡片 |
| `grid-col-auto-300` | 300px    | 大卡片   |

#### 响应式 Grid 列

| 断点 | 类前缀            | 最小宽度 |
| ---- | ----------------- | -------- |
| 默认 | `grid-col-{n}`    | 0        |
| sm   | `grid-col-sm-{n}` | 576px    |
| md   | `grid-col-md-{n}` | 768px    |
| lg   | `grid-col-lg-{n}` | 992px    |
| xl   | `grid-col-xl-{n}` | 1200px   |

```html
<!-- 移动端：1 列，平板：2 列，桌面：3 列 -->
<div class="grid-container grid-col-1 grid-col-sm-2 grid-col-lg-3">
  <div>项目 1</div>
  <div>项目 2</div>
  <div>项目 3</div>
  <div>项目 4</div>
  <div>项目 5</div>
  <div>项目 6</div>
</div>
```

#### 自定义间距

```html
<div class="grid-container grid-col-3" style="--grid-container-gap: 2rem;">
  <div>项目 1</div>
  <div>项目 2</div>
  <div>项目 3</div>
</div>
```

---

### 宽高比

```html
<div class="aspect-square">1:1</div>
<div class="aspect-video">16:9</div>
<div class="aspect-auto">自动</div>
```

| 类名            | 比例 | 描述       |
| --------------- | ---- | ---------- |
| `aspect-square` | 1:1  | 正方形     |
| `aspect-video`  | 16:9 | 视频/宽屏  |
| `aspect-auto`   | auto | 自然宽高比 |

---

### 宽度工具

```html
<div class="w-full">100% 宽度</div>
<div class="w-half">50% 宽度</div>
<div class="w-screen">100vw 宽度</div>
```

| 类名       | 宽度  | 描述       |
| ---------- | ----- | ---------- |
| `w-full`   | 100%  | 父容器全宽 |
| `w-half`   | 50%   | 父容器半宽 |
| `w-screen` | 100vw | 视口全宽   |

---

### iOS 安全区

适用于以独立模式运行的 iOS 应用：

```html
<div class="ios-safe-x">水平安全区</div>
<div class="ios-safe-y">垂直安全区</div>
<div class="ios-safe-left">左侧安全区</div>
<div class="ios-safe-right">右侧安全区</div>
<div class="ios-safe-top">顶部安全区</div>
<div class="ios-safe-bottom">底部安全区</div>
```

| 类名              | 描述          |
| ----------------- | ------------- |
| `ios-safe-x`      | 左 + 右内边距 |
| `ios-safe-y`      | 上 + 下内边距 |
| `ios-safe-left`   | 仅左侧内边距  |
| `ios-safe-right`  | 仅右侧内边距  |
| `ios-safe-top`    | 仅顶部内边距  |
| `ios-safe-bottom` | 仅底部内边距  |

---

### 背景网格

用于落地页的装饰性网格背景：

```html
<div class="j-background-grid"></div>
```

| 类名                | 描述                       |
| ------------------- | -------------------------- |
| `j-background-grid` | 全屏装饰性网格，带渐变遮罩 |

---

### 布局示例

#### 页面布局

```html
<body>
  <header>
    <div class="container">导航栏</div>
  </header>

  <main class="container" style="padding: 2rem 1rem;">
    <div class="flex-container">
      <aside class="flex-col-12 flex-col-md-3">侧边栏</aside>
      <section class="flex-col-12 flex-col-md-9">内容</section>
    </div>
  </main>

  <footer class="container">页脚</footer>
</body>
```

#### 卡片网格

```html
<div class="grid-container grid-col-auto-250">
  <div class="card">卡片 1</div>
  <div class="card">卡片 2</div>
  <div class="card">卡片 3</div>
  <div class="card">卡片 4</div>
  <div class="card">卡片 5</div>
</div>
```

#### 表单布局

```html
<form class="flex-container" style="--flex-container-gap: 1rem;">
  <div class="flex-col-12 flex-col-sm-6">
    <label>名字</label>
    <input type="text" />
  </div>
  <div class="flex-col-12 flex-col-sm-6">
    <label>姓氏</label>
    <input type="text" />
  </div>
  <div class="flex-col-12">
    <label>邮箱</label>
    <input type="email" />
  </div>
</form>
```

#### 仪表盘布局

```html
<div class="container" style="padding: 2rem 1rem;">
  <!-- 统计行 -->
  <div class="flex-container" style="margin-bottom: 2rem;">
    <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">统计 1</div>
    <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">统计 2</div>
    <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">统计 3</div>
    <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">统计 4</div>
  </div>

  <!-- 主内容 -->
  <div class="flex-container">
    <div class="flex-col-12 flex-col-lg-8">图表</div>
    <div class="flex-col-12 flex-col-lg-4">活动</div>
  </div>
</div>
```

---

## 3. 主题变体

### 色彩主题 (15种)

| 类名             | 描述              |
| ---------------- | ----------------- |
| `j-theme-gray`   | 灰色主题          |
| `j-theme-olive`  | 橄榄色主题        |
| `j-theme-tomato` | 番茄色主题        |
| `j-theme-ruby`   | 红宝石色主题      |
| `j-theme-pink`   | 粉色主题          |
| `j-theme-violet` | 紫罗兰色主题      |
| `j-theme-indigo` | 靛蓝色主题 (默认) |
| `j-theme-blue`   | 蓝色主题          |
| `j-theme-teal`   | 青色主题          |
| `j-theme-grass`  | 草绿色主题        |
| `j-theme-mint`   | 薄荷色主题        |
| `j-theme-lime`   | 酸橙色主题        |
| `j-theme-yellow` | 黄色主题          |
| `j-theme-orange` | 橙色主题          |
| `j-theme-gold`   | 金色主题          |

### 圆角主题 (6种)

| 类名             | 描述            |
| ---------------- | --------------- |
| `j-radius-none`  | 无圆角          |
| `j-radius-sm`    | 小圆角          |
| `j-radius-md`    | 中等圆角 (默认) |
| `j-radius-lg`    | 大圆角          |
| `j-radius-xl`    | 超大圆角        |
| `j-radius-round` | 全圆/药丸形     |

### 阴影主题 (4种)

| 类名            | 描述            |
| --------------- | --------------- |
| `j-shadow-none` | 无阴影          |
| `j-shadow-sm`   | 小阴影          |
| `j-shadow-md`   | 中等阴影 (默认) |
| `j-shadow-lg`   | 大阴影          |

### 字号主题 (2种)

| 类名        | 描述            |
| ----------- | --------------- |
| `j-font-sm` | 小字号          |
| `j-font-md` | 中等字号 (默认) |

### 暗色模式

| 类名         | 描述            |
| ------------ | --------------- |
| `dark`       | 暗色模式        |
| `dark-theme` | 暗色模式 (别名) |

### 使用方式

```html
<html class="j-theme-indigo j-font-sm j-radius-md dark"></html>
```

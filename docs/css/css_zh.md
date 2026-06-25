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
| `--speed`    | `0.25s` | 默认过渡 |
| `--speed-md` | `0.25s` | 中等过渡 |
| `--speed-lg` | `0.5s`  | 慢速过渡 |
| `--speed-xl` | `0.75s` | 超慢过渡 |

#### 字号比例

| 令牌         | 值         | 描述         |
| ------------ | ---------- | ------------ |
| `--text-xs`  | `0.75rem`  | 超小 (12px)  |
| `--text-sm`  | `0.875rem` | 小 (14px)    |
| `--text`     | `1rem`     | 基础 (16px)  |
| `--text-md`  | `1rem`     | 中等 (16px)  |
| `--text-lg`  | `1.125rem` | 大 (18px)    |
| `--text-xl`  | `1.25rem`  | 超大 (20px)  |
| `--text-2xl` | `1.5rem`   | 2倍大 (24px) |
| `--text-3xl` | `1.875rem` | 3倍大 (30px) |
| `--text-4xl` | `2.25rem`  | 4倍大 (36px) |
| `--text-5xl` | `3rem`     | 5倍大 (48px) |

#### 组件字号

| 令牌              | 值         | 描述  |
| ----------------- | ---------- | ----- |
| `--font-size-xs`  | `0.75rem`  | 超小  |
| `--font-size-sm`  | `0.875rem` | 小    |
| `--font-size`     | `1rem`     | 基础  |
| `--font-size-md`  | `1rem`     | 中等  |
| `--font-size-lg`  | `1.125rem` | 大    |
| `--font-size-xl`  | `1.25rem`  | 超大  |
| `--font-size-2xl` | `1.5rem`   | 2倍大 |

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

| 令牌              | 默认      | j-font-sm  | j-font-md  | 描述          |
| ----------------- | --------- | ---------- | ---------- | ------------- |
| `--el-height-3xs` | `1rem`    | `0.875rem` | `1.125rem` | 超超小 (16px) |
| `--el-height-2xs` | `1.25rem` | `1.125rem` | `1.375rem` | 超小 (20px)   |
| `--el-height-xs`  | `1.5rem`  | `1.375rem` | `1.625rem` | 小 (24px)     |
| `--el-height-sm`  | `1.75rem` | `1.625rem` | `1.875rem` | 中小 (28px)   |
| `--el-height`     | `2rem`    | `1.875rem` | `2.125rem` | 默认 (32px)   |
| `--el-height-md`  | `2rem`    | `1.875rem` | `2.125rem` | 中等 (32px)   |
| `--el-height-lg`  | `2.25rem` | `2.125rem` | `2.375rem` | 大 (36px)     |

#### 圆角

| 令牌            | 值         | 描述         |
| --------------- | ---------- | ------------ |
| `--radius-xs`   | `0.125rem` | 超小 (2px)   |
| `--radius-sm`   | `0.25rem`  | 小 (4px)     |
| `--radius`      | `0.375rem` | 基础 (6px)   |
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
| `--columns`     | `28rem` |
| `--columns-md`  | `32rem` |
| `--columns-lg`  | `36rem` |
| `--columns-xl`  | `42rem` |
| `--columns-2xl` | `48rem` |
| `--columns-3xl` | `56rem` |
| `--columns-4xl` | `64rem` |

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

- 所有元素 box-sizing: border-box
- 字体族：系统字体栈
- 颜色方案：支持亮色/暗色
- 平滑滚动

### 容器

```html
<div class="container">...</div>
```

| 类名             | 描述               |
| ---------------- | ------------------ |
| `container`      | 居中容器，最大宽度 |
| `auto-container` | 自动宽度可滚动容器 |
| `block-center`   | 块级居中           |

### Flex 布局

```html
<div class="flex-container">
  <div class="flex-col-6">半宽</div>
  <div class="flex-col-6">半宽</div>
</div>
```

| 类名              | 描述               |
| ----------------- | ------------------ |
| `flex-container`  | Flex 行容器        |
| `flex-cols`       | 弹性列             |
| `flex-col-auto`   | 自动宽度列         |
| `flex-col-{n}`    | 固定列 (1-12)      |
| `flex-col-sm-{n}` | 响应式列 (sm 断点) |
| `flex-col-md-{n}` | 响应式列 (md 断点) |
| `flex-col-lg-{n}` | 响应式列 (lg 断点) |
| `flex-col-xl-{n}` | 响应式列 (xl 断点) |

### Grid 布局

```html
<div class="grid-container grid-col-3">
  <div>项目 1</div>
  <div>项目 2</div>
  <div>项目 3</div>
</div>
```

| 类名                 | 描述               |
| -------------------- | ------------------ |
| `grid-container`     | Grid 容器          |
| `grid-col-{n}`       | 固定列数 (1-12)    |
| `grid-col-auto-{px}` | 自动填充，最小宽度 |
| `grid-col-sm-{n}`    | 响应式列 (sm)      |
| `grid-col-md-{n}`    | 响应式列 (md)      |
| `grid-col-lg-{n}`    | 响应式列 (lg)      |
| `grid-col-xl-{n}`    | 响应式列 (xl)      |

### 工具类

| 类名            | 描述               |
| --------------- | ------------------ |
| `w-full`        | 宽度 100%          |
| `w-half`        | 宽度 50%           |
| `w-screen`      | 宽度 100vw         |
| `aspect-square` | 宽高比 1:1         |
| `aspect-video`  | 宽高比 16:9        |
| `ios-safe-*`    | iOS 安全区域内边距 |

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

---

## 4. 组件样式

### 按钮 (`button.css`)

```html
<button class="j-button">默认</button>
<button class="j-button is-primary">主色</button>
<button class="j-button is-secondary">次要</button>
<button class="j-button is-danger">危险</button>
<button class="j-button is-sm">小号</button>
<button class="j-button is-lg">大号</button>
<button class="j-button is-text">文本</button>
<button class="j-button is-outline">轮廓</button>
```

### 徽章 (`badge.css`)

```html
<span class="j-badge">默认</span>
<span class="j-badge is-primary">主色</span>
<span class="j-badge is-success">成功</span>
<span class="j-badge is-sm">小号</span>
```

### 标签 (`tag.css`)

```html
<span class="j-tag">默认</span> <span class="j-tag is-primary">主色</span>
```

### 卡片 (`card.css`)

```html
<div class="j-card">
  <div class="card-header">头部</div>
  <div class="card-content">内容</div>
  <div class="card-footer">底部</div>
</div>
```

### 表单 (`form.css`)

```html
<input class="j-input" type="text" />
<textarea class="j-textarea"></textarea>
<select class="j-select">
  <option>选项</option>
</select>

<div class="j-checkbox">
  <label><input type="checkbox" /> 标签</label>
</div>

<div class="j-radio">
  <label><input type="radio" name="group" /> 选项 1</label>
  <label><input type="radio" name="group" /> 选项 2</label>
</div>

<div class="j-switch">
  <label class="switch-slider"></label>
</div>
```

### 模态框 (`modal.css`)

```html
<div class="j-modal">
  <div class="modal-header">标题</div>
  <div class="modal-body">内容</div>
  <div class="modal-footer">操作</div>
</div>
```

### 提示框 (`toast.css`)

```html
<div class="j-toast is-success">成功消息</div>
<div class="j-toast is-error">错误消息</div>
<div class="j-toast is-warning">警告消息</div>
<div class="j-toast is-info">信息消息</div>
```

### 标签页 (`tabs.css`)

```html
<div class="j-tabs">
  <div class="tab-item is-active">标签 1</div>
  <div class="tab-item">标签 2</div>
</div>
```

### 菜单 (`menu.css`)

```html
<div class="j-menu">
  <div class="menu-item">项目 1</div>
  <div class="menu-item">项目 2</div>
</div>
```

### 手风琴 (`accordion.css`)

```html
<div class="j-accordion">
  <div class="accordion-header">
    <span class="header-title">标题</span>
    <span class="header-arrow"></span>
  </div>
  <div class="accordion-content">内容</div>
</div>
```

### 面包屑 (`breadcrumb.css`)

```html
<nav class="j-breadcrumb">
  <ol>
    <li><a href="#">首页</a></li>
    <li><a href="#">分类</a></li>
    <li class="is-active"><a>当前页</a></li>
  </ol>
</nav>
```

### 表格 (`table.css`)

```html
<table class="j-table">
  <thead>
    <tr>
      <th>表头</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>单元格</td>
    </tr>
  </tbody>
</table>
```

### 内容 (`content.css`)

```html
<div class="j-content">
  <h1>标题</h1>
  <p>段落</p>
  <ul>
    <li>列表项</li>
  </ul>
  <blockquote>引用</blockquote>
  <pre><code>代码</code></pre>
</div>
```

尺寸变体：`is-sm`、`is-md` (默认)、`is-lg`、`is-xl`

---

## 5. 使用示例

### 主题切换

```js
// 应用主题
html.classList.add(
  `j-theme-${theme}`,
  `j-radius-${radius}`,
  `j-shadow-${shadow}`,
  `j-font-${font}`
);

// 获取主题色
const color = getComputedStyle(document.documentElement)
  .getPropertyValue(`--ui-${theme}`)
  .trim();
```

### 使用令牌的按钮

```css
.btn {
  background: var(--tone-solid);
  color: var(--tone-fg);
  border-radius: var(--radius);
  height: var(--el-height);
  font-size: var(--font-size);
}
.btn:hover {
  background: var(--tone-solid-hover);
}
```

### 带状态的表单输入

```css
.input {
  background: var(--ui-bg);
  border: 1px solid var(--ui-input-border);
  color: var(--ui-input-color);
  height: var(--el-height);
  border-radius: var(--radius);
}
.input:focus {
  border-color: var(--ui-input-focus-border);
  box-shadow: 0 0 0 2px var(--ui-input-focus-ring);
}
.input:disabled {
  background: var(--ui-disabled-bg);
  color: var(--ui-disabled-fg);
}
```

### 响应式 Grid

```html
<div class="grid-container grid-col-1 grid-col-md-2 grid-col-lg-3">
  <div class="j-card">卡片 1</div>
  <div class="j-card">卡片 2</div>
  <div class="j-card">卡片 3</div>
</div>
```

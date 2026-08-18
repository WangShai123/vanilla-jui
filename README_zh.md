# JUI 库

Vanilla-JUI 是一个将响应式 UI、设计令牌 和 CSS 工程解耦的 Web UI 基础设施。无需框架锁定，帮助快速构建高质量的交互网页。

[English](README.md)

## 特点

- **框架无关**：不依赖于任何前端框架，直接在任意网页中挂载。
- **细粒度响应式**：基于信号的细粒度响应式系统，通过数据驱动组件状态更新。定义状态、派生计算、渲染视图。
- **可组合组件**：组件之间可以自由组合，通过状态引用传递数据，构建复杂交互。
- **统一 API**：组件 API 简约一致，无需记忆，操作 state 数据即更新视图交互。
- **100% 自定义样式**：支持丢弃内置样式，利用 className 机制，消费 tailwind 等 CSS 工具，实现完全自定义样式。
- **多维主题**：基于设计令牌和根节点状态的多维主题 CSS 架构，轻松实现千人千面的主题模式。
- **常用工具**：附带 ID、Events、Timer 等常用工具和 DOM 语法糖。

## 安装与使用

### NPM

```bash
npm install vanilla-jui
```

```js
import { createModal } from 'vanilla-jui';
```

### CDN

UMD 全局变量 `jui`

```html
<script src="https://unpkg.com/vanilla-jui/dist/index.umd.js"></script>
<script>
  const { createModal } = jui;
</script>
```

```html
<script type="module">
  import { createModal } from 'https://unpkg.com/vanilla-jui/dist/index.js';
</script>
```

## 文档与预览

[文档与预览](https://app.jealer.com/vanilla-jui/)

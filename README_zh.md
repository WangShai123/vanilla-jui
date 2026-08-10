# JUI 库

一个基于原生 JavaScript 的轻量级、响应式、可完全自定义样式的用户 UI 库。

[English](README.md)

## 特点

- 轻量级
- 响应式数据管理
- 自定义UI：支持使用 `tailwindcss` 或自定义层叠样式表来完全自定义组件UI，不使用默认的 `style.css`。

## 安装

NPM

```bash
npm install vanilla-jui
```

UMD, 全局变量名: `jui`

```html
<script src="https://unpkg.com/vanilla-jui/dist/index.umd.js"></script>
```

## 使用

ESM

```javascript
import { createToast, createModal } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

UMD, 全局变量名: `jui`

```javascript
const { createToast, createModal } = jui;
```

## 文档

[在线文档](https://app.jealer.com/vanilla-jui/)

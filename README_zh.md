# JUI 库

一个基于原生 JavaScript 的轻量级用户 UI 插件库。

## 特点

- 轻量级
- 响应式数据管理
- 自定义UI：支持使用 `tailwindcss` 或手写样式来完全自定义组件样式，不使用默认的 `style.css`。

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
import { Toast, Modal } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

UMD, 全局变量名: `jui`

```javascript
const { Toast, Modal } = jui;
```

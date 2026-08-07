# JUI Library

A lightweight, reactive, and fully customizable vanilla JS UI library.

[中文](README_zh.md)

## Features

- Lightweight
- Reactive data management
- Customizable UI: Supports `tailwindcss` or hand-written styles to fully customize component styles, without using the default `style.css`.

## Installation

NPM

```bash
npm install vanilla-jui
```

UMD, GlobalName: `jui`

```html
<script src="https://unpkg.com/vanilla-jui/dist/index.umd.js"></script>
```

## Usage

ESM

```javascript
import { createToast, createModal } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

UMD, GlobalName: `jui`

```javascript
const { createToast, createModal } = jui;
```

## Documentation

[Online Documentation](https://docs.jealer.com/vanilla-jui/)

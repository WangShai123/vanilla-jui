# JUI Library

A lightweight vanilla UI library for building user interfaces.

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
import { Toast, Modal } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

UMD, GlobalName: `jui`

```javascript
const { Toast, Modal } = jui;
```

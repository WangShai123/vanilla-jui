# JUI Library

Vanilla-JUI is web UI infrastructure that decouples reactive UI, design tokens, and CSS engineering. It avoids framework lock-in and helps you quickly build high-quality interactive web pages.

[中文](README_zh.md)

## Features

- Framework-agnostic: Does not depend on any frontend framework and can be mounted directly in any web page.
- Fine-grained reactivity: A signal-based fine-grained reactive system drives component state updates through data. Define state, derive computations, and render views.
- Composable components: Components can be freely composed, with data passed through state references to build complex interactions.
- 100% custom styling: Supports discarding the built-in styles and using the className mechanism with CSS tools such as Tailwind to fully customize styles.
- Multi-dimensional themes: A multi-dimensional theme CSS architecture based on design tokens and root-node state makes personalized theme modes easy to implement.
- Common utilities: Includes common utilities such as ID, Events, Timer, and DOM syntax sugar.

## Installation And Usage

### NPM

```bash
npm install vanilla-jui
```

```js
import { createModal } from 'vanilla-jui';
```

### CDN

UMD global variable: `jui`

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

## Documentation And Preview

[Documentation And Preview](https://app.jealer.com/vanilla-jui/)

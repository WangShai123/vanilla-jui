# vanilla-jui CSS Documentation

## Overview

vanilla-jui uses a unified CSS system with design tokens and component styles.

### File Structure

```
src/css/
├── tokens.css        # Design tokens (layout, colors, themes)
├── layout.css        # Layout system (flex, grid, container)
├── content.css       # Article/reading mode styles
├── font.css          # Font styles
├── icon.css          # Icon styles
├── animation.css     # Animation styles
├── status.css        # Status indicator styles
├── components.css    # Base component styles
├── form.css          # Form element styles
├── button.css        # Button styles
├── badge.css         # Badge styles
├── tag.css           # Tag styles
├── card.css          # Card styles
├── modal.css         # Modal styles
├── toast.css         # Toast notification styles
├── tabs.css          # Tab styles
├── menu.css          # Menu styles
├── accordion.css     # Accordion styles
├── breadcrumb.css    # Breadcrumb styles
├── table.css         # Table styles
├── pagination.css    # Pagination styles
├── drop.css          # Dropdown styles
├── tooltip.css       # Tooltip styles
├── popup.css         # Popup styles
├── offcanvas.css     # Offcanvas styles
├── flow.css          # Flow/stepper styles
├── swiper.css        # Swiper/carousel styles
├── skeleton.css      # Skeleton loading styles
├── loading.css       # Loading spinner styles
├── divider.css       # Divider styles
├── avatar.css        # Avatar styles
├── tip.css           # Tip/alert styles
├── toolbar.css       # Toolbar styles
└── theme-palette.css # Theme palette panel styles
```

---

## 1. Design Tokens (`tokens.css`)

### Layout Tokens

#### Spacing

| Token | Value | Description |
|-------|-------|-------------|
| `--space` | `0.25rem` | Base spacing unit (4px) |

#### Transitions

| Token | Value | Description |
|-------|-------|-------------|
| `--speed-sm` | `0.15s` | Fast transition |
| `--speed` | `0.25s` | Default transition |
| `--speed-md` | `0.25s` | Medium transition |
| `--speed-lg` | `0.5s` | Slow transition |
| `--speed-xl` | `0.75s` | Extra slow transition |

#### Typography Scale

| Token | Value | Description |
|-------|-------|-------------|
| `--text-xs` | `0.75rem` | Extra small (12px) |
| `--text-sm` | `0.875rem` | Small (14px) |
| `--text` | `1rem` | Base (16px) |
| `--text-md` | `1rem` | Medium (16px) |
| `--text-lg` | `1.125rem` | Large (18px) |
| `--text-xl` | `1.25rem` | Extra large (20px) |
| `--text-2xl` | `1.5rem` | 2x large (24px) |
| `--text-3xl` | `1.875rem` | 3x large (30px) |
| `--text-4xl` | `2.25rem` | 4x large (36px) |
| `--text-5xl` | `3rem` | 5x large (48px) |

#### Component Font Sizes

| Token | Value | Description |
|-------|-------|-------------|
| `--font-size-xs` | `0.75rem` | Extra small |
| `--font-size-sm` | `0.875rem` | Small |
| `--font-size` | `1rem` | Base |
| `--font-size-md` | `1rem` | Medium |
| `--font-size-lg` | `1.125rem` | Large |
| `--font-size-xl` | `1.25rem` | Extra large |
| `--font-size-2xl` | `1.5rem` | 2x large |

#### Font Weight

| Token | Value |
|-------|-------|
| `--font-thin` | 100 |
| `--font-extraLight` | 200 |
| `--font-light` | 300 |
| `--font-normal` | 400 |
| `--font-medium` | 500 |
| `--font-semiBold` | 600 |
| `--font-bold` | 700 |
| `--font-extraBold` | 800 |
| `--font-black` | 900 |

#### Line Height

| Token | Value | Description |
|-------|-------|-------------|
| `--line-height` | `1.5` | Default line height |
| `--line-height-paragraph` | `1.5` | Paragraph line height |
| `--line-height-pre` | `1.4` | Code block line height |
| `--line-height-heading` | `1.25` | Heading line height |
| `--line-height-self` | `1` | Single line height |

#### Element Heights

| Token | Default | j-font-sm | j-font-md | Description |
|-------|---------|-----------|-----------|-------------|
| `--el-height-3xs` | `1rem` | `0.875rem` | `1.125rem` | Extra extra small (16px) |
| `--el-height-2xs` | `1.25rem` | `1.125rem` | `1.375rem` | Extra small (20px) |
| `--el-height-xs` | `1.5rem` | `1.375rem` | `1.625rem` | Small (24px) |
| `--el-height-sm` | `1.75rem` | `1.625rem` | `1.875rem` | Medium small (28px) |
| `--el-height` | `2rem` | `1.875rem` | `2.125rem` | Default (32px) |
| `--el-height-md` | `2rem` | `1.875rem` | `2.125rem` | Medium (32px) |
| `--el-height-lg` | `2.25rem` | `2.125rem` | `2.375rem` | Large (36px) |

#### Border Radius

| Token | Value | Description |
|-------|-------|-------------|
| `--radius-xs` | `0.125rem` | Extra small (2px) |
| `--radius-sm` | `0.25rem` | Small (4px) |
| `--radius` | `0.375rem` | Base (6px) |
| `--radius-md` | `0.5rem` | Medium (8px) |
| `--radius-lg` | `0.75rem` | Large (12px) |
| `--radius-xl` | `1rem` | Extra large (16px) |
| `--radius-2xl` | `1.5rem` | 2x large (24px) |
| `--radius-full` | `9999px` | Full circle |

#### Shadows

| Token | Description |
|-------|-------------|
| `--shadow-xs` | Minimal shadow |
| `--shadow-sm` | Small shadow |
| `--shadow` | Base shadow |
| `--shadow-md` | Medium shadow |
| `--shadow-lg` | Large shadow |
| `--shadow-xl` | Extra large shadow |

#### Breakpoints

| Token | Value |
|-------|-------|
| `--screen-sm` | `576px` |
| `--screen-md` | `768px` |
| `--screen-lg` | `992px` |
| `--screen-xl` | `1200px` |

#### Container Widths

| Token | Value |
|-------|-------|
| `--columns-xs` | `20rem` |
| `--columns-sm` | `24rem` |
| `--columns` | `28rem` |
| `--columns-md` | `32rem` |
| `--columns-lg` | `36rem` |
| `--columns-xl` | `42rem` |
| `--columns-2xl` | `48rem` |
| `--columns-3xl` | `56rem` |
| `--columns-4xl` | `64rem` |

#### Z-Index

| Token | Value | Description |
|-------|-------|-------------|
| `--z-index-0` | 0 | Base layer |
| `--z-index-1` | 1 | Above base |
| `--z-index-badge` | 2 | Badge |
| `--z-index-submenu` | 5 | Submenu |
| `--z-index-drop` | 9900 | Dropdown |
| `--z-index-overlay` | 9950 | Overlay |
| `--z-index-offcanvas` | 9960 | Offcanvas |
| `--z-index-popup` | 9970 | Popup |
| `--z-index-toast` | 9980 | Toast |

### Color Tokens

#### UI Structure (`ui-*`)

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--ui-bg` | `#ffffff` | `#030712` | Main background |
| `--ui-bg-subtle` | `#f9fafb` | `#111827` | Subtle background |
| `--ui-bg-muted` | `#f3f4f6` | `#1f2937` | Muted background |
| `--ui-surface` | `#ffffff` | `#030712` | Surface |
| `--ui-surface-subtle` | `#f9fafb` | `#111827` | Subtle surface |
| `--ui-surface-muted` | `#f3f4f6` | `#1f2937` | Muted surface |
| `--ui-surface-hover` | `rgba(0,0,0,0.02)` | `rgba(255,255,255,0.05)` | Hover state |
| `--ui-surface-active` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.08)` | Active state |
| `--ui-fg` | `#111827` | `#f9fafb` | Primary text |
| `--ui-fg-muted` | `#6b7280` | `#9ca3af` | Secondary text |
| `--ui-fg-soft` | `#9ca3af` | `#6b7280` | Tertiary text |
| `--ui-fg-subtle` | `#d1d5db` | `#4b5563` | Subtle text |
| `--ui-border-subtle` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)` | Light border |
| `--ui-border` | `rgba(0,0,0,0.1)` | `rgba(255,255,255,0.12)` | Default border |
| `--ui-border-strong` | `rgba(0,0,0,0.2)` | `rgba(255,255,255,0.2)` | Strong border |
| `--ui-disabled-bg` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.05)` | Disabled background |
| `--ui-disabled-fg` | `#9ca3af` | `#6b7280` | Disabled text |

#### Fixed Theme Colors (`ui-{theme}`)

15 fixed theme colors for Theme component preview.

| Token | Light | Dark |
|-------|-------|------|
| `--ui-gray` | `#374151` | `#e5e7eb` |
| `--ui-olive` | `#717762` | `#d4d9cc` |
| `--ui-tomato` | `#ef4444` | `#fca5a5` |
| `--ui-ruby` | `#f43f5e` | `#fda4af` |
| `--ui-pink` | `#ec4899` | `#f9a8d4` |
| `--ui-violet` | `#8b5cf6` | `#c4b5fd` |
| `--ui-indigo` | `#6366f1` | `#a5b4fc` |
| `--ui-blue` | `#3b82f6` | `#93c5fd` |
| `--ui-teal` | `#14b8a6` | `#5eead4` |
| `--ui-grass` | `#22c55e` | `#86efac` |
| `--ui-mint` | `#06b6d4` | `#67e8f9` |
| `--ui-lime` | `#84cc16` | `#bef264` |
| `--ui-yellow` | `#eab308` | `#fde047` |
| `--ui-orange` | `#f97316` | `#fdba74` |
| `--ui-gold` | `#b45309` | `#fbbf24` |

#### Theme Color (`tone-*`)

| Token | Description |
|-------|-------------|
| `--tone-subtle` | Very light tint |
| `--tone-soft` | Light tint |
| `--tone-muted` | Medium tint |
| `--tone-wash` | Very subtle wash |
| `--tone-border` | Default border |
| `--tone-border-strong` | Strong border |
| `--tone-solid` | Primary color |
| `--tone-solid-hover` | Hover state |
| `--tone-solid-active` | Active state |
| `--tone-text` | Brand text |
| `--tone-fg` | Foreground on solid |
| `--tone-ring` | Focus ring |
| `--tone-heading` | Heading text |
| `--tone-subtitle` | Subtitle text |
| `--tone-body` | Body text |
| `--tone-caption` | Caption text |
| `--tone-muted` | Muted text |
| `--tone-link` | Link color |
| `--tone-link-hover` | Link hover |
| `--tone-link-visited` | Link visited |
| `--tone-code-bg` | Code background |
| `--tone-code-fg` | Code text |

#### Semantic States (`state-*`)

Each state (danger, success, warning, info) has:

| Token | Description |
|-------|-------------|
| `--state-{name}` | Primary color |
| `--state-{name}-hover` | Hover state |
| `--state-{name}-active` | Active state |
| `--state-{name}-fg` | Foreground on solid |
| `--state-{name}-text` | Text color |
| `--state-{name}-subtle` | Subtle background |
| `--state-{name}-soft` | Soft background |
| `--state-{name}-muted` | Muted background |
| `--state-{name}-border` | Border color |
| `--state-{name}-ring` | Focus ring |

---

## 2. Layout System (`layout.css`)

### Base Reset

- Box-sizing: border-box for all elements
- Font family: system-ui stack
- Color scheme: light/dark support
- Smooth scrolling

### Container

```html
<div class="container">...</div>
```

| Class | Description |
|-------|-------------|
| `container` | Centered container with max-width |
| `auto-container` | Auto-width scrollable container |
| `block-center` | Block-level centering |

### Flex Layout

```html
<div class="flex-container">
  <div class="flex-col-6">Half width</div>
  <div class="flex-col-6">Half width</div>
</div>
```

| Class | Description |
|-------|-------------|
| `flex-container` | Flex row container |
| `flex-cols` | Flexible column |
| `flex-col-auto` | Auto-width column |
| `flex-col-{n}` | Fixed column (1-12) |
| `flex-col-sm-{n}` | Responsive column (sm breakpoint) |
| `flex-col-md-{n}` | Responsive column (md breakpoint) |
| `flex-col-lg-{n}` | Responsive column (lg breakpoint) |
| `flex-col-xl-{n}` | Responsive column (xl breakpoint) |

### Grid Layout

```html
<div class="grid-container grid-col-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

| Class | Description |
|-------|-------------|
| `grid-container` | Grid container |
| `grid-col-{n}` | Fixed columns (1-12) |
| `grid-col-auto-{px}` | Auto-fill with min-width |
| `grid-col-sm-{n}` | Responsive columns (sm) |
| `grid-col-md-{n}` | Responsive columns (md) |
| `grid-col-lg-{n}` | Responsive columns (lg) |
| `grid-col-xl-{n}` | Responsive columns (xl) |

### Utility Classes

| Class | Description |
|-------|-------------|
| `w-full` | Width 100% |
| `w-half` | Width 50% |
| `w-screen` | Width 100vw |
| `aspect-square` | Aspect ratio 1:1 |
| `aspect-video` | Aspect ratio 16:9 |
| `ios-safe-*` | iOS safe area padding |

---

## 3. Theme Variants

### Color Themes (15)

| Class | Description |
|-------|-------------|
| `j-theme-gray` | Gray theme |
| `j-theme-olive` | Olive theme |
| `j-theme-tomato` | Tomato theme |
| `j-theme-ruby` | Ruby theme |
| `j-theme-pink` | Pink theme |
| `j-theme-violet` | Violet theme |
| `j-theme-indigo` | Indigo theme (default) |
| `j-theme-blue` | Blue theme |
| `j-theme-teal` | Teal theme |
| `j-theme-grass` | Grass theme |
| `j-theme-mint` | Mint theme |
| `j-theme-lime` | Lime theme |
| `j-theme-yellow` | Yellow theme |
| `j-theme-orange` | Orange theme |
| `j-theme-gold` | Gold theme |

### Radius Themes (6)

| Class | Description |
|-------|-------------|
| `j-radius-none` | No radius |
| `j-radius-sm` | Small radius |
| `j-radius-md` | Medium radius (default) |
| `j-radius-lg` | Large radius |
| `j-radius-xl` | Extra large radius |
| `j-radius-round` | Full circle/pill |

### Shadow Themes (4)

| Class | Description |
|-------|-------------|
| `j-shadow-none` | No shadow |
| `j-shadow-sm` | Small shadow |
| `j-shadow-md` | Medium shadow (default) |
| `j-shadow-lg` | Large shadow |

### Font Themes (2)

| Class | Description |
|-------|-------------|
| `j-font-sm` | Small font size |
| `j-font-md` | Medium font size (default) |

### Dark Mode

| Class | Description |
|-------|-------------|
| `dark` | Dark mode |
| `dark-theme` | Dark mode (alias) |

### Usage

```html
<html class="j-theme-indigo j-font-sm j-radius-md dark">
```

---

## 4. Component Styles

### Button (`button.css`)

```html
<button class="j-button">Default</button>
<button class="j-button is-primary">Primary</button>
<button class="j-button is-secondary">Secondary</button>
<button class="j-button is-danger">Danger</button>
<button class="j-button is-sm">Small</button>
<button class="j-button is-lg">Large</button>
<button class="j-button is-text">Text</button>
<button class="j-button is-outline">Outline</button>
```

### Badge (`badge.css`)

```html
<span class="j-badge">Default</span>
<span class="j-badge is-primary">Primary</span>
<span class="j-badge is-success">Success</span>
<span class="j-badge is-sm">Small</span>
```

### Tag (`tag.css`)

```html
<span class="j-tag">Default</span>
<span class="j-tag is-primary">Primary</span>
```

### Card (`card.css`)

```html
<div class="j-card">
  <div class="card-header">Header</div>
  <div class="card-content">Content</div>
  <div class="card-footer">Footer</div>
</div>
```

### Form (`form.css`)

```html
<input class="j-input" type="text" />
<textarea class="j-textarea"></textarea>
<select class="j-select">
  <option>Option</option>
</select>

<div class="j-checkbox">
  <label><input type="checkbox" /> Label</label>
</div>

<div class="j-radio">
  <label><input type="radio" name="group" /> Option 1</label>
  <label><input type="radio" name="group" /> Option 2</label>
</div>

<div class="j-switch">
  <label class="switch-slider"></label>
</div>
```

### Modal (`modal.css`)

```html
<div class="j-modal">
  <div class="modal-header">Title</div>
  <div class="modal-body">Content</div>
  <div class="modal-footer">Actions</div>
</div>
```

### Toast (`toast.css`)

```html
<div class="j-toast is-success">Success message</div>
<div class="j-toast is-error">Error message</div>
<div class="j-toast is-warning">Warning message</div>
<div class="j-toast is-info">Info message</div>
```

### Tabs (`tabs.css`)

```html
<div class="j-tabs">
  <div class="tab-item is-active">Tab 1</div>
  <div class="tab-item">Tab 2</div>
</div>
```

### Menu (`menu.css`)

```html
<div class="j-menu">
  <div class="menu-item">Item 1</div>
  <div class="menu-item">Item 2</div>
</div>
```

### Accordion (`accordion.css`)

```html
<div class="j-accordion">
  <div class="accordion-header">
    <span class="header-title">Title</span>
    <span class="header-arrow"></span>
  </div>
  <div class="accordion-content">Content</div>
</div>
```

### Breadcrumb (`breadcrumb.css`)

```html
<nav class="j-breadcrumb">
  <ol>
    <li><a href="#">Home</a></li>
    <li><a href="#">Section</a></li>
    <li class="is-active"><a>Current</a></li>
  </ol>
</nav>
```

### Table (`table.css`)

```html
<table class="j-table">
  <thead>
    <tr><th>Header</th></tr>
  </thead>
  <tbody>
    <tr><td>Cell</td></tr>
  </tbody>
</table>
```

### Content (`content.css`)

```html
<div class="j-content">
  <h1>Title</h1>
  <p>Paragraph</p>
  <ul><li>List item</li></ul>
  <blockquote>Quote</blockquote>
  <pre><code>Code</code></pre>
</div>
```

Size variants: `is-sm`, `is-md` (default), `is-lg`, `is-xl`

---

## 5. Usage Examples

### Theme Switching

```js
// Apply theme
html.classList.add(`j-theme-${theme}`, `j-radius-${radius}`, `j-shadow-${shadow}`, `j-font-${font}`);

// Get theme color
const color = getComputedStyle(document.documentElement)
  .getPropertyValue(`--ui-${theme}`)
  .trim();
```

### Button with Tokens

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

### Form Input with States

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

### Responsive Grid

```html
<div class="grid-container grid-col-1 grid-col-md-2 grid-col-lg-3">
  <div class="j-card">Card 1</div>
  <div class="j-card">Card 2</div>
  <div class="j-card">Card 3</div>
</div>
```

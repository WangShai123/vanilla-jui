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

| Token | Default | j-font-sm | j-font-md | Description |
|-------|---------|-----------|-----------|-------------|
| `--font-size-xs` | `0.75rem` | `0.6875rem` | `0.75rem` | Extra small |
| `--font-size-sm` | `0.875rem` | `0.75rem` | `0.875rem` | Small |
| `--font-size` | `0.875rem` | `0.875rem` | `1rem` | Base |
| `--font-size-md` | `0.875rem` | `0.875rem` | `1rem` | Medium |
| `--font-size-lg` | `1rem` | `1rem` | `1.125rem` | Large |
| `--font-size-xl` | `1.125rem` | `1.125rem` | `1.25rem` | Extra large |
| `--font-size-2xl` | `1.25rem` | `1.25rem` | `1.5rem` | 2x large |

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
| `--el-height-3xs` | `1.5rem` | `1.5rem` | `1.75rem` | Extra extra small (24px) |
| `--el-height-2xs` | `1.75rem` | `1.75rem` | `2rem` | Extra small (28px) |
| `--el-height-xs` | `2rem` | `2rem` | `2.25rem` | Small (32px) |
| `--el-height-sm` | `2.25rem` | `2.25rem` | `2.5rem` | Medium small (36px) |
| `--el-height` | `2rem` | `2rem` | `2.25rem` | Default (32px) |
| `--el-height-md` | `2.25rem` | `2.25rem` | `2.5rem` | Medium (36px) |
| `--el-height-lg` | `2.5rem` | `2.5rem` | `2.75rem` | Large (40px) |

**Note:** `--el-height` defaults to the sm tier value, while other height variants default to their md tier value.

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

The layout system provides a modern CSS reset:

```css
/* Applied to all elements */
*, ::after, ::backdrop, ::before, ::file-selector-button {
  box-sizing: border-box;
}

/* Applied to html */
html {
  -webkit-text-size-adjust: 100%;
  tab-size: 4;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  scroll-behavior: smooth;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Emoji, Helvetica, Arial, sans-serif;
  color: var(--ui-fg);
  background-color: var(--ui-bg);
}

/* Applied to body */
body {
  min-width: 320px;
  min-height: 100vh;
  font-size: var(--font-size);
  margin: 0;
}
```

### Color Scheme

```html
<!-- Light mode -->
<html class="light">

<!-- Dark mode -->
<html class="dark">
```

### Reset Utility

Use `.is-reset` to reset specific elements:

```html
<a class="is-reset" href="#">Link</a>
<button class="is-reset">Button</button>
<h1 class="is-reset">Heading</h1>
<ul class="is-reset"><li>List</li></ul>
<p class="is-reset">Paragraph</p>
<pre class="is-reset">Code</pre>
```

---

### Container

#### Basic Container

```html
<div class="container">
  Content centered with max-width 1200px
</div>
```

| Class | Description |
|-------|-------------|
| `container` | Centered container, max-width `--screen-xl` (1200px), horizontal padding `1rem` |
| `auto-container` | Full-width scrollable container |
| `block-center` | Block-level centering with auto height |

#### Container Variables

```css
.container {
  --container-padding-inline: 1rem;  /* Horizontal padding */
}
```

---

### Flex Layout

Flex layout is suitable for **one-dimensional** arrangements (navigation, forms, rows).

#### Basic Flex Container

```html
<div class="flex-container">
  <div class="flex-col">Item 1</div>
  <div class="flex-col">Item 2</div>
  <div class="flex-col">Item 3</div>
</div>
```

| Class | Description |
|-------|-------------|
| `flex-container` | Flex row container with `flex-wrap: wrap` and gap |
| `flex-cols` | Flexible column (equal width, `flex: 1 1 0%`) |
| `flex-col-auto` | Auto-width column (content-sized) |

#### Custom Gap

```html
<div class="flex-container" style="--flex-container-gap: 2rem;">
  <div class="flex-col-6">Left</div>
  <div class="flex-col-6">Right</div>
</div>
```

#### Fixed Column Widths (1-12)

The grid is based on 12 columns. Column width = `(100% - (n-1) * gap) / n`.

```html
<!-- Half width -->
<div class="flex-container">
  <div class="flex-col-6">50%</div>
  <div class="flex-col-6">50%</div>
</div>

<!-- Third width -->
<div class="flex-container">
  <div class="flex-col-4">33.3%</div>
  <div class="flex-col-4">33.3%</div>
  <div class="flex-col-4">33.3%</div>
</div>

<!-- Quarter width -->
<div class="flex-container">
  <div class="flex-col-3">25%</div>
  <div class="flex-col-3">25%</div>
  <div class="flex-col-3">25%</div>
  <div class="flex-col-3">25%</div>
</div>

<!-- Mixed widths -->
<div class="flex-container">
  <div class="flex-col-8">66.7%</div>
  <div class="flex-col-4">33.3%</div>
</div>
```

Available classes: `flex-col-1` through `flex-col-12`

#### Responsive Columns

Columns adapt to viewport width using breakpoints:

| Breakpoint | Class Prefix | Min-Width |
|------------|--------------|-----------|
| Default | `flex-col-{n}` | 0 |
| sm | `flex-col-sm-{n}` | 576px |
| md | `flex-col-md-{n}` | 768px |
| lg | `flex-col-lg-{n}` | 992px |
| xl | `flex-col-xl-{n}` | 1200px |

```html
<!-- Mobile: full width, Tablet: half, Desktop: third -->
<div class="flex-container">
  <div class="flex-col-12 flex-col-sm-6 flex-col-md-4">
    Content
  </div>
  <div class="flex-col-12 flex-col-sm-6 flex-col-md-4">
    Content
  </div>
  <div class="flex-col-12 flex-col-sm-6 flex-col-md-4">
    Content
  </div>
</div>
```

#### Responsive Example: Sidebar Layout

```html
<div class="flex-container">
  <!-- Sidebar: full on mobile, 3 cols on desktop -->
  <div class="flex-col-12 flex-col-md-3">
    <nav>Sidebar</nav>
  </div>
  <!-- Main: full on mobile, 9 cols on desktop -->
  <div class="flex-col-12 flex-col-md-9">
    <main>Content</main>
  </div>
</div>
```

#### Responsive Example: Dashboard Cards

```html
<div class="flex-container">
  <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">Card 1</div>
  <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">Card 2</div>
  <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">Card 3</div>
  <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">Card 4</div>
</div>
```

---

### Grid Layout

Grid layout is suitable for **two-dimensional** layouts (card grids, dashboards, galleries).

#### Basic Grid Container

```html
<div class="grid-container grid-col-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

| Class | Description |
|-------|-------------|
| `grid-container` | Grid container with gap and full width |
| `grid-col-{n}` | Fixed columns (1-12) |

#### Fixed Columns (1-12)

```html
<!-- 2 columns -->
<div class="grid-container grid-col-2">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- 4 columns -->
<div class="grid-container grid-col-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</div>
```

Available classes: `grid-col-1` through `grid-col-12`

#### Auto-Fill Grid

Auto-fill creates responsive columns based on minimum width:

```html
<!-- Auto-fill: minimum 200px per column -->
<div class="grid-container grid-col-auto-200">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
  <div>Item 5</div>
</div>
```

| Class | Min-Width | Description |
|-------|-----------|-------------|
| `grid-col-auto-150` | 150px | Small cards |
| `grid-col-auto-200` | 200px | Medium cards |
| `grid-col-auto-250` | 250px | Default cards |
| `grid-col-auto-300` | 300px | Large cards |

#### Responsive Grid Columns

| Breakpoint | Class Prefix | Min-Width |
|------------|--------------|-----------|
| Default | `grid-col-{n}` | 0 |
| sm | `grid-col-sm-{n}` | 576px |
| md | `grid-col-md-{n}` | 768px |
| lg | `grid-col-lg-{n}` | 992px |
| xl | `grid-col-xl-{n}` | 1200px |

```html
<!-- Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols -->
<div class="grid-container grid-col-1 grid-col-sm-2 grid-col-lg-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
  <div>Item 5</div>
  <div>Item 6</div>
</div>
```

#### Custom Gap

```html
<div class="grid-container grid-col-3" style="--grid-container-gap: 2rem;">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

---

### Aspect Ratio

```html
<div class="aspect-square">1:1</div>
<div class="aspect-video">16:9</div>
<div class="aspect-auto">Auto</div>
```

| Class | Ratio | Description |
|-------|-------|-------------|
| `aspect-square` | 1:1 | Square |
| `aspect-video` | 16:9 | Video/Widescreen |
| `aspect-auto` | auto | Natural aspect ratio |

---

### Width Utilities

```html
<div class="w-full">100% width</div>
<div class="w-half">50% width</div>
<div class="w-screen">100vw width</div>
```

| Class | Width | Description |
|-------|-------|-------------|
| `w-full` | 100% | Full parent width |
| `w-half` | 50% | Half parent width |
| `w-screen` | 100vw | Full viewport width |

---

### iOS Safe Area

For apps running in standalone mode on iOS:

```html
<div class="ios-safe-x">Horizontal safe area</div>
<div class="ios-safe-y">Vertical safe area</div>
<div class="ios-safe-left">Left safe area</div>
<div class="ios-safe-right">Right safe area</div>
<div class="ios-safe-top">Top safe area</div>
<div class="ios-safe-bottom">Bottom safe area</div>
```

| Class | Description |
|-------|-------------|
| `ios-safe-x` | Left + Right padding |
| `ios-safe-y` | Top + Bottom padding |
| `ios-safe-left` | Left padding only |
| `ios-safe-right` | Right padding only |
| `ios-safe-top` | Top padding only |
| `ios-safe-bottom` | Bottom padding only |

---

### Background Grid

Decorative grid background for landing pages:

```html
<div class="j-background-grid"></div>
```

| Class | Description |
|-------|-------------|
| `j-background-grid` | Full-screen decorative grid with fade mask |

---

### Layout Examples

#### Page Layout

```html
<body>
  <header>
    <div class="container">
      Navigation
    </div>
  </header>
  
  <main class="container" style="padding: 2rem 1rem;">
    <div class="flex-container">
      <aside class="flex-col-12 flex-col-md-3">
        Sidebar
      </aside>
      <section class="flex-col-12 flex-col-md-9">
        Content
      </section>
    </div>
  </main>
  
  <footer class="container">
    Footer
  </footer>
</body>
```

#### Card Grid

```html
<div class="grid-container grid-col-auto-250">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
  <div class="card">Card 4</div>
  <div class="card">Card 5</div>
</div>
```

#### Form Layout

```html
<form class="flex-container" style="--flex-container-gap: 1rem;">
  <div class="flex-col-12 flex-col-sm-6">
    <label>First Name</label>
    <input type="text" />
  </div>
  <div class="flex-col-12 flex-col-sm-6">
    <label>Last Name</label>
    <input type="text" />
  </div>
  <div class="flex-col-12">
    <label>Email</label>
    <input type="email" />
  </div>
</form>
```

#### Dashboard Layout

```html
<div class="container" style="padding: 2rem 1rem;">
  <!-- Stats row -->
  <div class="flex-container" style="margin-bottom: 2rem;">
    <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">Stat 1</div>
    <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">Stat 2</div>
    <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">Stat 3</div>
    <div class="flex-col-12 flex-col-sm-6 flex-col-lg-3">Stat 4</div>
  </div>
  
  <!-- Main content -->
  <div class="flex-container">
    <div class="flex-col-12 flex-col-lg-8">Chart</div>
    <div class="flex-col-12 flex-col-lg-4">Activity</div>
  </div>
</div>
```

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

# Icons

Icons 是内置 SVG 图标工具，源码位于 `src/components/icons.js`。提供函数式 API 获取图标节点或字符串，支持自定义扩展。

## 导入

```js
import { icon, iconHtml, getRegistedIconPath, addIcons } from 'vanilla-jui';
```

## 基础用法

```js
// 返回 SVGElement，可直接用于 jsx/render
jsx('button', { children: icon('close') });

// 返回 SVG 字符串，用于 innerHTML 拼接
const html = iconHtml('success');
container.innerHTML = html;
```

## 内置图标

| 名称          | 说明           |
| ------------- | -------------- |
| `info`        | 信息           |
| `success`     | 成功（勾）     |
| `warning`     | 警告（感叹号） |
| `error`       | 错误（叉）     |
| `arrow-left`  | 左箭头         |
| `arrow-right` | 右箭头         |
| `arrow-up`    | 上箭头         |
| `arrow-down`  | 下箭头         |
| `close`       | 关闭（叉）     |
| `loader`      | 加载中         |
| `menu`        | 菜单（三横线） |
| `palette`     | 调色板         |

## 方法

### icon

获取内置 SVG 图标节点。返回值是 `SVGElement`，可直接作为 `jsx`/`html`/`render` 的 children。

```
icon(name, props?) → SVGElement
```

| 参数    | 类型     | 默认值 | 说明                                     |
| ------- | -------- | ------ | ---------------------------------------- |
| `name`  | `string` | —      | 图标名称                                 |
| `props` | `object` | `{}`   | SVG 属性，`className` 自动映射为 `class` |

**返回值**: `SVGElement`。

**抛出**: `Error` — 图标不存在或非 DOM 环境时。

```js
icon('close');
icon('success', { className: 'icon-lg', style: 'color: green' });
icon('info', { 'data-action': 'info' }); // 非 standard 属性通过 setAttribute 设置
```

### iconHtml

获取完整 SVG 字符串。仅在必须拼接字符串或写入 `innerHTML` 时使用；响应式渲染优先使用 `icon(name)`。

```
iconHtml(name) → string
```

| 参数   | 类型     | 说明     |
| ------ | -------- | -------- |
| `name` | `string` | 图标名称 |

**返回值**: `string` — 完整 `<svg>...</svg>` 标记。

```js
iconHtml('close');
// → '<svg xmlns="..." viewBox="0 0 24 24" ...>...</svg>'
```

`iconMarkup` 是 `iconHtml` 的别名。

### getRegistedIconPath

获取当前已注册图标的 path 片段浅拷贝。

```
getRegistedIconPath() → Record<string, string>
```

**返回值**: `Record<string, string>` — 图标名称到 SVG path 的映射。

```js
const icons = getRegistedIconPath();
// { info: '<path d="..."', success: '<path d="..."', ... }
```

### addIcons

批量注册自定义图标。传入值应为 SVG path 片段（`<path ...>`），不需要包含外层 `<svg>`。

```
addIcons(svgPathObjects) → void
```

| 参数             | 类型                     | 说明                       |
| ---------------- | ------------------------ | -------------------------- |
| `svgPathObjects` | `Record<string, string>` | 图标名称到 SVG path 的映射 |

**抛出**: `Error` — 参数不是有效对象或 path 不以 `<` 开头时。

```js
addIcons({
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>',
  bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>',
});

// 之后即可使用
icon('star');
```

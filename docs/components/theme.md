# Theme

Theme 是主题配置和主题面板控制器，源码位于 `src/primitives/theme.ts`。它通过 `createTheme(options)` 创建实例，使用 `createDeepStore` 保存归一化后的配置，使用 cookie storage 持久化 `mode/theme/radius/shadow/font`，并通过 document 级事件代理处理主题面板点击。

实例初始化和 `setConfig()` 不会修改 `document.documentElement` 类名。需要首屏避免闪烁时，由用户根据存储配置在后端渲染 html class，或在 `<head>` 中写入一段内联脚本。面板按钮点击属于显式交互，会同步更新当前点击项对应的 html class 并写入配置。

## 导入

```js
import { createTheme } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const theme = createTheme({
  mode: 'light',
  theme: 'blue',
  radius: 'md',
});
const themePanel = theme.createPanel();

document.body.appendChild(themePanel);
```

`createPanel()` 每次调用都会返回一个新的面板 DOM，并为该面板创建响应式 active 绑定。调用 `destroy()` 会释放这些绑定、解绑 document 点击事件并关闭 storage。

## Head 脚本

```html
<script>(function(d,k){var v={mode:'dark',theme:'indigo',radius:'sm',shadow:'sm',font:'sm'},m=d.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]*)')),o=v;if(m){try{var r=JSON.parse(decodeURIComponent(m[1]));if(r&&typeof r.val==='string')o=Object.assign({},v,JSON.parse(r.val)||{})}catch(e){o=v}}try{var c=o.mode==='auto'?matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light':o.mode,h=d.documentElement;h.classList.add(c||'dark','j-theme-'+(o.theme||v.theme),'j-radius-'+(o.radius||v.radius),'j-shadow-'+(o.shadow||v.shadow),'j-font-'+(o.font||v.font))}catch(e){}})(document,'ui-theme');</script>
```

`createStorage({ driver: 'cookie', codec: 'json', namespace: '', keySeparator: '' })` 写入的 cookie 值是 URL 编码后的 JSON 字符串。head script 只需要解析外层记录，并确认 `val` 存在且能被 `JSON.parse()` 解析成主题配置；不需要在首屏脚本里完整校验外层记录字段。

## 方法

| 方法                                       | 说明                                             |
| ------------------------------------------ | ------------------------------------------------ |
| `createPanel(containerClass, panelConfig)` | 创建主题面板 DOM，并绑定 active 状态             |
| `setConfig(config)`                        | 更新实例配置并写入 cookie；不会主动改 html class |
| `destroy()`                                | 解绑全局事件、释放面板绑定并关闭 storage         |

## 配置

| 字段        | 类型     | 默认值       | 说明                      |
| ----------- | -------- | ------------ | ------------------------- |
| `mode`      | `string` | `'dark'`     | `light`、`dark` 或 `auto` |
| `theme`     | `string` | `'indigo'`   | 主题色名称                |
| `radius`    | `string` | `'sm'`       | 圆角级别                  |
| `shadow`    | `string` | `'sm'`       | 阴影级别                  |
| `font`      | `string` | `'sm'`       | 字号级别                  |
| `key`       | `string` | `'ui-theme'` | cookie storage key        |
| `className` | `object` | 默认类名     | 覆盖主题面板结构类名      |

`theme.props` 是响应式配置对象。面板按钮的 active class 和 `aria-selected` 会读取它；`setConfig()` 也会更新它并写入 cookie。

## 面板配置

`createPanel(containerClass, panelConfig)` 的第二个参数可以替换默认分组：

```js
theme.createPanel(null, [
  {
    title: 'Mode',
    type: 'mode',
    buttons: [
      ['light', 'Light'],
      ['dark', 'Dark'],
    ],
  },
]);
```

`type` 只能是 `mode`、`theme`、`radius`、`shadow` 或 `font`。按钮点击会根据 `type` 写入对应配置：`mode` 会替换 html 上的 `light/dark`，其它类型会替换 `j-theme-*`、`j-radius-*`、`j-shadow-*` 或 `j-font-*` 前缀类。

## className

`createTheme({ className })` 可覆盖主题面板结构类名；未传字段使用默认类名。

| 字段         | 默认值                | 说明       |
| ------------ | --------------------- | ---------- |
| `panel`      | `j-theme-palette`     | 面板根节点 |
| `title`      | `theme-palette-title` | 标题       |
| `container`  | `palette-container`   | 分组容器   |
| `item`       | `palette-item`        | 分组       |
| `itemTitle`  | `item-title`          | 分组标题   |
| `items`      | `items`               | 按钮列表   |
| `button`     | `j-button is-default` | 面板按钮   |
| `active`     | `is-active`           | 激活状态   |
| `prefix`     | `el-prefix`           | 色块前缀   |
| `swatch`     | `item-hex`            | 主题色块   |
| `buttonText` | `button-text`         | 按钮文本   |

面板内部交互使用 `data-theme-group`、`data-theme-button` 和 `data-theme-value`，不依赖默认 CSS 类。

## 实例属性

| 属性    | 说明               |
| ------- | ------------------ |
| `props` | 响应式主题配置对象 |

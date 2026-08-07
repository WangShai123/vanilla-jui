# Theme

Theme 是主题管理 UI 原语，源码位于 `src/primitives/theme.ts`。它不继承 Component，只通过工厂函数创建实例。Theme 负责主题配置实例化、主题面板交互，并通过 `vanilla-create-storage` 的 cookie adapter 持久化配置。

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

## Head 脚本

```html
<script>
  (function (d, k) {
    var v = {
        mode: 'dark',
        theme: 'indigo',
        radius: 'sm',
        shadow: 'sm',
        font: 'sm',
      },
      m = d.cookie.match(new RegExp('(?:^|; )' + k + '=([^;]*)')),
      o = v;
    if (m) {
      try {
        var record = JSON.parse(decodeURIComponent(m[1])),
          payload = JSON.parse(record.value);
        o = Object.assign({}, v, payload.value || {});
      } catch (e) {
        o = v;
      }
    }
    try {
      var r =
          o.mode === 'auto'
            ? matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : o.mode,
        h = d.documentElement;
      h.classList.add(
        r || 'dark',
        'j-theme-' + (o.theme || v.theme),
        'j-radius-' + (o.radius || v.radius),
        'j-shadow-' + (o.shadow || v.shadow),
        'j-font-' + (o.font || v.font)
      );
    } catch (e) {}
  })(document, 'ui-theme');
</script>
```

## 方法

| 方法                                       | 说明                   |
| ------------------------------------------ | ---------------------- |
| `setConfig(config)`                        | 更新配置并写入 cookie  |
| `createPanel(containerClass, panelConfig)` | 创建主题面板 DOM       |
| `destroy()`                                | 解绑全局事件并移除实例 |

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

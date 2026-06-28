# Theme

Theme 是主题管理组件，源码位于 `src/components/theme.js`。它负责主题配置实例化、主题面板交互和 Cookie 读写。

实例初始化和 `setConfig()` 不会修改 `document.documentElement` 类名。需要首屏避免闪烁时，由用户根据 Cookie 在后端渲染 html class，或在 `<head>` 中写入一段内联脚本。面板按钮点击属于显式交互，会同步更新当前点击项对应的 html class 并写入 Cookie。

## 导入

```js
import { Theme } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const theme = new Theme({
  mode: 'light',
  theme: 'blue',
  radius: 'md',
});

theme.setConfig({ theme: 'tomato' });
document.body.appendChild(theme.createPanel());
```

## Head 脚本

```html
<script>
  (function (d, k) {
    var m = d.cookie.match(new RegExp('(?:^|; )' + k + '=([^;]*)'));
    if (!m) return;
    try {
      var o = JSON.parse(m[1]),
        r =
          o.mode === 'auto'
            ? matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : o.mode,
        h = d.documentElement;
      h.classList.add(
        r || 'dark',
        'j-theme-' + (o.theme || 'indigo'),
        'j-radius-' + (o.radius || 'sm'),
        'j-shadow-' + (o.shadow || 'sm'),
        'j-font-' + (o.font || 'sm')
      );
    } catch (e) {}
  })(document, 'jui-theme');
</script>
```

## 方法

| 方法                                       | 说明                   |
| ------------------------------------------ | ---------------------- |
| `setConfig(config)`                        | 更新配置并写入 Cookie  |
| `createPanel(containerClass, panelConfig)` | 创建主题面板 DOM       |
| `destroy()`                                | 解绑全局事件并移除实例 |

## 测试

可视化半自动测试页面：`tests/theme.test.html`。

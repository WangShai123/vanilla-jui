# Theme

Theme 是主题管理组件，源码位于 `src/components/theme.js`。它负责把主题配置同步到 `document.documentElement` 类名、Cookie 和可选主题面板。

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

## 方法

| 方法                                       | 说明                   |
| ------------------------------------------ | ---------------------- |
| `setConfig(config)`                        | 更新配置并立即应用     |
| `createPanel(containerClass, panelConfig)` | 创建主题面板 DOM       |
| `destroy()`                                | 解绑全局事件并移除实例 |

## 测试

可视化半自动测试页面：`tests/theme.test.html`。

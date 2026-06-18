# Menu

Menu 是轻量命令式菜单组件，源码位于 `src/components/menu.js`。它支持绑定已有菜单 DOM，也支持通过 `items` 动态创建移动菜单或底部菜单。

## 导入

```js
import { Menu } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 动态创建

```js
const menu = new Menu(false, {
  type: 'mobile',
  items: [
    { id: 'home', title: 'Home', url: '#home' },
    {
      id: 'docs',
      title: 'Docs',
      children: [{ id: 'api', title: 'API', url: '#api' }],
    },
  ],
}).build();

document.querySelector('#demo').appendChild(menu.root);
```

## 方法

| 方法              | 说明                                                       |
| ----------------- | ---------------------------------------------------------- |
| `build()`         | 构建或绑定菜单                                             |
| `setItems(items)` | 替换菜单条目，动态菜单会重建，绑定 DOM 会替换 `.menu` 内容 |
| `removeItem(id)`  | 移除指定菜单项                                             |
| `destroy()`       | 解绑事件并清理实例                                         |

## 测试

可视化半自动测试页面：`tests/menu.test.html`。

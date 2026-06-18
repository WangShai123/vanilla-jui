# Tabs

Tabs 是轻量命令式标签页组件，源码位于 `src/components/tabs.js`。它适合绑定已有 DOM，也可以通过 `new Tabs(false, { tabs })` 动态创建。

## 导入

```js
import { Tabs } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 动态创建

```js
const tabs = new Tabs(false, {
  active: 'profile',
  tabs: [
    { name: 'account', title: 'Account', content: 'Account content' },
    { name: 'profile', title: 'Profile', content: '<strong>Profile</strong>' },
  ],
});

document.querySelector('#demo').appendChild(tabs.root);
```

`title` 和 `content` 支持字符串、DOM 节点、节点数组、函数和 `null`。字符串会按 HTML 片段渲染。

## 常用方法

| 方法                      | 说明                   |
| ------------------------- | ---------------------- |
| `activate(indexOrName)`   | 激活指定标签           |
| `addTab(tabConfig)`       | 动态新增标签           |
| `deleteTab(indexOrName)`  | 删除指定标签           |
| `disableTab(indexOrName)` | 禁用标签               |
| `enableTab(indexOrName)`  | 启用标签               |
| `reInit(options)`         | 更新配置并重新同步状态 |
| `destroy()`               | 解绑事件并清理实例     |

`destroy()` 会移除由 `new Tabs(false, options)` 动态创建的根节点；绑定已有 DOM 的实例只解绑事件和清理状态，不会移除传入的宿主元素。

## 测试

可视化半自动测试页面：`tests/tabs.test.html`。

# Tabs

Tabs 继承 `Component`，基于 `vanilla-signal` 响应式渲染的标签页组件，源码位于 `src/components/tabs.js`。

DOM 创建一次，通过 `createEffect` 细粒度更新 class/ARIA。支持横向/纵向导航溢出拖拽。

## 导入

```js
import { Tabs } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 创建与挂载

```js
const tabs = new Tabs('#demo', {
  active: 'profile',
  tabs: [
    { name: 'account', title: 'Account', panel: 'Account content' },
    { name: 'profile', title: 'Profile', panel: '<strong>Profile</strong>' },
  ],
});

tabs.render();
```

## 禁用标签

```js
tabs.disable('account');
tabs.enable('account');
```

## 动态增删

```js
await tabs.add({ name: 'billing', title: 'Billing', panel: '...' });
await tabs.delete('billing');
```

## 导航位置

```js
new Tabs('#demo', { direction: 'left', tabs }).render();
```

## 实例属性

| 属性    | 说明                                              |
| ------- | ------------------------------------------------- |
| `root`  | 根节点                                            |
| `props` | 归一化后的配置                                    |
| `state` | 响应式状态，含 `activeIndex` / `disabledNames` / `isVertical` / `draggable` |

## 实例方法

| 方法                      | 说明                   |
| ------------------------- | ---------------------- |
| `render()`                | 挂载到构造器指定的容器 |
| `activate(indexOrName)`   | 激活指定标签           |
| `add(tabConfig)`          | 动态新增标签           |
| `delete(indexOrName)`     | 删除指定标签           |
| `disable(indexOrName)`    | 禁用标签               |
| `enable(indexOrName)`     | 启用标签               |
| `reInit(patch)`           | 更新配置并重新渲染     |
| `destroy()`               | 销毁实例，释放资源     |

继承自 `Component`：`setState()`、`on()`、`off()`、`emit()`、`use()`。

## 参数

| 参数       | 类型                                 | 默认值  | 说明                           |
| ---------- | ------------------------------------ | ------- | ------------------------------ |
| `id`       | `string \| null`                     | `null`  | 根节点 id；为空时自动生成      |
| `direction`| `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | 标签导航位置              |
| `active`   | `number \| string`                   | `0`     | 默认激活项索引或名称           |
| `disabled` | `number \| string \| Array`          | `[]`    | 默认禁用项索引或名称           |
| `tabs`     | `TabItem[]`                          | `[]`    | 标签配置列表                   |
| `onChange` | `Function \| null`                   | `null`  | 激活项变化回调 `(index, name, tabEl, panelEl)` |
| `onAdd`    | `Function \| null`                   | `null`  | 新增标签回调 `(index, tabConfig, tabEl, panelEl)` |
| `onRemove` | `Function \| null`                   | `null`  | 删除标签回调 `(index, removedName)` |

# Accordion

Accordion 继承 `Component`，基于 `vanilla-signal` 响应式渲染的手风琴组件，源码位于 `src/components/accordion.js`。

DOM 创建一次，通过 `createEffect` 细粒度更新 class/ARIA，状态变化只更新受影响节点。

## 导入

```js
import { Accordion } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 创建与挂载

```js
const accordion = new Accordion('#demo', {
  active: 'usage',
  items: [
    { name: 'intro', title: 'Intro', content: 'Intro content' },
    {
      name: 'usage',
      title: 'Usage',
      content: '<strong>Usage</strong> content',
    },
  ],
});

accordion.build();
```

构造器接收 `(container, props)`，`container` 为元素或 CSS 选择器。调用 `build()` 后通过 `vanilla-signal` 的 `insert` 挂载到容器。

## 单开、折叠和多开

```js
// 单开（默认）
new Accordion('#demo', { active: 0, items }).build();

// 折叠 — 点击当前项可关闭
new Accordion('#demo', { active: 0, collapsible: true, items }).build();

// 多开
new Accordion('#demo', { multiple: true, active: [0, 'api'], items }).build();
```

## 动态替换条目

```js
accordion.setItems(
  [
    { name: 'basic', title: 'Basic', content: 'Basic content' },
    { name: 'advanced', title: 'Advanced', content: 'Advanced content' },
  ],
  'advanced'
);
```

## 实例属性

| 属性    | 说明                                     |
| ------- | ---------------------------------------- |
| `root`  | 根节点                                   |
| `props` | 归一化后的配置                           |
| `state` | 响应式状态，含 `activeNames` / `current` |

## 实例方法

| 方法                      | 说明                          |
| ------------------------- | ----------------------------- |
| `build()`                 | 挂载到构造器指定的容器        |
| `active(indexOrName)`     | 激活或折叠面板                |
| `setItems(items, active)` | 替换全部条目并重新渲染        |
| `destroy()`               | 销毁实例，移除 DOM 并释放资源 |

继承自 `Component`：`setState()`、`on()`、`off()`、`emit()`、`use()`。

## 参数

| 参数          | 类型                                | 默认值  | 说明                      |
| ------------- | ----------------------------------- | ------- | ------------------------- |
| `id`          | `string \| null`                    | `null`  | 根节点 id；为空时自动生成 |
| `active`      | `number \| string \| Array \| null` | `0`     | 初始激活项                |
| `collapsible` | `boolean`                           | `false` | 允许关闭当前已激活项      |
| `multiple`    | `boolean`                           | `false` | 允许同时展开多个面板      |
| `items`       | `AccordionItem[]`                   | `[]`    | 面板配置列表              |
| `onChange`    | `Function \| null`                  | `null`  | 激活项变化回调            |

## 无障碍

| 区域     | 支持                                                              |
| -------- | ----------------------------------------------------------------- |
| header   | `role="button"`、`tabindex="0"`、`aria-expanded`、`aria-controls` |
| panel    | `role="region"`、`aria-hidden`、`aria-labelledby`                 |
| keyboard | `Enter` / `Space` 切换                                            |

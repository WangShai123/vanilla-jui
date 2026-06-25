# Tabs

`Tabs` 是基于 `Component` 和 `vanilla-signal` 实现的响应式标签页组件，DOM 创建一次，通过 createEffect 细粒度更新 class/ARIA。支持横向/纵向导航溢出拖拽。

源码位于 `src/components/tabs.js`。

适用场景：

- 页面内多内容面板切换
- 左右/上下结构的工作台导航
- 内容较多时的横向或纵向拖拽标签列表

组件特性：

- 支持 `string`、`Node`、`Array<Node>`、函数返回节点等内容表达
- 支持 `top`、`bottom`、`left`、`right` 四种方向
- 支持按索引或名称激活、禁用、启用
- 支持动态新增、删除、重初始化
- 标签溢出时自动开启拖拽滚动

## 导入

```js
import { Tabs } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

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

## 容器参数

构造器第一个参数 `container` 支持以下形式：

| 类型                   | 说明                              |
| ---------------------- | --------------------------------- |
| `string`               | CSS 选择器                        |
| `Element`              | 真实 DOM 元素                     |
| `jsx()` / `h()` 返回值 | 最终可解析为 `Element` 的节点     |
| `Array`                | 可解析出单个 `Element` 的节点数组 |

示例：

```js
const mount = document.getElementById('demo');
const tabs = new Tabs(mount, { tabs: [...] });
tabs.render();
```

## 实例化参数

### `new Tabs(container, options)`

| 参数        | 类型                                 | 必填 | 说明                                             |
| ----------- | ------------------------------------ | ---- | ------------------------------------------------ |
| `container` | `Element \| Node \| string \| Array` | 是   | 挂载容器。调用 `render()` 时会把根节点插入这里。 |
| `options`   | `object`                             | 否   | Tabs 配置对象。                                  |

### `options`

| 字段        | 类型                                          | 默认值  | 说明                                                   |
| ----------- | --------------------------------------------- | ------- | ------------------------------------------------------ |
| `id`        | `string \| null`                              | `null`  | 根节点 `id`。为空时自动生成。                          |
| `direction` | `'top' \| 'bottom' \| 'left' \| 'right'`      | `'top'` | 标签导航方向。`left/right` 会影响 `state.isVertical`。 |
| `active`    | `number \| string`                            | `0`     | 默认激活标签。可传索引或 `name`。                      |
| `disabled`  | `number \| string \| Array<number \| string>` | `[]`    | 默认禁用项。可传单个索引、单个名称或多个索引/名称。    |
| `tabs`      | `TabItem[]`                                   | `[]`    | 标签项列表。                                           |
| `onChange`  | `Function \| null`                            | `null`  | 激活项切换后触发。                                     |
| `onAdd`     | `Function \| null`                            | `null`  | `add()` 成功后触发。                                   |
| `onRemove`  | `Function \| null`                            | `null`  | `delete()` 成功后触发。                                |

### `TabItem`

| 字段    | 类型                                          | 必填 | 说明                           |
| ------- | --------------------------------------------- | ---- | ------------------------------ |
| `name`  | `string`                                      | 否   | 标签唯一名称。不传时自动生成。 |
| `title` | `string \| Node \| Array \| Function \| null` | 是   | 标签头内容。                   |
| `panel` | `string \| Node \| Array \| Function \| null` | 是   | 面板内容。                     |

## 实例属性

### 核心属性

| 属性      | 类型              | 说明                                                |
| --------- | ----------------- | --------------------------------------------------- |
| `props`   | `object`          | 当前实例的配置对象。已过默认值合并和参数归一化。    |
| `root`    | `Element \| null` | 根节点，类名形如 `j-tabs is-top`。销毁后为 `null`。 |
| `dom`     | `object`          | 组件内部 DOM 引用集合。                             |
| `state`   | `DeepStore`       | 响应式状态对象。                                    |
| `runtime` | `object`          | 基类运行时对象，至少包含 `destroyed`。              |
| `cleanup` | `object`          | 基类清理器，包含事件与插件清理能力。                |

### `dom`

| 属性            | 类型              | 说明                           |
| --------------- | ----------------- | ------------------------------ |
| `dom.root`      | `Element \| null` | 与 `root` 相同。               |
| `dom.tabs`      | `Element[]`       | 所有标签节点数组。             |
| `dom.panels`    | `Element[]`       | 所有面板节点数组。             |
| `dom.container` | `Element`         | 构造器传入并解析后的挂载容器。 |

### `state`

| 属性                     | 类型             | 说明                                         |
| ------------------------ | ---------------- | -------------------------------------------- |
| `state.isVertical`       | `boolean`        | 当前方向是否为纵向。`left/right` 为 `true`。 |
| `state.draggable`        | `boolean`        | 当前标签区是否可拖拽滚动。                   |
| `state.current`          | `object`         | 当前激活项集合。                             |
| `state.current.index`    | `number`         | 当前激活标签索引。无激活项时为 `-1`。        |
| `state.current.name`     | `string \| null` | 当前激活标签名称。无激活项时为 `null`。      |
| `state.disabled`         | `object`         | 禁用项集合。                                 |
| `state.disabled.names`   | `string[]`       | 当前禁用标签名称集合。                       |
| `state.disabled.indexes` | `number[]`       | 当前禁用标签索引集合。                       |

### 兼容只读属性

待废除的两个只读 getter：

| 属性            | 类型       | 说明                            |
| --------------- | ---------- | ------------------------------- |
| `activeIndex`   | `number`   | 等价于 `state.current.index`。  |
| `disabledNames` | `string[]` | 等价于 `state.disabled.names`。 |

## 实例方法

### `render()`

把根节点挂载到构造器传入的 `container`。

```js
tabs.render();
```

| 项     | 说明                       |
| ------ | -------------------------- |
| 作用   | 将 `root` 插入 `container` |
| 参数   | 无                         |
| 返回值 | `void`                     |

### `activate(val)`

激活指定标签。

```js
await tabs.activate(1);
await tabs.activate('profile');
```

| 项     | 说明                                        |
| ------ | ------------------------------------------- |
| 作用   | 切换当前激活项，并在需要时触发 `onChange`   |
| 参数   | `val: number \| string`，标签索引或标签名称 |
| 返回值 | `Promise<void>`                             |

### `add(tabConfig)`

动态新增一个标签。

```js
await tabs.add({
  name: 'billing',
  title: 'Billing',
  panel: 'Billing content',
});
```

| 项     | 说明                                     |
| ------ | ---------------------------------------- |
| 作用   | 向末尾插入新标签并重建列表               |
| 参数   | `tabConfig: object`，符合 `TabItem` 结构 |
| 返回值 | `Promise<void>`                          |

### `delete(val)`

按索引或名称删除标签。

```js
await tabs.delete(2);
await tabs.delete('billing');
```

| 项     | 说明                                                         |
| ------ | ------------------------------------------------------------ |
| 作用   | 删除指定标签；若当前激活项受影响，会同步修正 `state.current` |
| 参数   | `val: number \| string`，标签索引或标签名称                  |
| 返回值 | `Promise<void>`                                              |

### `disable(val)`

禁用指定标签。

```js
tabs.disable(1);
tabs.disable('profile');
```

| 项     | 说明                                          |
| ------ | --------------------------------------------- |
| 作用   | 把目标标签加入 `state.disabled.names/indexes` |
| 参数   | `val: number \| string`，标签索引或标签名称   |
| 返回值 | `void`                                        |

### `enable(val)`

启用指定标签。

```js
tabs.enable(1);
tabs.enable('profile');
```

| 项     | 说明                                        |
| ------ | ------------------------------------------- |
| 作用   | 把目标标签从禁用集合中移除                  |
| 参数   | `val: number \| string`，标签索引或标签名称 |
| 返回值 | `void`                                      |

### `reInit(patch = {})`

用新配置重新初始化组件。

```js
await tabs.reInit({
  direction: 'left',
  active: 'alpha',
  tabs: [
    { name: 'alpha', title: 'Alpha', panel: 'Alpha panel' },
    { name: 'beta', title: 'Beta', panel: 'Beta panel' },
  ],
});
```

| 项     | 说明                                                       |
| ------ | ---------------------------------------------------------- |
| 作用   | 合并新配置、重建 DOM、刷新禁用和激活状态、重新绑定拖拽事件 |
| 参数   | `patch: object`，可覆盖任意初始化参数                      |
| 返回值 | `Promise<void>`                                            |

### `destroy()`

销毁实例，解绑事件并移除根节点。

```js
tabs.destroy();
```

| 项     | 说明                                 |
| ------ | ------------------------------------ |
| 作用   | 清理事件、动画帧、响应式绑定和根节点 |
| 参数   | 无                                   |
| 返回值 | `void`                               |

## 回调说明

### `onChange(index, name, tabEl, panelEl)`

当前激活项变化后触发。

| 参数      | 类型               | 说明                           |
| --------- | ------------------ | ------------------------------ |
| `index`   | `number`           | 新激活项索引                   |
| `name`    | `string \| number` | 新激活项名称；无名称时退回索引 |
| `tabEl`   | `Element`          | 对应标签节点                   |
| `panelEl` | `Element`          | 对应面板节点                   |

### `onAdd(index, tabConfig, tabEl, panelEl)`

`add()` 成功后触发。

| 参数        | 类型      | 说明             |
| ----------- | --------- | ---------------- |
| `index`     | `number`  | 新标签索引       |
| `tabConfig` | `object`  | 新增时传入的配置 |
| `tabEl`     | `Element` | 新标签节点       |
| `panelEl`   | `Element` | 新面板节点       |

### `onRemove(index, removedName)`

`delete()` 成功后触发。

| 参数          | 类型     | 说明               |
| ------------- | -------- | ------------------ |
| `index`       | `number` | 被删除标签的旧索引 |
| `removedName` | `string` | 被删除标签名称     |

## 继承自 Component 的能力

`Tabs` 继承自 `Component`，因此仍可使用这些通用能力：

| 方法                          | 说明                 |
| ----------------------------- | -------------------- |
| `on(event, callback)`         | 监听组件事件         |
| `off(event, callback)`        | 移除组件事件监听     |
| `emit(event, ...args)`        | 手动触发组件事件     |
| `use(plugin, options)`        | 安装实例插件         |
| `setState(patch)`             | 写入响应式状态       |
| `update(propsPatch, options)` | 触发通用更新生命周期 |

## 示例

### 左侧纵向标签

```js
const tabs = new Tabs('#demo', {
  direction: 'left',
  active: 'guide',
  disabled: ['api'],
  tabs: [
    { name: 'intro', title: 'Intro', panel: 'Intro content' },
    { name: 'guide', title: 'Guide', panel: 'Guide content' },
    { name: 'api', title: 'API', panel: 'API content' },
  ],
});

tabs.render();
```

### 查看当前状态

```js
console.log(tabs.state.current.index);
console.log(tabs.state.current.name);
console.log(tabs.state.disabled.names);
console.log(tabs.state.disabled.indexes);
console.log(tabs.state.isVertical);
console.log(tabs.state.draggable);
```

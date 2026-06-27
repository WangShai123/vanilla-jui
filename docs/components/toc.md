# Toc

Toc 是页面目录组件，源码位于 `src/components/toc.js`。它扫描内容区域内的标题，渲染锚点列表，并随页面滚动更新当前 active 项。

组件继承 `Component`。构造函数只归一化配置并初始化 `props`、`dom`、`runtime`、`state`；调用 `build()` 后才会解析 DOM、渲染目录和绑定滚动事件。

## 导入

```js
import { Toc, createToc } from 'vanilla-jui';
```

## 基础用法

```js
const toc = new Toc({
  container: '.article-sidebar',
  target: '.article-content',
  headings: 'h2, h3',
  offset: 80,
});

toc.build();
```

也可以使用工厂函数：

```js
const toc = createToc({
  container: document.querySelector('.article-sidebar'),
  target: document.querySelector('.article-content'),
});

toc.build();
```

## 挂载和分析目标

`container` 是目录列表的单一挂载位置。`target` 是被扫描标题的单一内容区域。Toc 不支持多个 `container` 或多个 `target`。

```html
<aside class="article-sidebar"></aside>

<article class="article-content">
  <h2>Intro</h2>
  <h3>Details</h3>
</article>
```

`build()` 会在 `container` 内创建 `.j-toc` 根节点和 `.toc-list` 列表。组件内部不写视觉样式，目录外观由 `src/css/toc.css` 中的 `.j-toc` 相关样式管理。

## 参数

### `new Toc(props)`

| 参数    | 类型     | 必填 | 说明         |
| ------- | -------- | ---- | ------------ |
| `props` | `object` | 否   | Toc 配置对象 |

### Props

| 字段        | 类型                                | 默认值         | 说明                                             |
| ----------- | ----------------------------------- | -------------- | ------------------------------------------------ |
| `container` | `string \| Element \| Node \| null` | `null`         | 目录列表的单一挂载位置                           |
| `target`    | `string \| Element \| Node \| null` | `'.j-content'` | 扫描标题的单一内容区域                           |
| `headings`  | `string`                            | `'h2, h3'`     | 标题选择器                                       |
| `offset`    | `number`                            | `80`           | 判断 active 标题的顶部偏移，单位 px              |
| `onUpdate`  | `Function \| null`                  | `null`         | active 项变化后触发，参数为 `(item, index, toc)` |

## 实例属性

| 属性      | 类型        | 说明               |
| --------- | ----------- | ------------------ |
| `props`   | `object`    | 归一化后的配置对象 |
| `dom`     | `object`    | DOM 引用集合       |
| `state`   | `DeepStore` | 响应式状态         |
| `runtime` | `object`    | 运行时状态         |

### `dom`

| 属性            | 类型              | 说明                 |
| --------------- | ----------------- | -------------------- |
| `dom.container` | `Element \| null` | 目录挂载容器         |
| `dom.target`    | `Element \| null` | 被扫描的内容区域     |
| `dom.list`      | `Element \| null` | 目录列表根节点       |
| `dom.headings`  | `Element[]`       | 当前扫描到的标题元素 |
| `dom.links`     | `Element[]`       | 当前渲染的目录链接   |

### `state`

| 属性                  | 类型                                                                   | 说明                                    |
| --------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| `state.items`         | `Array<{ id: string, text: string, level: number, element: Element }>` | 标题数据                                |
| `state.current.index` | `number`                                                               | 当前 active 项索引，无 active 时为 `-1` |
| `state.current.item`  | `object \| null`                                                       | 当前 active 项数据                      |

## 实例方法

### `build()`

解析 `container` / `target`，创建 `root` / `dom.list`，渲染目录列表并绑定滚动事件。

```js
toc.build();
```

| 项     | 说明           |
| ------ | -------------- |
| 参数   | 无             |
| 返回值 | `Toc` 当前实例 |

### `refresh()`

重新扫描标题并重建目录列表。适合内容区域动态变化后调用。

```js
toc.refresh();
```

| 项     | 说明           |
| ------ | -------------- |
| 参数   | 无             |
| 返回值 | `Toc` 当前实例 |

### `activate(index)`

滚动到指定目录项。

```js
toc.activate(1);
```

| 项     | 说明                        |
| ------ | --------------------------- |
| 参数   | `index: number`，目录项索引 |
| 返回值 | `Toc` 当前实例              |

### `destroy()`

销毁实例，移除事件监听，并清空 `container` 内的目录内容。

```js
toc.destroy();
```

| 项     | 说明   |
| ------ | ------ |
| 参数   | 无     |
| 返回值 | `void` |

继承自 `Component` 的 `on()`、`off()`、`emit()`、`use()` 也可使用。

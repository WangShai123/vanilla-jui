# Toc

Toc 是页面目录组件，源码位于 `src/components/toc.ts`。它继承 `Component`，负责扫描内容区域内的标题、渲染锚点列表，并随页面滚动更新当前 active 项。

构造函数只归一化配置并初始化 `props`、`dom`、`runtime`、`state`。调用 `build()` 后才会解析目标 DOM、创建 `toc.element`、渲染目录和绑定事件。Toc 不会自动挂载，用户需要手动把 `toc.element` 添加到指定容器。

## 导入

```js
import { createToc } from 'vanilla-jui';
```

## 基础用法

```js
const toc = createToc({
  target: '.article-content',
  headings: 'h2, h3',
  offset: 80,
});

toc.build();
document.querySelector('.article-sidebar').appendChild(toc.element);
```

## 挂载和扫描目标

`target` 是被扫描标题的单一内容区域。Toc 不支持多个 `target`。目录挂载位置由用户自己决定。

```html
<aside class="article-sidebar"></aside>

<article class="article-content">
  <h2>Intro</h2>
  <h3>Details</h3>
</article>
```

`build()` 会创建目录根节点和列表。默认类名保持 `.j-toc`、`.toc-list`、`.toc-link`，也可以通过 `className` 覆盖；组件内部交互使用 `data-toc-*`，不依赖 CSS 类选择器。

## 参数

### `createToc(props)`

| 参数    | 类型     | 必填 | 说明         |
| ------- | -------- | ---- | ------------ |
| `props` | `object` | 否   | Toc 配置对象 |

### Props

| 字段        | 类型                                | 默认值         | 说明                                                |
| ----------- | ----------------------------------- | -------------- | --------------------------------------------------- |
| `target`    | `string \| Element \| Node \| null` | `'.j-content'` | 扫描标题的单一内容区域                              |
| `headings`  | `string`                            | `'h2, h3'`     | 标题选择器                                          |
| `offset`    | `number`                            | `80`           | 判断 active 标题的顶部偏移，单位 px                 |
| `className` | `object`                            | 默认类名       | 覆盖 `toc`、`list`、`link`、`active`、`levelPrefix` |
| `onChange`  | `Function \| null`                  | `null`         | active 项变化后触发，参数为 `(item, index, toc)`    |

## 实例属性

| 属性      | 类型        | 说明               |
| --------- | ----------- | ------------------ |
| `props`   | `object`    | 归一化后的配置对象 |
| `dom`     | `object`    | DOM 引用集合       |
| `state`   | `DeepStore` | 响应式状态         |
| `runtime` | `object`    | 运行时状态         |

### `dom`

| 属性           | 类型              | 说明                 |
| -------------- | ----------------- | -------------------- |
| `dom.root`     | `Element \| null` | 目录根节点           |
| `dom.target`   | `Element \| null` | 被扫描的内容区域     |
| `dom.list`     | `Element \| null` | 目录列表根节点       |
| `dom.headings` | `Element[]`       | 当前扫描到的标题元素 |
| `dom.links`    | `Element[]`       | 当前渲染的目录链接   |

### `state`

| 属性                  | 类型                                                                   | 说明                                    |
| --------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| `state.items`         | `Array<{ id: string, text: string, level: number, element: Element }>` | 标题数据                                |
| `state.current.index` | `number`                                                               | 当前 active 项索引，无 active 时为 `-1` |
| `state.current.item`  | `object \| null`                                                       | 当前 active 项数据                      |

## 实例方法

### `build()`

解析 `target`，创建 `dom.root` / `dom.list`，渲染目录列表并绑定滚动事件。该方法不会自动挂载 `dom.root`。

```js
toc.build();
document.querySelector('.article-sidebar').appendChild(toc.element);
```

| 项     | 说明          |
| ------ | ------------- |
| 参数   | 无            |
| 返回值 | 当前 Toc 实例 |

### `refresh()`

重新扫描标题并重建目录列表。适合内容区域动态变化后调用。

```js
toc.refresh();
```

| 项     | 说明          |
| ------ | ------------- |
| 参数   | 无            |
| 返回值 | 当前 Toc 实例 |

### `activate(index)`

滚动到指定目录项对应的标题位置，并应用 `offset` 偏移。

```js
toc.activate(1);
```

| 项     | 说明                        |
| ------ | --------------------------- |
| 参数   | `index: number`，目录项索引 |
| 返回值 | 当前 Toc 实例               |

### `destroy()`

销毁实例，移除事件监听，并移除 `dom.root`。

```js
toc.destroy();
```

| 项     | 说明   |
| ------ | ------ |
| 参数   | 无     |
| 返回值 | `void` |

继承自 `Component` 的 `on()`、`off()`、`emit()`、`use()` 也可使用。

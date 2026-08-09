# Toc

Toc 是页面目录组件，源码位于 `src/components/toc.ts`。它通过 `createToc(props)` 创建 `defineComponent()` 控制器，负责扫描内容区域内的标题、渲染 keyed 锚点列表，并随页面滚动更新当前 active 项。

工厂函数只归一化配置并初始化 `props`、`runtime` 和 `state`。调用 `build()` 后才会解析目标 DOM、创建 `toc.element`、扫描标题并绑定滚动事件。Toc 不会自动挂载，用户可以手动插入 `toc.element`，也可以调用 `toc.mount(container)`。

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

`build()` 会创建目录根节点和列表。默认类名保持 `.j-toc`、`.toc-list`、`.toc-link`，也可以通过 `className` 覆盖；组件内部交互使用 `data-toc-*`，不依赖 CSS 类选择器。目录项使用标题 id 作为 key，刷新时保留未删除项的节点身份。

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

| 属性      | 类型                  | 说明                                   |
| --------- | --------------------- | -------------------------------------- |
| `props`   | `object`              | 归一化后的配置对象                     |
| `state`   | `DeepStore`           | 响应式状态                             |
| `runtime` | `object`              | `built/mounted/destroyed` 生命周期标记 |
| `element` | `HTMLElement \| null` | build 后的稳定目录根节点               |

Toc 的扫描目标、标题节点、滚动 RAF 状态和事件管理器保存在组件闭包内，不作为公开 DOM map 暴露。

### `state`

| 属性                  | 类型                                                 | 说明                                    |
| --------------------- | ---------------------------------------------------- | --------------------------------------- |
| `state.items`         | `Array<{ id: string, text: string, level: number }>` | 标题数据                                |
| `state.current.index` | `number`                                             | 当前 active 项索引，无 active 时为 `-1` |
| `state.current.item`  | `object \| null`                                     | 当前 active 项数据                      |

## 实例方法

### `build()`

解析 `target`，创建 `element`，渲染目录列表并绑定滚动事件。该方法不会自动挂载根节点。

```js
toc.build();
document.querySelector('.article-sidebar').appendChild(toc.element);
```

| 项     | 说明          |
| ------ | ------------- |
| 参数   | 无            |
| 返回值 | 当前 Toc 实例 |

### `refresh()`

重新扫描标题并写入 `state.items`。列表由 keyed `For` 更新，适合内容区域动态变化后调用。

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

销毁实例，取消 pending RAF，移除事件监听，释放 owned view，并移除组件创建的根节点。

```js
toc.destroy();
```

| 项     | 说明   |
| ------ | ------ |
| 参数   | 无     |
| 返回值 | `void` |

公共控制器方法还包括 `mount()`、`unmount()`、`setState()`、`own()`、`use()`、`on()`、`off()` 和 `emit()`，语义见 [Functional Component Runtime](./component.md)。

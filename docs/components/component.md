# Component

Component 是所有 vanilla-jui 组件的基类，提供响应式状态管理、生命周期钩子、插件系统和事件总线。子类继承后可直接使用这些能力，无需重复实现。

源码位于 `src/core/Component.js`。

## 导入

```js
import Component from 'vanilla-jui/core';
```

## 构造器

```js
constructor(props = {})
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `props` | `object` | 初始属性配置 |

构造器自动完成以下初始化：

| 属性 | 初始值 | 说明 |
|------|--------|------|
| `this.props` | `props` | 组件属性配置 |
| `this.state` | `createDeepStore({})` | 响应式状态存储 |
| `this.dom` | `{ root: null }` | DOM 引用容器 |
| `this.cleanup` | `{ events, plugins }` | 资源清理管理器 |
| `this.runtime` | `{ destroyed: false }` | 运行时标记 |
| `this.plugins` | `new Map()` | 已安装插件 |

## 实例属性

### root

```js
get root(): HTMLElement | null
set root(value: HTMLElement): void
```

组件的根 DOM 元素，代理 `this.dom.root`。

### state

```js
this.state  // DeepStore (reactive)
```

基于 `vanilla-signal` 的深层响应式状态存储。直接读写 `this.state.xxx` 即可触发响应式更新。

### props

```js
this.props  // object
```

组件的属性配置对象。非响应式，更新需调用 `update()`。

### destroyed

```js
this.runtime.destroyed  // boolean
```

实例是否已销毁。销毁后 `setState()`、`update()` 等方法会抛出异常。

## 实例方法

### setState

批量更新响应式状态。支持两种调用方式。

```
setState(keyOrPatch, value?) → this
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyOrPatch` | `string \| object` | 状态键名或键值对补丁 |
| `value` | `*` | 当第一个参数为字符串时的状态值 |

```js
// 单个键值
component.setState('visible', true);

// 批量更新
component.setState({ loading: false, data: result });

// 链式调用
component.setState({ a: 1 }).setState({ b: 2 });
```

内部使用 `flushSync` 确保同步批量更新。

### update

合并新的属性配置，触发更新生命周期。

```
update(propsPatch?, options?) → this
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `propsPatch` | `object` | `{}` | 要合并的属性补丁 |
| `options.force` | `boolean` | `false` | 是否强制更新（由子类处理） |

```js
component.update({ collapsible: true });
component.update({ active: 2 }, { force: true });
```

触发顺序：`beforeUpdate` → `onUpdate()` → `afterUpdate`。

### init

初始化组件。合并属性、调用 `onInit` 钩子、触发 `init` 事件。

```
init(props?) → this
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `props` | `object` | 要合并的属性 |

```js
component.init({ active: 0 });
```

已销毁的实例调用会抛出 `Error`。

### destroy

销毁组件实例。调用 `onDestroy` 钩子、触发 `destroy` 事件、清理所有插件和事件。

```
destroy(): void
```

```js
component.destroy();
```

销毁后实例不可再使用。重复调用安全（幂等）。

## 生命周期钩子

子类可重写以下方法，在对应阶段执行自定义逻辑：

| 钩子 | 触发时机 | 参数 |
|------|---------|------|
| `onInit(props)` | `init()` 调用时 | 合并后的 props |
| `onUpdate(propsPatch, options)` | `update()` 调用时 | 补丁和选项 |
| `onDestroy()` | `destroy()` 调用时 | 无 |

```js
class MyComponent extends Component {
  onInit(props) {
    this.state = createDeepStore({ count: 0 });
    this.bindEvents();
  }

  onUpdate(patch, { force }) {
    if (patch.count !== undefined) this.syncDOM();
  }

  onDestroy() {
    this.unbindEvents();
  }
}
```

## 事件系统

### on

注册生命周期或自定义事件监听器。

```
on(event, callback) → this
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `event` | `string` | 事件名 |
| `callback` | `Function` | 回调函数 |

```js
component.on('afterUpdate', (patch) => {
  console.log('updated', patch);
});
```

内置事件：`init`、`beforeUpdate`、`afterUpdate`、`destroy`。

### off

移除事件监听器。

```
off(event, callback) → this
```

```js
component.off('afterUpdate', myCallback);
```

### emit

触发指定事件。

```
emit(event, ...args) → this
```

```js
component.emit('custom-event', data);
```

## 插件系统

### use

安装实例插件。插件可以是函数或含 `install` 方法的对象，返回清理函数。

```
use(plugin, options?) → this
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `plugin` | `Function \| { install }` | 插件 |
| `options` | `*` | 传给插件的配置 |

```js
// 函数插件
function logger(instance) {
  console.log('created', instance);
  return () => console.log('destroyed', instance);
}
component.use(logger);

// 对象插件
const analytics = {
  install(instance, options) {
    instance.on('afterUpdate', () => track('update'));
    return () => { /* cleanup */ };
  },
};
component.use(analytics, { track: true });
```

组件销毁时自动调用所有插件的清理函数。

### useGlobal（静态）

注册全局插件，之后创建的所有组件实例会自动安装。

```
Component.useGlobal(name, plugin): void
```

```js
Component.useGlobal('logger', loggerPlugin);

// 后续所有新实例自动拥有 logger 插件
const a = new Accordion(false, { items });
// a 已安装 logger 插件
```

## 子类典型模式

```js
import { createDeepStore, flushSync } from 'vanilla-signal';
import Component from '../core/Component.js';
import { resolveProps } from '../utilities/core.js';

const MY_SCHEMA = {
  id: { default: null, types: ['string', 'null'] },
  active: { default: 0, type: 'number' },
};

class MyWidget extends Component {
  constructor(input = {}) {
    const props = resolveProps(input, MY_SCHEMA, 'MyWidget');
    super(props);

    this.dom = { ...this.dom, header: null, body: null };
    this.state = createDeepStore({
      active: props.active,
      loading: false,
    });

    this.onInit(props);
  }

  onInit(props) {
    this.buildDOM();
    this.bindEvents();
  }

  onDestroy() {
    this.unbindEvents();
    this.dom.header = null;
    this.dom.body = null;
  }
}
```

# Reactive UI Architecture Standard

本文档定义 vanilla-jui 的组件架构、响应式视图机制、DOM 边界和实现规范。新组件必须遵循本文档；已有组件在重构时以本文档为最终标准，不保留与标准冲突的内部实现。

## 设计目标

vanilla-jui 是基于 `vanilla-signal` 的细粒度响应式 UI 组件库。组件使用者应主要关心数据、状态、模板和行为，不需要维护组件内部 DOM。

架构优先级依次为：

1. 状态是业务行为的唯一真相来源。
2. 视图由状态声明式派生，不维护第二份 DOM 状态。
3. 根节点和 keyed 子节点在无结构变化时保持身份稳定。
4. DOM 更新范围与实际状态依赖范围一致。
5. 测量、焦点、滚动和动画等命令式能力被限制在 DOM effect 边界。
6. 生命周期、owner 和资源清理由公共基础设施统一管理。
7. 公共抽象必须减少组件复杂度，不为理论完整性增加间接层。

## 单向数据流

组件的标准数据流是：

```text
用户事件 / 公共方法
        -> action
        -> state
        -> memo / selector
        -> view binding
        -> DOM
```

DOM 不能反向成为业务状态来源。事件目标和布局测量可以作为输入，但必须先转换为明确的 action 或布局状态，再由 state 驱动视图。

禁止以下模式：

```text
DOM dataset -> 计算 active item
DOM children.length -> 计算业务数据数量
DOM class -> 判断组件状态
state watcher -> 清空并重建整个组件 DOM
```

正确做法是从 `state.data`、稳定 key 和派生状态计算 active、index、count、disabled 等业务值。DOM 引用只用于无法声明化的浏览器能力。

## 组件职责

### props

`props` 是经过 schema 解析后的创建配置，保存不需要在实例生命周期内响应式变化的内容，例如 className、行为策略、模板插槽和回调。

需要在运行期间驱动 UI 的值必须进入 `state`。改变结构性 props 时，使用明确的重新创建流程，不在 props 与 state 之间建立双向同步。

### state

`state` 使用 `createDeepStore` 创建，是组件业务状态的唯一真相来源。

state 可以包含：

- 数据：`data`、`items`、`fields`、`content`。
- 交互状态：`active`、`visible`、`disabled`、`loading`。
- 必须被视图观察的布局状态：`width`、`offset`、`dragging`。

以下内容不进入 state：

- DOM 节点和 Observer 实例。
- timer、RAF ID、AbortController。
- 可由其它 state 同步计算得到的重复值。
- 仅用于算法执行过程的临时数组或日志。

派生值优先使用 `createMemo`、`createSelector` 或纯函数。不要通过 effect 把一个 state 字段持续复制到另一个 state 字段。

### view

`view()` 描述组件模板，在一个 build 生命周期内只执行一次。它返回稳定根节点，并在创建过程中建立细粒度绑定。

- 动态属性、文本、class 和 style 使用 accessor。
- 条件内容使用 `Show` 或直接的局部动态 child。
- 数组内容使用 `For`/`bindList`，并提供业务稳定 key。
- 不把裸动态 accessor 放进静态 children 数组；当前 JSX 归一化数组时会立即求值。动态数组区域使用 `For`，动态区域内部再返回条件节点。
- 组件内容不接受 HTML 字符串。字符串始终按文本渲染；需要 DOM 结构时传 JSX、`Node`、`DocumentFragment`、数组，或函数返回这些值。
- 组件 view 不得在内容渲染路径中隐式解析字符串、写入 `innerHTML`，或通过通用归一化工具把字符串扩展为 HTML 节点。
- 事件处理器只调用 action 或公共方法，不直接维护视图。
- 不使用 `render(() => view(), host)` 创建组件根节点；这会把整个 view 变成可替换动态区域。

组件视图必须在 `createRoot` owner 内创建。公共 owned-view 工具负责创建 owner、执行一次 view factory，并在组件销毁时释放所有绑定和事件。

根节点所有权必须明确：组件自产生的根节点默认由组件拥有，`destroy()` 时移除；绑定业务方既有根节点时声明 `ownsElement: false`，销毁只释放组件增加的行为和附加节点，不删除业务根节点。

### refs

refs 是非响应式 DOM 引用，只服务于 DOM effect 和必要的浏览器 API。refs 不是 view model，也不需要与 state 同构。

- 稳定节点使用单一 ref。
- keyed 列表中确实需要命令式访问的节点使用 keyed ref map。
- 节点删除时必须同步删除 ref。
- 业务逻辑不能通过 refs、dataset、class 或 DOM 顺序计算状态。
- 组件使用者默认只接触稳定的 `element`，不依赖内部 refs。

### runtime 与 cache

`runtime` 保存生命周期标记和不可观察的执行状态，例如 `built`、`mounted`、RAF ID、AbortController 和 pointer 日志。

`cache` 只保存有明确失效策略的非响应式缓存，例如异步面板结果和初始状态快照。普通派生值不能因为实现方便而放进 cache。

## DOM 操作分类

DOM 操作统一分为以下几类：

| 类型                        | 标准机制                                      |
| --------------------------- | --------------------------------------------- |
| 元素和静态结构              | `jsx`/`h`                                     |
| 属性、文本、class、style    | accessor binding                              |
| 条件结构                    | `Show`/局部动态 children                      |
| 列表增删与排序              | keyed `For`/`bindList`                        |
| 事件                        | JSX event 或稳定根节点事件委托                |
| 挂载与销毁                  | 控制器的 `mount/unmount/destroy`              |
| Portal                      | 公共 portal effect                            |
| 尺寸和位置测量              | layout effect、ResizeObserver                 |
| 焦点、滚动、pointer capture | DOM effect                                    |
| 动画与 presence             | Motion API + state binding + `createPresence` |

前六类属于通用视图层。后四类是不可避免的命令式 DOM effect，必须集中在语义明确的方法或工具中，并具备清理函数。

### RenderableContent 安全边界

`RenderableContent` 遵循 `vanilla-signal` children 语义，不扩展 HTML 字符串语义：

- `string`、`number` 和 `boolean` 作为文本值处理。
- `Node`、`Element`、`DocumentFragment`、数组和函数返回值可以作为结构化内容。
- HTML 字符串不是组件内容类型，组件不得为了“方便”自动解析。

原因有两点：

1. 这与 `vanilla-signal` 的数据驱动 children 模型一致，避免重新创建节点数组导致隐藏 DOM 更新。
2. 隐式 HTML 解析会引入 XSS 风险，破坏组件内容输入的安全边界。

如果未来确实需要渲染富文本，应设计独立、显式、可审计的安全 API，并明确净化策略；不能复用普通组件内容参数承载 HTML 字符串。

## 函数式组件运行时

vanilla-jui 不使用组件基类和继承。`defineComponent()` 负责所有组件共有且可以严格定义的机制：

- props、deep state、runtime 和插件初始化。
- owned view 的创建和释放。
- 稳定 `element` 暴露。
- 显式 `build()`、`mount(container)`、`unmount()` 和 `destroy()` 生命周期。
- effect、事件、插件和其它资源的统一清理。
- `setState()` 的归一化、校验与批处理。
- 返回由 state、lifecycle 和组件 actions 组合而成的控制器对象。

`defineComponent()` 不负责：

- 猜测组件模板。
- 自动把 props 复制到 state。
- 通用地监听整个 state 并重渲染。
- 代替组件定义业务 action 或派生状态。
- 对所有组件强制相同的 DOM effect。

组件工厂在一个词法作用域内创建 props、state、memo、refs、actions、view 和 effects。DOM refs 保留在闭包内，只有稳定 `element` 由运行时公开。

组件可以是三种形态：

1. 视图组件：Accordion、Menu、Pagination、Tabs、Form，主要使用声明式 view。
2. 交互组件：Modal、Offcanvas、Swiper，在声明式 view 外包含布局或动画 effect。
3. DOM 行为控制器：Toc、Sticky、Drop、Tooltip，围绕已有 DOM 工作，不伪装成纯数据视图。

不同形态共享函数式生命周期和资源管理，但不强制共享不适合其职责的渲染策略。禁止为复用实现而恢复基类、抽象类、mixin 或依赖 `this` 的伪继承控制器。

## 构建和挂载契约

`build()` 创建 owned view，但不自动插入文档。`mount(container)` 是推荐的使用方式，它调用 `build()` 并把稳定 `element` 插入指定容器。`unmount()` 只移除节点，保留 state 和响应式 owner；`destroy()` 同时释放 owner、effect、事件、插件和节点。

必须满足以下不变量：

- `build()` 幂等。
- 任意 state 更新前后，根节点对象身份不变。
- 已挂载组件在 state 更新后仍位于原容器。
- `unmount()` 后可以再次 `mount()`。
- `destroy()` 幂等，销毁后不能重新 build 或更新 state。
- owner 创建的 effect 和事件在 destroy 后不再运行。

## 动画与 Presence

动画必须分离“状态生命周期”、“时间插值”和“静态外观”三种职责：

- JS 管理挂载、激活、失活、卸载和并发操作失效。
- state 只表达组件是否激活，例如 `visible`；view 把它绑定到 `aria-*`、`data-*`、class 或 style。
- Motion 层只管理 keyframes、timing、方向性播放、取消和完成信号。
- CSS 管理静态外观、主题，以及稳定挂载节点的 hover/focus 等局部 transition。
- 同一组 motion 属性只能有一个时间源：要么由 `createTransition` 的 Web Animations 定义，要么由 CSS 定义，不能双写。
- 库组件的入场、离场、展开、收起等行为动画必须优先使用 Motion API，不得依赖默认 className 或 `style.css`。
- 用户覆盖 className 或完全不引入 `style.css` 时，组件的行为、动画时序和生命周期仍必须完整；用户 CSS 只负责布局与外观。

需要入场和离场保留 DOM 的组件使用 `createPresence()`：

```text
enter: mount -> commit initial styles -> activate -> await motion
leave: deactivate -> await motion -> unmount
```

初始样式提交是必要的布局边界。节点若在同一次样式提交中完成 mount 和 activate，浏览器只会观察到最终状态，CSS transition 不会产生。Presence 在所有 mount 写入完成后只执行一次布局提交，再由响应式 state 激活视图，禁止组件各自使用 10ms timeout、双 RAF 或随机 reflow 修补。

Presence 使用 `flushSync` 同步提交 `activate/deactivate` 中的响应式视图绑定。组件只需同步写 state，不重复调用 `flushSync`。

需要编程化、可离场后卸载的库内行为动画，优先使用 `createTransition`。它按 enter/leave 当前方向创建 Web Animation，leave 使用反向 keyframes，Presence 直接等待 `Animation.finished`，不再从 CSS 反向探测时序。纯 CSS 方案仍可不传 `motion`：Presence 会等待根节点的有限 CSS Animation/Transition，并在不支持 `getAnimations()` 时使用 computed-style 回退。

Presence 使用操作序列处理反向交互。进入过程中关闭，或离开过程中重开时，旧操作可以自然结束，但不得再提交 `visible` phase、执行卸载或触发过期生命周期回调。

`createPresence` 只用于依赖 DOM presence 的交互组件，不进入 `defineComponent` 基础运行时。Accordion 等稳定挂载组件不需要 Presence，但可以使用 `createCollapseTransition` 等专用 Motion controller，把响应式状态投影为可取消、可反向的行为动画。

当前 Modal、Offcanvas 和 Toast 均使用 Web Animations motion，并由 presence 管理挂载。Toast 的自动关闭 `duration` 是业务停留时间，与 motion duration 是两个概念。Swiper 轨道、Parabola 连续运动、Drop 显隐延迟，以及稳定挂载节点的局部 transition 不属于 presence，应保留各自的布局、输入调度或业务语义。

## 调度原则

`vanilla-signal` 已提供依赖追踪、batch、memo、selector 和 effect 调度。普通属性更新不增加额外调度层。

公共 scheduler 只用于：

- 合并同一轮中的昂贵布局读取或写入。
- 协调 ResizeObserver、pointer move、scroll 和 animation frame。
- 把非关键更新安排到 microtask、animation frame 或 transition。
- 迁移仍使用命令式结构同步的旧组件。

调度器不能解决视图协调问题。不要依靠 store 根对象版本监听深层数据，也不要通过深度 snapshot 触发全量 DOM 重建。

## 性能标准

- 单字段变化只更新依赖该字段的绑定。
- keyed 数据项未删除时保留其 DOM 身份和局部状态。
- 列表更新不重复绑定稳定根节点事件。
- 高频 pointer/scroll 输入每帧最多执行一次布局写入。
- 布局读取与写入分阶段执行，避免交替触发布局。
- 不在 render/effect 中无条件执行深 clone、深 unwrap 或全树查询。
- 异步内容使用 token 或 AbortController 防止过期结果写入。

只有基准或真实交互证明需要时，才引入更复杂的列表算法。链表、LIS 和任务优先级属于底层实现选择，不能泄漏到组件业务代码。

## 测试标准

每个状态驱动组件至少覆盖：

1. build 不自动挂载，mount 正确挂载。
2. state 更新后 root 身份和父节点保持不变。
3. 替换数组、数组变异和嵌套项字段变异都能更新视图。
4. keyed 项在无关更新后保持节点身份。
5. 业务状态不依赖 DOM dataset、class 或节点数量。
6. unmount 后可重新 mount。
7. destroy 后 effect、事件、timer 和异步结果不再生效。
8. 复杂组件覆盖测量为零、隐藏、重新连接和快速连续交互。
9. presence 组件覆盖初始样式提交、等待真实 motion、反向操作和离场后卸载。

单元测试通过后，必须在独立 `test-jui` 项目进行可视化半自动测试，覆盖真实布局、拖拽、焦点、动画、Portal、响应式数据修改和销毁重建。

## 审计清单

提交组件代码前检查：

- 是否存在 `render(() => view())` 整块替换。
- 是否存在 `textContent = ''` 后重建整个响应式列表。
- 是否从 `dom`/refs 计算 active、index、count 或 disabled。
- 是否为列表提供稳定业务 key。
- 是否把 DOM、timer 或 controller 放进 state。
- 是否在 effect 中读取了不应成为依赖的状态。
- 是否由 owner 统一清理所有响应式绑定。
- 是否验证了 root 身份、挂载关系和嵌套 state 更新。
- 是否由 CSS 定义 motion，并由 presence 等待实际动画后再卸载。
- 是否仍存在用硬编码 timeout 猜测 CSS transition 结束的逻辑。

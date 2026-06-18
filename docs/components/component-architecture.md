# Component Architecture

本项目可以和 `vanilla-signal` 深度协作，但并不是每个组件都适合由 signal 完全接管渲染。判断标准主要看状态复杂度、DOM 更新频率、是否需要 headless 状态机，以及组件是否天然依赖浏览器事件和尺寸计算。

## 完全基于 vanilla-signal

这些组件适合用响应式 store 和 render 管理内部 UI，因为状态联动复杂、异步流程多，或者需要把状态暴露给外部组合。

| 组件    | 理由                                                                                |
| ------- | ----------------------------------------------------------------------------------- |
| `Modal` | 标题、内容、表单、loading、visible、Flow adapter 多区域联动，适合 signal 管理。     |
| `Flow`  | 本质是 headless 状态机，步骤、缓存、异步 hook、回滚和默认 UI 都适合响应式状态驱动。 |

## 轻量命令式 + signal 友好

这些组件内部保持直接 DOM 操作更简单、更稳定；对 signal 项目的友好性体现在接收 `Node`、`Node[]`、函数内容或 JSX 产物，而不是内部必须使用 `render()`。

| 组件        | 理由                                                                     |
| ----------- | ------------------------------------------------------------------------ |
| `Accordion` | 状态只是展开项集合，更新 class/ARIA 即可；动态创建时支持 JSX/Node 内容。 |
| `Tabs`      | 核心是 tab/panel class 切换和拖拽滚动，不需要响应式渲染接管。            |
| `Menu`      | 主要是事件委托和子菜单 DOM 操作，适合命令式。                            |
| `Drop`      | 依赖定位、视口尺寸、hover/click 事件和浮层生命周期，命令式更直接。       |
| `Tooltip`   | Drop 的轻封装，适合命令式。                                              |
| `Offcanvas` | 依赖 body class、滚动锁、动画类名和全局事件，命令式更清晰。              |
| `Popup`     | 轻量弹层，只需显示/隐藏和内容替换，不需要 signal render 接管。           |
| `Toast`     | 静态工具型消息队列，DOM 创建和定时移除即可。                             |

## 命令式组件

这些组件天然围绕浏览器 API、动画帧或表单元素工作，保持命令式更合适。

| 组件        | 理由                                                            |
| ----------- | --------------------------------------------------------------- |
| `Parabola`  | requestAnimationFrame 驱动的坐标动画，响应式状态没有明显收益。  |
| `Swiper`    | 触摸/鼠标事件、transform、loop clone 和 autoplay 定时器为核心。 |
| `Theme`     | 管理 documentElement class、Cookie 和全局点击事件。             |
| `Validator` | 直接绑定表单控件、校验 class 和 help-block。                    |

## 无状态工具组件

这些模块不维护实例状态，也不需要 signal store；只需要输出可直接用于 JSX/DOM 的值。

| 组件    | 理由                                                                |
| ------- | ------------------------------------------------------------------- |
| `Icons` | `icon(name)` 返回 SVGElement，可直接作为 JSX children 或 DOM 使用。 |

## 公共约定

- 内容型组件应优先使用 `utilities/dom.js` 中的 `isRenderableContent()` 和 `normalizeContentNodes()`。
- 动态创建可以使用 `vanilla-signal` 的 `jsx/html` 作为 DOM 创建工具。
- 只有真正需要响应式依赖追踪和自动重渲染时，才使用 `createDeepStore`、`createRoot`、`render`。
- 所有带事件、定时器或动画帧的组件都必须在 `destroy()` 中清理。
- 构造器里的 DOM 能力判断应优先使用 `canRenderDOM()`、`isElement()`、`getEl()` 等公共 utilities，避免组件散落重复的浏览器环境判断。
- 组件内部不维护 `static instances`；需要批量销毁时，由使用方在业务层保存实例列表并逐个调用 `destroy()`。

## 本轮优化落点

| 组件                                | 优化                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `Accordion`                         | 改为轻量命令式实现，保留 JSX/Node/函数内容能力，直接同步 class、ARIA 和 `hidden`。       |
| `Tabs`                              | 动态标题与内容改用统一内容归一化逻辑，并补充 DOM 环境和 Element 判断。                   |
| `Menu`                              | 修复 `setItems()` 通过 `destroy()` 重建导致实例引用丢失的问题，抽出事件解绑和 teardown。 |
| `Drop` / `Tooltip`                  | 构造器改用公共 DOM 判断工具，内容统一支持可渲染值。                                      |
| `Popup` / `Offcanvas`               | 内容统一支持可渲染值，并加强隐藏定时器和销毁清理。                                       |
| `Theme`                             | 补齐实例登记和 DOM 环境保护。                                                            |
| `Parabola` / `Swiper` / `Validator` | 补齐事件、定时器或动画帧清理路径。                                                       |

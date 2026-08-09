# Core

`src/core/` 承载 vanilla-jui 的底层组件机制。它们不是普通工具函数，而是组件架构的
公共基础设施：稳定 view owner、函数式组件运行时、调度、Presence 生命周期和 Motion
时间线。

| 模块                                    | 主要职责                             |
| --------------------------------------- | ------------------------------------ |
| [component](../components/component.md) | `defineComponent()` 函数式组件运行时 |
| [view](view.md)                         | 独立 reactive owner 中的稳定视图     |
| [scheduler](scheduler.md)               | 微任务级合并调度                     |
| [motion](motion.md)                     | Web Animations 控制器                |
| [presence](presence.md)                 | 入场挂载、离场卸载的生命周期协调     |

使用原则：

- 组件根 view 在一次 build 生命周期内只创建一次。
- 列表结构使用 keyed `For`，数据变化直接表达为响应式 state 变化。
- DOM effect、动画和调度必须由组件生命周期或 owner 清理。
- 普通跨组件辅助函数仍放在 `src/utilities/`。

# Utilities

`src/utilities/` 只承载可跨组件复用的原子能力。除 `class-name.ts` 外，
下列模块均由 `vanilla-jui` 包根入口导出。

| 模块                        | 主要职责                               |
| --------------------------- | -------------------------------------- |
| [browser](browser.md)       | 移动环境判定、剪贴板复制               |
| [class-name](class-name.md) | 内部 class token 拼接                  |
| [dom](dom.md)               | DOM 引用解析、内容归一化、查询、懒渲染 |
| [events](events.md)         | DOM 事件绑定与实例级清理               |
| [http](http.md)             | JSON POST、WordPress REST 根地址       |
| [id](id.md)                 | UUID 与短随机 ID                       |
| [object](object.md)         | plain object 判定                      |
| [refs](refs.md)             | 单元素和按 key 的元素引用              |
| [state](state.md)           | 响应式 store 追踪、快照与命令式同步    |
| [timer](timer.md)           | 按 key 替换的 timeout                  |
| [types](types.md)           | 类型谓词、schema 校验与 props 解析     |

使用原则：声明式 UI 直接读取响应式 state；只有事件、测量、网络、动画和第三方
命令式 API 等副作用才进入 utilities。任何返回清理函数或控制器的工具，都应由组件
生命周期显式释放。

组件运行时、视图 owner、调度、Presence 和 Motion 属于底层核心机制，见
[Core](../core/README.md)。

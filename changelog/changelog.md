# 更新日志

## 1.5.6

- 升级 `vanilla-signal` 至 `^1.1.14` 版本，并调整组件 JSX 调用以适配其更严格的 DOM 元素类型定义。
- 为上下文组件内容添加类型化的可渲染边界，使内部状态驱动的渲染函数能够与 `vanilla-signal` 可渲染对象保持兼容。
- 收紧 Form 控件的值处理逻辑，涵盖 text、number、textarea、select、option、label、help 和 button 内容，同时保持状态作为运行时的唯一真实来源。
- 更新主题 Cookie 回归测试覆盖范围，以适配当前的 `vanilla-create-storage` 记录格式。

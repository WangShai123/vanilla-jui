# JUI Library

A lightweight vanilla UI library for building user interfaces.

## todo

- 增加父类 Component
- 公共属性和方法，如
  - state
  - setState
  - 等
- 探索组件之间的通信方式

重构当前项目：
1，建议增加父类 Component，每个组件都有this.state、this.props、setState()等（请分析必要性，若没有必要，请忽略）。
2，请设计和构建插件体系，支持插件化开发和功能扩展（如果需要结合父类Component，请考虑继承关系。若没有必要，请忽略）。
3，this.options 改为 this.props
4，把所有components当做一个项目整体，尽量提高抽象设计和复用性，减少重复代码
5，避免过度验证

从 Modal 组件开始：
1，this.dom 仅需暴露root。因为其他属性没有使用场景。
2，api:
-open()
-hide()
-setFields(data,force)，增加force参数，默认false，当true时，强制设置和刷新表单UI。
-addFields(data)，数据提交时，额外添加表单数据。
-setContent(content,force)，增加force参数，默认false，当true时，即使是表单模式，也允许setContent，替换内容。用于表单提交成功后，重新设置内容。
-reset()
-resetFields()
-resetContent()
-update(props,force)，增加force参数，默认false，当true时，即使是表单模式，也允许update content prop.
-destroy
3，setState({})把原(key,value)参数修改为({key:value})，支持批量修改。
4，支持通过实例设置的方式进行交互，如 editModal.state.visible = true 等同于 editModal.show()；editModal.state.loading = true。
5，实例化参数新增text:object，把文案相关统一到text对象中：

- text.title
- text.confirm
- text.cancel
- text.back
- text.ok

6，this.state增加2个响应属性: text:object, fullscreen:boolean
7，移除back,next在footer中的dom输出。不符合使用场景。主要通过data-action属性来自定义控制，写入自定义content DOM中，或者直接利用flow传递UI。

注意：请先分析需求，形成plan。中间获取我们会形成修改建议。待我们共同确认最后方案后，下一步才可开始编码。

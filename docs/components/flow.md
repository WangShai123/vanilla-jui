# Flow

Flow 是一个流程状态控制器，提供步骤切换、数据缓存、异步 hook、错误回滚、busy 防重入和可选默认 UI。它既可以直接渲染为 `.j-flow`，也可以设置 `render: false` 只使用状态机能力，由业务完全自定义界面。

Flow 只导出工厂函数：

```js
import { createFlow } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

实例创建后不会自动创建 DOM，也不会自动挂载。默认 UI 需要显式 `build()`，再手动把 `flow.element` 挂载到容器。

```js
const flow = createFlow({
  steps: [
    { id: 'account', title: 'Account', content: 'Account content' },
    { id: 'profile', title: 'Profile', content: 'Profile content' },
    { id: 'confirm', title: 'Confirm', content: 'Confirm content' },
  ],
});

flow.build();
document.querySelector('#flow-root').appendChild(flow.element);
```

## 设计模型

Flow 把复杂流程拆成四层：

| 层级       | 作用                                                       |
| ---------- | ---------------------------------------------------------- |
| `steps`    | 静态步骤定义，包含 `id/title/content/data/modal` 与 hooks  |
| `state`    | 响应式运行时状态，包含当前步骤、历史、数据、loading、error |
| `snapshot` | 对外消费的不可变快照，适合渲染、日志、hook 判断            |
| `dom`      | 默认 UI 的 DOM 引用；headless 模式下保持为空               |

`next(payload)`、`back(payload)` 和 `goTo(target, payload)` 会把 payload 写入“离开的当前步骤”。当 `cache: true` 时，payload 也会合并进全局 `data`，适合多步表单最终统一提交。

## 默认 UI

默认 UI 的 DOM 结构固定为：

```html
<div class="j-flow" data-flow="root">
  <div class="flow-header" data-flow-header>
    <ol class="flow-steps" data-flow-steps></ol>
  </div>
  <div class="flow-body" data-flow-body></div>
  <div class="flow-footer" data-flow-footer></div>
</div>
```

`.j-flow` 下只有 `.flow-header`、`.flow-body`、`.flow-footer` 三个直接子元素。header 中只渲染步骤条 `.flow-steps`；Flow 没有独立的 header title 或 description。步骤标题渲染在 `.flow-step-title`。

默认 UI 内置：

| 区域   | 行为                                                           |
| ------ | -------------------------------------------------------------- |
| header | 渲染步骤条；`linear: true` 时不能点击未来步骤                  |
| body   | 渲染当前 step 的 `content`                                     |
| footer | 渲染 reset/back/next 按钮，并用 `data-action` 保留动作语义     |
| a11y   | root/body 同步 `aria-busy`，当前步骤设置 `aria-current="step"` |

## Headless 使用

设置 `render: false` 后，`build()` 只标记实例已构建，不创建默认 DOM。业务可以通过 `subscribe()` 渲染任意 UI。

```js
const flow = createFlow({
  render: false,
  steps: [
    { id: 'username', title: 'Username' },
    { id: 'email', title: 'Email' },
    { id: 'done', title: 'Done' },
  ],
}).build();

const unsubscribe = flow.subscribe((snapshot) => {
  view.textContent = `${snapshot.currentId}: ${JSON.stringify(snapshot.data)}`;
});

await flow.next({ username: 'alice' });
await flow.next({ email: 'alice@example.com' });

unsubscribe();
```

`subscribe(handler)` 会立即用当前快照执行一次 handler。步骤变化、`loading` 开始/结束、`setData()`、`setStepData()`、`reset()`、错误状态变化都会触发变更通知。

## 自定义默认 UI

如果仍想使用 `.j-flow` 容器，但替换部分区域，可使用 `renderHeader`、`renderBody`、`renderFooter`。slot 返回 `false` 或配置为 `false` 时，该区域内容为空，但三段 DOM 结构仍保留。

```js
const flow = createFlow({
  steps,
  renderHeader: ({ snapshot }) => `Step ${snapshot.currentIndex + 1}`,
  renderBody: ({ currentStep, data }) => {
    return `${currentStep.title}: ${JSON.stringify(data)}`;
  },
  renderFooter: ({ snapshot, back, next }) => [
    snapshot.canBack
      ? jsx('button', {
          type: 'button',
          className: 'j-button is-ghost',
          onClick: () => void back(),
          children: 'Back',
        })
      : null,
    jsx('button', {
      type: 'button',
      className: 'j-button is-primary',
      onClick: () => void next(),
      children: snapshot.isLast ? 'Finish' : 'Next',
    }),
  ],
});
```

slot context 包含 `flow`、`snapshot`、`state`、`steps`、`currentStep`、`currentData`、`data`、`next()`、`back()`、`goTo()`、`reset()` 和 `fallback()`。

## Step 配置

| 参数       | 类型                                                    | 说明                                           |
| ---------- | ------------------------------------------------------- | ---------------------------------------------- |
| `id`       | `string`                                                | 步骤 id，必须唯一                              |
| `title`    | `string`                                                | 步骤标题，默认 UI 显示在 `.flow-step-title`    |
| `content`  | `string \| number \| Node \| Array \| Function \| null` | 默认 body 内容                                 |
| `data`     | `object`                                                | 步骤初始缓存数据                               |
| `modal`    | `object \| Function \| null`                            | 给 Modal 适配层消费的步骤视图配置              |
| `onEnter`  | `Function`                                              | 进入步骤后触发                                 |
| `onLeave`  | `Function`                                              | 离开步骤前触发                                 |
| `onNext`   | `Function`                                              | 当前步骤 next 时触发，可返回目标步骤 id 或数据 |
| `onBack`   | `Function`                                              | 当前步骤 back 时触发，可返回目标步骤 id 或数据 |
| `canEnter` | `Function`                                              | 返回 `false` 时阻止进入                        |
| `canLeave` | `Function`                                              | 返回 `false` 时阻止离开                        |

`content` 函数接收 Flow context。用于 Modal 时，推荐把 Modal 专属内容写在 `modal` 中，避免把 Flow context 内容函数交给 Modal 渲染。

## Hook 返回值

`onNext` 和 `onBack` 可以返回：

| 返回值             | 行为                               |
| ------------------ | ---------------------------------- |
| `undefined`        | 使用默认目标步骤                   |
| `'step-id'`        | 跳转到指定步骤                     |
| `{ id, data }`     | 跳转到指定步骤，并用 `data` 写缓存 |
| `object` 或 `null` | 使用默认目标步骤，并作为 payload   |

示例：

```js
const flow = createFlow({
  steps: [
    {
      id: 'email',
      onNext: async ({ payload }) => {
        await api.sendCode(payload.email);
        return 'code';
      },
    },
    {
      id: 'code',
      onNext: async ({ payload }) => {
        const ok = await api.verifyCode(payload.code);
        if (!ok) return 'code';
        return { id: 'done', data: { verified: true } };
      },
    },
    { id: 'done' },
  ],
});
```

## 异步与错误

Flow 在 `next/back/goTo/finish` 运行期间会设置：

| 状态         | 说明                                      |
| ------------ | ----------------------------------------- |
| `loading`    | 当前是否有动作执行中                      |
| `busyAction` | 当前执行中的动作，可能是 `next/back/goTo` |
| `error`      | 最近一次 hook 或 guard 抛出的错误         |

重复动作由 `busyStrategy` 控制：

| 值       | 行为                            |
| -------- | ------------------------------- |
| `ignore` | 默认值，直接返回当前快照        |
| `throw`  | 抛出 `code` 为 `FLOW_BUSY` 的错 |

transition 失败时默认 `rollbackOnError: true`，会恢复到动作开始前的步骤和数据，并把错误写入 `state.error`。如果业务希望失败后停留在已经切换到的状态，可设置 `rollbackOnError: false`。

Flow 会为当前动作创建 `AbortController`，hook context 中的 `signal` 可传给 `fetch`。`destroy()` 会中止当前动作并执行通过 `addCleanup()` 注册的清理函数。

## Modal 组合

Flow 不依赖 Modal，Modal 也不内置 Flow 或 Form 适配层。需要流程弹窗时，由业务代码创建 Flow，并把当前步骤内容或外部 Form 实例挂载到 Modal 的 `content` 中；Modal 的按钮回调只负责调用 `flow.next()`、`flow.back()` 或外部 `form.requestSubmit()`。

表单步骤应显式创建 Form，并在提交成功后把数据交给 Flow：

```js
import { createFlow, createForm, createModal } from 'vanilla-jui';

const flow = createFlow({
  render: false,
  steps: [
    {
      id: 'account',
      title: 'Account',
      data: { type: 'form' },
    },
    {
      id: 'confirm',
      title: 'Confirm',
      data: { type: 'summary' },
    },
  ],
}).build();

const form = createForm({
  fields: [
    {
      type: 'email',
      payload: { label: 'Email', name: 'email', required: true },
    },
  ],
  buttons: false,
  onSubmit: async (data) => {
    await flow.next(data);
    modal.setState({ content: renderStep() });
  },
}).build();

const renderStep = () => {
  const snapshot = flow.snapshot();
  if (snapshot.currentId === 'account') return form.element;
  return `Email: ${snapshot.data.email}`;
};

const modal = createModal({
  content: renderStep,
  onConfirm: () => {
    if (flow.snapshot().currentId === 'account') form.requestSubmit();
    else modal.hide();
  },
  onCancel: async () => {
    if (flow.snapshot().canBack) {
      await flow.back();
      modal.setState({ content: renderStep() });
      return;
    }
    modal.hide();
  },
}).build();

modal.show();
```

这种组合方式让 Flow 只负责步骤、数据和动作时序，Form 只负责字段和校验，Modal 只负责弹层展示与确认/取消动作。

`step.modal` 仍可作为业务自定义元数据保存，但它不会被 Modal 自动消费。需要使用时，应由业务代码在 `renderStep()` 或 Modal 回调里读取并转换成对应的 `content`、按钮文案或其他初始化配置。

## Options

| 参数              | 类型                        | 默认值     | 说明                                  |
| ----------------- | --------------------------- | ---------- | ------------------------------------- |
| `id`              | `string \| null`            | 自动生成   | 默认 UI 根节点 id                     |
| `steps`           | `FlowStep[]`                | `[]`       | 步骤列表，不能为空                    |
| `initial`         | `string \| number \| null`  | `null`     | 初始步骤 id 或索引                    |
| `cache`           | `boolean`                   | `true`     | 是否把步骤 payload 合并到全局 `data`  |
| `linear`          | `boolean`                   | `true`     | 默认步骤条是否禁止跳到未来步骤        |
| `render`          | `boolean`                   | `true`     | 是否启用默认 UI                       |
| `rollbackOnError` | `boolean`                   | `true`     | transition 失败时是否回滚状态         |
| `busyStrategy`    | `'ignore' \| 'throw'`       | `'ignore'` | loading 中重复动作的处理策略          |
| `showBack`        | `boolean`                   | `true`     | 默认 footer 是否显示 back 按钮        |
| `showNext`        | `boolean`                   | `true`     | 默认 footer 是否显示 next/finish 按钮 |
| `showReset`       | `boolean`                   | `false`    | 默认 footer 是否显示 reset 按钮       |
| `text`            | `object`                    | `{}`       | `back/next/finish/reset` 文案配置     |
| `className`       | `object \| string`          | 默认类名   | 默认 UI 类名；字符串会追加到 root     |
| `renderHeader`    | `Function \| false \| null` | `null`     | 自定义 header 内容                    |
| `renderBody`      | `Function \| false \| null` | `null`     | 自定义 body 内容                      |
| `renderFooter`    | `Function \| false \| null` | `null`     | 自定义 footer 内容                    |
| `onChange`        | `Function \| null`          | `null`     | 状态变化后触发                        |
| `onNext`          | `Function \| null`          | `null`     | 全局 next hook                        |
| `onBack`          | `Function \| null`          | `null`     | 全局 back hook                        |
| `onFinish`        | `Function \| null`          | `null`     | 完成时触发                            |
| `onError`         | `Function \| null`          | `null`     | hook 或 guard 错误时触发              |
| `onBusy`          | `Function \| null`          | `null`     | 重复动作被拦截时触发                  |

## className

| 字段         | 默认值                 |
| ------------ | ---------------------- |
| `root`       | `j-flow`               |
| `header`     | `flow-header`          |
| `steps`      | `flow-steps`           |
| `step`       | `flow-step`            |
| `active`     | `is-active`            |
| `complete`   | `is-complete`          |
| `stepButton` | `flow-step-button`     |
| `stepIndex`  | `flow-step-index`      |
| `stepTitle`  | `flow-step-title`      |
| `body`       | `flow-body`            |
| `footer`     | `flow-footer`          |
| `button`     | `j-button`             |
| `reset`      | `is-ghost flow-reset`  |
| `back`       | `is-ghost flow-back`   |
| `next`       | `is-primary flow-next` |

传对象时会和默认类名合并，指定字段会替换默认值；传字符串时只追加到 `root`。

## 实例属性

| 属性          | 说明                                             |
| ------------- | ------------------------------------------------ |
| `props`       | 归一化后的初始化配置                             |
| `steps`       | 克隆后的步骤列表                                 |
| `state`       | 响应式状态对象                                   |
| `dom`         | 默认 UI DOM 引用，包含 `root/header/body/footer` |
| `runtime`     | 运行时标记，包含 `built/destroyed` 等            |
| `currentStep` | 当前步骤配置                                     |
| `currentData` | 当前步骤缓存数据                                 |
| `canBack`     | 当前是否可以返回                                 |
| `canNext`     | 当前是否可以前进                                 |
| `isLast`      | 当前是否最后一步                                 |

不提供 `root` getter。需要访问 DOM 时使用 `flow.element`。

## 实例方法

| 方法                                  | 说明                                                |
| ------------------------------------- | --------------------------------------------------- |
| `build()`                             | 构建实例；默认 UI 模式会创建 `flow.element`         |
| `next(payload?)`                      | 前进一步；最后一步会调用 `finish()`                 |
| `back(payload?)`                      | 返回上一步                                          |
| `goTo(target, payload?, options?)`    | 跳转到指定步骤 id 或索引                            |
| `setData(data)`                       | 合并全局数据                                        |
| `setStepData(stepId, data, options?)` | 合并指定步骤缓存；`silent` 为 true 时不触发变更通知 |
| `getStepData(stepId)`                 | 获取指定步骤缓存副本                                |
| `snapshot()`                          | 获取当前不可变快照                                  |
| `subscribe(handler)`                  | 订阅快照变化，返回取消订阅函数                      |
| `reset()`                             | 重置到初始步骤和初始数据                            |
| `finish(payload?, options?)`          | 完成流程并触发 `onFinish`                           |
| `destroy()`                           | 销毁实例、移除默认 UI、取消动作并执行清理           |

## Snapshot

| 字段            | 说明                            |
| --------------- | ------------------------------- |
| `id`            | Flow id                         |
| `currentId`     | 当前步骤 id                     |
| `currentIndex`  | 当前步骤索引                    |
| `previousId`    | 上一个步骤 id                   |
| `previousIndex` | 上一个步骤索引                  |
| `direction`     | 最近一次切换方向                |
| `history`       | 访问历史                        |
| `data`          | 全局数据副本                    |
| `stepData`      | 全部步骤数据副本                |
| `currentData`   | 当前步骤数据副本                |
| `currentStep`   | 当前步骤的公开配置，不包含 hook |
| `canBack`       | 是否可以返回                    |
| `canNext`       | 是否可以前进                    |
| `isLast`        | 是否最后一步                    |
| `loading`       | 是否有动作执行中                |
| `busyAction`    | 当前执行中的动作                |
| `error`         | 最近一次错误                    |

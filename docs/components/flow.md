# Flow

Flow 是一个 headless 流程控制器，带可选默认 UI。它负责步骤状态、`next/back/goTo`、数据缓存和生命周期；Modal、Offcanvas 或页面表单都可以复用同一个 Flow 实例。

推荐主 API 使用 `new Flow(options)`，这与现有组件实例模式一致；函数式项目也可以用等价的 `createFlow(options)`。

## 导入

```js
import { Flow, createFlow } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 页面中直接使用

```js
const flow = new Flow({
  steps: [
    {
      id: 'account',
      title: 'Account',
      description: 'Basic login information.',
      content: 'Step 1 content',
    },
    {
      id: 'profile',
      title: 'Profile',
      content: ({ currentData }) => `Name: ${currentData.name || ''}`,
    },
    {
      id: 'confirm',
      title: 'Confirm',
      content: ({ data }) => JSON.stringify(data),
    },
  ],
});

flow.mount('#flow-root');
```

默认 UI 只提供步骤条、内容区和 back/next/reset 按钮。复杂业务 UI 可以完全不调用 `mount()`，只订阅状态。

## Headless 使用

```js
const flow = createFlow({
  render: false,
  steps: [
    { id: 'base', title: 'Base' },
    { id: 'confirm', title: 'Confirm' },
  ],
});

const unsubscribe = flow.subscribe((snapshot) => {
  console.log(snapshot.currentId, snapshot.data);
});

await flow.next({ name: 'Alice' });
await flow.back({ checked: true });
unsubscribe();
```

`next(payload)` 和 `back(payload)` 会把 payload 缓存到“离开的当前步骤”。如果 `cache` 为 `true`，payload 也会合并到全局 `data`。

## 状态机防御

Flow 会在 `next/back/goTo/finish` 执行期间把 `loading` 设置为 `true`，并拒绝重复动作，避免异步 hook 竞态。

```js
const flow = new Flow({
  busyStrategy: 'ignore',
  steps,
  onBusy: (action, snapshot) => {
    console.log(`${action} ignored at ${snapshot.currentId}`);
  },
});
```

`busyStrategy` 支持：

| 值       | 行为                              |
| -------- | --------------------------------- |
| `ignore` | 默认值，重复动作直接返回当前快照  |
| `throw`  | 抛出 `code` 为 `FLOW_BUSY` 的错误 |

transition 失败时，默认会回滚到动作开始前的状态。比如 `onEnter` 在切换后抛错，会恢复到原步骤，并保留 `error` 供 UI 展示。

```js
const flow = new Flow({
  rollbackOnError: true,
  steps: [
    { id: 'base' },
    {
      id: 'confirm',
      onEnter: async () => {
        throw new Error('Cannot enter confirm');
      },
    },
  ],
});
```

如果业务希望失败后停留在目标步骤，可设置 `rollbackOnError: false`。

## 自定义渲染

默认 UI 仍作为基础样式和默认交互保留。需要自定义 UI 时，可以传入 render slots。slot 会收到 Flow 实例、快照、当前步骤、数据、动作方法和 `fallback()`。

```js
const flow = new Flow({
  steps,
  renderHeader: ({ snapshot, fallback }) => [
    fallback(),
    `Current: ${snapshot.currentId}`,
  ],
  renderBody: ({ currentStep, data }) => {
    return `Step ${currentStep.title}: ${JSON.stringify(data)}`;
  },
  renderFooter: ({ snapshot, back, next }) => [
    snapshot.canBack
      ? jsx('button', {
          type: 'button',
          onClick: () => void back(),
          children: 'Back',
        })
      : null,
    jsx('button', {
      type: 'button',
      onClick: () => void next(),
      children: 'Next',
    }),
  ],
});
```

slot 也可以设置为 `false`，用于完全关闭某个区域：

```js
const flow = new Flow({
  steps,
  renderHeader: false,
  renderFooter: false,
});
```

旧的 `showHeader/showSteps/showFooter/showBack/showNext/showReset` 仍然保留，适合只控制默认 UI 是否显示。自定义 slot 优先级高于 `show*` 配置。

## 无障碍

默认 UI 内置基础 a11y：

| 区域   | 支持                                               |
| ------ | -------------------------------------------------- |
| root   | `role="group"`、`aria-busy`、`aria-labelledby`     |
| body   | `role="region"`、`aria-live="polite"`、`aria-busy` |
| steps  | `role="list"`、`aria-label="Flow steps"`           |
| step   | 当前步骤设置 `aria-current="step"`                 |
| button | 禁用状态同步 `disabled` 和 `aria-disabled`         |

自定义 render slots 时，应继续保留等价的语义信息，尤其是当前步骤、loading 状态和可点击步骤的禁用状态。

## 清理任务

hook 和 content 渲染函数收到的 context 提供 `addCleanup(cleanup)`。Flow 销毁时会执行这些清理函数，适合释放定时器、订阅或外部资源。

```js
const flow = new Flow({
  steps: [
    {
      id: 'polling',
      onEnter: ({ addCleanup, signal }) => {
        const timer = setInterval(loadData, 1000);
        addCleanup(() => clearInterval(timer));

        fetch('/api/data', { signal });
      },
    },
  ],
});
```

Flow 销毁时会取消当前 action 的 `AbortController`，`signal` 可传给 `fetch` 或业务异步函数。

## 在 Modal 中使用

Modal 已提供轻量适配层。传入 `flow` 后，Modal 会把内容区里的 `data-action="next"`、`data-action="back"` 自动映射到 Flow，并把当前步骤的 `title`、`content`、`modal` 配置同步为当前弹窗 UI。

```js
const flow = new Flow({
  render: false,
  steps: [
    {
      id: 'base',
      title: 'Base Info',
      modal: {
        fields: [{ label: 'Name', name: 'name', required: true }],
      },
      content: () => `
        <div class="j-stack is-gap-16">
          <div>Please enter your name.</div>
          <button type="button" class="j-button is-primary" data-action="next">
            Next
          </button>
        </div>
      `,
    },
    {
      id: 'confirm',
      title: 'Confirm',
      content: ({ flow }) => {
        const name = flow.snapshot().data.name;
        return `
          <div class="j-stack is-gap-16">
            <div>Name: ${name}</div>
            <div class="j-flex is-gap-8">
              <button type="button" class="j-button is-ghost" data-action="back">Back</button>
              <button type="button" class="j-button is-primary" data-action="confirm">Submit</button>
            </div>
          </div>
        `;
      },
      modal: {
        showCancel: false,
        text: { confirm: 'Submit' },
      },
    },
  ],
});

const modal = new Modal({
  flow,
  text: { title: flow.currentStep.title },
  content: flow.currentStep.content,
  ...(flow.currentStep.modal || {}),
});
```

当当前步骤是表单模式时，Modal 会先执行原生表单校验，再把表单数据作为 payload 传给 `flow.next()` 或 `flow.back()`。Flow 负责缓存数据；Modal 返回表单步骤时会用当前步骤缓存回填同名字段。

推荐约定：

- `step.title`：步骤标题，也是 Modal 默认标题来源
- `step.content`：步骤主体内容，也是 Modal 默认内容来源
- `step.modal`：只放 Modal 专属配置，例如 `fields`、`text.confirm`、`showCancel`、`fullscreen`

`step.view` 仍然保留兼容，但不再推荐作为 Modal 的主协议。Flow 本身不依赖 Modal，仍然可以直接在页面或其他组件中使用。

## Step 配置

| 参数          | 类型                                           | 说明                                    |
| ------------- | ---------------------------------------------- | --------------------------------------- |
| `id`          | `string`                                       | 步骤 id，必须唯一                       |
| `title`       | `string`                                       | 步骤标题                                |
| `description` | `string`                                       | 步骤描述                                |
| `content`     | `string \| Node \| Node[] \| Function \| null` | 默认 UI 内容                            |
| `data`        | `object`                                       | 步骤初始缓存数据                        |
| `modal`       | `object \| Function \| null`                   | 供 Modal 消费的显式 UI 配置             |
| `view`        | `object`                                       | 旧的通用视图配置，建议仅用于兼容        |
| `onEnter`     | `Function`                                     | 进入步骤后触发                          |
| `onLeave`     | `Function`                                     | 离开步骤前触发                          |
| `onNext`      | `Function`                                     | 当前步骤 next 时触发，可返回目标步骤 id |
| `onBack`      | `Function`                                     | 当前步骤 back 时触发，可返回目标步骤 id |
| `canEnter`    | `Function`                                     | 返回 `false` 时阻止进入                 |
| `canLeave`    | `Function`                                     | 返回 `false` 时阻止离开                 |

## Options

| 参数              | 类型                        | 默认值     | 说明                                    |
| ----------------- | --------------------------- | ---------- | --------------------------------------- |
| `id`              | `string \| null`            | `null`     | 根节点 id，为空时自动生成               |
| `steps`           | `FlowStep[]`                | `[]`       | 步骤列表                                |
| `initial`         | `string \| number \| null`  | `null`     | 初始步骤 id 或索引                      |
| `cache`           | `boolean`                   | `true`     | 是否把步骤 payload 合并到全局 data      |
| `linear`          | `boolean`                   | `true`     | 默认 UI 是否限制跳到未来步骤            |
| `render`          | `boolean`                   | `true`     | 是否启用默认 UI                         |
| `rollbackOnError` | `boolean`                   | `true`     | transition 失败时是否回滚状态           |
| `busyStrategy`    | `'ignore' \| 'throw'`       | `'ignore'` | loading 中重复动作的处理策略            |
| `showHeader`      | `boolean`                   | `true`     | 是否显示默认头部                        |
| `showFooter`      | `boolean`                   | `true`     | 是否显示默认底部                        |
| `showSteps`       | `boolean`                   | `true`     | 是否显示默认步骤条                      |
| `showBack`        | `boolean`                   | `true`     | 是否显示默认返回按钮                    |
| `showNext`        | `boolean`                   | `true`     | 是否显示默认下一步按钮                  |
| `showReset`       | `boolean`                   | `false`    | 是否显示默认重置按钮                    |
| `text`            | `object`                    | `{}`       | 文案配置，支持 `back/next/finish/reset` |
| `className`       | `string`                    | `''`       | 根节点附加类名                          |
| `renderHeader`    | `Function \| false \| null` | `null`     | 自定义头部渲染                          |
| `renderSteps`     | `Function \| false \| null` | `null`     | 自定义步骤条渲染                        |
| `renderBody`      | `Function \| false \| null` | `null`     | 自定义内容区渲染                        |
| `renderFooter`    | `Function \| false \| null` | `null`     | 自定义底部渲染                          |
| `onChange`        | `Function \| null`          | `null`     | 步骤切换后触发                          |
| `onNext`          | `Function \| null`          | `null`     | 全局 next 时触发                        |
| `onBack`          | `Function \| null`          | `null`     | 全局 back 时触发                        |
| `onFinish`        | `Function \| null`          | `null`     | 完成时触发                              |
| `onError`         | `Function \| null`          | `null`     | 生命周期错误时触发                      |
| `onBusy`          | `Function \| null`          | `null`     | 重复动作被拦截时触发                    |

## 实例属性

| 属性          | 说明             |
| ------------- | ---------------- |
| `steps`       | 步骤列表         |
| `state`       | 响应式状态       |
| `currentStep` | 当前步骤配置     |
| `currentData` | 当前步骤缓存数据 |
| `canBack`     | 是否可以返回     |
| `canNext`     | 是否可以前进     |
| `isLast`      | 是否为最后一步   |

`state` 里还包含 `loading`、`busyAction`、`error`、`history`、`data`、`stepData` 等运行时状态。

## 实例方法

| 方法                             | 说明                                |
| -------------------------------- | ----------------------------------- |
| `mount(container)`               | 挂载默认 UI                         |
| `unmount()`                      | 卸载默认 UI                         |
| `next(payload)`                  | 前进一步，最后一步会触发 `finish()` |
| `back(payload)`                  | 返回上一步                          |
| `goTo(target, payload, options)` | 跳转到指定步骤                      |
| `setData(data)`                  | 合并全局数据                        |
| `setStepData(stepId, data)`      | 合并指定步骤缓存                    |
| `getStepData(stepId)`            | 获取指定步骤缓存                    |
| `snapshot()`                     | 获取当前快照                        |
| `subscribe(handler)`             | 订阅变化                            |
| `reset()`                        | 重置流程                            |
| `finish(payload)`                | 完成流程                            |
| `destroy()`                      | 销毁实例                            |

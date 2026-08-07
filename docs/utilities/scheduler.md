# Scheduler

```ts
import { createScheduledTask } from 'vanilla-jui';
```

`createScheduledTask(run)` 创建一次微任务级合并任务。所有实例共享一个轻量链式
队列；同一任务在队列刷新前多次 `schedule()` 只执行一次。

| 方法 | 行为 |
| --- | --- |
| `schedule()` | 排入下一个微任务；已排队或已销毁时忽略 |
| `flush()` | 立即执行，并取消本轮已排队执行 |
| `cancel()` | 取消本轮执行，任务仍可再次调度 |
| `dispose()` | 永久停用任务 |

```ts
const refresh = createScheduledTask(() => {
  measureLayout();
});

refresh.schedule();
refresh.schedule(); // 与上一次合并
refresh.flush(); // 立即执行一次
refresh.dispose();
```

它适合把同一同步调用栈中的多次响应式变更合并为一次昂贵副作用。持续逐帧动画应
使用 Web Animations 或 `requestAnimationFrame`，不要使用微任务队列。

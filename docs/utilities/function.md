# Function Utilities

```ts
import { debounce, throttle } from 'vanilla-jui';
import type {
  DebouncedFunc,
  DebounceSettings,
  ThrottleSettings,
} from 'vanilla-jui';
```

该模块直接转发 `lodash-es/debounce.js` 与 `lodash-es/throttle.js`，不改变其运行时
语义。`debounce` 返回的函数支持 `cancel()` 和 `flush()`；`throttle` 的调用频率、
leading/trailing 行为由 `ThrottleSettings` 控制。

```ts
const update = debounce(render, 150, { maxWait: 500 });
const onScroll = throttle(measure, 16, { trailing: true });

update.cancel();
onScroll.cancel();
```

组件销毁时应取消仍在等待的函数，避免销毁后继续写状态或 DOM。

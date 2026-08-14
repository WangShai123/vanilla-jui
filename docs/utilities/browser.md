# Browser Utilities

```ts
import {
  checkModernBrowser,
  copy,
  isMobile,
  isModernBrowser,
} from 'vanilla-jui';
```

## `isMobile()`

按以下顺序判定当前环境是否为移动端：

1. `navigator.userAgentData.mobile` 可用时直接采用。
2. 匹配常见移动设备 UA 标识。
3. 同时满足 coarse pointer 与最大宽度 `820px`。

SSR、无 `navigator` 或缺少必要 media query 能力时返回 `false`。该结果是环境启发式
判断，不应替代 CSS responsive layout 或具体能力检测。

```ts
if (isMobile()) enableTouchNavigation();
```

## `isModernBrowser()`

检测当前运行环境是否支持 vanilla-jui 当前目标所需的现代浏览器能力。当前源码检查 `Object.hasOwn()` 和 `Array.prototype.at()`，全部可用时返回 `true`；检测过程出现异常时返回 `false`。

```ts
if (!isModernBrowser()) {
  showLegacyBrowserWarning();
}
```

## `checkModernBrowser()`

调用 `isModernBrowser()`，如果当前环境不满足要求，会通过 `Toast.confirm()` 弹出升级浏览器提示，并把确认按钮指向 Chrome 下载页；满足要求时返回 `true`。

```ts
const supported = checkModernBrowser();
```

该函数会访问 `window` 和 Toast UI，只适合浏览器运行时，不适合 SSR 初始化阶段。

## `copy(text)`

把任意输入通过 `String(text)` 转换后复制到剪贴板，返回
`Promise<boolean>`。优先调用 `navigator.clipboard.writeText()`；不可用或被拒绝时，
回退到隐藏 `textarea` 与 `document.execCommand('copy')`。

```ts
const copied = await copy('https://example.com');
```

无 `window`/`document`、权限拒绝且回退失败、或浏览器不支持时返回 `false`，不会把
这些环境错误抛给调用方。回退创建的 `textarea` 会在操作后移除。

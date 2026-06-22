# Browser Utilities

从 `vanilla-jui` 导入：

```js
import { isMobile, copy } from 'vanilla-jui';
```

---

## isMobile

判断当前环境是否为移动设备。综合 UA、触摸能力、屏幕尺寸检测，支持 iOS 13+ iPad 伪装场景。

```
isMobile() → boolean
```

**返回值**: `boolean` — 移动设备为 `true`。

```js
if (isMobile()) {
  console.log('使用移动端布局');
} else {
  console.log('使用桌面端布局');
}
```

---

## copy

复制文本到剪贴板。优先使用 Clipboard API，不可用时降级到 `textarea + execCommand`。

```
copy(text) → Promise<boolean>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `text` | `*` | 需要复制的内容，非字符串会自动转换 |

**返回值**: `Promise<boolean>` — 复制成功返回 `true`。SSR 环境返回 `Promise<false>`。

```js
const ok = await copy('Hello, world!');
if (ok) {
  console.log('复制成功');
}

// 非字符串自动转换
await copy(12345); // → true
```

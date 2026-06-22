# Toast

Toast 是静态消息提示工具，源码位于 `src/components/toast.js`。它不需要实例化，直接通过静态方法展示消息。

## 导入

```js
import { Toast } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
Toast.success('保存成功');
Toast.error('保存失败', 5000);
Toast.lite('已更新');
```

## 方法

| 方法                                         | 说明                    | 默认值 |
| -------------------------------------------- | ----------------------- | ------ |
| `Toast.show(message, duration, type)`        | 展示指定类型消息，返回 `HTMLElement` | `message = ''`, `duration = 3000`, `type = 'info'` |
| `Toast.success/info/warning/error/primary()` | 展示快捷类型消息，返回 `HTMLElement` | `message = ''`, `duration = 3000` |
| `Toast.lite(message, duration)`              | 展示单例轻提示，返回 `HTMLElement` | `message = ''`, `duration = 2000` |
| `Toast.hide(toast)`                          | 隐藏指定节点            | |
| `Toast.clearAll()`                           | 清理所有 Toast 和定时器 | |
| `Toast.destroyAll()`                         | `clearAll()` 的别名     | |

**`type` 枚举值**: `'info'` | `'success'` | `'warning'` | `'error'` | `'primary'`

## 测试

可视化半自动测试页面：`tests/toast.test.html`。

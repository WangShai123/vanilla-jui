# Class Name Utility

源码：`src/utilities/class-name.ts`。该模块当前仅供库内部使用，未从包根入口导出。

## `joinClasses(...tokens)`

接收 `string | false | null | undefined`，过滤 falsy 值后以单个空格拼接。
它不拆分字符串、不去重，也不接受对象或嵌套数组。

```ts
joinClasses('menu-item', active && 'is-active', customClass);
// "menu-item is-active custom"
```

需要条件 class 时传 `false`、`null` 或 `undefined`；不要传空对象等非字符串值。

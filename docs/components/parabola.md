# Parabola

Parabola 是抛物线动画组件，源码位于 `src/components/parabola.js`。它通过 `requestAnimationFrame` 驱动小球从起点元素飞向终点元素，适合加入购物车等动效。

## 导入

```js
import { Parabola } from 'vanilla-jui';
import 'vanilla-jui/style.css';
```

## 基础用法

```js
const ball = new Parabola({
  from: document.querySelector('#from'),
  to: document.querySelector('#cart'),
  direction: 'center',
});

await ball.show();
```

动画结束后实例会自动销毁。也可以手动调用 `destroy()`。

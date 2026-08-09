import { jsx } from 'vanilla-signal';

import { icon } from './icons.ts';

export type flexPosition = 'center' | 'flex-start' | 'flex-end';
/**
 * 创建通用加载状态节点
 * 定位 absolute 撑满父元素 居中 背景模糊滤镜
 * @returns {HTMLElement}
 */
export function createLoading(
  xDirection: flexPosition = 'center',
  yDirection: flexPosition = 'center'
): HTMLDivElement {
  const i = icon('loader', { width: 24 });
  requestAnimationFrame(() => {
    if (typeof i.animate !== 'function') return;
    i.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
      {
        duration: 1000,
        iterations: Infinity,
        easing: 'linear',
      }
    );
  });
  return jsx('div', {
    'aria-live': 'polite',
    style: {
      display: 'flex',
      justifyContent: xDirection,
      alignItems: yDirection,
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 'inherit',
      backdropFilter: 'blur(4px)',
    },
    children: i,
  });
}

import { jsx } from 'vanilla-signal';

import { icon } from './icons.ts';
/**
 * 创建通用加载状态节点
 * 定位 absolute 撑满父元素 居中 背景模糊滤镜
 * @returns {HTMLElement}
 */
export function createLoading(): HTMLDivElement {
  return jsx('div', {
    'aria-live': 'polite',
    style: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      width: '100%',
      height: '100%',
      backdropFilter: 'blur(4px)',
    },
    children: icon('loader', { width: 24, className: 'animate-spin' }),
  });
}

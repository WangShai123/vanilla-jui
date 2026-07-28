import { jsx } from 'vanilla-signal';

import { type ResolveSchema, resolveProps } from '../utilities/core.ts';
import { type DOMReference, isNode, resolveElement } from '../utilities/dom.ts';

export type ParabolaDirection =
  | 'center'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

export interface ParabolaBallOptions {
  color: string;
  size: string;
}

export interface ParabolaClassNames {
  ball: string;
}

export type ParabolaClassNameConfig = Partial<ParabolaClassNames>;

export interface ParabolaOptions extends Record<string, unknown> {
  ball?: ParabolaBallOptions;
  className?: ParabolaClassNameConfig;
  from?: DOMReference;
  to?: DOMReference;
  direction?: ParabolaDirection;
  showDelay?: number;
  hideDelay?: number;
  onShow?: ((parabola: Parabola) => void) | null;
  onHidden?: ((parabola: Parabola) => void) | null;
}

interface ResolvedParabolaOptions extends Record<string, unknown> {
  ball: ParabolaBallOptions;
  className: ParabolaClassNames;
  from: DOMReference;
  to: DOMReference;
  direction: ParabolaDirection;
  showDelay: number;
  hideDelay: number;
  onShow: ((parabola: Parabola) => void) | null;
  onHidden: ((parabola: Parabola) => void) | null;
}

interface ParabolaPath {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const DEFAULT_BALL: ParabolaBallOptions = {
  color: 'var(--primary, #3e63dd)',
  size: '10px',
};

const DEFAULT_CLASS_NAMES: ParabolaClassNames = {
  ball: 'parabola-ball',
};

const ELEMENT_REF_RULE = {
  validate: (value: unknown) =>
    value == null ||
    typeof value === 'string' ||
    Array.isArray(value) ||
    isNode(value),
  message: 'expects Element, Node, selector or JSX node.',
};

const PARABOLA_OPTIONS_SCHEMA = {
  ball: {
    default: DEFAULT_BALL,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_BALL,
      ...(value && typeof value === 'object' ? value : {}),
    }),
    validate: (value: unknown) =>
      !!value &&
      typeof value === 'object' &&
      typeof (value as ParabolaBallOptions).color === 'string' &&
      typeof (value as ParabolaBallOptions).size === 'string',
    message:
      'expects an object with two string properties: "color" and "size".',
  },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
  from: { default: null, ...ELEMENT_REF_RULE },
  to: { default: null, ...ELEMENT_REF_RULE },
  direction: {
    default: 'center',
    type: 'string',
    enum: ['center', 'top-right', 'top-left', 'bottom-right', 'bottom-left'],
  },
  showDelay: { default: 0, type: 'number' },
  hideDelay: { default: 0, type: 'number' },
  onShow: { default: null, types: ['function', 'null'] },
  onHidden: { default: null, types: ['function', 'null'] },
} satisfies ResolveSchema<ParabolaOptions>;

function normalizeOptions(input: ParabolaOptions): ResolvedParabolaOptions {
  const options = resolveProps(
    input,
    PARABOLA_OPTIONS_SCHEMA,
    'Parabola.options'
  );
  return {
    ball: options.ball as ParabolaBallOptions,
    className: options.className as ParabolaClassNames,
    from: options.from as DOMReference,
    to: options.to as DOMReference,
    direction: options.direction as ParabolaDirection,
    showDelay: options.showDelay as number,
    hideDelay: options.hideDelay as number,
    onShow: options.onShow as ResolvedParabolaOptions['onShow'],
    onHidden: options.onHidden as ResolvedParabolaOptions['onHidden'],
  };
}

/**
 * 抛物线动画组件。
 *
 * 用于实现“加入购物车”等从一个元素飞向另一个元素的小球动画。
 */
export class Parabola {
  options: ResolvedParabolaOptions;
  hidden: boolean;
  _ball: HTMLElement | null;
  _animationId: number | null;
  _fromEl: Element | null;
  _toEl: Element | null;
  private showTimerId: ReturnType<typeof setTimeout> | null;

  /**
   * 创建抛物线动画实例。
   * @param {ParabolaOptions} options 动画配置。
   */
  constructor(options: ParabolaOptions = {}) {
    this.options = normalizeOptions(options);
    this.hidden = false;
    this._ball = null;
    this._animationId = null;
    this._fromEl = resolveElement(this.options.from);
    this._toEl = resolveElement(this.options.to);
    this.showTimerId = null;

    this.createBall();
  }

  private createBall(): void {
    if (this.hidden || this._ball) return;

    const { color, size } = this.options.ball;

    this._ball = jsx('div', {
      className: this.options.className.ball,
      'data-parabola': 'ball',
      style: {
        backgroundColor: color,
        width: size,
        height: size,
        position: 'fixed',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: '9999',
        opacity: '1',
      },
    }) as HTMLElement;
    document.body.appendChild(this._ball);
  }

  private calculatePath(): ParabolaPath | null {
    const fromRect = this._fromEl?.getBoundingClientRect();
    const toRect = this._toEl?.getBoundingClientRect();

    if (!fromRect || !toRect) return null;

    const { left: fL, top: fT, width: fW, height: fH } = fromRect;
    const { left: tL, top: tT, width: tW, height: tH } = toRect;

    let startX: number;
    let startY: number;
    switch (this.options.direction) {
      case 'top-left':
        startX = fL + fW * 0.2;
        startY = fT + fH * 0.2;
        break;
      case 'top-right':
        startX = fL + fW * 0.8;
        startY = fT + fH * 0.2;
        break;
      case 'bottom-left':
        startX = fL + fW * 0.2;
        startY = fT + fH * 0.8;
        break;
      case 'bottom-right':
        startX = fL + fW * 0.8;
        startY = fT + fH * 0.8;
        break;
      default:
        startX = fL + fW / 2;
        startY = fT + fH / 2;
    }

    const endX = tL + tW / 2;
    const endY = tT + tH / 2;

    return { startX, startY, endX, endY };
  }

  private easeOutCubic(t: number): number {
    return 1 - (1 - t) ** 3;
  }

  private animate(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration = 800
  ): void {
    if (this.hidden || !this._ball) return;

    const startTime = performance.now();
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const peakOffset = -100;

    const step = (currentTime: number): void => {
      if (this.hidden || !this._ball) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeOutCubic(progress);

      const currentX = startX + deltaX * eased;
      const currentY =
        startY + peakOffset * Math.sin(Math.PI * eased) + deltaY * eased;

      const opacity = 1 - progress;

      this._ball.style.left = `${currentX}px`;
      this._ball.style.top = `${currentY}px`;
      this._ball.style.opacity = `${opacity}`;
      this._ball.style.transform = `translate(-50%, -50%) scale(${1 - eased * 0.3})`;

      if (progress < 1) {
        this._animationId = requestAnimationFrame(step);
      } else {
        this.destroy();
      }
    };

    this._animationId = requestAnimationFrame(step);
  }

  /**
   * 开始播放动画。
   * @returns {Promise<boolean>} 成功开始动画时返回 true；元素缺失或已销毁时返回 false。
   */
  show(): Promise<boolean> {
    if (this.hidden) return Promise.resolve(false);

    return new Promise((resolve) => {
      this.showTimerId = setTimeout(() => {
        this.showTimerId = null;
        if (this.hidden || !this._ball) {
          resolve(false);
          return;
        }

        const path = this.calculatePath();
        if (!path) {
          this.destroy();
          resolve(false);
          return;
        }

        this._ball.style.left = `${path.startX}px`;
        this._ball.style.top = `${path.startY}px`;

        this.options.onShow?.(this);

        this.animate(path.startX, path.startY, path.endX, path.endY);
        resolve(true);
      }, this.options.showDelay);
    });
  }

  /**
   * 销毁动画实例并清理 DOM、定时器和动画帧。
   * @returns {void}
   */
  destroy(): void {
    if (this.hidden) return;

    this._ball?.remove();

    if (this.showTimerId) {
      clearTimeout(this.showTimerId);
      this.showTimerId = null;
    }
    if (this._animationId) cancelAnimationFrame(this._animationId);

    this._ball = null;
    this._fromEl = null;
    this._toEl = null;
    this._animationId = null;
    this.hidden = true;

    this.options.onHidden?.(this);
  }

  /**
   * show 的语义化别名。
   * @returns {Promise<boolean>}
   */
  start(): Promise<boolean> {
    return this.show();
  }
}

export function createParabola(options: ParabolaOptions = {}): Parabola {
  return new Parabola(options);
}

import { jsx } from 'vanilla-signal';

import { type DOMReference, resolveElement } from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import { timer } from '../utilities/timer.ts';
import { type ResolveSchema, resolveProps } from '../utilities/types.ts';

type ParabolaDirection =
  | 'center'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

interface ParabolaBallProps {
  color: string;
  size: string;
}

interface ParabolaClassNames {
  ball: string;
}

type ParabolaClassNameConfig = Partial<ParabolaClassNames>;

interface ParabolaProps extends Record<string, unknown> {
  ball?: ParabolaBallProps;
  className?: ParabolaClassNameConfig;
  from?: DOMReference;
  to?: DOMReference;
  direction?: ParabolaDirection;
  showDelay?: number;
  onShow?: ((parabola: ParabolaInstance) => void) | null;
  onHidden?: ((parabola: ParabolaInstance) => void) | null;
}

interface ResolvedParabolaProps extends Record<string, unknown> {
  ball: ParabolaBallProps;
  className: ParabolaClassNames;
  from: DOMReference;
  to: DOMReference;
  direction: ParabolaDirection;
  showDelay: number;
  onShow: ((parabola: ParabolaInstance) => void) | null;
  onHidden: ((parabola: ParabolaInstance) => void) | null;
}

interface ParabolaDOM {
  root: HTMLElement | null;
  from: Element | null;
  to: Element | null;
  balls: Set<HTMLElement>;
}

interface ParabolaRuntime {
  destroyed: boolean;
}

interface ParabolaCache {
  delays: Map<string, () => void>;
}

interface ParabolaPath {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface ParabolaInstance {
  props: ResolvedParabolaProps;
  dom: ParabolaDOM;
  runtime: ParabolaRuntime;
  show(): Promise<boolean>;
  destroy(): void;
}

const DEFAULT_BALL: ParabolaBallProps = {
  color: 'var(--tone-solid)',
  size: '12px',
};

const DEFAULT_CLASS_NAMES: ParabolaClassNames = {
  ball: 'parabola-ball',
};

const ELEMENT_REF_RULE = {
  types: ['string', 'Node', 'array', 'null', 'undefined'],
};

const PARABOLA_PROPS_SCHEMA = {
  ball: {
    default: DEFAULT_BALL,
    type: 'plainObject',
    normalize: (value: unknown) => ({
      ...DEFAULT_BALL,
      ...(value && typeof value === 'object' ? value : {}),
    }),
    shape: {
      color: 'string',
      size: 'string',
    },
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
  onShow: { default: null, types: ['function', 'null'] },
  onHidden: { default: null, types: ['function', 'null'] },
} satisfies ResolveSchema<ParabolaProps>;

function normalizeProps(input: ParabolaProps): ResolvedParabolaProps {
  const props = resolveProps(input, PARABOLA_PROPS_SCHEMA, 'Parabola.props');
  return {
    ball: props.ball as ParabolaBallProps,
    className: props.className as ParabolaClassNames,
    from: props.from as DOMReference,
    to: props.to as DOMReference,
    direction: props.direction as ParabolaDirection,
    showDelay: props.showDelay as number,
    onShow: props.onShow as ResolvedParabolaProps['onShow'],
    onHidden: props.onHidden as ResolvedParabolaProps['onHidden'],
  };
}

class Parabola implements ParabolaInstance {
  props: ResolvedParabolaProps;
  dom: ParabolaDOM;
  runtime: ParabolaRuntime;
  cache: ParabolaCache;

  constructor(props: ParabolaProps = {}) {
    this.props = normalizeProps(props);
    this.dom = {
      root: null,
      from: resolveElement(this.props.from),
      to: resolveElement(this.props.to),
      balls: new Set(),
    };
    this.runtime = {
      destroyed: false,
    };
    this.cache = {
      delays: new Map(),
    };

    this.createRoot();
  }

  private createRoot(): void {
    if (this.runtime.destroyed) return;

    if (this.dom.root) {
      if (!this.dom.root.isConnected) document.body.appendChild(this.dom.root);
      return;
    }

    this.dom.root = jsx('div', {
      'data-parabola': 'root',
      style: {
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '9999',
      },
    }) as HTMLElement;
    document.body.appendChild(this.dom.root);
  }

  private createBall(path: ParabolaPath): HTMLElement | null {
    if (this.runtime.destroyed) return null;

    this.createRoot();
    if (!this.dom.root) return null;

    const { color, size } = this.props.ball;

    const ball = jsx('div', {
      className: this.props.className.ball,
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
        left: `${path.startX}px`,
        top: `${path.startY}px`,
      },
    }) as HTMLElement;
    this.dom.root.appendChild(ball);
    this.dom.balls.add(ball);

    return ball;
  }

  private resolveTargets(): void {
    this.dom.from = resolveElement(this.props.from);
    this.dom.to = resolveElement(this.props.to);
  }

  private calculatePath(): ParabolaPath | null {
    const fromRect = this.dom.from?.getBoundingClientRect();
    const toRect = this.dom.to?.getBoundingClientRect();

    if (!fromRect || !toRect) return null;

    const { left: fL, top: fT, width: fW, height: fH } = fromRect;
    const { left: tL, top: tT, width: tW, height: tH } = toRect;

    let startX: number;
    let startY: number;
    switch (this.props.direction) {
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
    ball: HTMLElement,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration = 800
  ): void {
    if (!ball.isConnected) return;

    const startTime = performance.now();
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const peakOffset = -100;

    const step = (currentTime: number): void => {
      if (!ball.isConnected) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeOutCubic(progress);

      const currentX = startX + deltaX * eased;
      const currentY =
        startY + peakOffset * Math.sin(Math.PI * eased) + deltaY * eased;

      const opacity = 1 - progress;

      ball.style.left = `${currentX}px`;
      ball.style.top = `${currentY}px`;
      ball.style.opacity = `${opacity}`;
      ball.style.transform = `translate(-50%, -50%) scale(${1 - eased * 0.3})`;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this.removeBall(ball, true);
      }
    };

    requestAnimationFrame(step);
  }

  private startDelay(callback: () => void, onCancel: () => void): void {
    const key = `parabola-show-${randomId()}`;
    this.cache.delays.set(key, onCancel);

    timer.start(key, this.props.showDelay, () => {
      this.cache.delays.delete(key);
      callback();
    });
  }

  private cancelDelays(): void {
    for (const [key, onCancel] of this.cache.delays) {
      timer.cancel(key);
      onCancel();
    }
    this.cache.delays.clear();
  }

  private removeBall(ball: HTMLElement, notify: boolean): void {
    if (!this.dom.balls.has(ball)) return;

    ball.remove();
    this.dom.balls.delete(ball);

    if (notify) this.props.onHidden?.(this);
    this.removeRootIfIdle();
  }

  private removeRootIfIdle(): void {
    if (!this.runtime.destroyed || this.dom.balls.size > 0) return;

    this.dom.root?.remove();
    this.dom.root = null;
  }

  show(): Promise<boolean> {
    if (this.runtime.destroyed) return Promise.resolve(false);

    return new Promise((resolve) => {
      this.startDelay(
        () => {
          if (this.runtime.destroyed) {
            resolve(false);
            return;
          }

          this.resolveTargets();

          const path = this.calculatePath();
          if (!path) {
            resolve(false);
            return;
          }

          const ball = this.createBall(path);
          if (!ball) {
            resolve(false);
            return;
          }

          this.props.onShow?.(this);

          this.animate(ball, path.startX, path.startY, path.endX, path.endY);
          resolve(true);
        },
        () => resolve(false)
      );
    });
  }

  destroy(): void {
    if (this.runtime.destroyed) return;

    this.cancelDelays();

    this.dom.from = null;
    this.dom.to = null;
    this.runtime.destroyed = true;
    this.removeRootIfIdle();
  }
}

export function createParabola(props: ParabolaProps = {}): ParabolaInstance {
  return new Parabola(props);
}

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

interface ParabolaRuntime {
  destroyed: boolean;
}

interface ParabolaPath {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface ParabolaInstance {
  readonly props: ResolvedParabolaProps;
  readonly element: HTMLElement | null;
  readonly runtime: ParabolaRuntime;
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

export function createParabola(input: ParabolaProps = {}): ParabolaInstance {
  const props = normalizeProps(input);
  const runtime: ParabolaRuntime = { destroyed: false };
  const balls = new Set<HTMLElement>();
  const delays = new Map<string, () => void>();
  let root: HTMLElement | null = null;
  let from = resolveElement(props.from);
  let to = resolveElement(props.to);
  let parabola!: ParabolaInstance;

  const createRoot = (): void => {
    if (runtime.destroyed) return;
    if (root) {
      if (!root.isConnected) document.body.appendChild(root);
      return;
    }
    root = jsx('div', {
      'data-parabola': 'root',
      style: {
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '9999',
      },
    }) as HTMLElement;
    document.body.appendChild(root);
  };
  const removeRootIfIdle = (): void => {
    if (!runtime.destroyed || balls.size > 0) return;
    root?.remove();
    root = null;
  };
  const removeBall = (ball: HTMLElement, notify: boolean): void => {
    if (!balls.has(ball)) return;
    ball.remove();
    balls.delete(ball);
    if (notify) props.onHidden?.(parabola);
    removeRootIfIdle();
  };
  const createBall = (path: ParabolaPath): HTMLElement | null => {
    if (runtime.destroyed) return null;
    createRoot();
    if (!root) return null;
    const { color, size } = props.ball;

    const ball = jsx('div', {
      className: props.className.ball,
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
    root.appendChild(ball);
    balls.add(ball);
    return ball;
  };
  const calculatePath = (): ParabolaPath | null => {
    const fromRect = from?.getBoundingClientRect();
    const toRect = to?.getBoundingClientRect();

    if (!fromRect || !toRect) return null;

    const { left: fL, top: fT, width: fW, height: fH } = fromRect;
    const { left: tL, top: tT, width: tW, height: tH } = toRect;

    let startX: number;
    let startY: number;
    switch (props.direction) {
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
  };
  const animate = (
    ball: HTMLElement,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration = 800
  ): void => {
    if (!ball.isConnected) return;

    const startTime = performance.now();
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const peakOffset = -100;

    const step = (currentTime: number): void => {
      if (!ball.isConnected) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;

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
        removeBall(ball, true);
      }
    };

    requestAnimationFrame(step);
  };
  const startDelay = (callback: () => void, onCancel: () => void): void => {
    const key = `parabola-show-${randomId()}`;
    delays.set(key, onCancel);
    timer.start(key, props.showDelay, () => {
      delays.delete(key);
      callback();
    });
  };
  const cancelDelays = (): void => {
    for (const [key, onCancel] of delays) {
      timer.cancel(key);
      onCancel();
    }
    delays.clear();
  };

  parabola = {
    props,
    runtime,
    get element() {
      return root;
    },
    show() {
      if (runtime.destroyed) return Promise.resolve(false);
      return new Promise((resolve) => {
        startDelay(
          () => {
            if (runtime.destroyed) {
              resolve(false);
              return;
            }
            from = resolveElement(props.from);
            to = resolveElement(props.to);
            const path = calculatePath();
            if (!path) {
              resolve(false);
              return;
            }

            const ball = createBall(path);
            if (!ball) {
              resolve(false);
              return;
            }

            props.onShow?.(parabola);
            animate(ball, path.startX, path.startY, path.endX, path.endY);
            resolve(true);
          },
          () => resolve(false)
        );
      });
    },
    destroy() {
      if (runtime.destroyed) return;
      cancelDelays();
      from = null;
      to = null;
      runtime.destroyed = true;
      removeRootIfIdle();
    },
  };
  createRoot();
  return parabola;
}

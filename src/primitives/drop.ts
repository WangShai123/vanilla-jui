import { jsx } from 'vanilla-signal';

import {
  type DOMReference,
  type RenderableContent,
  isNode,
  normalizeContentNodes,
  resolveElement,
} from '../utilities/dom.ts';
import { createEventManager } from '../utilities/events.ts';
import { randomId } from '../utilities/id.ts';
import { type ResolveSchema, resolveProps } from '../utilities/types.ts';

type DropMode = 'hover' | 'click';
type DropPosition =
  | 'auto'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'left'
  | 'right';

interface DropClassNames {
  root: string;
  container: string;
}

type DropClassNameConfig = Partial<DropClassNames>;

interface DropDelay {
  show?: number;
  hide?: number;
}

interface DropProps extends Record<string, unknown> {
  name?: string | null;
  mode?: DropMode;
  position?: DropPosition;
  offset?: number;
  content?: RenderableContent<DropInstance>;
  className?: DropClassNameConfig;
  id?: string | null;
  delay?: number | DropDelay;
  hoverIntent?: boolean;
  onShown?: ((drop: DropInstance) => void | Promise<void>) | null;
  onHidden?: ((drop: DropInstance) => void | Promise<void>) | null;
}

interface ResolvedDropProps extends Record<string, unknown> {
  name: string | null;
  mode: DropMode;
  position: DropPosition;
  offset: number;
  content: RenderableContent<DropInstance>;
  className: DropClassNames;
  id: string;
  delay: number | DropDelay;
  hoverIntent: boolean;
  onShown: NonNullable<DropProps['onShown']> | null;
  onHidden: NonNullable<DropProps['onHidden']> | null;
}

interface DropTimer {
  show: ReturnType<typeof setTimeout> | null;
  hide: ReturnType<typeof setTimeout> | null;
}

export interface DropInstance {
  readonly target: Element | null;
  readonly props: ResolvedDropProps;
  readonly element: HTMLElement | null;
  readonly isVisible: boolean;
  readonly delayShow: number;
  readonly delayHide: number;
  show(useDelay?: boolean): void;
  hide(useDelay?: boolean): void;
  toggle(): void;
  destroy(): void;
}

interface HoverIntentData {
  x: number;
  y: number;
  lastMoveTime: number;
}

const DEFAULT_CLASS_NAMES: DropClassNames = {
  root: 'j-drop',
  container: 'drop-container',
};

const DROP_PROPS_SCHEMA = {
  name: { default: null, types: ['string', 'null'] },
  mode: { default: 'click', type: 'string', enum: ['hover', 'click'] },
  position: {
    default: 'auto',
    type: 'string',
    enum: [
      'auto',
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'left',
      'right',
    ],
  },
  offset: {
    default: 10,
    type: 'number',
    min: 0,
  },
  content: {
    default: '',
    type: 'renderable',
  },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
  id: {
    default: null,
    types: ['string', 'null'],
    normalize: (value: unknown) => {
      if (typeof value === 'string') {
        const id = value.trim();
        return id || randomId();
      }
      if (value == null) return randomId();
      return value;
    },
  },
  delay: { default: 0, types: ['number', 'object'] },
  hoverIntent: { default: true, type: 'boolean' },
  onShown: { default: null, types: ['function', 'null'] },
  onHidden: { default: null, types: ['function', 'null'] },
} satisfies ResolveSchema<DropProps>;

function normalizeProps(input: DropProps): ResolvedDropProps {
  const props = resolveProps(input, DROP_PROPS_SCHEMA, 'Drop');
  return {
    name: props.name as string | null,
    mode: props.mode as DropMode,
    position: props.position as DropPosition,
    offset: props.offset as number,
    content: props.content as RenderableContent<DropInstance>,
    className: props.className as DropClassNames,
    id: props.id as string,
    delay: props.delay as number | DropDelay,
    hoverIntent: props.hoverIntent as boolean,
    onShown: props.onShown as ResolvedDropProps['onShown'],
    onHidden: props.onHidden as ResolvedDropProps['onHidden'],
  };
}

function normalizeDelay(delay: number | DropDelay): Required<DropDelay> {
  if (typeof delay === 'number' && delay >= 0) {
    return { show: delay, hide: delay };
  }
  if (typeof delay === 'object' && delay !== null) {
    return {
      show: Number(delay.show) || 0,
      hide: Number(delay.hide) || 0,
    };
  }
  return { show: 0, hide: 0 };
}

/**
 * 通用浮层组件。
 *
 * 可用于菜单、提示、下拉面板等场景，支持点击或 hover 触发，并自动计算视口内位置。
 */
export function createDrop(
  reference: DOMReference,
  input: DropProps = {}
): DropInstance {
  let target = resolveElement(reference);
  const props = normalizeProps(input);
  const events = createEventManager();
  const delay = normalizeDelay(props.delay);
  const timer: DropTimer = { show: null, hide: null };
  const hoverIntentData: HoverIntentData = { x: 0, y: 0, lastMoveTime: 0 };
  let lastX = 0;
  let lastY = 0;
  let visible = false;
  let destroyed = false;
  let drop!: DropInstance;
  const wrapper =
    isNode(props.content) && props.content.nodeType === Node.ELEMENT_NODE
      ? props.content
      : jsx('div', {
          className: props.className.container,
          'data-drop-container': props.name || props.id,
          children: () => normalizeContentNodes(props.content, drop),
        });
  const root = jsx('div', {
    className: props.className.root,
    id: props.id,
    'data-drop': props.name || randomId(),
    'aria-hidden': 'true',
    'aria-expanded': 'false',
    children: wrapper,
  }) as HTMLElement;

  const cancelTimer = (key: keyof DropTimer): void => {
    if (timer[key]) clearTimeout(timer[key]);
    timer[key] = null;
  };
  const setPosition = (): void => {
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const { offset, position } = props;

    root.style.visibility = 'hidden';
    root.style.display = 'block';
    const dropRect = root.getBoundingClientRect();
    let top = 0;
    let left = 0;
    let pos = position;

    if (pos === 'auto') {
      const spaceBelow = window.innerHeight - rect.bottom;
      pos =
        spaceBelow > dropRect.height + offset ? 'bottom-center' : 'top-center';
    }

    switch (pos) {
      case 'top-left':
        top = rect.top - dropRect.height - offset;
        left = rect.left;
        break;
      case 'top-center':
        top = rect.top - dropRect.height - offset;
        left = rect.left + rect.width / 2 - dropRect.width / 2;
        break;
      case 'top-right':
        top = rect.top - dropRect.height - offset;
        left = rect.right - dropRect.width;
        break;
      case 'bottom-left':
        top = rect.bottom + offset;
        left = rect.left;
        break;
      case 'bottom-center':
        top = rect.bottom + offset;
        left = rect.left + rect.width / 2 - dropRect.width / 2;
        break;
      case 'bottom-right':
        top = rect.bottom + offset;
        left = rect.right - dropRect.width;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - dropRect.height / 2;
        left = rect.left - dropRect.width - offset;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - dropRect.height / 2;
        left = rect.right + offset;
        break;
      default:
        break;
    }

    top = Math.max(8, Math.min(top, window.innerHeight - dropRect.height - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - dropRect.width - 8));

    root.style.top = `${top + window.scrollY}px`;
    root.style.left = `${left + window.scrollX}px`;
    root.style.visibility = '';
    root.style.display = '';
  };
  const applyVisible = (next: boolean): void => {
    if (destroyed || visible === next) return;
    if (next) {
      if (!root.parentNode) document.body.appendChild(root);
      setPosition();
    } else {
      root.style.top = '';
      root.style.left = '';
      root.remove();
    }
    root.setAttribute('aria-hidden', next ? 'false' : 'true');
    root.setAttribute('aria-expanded', next ? 'true' : 'false');
    visible = next;
    void (next ? props.onShown?.(drop) : props.onHidden?.(drop));
  };
  const docClick = (event: Event): void => {
    if (!(event.target instanceof Node)) return;
    if (!target) return;
    if (!root.contains(event.target) && !target.contains(event.target)) {
      drop.hide();
    }
  };
  const onMouseMove = (event: Event): void => {
    if (!(event instanceof MouseEvent)) return;
    lastX = event.clientX;
    lastY = event.clientY;
    hoverIntentData.lastMoveTime = Date.now();
    hoverIntentData.x = event.clientX;
    hoverIntentData.y = event.clientY;
  };
  const startHoverIntent = (): void => {
    events.on('document:mousemove', document, 'mousemove', onMouseMove);
    cancelTimer('show');
    timer.show = setTimeout(() => {
      const elapsed = Date.now() - hoverIntentData.lastMoveTime;
      const distance =
        Math.abs(hoverIntentData.x - lastX) +
        Math.abs(hoverIntentData.y - lastY);
      if (distance < 5 || elapsed > 100) {
        drop.show(false);
        events.off('document:mousemove');
      } else startHoverIntent();
    }, delay.show);
  };
  const bindEvents = (): void => {
    if (!target) return;
    if (props.mode === 'hover') {
      events.on('target:enter', target, 'mouseenter', () => {
        if (props.hoverIntent) startHoverIntent();
        else drop.show();
      });
      events.on('target:leave', target, 'mouseleave', () => {
        cancelTimer('show');
        events.off('document:mousemove');
        drop.hide();
      });
      events.on('root:enter', root, 'mouseenter', () => drop.show());
      events.on('root:leave', root, 'mouseleave', () => drop.hide());
    } else {
      events.on('target:click', target, 'click', () => drop.toggle());
      events.on('document:click', document, 'click', docClick);
    }
  };

  drop = {
    get target() {
      return target;
    },
    props,
    get element() {
      return destroyed ? null : root;
    },
    get isVisible() {
      return visible;
    },
    delayShow: delay.show,
    delayHide: delay.hide,
    show(useDelay = true) {
      cancelTimer('hide');
      if (visible || destroyed) return;
      if (useDelay && delay.show > 0) {
        cancelTimer('show');
        timer.show = setTimeout(() => applyVisible(true), delay.show);
      } else applyVisible(true);
    },
    hide(useDelay = true) {
      cancelTimer('show');
      if (!visible || destroyed) return;
      if (useDelay && delay.hide > 0) {
        cancelTimer('hide');
        timer.hide = setTimeout(() => applyVisible(false), delay.hide);
      } else applyVisible(false);
    },
    toggle() {
      if (visible) drop.hide();
      else drop.show();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelTimer('show');
      cancelTimer('hide');
      events.clear();
      root.remove();
      target = null;
      visible = false;
    },
  };
  bindEvents();
  return drop;
}

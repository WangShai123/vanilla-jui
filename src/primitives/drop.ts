import { jsx } from 'vanilla-signal';

import {
  type DOMReference,
  type RenderableContent,
  isNode,
  normalizeContentNodes,
  resolveElement,
} from '../utilities/dom.ts';
import { createEventManager, type IEventManager } from '../utilities/events.ts';
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

interface DropCleanup {
  events: IEventManager;
}

interface DropDom {
  root: HTMLElement | null;
}

interface DropInstance {
  target: Element | null;
  props: Record<string, unknown> | null;
  dom: DropDom;
  isVisible: boolean;
  delayShow: number;
  delayHide: number;
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
class Drop implements DropInstance {
  target: Element | null;
  props: ResolvedDropProps | null;
  dom: DropDom;
  isVisible: boolean;
  cleanup: DropCleanup | null;
  delayShow: number;
  delayHide: number;
  private timer: DropTimer;
  private hoverIntentData: HoverIntentData;
  private lastX: number;
  private lastY: number;

  constructor(element: DOMReference, options: DropProps = {}) {
    this.target = resolveElement(element);
    this.props = normalizeProps(options);
    this.dom = { root: null };
    this.isVisible = false;
    this.cleanup = null;
    this.delayShow = 0;
    this.delayHide = 0;
    this.timer = { show: null, hide: null };
    this.hoverIntentData = { x: 0, y: 0, lastMoveTime: 0 };
    this.lastX = 0;
    this.lastY = 0;

    this.init(this.props);
  }

  private init(props: ResolvedDropProps): void {
    this.cleanup = {
      events: createEventManager(),
    };

    const delay = normalizeDelay(props.delay);
    this.delayShow = delay.show;
    this.delayHide = delay.hide;

    this.buildDrop(props);
    this.bindEvents(props);
  }

  private buildDrop(props: ResolvedDropProps): void {
    const { className, content, id, name } = props;
    const wrapper =
      isNode(content) && content.nodeType === Node.ELEMENT_NODE
        ? content
        : jsx('div', {
            className: className.container,
            'data-drop-container': name || id,
            children: normalizeContentNodes(content, this),
          });

    this.dom.root = jsx('div', {
      className: className.root,
      id,
      'data-drop': name || randomId(),
      children: wrapper,
    }) as HTMLElement;
  }

  private bindEvents(props: ResolvedDropProps): void {
    const { mode, hoverIntent } = props;
    this.unbindEvents();

    if (!this.target || !this.cleanup) return;

    if (mode === 'hover') {
      if (hoverIntent) {
        this.cleanup.events.on('target:enter', this.target, 'mouseenter', () =>
          this.startHoverIntent()
        );
        this.cleanup.events.on('target:leave', this.target, 'mouseleave', () =>
          this.cancelHoverIntent()
        );
      } else {
        this.cleanup.events.on('target:enter', this.target, 'mouseenter', () =>
          this.show()
        );
        this.cleanup.events.on('target:leave', this.target, 'mouseleave', () =>
          this.hide()
        );
      }
    } else {
      this.cleanup.events.on('target:click', this.target, 'click', () =>
        this.toggle()
      );
      this.cleanup.events.on('document:click', document, 'click', (event) =>
        this.docClick(event)
      );
    }
  }

  private bindRootEvents(): void {
    const { root } = this.dom;
    if (!root || this.props?.mode !== 'hover' || !this.cleanup) return;
    this.cleanup.events.on('root:enter', root, 'mouseenter', () => this.show());
    this.cleanup.events.on('root:leave', root, 'mouseleave', () => this.hide());
  }

  private unbindRootEvents(): void {
    this.cleanup?.events.off('root:enter');
    this.cleanup?.events.off('root:leave');
  }

  private unbindEvents(): void {
    this.cleanup?.events.clear();
  }

  private startHoverIntent(): void {
    if (!this.cleanup) return;

    this.cleanup.events.on(
      'document:mousemove',
      document,
      'mousemove',
      (event) => this.onMouseMove(event)
    );

    if (this.timer.show) clearTimeout(this.timer.show);
    this.timer.show = setTimeout(() => {
      const now = Date.now();
      const dt = now - this.hoverIntentData.lastMoveTime;
      const dx = Math.abs(this.hoverIntentData.x - this.lastX);
      const dy = Math.abs(this.hoverIntentData.y - this.lastY);
      const dist = dx + dy;
      if (dist < 5 || dt > 100) {
        this.show();
        this.cleanup?.events.off('document:mousemove');
      } else {
        this.startHoverIntent();
      }
    }, this.delayShow);
  }

  private cancelHoverIntent(): void {
    if (this.timer.show) clearTimeout(this.timer.show);
    this.cleanup?.events.off('document:mousemove');
    this.hide();
  }

  private onMouseMove(event: Event): void {
    if (!(event instanceof MouseEvent)) return;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.hoverIntentData.lastMoveTime = Date.now();
    this.hoverIntentData.x = event.clientX;
    this.hoverIntentData.y = event.clientY;
  }

  private setPosition(): void {
    if (!this.target || !this.dom.root || !this.props) return;

    const rect = this.target.getBoundingClientRect();
    const drop = this.dom.root;
    const { offset, position } = this.props;

    drop.style.visibility = 'hidden';
    drop.style.display = 'block';
    const dropRect = drop.getBoundingClientRect();
    let top = 0;
    let left = 0;
    let pos = position;

    if (pos === 'auto') {
      const spaceBelow = window.innerHeight - rect.bottom;
      pos =
        spaceBelow > dropRect.height + offset ? 'top-center' : 'bottom-center';
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

    drop.style.top = `${top + window.scrollY}px`;
    drop.style.left = `${left + window.scrollX}px`;
    drop.style.visibility = '';
    drop.style.display = '';
  }

  private docClick(event: Event): void {
    if (!(event.target instanceof Node)) return;
    if (!this.dom.root || !this.target) return;
    if (
      !this.dom.root.contains(event.target) &&
      !this.target.contains(event.target)
    ) {
      this.hide();
    }
  }

  private exec(visible: boolean): void {
    const { root } = this.dom;
    if (!root || !this.props) return;

    if (visible) {
      if (!root.parentNode) document.body.appendChild(root);
      this.bindRootEvents();
      this.setPosition();
    } else {
      this.unbindRootEvents();
      root.style.top = '';
      root.style.left = '';
      root.remove();
    }

    root.setAttribute('aria-hidden', visible ? 'false' : 'true');
    root.setAttribute('aria-expanded', visible ? 'true' : 'false');

    this.isVisible = visible;
  }

  show(useDelay = true): void {
    if (this.timer.hide) clearTimeout(this.timer.hide);
    if (this.isVisible) return;

    if (useDelay && this.delayShow > 0) {
      if (this.timer.show) clearTimeout(this.timer.show);
      this.timer.show = setTimeout(() => this.exec(true), this.delayShow);
    } else {
      this.exec(true);
    }

    void this.props?.onShown?.(this);
  }

  hide(useDelay = true): void {
    if (this.timer.show) clearTimeout(this.timer.show);
    if (!this.isVisible) return;

    if (useDelay && this.delayHide > 0) {
      if (this.timer.hide) clearTimeout(this.timer.hide);
      this.timer.hide = setTimeout(() => this.exec(false), this.delayHide);
    } else {
      this.exec(false);
    }

    void this.props?.onHidden?.(this);
  }

  toggle(): void {
    if (this.isVisible) this.hide();
    else this.show();
  }

  destroy(): void {
    if (!this.props) return;

    if (this.timer.show) clearTimeout(this.timer.show);
    if (this.timer.hide) clearTimeout(this.timer.hide);

    this.unbindEvents();
    this.dom.root?.remove();

    this.props = null;
    this.dom.root = null;
    this.target = null;
    this.timer = { show: null, hide: null };
    this.cleanup?.events.clear();
    this.cleanup = null;
    this.isVisible = false;
  }
}

export function createDrop(
  element: DOMReference,
  props: DropProps = {}
): DropInstance {
  return new Drop(element, props);
}

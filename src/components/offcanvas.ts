import { createDeepStore, flushSync, jsx } from 'vanilla-signal';

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
} from '../core/Component.ts';
import {
  type ResolveSchema,
  randomId,
  resolveProps,
  timer,
} from '../utilities/core.ts';
import {
  type RenderableContent,
  createLoading,
  isRenderableContent,
  normalizeContentNodes,
} from '../utilities/dom.ts';

export type OffcanvasDirection = 'top' | 'right' | 'bottom' | 'left';
export type OffcanvasAnimation = 'slide' | 'push' | 'none';

export interface OffcanvasClassNames {
  root: string;
  overlay: string;
  content: string;
  active: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
  slide: string;
  push: string;
  none: string;
  pushBody: string;
  pushTop: string;
  pushRight: string;
  pushBottom: string;
  pushLeft: string;
}

export type OffcanvasClassNameConfig = Partial<OffcanvasClassNames>;

export type OffcanvasContent =
  | RenderableContent<Offcanvas>
  | ((offcanvas: Offcanvas) => Promise<RenderableContent<Offcanvas>>);

export interface OffcanvasProps extends Record<string, unknown> {
  content?: OffcanvasContent;
  overlay?: boolean;
  filter?: boolean;
  cache?: boolean;
  ttl?: number;
  direction?: OffcanvasDirection;
  animation?: OffcanvasAnimation;
  bgClose?: boolean;
  escClose?: boolean;
  id?: string | null;
  className?: OffcanvasClassNameConfig;
  onShow?: ((offcanvas: Offcanvas) => void | Promise<void>) | null;
  onShown?: ((offcanvas: Offcanvas) => void | Promise<void>) | null;
  onHide?: ((offcanvas: Offcanvas) => void | Promise<void>) | null;
  onHidden?: ((offcanvas: Offcanvas) => void | Promise<void>) | null;
}

interface ResolvedOffcanvasProps extends Record<string, unknown> {
  content: OffcanvasContent;
  overlay: boolean;
  filter: boolean;
  cache: boolean;
  ttl: number;
  direction: OffcanvasDirection;
  animation: OffcanvasAnimation;
  bgClose: boolean;
  escClose: boolean;
  id: string;
  className: OffcanvasClassNames;
  onShow: NonNullable<OffcanvasProps['onShow']> | null;
  onShown: NonNullable<OffcanvasProps['onShown']> | null;
  onHide: NonNullable<OffcanvasProps['onHide']> | null;
  onHidden: NonNullable<OffcanvasProps['onHidden']> | null;
}

interface OffcanvasState extends Record<string, unknown> {
  visible: boolean;
  loading: boolean;
}

interface OffcanvasDOM extends ComponentDOM {
  root: HTMLElement | null;
  content: HTMLElement | null;
}

interface OffcanvasCache {
  content: RenderableContent<Offcanvas>;
  hasContent: boolean;
  updatedAt: number;
}

interface OffcanvasRuntime extends ComponentRuntime {
  cache: OffcanvasCache;
  contentLoadId: number;
}

const DEFAULT_CLASS_NAMES: OffcanvasClassNames = {
  root: 'j-offcanvas',
  overlay: 'j-offcanvas-overlay',
  content: 'offcanvas-content',
  active: 'is-active',
  top: 'is-top',
  right: 'is-right',
  bottom: 'is-bottom',
  left: 'is-left',
  slide: 'is-slide',
  push: 'is-push',
  none: 'is-none',
  pushBody: 'offcanvas-push-body',
  pushTop: 'offcanvas-push-top',
  pushRight: 'offcanvas-push-right',
  pushBottom: 'offcanvas-push-bottom',
  pushLeft: 'offcanvas-push-left',
};

const OFFCANVAS_PROPS_SCHEMA = {
  content: {
    default: '',
    validate: isRenderableContent,
    message: 'expects string, Node, array, function or null.',
  },
  overlay: { default: true, type: 'boolean' },
  filter: { default: true, type: 'boolean' },
  cache: { default: false, type: 'boolean' },
  ttl: { default: 0, type: 'number' },
  direction: {
    default: 'left',
    type: 'string',
    enum: ['top', 'right', 'bottom', 'left'],
  },
  animation: {
    default: 'slide',
    type: 'string',
    enum: ['slide', 'push', 'none'],
  },
  bgClose: { default: true, type: 'boolean' },
  escClose: { default: true, type: 'boolean' },
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
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
  onShow: { default: null, types: ['function', 'null'] },
  onShown: { default: null, types: ['function', 'null'] },
  onHide: { default: null, types: ['function', 'null'] },
  onHidden: { default: null, types: ['function', 'null'] },
} satisfies ResolveSchema<OffcanvasProps>;

function normalizeTtl(ttl: number): number {
  return ttl > 0 ? ttl : 0;
}

function normalizeProps(input: OffcanvasProps): ResolvedOffcanvasProps {
  const props = resolveProps(input, OFFCANVAS_PROPS_SCHEMA, 'Offcanvas');
  return {
    content: props.content as OffcanvasContent,
    overlay: props.overlay as boolean,
    filter: props.filter as boolean,
    cache: props.cache as boolean,
    ttl: props.ttl as number,
    direction: props.direction as OffcanvasDirection,
    animation: props.animation as OffcanvasAnimation,
    bgClose: props.bgClose as boolean,
    escClose: props.escClose as boolean,
    id: props.id as string,
    className: props.className as OffcanvasClassNames,
    onShow: props.onShow as ResolvedOffcanvasProps['onShow'],
    onShown: props.onShown as ResolvedOffcanvasProps['onShown'],
    onHide: props.onHide as ResolvedOffcanvasProps['onHide'],
    onHidden: props.onHidden as ResolvedOffcanvasProps['onHidden'],
  };
}

function joinClasses(
  ...classes: Array<string | null | undefined | false>
): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 侧滑面板组件，继承 Component。
 *
 * 适用于侧边菜单、筛选面板、移动端抽屉等场景。
 */
export class Offcanvas extends Component<
  ResolvedOffcanvasProps,
  OffcanvasState,
  OffcanvasDOM
> {
  declare runtime: OffcanvasRuntime;
  declare state: OffcanvasState;
  _overlay: HTMLElement | null;

  constructor(input: OffcanvasProps = {}) {
    const props = normalizeProps(input);
    super(props);

    this.dom.content = null;
    this._overlay = null;
    this.runtime.cache = {
      content: null,
      hasContent: false,
      updatedAt: 0,
    };
    this.runtime.contentLoadId = 0;

    this.state = createDeepStore({
      visible: false,
      loading: false,
    }) as OffcanvasState;

    this.onInit(props);
  }

  protected onInit(props: ResolvedOffcanvasProps): void {
    if (props.overlay) this._overlay = this.buildOverlay(props);
    this.root = this.buildRoot(props);
  }

  private buildOverlay(props: ResolvedOffcanvasProps): HTMLElement {
    return jsx('div', {
      className: props.className.overlay,
      'data-offcanvas-overlay': props.id,
      style: props.filter ? { backdropFilter: 'blur(2px)' } : {},
    }) as HTMLElement;
  }

  private buildRoot(props: ResolvedOffcanvasProps): HTMLElement {
    const content = jsx('div', {
      className: props.className.content,
      'data-offcanvas-content': props.id,
    }) as HTMLElement;
    this.dom.content = content;

    if (typeof props.content !== 'function') {
      content.append(...normalizeContentNodes(props.content, this));
    }

    return jsx('div', {
      className: joinClasses(
        props.className.root,
        props.className[props.direction],
        props.className[props.animation]
      ),
      id: props.id,
      'data-offcanvas': 'root',
      'data-offcanvas-direction': props.direction,
      'data-offcanvas-animation': props.animation,
      children: content,
    }) as HTMLElement;
  }

  private isCacheValid(): boolean {
    if (!this.props.cache || !this.runtime.cache.hasContent) return false;

    const ttl = normalizeTtl(this.props.ttl);
    return !ttl || Date.now() - this.runtime.cache.updatedAt <= ttl;
  }

  private renderContent(content: RenderableContent<Offcanvas>): void {
    if (!this.dom.content) return;

    this.dom.content.textContent = '';
    this.dom.content.append(...normalizeContentNodes(content, this));
  }

  private async loadContent(): Promise<void> {
    const { content, cache } = this.props;
    if (typeof content !== 'function') {
      this.runtime.contentLoadId += 1;
      flushSync(() => {
        this.state.loading = false;
      });
      return;
    }

    if (this.isCacheValid()) {
      this.runtime.contentLoadId += 1;
      this.renderContent(this.runtime.cache.content);
      flushSync(() => {
        this.state.loading = false;
      });
      return;
    }

    const loadId = ++this.runtime.contentLoadId;
    flushSync(() => {
      this.state.loading = true;
    });

    if (this.dom.content) {
      this.dom.content.textContent = '';
      this.dom.content.appendChild(createLoading());
    }

    try {
      const result = await Promise.resolve(content(this));

      if (this.runtime.destroyed || loadId !== this.runtime.contentLoadId) {
        return;
      }

      if (cache) {
        this.runtime.cache.content = result;
        this.runtime.cache.hasContent = true;
        this.runtime.cache.updatedAt = Date.now();
      }
      this.renderContent(result);
    } finally {
      if (!this.runtime.destroyed && loadId === this.runtime.contentLoadId) {
        flushSync(() => {
          this.state.loading = false;
        });
      }
    }
  }

  private bindEvents(): void {
    this.unbindEvents();
    const { bgClose, escClose } = this.props;

    if (this._overlay && bgClose) {
      this.cleanup.events.on('overlay', this._overlay, 'click', () => {
        void this.hide();
      });
    }
    if (escClose) {
      this.cleanup.events.on('esc', document, 'keydown', (event) => {
        if (
          event instanceof KeyboardEvent &&
          event.key === 'Escape' &&
          this.state.visible
        ) {
          void this.hide();
        }
      });
    }
    if (this.dom.root) {
      this.cleanup.events.on('close', this.dom.root, 'click', (event) => {
        if (!(event.target instanceof Element)) return;
        const action = event.target.closest<HTMLElement>('[data-action]');
        const name = action?.dataset.action;
        if (name === 'close' || name === 'cancel') void this.hide();
      });
    }
  }

  unbindEvents(): void {
    this.cleanup?.events.clear();
  }

  private renderPanel(): void {
    const { overlay, animation, direction, id, className } = this.props;
    const body = document.body;

    if (overlay && this._overlay) body.appendChild(this._overlay);
    if (this.dom.root) body.appendChild(this.dom.root);

    body.style.overflow = 'hidden';
    if (animation === 'push') {
      body.classList.add(className.pushBody);
    }

    timer.start(`oc-show-${id}`, 10, () => {
      if (!this.dom.root) return;
      this._overlay?.classList.add(className.active);
      if (animation === 'push') {
        body.classList.add(className[`push${capitalizeDirection(direction)}`]);
      }
      this.dom.root.classList.add(className.active);
    });
  }

  private removePanel(): void {
    const { animation, direction, id, className } = this.props;
    const body = document.body;

    this._overlay?.classList.remove(className.active);
    this.dom.root?.classList.remove(className.active);

    if (animation === 'push') {
      body.classList.remove(className[`push${capitalizeDirection(direction)}`]);
    }

    timer.start(`oc-remove-${id}`, 100, () => {
      this._overlay?.remove();
      this.dom.root?.remove();
      if (animation === 'push') {
        body.classList.remove(className.pushBody);
      }
      body.style.overflow = '';
    });
  }

  async show(): Promise<void> {
    if (this.runtime.destroyed || this.state.visible) return;

    const { onShow, onShown, id } = this.props;
    if (onShow) await Promise.resolve(onShow(this));

    this.renderPanel();
    this.bindEvents();

    flushSync(() => {
      this.state.visible = true;
    });

    await this.loadContent();

    timer.start(`oc-shown-${id}`, 300, () => {
      if (this.runtime.destroyed) return;
      void onShown?.(this);
    });
  }

  async hide(): Promise<void> {
    if (this.runtime.destroyed || !this.state.visible) return;

    const { onHide, onHidden } = this.props;
    if (onHide) await Promise.resolve(onHide(this));

    this.runtime.contentLoadId += 1;
    flushSync(() => {
      this.state.loading = false;
    });

    this.unbindEvents();
    this.removePanel();

    flushSync(() => {
      this.state.visible = false;
    });

    void onHidden?.(this);
  }

  onDestroy(): void {
    const { id, direction, className } = this.props;

    timer.cancel(`oc-show-${id}`);
    timer.cancel(`oc-remove-${id}`);
    timer.cancel(`oc-shown-${id}`);

    if (this.state.visible) this.unbindEvents();

    this.dom.root?.classList.remove(className.active);
    this.dom.root?.remove();
    this._overlay?.remove();

    const body = document.body;
    body.style.overflow = '';
    body.classList.remove(
      className.pushBody,
      className[`push${capitalizeDirection(direction)}`]
    );

    this._overlay = null;
  }
}

function capitalizeDirection(
  direction: OffcanvasDirection
): 'Top' | 'Right' | 'Bottom' | 'Left' {
  return `${direction[0].toUpperCase()}${direction.slice(1)}` as
    | 'Top'
    | 'Right'
    | 'Bottom'
    | 'Left';
}

export function createOffcanvas(options: OffcanvasProps = {}): Offcanvas {
  return new Offcanvas(options);
}

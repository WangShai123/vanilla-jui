import { createDeepStore, flushSync, jsx } from 'vanilla-signal';

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
} from '../core/Component.ts';
import { createLoading } from '../primitives/loading.ts';
import {
  type RenderableContent,
  normalizeContentNodes,
} from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import { createStateSync } from '../utilities/scheduler.ts';
import { timer } from '../utilities/timer.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';

export type OffcanvasDirection = 'top' | 'right' | 'bottom' | 'left';
export type OffcanvasAnimate = string;

export interface OffcanvasClassNames {
  root: string;
  overlay: string;
  content: string;
}

export type OffcanvasClassNameConfig = Partial<OffcanvasClassNames>;

export type OffcanvasContent =
  | RenderableContent<Offcanvas>
  | ((offcanvas: Offcanvas) => Promise<RenderableContent<Offcanvas>>);

export interface OffcanvasProps extends Record<string, unknown> {
  content?: OffcanvasContent;
  overlay?: boolean;
  filter?: boolean;
  bodyOverflow?: boolean;
  cache?: boolean;
  ttl?: number;
  direction?: OffcanvasDirection;
  animate?: OffcanvasAnimate;
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
  bodyOverflow: boolean;
  cache: boolean;
  ttl: number;
  direction: OffcanvasDirection;
  animate: OffcanvasAnimate;
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
  content: OffcanvasContent;
  visible: boolean;
  loading: boolean;
}

interface OffcanvasDOM extends ComponentDOM {
  root: HTMLElement | null;
  overlay: HTMLElement | null;
  content: HTMLElement | null;
}

interface OffcanvasCache {
  content: RenderableContent<Offcanvas>;
  hasContent: boolean;
  updatedAt: number;
}

interface OffcanvasRuntime extends ComponentRuntime {
  built: boolean;
  cache: OffcanvasCache;
  contentLoadId: number;
}

interface OffcanvasCleanupExtras {
  state?: (() => void) | null;
}

const DEFAULT_CLASS_NAMES: OffcanvasClassNames = {
  root: 'j-offcanvas',
  overlay: 'j-offcanvas-overlay',
  content: 'offcanvas-content',
};

const OFFCANVAS_PROPS_SCHEMA = {
  content: {
    default: '',
    type: 'renderable',
  },
  overlay: { default: true, type: 'boolean' },
  filter: { default: true, type: 'boolean' },
  bodyOverflow: { default: true, type: 'boolean' },
  cache: { default: false, type: 'boolean' },
  ttl: { default: 0, type: 'number' },
  direction: {
    default: 'left',
    type: 'string',
    enum: ['top', 'right', 'bottom', 'left'],
  },
  animate: {
    default: 'slide',
    type: 'string',
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

const OFFCANVAS_STATE_SCHEMA = {
  content: OFFCANVAS_PROPS_SCHEMA.content,
};

function normalizeTtl(ttl: number): number {
  return ttl > 0 ? ttl : 0;
}

function normalizeProps(input: OffcanvasProps): ResolvedOffcanvasProps {
  const props = resolveProps(input, OFFCANVAS_PROPS_SCHEMA, 'Offcanvas');
  return {
    content: props.content as OffcanvasContent,
    overlay: props.overlay as boolean,
    filter: props.filter as boolean,
    bodyOverflow: props.bodyOverflow as boolean,
    cache: props.cache as boolean,
    ttl: props.ttl as number,
    direction: props.direction as OffcanvasDirection,
    animate: props.animate as OffcanvasAnimate,
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

class OffcanvasComponent extends Component<
  ResolvedOffcanvasProps,
  OffcanvasState,
  OffcanvasDOM
> {
  declare runtime: OffcanvasRuntime;
  declare state: OffcanvasState;
  declare cleanup: Component['cleanup'] & OffcanvasCleanupExtras;

  constructor(input: OffcanvasProps = {}) {
    const props = normalizeProps(input);
    super(props);

    this.dom.overlay = null;
    this.dom.content = null;

    this.cleanup.state = null;

    this.runtime.built = false;
    this.runtime.cache = {
      content: null,
      hasContent: false,
      updatedAt: 0,
    };
    this.runtime.contentLoadId = 0;

    this.state = createDeepStore({
      content: props.content,
      visible: false,
      loading: false,
    }) as OffcanvasState;
  }

  build(): this {
    if (this.runtime.destroyed) {
      throw new Error('Offcanvas.build: instance has been destroyed.');
    }
    if (this.runtime.built) return this;

    try {
      this.dom.root = this.buildRoot();
      this.runtime.built = true;
      this.bindState();
    } catch (error) {
      this.destroy();
      throw error;
    }

    this.emit('init', this.props);
    return this;
  }

  private assertBuilt(method: string): void {
    if (this.runtime.destroyed) {
      throw new Error(`Offcanvas.${method}: instance has been destroyed.`);
    }
    if (!this.runtime.built) {
      throw new Error(`Offcanvas.${method}: call build() first.`);
    }
  }

  private buildRoot(): HTMLElement {
    if (this.props.overlay) {
      this.dom.overlay = this.buildOverlay();
    }

    return this.buildPanel();
  }

  private buildOverlay(): HTMLElement {
    const filterStyle = this.props.filter
      ? { backdropFilter: 'blur(2px)' }
      : {};
    return jsx('div', {
      className: this.props.className.overlay,
      hidden: true,
      'data-offcanvas-overlay': this.props.id,
      style: {
        ...filterStyle,
      },
    }) as HTMLElement;
  }

  private buildPanel(): HTMLElement {
    const content = jsx('div', {
      className: this.props.className.content,
      'data-offcanvas-content': this.props.id,
    }) as HTMLElement;
    this.dom.content = content;

    if (typeof this.state.content !== 'function') {
      this.renderContent(this.state.content);
    }

    return jsx('div', {
      className: this.props.className.root,
      id: this.props.id,
      role: 'dialog',
      'aria-modal': this.props.overlay ? 'true' : 'false',
      'aria-expanded': 'false',
      'data-offcanvas': 'root',
      'data-direction': this.props.direction,
      'data-animate': this.props.animate,
      children: content,
    }) as HTMLElement;
  }

  private bindState(): void {
    if (this.cleanup.state) return;

    this.cleanup.state = createStateSync(
      () => this.state.content,
      (content) => this.syncContent(content)
    );
  }

  private async syncContent(content: OffcanvasContent): Promise<void> {
    if (!this.runtime.built) return;
    validateParam(
      'content',
      content,
      OFFCANVAS_STATE_SCHEMA.content,
      'Offcanvas.state'
    );
    this.runtime.cache.hasContent = false;
    this.runtime.cache.content = null;
    this.runtime.cache.updatedAt = 0;

    if (typeof content === 'function') {
      if (this.state.visible) await this.loadContent();
      else this.clearContent();
      return;
    }

    this.runtime.contentLoadId += 1;
    flushSync(() => {
      this.state.loading = false;
    });
    this.renderContent(content);
  }

  private isCacheValid(): boolean {
    if (!this.props.cache || !this.runtime.cache.hasContent) return false;

    const ttl = normalizeTtl(this.props.ttl);
    return !ttl || Date.now() - this.runtime.cache.updatedAt <= ttl;
  }

  private clearContent(): void {
    if (this.dom.content) this.dom.content.textContent = '';
  }

  private renderContent(content: RenderableContent<Offcanvas>): void {
    if (!this.dom.content) return;

    this.clearContent();
    this.dom.content.append(...normalizeContentNodes(content, this));
  }

  private async loadContent(): Promise<void> {
    const { cache } = this.props;
    const content = this.state.content;
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
      this.clearContent();
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

    if (this.dom.overlay && bgClose) {
      this.cleanup.events.on('overlay', this.dom.overlay, 'click', () => {
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

  private unbindEvents(): void {
    this.cleanup.events.clear();
  }

  private showPanel(): void {
    const { id } = this.props;
    timer.cancel(`oc-hide-${id}`);

    if (this.dom.overlay && !this.dom.overlay.isConnected) {
      this.dom.overlay.hidden = false;
      document.body.appendChild(this.dom.overlay);
    }
    if (this.dom.root && !this.dom.root.isConnected) {
      document.body.appendChild(this.dom.root);
    }
    if (this.props.bodyOverflow) {
      document.body.style.overflow = 'hidden';
    }

    timer.start(`oc-show-${id}`, 10, () => {
      this.dom.root?.setAttribute('aria-expanded', 'true');
    });
  }

  private hidePanel(): void {
    const { id } = this.props;
    timer.cancel(`oc-show-${id}`);
    timer.cancel(`oc-shown-${id}`);

    this.dom.root?.setAttribute('aria-expanded', 'false');

    timer.start(`oc-hide-${id}`, 100, () => {
      this.dom.overlay?.remove();
      this.dom.root?.remove();
      if (this.props.bodyOverflow) {
        document.body.style.overflow = '';
      }
    });
  }

  async show(): Promise<void> {
    this.assertBuilt('show');
    if (this.state.visible) return;

    const { onShow, onShown, id } = this.props;
    if (onShow) await Promise.resolve(onShow(this));

    this.showPanel();
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
    this.assertBuilt('hide');
    if (!this.state.visible) return;

    const { onHide, onHidden } = this.props;
    if (onHide) await Promise.resolve(onHide(this));

    this.runtime.contentLoadId += 1;
    flushSync(() => {
      this.state.loading = false;
    });

    this.unbindEvents();
    this.hidePanel();

    flushSync(() => {
      this.state.visible = false;
    });

    void onHidden?.(this);
  }

  protected onDestroy(): void {
    const { id } = this.props;

    timer.cancel(`oc-show-${id}`);
    timer.cancel(`oc-hide-${id}`);
    timer.cancel(`oc-shown-${id}`);

    this.unbindEvents();
    this.cleanup.state?.();
    this.cleanup.state = null;

    this.dom.root?.setAttribute('aria-expanded', 'false');
    this.dom.overlay?.remove();
    this.dom.root?.remove();
    if (this.props.bodyOverflow) {
      document.body.style.overflow = '';
    }

    this.runtime.built = false;
  }

  protected override validateStatePatch(patch: Partial<OffcanvasState>): void {
    validateParam(
      'state',
      patch,
      {
        type: 'plainObject',
      },
      'Offcanvas.setState'
    );

    for (const key of Object.keys(patch)) {
      if (!Object.hasOwn(OFFCANVAS_STATE_SCHEMA, key)) {
        throw new Error(
          `Offcanvas.setState: "${key}" is not a supported state key.`
        );
      }
      const stateKey = key as keyof typeof OFFCANVAS_STATE_SCHEMA;
      validateParam(
        key,
        patch[key as keyof OffcanvasState],
        OFFCANVAS_STATE_SCHEMA[stateKey],
        'Offcanvas.setState'
      );
    }
  }
}

export type Offcanvas = OffcanvasComponent;

export function createOffcanvas(input: OffcanvasProps = {}): Offcanvas {
  return new OffcanvasComponent(input);
}

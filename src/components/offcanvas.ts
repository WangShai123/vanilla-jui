import {
  createDeepStore,
  createEffect,
  createSignal,
  flushSync,
  insert,
  jsx,
  untrack,
} from 'vanilla-signal';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
import { createLoading } from '../primitives/loading.ts';
import { asRenderable, type RenderableContent } from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import { createEventManager } from '../utilities/events.ts';
import { createMotionGroup, createTransition } from '../core/motion.ts';
import { createPresence } from '../core/presence.ts';
import { createElementRef } from '../utilities/refs.ts';
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

interface ResolvedOffcanvasContent {
  value: RenderableContent<Offcanvas>;
}

interface OffcanvasCache {
  content: RenderableContent<Offcanvas>;
  hasContent: boolean;
  updatedAt: number;
}

interface OffcanvasRuntimeExtras {
  cache: OffcanvasCache;
  contentLoadId: number;
}

const DEFAULT_CLASS_NAMES: OffcanvasClassNames = {
  root: 'j-offcanvas',
  overlay: 'j-offcanvas-overlay',
  content: 'offcanvas-content',
};

const OFFCANVAS_HIDDEN_TRANSFORM: Record<OffcanvasDirection, string> = {
  top: 'translateY(-100%)',
  right: 'translateX(100%)',
  bottom: 'translateY(100%)',
  left: 'translateX(-100%)',
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
  visible: { type: 'boolean' },
  loading: { type: 'boolean' },
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

interface OffcanvasActions {
  show(): Promise<void>;
  hide(): Promise<void>;
}

let offcanvasScrollLockCount = 0;
let offcanvasBodyOverflow = '';

export type Offcanvas = FunctionalComponent<
  ResolvedOffcanvasProps,
  OffcanvasState,
  HTMLElement,
  OffcanvasActions
>;

function validateStatePatch(patch: Partial<OffcanvasState>): void {
  validateParam('state', patch, { type: 'plainObject' }, 'Offcanvas.setState');
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

export function createOffcanvas(input: OffcanvasProps = {}): Offcanvas {
  const props = normalizeProps(input);
  const state = createDeepStore({
    content: props.content,
    visible: false,
    loading: false,
  }) as OffcanvasState;
  const [resolvedContent, setResolvedContent] =
    createSignal<ResolvedOffcanvasContent>({
      value: typeof props.content === 'function' ? null : props.content,
    });
  const runtime: OffcanvasRuntimeExtras = {
    cache: { content: null, hasContent: false, updatedAt: 0 },
    contentLoadId: 0,
  };
  const events = createEventManager();
  const overlayRef = createElementRef<HTMLElement>();
  let offcanvas!: Offcanvas;
  let scrollLocked = false;

  const lockScroll = (): void => {
    if (!props.bodyOverflow || scrollLocked) return;
    if (offcanvasScrollLockCount === 0) {
      offcanvasBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    offcanvasScrollLockCount += 1;
    scrollLocked = true;
  };
  const unlockScroll = (): void => {
    if (!scrollLocked) return;
    offcanvasScrollLockCount = Math.max(0, offcanvasScrollLockCount - 1);
    if (offcanvasScrollLockCount === 0) {
      document.body.style.overflow = offcanvasBodyOverflow;
      offcanvasBodyOverflow = '';
    }
    scrollLocked = false;
  };

  const panelMotion = createTransition(() => offcanvas.element, {
    keyframes: [
      { transform: OFFCANVAS_HIDDEN_TRANSFORM[props.direction] },
      { transform: 'translate(0, 0)' },
    ],
    options: { duration: 300, easing: 'ease' },
  });
  const motion = createMotionGroup(
    ...(props.animate === 'slide' ? [panelMotion] : []),
    createTransition(() => overlayRef.current, {
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      options: { duration: 300, easing: 'ease' },
    })
  );

  const presence = createPresence({
    elements: () => [overlayRef.current, offcanvas.element],
    mount: () => {
      const overlay = overlayRef.current;
      if (overlay && !overlay.isConnected) insert(document.body, overlay);
      offcanvas.mount(document.body);
      lockScroll();
    },
    activate: () => {
      state.visible = true;
    },
    deactivate: () => {
      state.visible = false;
    },
    motion,
    unmount: () => {
      overlayRef.current?.remove();
      offcanvas.unmount();
      unlockScroll();
    },
  });

  const clearCache = (): void => {
    runtime.cache = { content: null, hasContent: false, updatedAt: 0 };
  };

  const isCacheValid = (): boolean => {
    if (!props.cache || !runtime.cache.hasContent) return false;
    const ttl = normalizeTtl(props.ttl);
    return !ttl || Date.now() - runtime.cache.updatedAt <= ttl;
  };
  const renderResolvedContent = (): RenderableContent<Offcanvas> => {
    const content = resolvedContent().value;
    return typeof content === 'function' ? content(offcanvas) : content;
  };

  const loadContent = async (): Promise<void> => {
    const content = state.content;
    if (typeof content !== 'function') {
      runtime.contentLoadId += 1;
      flushSync(() => {
        setResolvedContent({ value: content });
        state.loading = false;
      });
      return;
    }
    if (isCacheValid()) {
      runtime.contentLoadId += 1;
      flushSync(() => {
        setResolvedContent({ value: runtime.cache.content });
        state.loading = false;
      });
      return;
    }

    const loadId = ++runtime.contentLoadId;
    flushSync(() => {
      state.loading = true;
      setResolvedContent({ value: null });
    });
    try {
      const result = await Promise.resolve(content(offcanvas));
      if (offcanvas.runtime.destroyed || loadId !== runtime.contentLoadId)
        return;
      if (props.cache) {
        runtime.cache = {
          content: result,
          hasContent: true,
          updatedAt: Date.now(),
        };
      }
      flushSync(() => {
        setResolvedContent({ value: result });
      });
    } finally {
      if (!offcanvas.runtime.destroyed && loadId === runtime.contentLoadId) {
        flushSync(() => {
          state.loading = false;
        });
      }
    }
  };

  const actions: OffcanvasActions = {
    async show() {
      if (!offcanvas.runtime.built) {
        throw new Error('Offcanvas.show: call build() first.');
      }
      if (state.visible) return;
      await Promise.resolve(props.onShow?.(offcanvas));

      const entering = presence.enter();
      const loading = loadContent();
      if ((await entering) && !offcanvas.runtime.destroyed) {
        void props.onShown?.(offcanvas);
      }
      await loading;
    },
    async hide() {
      if (!offcanvas.runtime.built) {
        throw new Error('Offcanvas.hide: call build() first.');
      }
      if (!state.visible) return;
      const onHideResult = props.onHide?.(offcanvas);
      if (onHideResult) await onHideResult;

      runtime.contentLoadId += 1;
      flushSync(() => {
        state.loading = false;
      });
      if (await presence.leave()) {
        void props.onHidden?.(offcanvas);
      }
    },
  };

  offcanvas = defineComponent({
    name: 'Offcanvas',
    props,
    state,
    actions,
    validateStatePatch,
    view(context) {
      const overlay = props.overlay
        ? (jsx('div', {
            ref: overlayRef.set,
            className: props.className.overlay,
            'data-offcanvas-overlay': props.id,
            'data-mount': () => (state.visible ? 'true' : 'false'),
            style: props.filter ? { backdropFilter: 'blur(2px)' } : {},
            onClick: () => {
              if (props.bgClose) void offcanvas.hide();
            },
          }) as HTMLElement)
        : null;
      if (overlay) context.own(() => overlay.remove());

      createEffect(() => {
        const content = state.content;
        validateParam(
          'content',
          content,
          OFFCANVAS_STATE_SCHEMA.content,
          'Offcanvas.state'
        );
        clearCache();
        if (typeof content === 'function') {
          setResolvedContent({ value: null });
          if (untrack(() => state.visible)) void loadContent();
        } else {
          runtime.contentLoadId += 1;
          setResolvedContent({ value: content });
          state.loading = false;
        }
      });

      return jsx('div', {
        className: props.className.root,
        id: props.id,
        role: 'dialog',
        'aria-modal': props.overlay ? 'true' : 'false',
        'aria-expanded': () => String(state.visible),
        'data-mount': () => (state.visible ? 'true' : 'false'),
        'data-offcanvas': 'root',
        'data-direction': props.direction,
        'data-animate': props.animate,
        onClick: (event: Event) => {
          if (!(event.target instanceof Element)) return;
          const action = event.target.closest<HTMLElement>('[data-action]');
          if (
            action?.dataset.action === 'close' ||
            action?.dataset.action === 'cancel'
          ) {
            void offcanvas.hide();
          }
        },
        children: jsx('div', {
          className: props.className.content,
          'data-offcanvas-content': props.id,
          children: () =>
            asRenderable(
              state.loading ? createLoading() : renderResolvedContent()
            ),
        }),
      }) as HTMLElement;
    },
    onBuild(context) {
      if (props.escClose) {
        events.on('esc', document, 'keydown', (event) => {
          if (
            event instanceof KeyboardEvent &&
            event.key === 'Escape' &&
            state.visible
          ) {
            void offcanvas.hide();
          }
        });
      }
      context.own(() => events.clear());
    },
    onDestroy() {
      presence.cancel();
      runtime.contentLoadId += 1;
      overlayRef.current?.remove();
      unlockScroll();
    },
  });

  return offcanvas;
}

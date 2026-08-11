import {
  createDeepStore,
  createEffect,
  createSignal,
  flushSync,
  jsx,
  untrack,
} from 'vanilla-signal';
import { t } from 'vanilla-signal-i18n';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
import locales from '../locales/index.ts';
import { icon } from '../primitives/icons.ts';
import { createLoading } from '../primitives/loading.ts';
import { createPopup } from '../primitives/popup.ts';
import { joinClasses } from '../utilities/class-name.ts';
import {
  all,
  asRenderable,
  q,
  type RenderableContent,
} from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import { createMotionGroup, createTransition } from '../core/motion.ts';
import { isPlainObject } from '../utilities/object.ts';
import { createPresence } from '../core/presence.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';

type ModalTextInput = Partial<ModalText> & Record<string, unknown>;
type ModalContentResult = RenderableContent<Modal>;
type ModalContent =
  | ModalContentResult
  | ((modal: Modal) => ModalContentResult | Promise<ModalContentResult>);
interface ResolvedModalContent {
  value: ModalContentResult;
}

export interface ModalClassNames {
  layout: string;
  modal: string;
  header: string;
  body: string;
  footer: string;
  title: string;
  closeBtn: string;
  cancelBtn: string;
  confirmBtn: string;
  button: string;
}

export type ModalClassNameConfig = Partial<ModalClassNames>;

export interface ModalText {
  title: string;
  confirm: string;
  cancel: string;
}

type ModalStyle = string | Partial<CSSStyleDeclaration> | null;

export interface ModalProps extends Record<string, unknown> {
  content?: ModalContent;
  cache?: boolean;
  ttl?: number;
  position?: string;
  showCancel?: boolean;
  showClose?: boolean;
  fullscreen?: boolean;
  text?: ModalTextInput;
  onShow?: ((modal: Modal) => void | Promise<void>) | null;
  onShown?: ((modal: Modal) => void | Promise<void>) | null;
  onHide?: ((modal: Modal) => void | Promise<void>) | null;
  onHidden?: ((modal: Modal) => void | Promise<void>) | null;
  onConfirm?: ((modal: Modal) => void | Promise<void>) | null;
  onCancel?: ((modal: Modal) => void | Promise<void>) | null;
  header?: boolean;
  footer?: boolean;
  style?: ModalStyle;
  id?: string | null;
  escClose?: boolean;
  bgClose?: boolean;
  className?: ModalClassNameConfig;
}

interface ResolvedModalProps extends Record<string, unknown> {
  content: ModalContent;
  cache: boolean;
  ttl: number;
  position: string;
  showCancel: boolean;
  showClose: boolean;
  fullscreen: boolean;
  style: ModalStyle;
  text: ModalText;
  onShow: NonNullable<ModalProps['onShow']> | null;
  onShown: NonNullable<ModalProps['onShown']> | null;
  onHide: NonNullable<ModalProps['onHide']> | null;
  onHidden: NonNullable<ModalProps['onHidden']> | null;
  onConfirm: NonNullable<ModalProps['onConfirm']> | null;
  onCancel: NonNullable<ModalProps['onCancel']> | null;
  header: boolean;
  footer: boolean;
  id: string;
  escClose: boolean;
  bgClose: boolean;
  className: ModalClassNames;
}

interface ModalState extends Record<string, unknown> {
  content: ModalContent;
  loading: boolean;
  processing: boolean;
  visible: boolean;
}

interface ModalCache {
  initial: ResolvedModalProps;
  previousActiveElement: HTMLElement | null;
  content: ModalContentResult;
  contentSource: ModalContent | null;
  hasContent: boolean;
  updatedAt: number;
}

type ModalStatePatch = Partial<ModalState>;

const DEFAULT_CLASS_NAMES: ModalClassNames = {
  layout: 'j-popup-layout',
  modal: 'j-modal',
  header: 'modal-header',
  body: 'modal-body',
  footer: 'modal-footer',
  title: 'modal-title',
  button: 'j-button',
  closeBtn: 'is-icon is-sm is-ghost',
  cancelBtn: 'is-ghost',
  confirmBtn: 'is-primary',
};

function cloneProps(props: ResolvedModalProps): ResolvedModalProps {
  return {
    ...props,
    text: { ...props.text },
    className: { ...props.className },
  };
}

function createModalState(props: ResolvedModalProps): ModalState {
  return {
    content: props.content,
    loading: false,
    processing: false,
    visible: false,
  };
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return !!value && typeof (value as PromiseLike<T>).then === 'function';
}

function normalizeTtl(ttl: number): number {
  return Number.isFinite(ttl) ? Math.max(0, ttl) : 0;
}

const MODAL_CONTENT_RULE = {
  type: 'renderable',
};

const MODAL_TEXT_RULE = {
  default: {},
  type: 'object',
  plain: true,
  normalize: (value: unknown) => {
    const text = (isPlainObject(value) ? value : {}) as ModalTextInput;
    return {
      ...text,
      title: typeof text.title === 'string' ? text.title : 'Tip',
      confirm: typeof text.confirm === 'string' ? text.confirm : 'Confirm',
      cancel: typeof text.cancel === 'string' ? text.cancel : 'Cancel',
    };
  },
};

const MODAL_PROPS_SCHEMA = {
  content: { default: '', ...MODAL_CONTENT_RULE },
  cache: { default: false, type: 'boolean' },
  ttl: { default: 0, type: 'number' },
  position: { default: 'center', type: 'string' },
  showCancel: { default: true, type: 'boolean' },
  showClose: { default: true, type: 'boolean' },
  fullscreen: { default: false, type: 'boolean' },
  text: MODAL_TEXT_RULE,
  onShow: { default: null, types: ['function', 'null'] },
  onShown: { default: null, types: ['function', 'null'] },
  onHide: { default: null, types: ['function', 'null'] },
  onHidden: { default: null, types: ['function', 'null'] },
  onConfirm: { default: null, types: ['function', 'null'] },
  onCancel: { default: null, types: ['function', 'null'] },
  header: { default: true, type: 'boolean' },
  footer: { default: true, type: 'boolean' },
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
  escClose: { default: false, type: 'boolean' },
  bgClose: { default: false, type: 'boolean' },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
} satisfies ResolveSchema<ModalProps>;

const MODAL_STATE_SCHEMA = {
  content: MODAL_PROPS_SCHEMA.content,
  loading: { default: false, type: 'boolean' },
  processing: { default: false, type: 'boolean' },
  visible: { default: false, type: 'boolean' },
};

const MODAL_UPDATE_RULE = {
  type: 'plainObject',
};

function normalizeProps(input: ModalProps): ResolvedModalProps {
  const props = resolveProps(input, MODAL_PROPS_SCHEMA, 'Modal');
  return {
    content: props.content as ModalContent,
    cache: props.cache as boolean,
    ttl: normalizeTtl(props.ttl as number),
    position: props.position as string,
    showCancel: props.showCancel as boolean,
    showClose: props.showClose as boolean,
    fullscreen: props.fullscreen as boolean,
    text: props.text as ModalText,
    onShow: props.onShow as ResolvedModalProps['onShow'],
    onShown: props.onShown as ResolvedModalProps['onShown'],
    onHide: props.onHide as ResolvedModalProps['onHide'],
    onHidden: props.onHidden as ResolvedModalProps['onHidden'],
    onConfirm: props.onConfirm as ResolvedModalProps['onConfirm'],
    onCancel: props.onCancel as ResolvedModalProps['onCancel'],
    header: props.header as boolean,
    footer: props.footer as boolean,
    id: props.id as string,
    escClose: props.escClose as boolean,
    bgClose: props.bgClose as boolean,
    className: props.className as ModalClassNames,
    style: props.style as ModalStyle,
  };
}

let modalScrollLockCount = 0;
let modalBodyOverflow = '';

interface ModalActions {
  show(): Modal;
  hide(): Modal;
  reset(): Modal;
}

export type Modal = FunctionalComponent<
  ResolvedModalProps,
  ModalState,
  HTMLElement,
  ModalActions
>;

export function createModal(input: ModalProps = {}): Modal {
  const props = normalizeProps(input);
  const state = createDeepStore(createModalState(props)) as ModalState;
  const cache: ModalCache = {
    initial: cloneProps(props),
    previousActiveElement: null,
    content: null,
    contentSource: null,
    hasContent: false,
    updatedAt: 0,
  };
  const events = new Map<string, () => void>();
  const [motionVisible, setMotionVisible] = createSignal(false);
  const [resolvedContent, setResolvedContent] =
    createSignal<ResolvedModalContent>({ value: null });
  let modal!: Modal;
  let dialog: HTMLElement | null = null;
  let loadingElement: HTMLDivElement | null = null;
  let scrollLocked = false;
  let contentLoadId = 0;

  const isBusy = (): boolean => state.processing;
  const isContentCacheValid = (source: ModalContent): boolean => {
    if (!props.cache || !cache.hasContent || cache.contentSource !== source) {
      return false;
    }
    const ttl = normalizeTtl(props.ttl);
    return !ttl || Date.now() - cache.updatedAt <= ttl;
  };
  const setContentCache = (
    source: ModalContent,
    content: ModalContentResult
  ): void => {
    if (!props.cache) return;
    cache.content = content;
    cache.contentSource = source;
    cache.hasContent = true;
    cache.updatedAt = Date.now();
  };
  const clearContentCache = (): void => {
    cache.content = null;
    cache.contentSource = null;
    cache.hasContent = false;
    cache.updatedAt = 0;
  };
  const clearEvents = (): void => {
    for (const dispose of events.values()) dispose();
    events.clear();
  };
  const listen = (
    key: string,
    target: EventTarget,
    type: string,
    listener: EventListener
  ): void => {
    events.get(key)?.();
    target.addEventListener(type, listener);
    events.set(key, () => target.removeEventListener(type, listener));
  };
  const lockScroll = (): void => {
    if (scrollLocked) return;
    if (modalScrollLockCount === 0) {
      modalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    modalScrollLockCount += 1;
    scrollLocked = true;
  };
  const unlockScroll = (): void => {
    if (!scrollLocked) return;
    modalScrollLockCount = Math.max(0, modalScrollLockCount - 1);
    if (modalScrollLockCount === 0) {
      document.body.style.overflow = modalBodyOverflow;
      modalBodyOverflow = '';
    }
    scrollLocked = false;
  };
  const restoreFocus = (): void => {
    const target = cache.previousActiveElement;
    cache.previousActiveElement = null;
    if (target && document.contains(target)) target.focus();
  };
  const motion = createMotionGroup(
    createTransition(() => modal.element, {
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      options: {
        duration: 220,
        easing: 'ease',
      },
    }),
    createTransition(() => dialog, {
      keyframes: [
        { opacity: 0, transform: 'scale(0.96)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      options: {
        duration: 220,
        easing: 'ease',
      },
    })
  );
  const presence = createPresence({
    elements: () => [modal.element, dialog],
    mount: () => {
      modal.mount(document.body);
      lockScroll();
    },
    activate: () => setMotionVisible(true),
    deactivate: () => setMotionVisible(false),
    motion,
    unmount: () => {
      modal.unmount();
      unlockScroll();
      restoreFocus();
    },
  });
  const syncLoadingElement = (): void => {
    const busy = state.loading || state.processing;
    if (busy) {
      if (!loadingElement) loadingElement = createLoading();
      if (dialog && loadingElement.parentElement !== dialog) {
        dialog.append(loadingElement);
      }
      return;
    }
    loadingElement?.remove();
    loadingElement = null;
  };
  const setProcessing = (value: boolean): void => {
    if (state.processing === value) return;
    flushSync(() => {
      state.processing = value;
    });
  };
  const finishProcessing = (): void => {
    if (state.visible && presence.phase !== 'leaving') {
      setProcessing(false);
    }
  };
  const loadContent = (source: ModalContent = state.content): void => {
    if (isContentCacheValid(source)) {
      contentLoadId += 1;
      flushSync(() => {
        setResolvedContent({ value: cache.content });
        state.loading = false;
      });
      return;
    }

    const loadId = ++contentLoadId;
    if (typeof source !== 'function') {
      clearContentCache();
      flushSync(() => {
        setResolvedContent({ value: source });
        state.loading = false;
      });
      return;
    }

    let result: ModalContentResult | Promise<ModalContentResult>;
    try {
      result = source(modal);
    } catch (error) {
      console.error('Modal.content error:', error);
      flushSync(() => {
        setResolvedContent({ value: null });
        state.loading = false;
      });
      return;
    }
    if (!isPromiseLike<ModalContentResult>(result)) {
      setContentCache(source, result);
      flushSync(() => {
        setResolvedContent({ value: result });
        state.loading = false;
      });
      return;
    }

    flushSync(() => {
      state.loading = true;
      setResolvedContent({ value: null });
    });
    void Promise.resolve(result)
      .then((content) => {
        if (modal.runtime.destroyed || loadId !== contentLoadId) return;
        setContentCache(source, content);
        flushSync(() => {
          setResolvedContent({ value: content });
        });
      })
      .catch((error) => {
        if (modal.runtime.destroyed || loadId !== contentLoadId) return;
        console.error('Modal.content error:', error);
        flushSync(() => {
          setResolvedContent({ value: null });
        });
      })
      .finally(() => {
        if (!modal.runtime.destroyed && loadId === contentLoadId) {
          flushSync(() => {
            state.loading = false;
          });
        }
      });
  };
  const handleConfirm = (): void => {
    if (isBusy()) return;
    let result: void | Promise<void> | undefined;
    try {
      result = props.onConfirm?.(modal);
    } catch (error) {
      console.error('Modal.onConfirm error:', error);
      return;
    }
    if (!isPromiseLike<void>(result)) return;
    setProcessing(true);
    void Promise.resolve(result)
      .catch((error) => {
        console.error('Modal.onConfirm error:', error);
      })
      .finally(() => {
        if (!modal.runtime.destroyed) finishProcessing();
      });
  };
  const handleCancel = (): void => {
    if (isBusy()) return;
    let result: void | Promise<void> | undefined;
    try {
      result = props.onCancel?.(modal);
    } catch (error) {
      console.error('Modal.onCancel error:', error);
      return;
    }
    if (!isPromiseLike<void>(result)) {
      modal.hide();
      return;
    }
    setProcessing(true);
    void Promise.resolve(result)
      .then(() => {
        if (modal.runtime.destroyed) return;
        modal.hide();
      })
      .catch((error) => {
        console.error('Modal.onCancel error:', error);
      })
      .finally(() => {
        if (!modal.runtime.destroyed) {
          finishProcessing();
        }
      });
  };
  const trapFocus = (event: KeyboardEvent): void => {
    if (!dialog) return;
    const focusable = all<HTMLElement>(
      'a[href], button:not([disabled]):not([data-action=close]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      dialog
    ).filter(
      (element) =>
        element.offsetParent !== null || element === document.activeElement
    );
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  const focusFirst = (): void => {
    if (!dialog) return;
    const first = q<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-action=close]), [tabindex]:not([tabindex="-1"])',
      dialog
    );
    if (first) first.focus();
    else {
      dialog.setAttribute('tabindex', '-1');
      dialog.focus();
    }
  };
  const bindVisibleEvents = (): void => {
    const root = modal.element;
    if (!root || !dialog) return;
    clearEvents();
    listen('root', root, 'click', (event) => {
      if (props.bgClose && !isBusy() && event.target === root) modal.hide();
    });
    listen('dialog', dialog, 'click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const action =
        target?.closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'cancel' || action === 'close') handleCancel();
      else if (action === 'confirm') handleConfirm();
    });
    listen('keyboard', document, 'keydown', (event) => {
      if (!(event instanceof KeyboardEvent) || !state.visible) return;
      if (event.key === 'Escape' && props.escClose && !isBusy()) {
        event.preventDefault();
        modal.hide();
      } else if (event.key === 'Tab') trapFocus(event);
    });
  };
  const showFromState = (): void => {
    if (presence.phase === 'visible' || presence.phase === 'entering') return;
    if (!modal.element) {
      throw new Error('Modal.show: build() must be called before show().');
    }
    void props.onShow?.(modal);
    cache.previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const entering = presence.enter();
    bindVisibleEvents();
    focusFirst();
    void entering.then((completed) => {
      if (completed && !modal.runtime.destroyed) void props.onShown?.(modal);
    });
  };
  const hideFromState = (): void => {
    if (presence.phase === 'hidden' || presence.phase === 'leaving') return;
    void props.onHide?.(modal);
    clearEvents();
    contentLoadId += 1;
    void presence.leave().then((completed) => {
      if (completed && !modal.runtime.destroyed) {
        flushSync(() => {
          state.loading = false;
          state.processing = false;
          if (!props.cache) setResolvedContent({ value: null });
        });
        void props.onHidden?.(modal);
      }
    });
  };

  modal = defineComponent({
    name: 'Modal',
    props,
    state,
    actions: {
      show() {
        if (!modal.runtime.built) {
          throw new Error('Modal.show: build() must be called before show().');
        }
        modal.setState('visible', true);
        return modal;
      },
      hide() {
        flushSync(() => {
          state.visible = false;
        });
        return modal;
      },
      reset() {
        modal.setState({
          content: cache.initial.content,
          loading: false,
          processing: false,
        });
        clearContentCache();
        setResolvedContent({ value: null });
        return modal;
      },
    },
    normalizeStatePatch(patch: ModalStatePatch) {
      return {
        ...patch,
      };
    },
    validateStatePatch(patch: ModalStatePatch) {
      validateParam('state', patch, MODAL_UPDATE_RULE, 'Modal.setState');
      for (const key of Object.keys(patch)) {
        if (!Object.hasOwn(MODAL_STATE_SCHEMA, key)) {
          throw new Error(
            `Modal.setState: "${key}" is not a supported state key.`
          );
        }
        validateParam(
          key,
          patch[key as keyof ModalStatePatch],
          MODAL_STATE_SCHEMA[key as keyof typeof MODAL_STATE_SCHEMA],
          'Modal.setState'
        );
      }
    },
    view: () => {
      dialog = jsx('div', {
        className: joinClasses(
          props.className.modal,
          props.fullscreen ? 'is-fullscreen' : ''
        ),
        id: props.id,
        role: 'document',
        'data-modal-dialog': props.id,
        ...(props.style ? { style: props.style } : {}),
        'data-mount': () => (motionVisible() ? 'true' : 'false'),
        children: [
          props.header
            ? jsx('div', {
                className: props.className.header,
                children: () =>
                  state.loading
                    ? null
                    : [
                        jsx('div', {
                          className: props.className.title,
                          id: `${props.id}_title`,
                          'aria-label': props.text.title,
                          children: props.text.title,
                        }),
                        props.showClose
                          ? jsx('button', {
                              type: 'button',
                              className: joinClasses(
                                props.className.button,
                                props.className.closeBtn
                              ),
                              'data-action': 'close',
                              'aria-label': t('Close', locales),
                              disabled: isBusy,
                              children: icon('close'),
                            })
                          : null,
                      ],
              })
            : null,
          jsx('div', {
            className: props.className.body,
            'data-modal-body': '',
            children: () => {
              return asRenderable(resolvedContent().value);
            },
          }),
          props.footer
            ? jsx('div', {
                className: props.className.footer,
                children: () =>
                  state.loading
                    ? null
                    : [
                        props.showCancel
                          ? jsx('button', {
                              type: 'button',
                              className: joinClasses(
                                props.className.button,
                                props.className.cancelBtn
                              ),
                              'data-action': 'cancel',
                              disabled: isBusy,
                              children: props.text.cancel,
                            })
                          : null,
                        jsx('button', {
                          type: 'button',
                          className: joinClasses(
                            props.className.button,
                            props.className.confirmBtn
                          ),
                          'data-action': 'confirm',
                          disabled: isBusy,
                          children: props.text.confirm,
                        }),
                      ],
              })
            : null,
        ],
      }) as HTMLElement;
      const root = createPopup({
        className: props.className.layout,
        position: props.position,
        component: 'modal',
        labelledby: props.header ? `${props.id}_title` : '',
        content: dialog,
      });
      root.setAttribute('data-mount', 'false');
      if (!props.header)
        root.setAttribute('aria-label', props.text.title || 'Modal');
      createEffect(() => {
        root.setAttribute('data-mount', motionVisible() ? 'true' : 'false');
      });
      createEffect(syncLoadingElement);
      createEffect(() => {
        const visible = state.visible;
        untrack(() => (visible ? showFromState() : hideFromState()));
      });
      createEffect(() => {
        const visible = state.visible;
        const content = state.content;
        untrack(() => {
          if (visible) loadContent(content);
          else {
            contentLoadId += 1;
          }
        });
        void content;
      });
      return root;
    },
    onDestroy() {
      const wasVisible = presence.phase !== 'hidden';
      if (wasVisible) void props.onHide?.(modal);
      presence.cancel();
      clearEvents();
      unlockScroll();
      restoreFocus();
      loadingElement?.remove();
      loadingElement = null;
      dialog = null;
      if (wasVisible) void props.onHidden?.(modal);
    },
  }) as Modal;

  return modal;
}

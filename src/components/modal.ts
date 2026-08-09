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
  q,
  type RenderableContent,
} from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import { createTransition } from '../core/motion.ts';
import { isPlainObject } from '../utilities/object.ts';
import { createPresence } from '../core/presence.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';
import { createForm, type FormDataRecord, type FormField } from './form.ts';

type ModalTextInput = Partial<ModalText> & Record<string, unknown>;
type ModalContent = RenderableContent<Modal>;
type FormInstance = ReturnType<typeof createForm>;
export type ModalMode = 'content' | 'form';

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

export interface ModalProps extends Record<string, unknown> {
  mode?: ModalMode | null;
  content?: ModalContent;
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
  onSubmit?:
    | ((data: FormDataRecord, modal: Modal) => void | Promise<void>)
    | null;
  onCancel?: ((modal: Modal) => void | Promise<void>) | null;
  fields?: readonly FormField[] | null;
  header?: boolean;
  footer?: boolean;
  id?: string | null;
  escClose?: boolean;
  bgClose?: boolean;
  className?: ModalClassNameConfig;
}

interface ResolvedModalProps extends Record<string, unknown> {
  mode: ModalMode;
  content: ModalContent;
  position: string;
  showCancel: boolean;
  showClose: boolean;
  fullscreen: boolean;
  text: ModalText;
  onShow: NonNullable<ModalProps['onShow']> | null;
  onShown: NonNullable<ModalProps['onShown']> | null;
  onHide: NonNullable<ModalProps['onHide']> | null;
  onHidden: NonNullable<ModalProps['onHidden']> | null;
  onConfirm: NonNullable<ModalProps['onConfirm']> | null;
  onSubmit: NonNullable<ModalProps['onSubmit']> | null;
  onCancel: NonNullable<ModalProps['onCancel']> | null;
  fields: FormField[] | null;
  header: boolean;
  footer: boolean;
  id: string;
  escClose: boolean;
  bgClose: boolean;
  className: ModalClassNames;
}

interface ModalState extends Record<string, unknown> {
  mode: ModalMode;
  content: ModalContent;
  fields: FormField[] | null;
  loading: boolean;
  processing: boolean;
  visible: boolean;
  data: FormDataRecord | null;
  extraData: FormDataRecord | null;
}

interface ModalCache {
  initial: ResolvedModalProps;
  previousActiveElement: HTMLElement | null;
  formId: string;
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

function cloneFields(
  fields: readonly FormField[] | null | undefined
): FormField[] {
  if (!Array.isArray(fields)) return [];
  return fields.map((field) => ({
    ...field,
    options: Array.isArray(field.options)
      ? field.options.map(
          (option: NonNullable<FormField['options']>[number]) =>
            option && typeof option === 'object' ? { ...option } : option
        )
      : field.options,
  }));
}

function cloneProps(props: ResolvedModalProps): ResolvedModalProps {
  return {
    ...props,
    fields: Array.isArray(props.fields) ? cloneFields(props.fields) : null,
    text: { ...props.text },
    className: { ...props.className },
  };
}

function createModalState(props: ResolvedModalProps): ModalState {
  return {
    mode: props.mode,
    content: props.content,
    fields: Array.isArray(props.fields) ? cloneFields(props.fields) : null,
    loading: false,
    processing: false,
    visible: false,
    data: null,
    extraData: null,
  };
}

function mergeExtraData(
  data: FormDataRecord,
  extraData: FormDataRecord | null
): FormDataRecord {
  if (!extraData || typeof extraData !== 'object') return data;
  return Object.assign(data, extraData);
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

const MODAL_FIELDS_RULE = { types: ['array', 'null'] };
const MODAL_PROPS_SCHEMA = {
  mode: {
    default: null,
    types: ['string', 'null'],
    enum: ['content', 'form', null],
    normalize: (value: unknown, context) => {
      if (value != null) return value;
      return Array.isArray(context.options.fields) ? 'form' : 'content';
    },
  },
  content: { default: '', ...MODAL_CONTENT_RULE },
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
  onSubmit: { default: null, types: ['function', 'null'] },
  onCancel: { default: null, types: ['function', 'null'] },
  fields: { default: null, ...MODAL_FIELDS_RULE },
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
  mode: { type: 'string', enum: ['content', 'form'] },
  content: MODAL_PROPS_SCHEMA.content,
  fields: MODAL_PROPS_SCHEMA.fields,
  loading: { default: false, type: 'boolean' },
  processing: { default: false, type: 'boolean' },
  visible: { default: false, type: 'boolean' },
  data: { default: null, types: ['object', 'null'] },
  extraData: { default: null, types: ['object', 'null'] },
};

const MODAL_UPDATE_RULE = {
  type: 'plainObject',
};

function normalizeProps(input: ModalProps): ResolvedModalProps {
  const props = resolveProps(input, MODAL_PROPS_SCHEMA, 'Modal');
  return {
    mode: props.mode as ModalMode,
    content: props.content as ModalContent,
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
    onSubmit: props.onSubmit as ResolvedModalProps['onSubmit'],
    onCancel: props.onCancel as ResolvedModalProps['onCancel'],
    fields: Array.isArray(props.fields)
      ? cloneFields(props.fields as FormField[])
      : null,
    header: props.header as boolean,
    footer: props.footer as boolean,
    id: props.id as string,
    escClose: props.escClose as boolean,
    bgClose: props.bgClose as boolean,
    className: props.className as ModalClassNames,
  };
}

let modalScrollLockCount = 0;
let modalBodyOverflow = '';

interface ModalActions {
  show(): Modal;
  hide(): Modal;
  reset(): Modal;
  requestSubmit(): void;
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
    formId: `${props.id}_form`,
  };
  const events = new Map<string, () => void>();
  const [motionVisible, setMotionVisible] = createSignal(false);
  let modal!: Modal;
  let dialog: HTMLElement | null = null;
  let form: FormInstance | null = null;
  let scrollLocked = false;

  const isBusy = (): boolean => state.loading || state.processing;
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
  const motion = createTransition(() => dialog, {
    keyframes: [
      { opacity: 0, transform: 'scale(0.8)' },
      { opacity: 1, transform: 'scale(1)' },
    ],
    options: {
      duration: 350,
      easing: 'ease-in-out',
    },
  });
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
  const destroyForm = (): void => {
    form?.destroy();
    form = null;
  };
  const handleSubmit = async (data: FormDataRecord): Promise<void> => {
    if (!props.onSubmit) return;
    flushSync(() => {
      state.processing = true;
    });
    try {
      await Promise.resolve(props.onSubmit(data, modal));
      flushSync(() => {
        state.extraData = null;
      });
    } catch (error) {
      console.error('Modal.onSubmit error:', error);
    } finally {
      if (!modal.runtime.destroyed) {
        flushSync(() => {
          state.processing = false;
        });
      }
    }
  };
  const handleFormSubmit = async (data: FormDataRecord): Promise<void> => {
    if (isBusy()) return;
    const merged = mergeExtraData(data, state.extraData);
    flushSync(() => {
      state.data = merged;
    });
    await handleSubmit(merged);
  };
  const ensureForm = (): FormInstance => {
    if (!form) {
      form = createForm({
        id: cache.formId,
        fields: state.fields || [],
        buttons: false,
        onSubmit: handleFormSubmit,
      }).build();
    }
    return form;
  };
  const requestSubmit = (): void => {
    if (state.mode === 'form') ensureForm().requestSubmit();
    else void handleConfirm();
  };
  const handleConfirm = async (): Promise<void> => {
    if (isBusy()) return;
    flushSync(() => {
      state.processing = true;
    });
    try {
      await Promise.resolve(props.onConfirm?.(modal));
    } catch (error) {
      console.error('Modal.onConfirm error:', error);
    } finally {
      if (!modal.runtime.destroyed) {
        flushSync(() => {
          state.processing = false;
        });
      }
    }
  };
  const handleCancel = async (): Promise<void> => {
    if (isBusy()) return;
    flushSync(() => {
      state.processing = true;
    });
    try {
      await Promise.resolve(props.onCancel?.(modal));
      modal.hide();
    } catch (error) {
      console.error('Modal.onCancel error:', error);
    } finally {
      if (!modal.runtime.destroyed) {
        flushSync(() => {
          state.processing = false;
        });
      }
    }
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
      form?.element || dialog
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
      if (props.bgClose && event.target === root) modal.hide();
    });
    listen('dialog', dialog, 'click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const action =
        target?.closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'cancel' || action === 'close') void handleCancel();
      else if (action === 'submit') requestSubmit();
      else if (action === 'confirm') void handleConfirm();
    });
    listen('keyboard', document, 'keydown', (event) => {
      if (!(event instanceof KeyboardEvent) || !state.visible) return;
      if (event.key === 'Escape' && props.escClose) {
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
    flushSync(() => {
      state.loading = false;
      state.extraData = null;
      state.data = null;
    });
    void presence.leave().then((completed) => {
      if (completed && !modal.runtime.destroyed) void props.onHidden?.(modal);
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
        modal.setState('visible', false);
        return modal;
      },
      reset() {
        modal.setState({
          mode: cache.initial.mode,
          content: cache.initial.content,
          fields: cache.initial.fields
            ? cloneFields(cache.initial.fields)
            : null,
          loading: false,
          processing: false,
          data: null,
          extraData: null,
        });
        return modal;
      },
      requestSubmit,
    },
    normalizeStatePatch(patch: ModalStatePatch) {
      return {
        ...patch,
        ...(Object.hasOwn(patch, 'fields')
          ? {
              fields: Array.isArray(patch.fields)
                ? cloneFields(patch.fields)
                : null,
            }
          : {}),
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
        'aria-hidden': () => String(!motionVisible()),
        children: [
          jsx('div', {
            className: props.className.header,
            hidden: !props.header,
            children: props.header
              ? [
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
                        children: icon('close'),
                      })
                    : null,
                ]
              : null,
          }),
          jsx('div', {
            className: props.className.body,
            'data-modal-body': '',
            children: () => {
              if (state.mode === 'form') return ensureForm().element;
              destroyForm();
              return typeof state.content === 'function'
                ? state.content(modal)
                : state.content;
            },
          }),
          jsx('div', {
            className: props.className.footer,
            hidden: !props.footer,
            children: props.footer
              ? [
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
                    type: () => (state.mode === 'form' ? 'submit' : 'button'),
                    className: joinClasses(
                      props.className.button,
                      props.className.confirmBtn
                    ),
                    'data-action': () =>
                      state.mode === 'form' ? 'submit' : 'confirm',
                    disabled: isBusy,
                    children: props.text.confirm,
                  }),
                ]
              : null,
          }),
          () => (state.loading ? createLoading() : null),
        ],
      }) as HTMLElement;
      const root = createPopup({
        className: props.className.layout,
        position: props.position,
        component: 'modal',
        labelledby: props.header ? `${props.id}_title` : '',
        content: dialog,
      });
      if (!props.header)
        root.setAttribute('aria-label', props.text.title || 'Modal');
      createEffect(() => {
        const visible = state.visible;
        untrack(() => (visible ? showFromState() : hideFromState()));
      });
      createEffect(() => {
        const fields = state.fields;
        if (state.mode === 'form' && form) form.setFields(fields || []);
      });
      return root;
    },
    onDestroy() {
      const wasVisible = presence.phase !== 'hidden';
      if (wasVisible) void props.onHide?.(modal);
      presence.cancel();
      clearEvents();
      destroyForm();
      unlockScroll();
      restoreFocus();
      dialog = null;
      if (wasVisible) void props.onHidden?.(modal);
    },
  }) as Modal;

  return modal;
}

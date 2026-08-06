import {
  createDeepStore,
  createEffect,
  createRoot,
  flushSync,
  jsx,
  onCleanup,
  render,
  untrack,
} from 'vanilla-signal';
import { t } from 'vanilla-signal-i18n';

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
} from '../core/Component.ts';
import locales from '../locales/index.ts';
import { icon } from '../primitives/icons.ts';
import { createLoading } from '../primitives/loading.ts';
import { createPopup } from '../primitives/popup.ts';
import { joinClasses } from '../utilities/class-name.ts';
import {
  all,
  q,
  normalizeContentNodes,
  type RenderableContent,
} from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import { isPlainObject } from '../utilities/object.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';
import {
  createForm,
  type FormDataRecord,
  type FormField,
  type FormProps,
} from './form.ts';

const HIDE_DURATION = 300;

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

interface ModalDOM extends ComponentDOM {
  root: HTMLElement | null;
  modal: HTMLElement | null;
  header: HTMLElement | null;
  body: HTMLElement | null;
  footer: HTMLElement | null;
  form: FormInstance | null;
  formContainer: HTMLElement | null;
}

interface ModalRuntime extends ComponentRuntime {
  scrollLocked: boolean;
  visibleApplied: boolean;
}

interface ModalCache {
  initial: ResolvedModalProps | null;
  fieldIds: Map<string, string> | null;
  previousActiveElement: HTMLElement | null;
  formId: string;
}

interface ModalCleanupExtras {
  visibility?: (() => void) | null;
  view?: (() => void) | null;
  hideTimer?: ReturnType<typeof setTimeout> | null;
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

class ModalComponent extends Component<
  ResolvedModalProps,
  ModalState,
  ModalDOM,
  ModalCache
> {
  declare runtime: ModalRuntime;
  declare state: ModalState;
  declare cleanup: Component['cleanup'] & ModalCleanupExtras;

  constructor(input: ModalProps = {}) {
    const props = normalizeProps(input);
    super(props);

    this.dom.modal = null;
    this.dom.header = null;
    this.dom.body = null;
    this.dom.footer = null;
    this.dom.form = null;
    this.dom.formContainer = null;

    this.cleanup.visibility = null;
    this.cleanup.view = null;
    this.cleanup.hideTimer = null;

    this.runtime.scrollLocked = false;
    this.runtime.visibleApplied = false;

    this.cache = {
      initial: cloneProps(this.props),
      fieldIds: new Map(),
      previousActiveElement: null,
      formId: `${this.props.id}_form`,
    };

    this.state = createDeepStore(createModalState(this.props)) as ModalState;

    this.init(props);
  }

  protected override onInit(): void {
    this.bindReactiveVisibility();
  }

  build(): this {
    this.assertActive('build');
    if (this.dom.root instanceof HTMLElement) return this;

    const { id, className } = this.props;
    const dialogChildren = [
      jsx('div', {
        className: className.header,
        style: { display: this.props.header ? '' : 'none' },
        ref: (element: HTMLElement) => {
          this.dom.header = element;
        },
      }),
      jsx('div', {
        className: className.body,
        ref: (element: HTMLElement) => {
          this.dom.body = element;
        },
      }),
      jsx('div', {
        className: className.footer,
        style: { display: this.props.footer ? '' : 'none' },
        ref: (element: HTMLElement) => {
          this.dom.footer = element;
        },
      }),
    ];

    const modal = jsx('div', {
      className: () =>
        joinClasses(
          this.props.className.modal,
          this.props.fullscreen && 'is-fullscreen'
        ),
      id,
      role: 'document',
      'data-modal-dialog': id,
      ref: (element: HTMLElement) => {
        this.dom.modal = element;
      },
      children: dialogChildren,
    }) as HTMLElement;

    const root = createPopup({
      className: className.layout,
      position: this.props.position,
      component: 'modal',
      labelledby: this.props.header ? `${id}_title` : '',
      content: modal,
    });
    if (!this.props.header) {
      root.setAttribute('aria-label', this.props.text.title || 'Modal');
    }

    this.dom.root = root;
    this.mountView();
    return this;
  }

  mountView(): void {
    if (this.cleanup.view || !this.dom.body) return;

    this.cleanup.view = createRoot((dispose) => {
      if (this.dom.header) {
        const headerDispose = render(() => this.headerView(), this.dom.header);
        onCleanup(headerDispose);
      }

      if (this.dom.body) {
        const bodyDispose = render(() => this.bodyView(), this.dom.body);
        onCleanup(bodyDispose);
      }

      if (this.dom.footer) {
        const footerDispose = render(() => this.footerView(), this.dom.footer);
        onCleanup(footerDispose);
      }

      this.bindReactiveLoading();
      return dispose;
    });
  }

  headerView(): () => (Node | null)[] | null {
    return () => {
      if (!this.props.header) return null;

      return [
        jsx('div', {
          className: this.props.className.title,
          id: `${this.props.id}_title`,
          'aria-label': this.props.text.title,
          children: this.props.text.title,
        }) as Node,
        this.props.showClose
          ? (jsx('button', {
              type: 'button',
              className: joinClasses(
                this.props.className.button,
                this.props.className.closeBtn
              ),
              'data-action': 'close',
              'aria-label': t('Close', locales),
              children: icon('close'),
            }) as Node)
          : null,
      ];
    };
  }

  footerView(): () => (Node | null)[] | null {
    return () => {
      if (!this.props.footer) return null;

      return [
        this.props.showCancel
          ? (jsx('button', {
              type: 'button',
              className: joinClasses(
                this.props.className.button,
                this.props.className.cancelBtn
              ),
              'data-action': 'cancel',
              disabled: () => this.isBusy(),
              children: this.props.text.cancel,
            }) as Node)
          : null,
        jsx('button', {
          type: () => (this.state.mode === 'form' ? 'submit' : 'button'),
          className: joinClasses(
            this.props.className.button,
            this.props.className.confirmBtn
          ),
          'data-action': () =>
            this.state.mode === 'form' ? 'submit' : 'confirm',
          disabled: () => this.isBusy(),
          children: this.props.text.confirm,
        }) as Node,
      ];
    };
  }

  bodyView(): RenderableContent<Modal> {
    if (this.state.mode === 'form') return this.formView();
    this.destroyForm();
    return this.contentView(this.state.content);
  }

  formView(): HTMLElement {
    return jsx('div', {
      ref: (element: HTMLElement) => {
        this.mountForm(element);
      },
    }) as HTMLElement;
  }

  mountForm(container: HTMLElement | null): void {
    if (!container) return;
    this.dom.formContainer = container;

    const props = this.createFormProps();
    if (this.dom.form) {
      this.dom.form.setFields(props.fields || []);
      if (
        this.dom.form.dom.root &&
        !container.contains(this.dom.form.dom.root)
      ) {
        container.appendChild(this.dom.form.dom.root);
      }
      return;
    }

    this.dom.form = createForm(props).build();
    if (this.dom.form.dom.root) container.appendChild(this.dom.form.dom.root);
  }

  createFormProps(): FormProps {
    return {
      id: this.cache.formId,
      fields: this.state.fields || [],
      buttons: false,
      onSubmit: (data) => this.handleFormSubmit(data),
    };
  }

  destroyForm(): void {
    this.dom.form?.destroy();
    this.dom.form = null;
    this.dom.formContainer = null;
  }

  contentView(content: ModalContent): Node[] {
    return normalizeContentNodes(content, this);
  }

  bindReactiveLoading(): void {
    let loading: HTMLElement | null = null;

    createEffect(() => {
      if (this.state.loading && !loading) {
        loading = createLoading();
        this.dom.modal?.appendChild(loading);
      } else if (!this.state.loading && loading) {
        loading.remove();
        loading = null;
      }
    });

    onCleanup(() => {
      loading?.remove();
      loading = null;
    });
  }

  isBusy(): boolean {
    return !!(this.state.loading || this.state.processing);
  }

  bindReactiveVisibility(): void {
    this.cleanup.visibility = createRoot((dispose) => {
      createEffect(() => {
        const visible = !!this.state.visible;
        untrack(() => this.applyVisibility(visible));
      });
      return dispose;
    });
  }

  applyVisibility(visible: boolean): void {
    if (visible === this.runtime.visibleApplied) return;
    if (visible) {
      this.showFromState();
      return;
    }
    this.hideFromState();
  }

  showFromState(): void {
    if (this.runtime.destroyed) {
      throw new Error('Modal: The current instance has been destroyed.');
    }

    if (!this.dom.root) {
      throw new Error('Modal.show: build() must be called before show().');
    }

    this.cancelHideTimer();
    this.resetAnimationStyles();

    const { onShow, onShown } = this.props;
    void onShow?.(this);

    this.cache.previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (this.dom.root && !this.dom.root.parentNode)
      document.body.appendChild(this.dom.root);
    this.lockScroll();
    this.runtime.visibleApplied = true;

    this.bindEvents(this.dom.root);
    this.focusFirst();

    void onShown?.(this);
  }

  hideFromState(): void {
    if (!this.runtime.visibleApplied || !this.dom.root) return;

    const { onHide, onHidden } = this.props;
    void onHide?.(this);

    this.runtime.visibleApplied = false;
    this.clearEvents();

    flushSync(() => {
      this.state.loading = false;
      this.state.extraData = null;
      this.state.data = null;
    });

    if (this.dom.modal) {
      this.dom.modal.style.transition = `opacity ${HIDE_DURATION}ms ease-out, transform ${HIDE_DURATION}ms ease-out`;
      this.dom.modal.style.opacity = '0';
      this.dom.modal.style.transform = 'scale(0.3)';
    }

    this.cancelHideTimer();
    this.cleanup.hideTimer = setTimeout(
      () => this.finishHide(onHidden),
      HIDE_DURATION
    );
  }

  bindEvents(root: Element | null): void {
    this.clearEvents();
    this.bindOverlayCloseEvent(root);
    this.bindDocumentKeyEvent();
    this.bindInsideEvent();
  }

  bindOverlayCloseEvent(root: Element | null): void {
    if (!root) return;
    this.cleanup.events.on('bg', root, 'click', (event) => {
      if (this.props.bgClose && event.target === root) {
        this.hide();
      }
    });
  }

  bindDocumentKeyEvent(): void {
    this.cleanup.events.on('keydown', document, 'keydown', (event) => {
      if (!this.state.visible || !(event instanceof KeyboardEvent)) return;

      if (event.key === 'Escape' && this.props.escClose) {
        event.preventDefault();
        this.hide();
        return;
      }

      if (event.key === 'Tab') this.trapFocus(event);
    });
  }

  bindInsideEvent(): void {
    if (!this.dom.modal) return;

    this.cleanup.events.on('inside', this.dom.modal, 'click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const actionEl = target?.closest<HTMLElement>('[data-action]');
      if (!actionEl || !this.dom.modal?.contains(actionEl)) return;

      const action = actionEl.dataset.action;
      if (action === 'cancel' || action === 'close') {
        void this.handleCancel();
        return;
      }

      if (action === 'submit') {
        this.requestSubmit();
        return;
      }

      if (action === 'confirm') {
        if (this.state.mode === 'form') {
          this.requestSubmit();
          return;
        }
        void this.handleConfirm();
      }
    });
  }

  clearEvents(): void {
    this.cleanup.events.clear();
  }

  requestSubmit(): void {
    if (this.state.mode !== 'form' || !this.dom.form) {
      void this.handleConfirm();
      return;
    }

    this.dom.form.requestSubmit();
  }

  async handleFormSubmit(formData: FormDataRecord): Promise<void> {
    if (this.isBusy()) return;

    const data = mergeExtraData(formData, this.state.extraData);

    flushSync(() => {
      this.state.data = data;
    });

    await this.handleSubmit(data);
  }

  async handleConfirm(): Promise<void> {
    if (this.isBusy()) return;

    flushSync(() => {
      this.state.processing = true;
    });

    try {
      await Promise.resolve(this.props.onConfirm?.(this));
    } catch (error) {
      console.error('Modal.onConfirm error:', error);
    } finally {
      if (this.state) {
        flushSync(() => {
          this.state.processing = false;
        });
      }
    }
  }

  async handleCancel(): Promise<void> {
    if (this.isBusy()) return;

    flushSync(() => {
      this.state.processing = true;
    });

    try {
      await Promise.resolve(this.props.onCancel?.(this));
      this.hide();
    } catch (error) {
      console.error('Modal.onCancel error:', error);
    } finally {
      if (this.state) {
        flushSync(() => {
          this.state.processing = false;
        });
      }
    }
  }

  async handleSubmit(data: FormDataRecord): Promise<void> {
    if (!this.props.onSubmit) return;

    flushSync(() => {
      this.state.processing = true;
    });

    try {
      await Promise.resolve(this.props.onSubmit(data, this));
      this.state.extraData = null;
    } catch (error) {
      console.error('Modal.onSubmit error:', error);
    } finally {
      if (this.state) {
        flushSync(() => {
          this.state.processing = false;
        });
      }
    }
  }

  trapFocus(event: KeyboardEvent): void {
    if (!this.dom.modal) return;
    const focusable = Array.from(
      all<HTMLElement>(
        'a[href], button:not([disabled]):not([data-action=close]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        this.dom.modal
      )
    ).filter(
      (element) =>
        element.offsetParent !== null || element === document.activeElement
    );

    if (focusable.length === 0) {
      event.preventDefault();
      this.dom.modal.focus();
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
  }

  focusFirst(): void {
    if (!this.dom.modal) return;
    const focusRoot = this.dom.form?.root || this.dom.modal;
    const firstFocusable = q<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-action=close]), [tabindex]:not([tabindex="-1"])',
      focusRoot
    );
    if (firstFocusable) firstFocusable.focus();
    else {
      this.dom.modal.setAttribute('tabindex', '-1');
      this.dom.modal.focus();
    }
  }

  lockScroll(): void {
    if (this.runtime.scrollLocked) return;
    if (modalScrollLockCount === 0) {
      modalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    modalScrollLockCount += 1;
    this.runtime.scrollLocked = true;
  }

  unlockScroll(): void {
    if (!this.runtime.scrollLocked) return;
    modalScrollLockCount = Math.max(0, modalScrollLockCount - 1);
    if (modalScrollLockCount === 0) {
      document.body.style.overflow = modalBodyOverflow;
      modalBodyOverflow = '';
    }
    this.runtime.scrollLocked = false;
  }

  cancelHideTimer(): void {
    if (!this.cleanup.hideTimer) return;
    clearTimeout(this.cleanup.hideTimer);
    this.cleanup.hideTimer = null;
  }

  resetAnimationStyles(): void {
    if (!this.dom.modal) return;
    this.dom.modal.style.removeProperty('transition');
    this.dom.modal.style.removeProperty('opacity');
    this.dom.modal.style.removeProperty('transform');
  }

  finishHide(onHidden: ResolvedModalProps['onHidden']): void {
    this.cleanup.hideTimer = null;
    this.dom.root?.remove();
    this.resetAnimationStyles();
    this.unlockScroll();
    this.restoreFocus();
    void onHidden?.(this);
  }

  restoreFocus(): void {
    const target = this.cache.previousActiveElement;
    this.cache.previousActiveElement = null;
    if (
      target &&
      typeof target.focus === 'function' &&
      document.contains(target)
    ) {
      target.focus();
    }
  }

  assertActive(method: string): void {
    if (this.runtime.destroyed) {
      throw new Error(
        `Modal.${method}: The current instance has been destroyed.`
      );
    }
  }

  protected override normalizeStatePatch(
    patch: ModalStatePatch
  ): ModalStatePatch {
    const nextPatch: ModalStatePatch = { ...patch };
    if (Object.hasOwn(nextPatch, 'fields')) {
      nextPatch.fields = Array.isArray(nextPatch.fields)
        ? cloneFields(nextPatch.fields)
        : null;
    }
    return nextPatch;
  }

  protected override validateStatePatch(patch: ModalStatePatch): void {
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
  }

  protected override afterSetState(patch: ModalStatePatch): void {
    if (Object.hasOwn(patch, 'fields')) this.cache.fieldIds?.clear();
    if (this.state.mode === 'form' && this.dom.form)
      this.dom.form.setFields(this.createFormProps().fields || []);
  }

  show(): this {
    this.assertActive('show');
    if (!this.dom.root) {
      throw new Error('Modal.show: build() must be called before show().');
    }
    this.setState({
      visible: true,
    });
    return this;
  }

  hide(): this {
    this.assertActive('hide');
    this.setState({
      visible: false,
    });
    return this;
  }

  reset(): this {
    this.cache.fieldIds?.clear();
    if (!this.cache.initial) return this;

    this.setState({
      mode: this.cache.initial.mode,
      content: this.cache.initial.content,
      fields: Array.isArray(this.cache.initial.fields)
        ? cloneFields(this.cache.initial.fields)
        : null,
      loading: false,
      processing: false,
      data: null,
      extraData: null,
    });
    return this;
  }

  protected override onDestroy(): void {
    const wasVisible = !!this.runtime.visibleApplied;
    const { onHide, onHidden } = this.props;

    if (wasVisible) void onHide?.(this);

    this.cancelHideTimer();
    this.clearEvents();
    this.destroyForm();
    this.unlockScroll();
    this.cleanup.visibility?.();
    this.cleanup.visibility = null;
    this.cleanup.view?.();
    this.cleanup.view = null;

    this.dom.root?.remove();
    if (wasVisible) void onHidden?.(this);

    this.cache = {
      initial: null,
      fieldIds: null,
      previousActiveElement: null,
      formId: '',
    };
  }

  override destroy(): this {
    if (this.runtime.destroyed) return this;
    super.destroy();
    return this;
  }
}

export type Modal = ModalComponent;

export function createModal(input: ModalProps = {}): Modal {
  return new ModalComponent(input);
}

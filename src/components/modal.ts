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

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
  type ComponentUpdateOptions,
} from '../core/Component.ts';
import {
  type ResolveSchema,
  hasOwn,
  isPlainObject,
  randomId,
  resolveProps,
  validateParam,
} from '../utilities/core.ts';
import {
  all,
  q,
  canUseDOM,
  canRenderDOM,
  createLoading,
  isRenderableContent,
  normalizeContentNodes,
  requireRenderDOM,
  type RenderableContent,
} from '../utilities/dom.ts';
import {
  Form,
  type FormDataRecord,
  type FormField,
  type FormProps,
} from './form.ts';
import { icon } from './icons.ts';

const HIDE_DURATION = 300;

type ModalStyle =
  | string
  | Record<string, string | number | null | undefined>
  | null;
type ModalTextInput = Partial<ModalText> & Record<string, unknown>;
type ModalContent = RenderableContent<Modal>;
type FlowDirection = 'next' | 'back';

export interface ModalClassNames {
  layout: string;
  modal: string;
  fullscreen: string;
  header: string;
  body: string;
  footer: string;
  title: string;
  close: string;
  cancel: string;
  confirm: string;
  button: string;
  buttonIcon: string;
  buttonGhost: string;
  buttonPrimary: string;
  buttonSmall: string;
  formContainer: string;
}

export type ModalClassNameConfig = Partial<ModalClassNames>;

export interface ModalText {
  title: string;
  confirm: string;
  cancel: string;
}

interface FlowStep {
  id?: string;
  title?: RenderableContent<Modal>;
  content?: ModalContent;
  modal?: ModalFlowView | ModalFlowViewFactory;
  view?: ModalFlowView | ModalFlowViewFactory;
  [key: string]: unknown;
}

interface FlowSnapshot {
  data?: Record<string, unknown> | null;
  currentData?: Record<string, unknown> | null;
  currentStep?: FlowStep;
  [key: string]: unknown;
}

interface FlowLike {
  currentStep?: FlowStep;
  next: (
    payload: FormDataRecord | null
  ) => Promise<FlowSnapshot> | FlowSnapshot;
  back: (
    payload: FormDataRecord | null
  ) => Promise<FlowSnapshot> | FlowSnapshot;
  snapshot: () => FlowSnapshot;
  reset?: () => void;
  destroy?: () => void;
}

interface ModalFlowView extends Partial<ModalProps> {
  [key: string]: unknown;
}

type ModalFlowViewFactory = (context: {
  flow: FlowLike;
  snapshot: FlowSnapshot | null;
  step: FlowStep | undefined;
  modal: Modal;
  data: Record<string, unknown> | null;
  currentData: Record<string, unknown> | null;
}) => unknown;

export interface ModalProps extends Record<string, unknown> {
  content?: ModalContent;
  position?: string;
  showCancel?: boolean;
  showClose?: boolean;
  fullscreen?: boolean;
  flow?: FlowLike | null;
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
  style?: ModalStyle;
  id?: string | null;
  escClose?: boolean;
  bgClose?: boolean;
  lazy?: boolean;
  className?: ModalClassNameConfig;
}

interface ResolvedModalProps extends Record<string, unknown> {
  content: ModalContent;
  position: string;
  showCancel: boolean;
  showClose: boolean;
  fullscreen: boolean;
  flow: FlowLike | null;
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
  style: ModalStyle;
  id: string;
  escClose: boolean;
  bgClose: boolean;
  lazy: boolean;
  className: ModalClassNames;
}

interface ModalState extends ResolvedModalProps {
  loading: boolean;
  submitting: boolean;
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
  form: Form | null;
  formContainer: HTMLElement | null;
}

interface ModalRuntime extends ComponentRuntime {
  scrollLocked: boolean;
  visibleApplied: boolean;
}

interface ModalCache {
  initial: ResolvedModalProps | null;
  fieldIds: Map<string, string> | null;
  baseStyle: string;
  previousActiveElement: HTMLElement | null;
  formId: string;
}

interface ModalCleanupExtras {
  visibility?: (() => void) | null;
  view?: (() => void) | null;
  hideTimer?: ReturnType<typeof setTimeout> | null;
}

type ModalPatch = Partial<ModalProps>;
type ModalStatePatch = Partial<ModalState>;

const DEFAULT_CLASS_NAMES: ModalClassNames = {
  layout: 'j-popup-layout',
  modal: 'j-modal',
  fullscreen: 'is-fullscreen',
  header: 'modal-header',
  body: 'modal-body',
  footer: 'modal-footer',
  title: 'modal-title',
  close: 'modal-close',
  cancel: 'modal-cancel',
  confirm: 'modal-confirm',
  button: 'j-button',
  buttonIcon: 'is-icon',
  buttonGhost: 'is-ghost',
  buttonPrimary: 'is-primary',
  buttonSmall: 'is-sm',
  formContainer: 'modal-form-container',
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

function isUpdateProps(value: unknown): value is ModalPatch {
  return isPlainObject(value);
}

function isFlowLike(value: unknown): value is FlowLike | null {
  return (
    value == null ||
    (typeof value === 'object' &&
      typeof (value as Partial<FlowLike>).next === 'function' &&
      typeof (value as Partial<FlowLike>).back === 'function' &&
      typeof (value as Partial<FlowLike>).snapshot === 'function')
  );
}

function hydrateFields(
  fields: readonly FormField[] | null,
  data: Record<string, unknown> | null | undefined
): FormField[] | null {
  if (!Array.isArray(fields) || !isPlainObject(data))
    return fields ? cloneFields(fields) : null;

  return fields.map((field) => {
    if (!field?.name || !hasOwn(data, field.name)) return { ...field };
    const value = data[field.name];

    if (field.type === 'checkbox' || field.type === 'radio') {
      const optionValue = field.value ?? 'on';
      const checked = Array.isArray(value)
        ? value.map(String).includes(String(optionValue))
        : value === true || String(value) === String(optionValue);
      return { ...field, checked };
    }

    return {
      ...field,
      value: Array.isArray(value)
        ? value.map(String)
        : (value as FormField['value']),
    };
  });
}

function createTextState(
  props: Partial<ModalProps> | Partial<ResolvedModalProps>
): ModalText {
  const text = isPlainObject(props?.text) ? props.text : {};
  return {
    title: typeof text.title === 'string' ? text.title : 'Tip',
    confirm: typeof text.confirm === 'string' ? text.confirm : 'Confirm',
    cancel: typeof text.cancel === 'string' ? text.cancel : 'Cancel',
  };
}

function createModalState(props: ResolvedModalProps): ModalState {
  return {
    ...props,
    fields: Array.isArray(props.fields) ? cloneFields(props.fields) : null,
    text: createTextState(props),
    loading: false,
    submitting: false,
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

function clonePlainObject(value: unknown): ModalFlowView {
  return isPlainObject(value) ? { ...value } : {};
}

function joinClasses(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ');
}

function textValue(value: RenderableContent<Modal> | undefined): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

const MODAL_CONTENT_RULE = {
  validate: isRenderableContent,
  message: 'expects string, number, Node, array, function or null.',
};

const MODAL_TEXT_RULE = {
  default: {},
  validate: (value: unknown) => isPlainObject(value),
  message: 'expects an object with text fields.',
  normalize: (value: unknown) => {
    const text = isPlainObject(value) ? value : {};
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
  content: { default: '', ...MODAL_CONTENT_RULE },
  position: { default: 'center', type: 'string' },
  showCancel: { default: true, type: 'boolean' },
  showClose: { default: true, type: 'boolean' },
  fullscreen: { default: false, type: 'boolean' },
  flow: {
    default: null,
    validate: isFlowLike,
    message: 'expects a Flow instance or null.',
  },
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
  style: { default: null, types: ['string', 'null', 'object'] },
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
  lazy: { default: false, type: 'boolean' },
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
  ...MODAL_PROPS_SCHEMA,
  loading: { default: false, type: 'boolean' },
  submitting: { default: false, type: 'boolean' },
  visible: { default: false, type: 'boolean' },
  data: { default: null, types: ['object', 'null'] },
  extraData: { default: null, types: ['object', 'null'] },
};

const MODAL_UPDATE_BLOCKED_KEYS = new Set(['id', 'lazy']);

const MODAL_EXTRA_FIELDS_RULE = {
  validate: (value: unknown) =>
    !!value && typeof value === 'object' && !Array.isArray(value),
  message: 'expects an object.',
};

const MODAL_UPDATE_RULE = {
  validate: isUpdateProps,
  message: 'expects a props object.',
};

function normalizeProps(input: ModalProps): ResolvedModalProps {
  const props = resolveProps(input, MODAL_PROPS_SCHEMA, 'Modal');
  return {
    content: props.content as ModalContent,
    position: props.position as string,
    showCancel: props.showCancel as boolean,
    showClose: props.showClose as boolean,
    fullscreen: props.fullscreen as boolean,
    flow: props.flow as FlowLike | null,
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
    style: props.style as ModalStyle,
    id: props.id as string,
    escClose: props.escClose as boolean,
    bgClose: props.bgClose as boolean,
    lazy: props.lazy as boolean,
    className: props.className as ModalClassNames,
  };
}

let modalScrollLockCount = 0;
let modalBodyOverflow = '';

export class Modal extends Component<ResolvedModalProps, ModalState, ModalDOM> {
  declare runtime: ModalRuntime;
  declare state: ModalState;
  declare cleanup: Component['cleanup'] & ModalCleanupExtras;
  cache: ModalCache;

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
      baseStyle: '',
      previousActiveElement: null,
      formId: `${this.props.id}_form`,
    };

    this.state = createDeepStore(createModalState(this.props)) as ModalState;

    this.init(props);
  }

  protected override onInit(): void {
    this.bindReactiveVisibility();
    if (!this.state.lazy && canRenderDOM()) this.buildRoot();
  }

  buildRoot(): HTMLElement {
    if (this.root instanceof HTMLElement) return this.root;

    const { id, className } = this.state;
    const dialogChildren = [
      jsx('div', {
        className: className.header,
        'data-modal-header': id,
        style: () => ({ display: this.state.header ? '' : 'none' }),
        ref: (element: HTMLElement) => {
          this.dom.header = element;
        },
      }),
      jsx('div', {
        className: className.body,
        'data-modal-body': id,
        ref: (element: HTMLElement) => {
          this.dom.body = element;
        },
      }),
      jsx('div', {
        className: className.footer,
        'data-modal-footer': id,
        style: () => ({ display: this.state.footer ? '' : 'none' }),
        ref: (element: HTMLElement) => {
          this.dom.footer = element;
        },
      }),
    ];

    const modal = jsx('div', {
      className: () =>
        joinClasses(
          this.state.className.modal,
          this.state.fullscreen && this.state.className.fullscreen
        ),
      id,
      role: 'document',
      'data-modal-dialog': id,
      ref: (element: HTMLElement) => {
        this.dom.modal = element;
        this.applyStyle(element, this.state.style);
      },
      children: dialogChildren,
    }) as HTMLElement;

    const root = jsx('div', {
      className: () =>
        joinClasses(this.state.className.layout, `is-${this.state.position}`),
      role: 'dialog',
      'data-modal': 'root',
      'data-modal-position': () => this.state.position,
      'aria-modal': 'true',
      'aria-labelledby': () => (this.state.header ? `${id}_title` : null),
      'aria-label': () =>
        this.state.header ? null : this.state.text?.title || 'Modal',
      children: modal,
    }) as HTMLElement;

    this.root = root;
    this.mountView();
    return root;
  }

  mountView(): void {
    if (this.cleanup.view || !this.dom.body) return;

    this.cleanup.view = createRoot((dispose) => {
      if (this.dom.header) {
        const headerDispose = render(() => this.headerView(), this.dom.header);
        onCleanup(headerDispose);
      }

      if (this.dom.body) render(() => this.bodyView(), this.dom.body);

      if (this.dom.footer) {
        const footerDispose = render(() => this.footerView(), this.dom.footer);
        onCleanup(footerDispose);
      }

      this.bindReactiveLoading();
      this.bindReactiveStyle();
      return dispose;
    });
  }

  headerView(): () => (Node | null)[] | null {
    return () => {
      if (!this.state.header) return null;

      return [
        jsx('div', {
          className: this.state.className.title,
          id: `${this.state.id}_title`,
          'data-modal-title': this.state.id,
          children: () => this.state.text?.title,
        }) as Node,
        this.state.showClose
          ? (jsx('button', {
              type: 'button',
              className: joinClasses(
                this.state.className.button,
                this.state.className.buttonIcon,
                this.state.className.buttonGhost,
                this.state.className.buttonSmall,
                this.state.className.close
              ),
              'data-action': 'close',
              'aria-label': 'close',
              children: icon('close'),
            }) as Node)
          : null,
      ];
    };
  }

  footerView(): () => (Node | null)[] | null {
    return () => {
      if (!this.state.footer) return null;

      return [
        this.state.showCancel
          ? (jsx('button', {
              type: 'button',
              className: joinClasses(
                this.state.className.button,
                this.state.className.buttonGhost,
                this.state.className.cancel
              ),
              'data-action': 'close',
              'aria-label': 'close',
              disabled: () => this.isBusy(),
              children: () => this.state.text?.cancel,
            }) as Node)
          : null,
        jsx('button', {
          type: () => (this.isFormMode() ? 'submit' : 'button'),
          form: () => (this.isFormMode() ? this.cache.formId : null),
          className: joinClasses(
            this.state.className.button,
            this.state.className.buttonPrimary,
            this.state.className.confirm
          ),
          'data-action': () => (this.isFormMode() ? 'submit' : 'confirm'),
          disabled: () => this.isBusy(),
          children: () => this.state.text?.confirm,
        }) as Node,
      ];
    };
  }

  bodyView(): RenderableContent<Modal> {
    if (this.isFormMode()) return this.formView();
    this.destroyForm();
    return this.contentView(this.state.content);
  }

  formView(): HTMLElement {
    return jsx('div', {
      className: this.state.className.formContainer,
      'data-modal-form-container': this.state.id,
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
      this.dom.form.update(props);
      return;
    }

    this.dom.form = new Form(props, container).build();
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

  bindReactiveStyle(): void {
    createEffect(() => {
      const style = this.state.style;
      if (this.dom.modal) this.applyStyle(this.dom.modal, style);
    });
  }

  isFormMode(): boolean {
    return Array.isArray(this.state.fields);
  }

  isBusy(): boolean {
    return !!(this.state.loading || this.state.submitting);
  }

  validatePropsPatch(patch: ModalPatch, namespace = 'Modal.update'): void {
    validateParam('props', patch, MODAL_UPDATE_RULE, namespace);

    for (const key of Object.keys(patch)) {
      if (!hasOwn(MODAL_PROPS_SCHEMA, key)) {
        throw new Error(
          `Validator: ${namespace}.${key} is not a supported modal prop.`
        );
      }
      if (MODAL_UPDATE_BLOCKED_KEYS.has(key)) {
        throw new Error(
          `Modal.update: "${key}" cannot be updated after initialization.`
        );
      }
      validateParam(
        key,
        patch[key],
        MODAL_PROPS_SCHEMA[key as keyof typeof MODAL_PROPS_SCHEMA],
        namespace
      );
    }
  }

  applyProps(
    patch: ModalPatch,
    {
      validate = true,
      force = false,
    }: { validate?: boolean; force?: boolean } = {}
  ): this {
    if (validate) this.validatePropsPatch(patch);
    if (!patch || Object.keys(patch).length === 0) return this;

    const hasFields = hasOwn(patch, 'fields');
    const hasContent = hasOwn(patch, 'content');

    if (hasContent && !hasFields && this.isFormMode() && !force) {
      throw new Error(
        'Modal.update: Cannot update content when fields are defined.'
      );
    }

    const nextInput: ModalProps = {
      ...(this.props as ModalProps),
      ...patch,
      text: (hasOwn(patch, 'text')
        ? { ...this.props.text, ...patch.text }
        : this.props.text) as ModalTextInput,
      className: hasOwn(patch, 'className')
        ? { ...this.props.className, ...patch.className }
        : this.props.className,
    };
    const nextProps = normalizeProps(nextInput);

    this.props = nextProps;
    super.update(patch as Partial<ResolvedModalProps>, { force });
    this.props = nextProps;

    const statePatch: ModalStatePatch = {};
    if (hasFields) {
      this.cache.fieldIds?.clear();
      statePatch.fields = Array.isArray(patch.fields)
        ? cloneFields(patch.fields)
        : null;
    }

    for (const [key, value] of Object.entries(patch)) {
      if (key === 'fields' || key === 'text' || key === 'className') continue;
      statePatch[key as keyof ModalStatePatch] =
        value as ModalStatePatch[keyof ModalStatePatch];
    }

    if (hasOwn(patch, 'text')) {
      statePatch.text = createTextState(nextProps);
    }
    if (hasOwn(patch, 'className')) {
      statePatch.className = nextProps.className;
    }

    flushSync(() => {
      for (const [key, value] of Object.entries(statePatch)) {
        this.state[key as keyof ModalState] =
          value as ModalState[keyof ModalState];
      }
    });

    if (hasOwn(patch, 'style') && this.dom.modal) {
      this.applyStyle(this.dom.modal, this.state.style);
    }

    if (
      this.state.visible &&
      (hasOwn(patch, 'bgClose') || hasOwn(patch, 'escClose'))
    ) {
      this.bindEvents(this.root);
    }

    if (this.dom.form && hasFields) {
      this.dom.form.update(this.createFormProps());
    }

    return this;
  }

  applyStyle(element: HTMLElement, style: ModalStyle): void {
    element.removeAttribute('style');
    if (!style) {
      this.cache.baseStyle = '';
      return;
    }
    if (typeof style === 'string') {
      element.style.cssText = style;
      this.cache.baseStyle = element.getAttribute('style') || '';
      return;
    }
    Object.entries(style).forEach(([key, value]) => {
      if (value == null) return;
      const name = key.startsWith('--')
        ? key
        : key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
      element.style.setProperty(name, String(value));
    });
    this.cache.baseStyle = element.getAttribute('style') || '';
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

    requireRenderDOM('Modal.show');

    if (!this.root) this.buildRoot();

    this.cancelHideTimer();
    this.resetAnimationStyles();

    const { onShow, onShown } = this.state;
    void onShow?.(this);

    this.cache.previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (this.root && !this.root.parentNode)
      document.body.appendChild(this.root);
    this.lockScroll();
    this.runtime.visibleApplied = true;

    this.bindEvents(this.root);
    this.focusFirst();

    void onShown?.(this);
  }

  hideFromState(): void {
    if (!this.runtime.visibleApplied || !this.root) return;

    const { onHide, onHidden } = this.state;
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
      if (this.state.bgClose && event.target === root) {
        this.hide();
      }
    });
  }

  bindDocumentKeyEvent(): void {
    this.cleanup.events.on('keydown', document, 'keydown', (event) => {
      if (!this.state.visible || !(event instanceof KeyboardEvent)) return;

      if (event.key === 'Escape' && this.state.escClose) {
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

      if (action === 'back') {
        void this.handleBack();
        return;
      }

      if (action === 'next') {
        void this.handleNext();
        return;
      }

      if (action === 'confirm') {
        if (this.isFormMode()) {
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
    if (!this.dom.form) {
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

  async handleNext(): Promise<void> {
    if (this.isBusy()) return;
    if (!this.hasFlow()) return;
    await this.moveFlow('next');
  }

  async handleBack(): Promise<void> {
    if (this.isBusy()) return;
    if (!this.hasFlow()) return;
    await this.moveFlow('back');
  }

  hasFlow(): this is this & { state: ModalState & { flow: FlowLike } } {
    return isFlowLike(this.state.flow) && !!this.state.flow;
  }

  async moveFlow(direction: FlowDirection): Promise<void> {
    if (!this.hasFlow()) return;
    const payload = this.createFlowPayload();
    if (payload === false) return;

    flushSync(() => {
      this.state.submitting = true;
    });

    try {
      const snapshot = await Promise.resolve(
        this.state.flow[direction](payload)
      );
      this.syncFlowView(this.state.flow, snapshot);
    } catch (error) {
      console.error(`Modal.flow.${direction} error:`, error);
      this.syncFlowView(this.state.flow);
    } finally {
      if (this.state) {
        flushSync(() => {
          this.state.submitting = false;
        });
      }
    }
  }

  createFlowPayload(): FormDataRecord | null | false {
    if (!this.isFormMode()) return null;

    const form = this.dom.form;
    if (!form) return this.state.data || null;
    if (!form.validate()) return false;

    const data = mergeExtraData(form.collectData(), this.state.extraData);
    flushSync(() => {
      this.state.data = data;
    });

    return this.state.data;
  }

  resolveFlowModalView(
    flow: FlowLike,
    snapshot: FlowSnapshot | null,
    step?: FlowStep
  ): ModalFlowView {
    const source = step?.modal ?? step?.view;
    if (typeof source === 'function') {
      const result = source({
        flow,
        snapshot,
        step,
        modal: this,
        data: snapshot?.data ?? null,
        currentData: snapshot?.currentData ?? null,
      });
      return isPlainObject(result) ? result : {};
    }
    return clonePlainObject(source);
  }

  syncFlowView(
    flow: FlowLike | null,
    snapshot: FlowSnapshot | null = null
  ): void {
    if (!flow || !this.state) return;
    const state = flow.snapshot() || snapshot;
    const step =
      flow.currentStep || state?.currentStep || snapshot?.currentStep;
    const modalView = this.resolveFlowModalView(flow, state, step);
    const nextText = isPlainObject(modalView.text) ? modalView.text : {};
    const shouldInjectStepTitle =
      (!hasOwn(modalView, 'text') || !hasOwn(nextText, 'title')) &&
      step?.title != null;

    const patch: ModalPatch = {
      ...(shouldInjectStepTitle
        ? {
            text: {
              ...nextText,
              title: textValue(step.title),
            },
          }
        : {}),
      ...(!hasOwn(modalView, 'content') && !hasOwn(modalView, 'fields')
        ? { content: step?.content ?? null }
        : {}),
      ...modalView,
    };

    if (Array.isArray(patch.fields)) {
      patch.fields = hydrateFields(patch.fields, state?.currentData);
    }
    if (!hasOwn(patch, 'fields') && hasOwn(patch, 'content')) {
      patch.fields = null;
    }

    this.update(patch);
  }

  async handleConfirm(): Promise<void> {
    if (this.isBusy()) return;

    flushSync(() => {
      this.state.submitting = true;
    });

    try {
      await Promise.resolve(this.state.onConfirm?.(this));
      this.hide();
    } catch (error) {
      console.error('Modal.onConfirm error:', error);
    } finally {
      if (this.state) {
        flushSync(() => {
          this.state.submitting = false;
        });
      }
    }
  }

  async handleCancel(): Promise<void> {
    if (this.isBusy()) return;

    flushSync(() => {
      this.state.submitting = true;
    });

    try {
      await Promise.resolve(this.state.onCancel?.(this));
      this.hide();
    } catch (error) {
      console.error('Modal.onCancel error:', error);
    } finally {
      if (this.state) {
        flushSync(() => {
          this.state.submitting = false;
        });
      }
    }
  }

  async handleSubmit(data: FormDataRecord): Promise<void> {
    if (!this.state.onSubmit) return;

    flushSync(() => {
      this.state.submitting = true;
    });

    try {
      await Promise.resolve(this.state.onSubmit(data, this));
      this.state.extraData = null;
    } catch (error) {
      console.error('Modal.onSubmit error:', error);
    } finally {
      if (this.state) {
        flushSync(() => {
          this.state.submitting = false;
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
    if (this.runtime.scrollLocked || !canUseDOM()) return;
    if (modalScrollLockCount === 0) {
      modalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    modalScrollLockCount += 1;
    this.runtime.scrollLocked = true;
  }

  unlockScroll(): void {
    if (!this.runtime.scrollLocked || !canUseDOM()) return;
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
    if (this.cache.baseStyle)
      this.dom.modal.setAttribute('style', this.cache.baseStyle);
    else this.dom.modal.removeAttribute('style');
  }

  finishHide(onHidden: ResolvedModalProps['onHidden']): void {
    this.cleanup.hideTimer = null;
    this.root?.remove();
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

  validateStatePatch(patch: ModalStatePatch): void {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new Error('Modal.setState: expects a plain object patch.');
    }

    for (const key of Object.keys(patch)) {
      if (!hasOwn(MODAL_STATE_SCHEMA, key)) {
        throw new Error(
          `Modal.setState: "${key}" is not a supported state key.`
        );
      }
      if (MODAL_UPDATE_BLOCKED_KEYS.has(key)) {
        throw new Error(
          `Modal.setState: "${key}" cannot be updated after initialization.`
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

  override setState(patch: ModalStatePatch = {}): this {
    this.assertActive('setState');
    this.validateStatePatch(patch);

    flushSync(() => {
      for (const [key, value] of Object.entries(patch)) {
        if (key === 'fields') this.cache.fieldIds?.clear();
        this.state[key as keyof ModalState] =
          key === 'fields' && Array.isArray(value)
            ? (cloneFields(
                value as FormField[]
              ) as ModalState[keyof ModalState])
            : (value as ModalState[keyof ModalState]);
      }
    });
    return this;
  }

  show(): this {
    this.assertActive('show');
    flushSync(() => {
      this.state.visible = true;
    });
    return this;
  }

  hide(): this {
    this.assertActive('hide');
    flushSync(() => {
      this.state.visible = false;
    });
    return this;
  }

  setFields(data: readonly FormField[] | null, force = false): this {
    validateParam('data', data, MODAL_FIELDS_RULE, 'Modal.setFields');
    this.applyProps({ fields: data }, { validate: false, force });
    return this;
  }

  addFields(data: FormDataRecord): this {
    validateParam('data', data, MODAL_EXTRA_FIELDS_RULE, 'Modal.addFields');
    flushSync(() => {
      this.state.extraData = data;
    });
    return this;
  }

  setContent(content: ModalContent, force = false): this {
    validateParam('content', content, MODAL_CONTENT_RULE, 'Modal.setContent');

    if (this.isFormMode() && !force) {
      throw new Error(
        'Modal.setContent: Cannot setContent when fields are defined.'
      );
    }

    this.applyProps({ content }, { validate: false, force });
    return this;
  }

  override update(
    patch?: Partial<ResolvedModalProps> | null,
    options?: ComponentUpdateOptions
  ): this;
  update(patch?: ModalPatch | null, force?: boolean): this;
  update(
    patch: ModalPatch | Partial<ResolvedModalProps> | null = {},
    forceOrOptions: boolean | ComponentUpdateOptions = false
  ): this {
    const force =
      typeof forceOrOptions === 'boolean'
        ? forceOrOptions
        : !!forceOrOptions.force;
    return this.applyProps((patch || {}) as ModalPatch, {
      validate: true,
      force,
    });
  }

  reset(): this {
    this.cache.fieldIds?.clear();
    if (!this.cache.initial) return this;

    const initialProps = cloneProps(this.cache.initial);
    const patch: ModalPatch = { ...(initialProps as unknown as ModalProps) };
    delete patch.id;
    delete patch.lazy;
    this.props = normalizeProps(patch);
    this.applyProps(patch, { validate: false });
    flushSync(() => {
      this.state.data = null;
      this.state.extraData = null;
    });
    return this;
  }

  resetContent(): this {
    return this.setContent(this.cache.initial?.content ?? '');
  }

  resetFields(): this {
    return this.setFields(
      Array.isArray(this.cache.initial?.fields)
        ? cloneFields(this.cache.initial.fields)
        : null
    );
  }

  protected override onDestroy(): void {
    const wasVisible = !!this.runtime.visibleApplied;
    const onHide = this.state?.onHide;
    const onHidden = this.state?.onHidden;

    if (wasVisible) void onHide?.(this);

    this.cancelHideTimer();
    this.clearEvents();
    this.destroyForm();
    this.unlockScroll();
    this.cleanup.visibility?.();
    this.cleanup.visibility = null;
    this.cleanup.view?.();
    this.cleanup.view = null;

    this.root?.remove();
    if (wasVisible) void onHidden?.(this);

    this.cache = {
      initial: null,
      fieldIds: null,
      baseStyle: '',
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

export function createModal(input: ModalProps = {}): Modal {
  return new Modal(input);
}

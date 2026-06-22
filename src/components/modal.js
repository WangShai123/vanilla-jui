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

import Component from '../core/Component.js';
import {
  hasOwn,
  isPlainObject,
  randomId,
  resolveProps,
  validateParam,
} from '../utilities/core.js';
import { all, q, canUseDOM, canRenderDOM, isNode } from '../utilities/dom.js';
import { icon } from './icons.js';

const HIDE_DURATION = 300;

function cloneFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields.map((field) => ({
    ...field,
    options: Array.isArray(field.options)
      ? field.options.map((option) =>
          option && typeof option === 'object' ? { ...option } : option
        )
      : field.options,
  }));
}

function cloneProps(props) {
  return {
    ...props,
    fields: Array.isArray(props.fields)
      ? cloneFields(props.fields)
      : props.fields,
  };
}

function normalizeOption(option) {
  if (option && typeof option === 'object') return option;
  return { value: option, text: option };
}

function isModalContent(content) {
  return (
    content == null ||
    typeof content === 'string' ||
    typeof content === 'function' ||
    Array.isArray(content) ||
    isNode(content)
  );
}

function isUpdateProps(value) {
  return isPlainObject(value);
}

function isFlowLike(value) {
  return (
    value == null ||
    (typeof value === 'object' &&
      typeof value.next === 'function' &&
      typeof value.back === 'function' &&
      typeof value.snapshot === 'function')
  );
}

function hydrateFields(fields, data) {
  if (!Array.isArray(fields) || !isPlainObject(data)) return fields;

  return fields.map((field) => {
    if (!field?.name || !hasOwn(data, field.name)) return field;
    const value = data[field.name];

    if (field.type === 'checkbox' || field.type === 'radio') {
      const optionValue = field.value ?? 'on';
      const checked = Array.isArray(value)
        ? value.map(String).includes(String(optionValue))
        : value === true || String(value) === String(optionValue);
      return { ...field, checked };
    }

    return { ...field, value };
  });
}

function createTextState(props) {
  const text = isPlainObject(props?.text) ? props.text : {};
  return {
    title: typeof text.title === 'string' ? text.title : 'Tip',
    confirm: typeof text.confirm === 'string' ? text.confirm : 'Confirm',
    cancel: typeof text.cancel === 'string' ? text.cancel : 'Cancel',
  };
}

function createModalState(props) {
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

function mergeExtraData(data, extraData) {
  if (!extraData || typeof extraData !== 'object') return data;
  return Object.assign(data, extraData);
}

function clonePlainObject(value) {
  return isPlainObject(value) ? { ...value } : {};
}

const MODAL_CONTENT_RULE = {
  validate: isModalContent,
  message: 'expects string, Node, array, function or null.',
};

const MODAL_TEXT_RULE = {
  default: {},
  validate: (value) => isPlainObject(value),
  message: 'expects an object with text fields.',
  normalize: (value) => {
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
    normalize: (value) => {
      if (typeof value === 'string')
        return value.trim() ? value.trim() : randomId();
      if (value == null) return randomId();
      return value;
    },
  },
  escClose: { default: false, type: 'boolean' },
  bgClose: { default: false, type: 'boolean' },
  lazy: { default: false, type: 'boolean' },
};

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
  validate: (value) =>
    !!value && typeof value === 'object' && !Array.isArray(value),
  message: 'expects an object.',
};

const MODAL_UPDATE_RULE = {
  validate: isUpdateProps,
  message: 'expects a props object.',
};

let modalScrollLockCount = 0;
let modalBodyOverflow = '';

class Modal extends Component {
  constructor(input = {}) {
    const props = resolveProps(input, MODAL_PROPS_SCHEMA, 'Modal');
    super(props);

    this.dom.modal = null;
    this.dom.header = null;
    this.dom.body = null;
    this.dom.footer = null;
    this.dom.form = null;

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

    this.state = createDeepStore(createModalState(this.props));

    this.init(props);
  }

  onInit() {
    this.bindReactiveVisibility();
    if (!this.state.lazy && canRenderDOM()) this.buildRoot();
  }

  buildRoot() {
    if (this.root) return this.root;

    const { id } = this.state;
    const dialogChildren = [
      jsx('div', {
        className: 'modal-header',
        style: () => ({ display: this.state.header ? '' : 'none' }),
        ref: (element) => {
          this.dom.header = element;
        },
      }),
      jsx('div', {
        className: 'modal-body',
        ref: (element) => {
          this.dom.body = element;
        },
      }),
      jsx('div', {
        className: 'modal-footer',
        style: () => ({ display: this.state.footer ? '' : 'none' }),
        ref: (element) => {
          this.dom.footer = element;
        },
      }),
    ];

    const modal = jsx('div', {
      className: () =>
        this.state.fullscreen ? 'j-modal is-fullscreen' : 'j-modal',
      id,
      role: 'document',
      ref: (element) => {
        this.dom.modal = element;
        this.applyStyle(element, this.state.style);
      },
      children: dialogChildren,
    });

    const root = jsx('div', {
      className: () => `j-popup-layout is-${this.state.position}`,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': () => (this.state.header ? `${id}_title` : null),
      'aria-label': () =>
        this.state.header ? null : this.state.text?.title || 'Modal',
      children: modal,
    });

    this.root = root;
    this.mountView();
    return root;
  }

  mountView() {
    if (this.cleanup.view || !this.dom.body) return;

    this.cleanup.view = createRoot((dispose) => {
      if (this.dom.header) {
        const headerDispose = render(() => this.headerView(), this.dom.header);
        onCleanup(headerDispose);
      }

      render(() => this.bodyView(), this.dom.body);

      if (this.dom.footer) {
        const footerDispose = render(() => this.footerView(), this.dom.footer);
        onCleanup(footerDispose);
      }

      this.bindReactiveLoading();
      this.bindReactiveStyle();
      return dispose;
    });
  }

  headerView() {
    return () => {
      if (!this.state.header) return null;

      return [
        jsx('div', {
          className: 'modal-title',
          id: `${this.state.id}_title`,
          children: () => this.state.text?.title,
        }),
        this.state.showClose
          ? jsx('button', {
              type: 'button',
              className: 'is-reset modal-close',
              'data-action': 'close',
              'aria-label': 'close',
              children: icon('close'),
            })
          : null,
      ];
    };
  }

  footerView() {
    return () => {
      if (!this.state.footer) return null;

      return [
        this.state.showCancel
          ? jsx('button', {
              type: 'button',
              className: 'j-button is-ghost modal-cancel',
              'data-action': 'close',
              'aria-label': 'close',
              disabled: () => this.isBusy(),
              children: () => this.state.text?.cancel,
            })
          : null,
        jsx('button', {
          type: () => (this.isFormMode() ? 'submit' : 'button'),
          form: () => (this.isFormMode() ? this.cache.formId : null),
          className: 'j-button is-primary modal-confirm',
          'data-action': this.isFormMode() ? 'submit' : 'confirm',
          disabled: () => this.isBusy(),
          children: () => this.state.text?.confirm,
        }),
      ];
    };
  }

  bodyView() {
    if (this.isFormMode()) return this.formView();
    this.dom.form = null;
    return this.contentView(this.state.content);
  }

  formView() {
    return jsx('div', {
      className: 'modal-form-container',
      children: jsx('form', {
        id: this.cache.formId,
        className: 'j-form is-vertical is-item-vertical',
        ref: (element) => {
          this.dom.form = element;
        },
        onSubmit: (event) => this.handleFormSubmit(event),
        onKeyDown: (event) => this.handleFormKeydown(event),
        children: (this.state.fields || []).map((field, index) =>
          this.fieldView(field, index)
        ),
      }),
    });
  }

  fieldView(field, index) {
    const id = this.resolveFieldId(field, index);
    const label = this.labelView(field, id);
    return jsx('div', {
      className: 'form-item',
      style: { display: field.type === 'hidden' ? 'none' : '' },
      children: [
        label,
        jsx('div', {
          className: 'form-control',
          children: this.controlView(field, id),
        }),
      ],
    });
  }

  labelView(field, id) {
    return jsx('label', {
      className: `item-label ${field.required ? 'is-required' : ''}`,
      for: id,
      style: { display: field.label === undefined ? 'none' : '' },
      children: field.label === undefined ? '' : field.label,
    });
  }

  resolveFieldId(field, index) {
    if (field.id) return field.id;

    const key = field.name || index;
    if (!this.cache.fieldIds.has(key)) {
      this.cache.fieldIds.set(
        key,
        `${this.state.id}_field_${index}_${randomId()}`
      );
    }
    return this.cache.fieldIds.get(key);
  }

  controlView(field, id) {
    switch (field.type) {
      case 'textarea':
        return this.textareaView(field, id);
      case 'select':
        return this.selectView(field, id);
      default:
        return this.inputView(field, id);
    }
  }

  inputView(field, id) {
    const type = field.type || 'text';
    const props = {
      type,
      className: 'j-input',
      name: field.name,
      id,
      placeholder: field.placeholder || '',
      value: field.value ?? '',
      autocomplete: field.autocomplete || this.autoComplete(type),
      required: !!field.required,
      disabled: !!field.disabled,
      readonly: !!field.readonly,
    };

    if (field.checked !== undefined) props.checked = !!field.checked;
    return jsx('input', props);
  }

  textareaView(field, id) {
    return jsx('textarea', {
      className: 'j-textarea',
      name: field.name,
      id,
      placeholder: field.placeholder || '',
      value: field.value ?? '',
      required: !!field.required,
      disabled: !!field.disabled,
      readonly: !!field.readonly,
    });
  }

  selectView(field, id) {
    const value = field.value;
    return jsx('select', {
      className: 'j-select',
      name: field.name,
      id,
      autocomplete: 'off',
      required: !!field.required,
      disabled: !!field.disabled,
      readonly: !!field.readonly,
      multiple: !!field.multiple,
      children: (field.options || []).map((option) => {
        const item = normalizeOption(option);
        return jsx('option', {
          value: item.value ?? '',
          disabled: !!item.disabled,
          selected: this.isSelected(value, item.value),
          children: item.text ?? item.label ?? item.value ?? '',
        });
      }),
    });
  }

  contentView(content) {
    if (typeof content === 'function') return content(this);
    if (Array.isArray(content) || isNode(content)) return content;
    if (content == null) return '';
    if (typeof content !== 'string') return '';

    const template = document.createElement('template');
    template.innerHTML = content;
    return Array.from(template.content.childNodes);
  }

  bindReactiveLoading() {
    let loading = null;

    createEffect(() => {
      if (this.state.loading && !loading) {
        loading = jsx('div', {
          className: 'j-loading is-active',
          'aria-live': 'polite',
          children: jsx('div', { className: 'loading-spinner' }),
        });
        this.dom.modal.appendChild(loading);
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

  bindReactiveStyle() {
    createEffect(() => {
      const style = this.state.style;
      if (this.dom.modal) this.applyStyle(this.dom.modal, style);
    });
  }

  autoComplete(type) {
    switch (type) {
      case 'password':
        return 'current-password';
      case 'email':
        return 'email';
      default:
        return 'on';
    }
  }

  isSelected(value, optionValue) {
    if (Array.isArray(value))
      return value.map(String).includes(String(optionValue));
    return value == optionValue;
  }

  isFormMode() {
    return Array.isArray(this.state.fields);
  }

  isBusy() {
    return !!(this.state.loading || this.state.submitting);
  }

  validatePropsPatch(patch, namespace = 'Modal.update') {
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
      validateParam(key, patch[key], MODAL_PROPS_SCHEMA[key], namespace);
    }
  }

  applyProps(patch, { validate = true, force = false } = {}) {
    if (validate) this.validatePropsPatch(patch);
    if (!patch || Object.keys(patch).length === 0) return this;

    const hasFields = hasOwn(patch, 'fields');
    const hasContent = hasOwn(patch, 'content');

    if (hasContent) {
      if (!hasFields && this.isFormMode() && !force) {
        throw new Error(
          'Modal.update: Cannot update content when fields are defined.'
        );
      }
    }

    const nextProps = Object.assign({}, this.props, patch);
    if (hasOwn(patch, 'text')) {
      nextProps.text = Object.assign({}, this.props.text || {}, patch.text);
    }

    this.props = nextProps;
    super.update(patch, { force });
    this.props = nextProps;

    const statePatch = {};
    if (hasFields) {
      this.cache.fieldIds.clear();
      statePatch.fields = Array.isArray(patch.fields)
        ? cloneFields(patch.fields)
        : null;
    }

    for (const [key, value] of Object.entries(patch)) {
      if (key === 'fields' || key === 'text') continue;
      statePatch[key] = value;
    }

    const shouldRefreshText = hasOwn(patch, 'text');

    if (shouldRefreshText) {
      statePatch.text = createTextState(this.props);
    }

    flushSync(() => {
      for (const [key, value] of Object.entries(statePatch)) {
        this.state[key] = value;
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

    return this;
  }

  applyStyle(element, style) {
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
    if (typeof style === 'object') {
      Object.entries(style).forEach(([key, value]) => {
        if (value == null) return;
        const name = key.startsWith('--')
          ? key
          : key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
        element.style.setProperty(name, String(value));
      });
    }
    this.cache.baseStyle = element.getAttribute('style') || '';
  }

  normalizeIcon(element) {
    if (!(element instanceof Element)) return;
    const iconElement = q('.modal-close', element);
    if (iconElement) {
      iconElement.style.transform = `translateX(${iconElement.clientHeight / 3}px)`;
    }
  }

  bindReactiveVisibility() {
    this.cleanup.visibility = createRoot((dispose) => {
      createEffect(() => {
        const visible = !!this.state.visible;
        untrack(() => this.applyVisibility(visible));
      });
      return dispose;
    });
  }

  applyVisibility(visible) {
    if (visible === this.runtime.visibleApplied) return;
    if (visible) {
      this.showFromState();
      return;
    }
    this.hideFromState();
  }

  showFromState() {
    if (this.runtime.destroyed) {
      throw new Error('Modal: The current instance has been destroyed.');
    }

    if (!canRenderDOM()) {
      throw new Error('Modal.show: DOM environment is required.');
    }

    if (!this.root) this.buildRoot();

    this.cancelHideTimer();
    this.resetAnimationStyles();

    const { onShow, onShown } = this.state;
    if (onShow) onShow();

    this.cache.previousActiveElement = document.activeElement;
    if (!this.root.parentNode) document.body.appendChild(this.root);
    this.lockScroll();
    this.runtime.visibleApplied = true;

    this.normalizeIcon(this.dom.modal);
    this.bindEvents(this.root);
    this.focusFirst();

    if (onShown) onShown();
  }

  hideFromState() {
    if (!this.runtime.visibleApplied || !this.root) return;

    const { onHide, onHidden } = this.state;
    if (onHide) onHide();

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

  bindEvents(root) {
    this.clearEvents();
    this.bindOverlayCloseEvent(root);
    this.bindDocumentKeyEvent();
    this.bindInsideEvent();
  }

  bindOverlayCloseEvent(root) {
    if (!root) return;
    this.cleanup.events.on('bg', root, 'click', (event) => {
      if (this.state.bgClose && event.target === root) {
        this.hide();
      }
    });
  }

  bindDocumentKeyEvent() {
    this.cleanup.events.on('keydown', document, 'keydown', (event) => {
      if (!this.state.visible) return;

      if (event.key === 'Escape' && this.state.escClose) {
        event.preventDefault();
        this.hide();
        return;
      }

      if (event.key === 'Tab') this.trapFocus(event);
    });
  }

  bindInsideEvent() {
    if (!this.dom.modal) return;

    this.cleanup.events.on('inside', this.dom.modal, 'click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const actionEl = target?.closest('[data-action]');
      if (!actionEl || !this.dom.modal.contains(actionEl)) return;

      const action = actionEl.dataset.action;
      if (
        action === 'cancel' ||
        action === 'close' ||
        actionEl.classList.contains('modal-close')
      ) {
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
          if (actionEl.classList.contains('modal-confirm')) return;
          this.requestSubmit();
          return;
        }
        void this.handleConfirm();
      }
    });
  }

  clearEvents() {
    this.cleanup.events.clear();
  }

  requestSubmit() {
    if (!this.dom.form) {
      void this.handleConfirm();
      return;
    }

    if (typeof this.dom.form.requestSubmit === 'function') {
      this.dom.form.requestSubmit();
      return;
    }

    const event = new Event('submit', { bubbles: true, cancelable: true });
    this.dom.form.dispatchEvent(event);
  }

  async handleFormSubmit(event) {
    event.preventDefault();
    if (this.isBusy()) return;

    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = mergeExtraData(
      this.collectFormData(form),
      this.state.extraData
    );

    flushSync(() => {
      this.state.data = data;
    });

    await this.handleSubmit(data);
  }

  handleFormKeydown(event) {
    if (event.key !== 'Enter' || event.isComposing || this.isBusy()) return;
    const target = event.target;
    const tagName = target?.tagName?.toLowerCase();
    const type = target?.type?.toLowerCase();

    if (tagName === 'textarea') return;
    if (type === 'button' || type === 'submit' || type === 'reset') return;

    event.preventDefault();
    this.requestSubmit();
  }

  collectFormData(form) {
    const data = {};
    const formData = new FormData(form);

    for (const [key, value] of formData.entries()) {
      if (hasOwn(data, key)) {
        data[key] = Array.isArray(data[key])
          ? [...data[key], value]
          : [data[key], value];
      } else {
        data[key] = value;
      }
    }

    return data;
  }

  async handleNext() {
    if (this.isBusy()) return;
    if (!this.hasFlow()) return;
    await this.moveFlow('next');
  }

  async handleBack() {
    if (this.isBusy()) return;
    if (!this.hasFlow()) return;
    await this.moveFlow('back');
  }

  hasFlow() {
    return isFlowLike(this.state.flow) && !!this.state.flow;
  }

  async moveFlow(direction) {
    const payload = this.createFlowPayload();
    if (payload === false) return;

    flushSync(() => {
      this.state.submitting = true;
    });

    try {
      const snapshot = await this.state.flow[direction](payload);
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

  createFlowPayload() {
    if (!this.isFormMode()) return null;

    const form = this.dom.form;
    if (!form) return this.state.data || null;
    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }

    const data = mergeExtraData(
      this.collectFormData(form),
      this.state.extraData
    );
    flushSync(() => {
      this.state.data = data;
    });

    return this.state.data;
  }

  resolveFlowModalView(flow, snapshot, step) {
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

  syncFlowView(flow, snapshot = null) {
    if (!flow || !this.state) return;
    const state = flow.snapshot() || snapshot;
    const step =
      flow.currentStep || state?.currentStep || snapshot?.currentStep;
    const modalView = this.resolveFlowModalView(flow, state, step);
    const nextText = isPlainObject(modalView.text) ? modalView.text : {};
    const shouldInjectStepTitle =
      (!hasOwn(modalView, 'text') || !hasOwn(nextText, 'title')) &&
      step?.title != null;

    const patch = {
      ...(shouldInjectStepTitle
        ? {
            text: {
              ...nextText,
              title: step.title,
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

  async handleConfirm() {
    if (this.isBusy()) return;

    flushSync(() => {
      this.state.submitting = true;
    });

    try {
      if (this.state.onConfirm) await Promise.resolve(this.state.onConfirm());
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

  async handleCancel() {
    if (this.isBusy()) return;

    flushSync(() => {
      this.state.submitting = true;
    });

    try {
      if (this.state.onCancel) await Promise.resolve(this.state.onCancel(this));
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

  async handleSubmit(data) {
    if (!this.state.onSubmit) return;

    flushSync(() => {
      this.state.submitting = true;
    });

    try {
      await Promise.resolve(this.state.onSubmit(data));
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

  trapFocus(event) {
    if (!this.dom.modal) return;
    const focusable = Array.from(
      all(
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
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  focusFirst() {
    if (!this.dom.modal) return;
    const focusRoot = this.dom.form || this.dom.modal;
    const firstFocusable = q(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-action=close]), [tabindex]:not([tabindex="-1"])',
      focusRoot
    );
    if (firstFocusable) firstFocusable.focus();
    else {
      this.dom.modal.setAttribute('tabindex', '-1');
      this.dom.modal.focus();
    }
  }

  lockScroll() {
    if (this.runtime.scrollLocked || !canUseDOM()) return;
    if (modalScrollLockCount === 0) {
      modalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    modalScrollLockCount += 1;
    this.runtime.scrollLocked = true;
  }

  unlockScroll() {
    if (!this.runtime.scrollLocked || !canUseDOM()) return;
    modalScrollLockCount = Math.max(0, modalScrollLockCount - 1);
    if (modalScrollLockCount === 0) {
      document.body.style.overflow = modalBodyOverflow;
      modalBodyOverflow = '';
    }
    this.runtime.scrollLocked = false;
  }

  cancelHideTimer() {
    if (!this.cleanup.hideTimer) return;
    clearTimeout(this.cleanup.hideTimer);
    this.cleanup.hideTimer = null;
  }

  resetAnimationStyles() {
    if (!this.dom.modal) return;
    if (this.cache.baseStyle)
      this.dom.modal.setAttribute('style', this.cache.baseStyle);
    else this.dom.modal.removeAttribute('style');
  }

  finishHide(onHidden) {
    this.cleanup.hideTimer = null;
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    this.resetAnimationStyles();
    this.unlockScroll();
    this.restoreFocus();
    if (onHidden) onHidden();
  }

  restoreFocus() {
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

  assertActive(method) {
    if (this.runtime.destroyed) {
      throw new Error(
        `Modal.${method}: The current instance has been destroyed.`
      );
    }
  }

  validateStatePatch(patch) {
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
      validateParam(key, patch[key], MODAL_STATE_SCHEMA[key], 'Modal.setState');
    }
  }

  setState(patch = {}) {
    this.assertActive('setState');
    this.validateStatePatch(patch);

    flushSync(() => {
      for (const [key, value] of Object.entries(patch)) {
        if (key === 'fields') this.cache.fieldIds.clear();
        this.state[key] =
          key === 'fields' && Array.isArray(value) ? cloneFields(value) : value;
      }
    });
    return this;
  }

  show() {
    this.assertActive('show');
    flushSync(() => {
      this.state.visible = true;
    });
    return this;
  }

  hide() {
    this.assertActive('hide');
    flushSync(() => {
      this.state.visible = false;
    });
    return this;
  }

  setFields(data, force = false) {
    validateParam('data', data, MODAL_FIELDS_RULE, 'Modal.setFields');
    this.applyProps({ fields: data }, { validate: false, force });
    return this;
  }

  addFields(data) {
    validateParam('data', data, MODAL_EXTRA_FIELDS_RULE, 'Modal.addFields');
    flushSync(() => {
      this.state.extraData = data;
    });
    return this;
  }

  setContent(content, force = false) {
    validateParam('content', content, MODAL_CONTENT_RULE, 'Modal.setContent');

    if (this.isFormMode() && !force) {
      throw new Error(
        'Modal.setContent: Cannot setContent when fields are defined.'
      );
    }

    this.applyProps({ content }, { validate: false, force });
    return this;
  }

  update(patch = {}, force = false) {
    return this.applyProps(patch, { validate: true, force });
  }

  reset() {
    this.cache.fieldIds.clear();

    const initialProps = cloneProps(this.cache.initial);
    delete initialProps.id;
    delete initialProps.lazy;
    this.props = cloneProps(initialProps);
    this.applyProps(initialProps, { validate: false });
    flushSync(() => {
      this.state.data = null;
      this.state.extraData = null;
    });
    return this;
  }

  resetContent() {
    return this.setContent(this.cache.initial?.content ?? '');
  }

  resetFields() {
    return this.setFields(
      Array.isArray(this.cache.initial?.fields)
        ? cloneFields(this.cache.initial.fields)
        : null
    );
  }

  onDestroy() {
    const wasVisible = !!this.runtime.visibleApplied;
    const onHide = this.state?.onHide;
    const onHidden = this.state?.onHidden;

    if (wasVisible && onHide) onHide();

    this.cancelHideTimer();
    this.clearEvents();
    this.unlockScroll();
    this.cleanup.visibility?.();
    this.cleanup.visibility = null;
    this.cleanup.view?.();
    this.cleanup.view = null;

    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    if (wasVisible && onHidden) onHidden();

    this.cache = {
      initial: null,
      fieldIds: null,
      baseStyle: '',
      previousActiveElement: null,
      formId: '',
    };
  }

  destroy() {
    if (this.runtime.destroyed) return;
    super.destroy();
    return this;
  }
}

export default Modal;

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

import { randomId, resolveOptions, validateParam } from '../utilities/core.js';
import { all, q, canUseDOM, canRenderDOM, isNode } from '../utilities/dom.js';
import { createEventManager } from '../utilities/events.js';
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

function cloneOptions(options) {
  return {
    ...options,
    fields: Array.isArray(options.fields)
      ? cloneFields(options.fields)
      : options.fields,
  };
}

function normalizeOption(option) {
  if (option && typeof option === 'object') return option;
  return { value: option, text: option };
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
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

function isUpdateOptions(value) {
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

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
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

function createModalState(options) {
  return {
    ...options,
    fields: Array.isArray(options.fields) ? cloneFields(options.fields) : null,
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

const MODAL_CONTENT_RULE = {
  validate: isModalContent,
  message: 'expects string, Node, array, function or null.',
};

const MODAL_FIELDS_RULE = { types: ['array', 'null'] };
const MODAL_BUTTON_TEXT_RULE = {
  validate: (value) => typeof value === 'string' || value === false,
  message: 'expects string or false.',
};

const MODAL_OPTIONS_SCHEMA = {
  title: { default: 'Tip', type: 'string' },
  content: { default: '', ...MODAL_CONTENT_RULE },
  position: { default: 'center', type: 'string' },
  confirmText: { default: 'Confirm', type: 'string' },
  cancelText: { default: 'Cancel', type: 'string' },
  showCancel: { default: true, type: 'boolean' },
  showClose: { default: true, type: 'boolean' },
  showBack: { default: false, type: 'boolean' },
  showNext: { default: false, type: 'boolean' },
  fullscreen: { default: false, type: 'boolean' },
  flow: {
    default: null,
    validate: isFlowLike,
    message: 'expects a Flow instance or null.',
  },
  onShow: { default: null, types: ['function', 'null'] },
  onShown: { default: null, types: ['function', 'null'] },
  onHide: { default: null, types: ['function', 'null'] },
  onHidden: { default: null, types: ['function', 'null'] },
  onConfirm: { default: null, types: ['function', 'null'] },
  onSubmit: { default: null, types: ['function', 'null'] },
  onCancel: { default: null, types: ['function', 'null'] },
  onBack: { default: null, types: ['function', 'null'] },
  onNext: { default: null, types: ['function', 'null'] },
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
  backText: { default: 'Back', ...MODAL_BUTTON_TEXT_RULE },
  nextText: { default: 'Next', ...MODAL_BUTTON_TEXT_RULE },
};

const MODAL_STATE_SCHEMA = {
  ...MODAL_OPTIONS_SCHEMA,
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
  validate: isUpdateOptions,
  message: 'expects an options object.',
};

const modalStack = [];
let modalScrollLockCount = 0;
let modalBodyOverflow = '';

/**
 * @typedef {object} ModalFieldOption
 * @property {string|number} value 选项值。
 * @property {string|number} [text] 展示文案。
 * @property {string|number} [label] 展示文案别名。
 * @property {boolean} [disabled] 是否禁用。
 */

/**
 * @typedef {object} ModalField
 * @property {string} name 表单字段名。
 * @property {string} [label] 表单标签；不传时隐藏标签。
 * @property {string} [type="text"] 控件类型，支持 text、password、email、textarea、select、hidden 等。
 * @property {string} [id] 控件 id，不传时自动生成。
 * @property {string|number|string[]} [value] 默认值。
 * @property {string} [placeholder] 占位文案。
 * @property {boolean} [required] 是否必填。
 * @property {boolean} [disabled] 是否禁用。
 * @property {boolean} [readonly] 是否只读。
 * @property {boolean} [checked] checkbox/radio 默认选中状态。
 * @property {boolean} [multiple] select 是否支持多选。
 * @property {string} [autocomplete] 浏览器自动填充策略。
 * @property {Array<ModalFieldOption|string|number>} [options] select 选项列表。
 */

/**
 * @typedef {object} ModalOptions
 * @property {string} [title="Tip"] 标题。
 * @property {string|Node|Node[]|Function|null} [content=""] 内容；函数会接收当前 Modal 实例。
 * @property {string} [position="center"] 弹窗位置，对应 `is-${position}` 类名。
 * @property {string} [confirmText="Confirm"] 确认按钮文案。
 * @property {string} [cancelText="Cancel"] 取消按钮文案。
 * @property {string|false} [backText="Back"] 返回按钮文案；传 false 时不渲染内置返回按钮。
 * @property {string|false} [nextText="Next"] 下一步按钮文案；传 false 时不渲染内置下一步按钮。
 * @property {boolean} [showCancel=true] 是否显示取消按钮。
 * @property {boolean} [showClose=true] 是否显示右上角关闭按钮。
 * @property {boolean} [showBack=false] 是否显示返回按钮。
 * @property {boolean} [showNext=false] 是否显示下一步按钮。
 * @property {boolean} [fullscreen=false] 是否全屏展示。
 * @property {object|null} [flow] Flow 实例；存在时 data-action="next/back" 会映射到 Flow。
 * @property {Function|null} [onShow] 展示前回调。
 * @property {Function|null} [onShown] 展示后回调。
 * @property {Function|null} [onHide] 隐藏前回调。
 * @property {Function|null} [onHidden] 隐藏后回调。
 * @property {Function|null} [onConfirm] 非表单模式确认回调，支持 Promise。
 * @property {(data:Record<string, FormDataEntryValue|FormDataEntryValue[]>)=>void|Promise<void>|null} [onSubmit] 表单提交回调，支持 Promise。
 * @property {(modal:Modal)=>void|Promise<void>|null} [onCancel] 点击关闭或取消按钮时触发，支持 Promise。
 * @property {(modal:Modal)=>Partial<ModalOptions>|void|Promise<Partial<ModalOptions>|void>|null} [onBack] 返回回调，返回配置对象时会调用 update。
 * @property {(modal:Modal)=>Partial<ModalOptions>|void|Promise<Partial<ModalOptions>|void>|null} [onNext] 下一步回调，返回配置对象时会调用 update。
 * @property {ModalField[]|null} [fields] 表单字段配置；传数组时进入表单模式。
 * @property {boolean} [header=true] 是否显示头部。
 * @property {boolean} [footer=true] 是否显示底部。
 * @property {string|object|null} [style] 应用到 `.j-modal` 的行内样式。
 * @property {string|null} [id] 弹窗 id，不传时自动生成。
 * @property {boolean} [escClose=false] 是否允许按 Esc 关闭。
 * @property {boolean} [bgClose=false] 是否允许点击背景关闭。
 * @property {boolean} [lazy=false] 是否延迟到首次 show 时创建 DOM。
 */

/**
 * Modal 弹窗组件。
 *
 * 支持普通内容弹窗、表单弹窗、同一实例多场景复用、运行时 update、Promise 回调、焦点管理和滚动锁定。
 */
class Modal {
  /**
   * 创建弹窗实例。
   * @param {ModalOptions} [options={}] 弹窗配置。
   */
  constructor(options = {}) {
    const resolvedOptions = resolveOptions(
      options,
      MODAL_OPTIONS_SCHEMA,
      'Modal.options'
    );
    this.init(resolvedOptions);
  }

  /**
   * 当前显示中的弹窗栈。
   * @returns {Modal[]}
   */
  static get modalStack() {
    return modalStack;
  }

  /**
   * 初始化实例状态、初始快照和响应式状态。
   * @private
   * @param {ModalOptions} options 已归一化配置。
   * @returns {void}
   */
  init(options) {
    this.dom = { root: null };
    this.cleanup = {
      events: createEventManager(),
      state: null,
      view: null,
      hideTimer: null,
    };
    this.cache = {
      initial: cloneOptions(options),
      fieldIds: new Map(),
      baseStyle: '',
      previousActiveElement: null,
      formId: `${options.id}_form`,
    };
    this.runtime = {
      scrollLocked: false,
      visibleApplied: false,
      destroyed: false,
    };

    this.state = createDeepStore(createModalState(options));

    this.bindReactiveVisibility();

    if (!this.state.lazy && canRenderDOM()) this.buildRoot();
  }

  get root() {
    return this.dom?.root || null;
  }

  set root(value) {
    if (!this.dom) this.dom = {};
    this.dom.root = value;
  }

  /**
   * 获取弹窗主体节点。
   * @returns {HTMLElement|null}
   */
  get modal() {
    return this.dom.modal || (this.root ? q('.j-modal', this.root) : null);
  }

  /**
   * 当前表单节点。
   * @returns {HTMLFormElement|null}
   */
  get form() {
    if (this.dom.form && this.root?.contains(this.dom.form)) {
      return this.dom.form;
    }
    return this.root ? q('form', this.root) : null;
  }

  /**
   * 初始配置快照。
   * @returns {ModalOptions|null}
   */
  get initialOptions() {
    return this.cache.initial ? cloneOptions(this.cache.initial) : null;
  }

  /**
   * 初始表单字段快照。
   * @returns {ModalField[]|null}
   */
  get initialFields() {
    return this.cache.initial?.fields
      ? cloneFields(this.cache.initial.fields)
      : null;
  }

  /**
   * 初始普通内容。
   * @returns {ModalOptions["content"]|null}
   */
  get initialContent() {
    return this.cache.initial?.content ?? null;
  }

  /**
   * 当前普通内容。
   * @returns {ModalOptions["content"]|null}
   */
  get content() {
    return this.state?.content ?? null;
  }

  /**
   * 最近一次表单提交或 Flow payload。
   * @returns {Record<string, any>|null}
   */
  get data() {
    return this.state?.data ?? null;
  }

  /**
   * 当前是否显示。
   * @returns {boolean}
   */
  get visible() {
    return !!this.state?.visible;
  }

  set visible(value) {
    if (!this.state) return;
    flushSync(() => {
      this.state.visible = !!value;
    });
  }

  /**
   * 创建弹窗根节点。
   * @private
   * @returns {HTMLElement}
   */
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
        this.state.header ? null : this.state.title || 'Modal',
      children: modal,
    });

    this.root = root;
    this.mountView();
    return root;
  }

  /**
   * 将头部、正文和底部挂载为响应式视图。
   * @private
   * @returns {void}
   */
  mountView() {
    if (this.cleanup.view || !this.dom.body) return;

    this.cleanup.view = createRoot((dispose) => {
      if (this.dom.header) {
        const headerDispose = render(() => this.headerView(), this.dom.header);
        onCleanup(headerDispose);
      }

      const bodyDispose = render(() => this.bodyView(), this.dom.body);
      onCleanup(bodyDispose);

      if (this.dom.footer) {
        const footerDispose = render(() => this.footerView(), this.dom.footer);
        onCleanup(footerDispose);
      }

      this.bindReactiveLoading();
      this.bindReactiveStyle();
      return dispose;
    });
  }

  /**
   * 创建响应式头部视图。
   * @private
   * @returns {Function}
   */
  headerView() {
    return () => {
      if (!this.state.header) return null;

      return [
        jsx('div', {
          className: 'modal-title',
          id: `${this.state.id}_title`,
          children: () => this.state.title,
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

  /**
   * 创建响应式底部按钮视图。
   * @private
   * @returns {Function}
   */
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
              children: () => this.state.cancelText,
            })
          : null,
        this.state.showBack && this.state.backText !== false
          ? jsx('button', {
              type: 'button',
              className: 'j-button is-ghost modal-back',
              'data-action': 'back',
              disabled: () => this.isBusy(),
              children: () => this.state.backText,
            })
          : null,
        this.state.showNext && this.state.nextText !== false
          ? jsx('button', {
              type: 'button',
              className: 'j-button is-secondary modal-next',
              'data-action': 'next',
              disabled: () => this.isBusy(),
              children: () => this.state.nextText,
            })
          : null,
        jsx('button', {
          type: () => (this.isFormMode() ? 'submit' : 'button'),
          form: () => (this.isFormMode() ? this.cache.formId : null),
          className: 'j-button is-primary modal-confirm',
          'data-action': 'confirm',
          disabled: () => this.isBusy(),
          children: () => this.state.confirmText,
        }),
      ];
    };
  }

  /**
   * 根据当前模式创建正文视图。
   * @private
   * @returns {Node|Node[]|string}
   */
  bodyView() {
    if (this.isFormMode()) return this.formView();
    this.dom.form = null;
    return this.contentView(this.state.content);
  }

  /**
   * 创建表单视图。
   * @private
   * @returns {HTMLElement}
   */
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

  /**
   * 创建表单项视图。
   * @private
   * @param {ModalField} field 字段配置。
   * @param {number} index 字段索引。
   * @returns {HTMLElement}
   */
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

  /**
   * 根据字段类型创建具体控件。
   * @private
   * @param {ModalField} field 字段配置。
   * @param {string} id 控件 id。
   * @returns {HTMLElement}
   */
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

  /**
   * 将普通 content 转换为可渲染节点。
   * @private
   * @param {ModalOptions["content"]} content 弹窗内容。
   * @returns {Node|Node[]|string}
   */
  contentView(content) {
    if (typeof content === 'function') return content(this);
    if (Array.isArray(content) || isNode(content)) return content;
    if (content == null) return '';
    if (typeof content !== 'string') return '';

    const template = document.createElement('template');
    template.innerHTML = content;
    return Array.from(template.content.childNodes);
  }

  /**
   * 绑定响应式 loading 遮罩。
   * @private
   * @returns {void}
   */
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

  /**
   * 绑定响应式内联样式。
   * @private
   * @returns {void}
   */
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

  /**
   * 校验运行时配置补丁。
   * @private
   * @param {Partial<ModalOptions>} patch 需要更新的配置。
   * @param {string} [namespace="Modal.update"] 错误命名空间。
   * @returns {void}
   */
  validateOptionPatch(patch, namespace = 'Modal.update') {
    validateParam('options', patch, MODAL_UPDATE_RULE, namespace);

    for (const key of Object.keys(patch)) {
      if (!Object.prototype.hasOwnProperty.call(MODAL_OPTIONS_SCHEMA, key)) {
        throw new Error(
          `Validator: ${namespace}.${key} is not a supported modal option.`
        );
      }
      if (MODAL_UPDATE_BLOCKED_KEYS.has(key)) {
        throw new Error(
          `Modal.update: "${key}" cannot be updated after initialization.`
        );
      }
      validateParam(key, patch[key], MODAL_OPTIONS_SCHEMA[key], namespace);
    }
  }

  /**
   * 应用配置补丁并同步响应式状态。
   * @private
   * @param {Partial<ModalOptions>} patch 需要更新的配置。
   * @param {{validate?:boolean}} [options] 应用选项。
   * @returns {Modal}
   */
  applyOptions(patch, { validate = true } = {}) {
    if (validate) this.validateOptionPatch(patch);
    if (!patch || Object.keys(patch).length === 0) return this;

    const hasFields = Object.prototype.hasOwnProperty.call(patch, 'fields');
    const hasContent = Object.prototype.hasOwnProperty.call(patch, 'content');

    if (hasContent) {
      if (!hasFields && this.isFormMode()) {
        throw new Error(
          'Modal.update: Cannot update content when fields are defined.'
        );
      }
    }

    flushSync(() => {
      if (hasFields) {
        this.cache.fieldIds.clear();
        this.state.fields = Array.isArray(patch.fields)
          ? cloneFields(patch.fields)
          : null;
      }

      for (const [key, value] of Object.entries(patch)) {
        if (key === 'fields') continue;
        this.state[key] = value;
      }
    });

    if (Object.prototype.hasOwnProperty.call(patch, 'style') && this.modal) {
      this.applyStyle(this.modal, this.state.style);
    }

    if (
      this.visible &&
      (Object.prototype.hasOwnProperty.call(patch, 'bgClose') ||
        Object.prototype.hasOwnProperty.call(patch, 'escClose'))
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
    const icon = q('.modal-close', element);
    if (icon) {
      icon.style.transform = `translateX(${icon.clientHeight / 3}px)`;
    }
  }

  bindReactiveVisibility() {
    this.cleanup.state = createRoot((dispose) => {
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
    this.pushStack();
    this.runtime.visibleApplied = true;

    this.normalizeIcon(this.modal);
    this.bindEvents(this.root);
    this.focusFirst();

    if (onShown) onShown();
  }

  hideFromState() {
    if (!this.runtime.visibleApplied || !this.root) return;

    const { onHide, onHidden } = this.state;
    if (onHide) onHide();

    this.runtime.visibleApplied = false;
    this.removeFromStack();
    this.clearEvents();

    flushSync(() => {
      this.state.loading = false;
      this.state.extraData = null;
      this.state.data = null;
    });

    if (this.modal) {
      this.modal.style.transition = `opacity ${HIDE_DURATION}ms ease-out, transform ${HIDE_DURATION}ms ease-out`;
      this.modal.style.opacity = '0';
      this.modal.style.transform = 'scale(0.3)';
    }

    this.cancelHideTimer();
    this.cleanup.hideTimer = setTimeout(
      () => this.finishHide(onHidden),
      HIDE_DURATION
    );
  }

  /**
   * 绑定弹窗事件。
   * @private
   * @param {HTMLElement} root 弹窗根节点。
   * @returns {void}
   */
  bindEvents(root) {
    this.clearEvents();
    this.bindOverlayCloseEvent(root);
    this.bindDocumentKeyEvent();
    this.bindInsideEvent();
  }

  bindOverlayCloseEvent(root) {
    if (!root) return;
    this.cleanup.events.on('bg', root, 'click', (event) => {
      if (this.state.bgClose && event.target === root && this.isTop()) {
        this.hide();
      }
    });
  }

  bindDocumentKeyEvent() {
    this.cleanup.events.on('keydown', document, 'keydown', (event) => {
      if (!this.visible || !this.isTop()) return;

      if (event.key === 'Escape' && this.state.escClose) {
        event.preventDefault();
        this.hide();
        return;
      }

      if (event.key === 'Tab') this.trapFocus(event);
    });
  }

  bindInsideEvent() {
    if (!this.modal) return;

    this.cleanup.events.on('inside', this.modal, 'click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const actionEl = target?.closest('[data-action]');
      if (!actionEl || !this.modal.contains(actionEl)) return;

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

  /**
   * 清理弹窗事件。
   * @private
   * @returns {void}
   */
  clearEvents() {
    this.cleanup.events.clear();
  }

  /**
   * 请求提交表单；非表单模式下执行确认逻辑。
   * @private
   * @returns {void}
   */
  requestSubmit() {
    if (!this.form) {
      void this.handleConfirm();
      return;
    }

    if (typeof this.form.requestSubmit === 'function') {
      this.form.requestSubmit();
      return;
    }

    const event = new Event('submit', { bubbles: true, cancelable: true });
    this.form.dispatchEvent(event);
  }

  /**
   * 处理表单提交。
   * @private
   * @param {SubmitEvent} event 表单提交事件。
   * @returns {Promise<void>}
   */
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

  /**
   * 处理表单内回车提交。
   * @private
   * @param {KeyboardEvent} event 键盘事件。
   * @returns {void}
   */
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

  /**
   * 收集表单数据，并把同名字段合并为数组。
   * @private
   * @param {HTMLFormElement} form 表单节点。
   * @returns {Record<string, FormDataEntryValue|FormDataEntryValue[]>}
   */
  collectFormData(form) {
    const data = {};
    const formData = new FormData(form);

    for (const [key, value] of formData.entries()) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        data[key] = Array.isArray(data[key])
          ? [...data[key], value]
          : [data[key], value];
      } else {
        data[key] = value;
      }
    }

    return data;
  }

  /**
   * 处理下一步按钮逻辑。
   * @private
   * @returns {Promise<void>}
   */
  async handleNext() {
    if (this.isBusy()) return;
    if (this.hasFlow()) {
      await this.moveFlow('next');
      return;
    }
    if (typeof this.state.onNext !== 'function') return;

    flushSync(() => {
      this.state.submitting = true;
    });

    try {
      const result = await Promise.resolve(this.state.onNext(this));
      if (isPlainObject(result)) this.update(result);
    } catch (error) {
      console.error('Modal.onNext error:', error);
    } finally {
      if (this.state) {
        flushSync(() => {
          this.state.submitting = false;
        });
      }
    }
  }

  /**
   * 处理返回按钮逻辑。
   * @private
   * @returns {Promise<void>}
   */
  async handleBack() {
    if (this.isBusy()) return;
    if (this.hasFlow()) {
      await this.moveFlow('back');
      return;
    }
    if (typeof this.state.onBack !== 'function') return;

    flushSync(() => {
      this.state.submitting = true;
    });

    try {
      const result = await Promise.resolve(this.state.onBack(this));
      if (isPlainObject(result)) this.update(result);
    } catch (error) {
      console.error('Modal.onBack error:', error);
    } finally {
      if (this.state) {
        flushSync(() => {
          this.state.submitting = false;
        });
      }
    }
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

    const form = this.form;
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

  syncFlowView(flow, snapshot = null) {
    if (!flow || !this.state) return;
    const state = flow.snapshot() || snapshot;
    const step =
      flow.currentStep || state?.currentStep || snapshot?.currentStep;
    const view = isPlainObject(step?.view) ? step.view : {};
    const patch = { ...view };

    if (Array.isArray(patch.fields)) {
      patch.fields = hydrateFields(patch.fields, state?.currentData);
    }
    if (!hasOwn(patch, 'showBack')) patch.showBack = !!state?.canBack;
    if (!hasOwn(patch, 'showNext')) patch.showNext = !!state?.canNext;
    if (!hasOwn(patch, 'fields') && hasOwn(patch, 'content')) {
      patch.fields = null;
    }

    this.update(patch);
  }

  /**
   * 处理非表单模式确认逻辑。
   * @private
   * @returns {Promise<void>}
   */
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

  /**
   * 处理取消和关闭按钮逻辑。
   * @private
   * @returns {Promise<void>}
   */
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

  /**
   * 处理表单模式提交逻辑。
   * @private
   * @param {Record<string, FormDataEntryValue|FormDataEntryValue[]>} data 表单数据。
   * @returns {Promise<void>}
   */
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

  /**
   * 将 Tab 焦点限制在当前弹窗内。
   * @private
   * @param {KeyboardEvent} event 键盘事件。
   * @returns {void}
   */
  trapFocus(event) {
    if (!this.modal) return;
    const focusable = Array.from(
      all(
        'a[href], button:not([disabled]):not([data-action=close]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        this.modal
      )
    ).filter(
      (element) =>
        element.offsetParent !== null || element === document.activeElement
    );

    if (focusable.length === 0) {
      event.preventDefault();
      this.modal.focus();
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

  /**
   * 展示后聚焦第一个可交互元素。
   * @private
   * @returns {void}
   */
  focusFirst() {
    if (!this.modal) return;
    const focusRoot = this.form || this.modal;
    const firstFocusable = q(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-action=close]), [tabindex]:not([tabindex="-1"])',
      focusRoot
    );
    if (firstFocusable) firstFocusable.focus();
    else {
      this.modal.setAttribute('tabindex', '-1');
      this.modal.focus();
    }
  }

  /**
   * 锁定页面滚动，支持多个弹窗叠加。
   * @private
   * @returns {void}
   */
  lockScroll() {
    if (this.runtime.scrollLocked || !canUseDOM()) return;
    if (modalScrollLockCount === 0) {
      modalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    modalScrollLockCount += 1;
    this.runtime.scrollLocked = true;
  }

  /**
   * 释放当前实例持有的页面滚动锁。
   * @private
   * @returns {void}
   */
  unlockScroll() {
    if (!this.runtime.scrollLocked || !canUseDOM()) return;
    modalScrollLockCount = Math.max(0, modalScrollLockCount - 1);
    if (modalScrollLockCount === 0) {
      document.body.style.overflow = modalBodyOverflow;
      modalBodyOverflow = '';
    }
    this.runtime.scrollLocked = false;
  }

  pushStack() {
    this.removeFromStack();
    modalStack.push(this);
  }

  removeFromStack() {
    const index = modalStack.indexOf(this);
    if (index >= 0) modalStack.splice(index, 1);
  }

  isTop() {
    return modalStack[modalStack.length - 1] === this;
  }

  cancelHideTimer() {
    if (!this.cleanup.hideTimer) return;
    clearTimeout(this.cleanup.hideTimer);
    this.cleanup.hideTimer = null;
  }

  resetAnimationStyles() {
    if (!this.modal) return;
    if (this.cache.baseStyle)
      this.modal.setAttribute('style', this.cache.baseStyle);
    else this.modal.removeAttribute('style');
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

  // ========== 公开 API ==========

  assertActive(method) {
    if (this.runtime.destroyed) {
      throw new Error(
        `Modal.${method}: The current instance has been destroyed.`
      );
    }
  }

  /**
   * 设置单个响应式状态字段。
   * @param {string} key 状态字段名。
   * @param {*} value 状态值。
   * @returns {Modal}
   */
  setState(key, value) {
    this.assertActive('setState');
    if (typeof key !== 'string' || !key) {
      throw new Error('Modal.setState: key expects a non-empty string.');
    }
    if (!hasOwn(MODAL_STATE_SCHEMA, key)) {
      throw new Error(`Modal.setState: "${key}" is not a supported state key.`);
    }
    if (MODAL_UPDATE_BLOCKED_KEYS.has(key)) {
      throw new Error(
        `Modal.setState: "${key}" cannot be updated after initialization.`
      );
    }
    validateParam(key, value, MODAL_STATE_SCHEMA[key], 'Modal.setState');
    flushSync(() => {
      if (key === 'fields') this.cache.fieldIds.clear();
      this.state[key] =
        key === 'fields' && Array.isArray(value) ? cloneFields(value) : value;
    });
    return this;
  }

  /**
   * 展示弹窗。
   * @returns {Modal}
   */
  show() {
    this.assertActive('show');
    flushSync(() => {
      this.state.visible = true;
    });
    return this;
  }

  /**
   * 隐藏弹窗。
   * @returns {Modal}
   */
  hide() {
    this.assertActive('hide');
    flushSync(() => {
      this.state.visible = false;
    });
    return this;
  }

  /**
   * 替换表单字段配置。
   *
   * 传入数组时切换到表单模式；传 null 时退出表单模式。
   * @param {ModalField[]|null} data 表单字段配置。
   * @returns {Modal}
   */
  setFields(data) {
    validateParam('data', data, MODAL_FIELDS_RULE, 'Modal.setFields');
    this.applyOptions({ fields: data }, { validate: false });
    return this;
  }

  /**
   * 给下一次表单提交结果追加额外字段。
   * @param {Record<string, any>} data 需要合并到提交数据中的对象。
   * @returns {void}
   */
  addFields(data) {
    validateParam('data', data, MODAL_EXTRA_FIELDS_RULE, 'Modal.addFields');
    flushSync(() => {
      this.state.extraData = data;
    });
    return this;
  }

  /**
   * 替换普通内容弹窗的内容。
   *
   * 表单模式下不能调用该方法，请使用 setFields 或 update({ fields })。
   * @param {string|Node|Node[]|Function|null} content 新内容。
   * @returns {Modal}
   */
  setContent(content) {
    validateParam('content', content, MODAL_CONTENT_RULE, 'Modal.setContent');

    if (this.isFormMode()) {
      throw new Error(
        'Modal.setContent: Cannot setContent when fields are defined.'
      );
    }

    this.applyOptions({ content }, { validate: false });
    return this;
  }

  /**
   * 动态更新弹窗配置。
   *
   * 可在弹窗打开期间更新标题、内容、按钮、全屏状态、事件回调等；id 和 lazy 不能运行时修改。
   * @param {Partial<ModalOptions>} [options={}] 需要更新的配置。
   * @returns {Modal}
   */
  update(options = {}) {
    return this.applyOptions(options);
  }

  /**
   * 重置弹窗到初始配置。
   *
   * 表单模式会恢复初始 fields；普通模式会恢复初始 content 与其它可更新配置。
   * @returns {Modal}
   */
  reset() {
    this.cache.fieldIds.clear();

    const initialOptions = cloneOptions(this.cache.initial);
    delete initialOptions.id;
    delete initialOptions.lazy;
    this.applyOptions(initialOptions, { validate: false });
    flushSync(() => {
      this.state.data = null;
      this.state.extraData = null;
    });
    return this;
  }

  /**
   * 重置普通内容到实例创建时的 content。
   *
   * 表单模式下不能调用该方法，请先用 setFields(null) 退出表单模式。
   * @returns {Modal}
   */
  resetContent() {
    return this.setContent(this.cache.initial?.content ?? '');
  }

  /**
   * 重置表单字段到实例创建时的 fields。
   *
   * 初始不是表单模式的实例会切回普通内容模式。
   * @returns {Modal}
   */
  resetFields() {
    return this.setFields(
      Array.isArray(this.cache.initial?.fields)
        ? cloneFields(this.cache.initial.fields)
        : null
    );
  }

  /**
   * 销毁当前弹窗实例并释放 DOM、事件和响应式渲染。
   * @returns {void}
   */
  destroy() {
    if (this.runtime.destroyed) return;
    this.runtime.destroyed = true;

    const wasVisible = !!this.runtime.visibleApplied;
    const onHide = this.state?.onHide;
    const onHidden = this.state?.onHidden;

    if (wasVisible && onHide) onHide();

    this.cancelHideTimer();
    this.clearEvents();
    this.removeFromStack();
    this.unlockScroll();
    this.cleanup.state?.();
    this.cleanup.state = null;
    this.cleanup.view?.();
    this.cleanup.view = null;

    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    if (wasVisible && onHidden) onHidden();

    this.cleanup.events.clear();
    this.dom = { root: null };
    this.cache = {
      initial: null,
      fieldIds: null,
      baseStyle: '',
      previousActiveElement: null,
      formId: '',
    };
    this.state = null;
    this.runtime.visibleApplied = false;
  }
}

export default Modal;

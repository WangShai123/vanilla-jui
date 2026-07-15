import {
  createDeepStore,
  createRoot,
  flushSync,
  jsx,
  onCleanup,
  render,
} from 'vanilla-signal';

import Component from '../core/Component.js';
import {
  hasOwn,
  isPlainObject,
  randomId,
  resolveProps,
  validateParam,
} from '../utilities/core.js';
import {
  isRenderableContent,
  normalizeContentNodes,
  requireContainer,
  requireRenderDOM,
} from '../utilities/dom.js';
import { Validator } from './validator.js';

const DEFAULT_BUTTONS = [
  { type: 'submit', text: 'Submit', theme: 'primary', action: 'submit' },
  { type: 'reset', text: 'Reset', theme: 'ghost', action: 'reset' },
];

const FORM_PROPS_SCHEMA = {
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
  vertical: { default: true, type: 'boolean' },
  itemVertical: { default: true, type: 'boolean' },
  style: { default: '', types: ['string', 'object', 'null'] },
  fields: { default: [], type: 'array' },
  buttons: {
    default: DEFAULT_BUTTONS,
    types: ['boolean', 'array'],
    normalize: (value) => {
      if (value === false) return [];
      if (value === true) return cloneButtons(DEFAULT_BUTTONS);
      if (Array.isArray(value)) return cloneButtons(value);
      return value;
    },
  },
  validator: { default: {}, type: 'object' },
  onSubmit: { default: null, types: ['function', 'null'] },
  onReset: { default: null, types: ['function', 'null'] },
};

const FORM_UPDATE_RULE = {
  validate: (value) => isPlainObject(value),
  message: 'expects a props object.',
};

function cloneOptions(options) {
  if (!Array.isArray(options)) return options;
  return options.map((option) =>
    option && typeof option === 'object' ? { ...option } : option
  );
}

function cloneFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields.map((field) => ({
    ...field,
    options: cloneOptions(field.options),
  }));
}

function cloneButtons(buttons) {
  if (!Array.isArray(buttons)) return [];
  return buttons.map((button) => ({ ...button }));
}

function normalizeOption(option) {
  if (option && typeof option === 'object') return option;
  return { value: option, text: option };
}

function contentView(content, context) {
  if (!isRenderableContent(content)) return null;
  return normalizeContentNodes(content, context);
}

function fieldIsRequired(field, rules) {
  return !!field.required || !!rules?.[field.name]?.required;
}

function resolveClassName(...parts) {
  return parts.filter(Boolean).join(' ');
}

function setElementStyle(element, style) {
  element.removeAttribute('style');
  if (!style) return;
  if (typeof style === 'string') {
    element.style.cssText = style;
    return;
  }
  if (!isPlainObject(style)) return;
  for (const [key, value] of Object.entries(style)) {
    if (value == null) continue;
    const name = key.startsWith('--')
      ? key
      : key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    element.style.setProperty(name, String(value));
  }
}

function cloneValidator(validator) {
  const source = isPlainObject(validator) ? validator : {};
  return {
    ...source,
    rules: isPlainObject(source.rules) ? { ...source.rules } : {},
    messages: isPlainObject(source.messages) ? { ...source.messages } : {},
  };
}

export class Form extends Component {
  constructor(input = {}, container = false) {
    const props = resolveProps(input, FORM_PROPS_SCHEMA, 'Form.props');
    super(props);

    this.dom.container = container;
    this.dom.fields = new Map();
    this.validator = null;
    this.cleanup.view = null;

    this.cache = {
      initial: this.cloneProps(props),
      fieldIds: new Map(),
    };

    this.state = createDeepStore({
      ...this.cloneProps(props),
      submitting: false,
      data: null,
    });
  }

  onInit() {
    this.mount(this.dom.container);
  }

  build(container = this.dom.container) {
    if (this.runtime.destroyed)
      throw new Error('Form.build: instance destroyed');
    if (this.cleanup.view) return this;

    requireRenderDOM('Form');
    this.dom.container =
      container === false
        ? document.createDocumentFragment()
        : requireContainer(container, 'Form.container');
    this.init(this.props);
    return this;
  }

  mount(container = this.dom.container) {
    if (this.cleanup.view) return this;

    this.cleanup.view = createRoot((dispose) => {
      const viewDispose = render(() => this.view(), container);
      onCleanup(viewDispose);
      return dispose;
    });

    return this;
  }

  view() {
    return jsx('form', {
      className: () =>
        resolveClassName(
          'j-form',
          this.state.vertical ? 'is-vertical' : 'is-horizontal',
          this.state.itemVertical ? 'is-item-vertical' : 'is-item-horizontal'
        ),
      id: () => this.state.id,
      style: () => this.state.style,
      ref: (element) => {
        const changed = this.root !== element;
        this.root = element;
        setElementStyle(element, this.state.style);
        if (changed || !this.validator) this.syncValidator();
      },
      onSubmit: (event) => this.handleSubmit(event),
      onReset: (event) => this.handleReset(event),
      children: () => [
        ...this.state.fields.map((field, index) =>
          this.fieldView(field, index)
        ),
        this.buttonsView(),
      ],
    });
  }

  fieldView(field, index) {
    const id = this.resolveFieldId(field, index);
    const hidden = field.type === 'hidden';

    return jsx('div', {
      className: 'form-item',
      style: { display: hidden ? 'none' : '' },
      children: [
        this.labelView(field, id),
        jsx('div', {
          className: 'form-control',
          children: [
            this.controlView(field, id, index),
            field.help
              ? jsx('div', { className: 'help-block', children: field.help })
              : null,
          ],
        }),
      ],
    });
  }

  labelView(field, id) {
    if (field.label === false || field.label === undefined) return null;

    return jsx('label', {
      className: resolveClassName(
        'item-label',
        fieldIsRequired(field, this.state.validator?.rules) ? 'is-required' : ''
      ),
      for: id,
      children: field.label,
    });
  }

  controlView(field, id, index) {
    switch (field.type) {
      case 'textarea':
        return this.textareaView(field, id);
      case 'select':
        return this.selectView(field, id);
      case 'radio':
        return this.choiceGroupView(field, id, 'radio');
      case 'checkbox':
        return Array.isArray(field.options)
          ? this.choiceGroupView(field, id, 'checkbox')
          : this.inputView(field, id);
      case 'switch':
        return this.switchView(field, id);
      case 'custom':
        return contentView(field.content, { form: this, field, index });
      default:
        return this.inputView(field, id);
    }
  }

  inputView(field, id) {
    const type = field.type || 'text';
    const props = this.controlProps(field, id, {
      type,
      className: field.className || 'j-input',
      autocomplete: field.autocomplete || this.autoComplete(type),
      value: field.value ?? '',
    });

    if (field.checked !== undefined) props.checked = !!field.checked;
    return jsx('input', props);
  }

  textareaView(field, id) {
    return jsx(
      'textarea',
      this.controlProps(field, id, {
        className: field.className || 'j-textarea',
        autocomplete: field.autocomplete,
        value: field.value ?? '',
      })
    );
  }

  selectView(field, id) {
    const value = field.value;
    return jsx(
      'select',
      this.controlProps(field, id, {
        className: field.className || 'j-select',
        autocomplete: field.autocomplete || 'off',
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
      })
    );
  }

  choiceGroupView(field, id, type) {
    const direction = field.vertical ? 'vertical' : 'horizontal';
    const className = resolveClassName(
      type === 'radio' ? 'j-radio' : 'j-checkbox',
      `is-${direction}`,
      field.group ? 'is-group' : '',
      field.size ? `is-${field.size}` : ''
    );

    return jsx('div', {
      className,
      children: (field.options || []).map((option, optionIndex) => {
        const item = normalizeOption(option);
        const optionId = `${id}_${optionIndex}`;
        return jsx('label', {
          className: type === 'radio' ? 'radio-label' : '',
          for: optionId,
          children: [
            jsx('input', {
              type,
              id: optionId,
              name: field.name,
              value: item.value ?? '',
              checked:
                type === 'radio'
                  ? this.isSelected(field.value, item.value)
                  : this.isChecked(field.value, item.value, item.checked),
              disabled: !!item.disabled || !!field.disabled,
              required: !!field.required,
            }),
            jsx('span', {
              className: type === 'radio' ? 'radio-text' : '',
              children: item.text ?? item.label ?? item.value ?? '',
            }),
          ],
        });
      }),
    });
  }

  switchView(field, id) {
    return jsx('label', {
      className: resolveClassName(
        'j-switch',
        field.variant ? `is-${field.variant}` : 'is-default',
        field.size ? `is-${field.size}` : 'is-md'
      ),
      for: id,
      children: [
        jsx('input', {
          type: 'checkbox',
          id,
          name: field.name,
          value: field.value ?? 'on',
          checked: !!field.checked,
          disabled: !!field.disabled,
          required: !!field.required,
        }),
        jsx('span', { className: 'switch-slider' }),
      ],
    });
  }

  buttonsView() {
    if (!this.state.buttons.length) return null;

    return jsx('div', {
      className: 'form-buttons',
      children: this.state.buttons.map((button) =>
        jsx('button', {
          type: button.type || 'button',
          className: resolveClassName(
            'j-button',
            button.theme ? `is-${button.theme}` : '',
            button.className || ''
          ),
          'data-action': button.action || button.type || 'button',
          disabled: () => !!this.state.submitting || !!button.disabled,
          children: button.text ?? button.label ?? '',
        })
      ),
    });
  }

  controlProps(field, id, extra = {}) {
    return {
      ...extra,
      name: field.name,
      id,
      placeholder: field.placeholder || '',
      required: !!field.required,
      disabled: !!field.disabled,
      readonly: !!field.readonly,
      ref: (element) => {
        if (field.name) this.dom.fields.set(field.name, element);
      },
    };
  }

  resolveFieldId(field, index) {
    if (field.id) return field.id;

    const key = field.name || index;
    if (!this.cache.fieldIds.has(key)) {
      this.cache.fieldIds.set(key, `${this.state.id}_field_${index}`);
    }
    return this.cache.fieldIds.get(key);
  }

  syncValidator() {
    if (!this.root) return;
    const options = {
      ...this.state.validator,
      onSubmit: null,
    };

    if (this.validator?.root === this.root) {
      this.validator.options = options;
      return;
    }

    this.validator?.destroy();
    this.validator = new Validator(this.root, options, false);
  }

  validate() {
    if (!this.validator) return true;
    return this.validator.validate();
  }

  reset() {
    this.validator?.reset();
    flushSync(() => {
      this.state.data = null;
    });
    return this;
  }

  async handleSubmit(event) {
    event.preventDefault();
    if (this.state.submitting) return;
    if (!this.validate()) return;

    const data = this.collectData();
    flushSync(() => {
      this.state.submitting = true;
      this.state.data = data;
    });

    try {
      await Promise.resolve(this.state.onSubmit?.(data, this));
    } finally {
      if (this.state) {
        flushSync(() => {
          this.state.submitting = false;
        });
      }
    }
  }

  handleReset(event) {
    this.validator?.reset();
    flushSync(() => {
      this.state.data = null;
    });
    this.state.onReset?.(event, this);
  }

  collectData() {
    if (!this.root) return {};
    return this.collectFormData(this.root);
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

  requestSubmit() {
    if (!this.root) return this;
    if (typeof this.root.requestSubmit === 'function') {
      this.root.requestSubmit();
      return this;
    }

    const event = new Event('submit', { bubbles: true, cancelable: true });
    this.root.dispatchEvent(event);
    return this;
  }

  update(patch = {}) {
    validateParam('props', patch, FORM_UPDATE_RULE, 'Form.update');
    const nextProps = resolveProps(
      Object.assign({}, this.props, patch),
      FORM_PROPS_SCHEMA,
      'Form.props'
    );

    this.props = this.cloneProps(nextProps);
    this.cache.fieldIds.clear();
    super.update(patch);

    flushSync(() => {
      for (const [key, value] of Object.entries(this.cloneProps(nextProps))) {
        this.state[key] = value;
      }
    });
    return this;
  }

  setFields(fields) {
    validateParam('fields', fields, 'array', 'Form.setFields');
    return this.update({ fields });
  }

  resetFields() {
    return this.setFields(this.cache.initial.fields);
  }

  cloneProps(props) {
    return {
      ...props,
      fields: cloneFields(props.fields),
      buttons: cloneButtons(props.buttons),
      validator: cloneValidator(props.validator),
    };
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

  isChecked(value, optionValue, checked) {
    if (checked !== undefined) return !!checked;
    if (Array.isArray(value))
      return value.map(String).includes(String(optionValue));
    return value === true || String(value) === String(optionValue);
  }

  onDestroy() {
    this.validator?.destroy();
    this.validator = null;
    this.cleanup.view?.();
    this.cleanup.view = null;
    this.cache = { initial: null, fieldIds: null };
  }
}

export function createForm(props = {}, container = false) {
  return new Form(props, container);
}

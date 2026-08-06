import {
  createDeepStore,
  createRoot,
  flushSync,
  jsx,
  onCleanup,
  render,
} from 'vanilla-signal';

import Component, { type ComponentDOM } from '../core/Component.ts';
import { joinClasses } from '../utilities/class-name.ts';
import {
  type RenderableContent,
  all,
  normalizeRenderableContentNodes,
} from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import { isPlainObject } from '../utilities/object.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';
import { createValidator } from '../validation/validator.ts';

type FormValue = string | number | boolean;
type FormOptionInput = FormValue | FormOption;
type FormControlElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;
type FormStyle = string | Partial<CSSStyleDeclaration> | null;
export type FormDataValue = FormDataEntryValue | FormDataEntryValue[];
export type FormDataRecord = Record<string, FormDataValue>;
type FormControlType =
  | 'checkbox'
  | 'custom'
  | 'radio'
  | 'select'
  | 'switch'
  | 'textarea'
  | (string & {});

export interface FormClassNames {
  form: string;
  vertical: string;
  horizontal: string;
  itemVertical: string;
  itemHorizontal: string;
  item: string;
  label: string;
  required: string;
  control: string;
  helpInvalid: string;
  buttons: string;
  button: string;
  input: string;
  textarea: string;
  select: string;
  radio: string;
  checkbox: string;
  choiceVertical: string;
  choiceHorizontal: string;
  choiceGroup: string;
  radioLabel: string;
  radioText: string;
  switch: string;
  switchDefault: string;
  switchSizeMd: string;
  switchSlider: string;
}

export type FormClassNameConfig = Partial<FormClassNames>;

export interface FormOption {
  value?: FormValue | FormDataEntryValue | null;
  text?: RenderableContent<Form>;
  label?: RenderableContent<Form>;
  checked?: boolean;
  disabled?: boolean;
}

export interface FormField {
  id?: string;
  label?: RenderableContent<Form> | false;
  name?: string;
  type?: FormControlType;
  options?: readonly FormOptionInput[];
  value?: FormDataEntryValue | boolean | readonly FormDataEntryValue[];
  checked?: boolean;
  required?: boolean;
  placeholder?: string;
  help?: RenderableContent<Form>;
  disabled?: boolean;
  readonly?: boolean;
  autocomplete?: string;
  multiple?: boolean;
  vertical?: boolean;
  group?: boolean;
  size?: string;
  variant?: string;
  className?: string;
  content?: RenderableContent<FormControlContext>;
}

export interface FormButton {
  type?: string;
  text?: RenderableContent<Form>;
  label?: RenderableContent<Form>;
  theme?: string;
  action?: string;
  disabled?: boolean;
  className?: string;
}

export interface FormValidatorConfig {
  rules?: Record<string, Record<string, unknown>>;
  messages?: Record<string, Record<string, string>>;
  onSubmit?: (() => void) | null;
  [key: string]: unknown;
}

export interface FormProps extends Record<string, unknown> {
  id?: string | null;
  vertical?: boolean;
  itemVertical?: boolean;
  style?: FormStyle;
  fields?: readonly FormField[];
  buttons?: boolean | readonly FormButton[];
  className?: FormClassNameConfig;
  validator?: FormValidatorConfig;
  onSubmit?:
    | ((data: FormDataRecord, form: Form) => void | Promise<void>)
    | null;
  onReset?: ((event: Event, form: Form) => void) | null;
}

interface ResolvedFormProps extends Record<string, unknown> {
  id: string;
  vertical: boolean;
  itemVertical: boolean;
  style: FormStyle;
  fields: FormField[];
  buttons: FormButton[];
  className: FormClassNames;
  validator: FormValidatorConfig;
  onSubmit: ((data: FormDataRecord, form: Form) => void | Promise<void>) | null;
  onReset: ((event: Event, form: Form) => void) | null;
}

interface FormState extends ResolvedFormProps {
  submitting: boolean;
  data: FormDataRecord | null;
}

interface FormDOM extends ComponentDOM {
  root: HTMLFormElement | null;
  fields: Map<string, FormControlElement>;
}

interface FormCache {
  initial: ResolvedFormProps;
  fieldIds: Map<string | number, string>;
}

interface ValidatorInstance {
  dom: { root: Element | null };
  props: (FormValidatorConfig & { onSubmit: null }) | null;
  validate: () => boolean;
  reset: () => void;
  destroy: () => void;
}

interface FormControlContext {
  form: Form;
  field: FormField;
  index: number;
}

const DEFAULT_CLASS_NAMES: FormClassNames = {
  form: 'j-form',
  vertical: 'is-vertical',
  horizontal: 'is-horizontal',
  itemVertical: 'is-item-vertical',
  itemHorizontal: 'is-item-horizontal',
  item: 'form-item',
  label: 'item-label',
  required: 'is-required',
  control: 'form-control',
  helpInvalid: 'is-invalid',
  buttons: 'form-buttons',
  button: 'j-button',
  input: 'j-input',
  textarea: 'j-textarea',
  select: 'j-select',
  radio: 'j-radio',
  checkbox: 'j-checkbox',
  choiceVertical: 'is-vertical',
  choiceHorizontal: 'is-horizontal',
  choiceGroup: 'is-group',
  radioLabel: 'radio-label',
  radioText: 'radio-text',
  switch: 'j-switch',
  switchDefault: 'is-default',
  switchSizeMd: 'is-md',
  switchSlider: 'switch-slider',
};

const DEFAULT_BUTTONS: FormButton[] = [
  { type: 'submit', text: 'Submit', theme: 'primary', action: 'submit' },
  { type: 'reset', text: 'Reset', theme: 'ghost', action: 'reset' },
];

const FORM_PROPS_SCHEMA = {
  id: {
    default: null,
    types: ['string', 'null'],
    normalize: (value: unknown) => {
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
    normalize: (value: unknown) => {
      if (value === false) return [];
      if (value === true) return cloneButtons(DEFAULT_BUTTONS);
      if (Array.isArray(value)) return cloneButtons(value);
      return value;
    },
  },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => resolveClassNames(value),
  },
  validator: { default: {}, type: 'object' },
  onSubmit: { default: null, types: ['function', 'null'] },
  onReset: { default: null, types: ['function', 'null'] },
} satisfies ResolveSchema<FormProps>;

function cloneOptions(
  options: readonly FormOptionInput[] | undefined
): FormOptionInput[] {
  if (!Array.isArray(options)) return [];
  return options.map((option) =>
    option && typeof option === 'object' ? { ...option } : option
  );
}

function cloneFields(fields: readonly FormField[] | undefined): FormField[] {
  if (!Array.isArray(fields)) return [];
  return fields.map((field) => ({
    ...field,
    options: cloneOptions(field.options),
  }));
}

function cloneButtons(
  buttons: readonly FormButton[] | undefined
): FormButton[] {
  if (!Array.isArray(buttons)) return [];
  return buttons.map((button) => ({ ...button }));
}

function normalizeOption(option: FormOptionInput): FormOption {
  if (option && typeof option === 'object') return option;
  return { value: option, text: String(option) };
}

function stringifyFormValue(
  value: FormOption['value'] | FormDataEntryValue | undefined
): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return value.name;
}

function fieldIsRequired(
  field: FormField,
  rules: FormValidatorConfig['rules']
): boolean {
  if (!field.name) return !!field.required;
  return !!field.required || !!rules?.[field.name]?.required;
}

function resolveClassNames(value: unknown): FormClassNames {
  return {
    ...DEFAULT_CLASS_NAMES,
    ...(isPlainObject(value) ? (value as Partial<FormClassNames>) : {}),
  } as FormClassNames;
}

function setElementStyle(element: HTMLElement, style: FormStyle): void {
  element.removeAttribute('style');
  if (!style) return;
  if (typeof style === 'string') {
    element.style.cssText = style;
    return;
  }
  if (!isPlainObject(style)) return;
  const styleRecord = style as Record<string, unknown>;
  for (const [key, value] of Object.entries(styleRecord)) {
    if (value == null) continue;
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const name = key.startsWith('--')
      ? key
      : key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    element.style.setProperty(name, String(value));
  }
}

function cloneValidator(validator: unknown): FormValidatorConfig {
  const source = (
    isPlainObject(validator) ? validator : {}
  ) as Partial<FormValidatorConfig> & Record<string, unknown>;
  return {
    ...source,
    rules: isPlainObject(source.rules)
      ? (source.rules as FormValidatorConfig['rules'])
      : {},
    messages: isPlainObject(source.messages)
      ? (source.messages as FormValidatorConfig['messages'])
      : {},
  };
}

function normalizeProps(input: FormProps): ResolvedFormProps {
  const props = resolveProps(input, FORM_PROPS_SCHEMA, 'Form.props');
  return {
    ...props,
    id: String(props.id),
    vertical: Boolean(props.vertical),
    itemVertical: Boolean(props.itemVertical),
    style: props.style as FormStyle,
    fields: cloneFields(props.fields as readonly FormField[]),
    buttons: cloneButtons(props.buttons as readonly FormButton[]),
    className: resolveClassNames(props.className),
    validator: cloneValidator(props.validator),
    onSubmit: props.onSubmit as ResolvedFormProps['onSubmit'],
    onReset: props.onReset as ResolvedFormProps['onReset'],
  };
}

class Form extends Component<ResolvedFormProps, FormState, FormDOM> {
  declare state: FormState;
  validator: ValidatorInstance | null;
  cache: FormCache;

  constructor(input: FormProps = {}) {
    const props = normalizeProps(input);
    super(props);

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

  get root(): HTMLFormElement | null {
    return this.dom?.root || null;
  }

  set root(value: HTMLFormElement | null) {
    this.dom.root = value;
  }

  build(): this {
    if (this.runtime.destroyed)
      throw new Error('Form.build: instance destroyed');
    if (this.cleanup.view) return this;
    this.init(this.props);

    const host = document.createElement('div');
    this.cleanup.view = createRoot((dispose) => {
      const viewDispose = render(() => this.view(), host);
      onCleanup(viewDispose);
      return dispose;
    });

    return this;
  }

  view(): HTMLFormElement {
    const className = this.state.className;
    return jsx('form', {
      className: () =>
        joinClasses(
          this.state.className.form,
          this.state.vertical ? className.vertical : className.horizontal,
          this.state.itemVertical
            ? className.itemVertical
            : className.itemHorizontal
        ),
      id: () => this.state.id,
      style: () => this.state.style,
      'data-form': 'root',
      'data-form-layout': () =>
        this.state.vertical ? 'vertical' : 'horizontal',
      'data-form-item-layout': () =>
        this.state.itemVertical ? 'vertical' : 'horizontal',
      ref: (element: HTMLFormElement) => {
        const changed = this.root !== element;
        this.root = element;
        setElementStyle(element, this.state.style);
        if (changed || !this.validator) this.syncValidator();
      },
      onSubmit: (event: Event) => this.handleSubmit(event),
      onReset: (event: Event) => this.handleReset(event),
      children: () => [
        ...this.state.fields.map((field, index) =>
          this.fieldView(field, index)
        ),
        this.buttonsView(),
      ],
    });
  }

  fieldView(field: FormField, index: number): HTMLElement {
    const id = this.resolveFieldId(field, index);
    const hidden = field.type === 'hidden';
    const className = this.state.className;

    return jsx('div', {
      className: className.item,
      'data-form-item': field.name || String(index),
      style: { display: hidden ? 'none' : '' },
      children: [
        this.labelView(field, id),
        jsx('div', {
          className: className.control,
          'data-form-control': field.name || String(index),
          children: [
            this.controlView(field, id, index),
            field.help
              ? jsx('div', {
                  className: 'help-block',
                  'data-form-help': field.name || String(index),
                  children: field.help,
                })
              : null,
          ],
        }),
      ],
    });
  }

  labelView(field: FormField, id: string): HTMLLabelElement | null {
    if (field.label === false || field.label === undefined) return null;
    const className = this.state.className;

    return jsx('label', {
      className: joinClasses(
        className.label,
        fieldIsRequired(field, this.state.validator?.rules)
          ? className.required
          : ''
      ),
      'data-form-label': field.name || id,
      for: id,
      children: field.label,
    });
  }

  controlView(
    field: FormField,
    id: string,
    index: number
  ): FormControlElement | HTMLElement | Node[] | null {
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
        return normalizeRenderableContentNodes(field.content, {
          form: this,
          field,
          index,
        });
      default:
        return this.inputView(field, id);
    }
  }

  inputView(field: FormField, id: string): HTMLInputElement {
    const type = field.type || 'text';
    const props = this.controlProps(field, id, {
      type,
      className: field.className || this.state.className.input,
      autocomplete: field.autocomplete || this.autoComplete(type),
      value: field.value ?? '',
    });

    return jsx('input', {
      ...props,
      checked: field.checked === undefined ? undefined : !!field.checked,
    });
  }

  textareaView(field: FormField, id: string): HTMLTextAreaElement {
    return jsx(
      'textarea',
      this.controlProps(field, id, {
        className: field.className || this.state.className.textarea,
        autocomplete: field.autocomplete,
        value: field.value ?? '',
      })
    );
  }

  selectView(field: FormField, id: string): HTMLSelectElement {
    const value = field.value;
    return jsx(
      'select',
      this.controlProps(field, id, {
        className: field.className || this.state.className.select,
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

  choiceGroupView(
    field: FormField,
    id: string,
    type: 'checkbox' | 'radio'
  ): HTMLElement {
    const direction = field.vertical ? 'vertical' : 'horizontal';
    const classNameConfig = this.state.className;
    const className = joinClasses(
      type === 'radio' ? classNameConfig.radio : classNameConfig.checkbox,
      direction === 'vertical'
        ? classNameConfig.choiceVertical
        : classNameConfig.choiceHorizontal,
      field.group ? classNameConfig.choiceGroup : '',
      field.size ? `is-${field.size}` : ''
    );

    return jsx('div', {
      className,
      'data-form-choice-group': field.name || id,
      'data-choice-type': type,
      'data-choice-layout': direction,
      children: (field.options || []).map((option, optionIndex) => {
        const item = normalizeOption(option);
        const optionId = `${id}_${optionIndex}`;
        return jsx('label', {
          className: type === 'radio' ? classNameConfig.radioLabel : '',
          'data-form-choice': field.name || id,
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
              className: type === 'radio' ? classNameConfig.radioText : '',
              'data-form-choice-text': '',
              children: item.text ?? item.label ?? item.value ?? '',
            }),
          ],
        });
      }),
    });
  }

  switchView(field: FormField, id: string): HTMLLabelElement {
    const className = this.state.className;
    return jsx('label', {
      className: joinClasses(
        className.switch,
        field.variant ? `is-${field.variant}` : className.switchDefault,
        field.size ? `is-${field.size}` : className.switchSizeMd
      ),
      'data-form-switch': field.name || id,
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
        jsx('span', {
          className: className.switchSlider,
          'data-form-switch-slider': '',
        }),
      ],
    });
  }

  buttonsView(): HTMLElement | null {
    if (!this.state.buttons.length) return null;
    const className = this.state.className;

    return jsx('div', {
      className: className.buttons,
      'data-form-buttons': '',
      children: this.state.buttons.map((button) =>
        jsx('button', {
          type: button.type || 'button',
          className: joinClasses(
            className.button,
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

  controlProps<TExtra extends Record<string, unknown>>(
    field: FormField,
    id: string,
    extra: TExtra
  ): TExtra & {
    name: string | undefined;
    id: string;
    placeholder: string;
    required: boolean;
    disabled: boolean;
    readonly: boolean;
    'data-form-field': string;
    ref: (element: FormControlElement) => void;
  } {
    return {
      ...extra,
      name: field.name,
      id,
      placeholder: field.placeholder || '',
      required: !!field.required,
      disabled: !!field.disabled,
      readonly: !!field.readonly,
      'data-form-field': field.name || id,
      ref: (element) => {
        if (field.name) this.dom.fields.set(field.name, element);
      },
    };
  }

  resolveFieldId(field: FormField, index: number): string {
    if (field.id) return field.id;

    const key = field.name || index;
    if (!this.cache.fieldIds.has(key)) {
      this.cache.fieldIds.set(key, `${this.state.id}_field_${index}`);
    }
    return this.cache.fieldIds.get(key) || `${this.state.id}_field_${index}`;
  }

  syncValidator(): void {
    if (!this.root) return;
    const options = {
      ...this.state.validator,
      onSubmit: null,
    };

    if (this.validator?.dom.root === this.root) {
      this.validator.props = options;
      return;
    }

    this.validator?.destroy();
    this.validator = createValidator(
      this.root,
      options,
      false
    ) as ValidatorInstance;
  }

  validate(): boolean {
    if (!this.validator) return true;
    return this.validator.validate();
  }

  reset(): this {
    this.validator?.reset();
    flushSync(() => {
      this.state.data = null;
    });
    return this;
  }

  async handleSubmit(event: Event): Promise<void> {
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
      if (!this.runtime.destroyed) {
        flushSync(() => {
          this.state.submitting = false;
        });
      }
    }
  }

  handleReset(event: Event): void {
    this.resetValidationState();
    flushSync(() => {
      this.state.data = null;
    });
    this.state.onReset?.(event, this);
  }

  resetValidationState(): void {
    if (!this.root) return;
    for (const element of Array.from(this.root.elements)) {
      element.classList.remove('is-valid');
      element.classList.remove('is-invalid');
    }
    for (const help of all<HTMLElement>(
      '[data-form-help], [data-validator-help]',
      this.root
    )) {
      if (help.dataset.validatorHelp || help.classList.contains('is-invalid')) {
        help.remove();
      }
    }
  }

  collectData(): FormDataRecord {
    if (!this.root) return {};
    return this.collectFormData(this.root);
  }

  collectFormData(form: HTMLFormElement): FormDataRecord {
    const data: FormDataRecord = {};
    const formData = new FormData(form);

    for (const [key, value] of formData.entries()) {
      if (Object.hasOwn(data, key)) {
        data[key] = Array.isArray(data[key])
          ? [...data[key], value]
          : [data[key], value];
      } else {
        data[key] = value;
      }
    }

    return data;
  }

  requestSubmit(): this {
    if (!this.root) return this;
    if (typeof this.root.requestSubmit === 'function') {
      this.root.requestSubmit();
      return this;
    }

    const event = new Event('submit', { bubbles: true, cancelable: true });
    this.root.dispatchEvent(event);
    return this;
  }

  setFields(fields: readonly FormField[]): this {
    validateParam('fields', fields, 'array', 'Form.setFields');
    this.cache.fieldIds.clear();
    flushSync(() => {
      this.state.fields = cloneFields(fields);
    });
    return this;
  }

  resetFields(): this {
    return this.setFields(this.cache.initial.fields);
  }

  cloneProps(props: ResolvedFormProps): ResolvedFormProps {
    return {
      ...props,
      fields: cloneFields(props.fields),
      buttons: cloneButtons(props.buttons),
      className: resolveClassNames(props.className),
      validator: cloneValidator(props.validator),
    };
  }

  autoComplete(type: string): string {
    switch (type) {
      case 'password':
        return 'current-password';
      case 'email':
        return 'email';
      default:
        return 'on';
    }
  }

  isSelected(
    value: FormField['value'] | undefined,
    optionValue: FormOption['value']
  ): boolean {
    if (Array.isArray(value))
      return value
        .map((item) => stringifyFormValue(item))
        .includes(stringifyFormValue(optionValue));
    return value == optionValue;
  }

  isChecked(
    value: FormField['value'] | undefined,
    optionValue: FormOption['value'],
    checked: boolean | undefined
  ): boolean {
    if (checked !== undefined) return !!checked;
    if (Array.isArray(value))
      return value
        .map((item) => stringifyFormValue(item))
        .includes(stringifyFormValue(optionValue));
    if (
      typeof value !== 'string' &&
      typeof value !== 'boolean' &&
      !(value instanceof File)
    ) {
      return false;
    }
    return (
      value === true ||
      stringifyFormValue(value) === stringifyFormValue(optionValue)
    );
  }

  protected onDestroy(): void {
    const cleanupView = this.cleanup.view;
    if (typeof cleanupView === 'function') cleanupView();
    this.cleanup.view = null;
    this.validator?.destroy();
    this.validator = null;
  }
}

export function createForm(props: FormProps = {}): Form {
  return new Form(props);
}

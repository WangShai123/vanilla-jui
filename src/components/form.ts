import {
  For,
  createDeepStore,
  createEffect,
  flushSync,
  jsx,
} from 'vanilla-signal';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
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

interface FormCache {
  initial: ResolvedFormProps;
  fieldIds: Map<string | number, string>;
}

interface ValidatorInstance {
  readonly element: Element | null;
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

interface FormActions {
  validate(): boolean;
  reset(): Form;
  collectData(): FormDataRecord;
  requestSubmit(): Form;
  setFields(fields: readonly FormField[]): Form;
  resetFields(): Form;
}

export type Form = FunctionalComponent<
  ResolvedFormProps,
  FormState,
  HTMLFormElement,
  FormActions
>;

function cloneResolvedProps(props: ResolvedFormProps): ResolvedFormProps {
  return {
    ...props,
    fields: cloneFields(props.fields),
    buttons: cloneButtons(props.buttons),
    className: resolveClassNames(props.className),
    validator: cloneValidator(props.validator),
  };
}

function autoComplete(type: string): string {
  if (type === 'password') return 'current-password';
  if (type === 'email') return 'email';
  return 'on';
}

function isSelected(
  value: FormField['value'] | undefined,
  optionValue: FormOption['value']
): boolean {
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyFormValue(item))
      .includes(stringifyFormValue(optionValue));
  }
  return value == optionValue;
}

function isChecked(
  value: FormField['value'] | undefined,
  optionValue: FormOption['value'],
  checked: boolean | undefined
): boolean {
  if (checked !== undefined) return checked;
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyFormValue(item))
      .includes(stringifyFormValue(optionValue));
  }
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

export function createForm(input: FormProps = {}): Form {
  const props = normalizeProps(input);
  const initial = cloneResolvedProps(props);
  const state = createDeepStore({
    ...cloneResolvedProps(props),
    submitting: false,
    data: null,
  }) as FormState;
  const cache: FormCache = { initial, fieldIds: new Map() };
  const fieldKeys = new WeakMap<object, string>();
  let validator: ValidatorInstance | null = null;
  let form!: Form;

  const fieldKey = (field: FormField): string => {
    if (field.id) return `id:${field.id}`;
    if (field.name) return `name:${field.name}`;
    if (!fieldKeys.has(field)) fieldKeys.set(field, randomId());
    return fieldKeys.get(field) as string;
  };
  const resolveFieldId = (field: FormField, index: number): string => {
    if (field.id) return field.id;
    const key = field.name || index;
    if (!cache.fieldIds.has(key)) {
      cache.fieldIds.set(key, `${state.id}_field_${index}`);
    }
    return cache.fieldIds.get(key) as string;
  };
  const syncValidator = (): void => {
    const element = form.element;
    if (!element) return;
    const options = { ...state.validator, onSubmit: null };
    if (validator?.element === element) {
      validator.props = options;
      return;
    }
    validator?.destroy();
    validator = createValidator(element, options, false) as ValidatorInstance;
  };
  const validate = (): boolean => validator?.validate() ?? true;
  const resetValidationState = (): void => {
    const element = form.element;
    if (!element) return;
    for (const control of Array.from(element.elements)) {
      control.classList.remove('is-valid', 'is-invalid');
    }
    for (const help of all<HTMLElement>(
      '[data-form-help], [data-validator-help]',
      element
    )) {
      if (help.dataset.validatorHelp || help.classList.contains('is-invalid')) {
        help.remove();
      }
    }
  };
  const collectData = (): FormDataRecord => {
    const data: FormDataRecord = {};
    if (!form.element) return data;
    for (const [key, value] of new FormData(form.element).entries()) {
      if (Object.hasOwn(data, key)) {
        data[key] = Array.isArray(data[key])
          ? [...data[key], value]
          : [data[key], value];
      } else data[key] = value;
    }
    return data;
  };
  const handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();
    if (state.submitting || !validate()) return;
    const data = collectData();
    flushSync(() => {
      state.submitting = true;
      state.data = data;
    });
    try {
      await Promise.resolve(state.onSubmit?.(data, form));
    } finally {
      if (!form.runtime.destroyed) {
        flushSync(() => {
          state.submitting = false;
        });
      }
    }
  };

  const controlProps = <TExtra extends Record<string, unknown>>(
    field: FormField,
    id: string,
    extra: TExtra
  ): TExtra & Record<string, unknown> => ({
    ...extra,
    name: field.name,
    id,
    placeholder: field.placeholder || '',
    required: !!field.required,
    disabled: !!field.disabled,
    readonly: !!field.readonly,
    'data-form-field': field.name || id,
  });

  const choiceGroupView = (
    field: FormField,
    id: string,
    type: 'checkbox' | 'radio'
  ): HTMLElement => {
    const direction = field.vertical ? 'vertical' : 'horizontal';
    const names = state.className;
    return jsx('div', {
      className: joinClasses(
        type === 'radio' ? names.radio : names.checkbox,
        direction === 'vertical'
          ? names.choiceVertical
          : names.choiceHorizontal,
        field.group ? names.choiceGroup : '',
        field.size ? `is-${field.size}` : ''
      ),
      'data-form-choice-group': field.name || id,
      'data-choice-type': type,
      'data-choice-layout': direction,
      children: (field.options || []).map((option, optionIndex) => {
        const item = normalizeOption(option);
        const optionId = `${id}_${optionIndex}`;
        return jsx('label', {
          className: type === 'radio' ? names.radioLabel : '',
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
                  ? isSelected(field.value, item.value)
                  : isChecked(field.value, item.value, item.checked),
              disabled: !!item.disabled || !!field.disabled,
              required: !!field.required,
            }),
            jsx('span', {
              className: type === 'radio' ? names.radioText : '',
              'data-form-choice-text': '',
              children: item.text ?? item.label ?? item.value ?? '',
            }),
          ],
        });
      }),
    }) as HTMLElement;
  };

  const controlView = (
    field: FormField,
    id: string,
    index: number
  ): HTMLElement | Node[] | null => {
    const names = state.className;
    if (field.type === 'textarea') {
      return jsx(
        'textarea',
        controlProps(field, id, {
          className: field.className || names.textarea,
          autocomplete: field.autocomplete,
          value: field.value ?? '',
        })
      ) as HTMLTextAreaElement;
    }
    if (field.type === 'select') {
      return jsx(
        'select',
        controlProps(field, id, {
          className: field.className || names.select,
          autocomplete: field.autocomplete || 'off',
          multiple: !!field.multiple,
          children: (field.options || []).map((option) => {
            const item = normalizeOption(option);
            return jsx('option', {
              value: item.value ?? '',
              disabled: !!item.disabled,
              selected: isSelected(field.value, item.value),
              children: item.text ?? item.label ?? item.value ?? '',
            });
          }),
        })
      ) as HTMLSelectElement;
    }
    if (field.type === 'radio') return choiceGroupView(field, id, 'radio');
    if (field.type === 'checkbox' && Array.isArray(field.options)) {
      return choiceGroupView(field, id, 'checkbox');
    }
    if (field.type === 'switch') {
      return jsx('label', {
        className: joinClasses(
          names.switch,
          field.variant ? `is-${field.variant}` : names.switchDefault,
          field.size ? `is-${field.size}` : names.switchSizeMd
        ),
        'data-form-switch': field.name || id,
        for: id,
        children: [
          jsx('input', {
            type: 'checkbox',
            id,
            name: field.name,
            value: field.value ?? '1',
            checked: !!field.checked,
            disabled: !!field.disabled,
            required: !!field.required,
          }),
          jsx('span', {
            className: names.switchSlider,
            'data-form-switch-slider': '',
          }),
        ],
      }) as HTMLLabelElement;
    }
    if (field.type === 'custom') {
      return normalizeRenderableContentNodes(field.content, {
        form,
        field,
        index,
      });
    }
    const type = field.type || 'text';
    return jsx('input', {
      ...controlProps(field, id, {
        type,
        className: field.className || names.input,
        autocomplete: field.autocomplete || autoComplete(type),
        value: field.value ?? '',
      }),
      checked: field.checked === undefined ? undefined : !!field.checked,
    }) as HTMLInputElement;
  };

  const fieldView = (
    fieldAccessor: () => FormField,
    indexAccessor: () => number
  ): HTMLElement => {
    const field = fieldAccessor();
    const index = indexAccessor();
    const id = resolveFieldId(field, index);
    const names = state.className;
    return jsx('div', {
      className: names.item,
      'data-form-item': field.name || String(index),
      style: { display: field.type === 'hidden' ? 'none' : '' },
      children: [
        field.label === false || field.label === undefined
          ? null
          : jsx('label', {
              className: joinClasses(
                names.label,
                fieldIsRequired(field, state.validator.rules)
                  ? names.required
                  : ''
              ),
              'data-form-label': field.name || id,
              for: id,
              children: field.label,
            }),
        jsx('div', {
          className: names.control,
          'data-form-control': field.name || String(index),
          children: [
            controlView(field, id, index),
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
    }) as HTMLElement;
  };

  const buttonsView = (): HTMLElement =>
    jsx('div', {
      className: () => state.className.buttons,
      'data-form-buttons': '',
      hidden: () => state.buttons.length === 0,
      children: For({
        each: () => state.buttons,
        key: (button: FormButton, index: number) =>
          `${button.action || button.type || 'button'}:${index}`,
        children: (buttonAccessor: () => FormButton) =>
          jsx('button', {
            type: () => buttonAccessor().type || 'button',
            className: () => {
              const button = buttonAccessor();
              return joinClasses(
                state.className.button,
                button.theme ? `is-${button.theme}` : '',
                button.className || ''
              );
            },
            'data-action': () => {
              const button = buttonAccessor();
              return button.action || button.type || 'button';
            },
            disabled: () => state.submitting || !!buttonAccessor().disabled,
            children: () => {
              const button = buttonAccessor();
              return button.text ?? button.label ?? '';
            },
          }),
      }),
    }) as HTMLElement;

  form = defineComponent<
    ResolvedFormProps,
    FormState,
    HTMLFormElement,
    FormActions
  >({
    name: 'Form',
    props,
    state,
    actions: {
      validate,
      reset() {
        validator?.reset();
        flushSync(() => {
          state.data = null;
        });
        return form;
      },
      collectData,
      requestSubmit() {
        const element = form.element;
        if (!element) return form;
        if (typeof element.requestSubmit === 'function')
          element.requestSubmit();
        else
          element.dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true })
          );
        return form;
      },
      setFields(fields) {
        validateParam('fields', fields, 'array', 'Form.setFields');
        cache.fieldIds.clear();
        flushSync(() => {
          state.fields = cloneFields(fields);
        });
        return form;
      },
      resetFields() {
        return form.setFields(initial.fields);
      },
    },
    normalizeStatePatch(patch) {
      return {
        ...patch,
        ...(Object.hasOwn(patch, 'fields')
          ? { fields: cloneFields(patch.fields) }
          : {}),
        ...(Object.hasOwn(patch, 'buttons')
          ? { buttons: cloneButtons(patch.buttons) }
          : {}),
        ...(Object.hasOwn(patch, 'className')
          ? { className: resolveClassNames(patch.className) }
          : {}),
        ...(Object.hasOwn(patch, 'validator')
          ? { validator: cloneValidator(patch.validator) }
          : {}),
      };
    },
    view: () => {
      const element = jsx('form', {
        className: () =>
          joinClasses(
            state.className.form,
            state.vertical
              ? state.className.vertical
              : state.className.horizontal,
            state.itemVertical
              ? state.className.itemVertical
              : state.className.itemHorizontal
          ),
        id: () => state.id,
        'data-form': 'root',
        'data-form-layout': () => (state.vertical ? 'vertical' : 'horizontal'),
        'data-form-item-layout': () =>
          state.itemVertical ? 'vertical' : 'horizontal',
        onSubmit: (event: Event) => void handleSubmit(event),
        onReset: (event: Event) => {
          resetValidationState();
          flushSync(() => {
            state.data = null;
          });
          state.onReset?.(event, form);
        },
        children: [
          For({
            each: () => state.fields,
            key: (field: FormField) => fieldKey(field),
            children: fieldView,
          }),
          buttonsView(),
        ],
      }) as HTMLFormElement;
      createEffect(() => setElementStyle(element, state.style));
      createEffect(() => {
        const validatorOptions = state.validator;
        if (validatorOptions) syncValidator();
      });
      return element;
    },
    onBuild() {
      syncValidator();
    },
    onDestroy() {
      validator?.destroy();
      validator = null;
      cache.fieldIds.clear();
    },
  }) as Form;

  return form;
}

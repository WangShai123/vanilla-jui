import {
  For,
  type ElementProps,
  bindAttr,
  createDeepStore,
  createMemo,
  createSignal,
  flushSync,
  jsx,
} from 'vanilla-signal';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
import { joinClasses } from '../utilities/class-name.ts';
import { asRenderable, type RenderableContent, all } from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import { isPlainObject } from '../utilities/object.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';
import {
  createValidator,
  type ValidatorClassNameConfig,
} from '../validation/validator.ts';
import { createLoading } from '../primitives/loading.ts';
import { t } from 'vanilla-signal-i18n';
import locales from '../locales/index.ts';

type FormValue = string | number | boolean;
export type FieldOption = FormValue | FormOption;
type FormStyle = string | Partial<CSSStyleDeclaration> | null;
export type FormDataValue = FormDataEntryValue | FormDataEntryValue[];
export type FormDataRecord = Record<string, FormDataValue>;
export type FormItemType = FormControlType;
type FormControlType =
  | 'checkbox'
  | 'custom'
  | 'email'
  | 'password'
  | 'radio'
  | 'select'
  | 'switch'
  | 'text'
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
  submitBtn: string;
  resetBtn: string;
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

export type FormItemNext = (
  current: FormItem,
  acients: FormItem[]
) => FormItem | null;

export interface FormItem<TPayload = FormField> {
  id?: string;
  type: FormItemType;
  payload: TPayload;
  next?: FormItemNext | null;
}

export interface FormField {
  [key: string]: unknown;
  id?: string;
  label?: RenderableContent<Form> | false;
  name?: string;
  options?: readonly FieldOption[];
  value?:
    | FormDataEntryValue
    | FormValue
    | readonly (FormDataEntryValue | FormValue)[];
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

export interface FormValidatorConfig {
  rules?: Record<string, Record<string, unknown>>;
  messages?: Record<string, Record<string, string>>;
  vanilla?: boolean;
  className?: ValidatorClassNameConfig;
  onSubmit?: (() => void) | null;
  [key: string]: unknown;
}

export type FormButtons = boolean | string;

export interface FormText {
  submit: RenderableContent<Form>;
  reset: RenderableContent<Form>;
}

export type FormTextConfig = Partial<FormText>;

export interface FormProps extends Record<string, unknown> {
  id?: string | null;
  vertical?: boolean;
  itemVertical?: boolean;
  size?: string;
  style?: FormStyle;
  fields?: readonly FormItem<FormField>[];
  buttons?: FormButtons;
  buttonsPosition?: string;
  text?: FormTextConfig;
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
  size: string;
  style: FormStyle;
  fields: FormItem<FormField>[];
  buttons: FormButtons;
  buttonsPosition: string;
  text: FormText;
  className: FormClassNames;
  validator: FormValidatorConfig;
  onSubmit: ((data: FormDataRecord, form: Form) => void | Promise<void>) | null;
  onReset: ((event: Event, form: Form) => void) | null;
}

interface FormState extends Record<string, unknown> {
  fields: FormItem<FormField>[];
  submitting: boolean;
}

interface FormCache {
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
  item: FormItem<FormField>;
}

const DEFAULT_CLASS_NAMES: FormClassNames = {
  form: 'j-form',
  vertical: 'is-vertical',
  horizontal: 'is-horizontal',
  itemVertical: 'is-item-vertical',
  itemHorizontal: 'is-item-horizontal',
  item: 'form-field',
  label: 'field-legend',
  required: 'is-required',
  control: 'field-control',
  helpInvalid: 'is-invalid',
  buttons: 'form-buttons',
  button: 'j-button',
  submitBtn: 'is-primary',
  resetBtn: 'is-ghost',
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
  switch: 'j-switch is-default',
  switchSlider: 'switch-slider',
};

const DEFAULT_TEXT: FormText = {
  submit: t('Submit', locales),
  reset: t('Reset', locales),
};

// Guard against malformed dynamic chains that never terminate.
const FORM_ITEM_LIMIT = 1000;

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
  size: { default: 'md', type: 'string' },
  style: { default: '', types: ['string', 'object', 'null'] },
  fields: { default: [], type: 'array' },
  buttons: { default: true, types: ['boolean', 'string'] },
  buttonsPosition: { default: 'start', type: 'string' },
  text: {
    default: DEFAULT_TEXT,
    type: 'object',
    normalize: (value: unknown) => resolveText(value),
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
  options: readonly FieldOption[] | undefined
): FieldOption[] {
  if (!Array.isArray(options)) return [];
  return options.map((option) =>
    option && typeof option === 'object' ? { ...option } : option
  );
}

function cloneField(field: FormField): FormField {
  return {
    ...field,
    options: cloneOptions(field.options),
  };
}

function cloneFormItem(item: FormItem<FormField>): FormItem<FormField> {
  return {
    ...(item.id ? { id: item.id } : {}),
    type: item.type,
    payload: cloneField(item.payload),
    next: item.next || null,
  };
}

function cloneFields(
  fields: readonly FormItem<FormField>[] | undefined
): FormItem<FormField>[] {
  if (!Array.isArray(fields)) return [];
  return fields.map((item) => cloneFormItem(item));
}

function flattenFormItems(
  rootsInput: readonly FormItem<FormField>[],
  resolveItem: (item: FormItem<FormField>) => FormItem<FormField>
): FormItem<FormField>[] {
  const result: FormItem<FormField>[] = [];
  const roots = Array.isArray(rootsInput) ? rootsInput : [];
  const seen = new WeakSet<FormItem<FormField>>();
  const defaultNext = (
    current: FormItem<FormField>
  ): FormItem<FormField> | null => {
    const index = roots.indexOf(current);
    return index >= 0 ? roots[index + 1] || null : null;
  };

  for (const root of roots) {
    if (seen.has(root)) continue;
    let current: FormItem<FormField> | null = root;
    const acients: FormItem<FormField>[] = [];
    let guard = 0;

    while (current && guard < FORM_ITEM_LIMIT) {
      guard += 1;
      if (seen.has(current)) break;
      seen.add(current);
      result.push(current);
      acients.push(current);
      const next = current.next
        ? current.next(current, acients)
        : defaultNext(current);
      current = next ? resolveItem(next) : null;
    }
  }

  return result;
}

function normalizeOption(option: FieldOption): FormOption {
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
  if (value instanceof File) return value.name;
  return '';
}

function stringifyControlValue(value: FormField['value'] | undefined): string {
  if (value == null || Array.isArray(value)) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  if (value instanceof File) return value.name;
  return '';
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

function resolveText(value: unknown): FormText {
  return {
    ...DEFAULT_TEXT,
    ...(isPlainObject(value) ? (value as FormTextConfig) : {}),
  } as FormText;
}

function renderFormText(
  content: RenderableContent<Form>,
  form: Form
): RenderableContent<Form> {
  return typeof content === 'function' ? content(form) : content;
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

function resolveButtonsJustifyContent(position: string): string {
  return position === 'center' ? position : `flex-${position}`;
}

function cloneValidator(validator: unknown): FormValidatorConfig {
  const source = (
    isPlainObject(validator) ? validator : {}
  ) as Partial<FormValidatorConfig> & Record<string, unknown>;
  return {
    ...source,
    vanilla: source.vanilla === true,
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
  const fields = cloneFields(props.fields as readonly FormItem<FormField>[]);
  return {
    ...props,
    id: String(props.id),
    vertical: Boolean(props.vertical),
    itemVertical: Boolean(props.itemVertical),
    size: props.size as string,
    style: props.style as FormStyle,
    fields,
    buttons: props.buttons as FormButtons,
    buttonsPosition: props.buttonsPosition as string,
    text: resolveText(props.text),
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
  setFields(fields: readonly FormItem<FormField>[]): Form;
  resetFields(): Form;
}

export type Form = FunctionalComponent<
  ResolvedFormProps,
  FormState,
  HTMLFormElement,
  FormActions
>;

function autoComplete(type: string): string {
  if (type === 'password') return 'current-password';
  if (type === 'email') return 'email';
  return 'on';
}

function nonEmptyAttribute(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const attribute = value.trim();
  return attribute.length > 0 ? attribute : null;
}

function bindNonEmptyAttribute(
  element: Element,
  name: string,
  value: () => unknown
): void {
  bindAttr(element, name, () => nonEmptyAttribute(value()));
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

function radioNodeListItems(value: RadioNodeList | Element): Element[] {
  if (value instanceof RadioNodeList) return Array.from(value);
  return [value];
}

export function createForm(input: FormProps = {}): Form {
  const props = normalizeProps(input);
  const state = createDeepStore({
    fields: cloneFields(props.fields),
    submitting: false,
  }) as FormState;
  const cache: FormCache = { fieldIds: new Map() };
  const fieldKeys = new WeakMap<object, string>();
  const [chainVersion, setChainVersion] = createSignal(0);
  let runtimeItems = new WeakMap<FormItem<FormField>, FormItem<FormField>>();
  let validator: ValidatorInstance | null = null;
  let form!: Form;
  const resolveRuntimeItem = (
    item: FormItem<FormField>
  ): FormItem<FormField> => {
    if (state.fields.includes(item)) return item;
    const cached = runtimeItems.get(item);
    if (cached) return cached;
    const runtimeItem = createDeepStore(
      cloneFormItem(item)
    ) as FormItem<FormField>;
    runtimeItems.set(item, runtimeItem);
    return runtimeItem;
  };
  const renderedItems = createMemo(() => {
    chainVersion();
    return flattenFormItems(state.fields, resolveRuntimeItem);
  });

  const fieldKey = (field: FormField): string => {
    if (field.id) return `id:${field.id}`;
    if (field.name) return `name:${field.name}`;
    if (!fieldKeys.has(field)) fieldKeys.set(field, randomId());
    return fieldKeys.get(field) as string;
  };
  const itemKey = (item: FormItem, index: number): string => {
    if (item.id) return `item:${item.id}`;
    const field = item.payload as FormField;
    if (field && typeof field === 'object')
      return `${fieldKey(field)}:${item.type}`;
    return `item:${item.type}:${index}`;
  };
  const resolveFieldId = (field: FormField, index: number): string => {
    if (field.id) return field.id;
    const key = field.name || index;
    if (!cache.fieldIds.has(key)) {
      cache.fieldIds.set(key, `${props.id}_field_${index}`);
    }
    return cache.fieldIds.get(key) as string;
  };
  const syncValidator = (): void => {
    const element = form.element;
    if (!element) return;
    const options = { ...props.validator, onSubmit: null };
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
      control.removeAttribute('data-valid');
    }
    for (const help of all<HTMLElement>(
      '[data-field-help], [data-validator-help]',
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
    });
    try {
      await Promise.resolve(props.onSubmit?.(data, form));
    } finally {
      if (!form.runtime.destroyed) {
        flushSync(() => {
          state.submitting = false;
        });
      }
    }
  };

  const fieldControls = (field: FormField): Element[] => {
    if (!field.name || !form.element) return [];
    const element = form.element.elements.namedItem(field.name);
    if (!element) return [];
    return radioNodeListItems(element).filter(
      (item) => item instanceof Element
    );
  };
  const syncFieldValue = (
    field: FormField,
    control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    type: FormControlType | 'checkbox' | 'radio' = 'text'
  ): void => {
    flushSync(() => {
      if (control instanceof HTMLSelectElement) {
        field.value = control.multiple
          ? Array.from(control.selectedOptions).map((option) => option.value)
          : control.value;
        return;
      }
      if (control instanceof HTMLTextAreaElement) {
        field.value = control.value;
        return;
      }
      if (type === 'switch') {
        field.checked = control.checked;
        field.value = control.checked ? control.value : '';
        return;
      }
      if (type === 'radio') {
        if (control.checked) field.value = control.value;
        return;
      }
      if (type === 'checkbox') {
        if (Array.isArray(field.options)) {
          field.value = fieldControls(field)
            .filter(
              (item): item is HTMLInputElement =>
                item instanceof HTMLInputElement && item.checked
            )
            .map((item) => item.value);
          return;
        }
        field.checked = control.checked;
        field.value = control.checked ? control.value : '';
        return;
      }
      field.value = control.value;
      if (control.type === 'checkbox') field.checked = control.checked;
    });
    setChainVersion((version: number) => version + 1);
  };

  const controlProps = <TElement extends Element>(
    fieldAccessor: () => FormField,
    id: string,
    extra: ElementProps<TElement>
  ): ElementProps<TElement> => ({
    ...extra,
    name: () => fieldAccessor().name,
    id,
    required: () => !!fieldAccessor().required,
    disabled: () => state.submitting || !!fieldAccessor().disabled,
    'data-field-item': () => fieldAccessor().name || id,
  });

  const formSizeClass = (): string => (props.size ? `is-${props.size}` : '');

  const controlSizeClass = (field: FormField): string => {
    const size = field.size || props.size;
    return size ? `is-${size}` : '';
  };

  const controlClassName = (field: FormField, base: string): string =>
    joinClasses(field.className || base, controlSizeClass(field));

  const choiceGroupView = (
    fieldAccessor: () => FormField,
    id: string,
    type: 'checkbox' | 'radio'
  ): HTMLElement => {
    return jsx('div', {
      className: () => {
        const field = fieldAccessor();
        const direction = field.vertical ? 'vertical' : 'horizontal';
        const names = props.className;
        return joinClasses(
          type === 'radio' ? names.radio : names.checkbox,
          direction === 'vertical'
            ? names.choiceVertical
            : names.choiceHorizontal,
          field.group ? names.choiceGroup : '',
          field.size ? `is-${field.size}` : ''
        );
      },
      'data-field-choice-group': () => fieldAccessor().name || id,
      'data-choice-type': type,
      'data-choice-layout': () =>
        fieldAccessor().vertical ? 'vertical' : 'horizontal',
      children: () =>
        (fieldAccessor().options || []).map((option, optionIndex) => {
          const item = normalizeOption(option);
          const optionId = `${id}_${optionIndex}`;
          return jsx('label', {
            className: () =>
              type === 'radio' ? props.className.radioLabel : '',
            'data-field-choice': () => fieldAccessor().name || id,
            for: optionId,
            children: [
              jsx('input', {
                type,
                id: optionId,
                name: () => fieldAccessor().name,
                value: item.value ?? '',
                checked: () =>
                  type === 'radio'
                    ? isSelected(fieldAccessor().value, item.value)
                    : isChecked(
                        fieldAccessor().value,
                        item.value,
                        item.checked
                      ),
                disabled: () =>
                  state.submitting ||
                  !!item.disabled ||
                  !!fieldAccessor().disabled,
                required: () => !!fieldAccessor().required,
                onChange: (event: Event) => {
                  const target = event.currentTarget;
                  if (target instanceof HTMLInputElement) {
                    syncFieldValue(fieldAccessor(), target, type);
                  }
                },
              }),
              jsx('span', {
                className: () =>
                  type === 'radio' ? props.className.radioText : '',
                'data-field-choice-text': '',
                children: asRenderable(
                  item.text ?? item.label ?? stringifyFormValue(item.value)
                ),
              }),
            ],
          });
        }),
    }) as HTMLElement;
  };

  const controlView = (
    itemAccessor: () => FormItem<FormField>,
    fieldAccessor: () => FormField,
    id: string,
    indexAccessor: () => number
  ): RenderableContent<FormControlContext> => {
    const type = itemAccessor().type;
    if (type === 'textarea') {
      return jsx(
        'textarea',
        controlProps<HTMLTextAreaElement>(fieldAccessor, id, {
          className: () =>
            fieldAccessor().className || props.className.textarea,
          placeholder: () => fieldAccessor().placeholder || '',
          readonly: () => !!fieldAccessor().readonly,
          ref: (element: HTMLTextAreaElement) =>
            bindNonEmptyAttribute(
              element,
              'autocomplete',
              () => fieldAccessor().autocomplete
            ),
          value: () => stringifyControlValue(fieldAccessor().value),
          onInput: (event: Event) => {
            const target = event.currentTarget;
            if (target instanceof HTMLTextAreaElement) {
              syncFieldValue(fieldAccessor(), target, 'textarea');
            }
          },
        })
      ) as HTMLTextAreaElement;
    }
    if (type === 'select') {
      return jsx(
        'select',
        controlProps<HTMLSelectElement>(fieldAccessor, id, {
          className: () =>
            controlClassName(fieldAccessor(), props.className.select),
          ref: (element: HTMLSelectElement) =>
            bindNonEmptyAttribute(
              element,
              'autocomplete',
              () => fieldAccessor().autocomplete
            ),
          multiple: () => !!fieldAccessor().multiple,
          value: () =>
            fieldAccessor().multiple
              ? undefined
              : stringifyControlValue(fieldAccessor().value),
          onChange: (event: Event) => {
            const target = event.currentTarget;
            if (target instanceof HTMLSelectElement) {
              syncFieldValue(fieldAccessor(), target, 'select');
            }
          },
          children: () =>
            (fieldAccessor().options || []).map((option) => {
              const item = normalizeOption(option);
              return jsx('option', {
                value: item.value ?? '',
                disabled: !!item.disabled,
                selected: () => isSelected(fieldAccessor().value, item.value),
                children: asRenderable(
                  item.text ?? item.label ?? stringifyFormValue(item.value)
                ),
              });
            }),
        })
      ) as HTMLSelectElement;
    }
    if (type === 'radio') return choiceGroupView(fieldAccessor, id, 'radio');
    if (type === 'checkbox' && Array.isArray(fieldAccessor().options)) {
      return choiceGroupView(fieldAccessor, id, 'checkbox');
    }
    if (type === 'switch') {
      return jsx('label', {
        className: () => {
          const names = props.className;
          return joinClasses(names.switch, controlSizeClass(fieldAccessor()));
        },
        'data-field-switch': () => fieldAccessor().name || id,
        for: id,
        children: [
          jsx('input', {
            type: 'checkbox',
            id,
            name: () => fieldAccessor().name,
            value: () => fieldAccessor().value ?? '1',
            checked: () => !!fieldAccessor().checked,
            disabled: () => state.submitting || !!fieldAccessor().disabled,
            required: () => !!fieldAccessor().required,
            onChange: (event: Event) => {
              const target = event.currentTarget;
              if (target instanceof HTMLInputElement) {
                syncFieldValue(fieldAccessor(), target, 'switch');
              }
            },
          }),
          jsx('span', {
            className: () => props.className.switchSlider,
            'data-field-switch-slider': '',
          }),
        ],
      }) as HTMLLabelElement;
    }
    if (type === 'custom') {
      const field = fieldAccessor();
      return typeof field.content === 'function'
        ? field.content({
            form,
            field,
            index: indexAccessor(),
            item: itemAccessor(),
          })
        : field.content;
    }
    const inputType = type || 'text';
    return jsx('input', {
      ...controlProps<HTMLInputElement>(fieldAccessor, id, {
        type: inputType,
        className: () =>
          controlClassName(fieldAccessor(), props.className.input),
        placeholder: () => fieldAccessor().placeholder || '',
        readonly: () => !!fieldAccessor().readonly,
        autocomplete: () =>
          fieldAccessor().autocomplete || autoComplete(inputType),
        value: () => fieldAccessor().value ?? '',
        onInput: (event: Event) => {
          const target = event.currentTarget;
          if (target instanceof HTMLInputElement) {
            syncFieldValue(fieldAccessor(), target, inputType);
          }
        },
      }),
      checked: () => {
        const checked = fieldAccessor().checked;
        return checked === undefined ? undefined : !!checked;
      },
    }) as HTMLInputElement;
  };

  const fieldView = (
    itemAccessor: () => FormItem<FormField>,
    indexAccessor: () => number
  ): HTMLElement => {
    const fieldAccessor = (): FormField => itemAccessor().payload;
    const id = resolveFieldId(fieldAccessor(), indexAccessor());
    const isGroupedControl = (): boolean => {
      const type = itemAccessor().type;
      return (
        type === 'custom' ||
        type === 'radio' ||
        (type === 'checkbox' && Array.isArray(fieldAccessor().options))
      );
    };
    const hasFieldLabel = (): boolean => {
      const label = fieldAccessor().label;
      return label !== false && label !== undefined;
    };
    const fieldTitle = (): HTMLElement | null => {
      if (!hasFieldLabel()) return null;
      const labelProps = {
        className: () =>
          joinClasses(
            props.className.label,
            fieldIsRequired(fieldAccessor(), props.validator.rules)
              ? props.className.required
              : ''
          ),
        'data-field-label': () => fieldAccessor().name || id,
        children: () => asRenderable(fieldAccessor().label),
      };
      if (isGroupedControl()) return jsx('legend', labelProps) as HTMLElement;
      return jsx('label', { ...labelProps, for: id }) as HTMLElement;
    };
    const controlContainer = (): HTMLElement =>
      jsx('div', {
        className: () => props.className.control,
        'data-field-control': () =>
          fieldAccessor().name || String(indexAccessor()),
        children: [
          asRenderable(
            controlView(itemAccessor, fieldAccessor, id, indexAccessor)
          ),
          () => {
            const current = fieldAccessor();
            return current.help
              ? jsx('div', {
                  className: 'help-block',
                  'data-field-help': () =>
                    fieldAccessor().name || String(indexAccessor()),
                  children: () => asRenderable(fieldAccessor().help),
                })
              : null;
          },
        ],
      }) as HTMLElement;
    const rootProps = {
      className: () => props.className.item,
      'data-form-field': () => fieldAccessor().name || String(indexAccessor()),
      style: () => ({
        display: itemAccessor().type === 'hidden' ? 'none' : '',
      }),
    };
    return jsx('fieldset', {
      ...rootProps,
      children: [fieldTitle, controlContainer],
    }) as HTMLFieldSetElement;
  };

  const itemView = (
    itemAccessor: () => FormItem<FormField>,
    indexAccessor: () => number
  ): HTMLElement => fieldView(itemAccessor, indexAccessor);

  const submitButtonView = (): HTMLButtonElement =>
    jsx('button', {
      type: 'submit',
      className: () =>
        joinClasses(
          props.className.button,
          props.className.submitBtn,
          formSizeClass()
        ),
      'data-action': 'submit',
      disabled: () => state.submitting,
      children: () => {
        const content = asRenderable(renderFormText(props.text.submit, form));
        return state.submitting ? [createLoading(), content] : content;
      },
    }) as HTMLButtonElement;

  const resetButtonView = (): HTMLButtonElement =>
    jsx('button', {
      type: 'reset',
      className: () =>
        joinClasses(
          props.className.button,
          props.className.resetBtn,
          formSizeClass()
        ),
      'data-action': 'reset',
      disabled: () => state.submitting,
      children: () => asRenderable(renderFormText(props.text.reset, form)),
    }) as HTMLButtonElement;

  const buttonsView = (): HTMLElement =>
    jsx('div', {
      className: props.className.buttons,
      style: {
        justifyContent: resolveButtonsJustifyContent(props.buttonsPosition),
      },
      'data-field-buttons': '',
      children:
        props.buttons === 'reverse'
          ? [resetButtonView(), submitButtonView()]
          : [submitButtonView(), resetButtonView()],
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
        runtimeItems = new WeakMap();
        flushSync(() => {
          state.fields = cloneFields(fields);
        });
        return form;
      },
      resetFields() {
        cache.fieldIds.clear();
        runtimeItems = new WeakMap();
        flushSync(() => {
          state.fields = cloneFields(props.fields);
        });
        return form;
      },
    },
    normalizeStatePatch(patch) {
      return {
        ...patch,
        ...(Object.hasOwn(patch, 'fields')
          ? { fields: cloneFields(patch.fields) }
          : {}),
      };
    },
    view: () => {
      const element = jsx('form', {
        className: joinClasses(
          props.className.form,
          props.vertical
            ? props.className.vertical
            : props.className.horizontal,
          props.itemVertical
            ? props.className.itemVertical
            : props.className.itemHorizontal,
          formSizeClass()
        ),
        id: props.id,
        novalidate: props.validator.vanilla === false,
        'data-form': 'root',
        'data-form-layout': props.vertical ? 'vertical' : 'horizontal',
        'data-form-field-layout': props.itemVertical
          ? 'vertical'
          : 'horizontal',
        onSubmit: (event: Event) => void handleSubmit(event),
        onReset: (event: Event) => {
          resetValidationState();
          props.onReset?.(event, form);
        },
        children: [
          For({
            each: renderedItems,
            key: itemKey,
            children: itemView,
          }),
          props.buttons !== false ? buttonsView() : null,
        ],
      }) as HTMLFormElement;
      setElementStyle(element, props.style);
      return element;
    },
    onBuild() {
      syncValidator();
    },
    onDestroy() {
      validator?.destroy();
      validator = null;
      cache.fieldIds.clear();
      runtimeItems = new WeakMap();
    },
  }) as Form;

  return form;
}

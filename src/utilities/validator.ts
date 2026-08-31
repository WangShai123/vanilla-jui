import { jsx } from 'vanilla-signal';

import {
  type DOMReference,
  all,
  joinClasses,
  resolveElement,
} from '../utilities/dom.ts';
import { createEventManager } from '../utilities/events.ts';
import { isPlainObject } from '../utilities/object.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';

type ValidatorElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;
type ValidatorMessageMap = Record<string, Partial<Record<string, string>>>;
type ValidatorCustomResult = boolean | string;
type ValidatorCustomRule = (
  element: ValidatorElement,
  validator: ValidatorInstance
) => ValidatorCustomResult;

interface ValidatorRule extends Record<string, unknown> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  equalTo?: string;
  email?: boolean;
  checked?: boolean;
  selected?: boolean;
  multiple?: boolean;
  min?: number;
  max?: number;
  noSpace?: boolean;
  noChinese?: boolean;
  noSpecial?: boolean;
  pattern?: string | RegExp;
  file?: boolean;
  minSize?: number;
  maxSize?: number;
  accept?: string;
  validate?: ValidatorCustomRule;
}

interface ValidatorProps extends Record<string, unknown> {
  rules?: Record<string, ValidatorRule>;
  messages?: ValidatorMessageMap;
  vanilla?: boolean;
  className?: ValidatorClassNameConfig;
  onSubmit?: ((validator: ValidatorInstance) => void) | null;
}

export interface ValidatorClassNames {
  help: string;
}

export type ValidatorClassNameConfig = Partial<ValidatorClassNames>;

interface ResolvedValidatorProps extends Record<string, unknown> {
  rules: Record<string, ValidatorRule>;
  messages: ValidatorMessageMap;
  vanilla: boolean;
  className: ValidatorClassNames;
  onSubmit: ((validator: ValidatorInstance) => void) | null;
}

interface ValidatorRuntime {
  valid: boolean;
  error: boolean;
  message: string;
  destroyed: boolean;
}

interface ResetOptions {
  native?: boolean;
}

export interface ValidatorInstance {
  readonly element: HTMLFormElement | null;
  props: ResolvedValidatorProps | null;
  runtime: ValidatorRuntime;
  validate(): boolean;
  reset(options?: ResetOptions): void;
  destroy(): void;
}

const DEFAULT_CLASS_NAMES: ValidatorClassNames = {
  help: 'help-block',
};

const VALIDATOR_PROPS_SCHEMA = {
  rules: { default: {}, type: 'object' },
  messages: { default: {}, type: 'object' },
  vanilla: { default: false, type: 'boolean' },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => resolveClassNames(value),
  },
  onSubmit: { default: null, types: ['function', 'null'] },
} satisfies ResolveSchema<ValidatorProps>;

function resolveClassNames(value: unknown): ValidatorClassNames {
  return {
    ...DEFAULT_CLASS_NAMES,
    ...(isPlainObject(value) ? (value as ValidatorClassNameConfig) : {}),
  } as ValidatorClassNames;
}

function normalizeProps(input: ValidatorProps): ResolvedValidatorProps {
  const props = resolveProps(input, VALIDATOR_PROPS_SCHEMA, 'Validator.props');
  return {
    rules: props.rules as Record<string, ValidatorRule>,
    messages: props.messages as ValidatorMessageMap,
    vanilla: props.vanilla as boolean,
    className: props.className as ValidatorClassNames,
    onSubmit: props.onSubmit as ResolvedValidatorProps['onSubmit'],
  };
}

function isValidatorElement(element: Element): element is ValidatorElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

function toValidatorElement(
  value: Element | RadioNodeList | null
): ValidatorElement | null {
  if (!value) return null;
  if (value instanceof Element) {
    return isValidatorElement(value) ? value : null;
  }
  for (const item of Array.from(value)) {
    if (item instanceof Element && isValidatorElement(item)) return item;
  }
  return null;
}

function createRuntime(): ValidatorRuntime {
  return {
    valid: true,
    error: false,
    message: '',
    destroyed: false,
  };
}

function getControlContainer(element: ValidatorElement): HTMLElement | null {
  return (
    element.closest<HTMLElement>('[data-field-control]') ||
    element.parentElement
  );
}

function selectedValues(element: HTMLSelectElement): string[] {
  return Array.from(element.selectedOptions).map((option) =>
    option.value.trim()
  );
}

function isFileInput(element: ValidatorElement): element is HTMLInputElement {
  return element instanceof HTMLInputElement && element.type === 'file';
}

function hasFiles(element: HTMLInputElement): element is HTMLInputElement & {
  files: FileList;
} {
  return !!element.files && element.files.length > 0;
}

function validateRequired(
  element: ValidatorElement,
  required: unknown
): boolean {
  if (required !== true) return true;
  if (element instanceof HTMLSelectElement) {
    return selectedValues(element).some((value) => value.length > 0);
  }
  return element.value.trim().length >= 1;
}

function validateMinLength(
  element: ValidatorElement,
  minLength: unknown
): boolean {
  if (typeof minLength !== 'number') return true;
  return element.value.length >= minLength;
}

function validateMaxLength(
  element: ValidatorElement,
  maxLength: unknown
): boolean {
  if (typeof maxLength !== 'number') return true;
  return element.value.length <= maxLength;
}

function validateEmail(element: ValidatorElement): boolean {
  const emailPattern = /^([\w-.]+@([\w-]+\.)+[\w-]{2,4})?$/;
  return emailPattern.test(element.value);
}

function validateEqualTo(
  root: HTMLFormElement | null,
  element: ValidatorElement,
  targetName: unknown
): boolean {
  if (!root || typeof targetName !== 'string') return true;
  const targetElement = toValidatorElement(root.elements.namedItem(targetName));
  if (!targetElement) {
    throw new Error(`Validator: target element "${targetName}" not found.`);
  }
  return element.value === targetElement.value;
}

function validateCheck(element: ValidatorElement, checked: unknown): boolean {
  if (!(element instanceof HTMLInputElement) || element.type !== 'checkbox') {
    throw new Error(
      `Validator: element expects a checkbox input, but ${element.tagName.toLowerCase()} given.`
    );
  }
  return element.checked === checked;
}

function validateSelected(
  element: ValidatorElement,
  selected: unknown
): boolean {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(
      `Validator: element expects a select element, but ${element.tagName.toLowerCase()} given.`
    );
  }
  if (selected !== true) return true;
  return selectedValues(element).some((value) => value.length > 0);
}

function validateMultiple(
  element: ValidatorElement,
  multiple: unknown
): boolean {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(
      `Validator: element expects a select element, but ${element.tagName.toLowerCase()} given.`
    );
  }
  if (multiple !== true) return true;
  return element.selectedOptions.length > 0;
}

function checkboxGroup(
  root: HTMLFormElement | null,
  element: ValidatorElement
): HTMLInputElement[] {
  if (
    !root ||
    !(element instanceof HTMLInputElement) ||
    element.type !== 'checkbox'
  ) {
    return [];
  }
  const controls = Array.from(root.elements).filter(
    (control): control is HTMLInputElement =>
      control instanceof HTMLInputElement &&
      control.type === 'checkbox' &&
      control.name === element.name &&
      !control.closest('[data-field-switch]')
  );
  const isGrouped =
    controls.length > 1 ||
    !!element.closest(
      '[data-choice-type="checkbox"], [data-field-choice-group]'
    );
  return isGrouped ? controls : [];
}

function checkedCount(
  root: HTMLFormElement | null,
  element: ValidatorElement
): number | null {
  const controls = checkboxGroup(root, element);
  if (controls.length === 0) return null;
  return controls.filter((control) => control.checked).length;
}

function validateChoiceMin(
  root: HTMLFormElement | null,
  element: ValidatorElement,
  min: unknown
): boolean {
  if (typeof min !== 'number') return true;
  if (element instanceof HTMLSelectElement) {
    return element.selectedOptions.length >= min;
  }
  const count = checkedCount(root, element);
  return count === null ? true : count >= min;
}

function validateChoiceMax(
  root: HTMLFormElement | null,
  element: ValidatorElement,
  max: unknown
): boolean {
  if (typeof max !== 'number') return true;
  if (element instanceof HTMLSelectElement) {
    return element.selectedOptions.length <= max;
  }
  const count = checkedCount(root, element);
  return count === null ? true : count <= max;
}

function validateNoSpace(element: ValidatorElement, noSpace: unknown): boolean {
  return !/\s/.test(element.value) || noSpace !== true;
}

function validatePattern(element: ValidatorElement, pattern: unknown): boolean {
  if (!(typeof pattern === 'string' || pattern instanceof RegExp)) return true;
  return new RegExp(pattern).test(element.value);
}

function validateFile(element: ValidatorElement, required: unknown): boolean {
  if (!isFileInput(element)) return true;
  return required === true ? hasFiles(element) : true;
}

function validateMinSize(element: ValidatorElement, minSize: unknown): boolean {
  if (
    !isFileInput(element) ||
    !hasFiles(element) ||
    typeof minSize !== 'number'
  ) {
    return true;
  }
  return element.files[0].size >= minSize;
}

function validateMaxSize(element: ValidatorElement, maxSize: unknown): boolean {
  if (
    !isFileInput(element) ||
    !hasFiles(element) ||
    typeof maxSize !== 'number'
  ) {
    return true;
  }
  return element.files[0].size <= maxSize;
}

function validateAccept(element: ValidatorElement, accept: unknown): boolean {
  if (
    !isFileInput(element) ||
    !hasFiles(element) ||
    typeof accept !== 'string'
  ) {
    return true;
  }

  const file = element.files[0];
  const allowed = accept.split(',').map((item) => item.trim().toLowerCase());

  return allowed.some((rule) => {
    if (rule.startsWith('.')) {
      return file.name.toLowerCase().endsWith(rule);
    }
    if (rule.endsWith('/*')) {
      return file.type.startsWith(rule.replace('/*', '/'));
    }
    return file.type === rule;
  });
}

function showError(
  props: ResolvedValidatorProps | null,
  runtime: ValidatorRuntime,
  element: ValidatorElement,
  name: string,
  rule: string,
  customMessage = ''
): void {
  element.dataset.valid = 'false';

  const error = customMessage || props?.messages[name]?.[rule] || '';
  if (!error) return;

  runtime.message = error;

  const formControl = getControlContainer(element);
  if (!formControl) return;

  let help =
    all<HTMLElement>('[data-validator-help]', formControl).find(
      (element) => element.dataset.validatorHelp === name
    ) || null;
  if (!help) {
    help = jsx('div', {
      'data-valid': 'false',
      'data-validator-help': name,
    }) as HTMLElement;
    formControl.appendChild(help);
  }
  help.className = joinClasses(props?.className.help);
  help.dataset.valid = 'false';
  help.textContent = error;
}

function showSuccess(element: ValidatorElement): void {
  const formControl = getControlContainer(element);
  if (formControl) {
    for (const help of all<HTMLElement>('[data-validator-help]', formControl)) {
      if (help.dataset.validatorHelp === element.name) help.remove();
    }
  }

  element.removeAttribute('data-valid');
}

export function createValidator(
  element: DOMReference,
  props: ValidatorProps = {},
  bindEvents = false
): ValidatorInstance {
  validateParam('bindEvents', bindEvents, 'boolean', 'Validator');
  const resolved = resolveElement(element);
  if (!(resolved instanceof HTMLFormElement)) {
    throw new Error('Validator.element expects a form element.');
  }

  let root: HTMLFormElement | null = resolved;
  let options: ResolvedValidatorProps | null = normalizeProps(props);
  const initialNoValidate = root.noValidate;
  const runtime = createRuntime();
  const events = createEventManager();
  const errorNames = new Set<string>();
  let validator: ValidatorInstance;

  const syncNativeValidation = (): void => {
    if (!root) return;
    root.noValidate = options?.vanilla === false ? true : false;
  };

  const validateCustom = (
    control: ValidatorElement,
    rule: unknown
  ): ValidatorCustomResult => {
    if (typeof rule !== 'function') return true;
    const result = (rule as ValidatorCustomRule)(control, validator);
    return typeof result === 'string' ? result : !!result;
  };
  const validateRule = (control: ValidatorElement, name: string): boolean => {
    const rules = options?.rules[name];
    if (!rules) return true;

    for (const rule of Object.keys(rules)) {
      const value = rules[rule];
      let customMessage = '';
      switch (rule) {
        case 'required':
          runtime.valid = validateRequired(control, value);
          break;
        case 'minLength':
          runtime.valid = validateMinLength(control, value);
          break;
        case 'maxLength':
          runtime.valid = validateMaxLength(control, value);
          break;
        case 'equalTo':
          runtime.valid = validateEqualTo(root, control, value);
          break;
        case 'email':
          runtime.valid = validateEmail(control);
          break;
        case 'checked':
          runtime.valid = validateCheck(control, value);
          break;
        case 'selected':
          runtime.valid = validateSelected(control, value);
          break;
        case 'multiple':
          runtime.valid = validateMultiple(control, value);
          break;
        case 'min':
          runtime.valid = validateChoiceMin(root, control, value);
          break;
        case 'max':
          runtime.valid = validateChoiceMax(root, control, value);
          break;
        case 'noSpace':
          runtime.valid = validateNoSpace(control, value);
          break;
        case 'noChinese':
          runtime.valid = !/[\u4e00-\u9fa5]/.test(control.value);
          break;
        case 'noSpecial':
          runtime.valid = !/[@#$%^&*]+/g.test(control.value);
          break;
        case 'pattern':
          runtime.valid = validatePattern(control, value);
          break;
        case 'file':
          runtime.valid = validateFile(control, value);
          break;
        case 'minSize':
          runtime.valid = validateMinSize(control, value);
          break;
        case 'maxSize':
          runtime.valid = validateMaxSize(control, value);
          break;
        case 'accept':
          runtime.valid = validateAccept(control, value);
          break;
        case 'validate': {
          const result = validateCustom(control, value);
          runtime.valid = result === true;
          customMessage = typeof result === 'string' ? result : '';
          break;
        }
      }
      if (!runtime.valid) {
        runtime.error = true;
        errorNames.add(name);
        showError(options, runtime, control, name, rule, customMessage);
        break;
      }
      showSuccess(control);
    }
    if (runtime.valid) errorNames.delete(name);
    return runtime.valid;
  };
  const validateControl = (control: ValidatorElement): boolean => {
    if (!options || runtime.destroyed || !control.name) return true;
    if (!options.rules[control.name]) return true;
    const valid = validateRule(control, control.name);
    if (valid && errorNames.size === 0) {
      runtime.valid = true;
      runtime.error = false;
      runtime.message = '';
    }
    return valid;
  };
  const validate = (): boolean => {
    if (!root || !options || runtime.destroyed) return false;
    runtime.valid = true;
    runtime.error = false;
    runtime.message = '';
    errorNames.clear();
    for (const control of Array.from(root.elements)) {
      if (!isValidatorElement(control) || !control.name) continue;
      if (!options.rules[control.name]) continue;
      runtime.valid = validateRule(control, control.name);
      if (!runtime.valid) break;
    }
    if (runtime.valid) options.onSubmit?.(validator);
    return runtime.valid;
  };
  const handleFieldInput = (event: Event): void => {
    if (!runtime.error) return;
    const target = event.target;
    if (!(target instanceof Element) || !isValidatorElement(target)) return;
    if (!target.name || !errorNames.has(target.name)) return;
    validateControl(target);
  };
  const reset = ({ native = true }: ResetOptions = {}): void => {
    if (!root) return;
    if (native) root.reset();
    for (const control of Array.from(root.elements)) {
      if (isValidatorElement(control)) {
        control.removeAttribute('data-valid');
      }
    }
    for (const help of all<HTMLElement>('[data-validator-help]', root)) {
      help.remove();
    }
    runtime.valid = true;
    runtime.error = false;
    runtime.message = '';
    errorNames.clear();
  };
  const destroy = (): void => {
    if (runtime.destroyed) return;
    runtime.destroyed = true;
    events.clear();
    reset({ native: false });
    if (root) root.noValidate = initialNoValidate;
    root = null;
    options = null;
    runtime.valid = false;
    runtime.error = false;
    runtime.message = '';
    errorNames.clear();
  };

  validator = {
    get element() {
      return root;
    },
    get props() {
      return options;
    },
    set props(value) {
      options = value;
      syncNativeValidation();
    },
    runtime,
    validate,
    reset,
    destroy,
  };

  if (bindEvents) {
    events.on('submit', root, 'submit', (event) => {
      event.preventDefault();
      validate();
    });
    events.on('reset', root, 'reset', () => reset({ native: false }));
  }
  events.on('input', root, 'input', handleFieldInput);
  events.on('change', root, 'change', handleFieldInput);
  syncNativeValidation();
  return validator;
}

import { jsx } from 'vanilla-signal';

import { type DOMReference, all, resolveElement } from '../utilities/dom.ts';
import { type IEventManager, createEventManager } from '../utilities/events.ts';
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
  onSubmit?: ((validator: ValidatorInstance) => void) | null;
}

interface ResolvedValidatorProps extends Record<string, unknown> {
  rules: Record<string, ValidatorRule>;
  messages: ValidatorMessageMap;
  onSubmit: ((validator: ValidatorInstance) => void) | null;
}

interface ValidatorDOM {
  root: HTMLFormElement | null;
}

interface ValidatorRuntime {
  valid: boolean;
  message: string;
  destroyed: boolean;
}

interface ValidatorCleanup {
  events: IEventManager;
}

interface ResetOptions {
  native?: boolean;
}

interface ValidatorInstance {
  dom: ValidatorDOM;
  props: ResolvedValidatorProps | null;
  runtime: ValidatorRuntime;
  validate(): boolean;
  reset(options?: ResetOptions): void;
  destroy(): void;
}

const VALIDATOR_PROPS_SCHEMA = {
  rules: { default: {}, type: 'object' },
  messages: { default: {}, type: 'object' },
  onSubmit: { default: null, types: ['function', 'null'] },
} satisfies ResolveSchema<ValidatorProps>;

function normalizeProps(input: ValidatorProps): ResolvedValidatorProps {
  const props = resolveProps(input, VALIDATOR_PROPS_SCHEMA, 'Validator.props');
  return {
    rules: props.rules as Record<string, ValidatorRule>,
    messages: props.messages as ValidatorMessageMap,
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
    message: '',
    destroyed: false,
  };
}

function getControlContainer(element: ValidatorElement): HTMLElement | null {
  return (
    element.closest<HTMLElement>('[data-form-control]') || element.parentElement
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

/**
 * 表单校验组件。
 *
 * 支持绑定表单 submit/reset 事件，也可以手动调用 validate/reset。
 */
class Validator implements ValidatorInstance {
  dom: ValidatorDOM;
  props: ResolvedValidatorProps | null;
  runtime: ValidatorRuntime;
  cleanup: ValidatorCleanup | null;

  constructor(
    element: DOMReference,
    props: ValidatorProps = {},
    bindEvents = false
  ) {
    this.props = normalizeProps(props);
    this.dom = {
      root: this.resolveRoot(element),
    };
    this.runtime = createRuntime();
    this.cleanup = {
      events: createEventManager(),
    };

    this.validateOptions(bindEvents);

    if (bindEvents) {
      this.bindEvents();
    }
  }

  private resolveRoot(element: DOMReference): HTMLFormElement {
    const root = resolveElement(element);
    if (!(root instanceof HTMLFormElement)) {
      throw new Error('Validator.element expects a form element.');
    }
    return root;
  }

  private validateOptions(bindEvents: boolean): void {
    validateParam('bindEvents', bindEvents, 'boolean', 'Validator');
  }

  private bindEvents(): void {
    this.unbindEvents();
    const { root } = this.dom;
    if (!root || !this.cleanup) return;

    this.cleanup.events.on('submit', root, 'submit', (event) => {
      event.preventDefault();
      this.validate();
    });
    this.cleanup.events.on('reset', root, 'reset', () => {
      this.reset({ native: false });
    });
  }

  private unbindEvents(): void {
    this.cleanup?.events.clear();
  }

  /**
   * 执行表单校验。
   */
  validate(): boolean {
    const { root } = this.dom;
    if (!root || !this.props) return false;

    this.runtime.valid = true;
    this.runtime.message = '';

    for (const element of Array.from(root.elements)) {
      if (!isValidatorElement(element) || !element.name) continue;
      if (!this.props.rules[element.name]) continue;

      this.runtime.valid = this.validateRule(element, element.name);
      if (!this.runtime.valid) break;
    }

    if (this.runtime.valid && this.props.onSubmit) {
      this.props.onSubmit(this);
    }
    return this.runtime.valid;
  }

  private validateRule(element: ValidatorElement, name: string): boolean {
    if (!this.props) return false;
    const rules = this.props.rules[name];
    if (!rules) return true;

    if (this.hasNativeValidationRule(element)) {
      return this.runtime.valid;
    }

    for (const rule of Object.keys(rules)) {
      const value = rules[rule];
      let customMessage = '';

      switch (rule) {
        case 'required':
          this.runtime.valid = this.validateRequired(element, value);
          break;
        case 'minLength':
          this.runtime.valid = this.validateMinLength(element, value);
          break;
        case 'maxLength':
          this.runtime.valid = this.validateMaxLength(element, value);
          break;
        case 'equalTo':
          this.runtime.valid = this.validateEqualTo(element, value);
          break;
        case 'email':
          this.runtime.valid = this.validateEmail(element);
          break;
        case 'checked':
          this.runtime.valid = this.validateCheck(element, value);
          break;
        case 'selected':
          this.runtime.valid = this.validateSelected(element, value);
          break;
        case 'multiple':
          this.runtime.valid = this.validateMultiple(element, value);
          break;
        case 'min':
          this.runtime.valid = this.validateSelectMin(element, value);
          break;
        case 'max':
          this.runtime.valid = this.validateSelectMax(element, value);
          break;
        case 'noSpace':
          this.runtime.valid = this.validateNoSpace(element, value);
          break;
        case 'noChinese':
          this.runtime.valid = !/[\u4e00-\u9fa5]/.test(element.value);
          break;
        case 'noSpecial':
          this.runtime.valid = !/[@#$%^&*]+/g.test(element.value);
          break;
        case 'pattern':
          this.runtime.valid = this.validatePattern(element, value);
          break;
        case 'file':
          this.runtime.valid = this.validateFile(element, value);
          break;
        case 'minSize':
          this.runtime.valid = this.validateMinSize(element, value);
          break;
        case 'maxSize':
          this.runtime.valid = this.validateMaxSize(element, value);
          break;
        case 'accept':
          this.runtime.valid = this.validateAccept(element, value);
          break;
        case 'validate': {
          const result = this.validateCustom(element, value);
          this.runtime.valid = result === true;
          customMessage = typeof result === 'string' ? result : '';
          break;
        }
      }

      if (!this.runtime.valid) {
        this.showError(element, name, rule, customMessage);
        break;
      }

      this.showSuccess(element);
    }

    return this.runtime.valid;
  }

  private hasNativeValidationRule(element: ValidatorElement): boolean {
    return (
      element.hasAttribute('required') ||
      element.hasAttribute('minlength') ||
      element.hasAttribute('maxlength') ||
      element.hasAttribute('pattern') ||
      element.hasAttribute('min') ||
      element.hasAttribute('max') ||
      element.hasAttribute('step')
    );
  }

  private validateRequired(
    element: ValidatorElement,
    required: unknown
  ): boolean {
    if (required !== true) return true;
    if (element instanceof HTMLSelectElement) {
      return selectedValues(element).some((value) => value.length > 0);
    }
    return element.value.trim().length >= 1;
  }

  private validateMinLength(
    element: ValidatorElement,
    minLength: unknown
  ): boolean {
    if (typeof minLength !== 'number') return true;
    return element.value.length >= minLength;
  }

  private validateMaxLength(
    element: ValidatorElement,
    maxLength: unknown
  ): boolean {
    if (typeof maxLength !== 'number') return true;
    return element.value.length <= maxLength;
  }

  private validateEmail(element: ValidatorElement): boolean {
    const emailPattern = /^([\w-.]+@([\w-]+\.)+[\w-]{2,4})?$/;
    return emailPattern.test(element.value);
  }

  private validateEqualTo(
    element: ValidatorElement,
    targetName: unknown
  ): boolean {
    const { root } = this.dom;
    if (!root || typeof targetName !== 'string') return true;
    const targetElement = toValidatorElement(
      root.elements.namedItem(targetName)
    );
    if (!targetElement) {
      throw new Error(`Validator: target element "${targetName}" not found.`);
    }
    return element.value === targetElement.value;
  }

  private validateCheck(element: ValidatorElement, checked: unknown): boolean {
    if (!(element instanceof HTMLInputElement) || element.type !== 'checkbox') {
      throw new Error(
        `Validator: element expects a checkbox input, but ${element.tagName.toLowerCase()} given.`
      );
    }
    return element.checked === checked;
  }

  private validateSelected(
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

  private validateMultiple(
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

  private validateSelectMin(element: ValidatorElement, min: unknown): boolean {
    if (!(element instanceof HTMLSelectElement) || typeof min !== 'number') {
      return true;
    }
    return element.selectedOptions.length >= min;
  }

  private validateSelectMax(element: ValidatorElement, max: unknown): boolean {
    if (!(element instanceof HTMLSelectElement) || typeof max !== 'number') {
      return true;
    }
    return element.selectedOptions.length <= max;
  }

  private validateNoSpace(
    element: ValidatorElement,
    noSpace: unknown
  ): boolean {
    return !/\s/.test(element.value) || noSpace !== true;
  }

  private validatePattern(
    element: ValidatorElement,
    pattern: unknown
  ): boolean {
    if (!(typeof pattern === 'string' || pattern instanceof RegExp))
      return true;
    return new RegExp(pattern).test(element.value);
  }

  private validateFile(element: ValidatorElement, required: unknown): boolean {
    if (!isFileInput(element)) return true;
    return required === true ? hasFiles(element) : true;
  }

  private validateMinSize(
    element: ValidatorElement,
    minSize: unknown
  ): boolean {
    if (
      !isFileInput(element) ||
      !hasFiles(element) ||
      typeof minSize !== 'number'
    ) {
      return true;
    }
    return element.files[0].size >= minSize;
  }

  private validateMaxSize(
    element: ValidatorElement,
    maxSize: unknown
  ): boolean {
    if (
      !isFileInput(element) ||
      !hasFiles(element) ||
      typeof maxSize !== 'number'
    ) {
      return true;
    }
    return element.files[0].size <= maxSize;
  }

  private validateAccept(element: ValidatorElement, accept: unknown): boolean {
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

  private validateCustom(
    element: ValidatorElement,
    rule: unknown
  ): ValidatorCustomResult {
    if (typeof rule !== 'function') return true;
    const result = (rule as ValidatorCustomRule)(element, this);
    return typeof result === 'string' ? result : !!result;
  }

  private showError(
    element: ValidatorElement,
    name: string,
    rule: string,
    customMessage = ''
  ): void {
    if (!(element instanceof HTMLInputElement) || element.type !== 'checkbox') {
      element.classList.remove('is-valid');
      element.classList.add('is-invalid');
    }

    const error = customMessage || this.props?.messages[name]?.[rule] || '';
    if (!error) return;

    this.runtime.message = error;

    const formControl = getControlContainer(element);
    if (!formControl) return;

    let help =
      all<HTMLElement>('[data-validator-help]', formControl).find(
        (element) => element.dataset.validatorHelp === name
      ) || null;
    if (!help) {
      help = jsx('div', {
        className: 'help-block is-invalid',
        'data-validator-help': name,
      }) as HTMLElement;
      formControl.appendChild(help);
    }
    help.textContent = error;
  }

  private showSuccess(element: ValidatorElement): void {
    const formControl = getControlContainer(element);
    if (formControl) {
      for (const help of all<HTMLElement>(
        '[data-validator-help]',
        formControl
      )) {
        if (help.dataset.validatorHelp === element.name) help.remove();
      }
    }

    if (!(element instanceof HTMLInputElement) || element.type !== 'checkbox') {
      element.classList.remove('is-invalid');
      element.classList.add('is-valid');
    }
  }

  /**
   * 重置表单与校验状态。
   */
  reset({ native = true }: ResetOptions = {}): void {
    const { root } = this.dom;
    if (!root) return;
    if (native) root.reset();

    for (const element of Array.from(root.elements)) {
      if (!isValidatorElement(element)) continue;
      element.classList.remove('is-valid');
      element.classList.remove('is-invalid');
    }

    for (const help of all<HTMLElement>('[data-validator-help]', root)) {
      help.remove();
    }

    this.runtime.valid = true;
    this.runtime.message = '';
  }

  /**
   * 销毁当前校验实例。
   */
  destroy(): void {
    if (this.runtime.destroyed) return;
    this.runtime.destroyed = true;

    this.unbindEvents();
    this.reset({ native: false });
    this.dom.root = null;
    this.props = null;
    this.runtime.valid = false;
    this.runtime.message = '';
    this.cleanup?.events.clear();
    this.cleanup = null;
  }
}

export function createValidator(
  element: DOMReference,
  props: ValidatorProps = {},
  bindEvents = false
): ValidatorInstance {
  return new Validator(element, props, bindEvents);
}

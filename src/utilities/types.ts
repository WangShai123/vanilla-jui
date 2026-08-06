import { isPlainObject } from './object.ts';

type LooseRecord = Record<string, unknown>;
type ValueTypeName = string;
type TypeRule = ValueTypeName | readonly ValueTypeName[];

export function isNilValue(value: unknown): value is null | undefined {
  return value == null;
}

export function isDomNodeValue(value: unknown): value is Node {
  return typeof Node !== 'undefined' && value instanceof Node;
}

export function isDomElementValue(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element;
}

export function isHtmlElementValue(value: unknown): value is HTMLElement {
  return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement;
}

export function isRenderablePrimitive(
  value: unknown
): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export function isRenderableValue(value: unknown): boolean {
  return (
    isNilValue(value) ||
    isRenderablePrimitive(value) ||
    typeof value === 'function' ||
    Array.isArray(value) ||
    isDomNodeValue(value)
  );
}

export const getType = (val: unknown): string => {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  if (isHtmlElementValue(val)) return 'HTMLElement';
  if (isDomNodeValue(val)) return 'Node';
  return typeof val;
};

export type ValidateCondition =
  | ((value: unknown) => boolean)
  | {
      test: (value: unknown) => boolean;
      message?: string;
    };

export interface NormalizeContext<TInput extends LooseRecord = LooseRecord> {
  key: string;
  input: TInput;
  options: LooseRecord;
  schema: ResolveSchema<TInput>;
}

export interface ParamRule<TInput extends LooseRecord = LooseRecord> {
  type?: TypeRule;
  types?: TypeRule;
  required?: boolean;
  enum?: readonly unknown[];
  nonEmpty?: boolean;
  minLength?: number;
  maxLength?: number;
  finite?: boolean;
  integer?: boolean;
  min?: number;
  max?: number;
  greaterThan?: number;
  lessThan?: number;
  plain?: boolean;
  items?: ParamRuleInput;
  shape?: ResolveSchema;
  conditions?: ValidateCondition | readonly ValidateCondition[];
  validate?: (value: unknown) => boolean;
  message?: string;
  normalize?: (value: unknown, context: NormalizeContext<TInput>) => unknown;
  default?: unknown;
  factory?: boolean;
  [key: string]: unknown;
}

export type ParamRuleInput<TInput extends LooseRecord = LooseRecord> =
  | TypeRule
  | ParamRule<TInput>;

export type ResolveSchema<TInput extends LooseRecord = LooseRecord> = Record<
  string,
  ParamRuleInput<TInput>
>;

export type ResolvedProps<TSchema extends object> = LooseRecord & {
  [Key in keyof TSchema]: unknown;
};

function cloneDefault<T>(value: T): T {
  if (Array.isArray(value)) return value.slice() as T;
  if (isPlainObject(value)) return { ...(value as LooseRecord) } as T;
  return value;
}

function normalizeRule<TInput extends LooseRecord = LooseRecord>(
  rule: ParamRuleInput<TInput> = {}
): ParamRule<TInput> {
  if (typeof rule === 'string' || Array.isArray(rule)) return { type: rule };
  if (!rule || typeof rule !== 'object') return {};
  return rule as ParamRule<TInput>;
}

function throwValidateError(name: string, message: string): never {
  throw new Error(`Validator: ${name} ${message}`);
}

function stringifyExpected(value: unknown): string {
  return typeof value === 'string' ? value : String(value);
}

function describeLengthValue(value: unknown): string {
  return typeof value === 'string' ? 'string' : 'array';
}

function validateLengthRule<TInput extends LooseRecord = LooseRecord>(
  name: string,
  value: unknown,
  rule: ParamRule<TInput>
): void {
  if (isNilValue(value)) return;
  if (typeof value !== 'string' && !Array.isArray(value)) return;

  const label = describeLengthValue(value);
  if (rule.nonEmpty && value.length === 0) {
    throwValidateError(name, `expects a non-empty ${label}.`);
  }
  if (typeof rule.minLength === 'number' && value.length < rule.minLength) {
    throwValidateError(
      name,
      `expects ${label} length to be at least ${rule.minLength}.`
    );
  }
  if (typeof rule.maxLength === 'number' && value.length > rule.maxLength) {
    throwValidateError(
      name,
      `expects ${label} length to be at most ${rule.maxLength}.`
    );
  }
}

function validateNumberRule<TInput extends LooseRecord = LooseRecord>(
  name: string,
  value: unknown,
  rule: ParamRule<TInput>
): void {
  if (isNilValue(value) || typeof value !== 'number') return;
  if (rule.finite && !Number.isFinite(value)) {
    throwValidateError(name, 'expects a finite number.');
  }
  if (rule.integer && !Number.isInteger(value)) {
    throwValidateError(name, 'expects an integer.');
  }
  if (typeof rule.min === 'number' && value < rule.min) {
    throwValidateError(
      name,
      `expects a number greater than or equal to ${rule.min}.`
    );
  }
  if (typeof rule.max === 'number' && value > rule.max) {
    throwValidateError(
      name,
      `expects a number less than or equal to ${rule.max}.`
    );
  }
  if (typeof rule.greaterThan === 'number' && value <= rule.greaterThan) {
    throwValidateError(
      name,
      `expects a number greater than ${rule.greaterThan}.`
    );
  }
  if (typeof rule.lessThan === 'number' && value >= rule.lessThan) {
    throwValidateError(name, `expects a number less than ${rule.lessThan}.`);
  }
}

function validatePlainRule<TInput extends LooseRecord = LooseRecord>(
  name: string,
  value: unknown,
  rule: ParamRule<TInput>
): void {
  if (!rule.plain || isNilValue(value)) return;
  if (!isPlainObject(value)) {
    throwValidateError(name, 'expects an object.');
  }
}

function validateItemsRule<TInput extends LooseRecord = LooseRecord>(
  name: string,
  value: unknown,
  rule: ParamRule<TInput>
): void {
  if (!rule.items || isNilValue(value)) return;
  if (!Array.isArray(value)) {
    throwValidateError(name, 'expects array.');
  }
  value.forEach((item, index) => {
    validateParam(String(index), item, rule.items, name);
  });
}

function validateShapeRule<TInput extends LooseRecord = LooseRecord>(
  name: string,
  value: unknown,
  rule: ParamRule<TInput>
): void {
  if (!rule.shape || isNilValue(value)) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throwValidateError(name, 'expects object.');
  }
  const source = value as LooseRecord;
  for (const [key, childRule] of Object.entries(rule.shape)) {
    validateParam(key, source[key], childRule, name);
  }
}

function matchesValueType(value: unknown, type: string): boolean {
  if (type === 'renderable') return isRenderableValue(value);
  if (type === 'Node') return isDomNodeValue(value);
  if (type === 'Element') return isDomElementValue(value);
  if (type === 'HTMLElement') return isHtmlElementValue(value);
  if (type === 'plainObject') return isPlainObject(value);
  return getType(value) === type;
}

function getActualType(value: unknown): string {
  return isPlainObject(value) ? 'object' : getType(value);
}

function runValidateConditions(
  name: string,
  value: unknown,
  conditions: ValidateCondition | readonly ValidateCondition[] = []
): void {
  const list = Array.isArray(conditions)
    ? conditions
    : conditions
      ? [conditions]
      : [];
  for (const c of list) {
    let testFn: (val: unknown) => boolean;
    let message: string;

    if (typeof c === 'function') {
      testFn = c;
      message = 'does not satisfy the required condition.';
    } else if (c && typeof c.test === 'function') {
      testFn = c.test;
      message = c.message || 'condition failed.';
    } else {
      throw new Error(
        'Validator: Condition must be a function or { test, message }.'
      );
    }

    if (!testFn(value)) {
      throwValidateError(name, message);
    }
  }
}

function formatValidateName(namespace: string, name: string): string {
  return namespace ? `${namespace}.${name}` : name;
}

export function validateParam<TInput extends LooseRecord = LooseRecord>(
  name: string,
  value: unknown,
  rule: ParamRuleInput<TInput> = {},
  namespace = ''
): unknown {
  const config = normalizeRule(rule);
  const label = formatValidateName(namespace, name);
  const expectedTypes = Object.hasOwn(config, 'types')
    ? config.types
    : config.type;

  if (config.required && isNilValue(value)) {
    throwValidateError(label, 'is required.');
  }

  if (expectedTypes !== undefined) {
    const types = Array.isArray(expectedTypes)
      ? expectedTypes
      : [expectedTypes];
    const actualType = getActualType(value);
    const typeMatch = types.some((t) => matchesValueType(value, t));
    if (!typeMatch) {
      const allowed = types.join(', ');
      throwValidateError(label, `expects ${allowed}, but got ${actualType}.`);
    }
  }

  if (Array.isArray(config.enum) && !config.enum.includes(value)) {
    throwValidateError(
      label,
      `expects one of ${config.enum.map(stringifyExpected).join(', ')}.`
    );
  }

  validateLengthRule(label, value, config);
  validateNumberRule(label, value, config);
  validatePlainRule(label, value, config);
  validateItemsRule(label, value, config);
  validateShapeRule(label, value, config);
  runValidateConditions(label, value, config.conditions);

  if (typeof config.validate === 'function') {
    const valid = config.validate(value);
    if (!valid) {
      throwValidateError(
        label,
        config.message || 'does not satisfy the required condition.'
      );
    }
  }

  return value;
}

export function resolveProps<
  TInput extends LooseRecord,
  TSchema extends ResolveSchema<TInput>,
>(
  input: TInput | null | undefined = {} as TInput,
  schema: TSchema = {} as TSchema,
  namespace = 'Options'
): TInput & ResolvedProps<TSchema> {
  const source = input == null ? {} : input;
  if (typeof source !== 'object' || Array.isArray(source)) {
    throw new Error(`${namespace} expects object.`);
  }

  const sourceRecord = source as TInput;
  const resolved: LooseRecord = { ...sourceRecord };
  const entries = Object.entries(schema || {}) as Array<
    [string, ParamRuleInput<TInput>]
  >;

  for (const [key, rawRule] of entries) {
    const rule = normalizeRule<TInput>(rawRule);
    resolved[key] = Object.hasOwn(sourceRecord, key)
      ? sourceRecord[key]
      : resolveDefault(rule);
  }

  for (const [key, rawRule] of entries) {
    const rule = normalizeRule<TInput>(rawRule);
    if (typeof rule.normalize === 'function') {
      resolved[key] = rule.normalize(resolved[key], {
        key,
        input: sourceRecord,
        options: resolved,
        schema,
      });
    }
  }

  for (const [key, rule] of entries) {
    validateParam(key, resolved[key], rule, namespace);
  }

  return resolved as TInput & ResolvedProps<TSchema>;
}

interface DefaultRule {
  default?: unknown;
  factory?: boolean;
}

function resolveDefault(rule: DefaultRule): unknown {
  if (!Object.hasOwn(rule, 'default')) return undefined;
  const defaultValue = rule.default;
  const value =
    rule.factory && typeof defaultValue === 'function'
      ? defaultValue()
      : defaultValue;
  return cloneDefault(value);
}

/**
 * 判断是否为普通可构造函数（排除箭头函数和类）。
 * @param fn - 需要判断的值
 * @returns 如果是普通函数则返回 true，否则返回 false
 * @deprecated 未使用过，暂时注释掉。待需要使用时，再重新恢复。
 */
// export const isFunction = (fn: unknown): fn is (...args: never[]) => unknown => {
//   return (
//     typeof fn === "function" &&
//     Object.hasOwn(fn, "prototype") &&
//     fn.prototype !== null &&
//     typeof fn.prototype === "object" &&
//     Object.hasOwn(fn.prototype, "constructor") &&
//     fn.prototype.constructor === fn
//   );
// };

/**
 * 判断是否为类（使用 class 语法定义）。
 * @param fn - 需要判断的值
 * @returns 如果是类则返回 true，否则返回 false
 * @deprecated 未使用过，暂时注释掉。待需要使用时，再重新恢复。
 */
// export const isClass = (fn: unknown): fn is abstract new (...args: never[]) => unknown => {
//   return typeof fn === "function" && /^class\s/.test(Function.prototype.toString.call(fn));
// };

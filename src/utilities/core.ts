type LooseRecord = Record<string, unknown>;
type ValueTypeName = string;
type TypeRule = ValueTypeName | readonly ValueTypeName[];
type AnyFunction = (this: unknown, ...args: never[]) => unknown;

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

/**
 * 判断对象是否包含指定属性。
 * @param {object} obj - 待检查的对象。
 * @param {string} key - 属性名。
 * @returns {boolean} - 如果对象包含指定属性，则返回 true；否则返回 false。
 */
export const hasOwn = <T extends object>(
  obj: T,
  key: PropertyKey
): key is keyof T => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * 创建一个去重后的数组，并移除“假值”（如 null、undefined、false、0、NaN、空字符串）。
 * @param {Array} list - 待去重的数组。
 * @returns {Array} - 去重后的数组。
 */
export const uniq = <T>(list: readonly T[]): T[] =>
  Array.from(new Set(list.filter(Boolean)));

/**
 * 定时器管理器
 */
export const timer = {
  // 存储定时器 { key: timerId }
  timers: {} as Record<string, ReturnType<typeof setTimeout>>,

  /**
   * 注册并开始一个定时器
   * @param {string} key - 定时器的唯一标识
   * @param {number} duration - 延迟执行的时间（毫秒）
   * @param {function} callback - 延迟执行的回调函数
   */
  start(key: string, duration: number, callback: () => void) {
    // 1. 如果该 key 已经存在，先清除旧的定时器，防止重复触发
    if (this.timers[key]) {
      clearTimeout(this.timers[key]);
    }
    // 2. 设置新的定时器，并保存其 ID
    this.timers[key] = setTimeout(() => {
      callback();
      // 3. 执行完毕后，自动从管理器中注销该定时器
      delete this.timers[key];
    }, duration);
  },

  /**
   * 明确注销一个定时器
   * @param {string} key - 需要取消的定时器唯一标识
   */
  cancel(key: string) {
    if (this.timers[key]) {
      clearTimeout(this.timers[key]);
      // 从管理器中移除该记录
      delete this.timers[key];
    }
  },
};

/**
 * 获取值的增强类型名称。
 * @param {*} val 需要判断类型的值。
 * @returns {string} 类型名称，如 array、null、HTMLElement、Node、string 等。
 */
export const getType = (val: unknown): string => {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  if (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement) {
    return 'HTMLElement';
  }
  if (typeof Node !== 'undefined' && val instanceof Node) return 'Node';
  return typeof val;
};

/**
 * 判断是否为普通可构造函数。
 * @param {*} fn 需要判断的值。
 * @returns {boolean}
 */
export const isFunction = (
  fn: unknown
): fn is (...args: never[]) => unknown => {
  return (
    typeof fn === 'function' &&
    hasOwn(fn, 'prototype') &&
    fn.prototype !== null &&
    typeof fn.prototype === 'object' &&
    hasOwn(fn.prototype, 'constructor') &&
    fn.prototype.constructor === fn
  );
};

/**
 * 判断是否为类。
 * @param {Function} fn 函数。
 * @returns {boolean}
 */
export const isClass = (
  fn: unknown
): fn is abstract new (...args: never[]) => unknown => {
  return (
    typeof fn === 'function' &&
    /^class\s/.test(Function.prototype.toString.call(fn))
  );
};

/**
 * 判断是否为普通对象。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * 浅拷贝默认值。
 * @param {*} value 需要拷贝的值。
 * @returns {*} 拷贝后的值。
 */
function cloneDefault<T>(value: T): T {
  if (Array.isArray(value)) return value.slice() as T;
  if (isPlainObject(value)) return { ...value } as T;
  return value;
}

/**
 * 规范化规则对象。
 * @param {string|string[]|object} rule 需要规范化的规则对象。
 * @returns {NormalizedRule} 规范化后的规则对象。
 */
function normalizeRule<TInput extends LooseRecord = LooseRecord>(
  rule: ParamRuleInput<TInput> = {}
): ParamRule<TInput> {
  if (typeof rule === 'string' || Array.isArray(rule)) return { type: rule };
  if (!rule || typeof rule !== 'object') return {};
  return rule as ParamRule<TInput>;
}

/**
 * 运行验证条件。
 * @param {string} name 参数名称，用于错误信息。
 * @param {*} value 参数值。
 * @param {ValidateConditionRule[]} [conditions=[]] 附加条件。
 * @throws {Error} 条件失败时抛出。
 */
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
      throw new Error(`Validator: ${name} ${message}`);
    }
  }
}

/**
 * 格式化错误名称。
 * @param {string} namespace 命名空间。
 * @param {string} name 参数名。
 * @returns {string} 格式化后的错误名称。
 */
function formatValidateName(namespace: string, name: string): string {
  return namespace ? `${namespace}.${name}` : name;
}

/**
 * 按规则校验参数。
 *
 * rule 可包含 type/types、required、enum、conditions、validate、message 等字段。
 * @param {string} name 参数名。
 * @param {*} value 参数值。
 * @param {NormalizedRule} rule 校验规则。
 * @param {string} [namespace=""] 错误命名空间。
 * @returns {*} 校验通过后的原值。
 * @throws {Error} 校验失败时抛出。
 */
export function validateParam<TInput extends LooseRecord = LooseRecord>(
  name: string,
  value: unknown,
  rule: ParamRuleInput<TInput> = {},
  namespace = ''
): unknown {
  const config = normalizeRule(rule);
  const label = formatValidateName(namespace, name);
  const expectedTypes = hasOwn(config, 'types') ? config.types : config.type;

  if (config.required && (value === undefined || value === null)) {
    throw new Error(`Validator: ${label} is required.`);
  }

  if (expectedTypes !== undefined) {
    const types = Array.isArray(expectedTypes)
      ? expectedTypes
      : [expectedTypes];
    const actualType = getType(value);
    const typeMatch = types.some((t) => t === actualType);
    if (!typeMatch) {
      const allowed = types.join(', ');
      throw new Error(
        `Validator: ${label} expects ${allowed}, but got ${actualType}.`
      );
    }
    runValidateConditions(label, value, config.conditions);
  } else {
    runValidateConditions(label, value, config.conditions);
  }

  if (Array.isArray(config.enum) && !config.enum.includes(value)) {
    throw new Error(
      `Validator: ${label} expects one of ${config.enum.join(', ')}.`
    );
  }

  if (typeof config.validate === 'function') {
    const valid = config.validate(value);
    if (!valid) {
      throw new Error(
        `Validator: ${label} ${config.message || 'does not satisfy the required condition.'}`
      );
    }
  }

  return value;
}

/**
 * 合并默认值、执行 normalize 并校验配置。
 *
 * schema 的每一项可同时定义 default、factory、normalize 和校验规则。
 * @param {object} [input={}] 用户传入配置。
 * @param {Record<string, object|string|string[]>} [schema={}] 配置 schema。
 * @param {string} [namespace="Options"] 错误命名空间。
 * @returns {object} 合并并校验后的配置。
 */
export function resolveProps(
  input: null | undefined,
  schema?: ResolveSchema,
  namespace?: string
): ResolvedProps<ResolveSchema>;
export function resolveProps<
  TInput extends LooseRecord,
  TSchema extends ResolveSchema<TInput>,
>(
  input?: TInput | null,
  schema?: TSchema,
  namespace?: string
): TInput & ResolvedProps<TSchema>;
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

  // 1. 处理默认值
  for (const [key, rawRule] of entries) {
    const rule = normalizeRule<TInput>(rawRule);
    resolved[key] = hasOwn(source, key) ? source[key] : resolveDefault(rule);
  }

  // 2. 执行 normalize 钩子
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

  // 3. 校验
  for (const [key, rule] of entries) {
    validateParam(key, resolved[key], rule, namespace);
  }

  return resolved as TInput & ResolvedProps<TSchema>;
}

/**
 * 生成标准 UUID。
 * @returns {string}
 */
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto.getRandomValues !== 'function') {
    throw new Error('Your browser is too old to support secure login.');
  }
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * 生成适合 DOM id 的随机字符串。
 * @param {number} [length=8] 字符串长度，范围 1 到 32。
 * @returns {string}
 */
export function randomId(length = 8): string {
  if (!Number.isInteger(length) || length < 1 || length > 32) {
    throw new Error('Length must be an integer between 1 and 32');
  }
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] & 31];
  }
  return result;
}

/**
 * 创建防抖函数，确保在连续调用时，只有在指定的等待时间后才会执行一次。
 * @param {Function} func 要防抖的函数
 * @param {number} wait 等待时间，单位为毫秒
 * @param {Object} options 配置选项
 * @param {boolean} [options.leading=false] 是否在等待时间的开始调用函数
 * @param {boolean} [options.trailing=true] 是否在等待时间的结束调用函数
 * @param {number} [options.maxWait] 最大等待时间，确保函数在最长等待时间内至少执行一次
 * @returns {Function} 返回一个新的防抖函数
 */
interface PendingCall<T extends AnyFunction> {
  receiver: ThisParameterType<T>;
  args: Parameters<T>;
}

export interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export type DebouncedFunction<T extends AnyFunction> = {
  (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
};

export function debounce<T extends AnyFunction>(
  func: T,
  wait = 0,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function');
  }

  const delay = Number(wait) || 0;
  const settings = options && typeof options === 'object' ? options : {};
  const leading = !!settings.leading;
  const trailing = hasOwn(settings, 'trailing') ? !!settings.trailing : true;
  const maxing = hasOwn(settings, 'maxWait');
  const maxWait = maxing ? Math.max(Number(settings.maxWait) || 0, delay) : 0;

  let pendingCall: PendingCall<T> | undefined;
  let result: ReturnType<T> | undefined;
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;

  function invokeFunc(time: number): ReturnType<T> | undefined {
    const call = pendingCall;
    if (!call) return result;
    pendingCall = undefined;
    lastInvokeTime = time;
    result = Reflect.apply(func, call.receiver, call.args) as ReturnType<T>;
    return result;
  }

  function leadingEdge(time: number): ReturnType<T> | undefined {
    lastInvokeTime = time;
    timerId = setTimeout(timerExpired, delay);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;
    return maxing
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxing && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired(): ReturnType<T> | undefined {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number): ReturnType<T> | undefined {
    timerId = undefined;
    if (trailing && pendingCall) {
      return invokeFunc(time);
    }
    pendingCall = undefined;
    return result;
  }

  function cancel(): void {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastCallTime = undefined;
    timerId = undefined;
    pendingCall = undefined;
  }

  function flush(): ReturnType<T> | undefined {
    return timerId === undefined ? result : trailingEdge(Date.now());
  }

  function debounced(
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    pendingCall = {
      receiver: this,
      args,
    };
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        timerId = setTimeout(timerExpired, delay);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, delay);
    }
    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * 创建节流函数，确保在指定时间间隔内只执行一次。
 * 该函数基于防抖函数实现，适用于需要限制函数调用频率的场景。
 * @param {Function} func
 * @param {number} wait
 * @param {Object} options
 * @returns {Function}
 */
export function throttle<T extends AnyFunction>(
  func: T,
  wait = 0,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function');
  }
  const settings = options && typeof options === 'object' ? options : {};
  const leading = hasOwn(settings, 'leading') ? !!settings.leading : true;
  const trailing = hasOwn(settings, 'trailing') ? !!settings.trailing : true;
  return debounce(func, wait, { leading, trailing, maxWait: wait });
}

interface DefaultRule {
  default?: unknown;
  factory?: boolean;
}

function resolveDefault(rule: DefaultRule): unknown {
  if (!hasOwn(rule, 'default')) return undefined;
  const defaultValue = rule.default;
  const value =
    rule.factory && typeof defaultValue === 'function'
      ? defaultValue()
      : defaultValue;
  return cloneDefault(value);
}

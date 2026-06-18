const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * 定时器管理器
 */
export const timer = {
  // 内部维护一个对象，用于存储不同 key 对应的定时器 ID
  timers: {},

  /**
   * 注册并开始一个定时器
   * @param {string} key - 定时器的唯一标识
   * @param {number} duration - 延迟执行的时间（毫秒）
   * @param {function} callback - 延迟执行的回调函数
   */
  start(key, duration, callback) {
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
  cancel(key) {
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
export const getType = (val) => {
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
export const isFunction = (fn) => {
  return (
    typeof fn === 'function' &&
    fn.prototype !== null &&
    fn.prototype.constructor === fn
  );
};

/**
 * 判断是否为类。
 * @param {Function} fn 函数。
 * @returns {boolean}
 */
export const isClass = (fn) => {
  return (
    typeof fn === 'function' &&
    /^class\s/.test(Function.prototype.toString.call(fn))
  );
};

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneDefault(value) {
  if (Array.isArray(value)) return value.slice();
  if (isPlainObject(value)) return { ...value };
  return value;
}

function normalizeRule(rule = {}) {
  if (typeof rule === 'string' || Array.isArray(rule)) return { type: rule };
  if (!rule || typeof rule !== 'object') return {};
  return rule;
}

function runValidateConditions(name, value, conditions = []) {
  const list = Array.isArray(conditions)
    ? conditions
    : conditions
      ? [conditions]
      : [];

  for (const c of list) {
    let testFn;
    let message;

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
 * 按类型和附加条件校验单个值。
 * @param {string} name 参数名称，用于错误信息。
 * @param {*} value 参数值。
 * @param {string|string[]} expectedTypes 允许的类型。
 * @param {Function|Array<Function|{test:Function,message?:string}>} [conditions=[]] 附加校验条件。
 * @returns {*} 校验通过后的原值。
 * @throws {Error} 校验失败时抛出。
 */
export const validate = (name, value, expectedTypes, conditions = []) => {
  const types = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];
  const actualType = getType(value);
  const typeMatch = types.some((t) => t === actualType);

  if (!typeMatch) {
    const allowed = types.join(', ');
    throw new Error(
      `Validator: ${name} expects ${allowed}, but got ${actualType}.`
    );
  }

  runValidateConditions(name, value, conditions);
  return value;
};

function formatValidateName(namespace, name) {
  return namespace ? `${namespace}.${name}` : name;
}

function resolveDefault(rule) {
  if (!hasOwn(rule, 'default')) return undefined;
  const value =
    rule.factory && typeof rule.default === 'function'
      ? rule.default()
      : rule.default;
  return cloneDefault(value);
}

/**
 * 按规则校验参数。
 *
 * rule 可包含 type/types、required、enum、conditions、validate、message 等字段。
 * @param {string} name 参数名。
 * @param {*} value 参数值。
 * @param {string|string[]|object} [rule={}] 校验规则。
 * @param {string} [namespace=""] 错误命名空间。
 * @param {object} [context={}] 传给自定义 validate 的上下文。
 * @returns {*} 校验通过后的原值。
 * @throws {Error} 校验失败时抛出。
 */
export function validateParam(
  name,
  value,
  rule = {},
  namespace = '',
  context = {}
) {
  const config = normalizeRule(rule);
  const label = formatValidateName(namespace, name);
  const expectedTypes = hasOwn(config, 'types') ? config.types : config.type;

  if (config.required && (value === undefined || value === null)) {
    throw new Error(`Validator: ${label} is required.`);
  }

  if (expectedTypes !== undefined) {
    validate(label, value, expectedTypes, config.conditions);
  } else {
    runValidateConditions(label, value, config.conditions);
  }

  if (Array.isArray(config.enum) && !config.enum.includes(value)) {
    throw new Error(
      `Validator: ${label} expects one of ${config.enum.join(', ')}.`
    );
  }

  if (typeof config.validate === 'function') {
    const valid = config.validate(value, {
      ...context,
      name,
      value,
      namespace,
    });

    if (!valid) {
      throw new Error(
        `Validator: ${label} ${config.message || 'does not satisfy the required condition.'}`
      );
    }
  }

  return value;
}

/**
 * 按 schema 校验 options 对象。
 * @param {object} options 已解析的配置对象。
 * @param {Record<string, object|string|string[]>} schema 配置 schema。
 * @param {string} [namespace="Options"] 错误命名空间。
 * @returns {object} 原 options。
 */
export function validateOptions(options, schema, namespace = 'Options') {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error(`Validator: ${namespace} expects object.`);
  }

  for (const [key, rule] of Object.entries(schema || {})) {
    validateParam(key, options[key], rule, namespace, {
      key,
      options,
      schema,
    });
  }

  return options;
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
export function resolveOptions(input = {}, schema = {}, namespace = 'Options') {
  const source = input == null ? {} : input;

  if (typeof source !== 'object' || Array.isArray(source)) {
    throw new Error(`Validator: ${namespace} expects object.`);
  }

  const resolved = { ...source };
  const entries = Object.entries(schema || {});

  for (const [key, rawRule] of entries) {
    const rule = normalizeRule(rawRule);
    resolved[key] = hasOwn(source, key) ? source[key] : resolveDefault(rule);
  }

  for (const [key, rawRule] of entries) {
    const rule = normalizeRule(rawRule);
    if (typeof rule.normalize === 'function') {
      resolved[key] = rule.normalize(resolved[key], {
        key,
        input: source,
        options: resolved,
        schema,
      });
    }
  }

  return validateOptions(resolved, schema, namespace);
}

/**
 * 生成标准 UUID。
 * @returns {string}
 */
export function uuid() {
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
export function randomId(length = 8) {
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
 * 转义 HTML 特殊字符。
 * @param {*} text 需要转义的内容。
 * @returns {string}
 */
// export function escapeHtml(text) {
//   const ESCAPE_HTML_MAP = {
//     '&': '&amp;',
//     '<': '&lt;',
//     '>': '&gt;',
//     '"': '&quot;',
//     "'": '&#39;',
//   };

//   return String(text).replace(/[&<>"']/g, (ch) => ESCAPE_HTML_MAP[ch]);
// }

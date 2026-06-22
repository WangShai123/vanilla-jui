import { jsx } from 'vanilla-signal';

import { resolveProps, validateParam } from '../utilities/core.js';
import { all, canRenderDOM, getEl, q } from '../utilities/dom.js';
import { createEventManager } from '../utilities/events.js';

const VALIDATOR_OPTIONS_SCHEMA = {
  rules: { default: {}, type: 'object' },
  messages: { default: {}, type: 'object' },
  onSubmit: { default: null, types: ['function', 'null'] },
};

/**
 * @typedef {object} ValidatorRule
 * @property {boolean} [required] 是否必填。
 * @property {number} [minLength] 最短字符数。
 * @property {number} [maxLength] 最长字符数。
 * @property {string} [equalTo] 需要与之相等的表单字段 name。
 * @property {boolean} [email] 是否按邮箱格式校验。
 * @property {boolean} [checked] 复选框是否必须处于指定状态。
 * @property {boolean} [selected] 下拉选择框是否必须选择非空值。
 * @property {boolean} [multiple] 多选下拉框是否必须至少选择一项。
 * @property {number} [min] 多选下拉框最少选择项数。
 * @property {number} [max] 多选下拉框最多选择项数。
 * @property {boolean} [noSpace] 是否禁止空格。
 * @property {boolean} [noChinese] 是否禁止中文。
 * @property {boolean} [noSpecial] 是否禁止特殊字符。
 * @property {string|RegExp} [pattern] 自定义正则。
 * @property {boolean} [file] 文件是否必选。
 * @property {number} [minSize] 文件最小字节数。
 * @property {number} [maxSize] 文件最大字节数。
 * @property {string} [accept] 允许的文件类型，逗号分隔（如 ".jpg,.png" 或 "image/*"）。
 * @property {Function} [validate] 自定义验证函数，接收 element，返回 boolean（通过/失败）或 string（错误信息）。
 */

/**
 * @typedef {object} ValidatorOptions
 * @property {Record<string, ValidatorRule>} [rules] 以字段 name 为 key 的校验规则。
 * @property {Record<string, Record<string, string>>} [messages] 以字段 name 和规则名为 key 的错误文案。
 * @property {Function|null} [onSubmit] 全部校验通过后的回调。
 */

/**
 * 表单校验组件。
 *
 * 支持绑定表单 submit/reset 事件，也可以手动调用 validate/reset。
 */
class Validator {
  /**
   * 创建表单校验实例。
   * @param {HTMLFormElement|string} element 表单元素或选择器。
   * @param {ValidatorOptions} [options={}] 校验配置。
   * @param {boolean} [bindEvents=false] 是否自动绑定 submit/reset 事件。
   */
  constructor(element, options = {}, bindEvents = false) {
    if (!canRenderDOM()) {
      throw new Error('Validator: DOM render environment is required.');
    }

    this.options = resolveProps(
      options,
      VALIDATOR_OPTIONS_SCHEMA,
      'Validator.options'
    );
    this._validateOptions(element, this.options, bindEvents);
    this._init(element);

    if (bindEvents) {
      this._bindEvents();
    }
  }

  /**
   * 校验构造参数。
   * @private
   * @param {HTMLFormElement|string} element 表单元素或选择器。
   * @param {ValidatorOptions} options 已归一化配置。
   * @param {boolean} bindEvents 是否绑定事件。
   * @returns {void}
   */
  _validateOptions(element, options, bindEvents) {
    validateParam('element', element, ['HTMLElement', 'string'], 'Validator');
    validateParam('bindEvents', bindEvents, 'boolean', 'Validator');
  }

  /**
   * 初始化实例状态。
   * @private
   * @param {HTMLFormElement} element 表单元素。
   * @returns {void}
   */
  _init(element) {
    this.root = getEl(element, 'Validator.element');
    if (!this.root) {
      throw new Error('Validator: element not found.');
    }

    this.valid = true;
    this.cleanup = {
      events: createEventManager(),
    };
    this._destroyed = false;
  }

  /**
   * 绑定表单提交与重置事件。
   * @private
   * @returns {void}
   */
  _bindEvents() {
    this._unbindEvents();

    this.cleanup.events.on('submit', this.root, 'submit', (e) => {
      e.preventDefault();
      this.validate();
    });
    this.cleanup.events.on('reset', this.root, 'reset', () => {
      this.reset();
    });
  }

  /**
   * 解绑表单事件。
   * @private
   * @returns {void}
   */
  _unbindEvents() {
    this.cleanup?.events.clear();
  }

  /**
   * 执行表单校验。
   * @returns {boolean} 表单是否通过校验。
   */
  validate() {
    this.valid = true;

    for (const element of this.root.elements) {
      const nameAttr = element.name;
      if (this.options.rules[nameAttr]) {
        this.valid = this._validateRule(element, nameAttr);
        if (!this.valid) break;
      }
    }
    if (this.valid && this.options.onSubmit) {
      this.options.onSubmit();
    }
    return this.valid;
  }

  /**
   * 按字段规则校验单个表单控件。
   * @private
   * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} element 表单控件。
   * @param {string} nameAttr 字段 name。
   * @returns {boolean}
   */
  _validateRule(element, nameAttr) {
    const rules = this.options.rules[nameAttr];
    // 检查是否自定义了浏览器默认的验证规则
    if (
      element.hasAttribute('required') ||
      element.hasAttribute('minlength') ||
      element.hasAttribute('maxlength') ||
      element.hasAttribute('pattern') ||
      element.hasAttribute('min') ||
      element.hasAttribute('max') ||
      element.hasAttribute('step')
    ) {
      return this.valid;
    }
    // 如果没有，则使用下面规则进行验证
    for (const rule in rules) {
      switch (rule) {
        // 验证项1：必填
        case 'required':
          this.valid = this._validateRequired(element, rules[rule]);
          break;
        // 验证项2：最短长度
        case 'minLength':
          this.valid = this._validateMinLength(element, rules[rule]);
          break;
        // 验证项3：最长长度
        case 'maxLength':
          this.valid = this._validateMaxLength(element, rules[rule]);
          break;
        // 验证项4：密码是否一致
        case 'equalTo':
          this.valid = this._validateEqualTo(element, rules[rule]);
          break;
        // 验证项5：邮箱合法性
        case 'email':
          this.valid = this._validateEmail(element);
          break;
        // 验证项6：复选框是否选中
        case 'checked':
          this.valid = this._validateCheck(element, rules[rule]);
          break;
        // 验证项7：下拉选择框是否已选择非空值
        case 'selected':
          this.valid = this._validateSelected(element, rules[rule]);
          break;
        // 验证项7b：多选下拉框是否至少选择了一项
        case 'multiple':
          this.valid = this._validateMultiple(element, rules[rule]);
          break;
        // 验证项7c：多选下拉框最少选择项数
        case 'min':
          this.valid = this._validateSelectMin(element, rules[rule]);
          break;
        // 验证项7d：多选下拉框最多选择项数
        case 'max':
          this.valid = this._validateSelectMax(element, rules[rule]);
          break;
        /**
         * 验证项8：是否包含空格
         * @since 1.0.0
         */
        case 'noSpace':
          this.valid = this._validateNoSpace(element, rules[rule]);
          break;
        /**
         * 验证项9: 不支持中文
         * @since 1.0.0
         */
        case 'noChinese':
          this.valid = !/[\u4e00-\u9fa5]/.test(element.value);
          break;
        /**
         * 验证项10: 不支持特殊字符
         * @since 1.0.0
         */
        case 'noSpecial':
          this.valid = !/[@#$%^&*]+/g.test(element.value);
          break;
        /**
         * 验证项11: 自定义正则表达式
         * @since 1.0.0
         */
        case 'pattern':
          this.valid = new RegExp(rules[rule]).test(element.value);
          break;
        // 验证项12：文件必选
        case 'file':
          this.valid = this._validateFile(element, rules[rule]);
          break;
        // 验证项13：文件最小大小
        case 'minSize':
          this.valid = this._validateMinSize(element, rules[rule]);
          break;
        // 验证项14：文件最大大小
        case 'maxSize':
          this.valid = this._validateMaxSize(element, rules[rule]);
          break;
        // 验证项16：文件类型
        case 'accept':
          this.valid = this._validateAccept(element, rules[rule]);
          break;
        // 验证项17：自定义验证函数
        case 'validate':
          this.valid = this._validateCustom(element, rules[rule]);
          break;
      }
      if (!this.valid) {
        /**
         * messages配置规则，保持与rules配置规则一致
         * @since 1.0.0
         */
        this._errorMsg(element, nameAttr, rule);
        //  else {
        //   this._errorMsg(element, `${nameAttr} ${rule}`)
        // }
        break;
      } else {
        this._success(element);
      }
    }
    return this.valid;
  }

  /**
   * 校验必填项。
   * @private
   * @param {HTMLInputElement|HTMLTextAreaElement} element 表单控件。
   * @param {boolean} required 是否必填。
   * @returns {boolean}
   */
  _validateRequired(element, required) {
    return element.value.trim().length >= 1 && required === true;
  }

  /**
   * 校验最短长度。
   * @private
   * @param {HTMLInputElement|HTMLTextAreaElement} element 表单控件。
   * @param {number} minLength 最短长度。
   * @returns {boolean}
   */
  _validateMinLength(element, minLength) {
    return element.value.length >= minLength;
  }

  /**
   * 校验最长长度。
   * @private
   * @param {HTMLInputElement|HTMLTextAreaElement} element 表单控件。
   * @param {number} maxLength 最长长度。
   * @returns {boolean}
   */
  _validateMaxLength(element, maxLength) {
    return element.value.length <= maxLength;
  }

  /**
   * 校验邮箱格式。
   * @private
   * @param {HTMLInputElement} element 表单控件。
   * @returns {boolean}
   */
  _validateEmail(element) {
    const emailPattern = /^([\w-.]+@([\w-]+\.)+[\w-]{2,4})?$/;
    return emailPattern.test(element.value);
  }

  /**
   * 校验当前字段是否等于另一个字段。
   * @private
   * @param {HTMLInputElement} element 当前控件。
   * @param {string} targetName 目标字段 name。
   * @returns {boolean}
   */
  _validateEqualTo(element, targetName) {
    const targetElement = this.root.elements[targetName];
    if (targetElement === undefined || targetElement === null) {
      throw new Error(`Validator: target element "${targetName}" not found.`);
    }
    return element.value === targetElement.value;
  }

  /**
   * 校验复选框状态。
   * @private
   * @param {HTMLInputElement} element 复选框控件。
   * @param {boolean} checked 期望状态。
   * @returns {boolean}
   */
  _validateCheck(element, checked) {
    if (element.type !== 'checkbox') {
      throw new Error(
        `Validator: element expects a checkbox input, but ${element.type} given.`
      );
    }
    return element.checked === checked;
  }

  /**
   * 校验下拉选择框是否选择了非空值。
   * @private
   * @param {HTMLSelectElement} element 下拉选择框。
   * @param {boolean} selected 是否必须选择。
   * @returns {boolean}
   */
  _validateSelected(element, selected) {
    if (element.tagName !== 'SELECT') {
      throw new Error(
        `Validator: element expects a select element, but ${element.tagName.toLowerCase()} given.`
      );
    }
    if (selected !== true) return true;

    const values = Array.from(element.selectedOptions).map((option) =>
      option.value.trim()
    );
    return values.some((value) => value.length > 0);
  }

  /**
   * 校验多选下拉框是否至少选择了一项。
   * @private
   * @param {HTMLSelectElement} element 多选下拉框。
   * @param {boolean} multiple 是否必须选择至少一项。
   * @returns {boolean}
   */
  _validateMultiple(element, multiple) {
    if (element.tagName !== 'SELECT') {
      throw new Error(
        `Validator: element expects a select element, but ${element.tagName.toLowerCase()} given.`
      );
    }
    if (multiple !== true) return true;
    return element.selectedOptions.length > 0;
  }

  /**
   * 校验多选下拉框最少选择项数。
   * @private
   * @param {HTMLSelectElement} element 多选下拉框。
   * @param {number} min 最少选择项数。
   * @returns {boolean}
   */
  _validateSelectMin(element, min) {
    if (element.tagName !== 'SELECT') return true;
    return element.selectedOptions.length >= min;
  }

  /**
   * 校验多选下拉框最多选择项数。
   * @private
   * @param {HTMLSelectElement} element 多选下拉框。
   * @param {number} max 最多选择项数。
   * @returns {boolean}
   */
  _validateSelectMax(element, max) {
    if (element.tagName !== 'SELECT') return true;
    return element.selectedOptions.length <= max;
  }

  /**
   * 校验是否禁止空格。
   * @private
   * @param {HTMLInputElement|HTMLTextAreaElement} element 表单控件。
   * @param {boolean} noSpace 是否禁止空格。
   * @returns {boolean}
   */
  _validateNoSpace(element, noSpace) {
    return !/\s/.test(element.value) || noSpace !== true;
  }

  /**
   * 校验文件是否已选择。
   * @private
   * @param {HTMLInputElement} element 文件控件。
   * @param {boolean} required 是否必选。
   * @returns {boolean}
   */
  _validateFile(element, required) {
    if (element.type !== 'file') return true;
    return required === true ? element.files.length > 0 : true;
  }

  /**
   * 校验文件最小大小。
   * @private
   * @param {HTMLInputElement} element 文件控件。
   * @param {number} minSize 最小字节数。
   * @returns {boolean}
   */
  _validateMinSize(element, minSize) {
    if (element.type !== 'file' || !element.files.length) return true;
    return element.files[0].size >= minSize;
  }

  /**
   * 校验文件最大大小。
   * @private
   * @param {HTMLInputElement} element 文件控件。
   * @param {number} maxSize 最大字节数。
   * @returns {boolean}
   */
  _validateMaxSize(element, maxSize) {
    if (element.type !== 'file' || !element.files.length) return true;
    return element.files[0].size <= maxSize;
  }

  /**
   * 校验文件类型。
   * @private
   * @param {HTMLInputElement} element 文件控件。
   * @param {string} accept 允许的 MIME 类型或扩展名（逗号分隔，如 ".jpg,.png" 或 "image/*"）。
   * @returns {boolean}
   */
  _validateAccept(element, accept) {
    if (element.type !== 'file' || !element.files.length) return true;
    const file = element.files[0];
    const allowed = accept.split(',').map((s) => s.trim().toLowerCase());

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

  /**
   * 执行自定义验证函数。
   * @private
   * @param {HTMLElement} element 表单控件。
   * @param {Function} fn 验证函数，接收 element，返回 boolean 或 string（错误信息）。
   * @returns {boolean}
   */
  _validateCustom(element, fn) {
    if (typeof fn !== 'function') return true;
    const result = fn(element);
    if (typeof result === 'string') {
      return false;
    }
    return !!result;
  }

  /**
   * 显示错误信息并设置无效状态。
   * @private
   * @param {HTMLElement} element 表单控件。
   * @param {string} nameAttr 字段 name。
   * @param {string} rule 失败的规则名。
   * @returns {void}
   */
  _errorMsg(element, nameAttr, rule) {
    if (element.type !== 'checkbox') {
      element.classList.remove('is-valid');
      element.classList.add('is-invalid');
    }
    const error =
      this.options.messages[nameAttr] && this.options.messages[nameAttr][rule];
    if (error) {
      const formControl = element.closest('.form-control');
      let help = formControl ? q('.help-block', formControl) : null;
      if (!help) {
        help = jsx('div', {
          className: 'help-block is-invalid',
          children: error,
        });
        formControl.appendChild(help);
      }
    }
  }

  /**
   * 清理错误信息并设置通过状态。
   * @private
   * @param {HTMLElement} element 表单控件。
   * @returns {void}
   */
  _success(element) {
    const formControl = element.closest('.form-control');
    const helpBlock = formControl ? q('.help-block', formControl) : null;
    if (helpBlock) {
      formControl.removeChild(helpBlock);
    }
    if (element.type !== 'checkbox') {
      element.classList.remove('is-invalid');
      element.classList.add('is-valid');
    }
  }

  /**
   * 重置表单与校验状态。
   * @returns {void}
   */
  reset() {
    this.root.reset();
    for (const element of this.root.elements) {
      element.classList.remove('is-valid');
      element.classList.remove('is-invalid');
    }
    const helpBlocks = all('.help-block', this.root);
    for (const help of helpBlocks) {
      help.remove();
    }
    this.valid = true;
  }

  /**
   * 销毁当前校验实例。
   * @returns {void}
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this._unbindEvents();
    this.reset();
    this.root = null;
    this.options = null;
    this.valid = null;
    this.cleanup?.events.clear();
    this.cleanup = null;
  }
}
export default Validator;

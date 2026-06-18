import { jsx } from 'vanilla-signal';

import { resolveOptions } from '../utilities/core.js';
import { canRenderDOM, isElement } from '../utilities/dom.js';
import Drop from './drop.js';

const TOOLTIP_OPTIONS_SCHEMA = {
  name: { default: null, types: ['string', 'null'] },
  mode: { default: 'hover', type: 'string' },
  position: { default: 'auto', type: 'string' },
  offset: { default: 8, type: 'number' },
  message: {
    default: '',
    type: 'string',
    normalize: (value) => String(value || '').trim(),
    validate: (value) => value.length > 0,
    message: 'expects a non-empty string.',
  },
  className: { default: null, types: ['string', 'null'] },
  id: { default: null, types: ['string', 'null'] },
  delay: { default: 100, types: ['number', 'object'] },
  hoverIntent: { default: true, type: 'boolean' },
};

/**
 * @typedef {object} TooltipOptions
 * @property {string|null} [name] 提示名称，透传给 Drop 的 data-drop。
 * @property {string} [mode="hover"] 触发模式，通常为 hover 或 click。
 * @property {string} [position="auto"] 提示位置，取值与 Drop.position 一致。
 * @property {number} [offset=8] 提示与目标元素的间距。
 * @property {string} message 提示文案，不能为空。
 * @property {string|null} [className] 提示额外类名。
 * @property {string|null} [id] 提示浮层 id。
 * @property {number|{show?:number,hide?:number}} [delay=100] 展示/隐藏延迟。
 * @property {boolean} [hoverIntent=true] hover 模式下是否启用意图判断。
 */

/**
 * Tooltip 提示组件。
 *
 * 基于 Drop 实现，提供更轻量的文本提示封装。
 */

class Tooltip {
  /**
   * 创建 Tooltip 实例。
   * @param {HTMLElement} element 目标元素。
   * @param {TooltipOptions} [options={}] 提示配置。
   */
  constructor(element, options = {}) {
    if (!canRenderDOM()) {
      throw new Error('Tooltip: DOM render environment is required.');
    }

    if (!isElement(element)) {
      throw new Error('Tooltip: element expects a valid HTMLElement.');
    }

    const settings = resolveOptions(
      options,
      TOOLTIP_OPTIONS_SCHEMA,
      'Tooltip.options'
    );

    const container = this._buildTooltipContainer(settings);

    this.options = settings;
    this._destroyed = false;
    this.drop = new Drop(element, {
      name: settings.name,
      mode: settings.mode,
      position: settings.position,
      offset: settings.offset,
      content: container,
      className: settings.className,
      id: settings.id,
      delay: settings.delay,
      hoverIntent: settings.hoverIntent,
    });
  }

  /**
   * 创建 Tooltip 内容容器。
   * @private
   * @param {TooltipOptions} settings 已归一化配置。
   * @returns {HTMLElement}
   */
  _buildTooltipContainer(settings) {
    const content = jsx('div', {
      className: 'tooltip-message',
      children: settings.message,
    });

    const _class = settings.className
      ? `j-tooltip ${settings.className}`
      : `j-tooltip`;
    const wrapper = jsx('div', {
      className: _class,
      children: content,
    });

    return wrapper;
  }

  /**
   * 展示提示。
   * @param {boolean} [useDelay=true] 是否应用展示延迟。
   * @returns {void}
   */
  show(useDelay = true) {
    this.drop.show(useDelay);
  }

  /**
   * 隐藏提示。
   * @param {boolean} [useDelay=true] 是否应用隐藏延迟。
   * @returns {void}
   */
  hide(useDelay = true) {
    this.drop.hide(useDelay);
  }

  /**
   * 切换提示显示状态。
   * @returns {void}
   */
  toggle() {
    this.drop.toggle();
  }

  /**
   * 销毁当前提示实例。
   * @returns {void}
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this.drop?.destroy();
    this.drop = null;
    this.options = null;
  }
}

export default Tooltip;

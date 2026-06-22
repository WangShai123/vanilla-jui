import { jsx } from 'vanilla-signal';

import { resolveProps } from '../utilities/core.js';
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
 * Tooltip 提示组件。
 *
 * 基于 Drop 实现，提供更轻量的文本提示封装。
 */
class Tooltip {
  /**
   * 创建 Tooltip 实例。
   * @param {HTMLElement} element 目标元素。
   * @param {object} [props={}] 提示配置。
   */
  constructor(element, props = {}) {
    const settings = resolveProps(
      props,
      TOOLTIP_OPTIONS_SCHEMA,
      'Tooltip.props'
    );

    this.drop = new Drop(element, {
      ...settings,
      content: this._buildContent(settings),
    });
  }

  /**
   * 创建 Tooltip 内容节点。
   * @private
   */
  _buildContent(settings) {
    const cls = settings.className
      ? `j-tooltip ${settings.className}`
      : 'j-tooltip';
    return jsx('div', {
      className: cls,
      children: jsx('div', {
        className: 'tooltip-message',
        children: settings.message,
      }),
    });
  }

  show(useDelay = true) {
    this.drop.show(useDelay);
  }

  hide(useDelay = true) {
    this.drop.hide(useDelay);
  }

  toggle() {
    this.drop.toggle();
  }

  destroy() {
    if (!this.drop) return;
    this.drop.destroy();
    this.drop = null;
  }
}

export default Tooltip;

import { jsx } from 'vanilla-signal';

import { randomId, resolveProps } from '../utilities/core.js';
import {
  isNode,
  isRenderableContent,
  normalizeContentNodes,
  requireRenderDOM,
  resolveElement,
} from '../utilities/dom.js';
import { createEventManager } from '../utilities/events.js';

const DROP_PROPS_SCHEMA = {
  name: { default: null, types: ['string', 'null'] },
  mode: { default: 'click', type: 'string', enum: ['hover', 'click'] },
  position: {
    default: 'auto',
    type: 'string',
    enum: [
      'auto',
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'left',
      'right',
    ],
  },
  offset: {
    default: 10,
    type: 'number',
    validate: (value) => value >= 0,
    message: 'expects a positive number or 0.',
  },
  content: {
    default: '',
    validate: isRenderableContent,
    message: 'expects string, Node, array, function or null.',
  },
  className: { default: null, types: ['string', 'null'] },
  id: {
    default: null,
    types: ['string', 'null'],
    normalize: (value) => {
      if (typeof value === 'string')
        return value.trim() ? value.trim() : randomId();
      if (value == null) return randomId();
      return value;
    },
  },
  containerClassName: { default: null, types: ['string', 'null'] },
  delay: { default: 0, types: ['number', 'object'] },
  hoverIntent: { default: true, type: 'boolean' },
  onShown: { default: null, types: ['function', 'null'] },
  onHidden: { default: null, types: ['function', 'null'] },
};

/**
 * @typedef {object} DropProps
 * @property {string|null} [name] 浮层名称，写入 data-drop。
 * @property {"hover"|"click"} [mode="click"] 触发方式。
 * @property {"auto"|"top-left"|"top-center"|"top-right"|"bottom-left"|"bottom-center"|"bottom-right"|"left"|"right"} [position="auto"] 浮层位置。
 * @property {number} [offset=10] 浮层与触发元素的间距。
 * @property {string|Node|Node[]|Function|null} [content=""] 浮层内容。
 * @property {string|null} [className] 浮层额外类名。
 * @property {string|null} [id] 浮层 id，不传时自动生成。
 * @property {string|null} [containerClassName] 内容容器额外类名。
 * @property {number|{show?:number,hide?:number}} [delay=0] 展示/隐藏延迟。
 * @property {boolean} [hoverIntent=true] hover 模式下是否启用意图判断，减少误触发。
 * @property {Function|null} [onShown] 展示后回调。
 * @property {Function|null} [onHidden] 隐藏后回调。
 */

/**
 * 通用浮层组件。
 *
 * 可用于菜单、提示、下拉面板等场景，支持点击或 hover 触发，并自动计算视口内位置。
 */
class Drop {
  /**
   * 创建浮层实例。
   * @param {Element|Node|string|Array} element 触发元素、选择器或 JSX/h 返回节点。
   * @param {DropProps} [options={}] 浮层配置。
   */
  constructor(element, options = {}) {
    requireRenderDOM('Drop');

    this.target = resolveElement(element, 'Drop.element');
    this.props = resolveProps(options, DROP_PROPS_SCHEMA, 'Drop');
    this._init(this.props);
  }

  _init(props) {
    this.isVisible = false;
    this.root = null;
    this.cleanup = {
      events: createEventManager(),
    };
    this._timer = { show: null, hide: null };
    this._hoverIntentData = { x: 0, y: 0, lastMoveTime: 0 };

    const { delay } = props;
    if (typeof delay === 'number' && delay >= 0) {
      this.delayShow = delay;
      this.delayHide = delay;
    } else if (typeof delay === 'object' && delay !== null) {
      this.delayShow = Number(delay.show) || 0;
      this.delayHide = Number(delay.hide) || 0;
    } else {
      this.delayShow = 0;
      this.delayHide = 0;
    }

    this._buildDrop(props);
    this._bindEvents(props);
  }

  /**
   * 创建浮层 DOM（不挂载到 document）。
   * @private
   */
  _buildDrop(props) {
    const { className, content, id, name, containerClassName } = props;
    const _class = className || '';
    const _wrapper =
      isNode(content) && content.nodeType === 1
        ? content
        : jsx('div', {
            className: containerClassName
              ? `drop-container ${containerClassName}`
              : 'drop-container',
            children: normalizeContentNodes(content, this),
          });

    this.root = jsx('div', {
      className: _class ? `j-drop ${_class}` : 'j-drop',
      id: id,
      'data-drop': name || randomId(),
      children: _wrapper,
    });
  }

  /**
   * 按触发模式绑定事件（仅 target 和 document）。
   * @private
   */
  _bindEvents(props) {
    const { mode, hoverIntent } = props;
    this._unbindEvents();

    if (mode === 'hover') {
      if (hoverIntent) {
        this.cleanup.events.on('target:enter', this.target, 'mouseenter', () =>
          this._startHoverIntent()
        );
        this.cleanup.events.on('target:leave', this.target, 'mouseleave', () =>
          this._cancelHoverIntent()
        );
      } else {
        this.cleanup.events.on('target:enter', this.target, 'mouseenter', () =>
          this.show()
        );
        this.cleanup.events.on('target:leave', this.target, 'mouseleave', () =>
          this.hide()
        );
      }
    } else if (mode === 'click') {
      this.cleanup.events.on('target:click', this.target, 'click', () =>
        this.toggle()
      );
      this.cleanup.events.on('document:click', document, 'click', (event) =>
        this._docClick(event)
      );
    }
  }

  /**
   * 绑定 root 浮层的 hover 事件（show 时调用）。
   * @private
   */
  _bindRootEvents() {
    if (!this.root || this.props.mode !== 'hover') return;
    this.cleanup.events.on('root:enter', this.root, 'mouseenter', () =>
      this.show()
    );
    this.cleanup.events.on('root:leave', this.root, 'mouseleave', () =>
      this.hide()
    );
  }

  /**
   * 解绑 root 浮层的 hover 事件（hide 时调用）。
   * @private
   */
  _unbindRootEvents() {
    this.cleanup.events.off('root:enter');
    this.cleanup.events.off('root:leave');
  }

  /**
   * 解绑当前实例的触发事件。
   * @private
   * @returns {void}
   */
  _unbindEvents() {
    this.cleanup?.events.clear();
  }

  /**
   * 启动 hoverIntent 检测。
   * @private
   * @returns {void}
   */
  _startHoverIntent() {
    this.cleanup.events.on('document:mousemove', document, 'mousemove', (e) =>
      this._onMouseMove(e)
    );
    clearTimeout(this._timer.show);
    this._timer.show = setTimeout(() => {
      const now = Date.now();
      const dt = now - this._hoverIntentData.lastMoveTime;
      const dx = Math.abs(this._hoverIntentData.x - this._lastX || 0);
      const dy = Math.abs(this._hoverIntentData.y - this._lastY || 0);
      const dist = dx + dy;
      if (dist < 5 || dt > 100) {
        this.show();
        this.cleanup.events.off('document:mousemove');
      } else {
        // 继续检测 hover 意图。
        this._startHoverIntent();
      }
    }, this.delayShow);
  }

  /**
   * 取消 hoverIntent 检测并隐藏浮层。
   * @private
   * @returns {void}
   */
  _cancelHoverIntent() {
    clearTimeout(this._timer.show);
    this.cleanup.events.off('document:mousemove');
    this.hide();
  }

  /**
   * 记录 hoverIntent 所需的鼠标移动状态。
   * @private
   * @param {MouseEvent} e 鼠标移动事件。
   * @returns {void}
   */
  _onMouseMove(e) {
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this._hoverIntentData.lastMoveTime = Date.now();
    this._hoverIntentData.x = e.clientX;
    this._hoverIntentData.y = e.clientY;
  }

  /**
   * 计算并设置浮层位置。
   * @private
   * @returns {void}
   */
  _setPosition() {
    const rect = this.target.getBoundingClientRect();
    const drop = this.root;
    const { offset, position } = this.props;

    drop.style.visibility = 'hidden';
    drop.style.display = 'block';
    const dropRect = drop.getBoundingClientRect();
    let top = 0;
    let left = 0;

    // auto 模式优先尝试上方居中，不够空间时放到下方居中。
    let pos = position;
    if (pos === 'auto') {
      const spaceBelow = window.innerHeight - rect.bottom;
      pos =
        spaceBelow > dropRect.height + offset ? 'top-center' : 'bottom-center';
    }

    switch (pos) {
      case 'top-left':
        top = rect.top - dropRect.height - offset;
        left = rect.left;
        break;
      case 'top-center':
        top = rect.top - dropRect.height - offset;
        left = rect.left + rect.width / 2 - dropRect.width / 2;
        break;
      case 'top-right':
        top = rect.top - dropRect.height - offset;
        left = rect.right - dropRect.width;
        break;
      case 'bottom-left':
        top = rect.bottom + offset;
        left = rect.left;
        break;
      case 'bottom-center':
        top = rect.bottom + offset;
        left = rect.left + rect.width / 2 - dropRect.width / 2;
        break;
      case 'bottom-right':
        top = rect.bottom + offset;
        left = rect.right - dropRect.width;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - dropRect.height / 2;
        left = rect.left - dropRect.width - offset;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - dropRect.height / 2;
        left = rect.right + offset;
        break;
      default:
        break;
    }

    // 限制在视口内。
    top = Math.max(8, Math.min(top, window.innerHeight - dropRect.height - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - dropRect.width - 8));

    drop.style.top = `${top + window.scrollY}px`;
    drop.style.left = `${left + window.scrollX}px`;
    drop.style.visibility = '';
    drop.style.display = '';
  }

  _docClick(e) {
    if (!this.root.contains(e.target) && !this.target.contains(e.target)) {
      this.hide();
    }
  }

  /**
   * 应用展示或隐藏状态。
   * @private
   */
  _exec(visible) {
    if (!this.root) return;

    if (visible) {
      if (!this.root.parentNode) document.body.appendChild(this.root);
      this._bindRootEvents();
      this._setPosition();
    } else {
      this._unbindRootEvents();
      this.root.style.top = '';
      this.root.style.left = '';
      if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
    }

    this.root.classList.toggle('is-active', visible);
    this.isVisible = visible;
  }

  // ========== 公开 API ==========

  /**
   * 展示浮层。
   * @param {boolean} [useDelay=true] 是否应用展示延迟。
   * @returns {void}
   */
  show(useDelay = true) {
    clearTimeout(this._timer.hide);
    if (this.isVisible) return;

    if (useDelay && this.delayShow > 0) {
      clearTimeout(this._timer.show);
      this._timer.show = setTimeout(() => this._exec(true), this.delayShow);
    } else {
      this._exec(true);
    }

    if (this.props.onShown) this.props.onShown();
  }

  /**
   * 隐藏浮层。
   * @param {boolean} [useDelay=true] 是否应用隐藏延迟。
   * @returns {void}
   */
  hide(useDelay = true) {
    clearTimeout(this._timer.show);
    if (!this.isVisible) return;

    if (useDelay && this.delayHide > 0) {
      clearTimeout(this._timer.hide);
      this._timer.hide = setTimeout(() => this._exec(false), this.delayHide);
    } else {
      this._exec(false);
    }

    if (this.props.onHidden) this.props.onHidden();
  }

  /**
   * 切换浮层显示状态。
   * @returns {void}
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 销毁当前浮层实例并移除 DOM。
   * @returns {void}
   */
  destroy() {
    if (!this.props) return;

    clearTimeout(this._timer?.show);
    clearTimeout(this._timer?.hide);

    this._unbindEvents();
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);

    this.props = null;
    this.root = null;
    this.target = null;
    this._timer = { show: null, hide: null };
    this.cleanup?.events.clear();
    this.cleanup = null;
  }
}

export default Drop;

export function createDrop(container, input = {}) {
  return new Drop(container, input);
}

import { jsx } from 'vanilla-signal';

import { randomId, resolveOptions } from '../utilities/core.js';
import {
  canRenderDOM,
  isRenderableContent,
  normalizeContentNodes,
} from '../utilities/dom.js';
import { createEventManager } from '../utilities/events.js';

const OFFCANVAS_OPTIONS_SCHEMA = {
  content: {
    default: '',
    validate: isRenderableContent,
    message: 'expects string, Node, array, function or null.',
  },
  overlay: { default: true, type: 'boolean' },
  filter: { default: true, type: 'boolean' },
  direction: {
    default: 'left',
    type: 'string',
    enum: ['top', 'right', 'bottom', 'left'],
  },
  animation: {
    default: 'slide',
    type: 'string',
    enum: ['slide', 'push', 'none'],
  },
  bgClose: { default: true, type: 'boolean' },
  escClose: { default: true, type: 'boolean' },
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
  onShow: { default: null, types: ['function', 'null'] },
  onShown: { default: null, types: ['function', 'null'] },
  onHide: { default: null, types: ['function', 'null'] },
  onHidden: { default: null, types: ['function', 'null'] },
};

/**
 * @typedef {object} OffcanvasOptions
 * @property {string|Node|Node[]|Function|null} [content=""] 面板内容，字符串会按 HTML 片段渲染。
 * @property {boolean} [overlay=true] 是否展示遮罩层。
 * @property {boolean} [filter=true] 遮罩层是否启用模糊滤镜。
 * @property {"top"|"right"|"bottom"|"left"} [direction="left"] 面板滑出方向。
 * @property {"slide"|"push"|"none"} [animation="slide"] 面板动画类型。
 * @property {boolean} [bgClose=true] 是否允许点击遮罩关闭。
 * @property {boolean} [escClose=true] 是否允许按 Esc 关闭。
 * @property {string|null} [id] 面板 id，不传时自动生成。
 * @property {Function|null} [onShow] 展示前回调，支持 Promise。
 * @property {Function|null} [onShown] 展示后回调。
 * @property {Function|null} [onHide] 隐藏前回调，支持 Promise。
 * @property {Function|null} [onHidden] 隐藏后回调。
 */

/**
 * 侧滑面板组件。
 *
 * 适用于侧边菜单、筛选面板、移动端抽屉等场景。
 */
class Offcanvas {
  /**
   * 创建侧滑面板实例。
   * @param {OffcanvasOptions} [options={}] 面板配置。
   */
  constructor(options = {}) {
    if (!canRenderDOM()) {
      throw new Error('Offcanvas: DOM render environment is required.');
    }

    this.options = resolveOptions(
      options,
      OFFCANVAS_OPTIONS_SCHEMA,
      'Offcanvas.options'
    );
    this._init(this.options);
  }

  /**
   * 初始化实例状态与 DOM。
   * @private
   * @param {OffcanvasOptions} options 已归一化配置。
   * @returns {void}
   */
  _init(options) {
    this.isVisible = false;
    if (options.overlay) this._overlay = this._buildOverlay(options);
    this.root = this._buildRoot(options);
    this.cleanup = {
      events: createEventManager(),
    };
    this._removeTimer = null;
    this._showTimer = null;
    this._shownTimer = null;
    this._destroyed = false;
  }

  /**
   * 处理 Esc 关闭。
   * @private
   * @param {KeyboardEvent} e 键盘事件。
   * @returns {void}
   */
  _esc(e) {
    if (e.key === 'Escape' && this.isVisible) {
      void this.hide();
    }
  }

  /**
   * 绑定关闭相关事件。
   * @private
   * @returns {void}
   */
  _bindEvents() {
    const { bgClose, escClose } = this.options;
    this._unbindEvents();

    if (this._overlay && bgClose) {
      this.cleanup.events.on('overlay', this._overlay, 'click', () => {
        void this.hide();
      });
    }
    if (escClose) {
      this.cleanup.events.on('esc', document, 'keydown', (e) => this._esc(e));
    }
    this.cleanup.events.on('close', this.root, 'click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'close' || action === 'cancel') {
        void this.hide();
      }
    });
  }

  /**
   * 解绑关闭相关事件。
   * @private
   * @returns {void}
   */
  _unbindEvents() {
    this.cleanup?.events.clear();
  }

  /**
   * 创建遮罩层。
   * @private
   * @param {OffcanvasOptions} options 已归一化配置。
   * @returns {HTMLElement}
   */
  _buildOverlay(options) {
    const f = options.filter;
    const k = f ? 'backdropFilter' : '';
    const v = f ? 'blur(2px)' : '';
    return jsx('div', {
      className: 'j-offcanvas-overlay',
      style: f ? { [k]: v } : {},
    });
  }

  /**
   * 创建侧滑面板根节点。
   * @private
   * @param {OffcanvasOptions} options 已归一化配置。
   * @returns {HTMLElement}
   */
  _buildRoot(options) {
    const { id, direction, animation, content } = options;

    const _direction = direction ? `is-${direction}` : '';
    const _animation = animation ? `is-${animation}` : '';

    return jsx('div', {
      className: `j-offcanvas ${_direction} ${_animation}`,
      id: id,
      children: jsx('div', {
        className: 'offcanvas-content',
        children: normalizeContentNodes(content, this),
      }),
    });
  }

  /**
   * 将面板挂载到页面并触发展示动画。
   * @private
   * @returns {void}
   */
  _render() {
    const { overlay, animation, direction } = this.options;
    if (overlay) {
      document.body.appendChild(this._overlay);
    }
    document.body.appendChild(this.root);

    document.body.style.overflow = 'hidden';
    if (animation === 'push') {
      document.body.classList.add('offcanvas-push-body');
      const y = window.scrollY;
      if (this._overlay) this._overlay.style.top = `${y}px`;
      this.root.style.top = `${y}px`;
    }

    clearTimeout(this._showTimer);
    this._showTimer = setTimeout(() => {
      if (!this.root) return;
      if (this._overlay) this._overlay.classList.add('is-active');
      if (animation === 'push') {
        document.body.classList.add(`offcanvas-push-${direction}`);
      }
      this.root.classList.add('is-active');
      this._showTimer = null;
    }, 10);
  }
  /**
   * 触发隐藏动画并移除 DOM。
   * @private
   * @returns {void}
   */
  _remove() {
    const { animation, direction } = this.options;
    if (this._overlay)
      // 移除激活类以触发隐藏动画。
      this._overlay.classList.remove('is-active');
    this.root.classList.remove('is-active');

    if (animation === 'push') {
      // 移除 push 模式相关类名。
      document.body.classList.remove(`offcanvas-push-${direction}`);
    }

    clearTimeout(this._removeTimer);
    this._removeTimer = setTimeout(() => {
      if (this._overlay && this._overlay.parentNode) {
        this._overlay.parentNode.removeChild(this._overlay);
      }
      if (this.root && this.root.parentNode) {
        this.root.parentNode.removeChild(this.root);
      }
      if (animation === 'push') {
        document.body.classList.remove('offcanvas-push-body');
      }
      document.body.style.overflow = '';
      this._removeTimer = null;
    }, 100);
  }

  /**
   * 展示侧滑面板。
   * @returns {Promise<void>}
   */
  async show() {
    if (this._destroyed) return;

    const { onShow, onShown } = this.options;

    if (this.isVisible) return;

    // 执行 onShow，支持 Promise。
    if (onShow) await Promise.resolve(onShow());

    this._render();
    this._bindEvents();

    this.isVisible = true;

    // 动画结束后触发 onShown。
    clearTimeout(this._shownTimer);
    this._shownTimer = setTimeout(() => {
      if (this._destroyed) return;
      if (onShown) onShown();
      this._shownTimer = null;
    }, 100);
  }

  /**
   * 隐藏侧滑面板。
   * @returns {Promise<void>}
   */
  async hide() {
    if (this._destroyed) return;

    const { onHide, onHidden } = this.options;
    if (!this.isVisible) return;

    // 执行 onHide，支持 Promise。
    if (onHide) await Promise.resolve(onHide());

    this._unbindEvents();
    this._remove();

    this.isVisible = false;
    if (onHidden) onHidden();
  }

  /**
   * 销毁当前侧滑面板实例。
   * @returns {void}
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    const wasVisible = this.isVisible;
    clearTimeout(this._removeTimer);
    clearTimeout(this._showTimer);
    clearTimeout(this._shownTimer);
    if (wasVisible) {
      this._unbindEvents();
      this.root?.classList.remove('is-active');
    }
    this.root?.parentNode?.removeChild(this.root);
    this._overlay?.parentNode?.removeChild(this._overlay);
    document.body.style.overflow = '';
    document.body.classList.remove(
      'offcanvas-push-body',
      `offcanvas-push-${this.options.direction}`
    );
    this.options = null;
    this.root = null;
    this._overlay = null;
    this.cleanup?.events.clear();
    this.cleanup = null;
    this._removeTimer = null;
    this._showTimer = null;
    this._shownTimer = null;
    this.isVisible = null;
  }
}

export default Offcanvas;

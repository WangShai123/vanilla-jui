import { createDeepStore, flushSync, jsx } from 'vanilla-signal';

import Component from '../core/Component.js';
import { randomId, resolveProps, timer } from '../utilities/core.js';
import {
  canRenderDOM,
  isRenderableContent,
  normalizeContentNodes,
} from '../utilities/dom.js';

const OFFCANVAS_PROPS_SCHEMA = {
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
 * 侧滑面板组件，继承 Component。
 *
 * 适用于侧边菜单、筛选面板、移动端抽屉等场景。
 */
class Offcanvas extends Component {
  /**
   * 创建侧滑面板实例。
   * @param {object} [input={}] 面板配置。
   */
  constructor(input = {}) {
    if (!canRenderDOM()) {
      throw new Error('Offcanvas: DOM render environment is required.');
    }

    const props = resolveProps(input, OFFCANVAS_PROPS_SCHEMA, 'Offcanvas');
    super(props);

    this._overlay = null;

    this.state = createDeepStore({ visible: false });

    this.onInit(props);
  }

  /**
   * 初始化组件。
   * @private
   */
  onInit(props) {
    if (props.overlay) this._overlay = this._buildOverlay(props);
    this.root = this._buildRoot(props);
  }

  _buildOverlay(props) {
    return jsx('div', {
      className: 'j-offcanvas-overlay',
      style: props.filter ? { backdropFilter: 'blur(2px)' } : {},
    });
  }

  _buildRoot(props) {
    return jsx('div', {
      className: `j-offcanvas is-${props.direction} is-${props.animation}`,
      id: props.id,
      children: jsx('div', {
        className: 'offcanvas-content',
        children: normalizeContentNodes(props.content, this),
      }),
    });
  }

  _bindEvents() {
    this.unbindEvents();
    const { bgClose, escClose } = this.props;

    if (this._overlay && bgClose) {
      this.cleanup.events.on('overlay', this._overlay, 'click', () => {
        void this.hide();
      });
    }
    if (escClose) {
      this.cleanup.events.on('esc', document, 'keydown', (e) => {
        if (e.key === 'Escape' && this.state.visible) void this.hide();
      });
    }
    this.cleanup.events.on('close', this.root, 'click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'close' || action === 'cancel') void this.hide();
    });
  }

  unbindEvents() {
    this.cleanup?.events.clear();
  }

  /**
   * 将面板挂载到页面并触发展示动画。
   * @private
   */
  _render() {
    const { overlay, animation, direction, id } = this.props;
    const b = document.body;

    if (overlay) b.appendChild(this._overlay);
    b.appendChild(this.root);

    b.style.overflow = 'hidden';
    if (animation === 'push') {
      b.classList.add('offcanvas-push-body');
    }

    timer.start(`oc-show-${id}`, 10, () => {
      if (!this.root) return;
      if (this._overlay) this._overlay.classList.add('is-active');
      if (animation === 'push') {
        b.classList.add(`offcanvas-push-${direction}`);
      }
      this.root.classList.add('is-active');
    });
  }

  /**
   * 触发隐藏动画并移除 DOM。
   * @private
   */
  _remove() {
    const { animation, direction, id } = this.props;
    const b = document.body;

    if (this._overlay) this._overlay.classList.remove('is-active');
    this.root.classList.remove('is-active');

    if (animation === 'push') {
      b.classList.remove(`offcanvas-push-${direction}`);
    }

    timer.start(`oc-remove-${id}`, 100, () => {
      this._overlay?.parentNode?.removeChild(this._overlay);
      this.root?.parentNode?.removeChild(this.root);
      if (animation === 'push') {
        b.classList.remove('offcanvas-push-body');
      }
      b.style.overflow = '';
    });
  }

  /**
   * 展示侧滑面板。
   * @returns {Promise<void>}
   */
  async show() {
    if (this.runtime.destroyed || this.state.visible) return;

    const { onShow, onShown, id } = this.props;
    if (onShow) await Promise.resolve(onShow());

    this._render();
    this._bindEvents();

    flushSync(() => {
      this.state.visible = true;
    });

    timer.start(`oc-shown-${id}`, 300, () => {
      if (this.runtime.destroyed) return;
      if (onShown) onShown();
    });
  }

  /**
   * 隐藏侧滑面板。
   * @returns {Promise<void>}
   */
  async hide() {
    if (this.runtime.destroyed || !this.state.visible) return;

    const { onHide, onHidden } = this.props;
    if (onHide) await Promise.resolve(onHide());

    this.unbindEvents();
    this._remove();

    flushSync(() => {
      this.state.visible = false;
    });

    if (onHidden) onHidden();
  }

  /**
   * 销毁当前侧滑面板实例。
   */
  onDestroy() {
    const { id } = this.props;

    timer.cancel(`oc-show-${id}`);
    timer.cancel(`oc-remove-${id}`);
    timer.cancel(`oc-shown-${id}`);

    if (this.state.visible) this.unbindEvents();

    this.root?.classList.remove('is-active');
    this.root?.parentNode?.removeChild(this.root);
    this._overlay?.parentNode?.removeChild(this._overlay);

    const b = document.body;
    b.style.overflow = '';
    b.classList.remove(
      'offcanvas-push-body',
      `offcanvas-push-${this.props.direction}`
    );

    this._overlay = null;
  }

  destroy() {
    if (this.runtime.destroyed) return;
    this.onDestroy();
    super.destroy();
  }
}

export default Offcanvas;

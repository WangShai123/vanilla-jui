import {
  bindAttr,
  bindClass,
  createDeepStore,
  createRoot,
  flushSync,
  insert,
  jsx,
} from 'vanilla-signal';

import Component from '../core/Component.js';
import { randomId, resolveProps, validateParam } from '../utilities/core.js';
import {
  canRenderDOM,
  isRenderableContent,
  normalizeContentNodes,
  q,
  resolveContainer,
} from '../utilities/dom.js';

const TABS_PROPS_SCHEMA = {
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
  direction: {
    default: 'top',
    type: 'string',
    enum: ['top', 'bottom', 'left', 'right'],
  },
  active: { default: 0, types: ['number', 'string'] },
  disabled: { default: [], types: ['number', 'string', 'array'] },
  onChange: { default: null, types: ['function', 'null'] },
  tabs: { default: [], type: 'array' },
  onAdd: { default: null, types: ['function', 'null'] },
  onRemove: { default: null, types: ['function', 'null'] },
};

const TAB_CONFIG_RULE = {
  type: 'object',
  validate: (value) =>
    !!value &&
    isRenderableContent(value.title) &&
    isRenderableContent(value.panel),
  message:
    'expects an object with renderable title and panel: string, Node, array, function or null.',
};

function cloneTabItems(tabs) {
  return Array.isArray(tabs) ? tabs.map((t) => ({ ...t })) : [];
}

/**
 * 标签页组件，继承 Component。
 *
 * DOM 创建一次，通过 createEffect 细粒度更新 class/ARIA。
 */
class Tabs extends Component {
  /**
   * @param {HTMLElement|string} container 挂载容器（元素或 CSS 选择器）。
   * @param {object} [input={}] 标签页配置。
   */
  constructor(container, input = {}) {
    if (!canRenderDOM()) {
      throw new Error('Tabs: DOM render environment is required.');
    }

    const el = resolveContainer(container, 'Tabs');

    const props = resolveProps(input, TABS_PROPS_SCHEMA, 'Tabs');
    super(props);

    this.container = el;

    this.state = createDeepStore({
      activeIndex: -1,
      disabledNames: this._parseDisabled(props.disabled),
      isVertical: props.direction === 'left' || props.direction === 'right',
      draggable: false,
    });

    try {
      this.onInit(props);
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  onInit(props) {
    this.root = this.buildRoot(props);
    this.rebuildItems();
    void this._activate(props.active, false);
    this.bindEvents();

    this._initDrag();
  }

  buildRoot(props) {
    const { id, direction } = props;
    const nav = jsx('nav', { className: 'tab-list' });
    const wrap = jsx('div', { className: 'tab-wrap', children: nav });
    const panelWrapper = jsx('div', { className: 'tab-panel' });

    return jsx('div', {
      className: `j-tabs is-${direction}`,
      id,
      children: [wrap, panelWrapper],
    });
  }

  /**
   * 清空 root 内容并重建 tab-list 和 tab-panel。
   * @private
   */
  rebuildItems() {
    const tabList = q('.tab-list', this.root);
    const panelWrapper = q('.tab-panel', this.root);
    if (!tabList || !panelWrapper) return;

    tabList.textContent = '';
    panelWrapper.textContent = '';

    this.dom.tabs = [];
    this.dom.panels = [];

    const tabFragment = document.createDocumentFragment();
    const panelFragment = document.createDocumentFragment();

    this.props.tabs.forEach((item) => {
      const name = item.name || randomId();

      const title = jsx('span');
      title.append(...normalizeContentNodes(item.title, { tabs: this, item }));

      const tab = jsx('div', {
        className: 'tab-item',
        'data-tab': name,
        children: title,
      });

      const panel = jsx('div');
      panel.append(...normalizeContentNodes(item.panel, { tabs: this, item }));

      const panelItem = jsx('div', {
        className: 'panel-item',
        role: 'tabpanel',
        children: panel,
      });

      this.dom.tabs.push(tab);
      this.dom.panels.push(panelItem);
      tabFragment.append(tab);
      panelFragment.append(panelItem);
    });

    tabList.append(tabFragment);
    panelWrapper.append(panelFragment);

    this.cleanup.bindings?.();
    this.cleanup.bindings = createRoot((dispose) => {
      this.dom.tabs.forEach((tab, index) => {
        const name = tab.dataset.tab;
        bindClass(tab, 'is-active', () => this.state.activeIndex === index);
        bindClass(
          tab,
          'is-disabled',
          () => this.state.disabledNames.includes(name)
        );
        bindAttr(
          tab,
          'aria-selected',
          () => this.state.activeIndex === index
        );
        bindAttr(
          tab,
          'aria-disabled',
          () => this.state.disabledNames.includes(name)
        );
      });
      this.dom.panels.forEach((panel, index) => {
        bindClass(panel, 'is-active', () => this.state.activeIndex === index);
        bindAttr(
          panel,
          'aria-hidden',
          () => this.state.activeIndex !== index
        );
      });
      return dispose;
    });
  }

  _parseDisabled(disabled) {
    if (disabled == null) return [];
    const toName = (val) => {
      if (typeof val === 'number') return this.props.tabs[val]?.name || null;
      if (typeof val === 'string') return val;
      return null;
    };
    if (Array.isArray(disabled)) {
      return disabled.map(toName).filter(Boolean);
    }
    const name = toName(disabled);
    return name ? [name] : [];
  }

  bindEvents() {
    this.unbindEvents();

    const tabList = q('.tab-list', this.root);
    if (!tabList) return;

    this.cleanup.events.on('tabClick', tabList, 'click', (e) => {
      const tab = e.target.closest('.tab-item');
      if (!tab) return;
      const name = tab.dataset.tab;
      if (name && !this.state.disabledNames.includes(name)) {
        void this.activate(name);
      }
    });
  }

  unbindEvents() {
    this.cleanup.events.clear();
  }

  assertActive(method) {
    if (this.runtime.destroyed) {
      throw new Error(`Tabs.${method}: instance has been destroyed.`);
    }
  }

  _getIndex(val) {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      return this.dom.tabs.findIndex((tab) => tab.dataset.tab === val);
    }
    return -1;
  }

  async _activate(val, fireEvent = true) {
    const index = this._getIndex(val);
    if (
      index < 0 ||
      index >= this.dom.tabs.length ||
      this.state.disabledNames.includes(this.dom.tabs[index]?.dataset.tab) ||
      this.state.activeIndex === index
    ) {
      return;
    }

    flushSync(() => {
      this.state.activeIndex = index;
    });

    if (fireEvent && this.props.onChange) {
      const tabEl = this.dom.tabs[index];
      const panelEl = this.dom.panels[index];
      await Promise.resolve(
        this.props.onChange(index, tabEl?.dataset.tab || index, tabEl, panelEl)
      );
    }
  }

  /**
   * 激活指定标签。
   * @param {number|string} val 标签索引或 `data-tab` 名称。
   */
  async activate(val) {
    this.assertActive('activate');
    await this._activate(val, true);
  }

  /**
   * 将组件挂载到构造器指定的容器中。
   */
  render() {
    this.assertActive('render');
    insert(this.container, () => this.root);
  }

  /**
   * 动态新增标签。
   * @param {object} tabConfig 标签配置。
   */
  async add(tabConfig) {
    this.assertActive('add');
    validateParam('tabConfig', tabConfig, TAB_CONFIG_RULE, 'Tabs.add');

    tabConfig.name = tabConfig.name || randomId();
    this.props.tabs = [...cloneTabItems(this.props.tabs), tabConfig];

    this.rebuildItems();
    this.syncActiveNames(this.resolveActiveNames(this.props.active));
    this.bindEvents();

    this._refreshDrag();

    const { onAdd } = this.props;
    if (onAdd) {
      const index = this.props.tabs.length - 1;
      await Promise.resolve(
        onAdd(index, tabConfig, this.dom.tabs[index], this.dom.panels[index])
      );
    }
  }

  /**
   * 根据索引或名称删除标签。
   * @param {number|string} val 标签索引或 `data-tab` 名称。
   */
  async delete(val) {
    this.assertActive('delete');
    if (this.props.tabs.length <= 1) return;

    const index = this._getIndex(val);
    if (index < 0 || index >= this.props.tabs.length) return;

    const removedName = this.props.tabs[index].name;
    const { onRemove } = this.props;

    this.props.tabs = this.props.tabs.filter((_, i) => i !== index);

    if (this.state.activeIndex >= this.props.tabs.length) {
      flushSync(() => {
        this.state.activeIndex = this.props.tabs.length - 1;
      });
    } else if (this.state.activeIndex > index) {
      flushSync(() => {
        this.state.activeIndex = this.state.activeIndex - 1;
      });
    }

    this.rebuildItems();
    this.bindEvents();

    this._refreshDrag();

    if (onRemove) {
      await Promise.resolve(onRemove(index, removedName));
    }
  }

  /**
   * 根据索引或名称禁用标签。
   * @param {number|string} val 标签索引或 `data-tab` 名称。
   */
  disable(val) {
    this.assertActive('disable');
    const name =
      typeof val === 'number' ? this.dom.tabs[val]?.dataset.tab : val;
    if (name && !this.state.disabledNames.includes(name)) {
      flushSync(() => {
        this.state.disabledNames = [...this.state.disabledNames, name];
      });
    }
  }

  /**
   * 根据索引或名称启用标签。
   * @param {number|string} val 标签索引或 `data-tab` 名称。
   */
  enable(val) {
    this.assertActive('enable');
    const name =
      typeof val === 'number' ? this.dom.tabs[val]?.dataset.tab : val;
    if (name) {
      flushSync(() => {
        this.state.disabledNames = this.state.disabledNames.filter(
          (n) => n !== name
        );
      });
    }
  }

  resolveActiveNames(active) {
    if (active == null) return -1;
    if (typeof active === 'number') return active;
    if (typeof active === 'string') {
      return this.dom.tabs.findIndex((tab) => tab.dataset.tab === active);
    }
    return 0;
  }

  syncActiveNames(index) {
    flushSync(() => {
      this.state.activeIndex = index;
    });
  }

  /**
   * 使用新配置重新初始化状态。
   * @param {object} [patch={}] 需要覆盖的配置。
   */
  async reInit(patch = {}) {
    this.assertActive('reInit');
    Object.assign(this.props, resolveProps(patch, TABS_PROPS_SCHEMA, 'Tabs'));

    flushSync(() => {
      this.state.disabledNames = this._parseDisabled(this.props.disabled);
    });

    this.rebuildItems();
    this.syncActiveNames(this.resolveActiveNames(this.props.active));
    this.bindEvents();

    this._refreshDrag();
  }

  // ========== 拖拽相关 ==========

  get _dragContainer() {
    return this.root ? q('.tab-wrap', this.root) : null;
  }

  get _dragInner() {
    return this.root ? q('.tab-list', this.root) : null;
  }

  _initDrag() {
    const { direction } = this.props;
    if (!this._dragContainer || !this._dragInner) return;

    const isVertical = direction === 'left' || direction === 'right';
    const draggable = isVertical
      ? this._dragInner.scrollHeight > this._dragContainer.clientHeight + 5
      : this._dragInner.scrollWidth > this._dragContainer.clientWidth + 5;

    flushSync(() => {
      this.state.isVertical = isVertical;
      this.state.draggable = draggable;
    });

    if (!draggable) {
      this._removeDragEvents();
      return;
    }

    this._bindDragEvents();

    this.cleanup.events.on('resize', window, 'resize', () => {
      cancelAnimationFrame(this._resizeRaf);
      this._resizeRaf = requestAnimationFrame(() => {
        this._refreshDrag();
      });
    });
  }

  _bindDragEvents() {
    this._removeDragEvents();

    const container = this._dragContainer;
    const inner = this._dragInner;
    const isVertical = this.state.isVertical;

    let posStart = 0;
    let scrollStart = 0;
    let lastPos = 0;
    let frameRequested = false;

    const getPos = (e) =>
      isVertical
        ? e.touches
          ? e.touches[0].pageY
          : e.pageY
        : e.touches
          ? e.touches[0].pageX
          : e.pageX;

    const onDragStart = (e) => {
      this.isDragging = true;
      inner.classList.add('dragging');
      posStart = getPos(e);
      lastPos = posStart;
      scrollStart = isVertical ? container.scrollTop : container.scrollLeft;
      this._velocity = 0;
      cancelAnimationFrame(this.raf);
    };

    const onDragMove = (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      const current = getPos(e);
      const dist = posStart - current;
      this._velocity = lastPos - current;
      lastPos = current;

      if (!frameRequested) {
        frameRequested = true;
        requestAnimationFrame(() => {
          frameRequested = false;
          if (isVertical) {
            container.scrollTop = scrollStart + dist;
          } else {
            container.scrollLeft = scrollStart + dist;
          }
        });
      }
    };

    const onDragEnd = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      inner.classList.remove('dragging');
      this._startInertiaScroll();
    };

    this.cleanup.events.on('drag:mousedown', inner, 'mousedown', onDragStart);
    this.cleanup.events.on(
      'drag:touchstart',
      inner,
      'touchstart',
      onDragStart,
      { passive: true }
    );
    this.cleanup.events.on('drag:mousemove', window, 'mousemove', onDragMove, {
      passive: false,
    });
    this.cleanup.events.on('drag:touchmove', window, 'touchmove', onDragMove, {
      passive: false,
    });
    this.cleanup.events.on('drag:mouseup', window, 'mouseup', onDragEnd);
    this.cleanup.events.on('drag:touchend', window, 'touchend', onDragEnd);
  }

  _startInertiaScroll() {
    const container = this._dragContainer;
    let v = this._velocity;
    const isVertical = this.state.isVertical;
    let last = performance.now();

    const step = (now) => {
      const dt = now - last;
      last = now;
      v *= 0.92;
      if (Math.abs(v) < 0.3) return;
      if (isVertical) {
        container.scrollTop += v * dt * 0.05;
      } else {
        container.scrollLeft += v * dt * 0.05;
      }
      this.raf = requestAnimationFrame(step);
    };

    this.raf = requestAnimationFrame(step);
  }

  _removeDragEvents() {
    this.cleanup.events.off('drag:mousedown');
    this.cleanup.events.off('drag:touchstart');
    this.cleanup.events.off('drag:mousemove');
    this.cleanup.events.off('drag:touchmove');
    this.cleanup.events.off('drag:mouseup');
    this.cleanup.events.off('drag:touchend');
  }

  _refreshDrag() {
    this._initDrag();
  }

  // ========== 销毁 ==========

  onDestroy() {
    this.unbindEvents();
    this._removeDragEvents();
    this.cleanup.bindings?.();
    this.cleanup.bindings = null;
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this._resizeRaf);
    this.cleanup.events.off('resize');

    if (this.root?.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
  }

  destroy() {
    if (this.runtime.destroyed) return;
    this.onDestroy();
    super.destroy();
  }
}

export default Tabs;

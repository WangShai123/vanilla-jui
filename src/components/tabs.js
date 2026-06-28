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
  isRenderableContent,
  createLoading,
  normalizeContentNodes,
  q,
  requireContainer,
  requireRenderDOM,
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

function normalizeTtl(ttl) {
  return typeof ttl === 'number' && ttl > 0 ? ttl : 0;
}

/**
 * 标签页组件，继承 Component。
 *
 * DOM 创建一次，通过 createEffect 细粒度更新 class/ARIA。
 */
class Tabs extends Component {
  /**
   * @param {Element|Node|string|Array} container 挂载容器（元素、选择器或 JSX/h 返回节点）。
   * @param {object} [input={}] 标签页配置。
   */
  constructor(container, input = {}) {
    requireRenderDOM('Tabs');

    const el = requireContainer(container, 'Tabs');

    const props = resolveProps(input, TABS_PROPS_SCHEMA, 'Tabs');
    super(props);

    this.dom.container = el;

    this.state = createDeepStore({
      current: {
        index: -1,
        name: null,
      },
      disabled: this._parseDisabled(props.disabled),
      isVertical: props.direction === 'left' || props.direction === 'right',
      draggable: false,
      loading: false,
    });

    this.cache = { panels: new Map() };
    this.runtime.panelLoadId = 0;

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
    this.dom.panelBodies = [];

    const tabFragment = document.createDocumentFragment();
    const panelFragment = document.createDocumentFragment();

    this.props.tabs.forEach((item, index) => {
      const name = item.name || randomId();

      const tab = jsx('div', {
        className: 'tab-item',
        'data-tab': name,
        children: jsx('span', {
          children: normalizeContentNodes(item.title, { tabs: this, item }),
        }),
      });

      this.dom.tabs.push(tab);
      const body = jsx('div');
      this.dom.panels.push(
        jsx('div', {
          className: 'panel-item',
          role: 'tabpanel',
          children: body,
        })
      );
      this.dom.panelBodies.push(body);
      if (typeof item.panel !== 'function') {
        body.append(
          ...normalizeContentNodes(item.panel, {
            tabs: this,
            item,
            index,
            name,
          })
        );
      }
      tabFragment.append(tab);
      panelFragment.append(this.dom.panels[this.dom.panels.length - 1]);
    });

    tabList.append(tabFragment);
    panelWrapper.append(panelFragment);

    this.cleanup.bindings?.();
    this.cleanup.bindings = createRoot((dispose) => {
      this.dom.tabs.forEach((tab, index) => {
        const name = tab.dataset.tab;
        bindClass(tab, 'is-active', () => this.state.current.index === index);
        bindClass(tab, 'is-disabled', () =>
          this.state.disabled.names.includes(name)
        );
        bindAttr(
          tab,
          'aria-selected',
          () => this.state.current.index === index
        );
        bindAttr(tab, 'aria-disabled', () =>
          this.state.disabled.names.includes(name)
        );
      });
      this.dom.panels.forEach((panel, index) => {
        bindClass(panel, 'is-active', () => this.state.current.index === index);
        bindAttr(
          panel,
          'aria-hidden',
          () => this.state.current.index !== index
        );
      });
      return dispose;
    });
  }

  _parseDisabled(disabled) {
    if (disabled == null) {
      return {
        names: [],
        indexes: [],
      };
    }
    const toName = (val) => {
      if (typeof val === 'number') return this.props.tabs[val]?.name || null;
      if (typeof val === 'string') return val;
      return null;
    };
    const names = Array.isArray(disabled)
      ? disabled.map(toName).filter(Boolean)
      : (() => {
          const name = toName(disabled);
          return name ? [name] : [];
        })();

    return this._createDisabledState(names);
  }

  _createDisabledState(names) {
    const uniqNames = Array.from(new Set(names));
    return {
      names: uniqNames,
      indexes: uniqNames
        .map((name) => this.props.tabs.findIndex((tab) => tab.name === name))
        .filter((index) => index >= 0),
    };
  }

  _syncCurrent(index) {
    this.state.current = {
      index,
      name:
        index >= 0 && index < this.dom.tabs.length
          ? this.dom.tabs[index]?.dataset.tab || null
          : null,
    };
  }

  _getPanelKey(item, index) {
    return item.name || this.dom.tabs[index]?.dataset.tab || String(index);
  }

  _getCachedPanel(item, index) {
    if (!item?.cache) return null;

    const entry = this.cache.panels.get(this._getPanelKey(item, index));
    if (!entry) return null;

    const ttl = normalizeTtl(item.ttl);
    if (ttl && Date.now() - entry.updatedAt > ttl) {
      this.cache.panels.delete(this._getPanelKey(item, index));
      return null;
    }

    return entry;
  }

  _setCachedPanel(item, index, content) {
    if (!item?.cache) return;

    this.cache.panels.set(this._getPanelKey(item, index), {
      content,
      updatedAt: Date.now(),
    });
  }

  _renderPanelContent(index, content) {
    const body = this.dom.panelBodies[index];
    const item = this.props.tabs[index];
    if (!body || !item) return;

    body.textContent = '';
    body.append(
      ...normalizeContentNodes(content, {
        tabs: this,
        item,
        index,
        name: this.dom.tabs[index]?.dataset.tab || item.name || index,
      })
    );
  }

  async _loadPanel(index) {
    const item = this.props.tabs[index];
    const body = this.dom.panelBodies[index];
    if (!item || !body || typeof item.panel !== 'function') {
      this.runtime.panelLoadId += 1;
      flushSync(() => {
        this.state.loading = false;
      });
      return;
    }

    const cached = this._getCachedPanel(item, index);
    if (cached) {
      this.runtime.panelLoadId += 1;
      flushSync(() => {
        this.state.loading = false;
      });
      this._renderPanelContent(index, cached.content);
      return;
    }

    const loadId = ++this.runtime.panelLoadId;
    flushSync(() => {
      this.state.loading = true;
    });
    body.textContent = '';
    body.style.minHeight = '80px';
    body.appendChild(createLoading());

    try {
      const content = await Promise.resolve(
        item.panel({
          tabs: this,
          item,
          index,
          name: this.dom.tabs[index]?.dataset.tab || item.name || index,
        })
      );

      if (this.runtime.destroyed || loadId !== this.runtime.panelLoadId) return;

      this._setCachedPanel(item, index, content);
      this._renderPanelContent(index, content);
    } finally {
      if (!this.runtime.destroyed && loadId === this.runtime.panelLoadId) {
        flushSync(() => {
          this.state.loading = false;
          body.style.minHeight = '';
        });
      }
    }
  }

  get activeIndex() {
    return this.state.current.index;
  }

  get disabledNames() {
    return this.state.disabled.names;
  }

  bindEvents() {
    this.unbindEvents();

    const tabList = q('.tab-list', this.root);
    if (!tabList) return;

    this.cleanup.events.on('tabClick', tabList, 'click', (e) => {
      const tab = e.target.closest('.tab-item');
      if (!tab) return;
      const name = tab.dataset.tab;
      if (name && !this.state.disabled.names.includes(name)) {
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
      this.state.disabled.names.includes(this.dom.tabs[index]?.dataset.tab) ||
      this.state.current.index === index
    ) {
      return;
    }

    flushSync(() => {
      this._syncCurrent(index);
    });

    await this._loadPanel(index);

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
    insert(this.dom.container, () => this.root);
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
    this.cache.panels.clear();

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
    this.cache.panels.delete(removedName);

    if (this.state.current.index >= this.props.tabs.length) {
      flushSync(() => {
        this._syncCurrent(this.props.tabs.length - 1);
      });
    } else if (this.state.current.index > index) {
      flushSync(() => {
        this._syncCurrent(this.state.current.index - 1);
      });
    }

    this.rebuildItems();
    this.bindEvents();

    await this._loadPanel(this.state.current.index);

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
    if (name && !this.state.disabled.names.includes(name)) {
      flushSync(() => {
        this.state.disabled = this._createDisabledState([
          ...this.state.disabled.names,
          name,
        ]);
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
        this.state.disabled = this._createDisabledState(
          this.state.disabled.names.filter((n) => n !== name)
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
      this._syncCurrent(index);
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
      this.state.disabled = this._parseDisabled(this.props.disabled);
    });

    this.rebuildItems();
    this.syncActiveNames(this.resolveActiveNames(this.props.active));
    this.bindEvents();

    await this._loadPanel(this.state.current.index);

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
    this.cache.panels?.clear();
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this._resizeRaf);
    this.cleanup.events.off('resize');

    if (this.root?.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
  }
}
export default Tabs;
export function createTabs(container, input = {}) {
  return new Tabs(container, input);
}

import { jsx } from 'vanilla-signal';

import { randomId, resolveOptions, validateParam } from '../utilities/core.js';
import {
  all,
  canRenderDOM,
  isElement,
  isRenderableContent,
  normalizeContentNodes,
  q,
} from '../utilities/dom.js';
import { createEventManager } from '../utilities/events.js';

const TABS_OPTIONS_SCHEMA = {
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
    isRenderableContent(value.content),
  message:
    'expects an object with renderable title and content: string, Node, array, function or null.',
};

/**
 * @typedef {object} TabItem
 * @property {string|Node|Node[]|Function|null} title 标签标题，字符串会按 HTML 片段渲染。
 * @property {string|Node|Node[]|Function|null} content 标签面板内容，字符串会按 HTML 片段渲染。
 * @property {string} [name] 标签名称，可用于通过名称激活、删除、禁用或启用。
 */

/**
 * @typedef {object} TabsOptions
 * @property {string|null} [id] 根节点 id，不传时自动生成。
 * @property {"top"|"bottom"|"left"|"right"} [direction="top"] 标签导航位置。
 * @property {number|string} [active=0] 默认激活项索引或名称。
 * @property {number|string|Array<number|string>} [disabled=[]] 默认禁用项索引或名称。
 * @property {(index:number,name:string|number,tab:HTMLElement,panel:HTMLElement)=>void|Promise<void>|null} [onChange] 激活项变化回调。
 * @property {TabItem[]} [tabs] 当 element 为 false 时用于动态创建标签页的配置。
 * @property {(index:number,item:TabItem,tab:HTMLElement,panel:HTMLElement)=>void|Promise<void>|null} [onAdd] 新增标签回调。
 * @property {(index:number,name:string|number)=>void|Promise<void>|null} [onRemove] 删除标签回调。
 */

/**
 * 标签页组件。
 *
 * 支持绑定已有 DOM 或按配置动态创建，并内置横向/纵向导航溢出拖拽。
 */
class Tabs {
  /**
   * 创建标签页实例。
   * @param {HTMLElement|false} element 已有根节点；传入 false 时根据 options.tabs 创建根节点。
   * @param {TabsOptions} [options={}] 标签页配置。
   */
  constructor(element, options = {}) {
    if (!canRenderDOM()) {
      throw new Error('Tabs: DOM render environment is required.');
    }

    if (element !== false && !isElement(element)) {
      throw new Error('Tabs: element expects a valid HTMLElement or false.');
    }

    this.options = resolveOptions(options, TABS_OPTIONS_SCHEMA, 'Tabs.options');
    this._dynamic = element === false;
    this._init(element);
  }
  _init(el) {
    this.root = el;
    this.current = null;
    this.cleanup = {
      events: createEventManager(),
    };
    this._disabledIndex = [];
    this._destroyed = false;

    const { tabs, disabled, active } = this.options;
    if (this.root === false) {
      this.root = this._buildRoot(tabs);
    }

    if (this.tabs.length === 0 || this.panels.length === 0) {
      throw new Error('.tab-item or .panel-item not found.');
    }

    this._disabledIndex = this._parseDisabled(disabled);

    this._markDisabledTabs();
    this._bindEvents();

    // 默认激活时不触发 onChange。
    void this._activate(active, false);

    // 初始化拖拽滚动能力。
    this._initDrag();
  }

  /**
   * 获取所有标签按钮节点。
   * @returns {HTMLElement[]}
   */
  get tabs() {
    return this.root ? all('.tab-item', this.root) : [];
  }

  /**
   * 获取所有面板节点。
   * @returns {HTMLElement[]}
   */
  get panels() {
    return this.root ? all('.panel-item', this.root) : [];
  }

  get _dragContainer() {
    return this.root ? q('.tab-wrap', this.root) : null;
  }
  get _dragInner() {
    return this.root ? q('.tab-list', this.root) : null;
  }

  /**
   * 当 element 为 false 时创建完整标签页 DOM。
   * @private
   * @param {TabItem[]} tabsConfig 标签页配置。
   * @returns {HTMLElement} 根节点。
   */
  _buildRoot(tabsConfig) {
    const { id, direction } = this.options;

    for (const item of tabsConfig) {
      validateParam('tab', item, TAB_CONFIG_RULE, 'Tabs.options.tabs');
    }

    const nav = jsx('nav', {
      className: 'tab-list',
    });

    const wrap = jsx('div', {
      className: 'tab-wrap',
      children: nav,
    });

    const panelWrapper = jsx('div', {
      className: 'tab-panel',
    });

    for (const item of tabsConfig) {
      const tab = this._createTab(item);
      nav.appendChild(tab);

      const panel = this._createPanel(item);
      panelWrapper.appendChild(panel);
    }

    const container = jsx('div', {
      className: `j-tabs is-${direction}`,
      id: id,
      children: [wrap, panelWrapper],
    });

    return container;
  }

  /**
   * 创建单个标签按钮。
   * @private
   * @param {TabItem} item 标签配置。
   * @returns {HTMLElement}
   */
  _createTab(item) {
    const tab = jsx('div', {
      className: 'tab-item',
      'data-tab': item.name || randomId(),
    });
    const title = jsx('span');
    title.append(...normalizeContentNodes(item.title, { tabs: this, item }));
    tab.appendChild(title);

    return tab;
  }

  /**
   * 创建单个标签面板。
   * @private
   * @param {TabItem} item 标签配置。
   * @returns {HTMLElement}
   */
  _createPanel(item) {
    const panel = jsx('div', {
      className: 'panel-item',
    });
    const content = jsx('div');
    content.append(
      ...normalizeContentNodes(item.content, { tabs: this, item })
    );
    panel.appendChild(content);

    return panel;
  }

  /**
   * 将 disabled 配置转换为索引数组。
   * @private
   * @param {number|string|Array<number|string>} disabled 禁用项配置。
   * @returns {number[]}
   */
  _parseDisabled(disabled) {
    if (disabled == null) return [];

    const toIndex = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        return this.tabs.findIndex((tab) => tab.dataset.tab === val);
      }
      return -1;
    };

    if (Array.isArray(disabled)) {
      return disabled.map(toIndex).filter((i) => i >= 0);
    } else {
      const idx = toIndex(disabled);
      return idx >= 0 ? [idx] : [];
    }
  }

  /**
   * 同步标签禁用状态到 DOM。
   * @private
   */
  _markDisabledTabs() {
    for (const [index, tab] of this.tabs.entries()) {
      if (this._disabledIndex.includes(index)) {
        tab.setAttribute('disabled', 'true');
        tab.classList.add('is-disabled');
      } else {
        tab.removeAttribute('disabled');
        tab.classList.remove('is-disabled');
      }
    }
  }

  /**
   * 绑定标签点击事件。
   * @private
   */
  _bindEvents() {
    this._unbindEvents();

    if (!this._dragInner) return;

    this.cleanup.events.on('tabClick', this._dragInner, 'click', (e) => {
      const tab = e.target.closest('.tab-item');
      if (!tab || !this.tabs.includes(tab)) return;
      const tabIndex = this.tabs.indexOf(tab);
      if (tabIndex >= 0 && !this._disabledIndex.includes(tabIndex)) {
        void this.activate(tabIndex);
      }
    });
  }

  /**
   * 解绑标签点击事件。
   * @private
   */
  _unbindEvents() {
    this.cleanup.events.off('tabClick');
  }

  /**
   * 执行激活逻辑。
   * @private
   * @param {number|string} val 标签索引或 `data-tab` 名称。
   * @param {boolean} [fireEvent=true] 是否触发 onChange。
   * @returns {Promise<void>}
   */
  async _activate(val, fireEvent = true) {
    const { onChange } = this.options;

    const index = this._getIndex(val);

    if (
      index < 0 ||
      index >= this.tabs.length ||
      this._disabledIndex.includes(index) ||
      this.current === index
    ) {
      return;
    }

    this.current = index;

    for (const [i, tab] of this.tabs.entries()) {
      tab.classList.toggle('is-active', i === index);
    }
    for (const [i, panel] of this.panels.entries()) {
      panel.classList.toggle('is-active', i === index);
    }

    if (fireEvent && onChange) {
      const tabEl = this.tabs[index];
      const panelEl = this.panels[index];
      const tabName = tabEl ? tabEl.dataset.tab || index : index;
      await Promise.resolve(onChange(index, tabName, tabEl, panelEl));
    }
  }

  /**
   * 将索引或名称转换为真实索引。
   * @private
   * @param {number|string} val 标签索引或名称。
   * @returns {number}
   */
  _getIndex(val) {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      return this.tabs.findIndex((tab) => tab.dataset.tab === val);
    }
    return -1;
  }

  /**
   * 初始化导航拖拽能力。
   * @private
   */
  _initDrag() {
    const { direction } = this.options;

    if (!this._dragContainer || !this._dragInner) return;

    this.isVertical = direction === 'left' || direction === 'right';

    this.draggable = this._draggable();

    if (!this.draggable) {
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

  /**
   * 判断当前导航是否需要拖拽。
   * @private
   * @returns {boolean}
   */
  _draggable() {
    if (this.isVertical) {
      const innerH = this._dragInner.scrollHeight;
      const viewH = this._dragContainer.clientHeight;
      return innerH > viewH + 5;
    }
    const innerW = this._dragInner.scrollWidth;
    const viewW = this._dragContainer.clientWidth;
    return innerW > viewW + 5;
  }

  /**
   * 绑定拖拽事件，并使用 rAF 降低滚动更新频率。
   * @private
   */
  _bindDragEvents() {
    this._removeDragEvents();

    const container = this._dragContainer;
    const inner = this._dragInner;
    const isVertical = this.isVertical;

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
      // const delta = current - posStart
      const dist = posStart - current;

      // velocity 记录最后 2 次移动
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
      {
        passive: true,
      }
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

  /**
   * 执行拖拽结束后的惯性滚动。
   * @private
   */
  _startInertiaScroll() {
    const container = this._dragContainer;
    let v = this._velocity;
    const isVertical = this.isVertical;

    let last = performance.now();

    const step = (now) => {
      const dt = now - last;
      last = now;

      // 速度衰减（指数）
      v *= 0.92;

      if (Math.abs(v) < 0.3) return; // 停止

      if (isVertical) {
        container.scrollTop += v * dt * 0.05;
      } else {
        container.scrollLeft += v * dt * 0.05;
      }

      this.raf = requestAnimationFrame(step);
    };

    this.raf = requestAnimationFrame(step);
  }

  /**
   * 移除拖拽事件。
   * @private
   */
  _removeDragEvents() {
    this.cleanup.events.off('drag:mousedown');
    this.cleanup.events.off('drag:touchstart');
    this.cleanup.events.off('drag:mousemove');
    this.cleanup.events.off('drag:touchmove');
    this.cleanup.events.off('drag:mouseup');
    this.cleanup.events.off('drag:touchend');
  }

  /**
   * 在标签数量变化后刷新拖拽状态。
   * @private
   */
  _refreshDrag() {
    this._initDrag();
  }

  // ========== 公开 API ==========

  /**
   * 激活指定标签。
   * @param {number|string} val 标签索引或 `data-tab` 名称。
   * @returns {Promise<void>}
   */
  async activate(val) {
    await this._activate(val, true);
  }

  /**
   * 使用新配置重新初始化状态。
   * @param {Partial<TabsOptions>} [newOptions={}] 需要覆盖的配置。
   * @returns {Promise<void>}
   */
  async reInit(newOptions = {}) {
    this.options = resolveOptions(
      { ...this.options, ...newOptions },
      TABS_OPTIONS_SCHEMA,
      'Tabs.options'
    );
    const { disabled, active } = this.options;
    this._disabledIndex = this._parseDisabled(disabled);
    this._markDisabledTabs();
    this._bindEvents();
    await this._activate(active, false);
    this._refreshDrag();
  }

  /**
   * 动态新增标签。
   * @param {TabItem} tabConfig 标签配置。
   * @returns {Promise<void>}
   */
  async addTab(tabConfig) {
    validateParam('tabConfig', tabConfig, TAB_CONFIG_RULE, 'Tabs.addTab');
    const { title, name, content } = tabConfig;

    const panelWrapper = q('.tab-panel', this.root);

    tabConfig.name = name || randomId();
    const tab = this._createTab(tabConfig);
    if (this._dragInner) this._dragInner.appendChild(tab);

    const panel = this._createPanel({ title, name, content });
    panelWrapper.appendChild(panel);

    this._markDisabledTabs();
    this._bindEvents();

    const { onAdd } = this.options;
    if (onAdd) {
      await Promise.resolve(onAdd(this.tabs.length - 1, tabConfig, tab, panel));
    }

    this._refreshDrag();
  }

  /**
   * 根据索引或名称删除标签。
   * @param {number|string} val 标签索引或 `data-tab` 名称。
   * @returns {Promise<void>}
   */
  async deleteTab(val) {
    if (this.tabs.length <= 1) return;

    const index = this._getIndex(val);
    if (index < 0 || index >= this.tabs.length) return;

    const tab = this.tabs[index];
    const panel = this.panels[index];
    const tabName = tab.dataset.tab || index;

    if (tab && tab.parentNode) tab.parentNode.removeChild(tab);
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);

    this._markDisabledTabs();
    this._bindEvents();

    const { onRemove } = this.options;
    if (onRemove) {
      await Promise.resolve(onRemove(index, tabName));
    }

    // 如果删除的是当前激活标签，则激活最后一个标签。
    if (tab.classList.contains('is-active')) {
      await this._activate(this.tabs.length - 1, false);
    }

    this._refreshDrag();
  }

  /**
   * 根据索引或名称禁用标签。
   * @param {number|string} val 标签索引或 `data-tab` 名称。
   * @returns {void}
   */
  disableTab(val) {
    const idx = this._getIndex(val);
    if (idx >= 0 && !this._disabledIndex.includes(idx)) {
      this._disabledIndex.push(idx);
      this._markDisabledTabs();
      this._bindEvents();
    }
  }

  /**
   * 根据索引或名称启用标签。
   * @param {number|string} val 标签索引或 `data-tab` 名称。
   * @returns {void}
   */
  enableTab(val) {
    const idx = this._getIndex(val);
    const pos = this._disabledIndex.indexOf(idx);
    if (pos >= 0) {
      this._disabledIndex.splice(pos, 1);
      this._markDisabledTabs();
      this._bindEvents();
    }
  }

  /**
   * 销毁当前标签页实例并解绑事件。
   * @returns {void}
   */
  destroy() {
    if (this._destroyed) return;

    const root = this.root;
    const shouldRemoveRoot = this._dynamic;

    this._destroyed = true;

    this._unbindEvents();
    this._removeDragEvents();
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this._resizeRaf);

    for (const tab of this.tabs) {
      tab.classList.remove('is-active', 'is-disabled');
      tab.removeAttribute('disabled');
    }
    for (const panel of this.panels) {
      panel.classList.remove('is-active');
    }

    this.cleanup.events.off('resize');

    if (shouldRemoveRoot && root?.parentNode) {
      root.parentNode.removeChild(root);
    }

    this.root = null;
    this.options = {};
    this.isVertical = false;
    this.cleanup.events.clear();
    this.cleanup = null;
  }
}

export default Tabs;

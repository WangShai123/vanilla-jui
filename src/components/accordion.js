import { jsx } from 'vanilla-signal';

import { randomId, resolveOptions, validateParam } from '../utilities/core.js';
import {
  all,
  canRenderDOM,
  isElement,
  isRenderableContent,
  normalizeContentNodes,
} from '../utilities/dom.js';
import { createEventManager } from '../utilities/events.js';
import { icon } from './icons.js';

const ACCORDION_OPTIONS_SCHEMA = {
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
  active: { default: 0, types: ['number', 'string', 'array', 'null'] },
  collapsible: { default: false, type: 'boolean' },
  multiple: { default: false, type: 'boolean' },
  onChange: { default: null, types: ['function', 'null'] },
  items: { default: [], type: 'array' },
};

const ACCORDION_ITEMS_RULE = {
  type: 'array',
  validate: (value) => value.length > 0,
  message: 'expects a non-empty array.',
};

const ACCORDION_ACTIVE_RULE = {
  types: ['number', 'string', 'array', 'null'],
  validate: (value) => {
    if (value == null) return true;
    if (Array.isArray(value)) {
      return value.every(
        (item) => typeof item === 'number' || typeof item === 'string'
      );
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) && value >= 0;
    }

    return value.trim().length > 0;
  },
  message: 'expects a positive number, string, array or null.',
};

function cloneItems(items) {
  return Array.isArray(items) ? items.map((item) => ({ ...item })) : [];
}

function normalizeItems(items) {
  validateParam('items', items, ACCORDION_ITEMS_RULE, 'Accordion');

  return items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Accordion: item expects an object.');
    }

    if (item.name != null && typeof item.name !== 'string') {
      throw new Error('Accordion: item name expects a string.');
    }

    if (!isRenderableContent(item.title)) {
      throw new Error(
        'Accordion: item title expects string, Node, array, function or null.'
      );
    }

    if (!isRenderableContent(item.content)) {
      throw new Error(
        'Accordion: item content expects string, Node, array, function or null.'
      );
    }

    return {
      ...item,
      name: item.name || randomId(),
    };
  });
}

/**
 * @typedef {object} AccordionItem
 * @property {string|Node|Node[]|Function|null} title 面板标题；字符串会按 HTML 片段渲染。
 * @property {string|Node|Node[]|Function|null} content 面板内容；字符串会按 HTML 片段渲染。
 * @property {string} [name] 面板名称，可用于通过名称激活面板。
 */

/**
 * @typedef {object} AccordionOptions
 * @property {string|null} [id] 根节点 id，不传时自动生成。
 * @property {number|string|Array<number|string>|null} [active=0] 默认激活项索引、名称或多开列表。
 * @property {boolean} [collapsible=false] 是否允许关闭当前已激活项。
 * @property {boolean} [multiple=false] 是否允许同时展开多个面板。
 * @property {(index:number,name:string,header:HTMLElement,panel:HTMLElement,instance:Accordion)=>void|Promise<void>|null} [onChange] 激活项变化回调。
 * @property {AccordionItem[]} [items] 当 element 为 false 时用于动态创建手风琴的条目配置。
 */

/**
 * 轻量手风琴组件。
 *
 * 内部直接操作 DOM，同步 class 和 ARIA；动态创建时使用 vanilla-signal 的 jsx/html
 * 作为 DOM 创建工具，便于接收 JSX 产物或响应式项目传入的 Node 内容。
 */
class Accordion {
  /**
   * 创建手风琴实例。
   * @param {HTMLElement|false} element 已有根节点；传入 false 时根据 options.items 创建根节点。
   * @param {AccordionOptions} [options={}] 手风琴配置。
   */
  constructor(element, options = {}) {
    if (!canRenderDOM()) {
      throw new Error('Accordion: DOM render environment is required.');
    }

    if (element !== false && !isElement(element)) {
      throw new Error(
        'Accordion: element expects a valid HTMLElement or false.'
      );
    }

    const resolvedOptions = resolveOptions(
      options,
      ACCORDION_OPTIONS_SCHEMA,
      'Accordion.options'
    );
    this.config = {
      options: resolvedOptions,
    };
    this.dom = {
      root: null,
      headers: [],
      panels: [],
    };
    this.cleanup = {
      events: createEventManager(),
    };
    this.runtime = {
      dynamic: element === false,
      activeNames: [],
      destroyed: false,
    };

    try {
      this.init(element, resolvedOptions);
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  get root() {
    return this.dom?.root || null;
  }

  set root(value) {
    if (!this.dom) this.dom = { headers: [], panels: [] };
    this.dom.root = value;
  }

  get options() {
    return this.config?.options || {};
  }

  set options(value) {
    if (!this.config) this.config = {};
    this.config.options = value || {};
  }

  get dynamic() {
    return !!this.runtime?.dynamic;
  }

  get destroyed() {
    return !!this.runtime?.destroyed;
  }

  get activeNames() {
    return this.runtime?.activeNames || [];
  }

  set activeNames(value) {
    if (!this.runtime) this.runtime = {};
    this.runtime.activeNames = Array.isArray(value) ? value : [];
  }

  init(element, options) {
    this.root = element === false ? this.buildRoot(options) : element;
    this.refreshDom();

    if (this.headers.length === 0 || this.panels.length === 0) {
      throw new Error(
        'Accordion: .accordion-header or .accordion-panel not found.'
      );
    }

    this.prepareItems();
    this.activeNames = this.resolveActiveNames(options.active);
    this.syncAll();
    this.bindEvents();
  }

  refreshDom() {
    if (!this.root) {
      this.dom.headers = [];
      this.dom.panels = [];
      return;
    }

    this.dom.headers = all('.accordion-header', this.root);
    this.dom.panels = all('.accordion-panel', this.root);
  }

  assertActive(method) {
    if (this.destroyed) {
      throw new Error(`Accordion.${method}: instance has been destroyed.`);
    }
  }

  /**
   * 根据配置创建完整根节点。
   * @private
   * @param {AccordionOptions} options 已归一化配置。
   * @returns {HTMLElement}
   */
  buildRoot(options) {
    const items = normalizeItems(options.items);
    const root = jsx('div', {
      className: 'j-accordion',
      id: options.id,
    });

    root.append(this.buildItems(items));
    return root;
  }

  /**
   * 根据 items 配置构建标题与面板节点。
   * @private
   * @param {AccordionItem[]} itemsConfig 面板配置列表。
   * @returns {DocumentFragment}
   */
  buildItems(itemsConfig) {
    const fragment = document.createDocumentFragment();

    itemsConfig.forEach((item, index) => {
      const name = item.name || randomId();
      const headerId = `${this.options.id}_header_${index}`;
      const panelId = `${this.options.id}_panel_${index}`;

      const headerTitle = jsx('span', {
        className: 'header-title',
      });
      headerTitle.append(...this.contentView(item.title, item, index, 'title'));

      const header = jsx('div', {
        className: 'accordion-header',
        'data-item': name,
        id: headerId,
        role: 'button',
        tabindex: '0',
        'aria-controls': panelId,
        children: [
          headerTitle,
          jsx('span', {
            className: 'header-arrow',
            'aria-hidden': 'true',
            children: icon('arrow-down'),
          }),
        ],
      });

      const panelContent = jsx('div', {
        className: 'panel-content',
      });
      panelContent.append(
        ...this.contentView(item.content, item, index, 'content')
      );

      const panel = jsx('div', {
        className: 'accordion-panel',
        id: panelId,
        role: 'region',
        'aria-labelledby': headerId,
        children: panelContent,
      });

      fragment.append(header, panel);
    });

    return fragment;
  }

  contentView(content, item, index, type) {
    return normalizeContentNodes(content, {
      accordion: this,
      item,
      index,
      type,
      active: this.isActive(item.name),
    });
  }

  /**
   * 为已有 DOM 或动态 DOM 补齐 name 与无障碍属性。
   * @private
   * @returns {void}
   */
  prepareItems() {
    this.headers.forEach((header, index) => {
      const panel = this.panels[index];
      if (!panel) return;

      const name = header.dataset.item || randomId();
      header.dataset.item = name;

      if (!header.id) header.id = `${this.options.id}_header_${index}`;
      if (!panel.id) panel.id = `${this.options.id}_panel_${index}`;

      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      header.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', header.id);
    });
  }

  resolveActiveNames(active) {
    if (active == null) {
      const activeHeaders = this.headers.filter((header, index) => {
        const panel = this.panels[index];
        return (
          header.classList.contains('is-active') ||
          panel?.classList.contains('is-active')
        );
      });

      return activeHeaders
        .map((header) => header.dataset.item)
        .slice(0, this.options.multiple ? activeHeaders.length : 1);
    }

    const values = Array.isArray(active) ? active : [active];
    const names = [];

    for (const value of values) {
      const index = this.getIndex(value);
      if (index < 0 || index >= this.headers.length) continue;
      names.push(this.headers[index].dataset.item || String(index));
      if (!this.options.multiple) break;
    }

    return Array.from(new Set(names));
  }

  /**
   * 绑定标题点击与键盘事件。
   * @private
   */
  bindEvents() {
    this.unbindEvents();

    this.cleanup.events.on('click', this.root, 'click', (event) => {
      const header = event.target.closest('.accordion-header');
      if (!header || !this.headers.includes(header)) return;
      void this.active(this.headers.indexOf(header));
    });

    this.cleanup.events.on('keydown', this.root, 'keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const header = event.target.closest('.accordion-header');
      if (!header || !this.headers.includes(header)) return;

      event.preventDefault();
      void this.active(this.headers.indexOf(header));
    });
  }

  /**
   * 解绑实例持有的所有事件。
   * @private
   */
  unbindEvents() {
    this.cleanup.events.clear();
  }

  syncAll() {
    this.headers.forEach((header, index) => {
      this.syncItem(index, this.isActive(header.dataset.item));
    });
  }

  syncItem(index, active) {
    const header = this.headers[index];
    const panel = this.panels[index];
    if (!header || !panel) return;

    header.classList.toggle('is-active', active);
    panel.classList.toggle('is-active', active);
    header.setAttribute('aria-expanded', String(active));
    panel.setAttribute('aria-hidden', String(!active));
    panel.hidden = !active;
  }

  isActive(name) {
    return this.activeNames.includes(name);
  }

  /**
   * 执行激活/折叠逻辑。
   * @private
   * @param {number|string} val 面板索引或 `data-item` 名称。
   * @param {boolean} [fireEvent=true] 是否触发 onChange。
   * @return {Promise<void>}
   */
  async activateItem(val, fireEvent = true) {
    const index = this.getIndex(val);

    if (index < 0 || index >= this.headers.length) return;

    const headerEl = this.headers[index];
    const panelEl = this.panels[index];
    const name = headerEl.dataset.item || String(index);
    const isActive = this.isActive(name);

    if (isActive && !this.options.multiple && !this.options.collapsible) {
      return;
    }

    if (this.options.multiple) {
      this.activeNames = isActive
        ? this.activeNames.filter((activeName) => activeName !== name)
        : [...this.activeNames, name];
    } else if (isActive) {
      if (this.options.collapsible) this.activeNames = [];
    } else {
      this.activeNames = [name];
    }

    this.syncAll();

    if (fireEvent && this.options.onChange) {
      await Promise.resolve(
        this.options.onChange(index, name, headerEl, panelEl, this)
      );
    }
  }

  /**
   * 将索引或名称转换为真实索引。
   * @private
   * @param {number|string} val 面板索引或名称。
   * @returns {number}
   */
  getIndex(val) {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      return this.headers.findIndex((header) => header.dataset.item === val);
    }
    return -1;
  }

  /**
   * 获取所有标题节点。
   * @returns {HTMLElement[]}
   */
  get headers() {
    return this.dom?.headers || [];
  }

  /**
   * 获取所有面板节点。
   * @returns {HTMLElement[]}
   */
  get panels() {
    return this.dom?.panels || [];
  }

  /**
   * 获取当前激活项索引。
   *
   * 无激活项时返回 null；多开模式下返回第一个激活项。
   * @returns {number|null}
   */
  get current() {
    const name = this.activeNames[0];
    if (!name) return null;
    return this.getIndex(name);
  }

  /**
   * 简单状态快照，便于测试和外部调试。
   * @returns {{activeNames:string[], current:number|null}}
   */
  get state() {
    return {
      activeNames: [...this.activeNames],
      current: this.current,
    };
  }

  /**
   * 激活指定面板。
   * @param {number|string} val 面板索引或 `data-item` 名称。
   * @returns {Promise<void>}
   */
  async active(val) {
    this.assertActive('active');
    await this.activateItem(val, true);
  }

  /**
   * 动态替换全部面板条目。
   *
   * @param {AccordionItem[]} items 新面板配置。
   * @param {number|string|Array<number|string>|null} [active=0] 替换后默认激活项。
   * @throws {Error} items 或 active 不合法时抛出。
   * @returns {void}
   */
  setItems(items, active = 0) {
    this.assertActive('setItems');
    validateParam('items', items, ACCORDION_ITEMS_RULE, 'Accordion.setItems');
    validateParam(
      'active',
      active,
      ACCORDION_ACTIVE_RULE,
      'Accordion.setItems'
    );

    const normalized = normalizeItems(items);
    this.options.items = cloneItems(normalized);
    this.options.active = active;

    this.root.textContent = '';
    this.root.append(this.buildItems(normalized));
    this.refreshDom();
    this.prepareItems();
    this.activeNames = this.resolveActiveNames(active);
    this.syncAll();
  }

  /**
   * 销毁当前实例并解绑事件。
   * @returns {void}
   */
  destroy() {
    if (this.destroyed) return;

    const root = this.root;
    const shouldRemoveRoot = this.dynamic;

    this.runtime.destroyed = true;
    this.unbindEvents();

    for (const header of this.headers) {
      header.classList.remove('is-active');
      header.removeAttribute('aria-expanded');
    }

    for (const panel of this.panels) {
      panel.classList.remove('is-active');
      panel.removeAttribute('aria-hidden');
      panel.hidden = false;
    }

    if (shouldRemoveRoot && root?.parentNode) {
      root.parentNode.removeChild(root);
    }

    this.root = null;
    this.options = {};
    this.activeNames = [];
    this.cleanup.events.clear();
    this.dom.headers = [];
    this.dom.panels = [];
  }
}

export default Accordion;

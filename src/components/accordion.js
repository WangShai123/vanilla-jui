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
  normalizeContentNodes,
  requireContainer,
  requireRenderDOM,
} from '../utilities/dom.js';
import { icon } from './icons.js';

const ACCORDION_PROPS_SCHEMA = {
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
    return { ...item, name: item.name || randomId() };
  });
}

/**
 * 轻量手风琴组件，继承 Component。
 *
 * DOM 创建一次，通过 createEffect 细粒度更新 class/ARIA。
 */
export class Accordion extends Component {
  /**
   * @param {Element|Node|string|Array} container 挂载容器（元素、选择器或 JSX/h 返回节点）。
   * @param {object} [input={}] 手风琴配置。
   */
  constructor(container, input = {}) {
    requireRenderDOM('Accordion');

    const el = requireContainer(container, 'Accordion');

    const props = resolveProps(input, ACCORDION_PROPS_SCHEMA, 'Accordion');
    super(props);

    this.dom.container = el;
    this.dom.headers = [];
    this.dom.panels = [];

    this.state = createDeepStore({
      activeNames: [],
      current: { index: null, name: null },
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
    this.buildItems(props);
    this.syncActiveNames(this.resolveActiveNames(props.active));
    this.bindEvents();
  }

  buildRoot(props) {
    return jsx('div', { className: 'j-accordion', id: props.id });
  }

  /**
   * 创建 DOM 节点（一次性）。
   * @private
   */
  buildItems(props) {
    const items = normalizeItems(props.items);
    const fragment = document.createDocumentFragment();

    this.dom.headers = [];
    this.dom.panels = [];

    items.forEach((item, index) => {
      const name = item.name || randomId();
      const headerId = `${props.id}_header_${index}`;
      const panelId = `${props.id}_panel_${index}`;

      const header = jsx('div', {
        className: 'accordion-header',
        'data-item': name,
        id: headerId,
        role: 'button',
        tabindex: '0',
        'aria-controls': panelId,
        children: [
          jsx('span', {
            className: 'header-title',
            children: this.contentView(item.title, item, index, 'title'),
          }),
          jsx('span', {
            className: 'header-arrow',
            'aria-hidden': 'true',
            children: icon('arrow-down'),
          }),
        ],
      });

      const panel = jsx('div', {
        className: 'accordion-panel',
        id: panelId,
        role: 'region',
        'aria-labelledby': headerId,
        children: jsx('div', {
          className: 'panel-content',
          children: this.contentView(item.content, item, index, 'content'),
        }),
      });

      this.dom.headers.push(header);
      this.dom.panels.push(panel);
      fragment.append(header, panel);
    });

    this.root.append(fragment);

    this.cleanup.bindings?.();
    this.cleanup.bindings = createRoot((dispose) => {
      this.dom.headers.forEach((header) => {
        const name = header.dataset.item;
        bindClass(header, 'is-active', () =>
          this.state.activeNames.includes(name)
        );
        bindAttr(header, 'aria-expanded', () =>
          this.state.activeNames.includes(name)
        );
      });
      this.dom.panels.forEach((panel, i) => {
        const name = this.dom.headers[i]?.dataset.item;
        bindClass(panel, 'is-active', () =>
          this.state.activeNames.includes(name)
        );
        bindAttr(panel, 'aria-hidden', () =>
          this.state.activeNames.includes(name) ? 'false' : 'true'
        );
        bindAttr(panel, 'hidden', () => !this.state.activeNames.includes(name));
      });
      return dispose;
    });
  }

  contentView(content, item, index, type) {
    return normalizeContentNodes(content, {
      accordion: this,
      item,
      index,
      type,
      active: false,
    });
  }

  resolveActiveNames(active) {
    if (active == null) return [];
    const values = Array.isArray(active) ? active : [active];
    const names = [];
    for (const value of values) {
      const index = this.getIndex(value);
      if (index < 0 || index >= this.dom.headers.length) continue;
      names.push(this.dom.headers[index].dataset.item || String(index));
      if (!this.props.multiple) break;
    }
    return Array.from(new Set(names));
  }

  syncActiveNames(names) {
    const firstName = names[0] || null;
    const index = firstName ? this.getIndex(firstName) : null;
    flushSync(() => {
      this.state.activeNames = names;
      this.state.current = { index, name: firstName };
    });
  }

  bindEvents() {
    this.unbindEvents();

    this.cleanup.events.on('click', this.root, 'click', (event) => {
      const header = event.target.closest('.accordion-header');
      if (!header) return;
      void this.active(header.dataset.item);
    });

    this.cleanup.events.on('keydown', this.root, 'keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const header = event.target.closest('.accordion-header');
      if (!header) return;
      event.preventDefault();
      void this.active(header.dataset.item);
    });
  }

  unbindEvents() {
    this.cleanup.events.clear();
  }

  isActive(name) {
    return this.state.activeNames.includes(name);
  }

  assertActive(method) {
    if (this.runtime.destroyed) {
      throw new Error(`Accordion.${method}: instance has been destroyed.`);
    }
  }

  async activateItem(val, fireEvent = true) {
    const index = this.getIndex(val);
    if (index < 0 || index >= this.dom.headers.length) return;

    const headerEl = this.dom.headers[index];
    const panelEl = this.dom.panels[index];
    const name = headerEl.dataset.item || String(index);
    const active = this.isActive(name);

    if (active && !this.props.multiple && !this.props.collapsible) return;

    let nextNames;
    if (this.props.multiple) {
      nextNames = active
        ? this.state.activeNames.filter((n) => n !== name)
        : [...this.state.activeNames, name];
    } else if (active) {
      nextNames = this.props.collapsible ? [] : this.state.activeNames;
    } else {
      nextNames = [name];
    }

    this.syncActiveNames(nextNames);

    if (fireEvent && this.props.onChange) {
      await Promise.resolve(
        this.props.onChange(index, name, headerEl, panelEl, this)
      );
    }
  }

  getIndex(val) {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      return this.dom.headers.findIndex(
        (header) => header.dataset.item === val
      );
    }
    return -1;
  }

  /**
   * 激活指定面板。
   * @param {number|string} val 面板索引或 `data-item` 名称。
   */
  async active(val) {
    this.assertActive('active');
    await this.activateItem(val, true);
  }

  /**
   * 将组件挂载到构造器指定的容器中。
   */
  render() {
    this.assertActive('render');
    insert(this.dom.container, () => this.root);
  }

  /**
   * 动态替换全部面板条目。
   * @param {AccordionItem[]} items 新面板配置。
   * @param {number|string|Array<number|string>|null} [active=0] 替换后默认激活项。
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

    this.props.items = cloneItems(normalizeItems(items));
    this.props.active = active;

    this.root.textContent = '';
    this.buildItems(this.props);
    this.syncActiveNames(this.resolveActiveNames(active));
    this.bindEvents();
  }

  onDestroy() {
    this.unbindEvents();
    this.cleanup.bindings?.();
    this.cleanup.bindings = null;
    if (this.root?.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
  }
}

export function createAccordion(container, input = {}) {
  return new Accordion(container, input);
}

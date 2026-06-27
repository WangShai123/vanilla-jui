import { createDeepStore } from 'vanilla-signal';

import Component from '../core/Component.js';
import { randomId, resolveProps } from '../utilities/core.js';
import { requireContainer, requireRenderDOM } from '../utilities/dom.js';

const TOC_PROPS_SCHEMA = {
  container: { default: null },
  target: { default: '.j-content' },
  headings: { default: 'h2, h3', type: 'string' },
  offset: {
    default: 80,
    type: 'number',
    validate: (value) => value >= 0,
    message: 'expects a positive number or 0.',
  },
  onUpdate: { default: null, types: ['function', 'null'] },
};

function resolveHeadingLevel(element) {
  const match = /^H([1-6])$/.exec(element.tagName);
  return match ? Number(match[1]) : 1;
}

function normalizeHeading(element, index) {
  if (!element.id) element.id = `toc-${randomId()}-${index}`;
  return {
    id: element.id,
    text: element.textContent || '',
    level: resolveHeadingLevel(element),
    element,
  };
}

/**
 * 页面目录组件。
 *
 * 扫描内容区域内的标题，生成锚点列表，并随页面滚动更新 active 状态。
 */
class Toc extends Component {
  /**
   * 创建 Toc 实例。
   * @param {object} [input={}] Toc 配置。
   */
  constructor(input = {}) {
    const props = resolveProps(input, TOC_PROPS_SCHEMA, 'Toc.props');
    super(props);

    this.dom.container = null;
    this.dom.target = null;
    this.dom.list = null;
    this.dom.headings = [];
    this.dom.links = [];

    this.runtime.built = false;
    this.runtime.ticking = false;

    this.state = createDeepStore({
      items: [],
      current: {
        index: -1,
        item: null,
      },
    });
  }

  /**
   * 构建 Toc DOM 和滚动监听。
   * @returns {Toc} 当前实例。
   */
  build() {
    if (this.runtime.destroyed)
      throw new Error('Toc.build: instance destroyed');
    if (this.runtime.built) return this;

    requireRenderDOM('Toc');

    this.init(this.props);
    this.dom.container = requireContainer(
      this.props.container,
      'Toc.container'
    );
    this.dom.target = requireContainer(this.props.target, 'Toc.target');
    this.root = document.createElement('nav');
    this.root.className = 'j-toc';
    this.dom.list = document.createElement('div');
    this.dom.list.className = 'toc-list';
    this.root.appendChild(this.dom.list);
    this.dom.container.innerHTML = '';
    this.dom.container.appendChild(this.root);

    this.runtime.built = true;
    this.refresh();
    return this;
  }

  _bindEvents() {
    this.cleanup.events.on('scroll', window, 'scroll', () => this._onScroll(), {
      passive: true,
    });
  }

  _onScroll() {
    if (this.runtime.ticking) return;

    requestAnimationFrame(() => {
      this._updateActive();
      this.runtime.ticking = false;
    });
    this.runtime.ticking = true;
  }

  _buildLink(item) {
    const link = document.createElement('a');
    link.href = `#${item.id}`;
    link.className = `toc-link is-level-${item.level}`;
    link.textContent = item.text;
    link.dataset.tocTarget = item.id;

    return link;
  }

  _updateActive() {
    if (!this.runtime.built) return;

    let index = -1;
    for (let i = this.dom.headings.length - 1; i >= 0; i--) {
      if (
        this.dom.headings[i].getBoundingClientRect().top <= this.props.offset
      ) {
        index = i;
        break;
      }
    }

    if (index === this.state.current.index) return;

    const current = this.state.items[index] || null;
    this.setState({
      current: { index, item: current },
    });

    this.dom.links.forEach((link, i) => {
      const active = i === index;
      link.dataset.active = active ? '1' : '0';
      link.className = `toc-link is-level-${this.state.items[i].level}${
        active ? ' is-active' : ''
      }`;
    });

    if (typeof this.props.onUpdate === 'function') {
      this.props.onUpdate(current, index, this);
    }
  }

  /**
   * 重新扫描标题并重建目录列表。
   * @returns {Toc} 当前实例。
   */
  refresh() {
    if (this.runtime.destroyed || !this.runtime.built) return this;

    this.cleanup.events.clear();

    this.dom.headings = Array.from(
      this.dom.target.querySelectorAll(this.props.headings)
    );
    const items = this.dom.headings.map(normalizeHeading);
    this.dom.links = items.map((item) => this._buildLink(item));

    this.dom.list.innerHTML = '';
    for (const link of this.dom.links) this.dom.list.appendChild(link);

    this.setState({
      items,
      current: { index: -1, item: null },
    });

    this._bindEvents();
    this._updateActive();
    return this;
  }

  /**
   * 激活并滚动到指定目录项。
   * @param {number} index 目录项索引。
   * @returns {Toc} 当前实例。
   */
  activate(index) {
    if (!this.runtime.built) return this;
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.dom.links.length
    ) {
      return this;
    }

    this.dom.links[index].scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    return this;
  }

  /**
   * 销毁实例并清空渲染内容。
   * @private
   */
  onDestroy() {
    this.cleanup.events.clear();
    if (this.dom.container) this.dom.container.innerHTML = '';

    this.runtime.built = false;
    this.runtime.ticking = false;
    this.dom.container = null;
    this.dom.target = null;
    this.dom.list = null;
    this.dom.headings = [];
    this.dom.links = [];
  }
}

/**
 * 创建 Toc 实例。
 * @param {object} [props={}] Toc 配置。
 * @returns {Toc}
 */
export function createToc(props = {}) {
  return new Toc(props);
}

export default Toc;

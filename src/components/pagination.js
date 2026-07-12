import {
  bindAttr,
  createDeepStore,
  createEffect,
  createRoot,
  flushSync,
  jsx,
} from 'vanilla-signal';

import Component from '../core/Component.js';
import { resolveProps, validateParam } from '../utilities/core.js';
import { requireContainer, requireRenderDOM } from '../utilities/dom.js';
import { icon } from './icons.js';

const PAGE_RULE = {
  type: 'object',
  required: true,
  validate: (value) =>
    Number.isInteger(value.size) &&
    value.size > 0 &&
    Number.isInteger(value.current) &&
    value.current > 0,
  message: 'expects { size, current } with positive integers.',
};

const COUNT_RULE = {
  type: 'object',
  required: true,
  validate: (value) =>
    Number.isInteger(value.sibling) &&
    value.sibling >= 0 &&
    Number.isInteger(value.boundary) &&
    value.boundary >= 0,
  message:
    'expects { sibling, boundary } with integers greater than or equal 0.',
};

const PAGINATION_PROPS_SCHEMA = {
  total: {
    default: 0,
    type: 'number',
    validate: (value) => Number.isFinite(value) && value >= 0,
    message: 'expects a non-negative finite number.',
  },
  page: {
    default: () => ({ size: 10, current: 1 }),
    factory: true,
    ...PAGE_RULE,
  },
  count: {
    default: () => ({ sibling: 1, boundary: 1 }),
    factory: true,
    ...COUNT_RULE,
  },
  lock: { default: true, type: 'boolean' },
  onChange: { default: null, types: ['function', 'null'] },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeProps(input = {}) {
  const props = resolveProps(
    input,
    PAGINATION_PROPS_SCHEMA,
    'Pagination.props'
  );
  return {
    ...props,
    page: { ...props.page },
    count: { ...props.count },
  };
}

function createMoreItem(key) {
  return { type: 'more', key };
}

function createPageItem(page) {
  return { type: 'page', key: `page-${page}`, page };
}

function pageRange(start, end) {
  const pages = [];
  for (let page = start; page <= end; page++) pages.push(page);
  return pages;
}

function resolvePageItems(current, pageCount, count) {
  if (pageCount <= 0) return [];

  const boundary = Math.max(0, count.boundary);
  const sibling = Math.max(0, count.sibling);
  const visibleCount = boundary * 2 + sibling * 2 + 3;

  if (pageCount <= visibleCount) {
    return pageRange(1, pageCount).map(createPageItem);
  }

  const pages = new Set();

  for (let page = 1; page <= Math.min(boundary, pageCount); page++) {
    pages.add(page);
  }

  for (
    let page = Math.max(1, current - sibling);
    page <= Math.min(pageCount, current + sibling);
    page++
  ) {
    pages.add(page);
  }

  for (
    let page = Math.max(1, pageCount - boundary + 1);
    page <= pageCount;
    page++
  ) {
    pages.add(page);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items = [];

  for (const page of sorted) {
    const previous = items.at(-1);
    if (previous?.type === 'page' && page - previous.page > 1) {
      if (page - previous.page === 2) {
        items.push(createPageItem(previous.page + 1));
      } else {
        items.push(createMoreItem(`more-${previous.page}-${page}`));
      }
    }
    items.push(createPageItem(page));
  }

  return items;
}

/**
 * 分页组件。
 *
 * 构造器只验证和保存配置；调用 build() 后才挂载 DOM 和绑定交互。
 */
export class Pagination extends Component {
  /**
   * @param {Element|Node|string|Array} container 挂载容器。
   * @param {object} [input={}] 分页配置。
   */
  constructor(container, input = {}) {
    requireRenderDOM('Pagination');

    const el = requireContainer(container, 'Pagination.container');
    const props = normalizeProps(input);
    super(props);

    const pageCount = this._getPageCount(props.total, props.page.size);
    const current = clamp(props.page.current, 1, pageCount);

    this.dom.container = el;
    this.dom.list = null;
    this.dom.prev = null;
    this.dom.next = null;
    this.dom.pageNodes = [];
    this.dom.items = [];

    this.runtime.built = false;
    this.runtime.itemsKey = '';
    this.runtime.changeId = 0;

    this.state = createDeepStore({
      total: props.total,
      page: {
        size: props.page.size,
        current,
      },
      count: {
        sibling: props.count.sibling,
        boundary: props.count.boundary,
      },
      pageCount,
      locked: false,
    });

    this.props.page.current = current;
  }

  /**
   * 构建分页 DOM 并绑定事件。
   * @returns {Pagination} 当前实例。
   */
  build() {
    this._assertActive('build');
    if (this.runtime.built) return this;

    this.init(this.props);
    this.root = jsx('div', {
      className: 'j-pagination',
      role: 'navigation',
      'aria-label': 'Pagination',
      children: jsx('ul', {
        className: 'pagination',
        'aria-live': 'polite',
      }),
    });

    this.dom.list = this.root.querySelector('.pagination');
    this.dom.prev = this._buildControlItem('prev');
    this.dom.next = this._buildControlItem('next');
    this.dom.list.append(this.dom.prev, this.dom.next);

    this.dom.container.textContent = '';
    this.dom.container.appendChild(this.root);
    this.runtime.built = true;

    this._bindControlState();
    this._bindPageItems();
    this._bindEvents();
    return this;
  }

  /**
   * 跳转到指定页码。
   * @param {number} page 新页码。
   * @returns {Pagination} 当前实例。
   */
  go(page) {
    this._assertActive('go');
    validateParam(
      'page',
      page,
      {
        type: 'number',
        validate: Number.isInteger,
        message: 'expects an integer.',
      },
      'Pagination.go'
    );

    if (this._isLocked()) return this;

    const nextPage = clamp(page, 1, this.state.pageCount);
    if (nextPage === this.state.page.current) return this;

    const shouldLock =
      this.props.lock && typeof this.props.onChange === 'function';
    const changeId = shouldLock
      ? ++this.runtime.changeId
      : this.runtime.changeId;

    flushSync(() => {
      this.state.page.current = nextPage;
      if (shouldLock) this.state.locked = true;
    });
    this.props.page.current = nextPage;

    if (typeof this.props.onChange === 'function') {
      let result;
      try {
        result = this.props.onChange(nextPage, this);
      } catch (error) {
        if (shouldLock && changeId === this.runtime.changeId) {
          flushSync(() => {
            this.state.locked = false;
          });
        }
        throw error;
      }

      if (shouldLock && result && typeof result.then === 'function') {
        const unlock = () => {
          if (!this.runtime.destroyed && changeId === this.runtime.changeId) {
            flushSync(() => {
              this.state.locked = false;
            });
          }
        };
        void Promise.resolve(result).then(unlock, unlock);
      } else if (shouldLock && changeId === this.runtime.changeId) {
        flushSync(() => {
          this.state.locked = false;
        });
      }
    }

    return this;
  }

  /**
   * 更新分页配置。
   * @param {object} [newProps={}] 新配置，会与当前 props 合并。
   * @returns {Pagination} 当前实例。
   */
  update(newProps = {}) {
    this._assertActive('update');
    validateParam(
      'newProps',
      newProps,
      { type: 'object' },
      'Pagination.update'
    );

    const props = normalizeProps({
      total: newProps.total ?? this.props.total,
      lock: Object.hasOwn(newProps, 'lock') ? newProps.lock : this.props.lock,
      onChange: Object.hasOwn(newProps, 'onChange')
        ? newProps.onChange
        : this.props.onChange,
      page: {
        ...this.props.page,
        ...newProps.page,
      },
      count: {
        ...this.props.count,
        ...newProps.count,
      },
    });
    const pageCount = this._getPageCount(props.total, props.page.size);
    props.page.current = clamp(props.page.current, 1, pageCount);

    this.props = props;
    flushSync(() => {
      this.state.total = props.total;
      this.state.page.size = props.page.size;
      this.state.page.current = props.page.current;
      this.state.count.sibling = props.count.sibling;
      this.state.count.boundary = props.count.boundary;
      this.state.pageCount = pageCount;
      if (!props.lock) this.state.locked = false;
    });

    return this;
  }

  _getPageCount(total, size) {
    return Math.max(1, Math.ceil(total / size));
  }

  _getPageItems() {
    return resolvePageItems(
      this.state.page.current,
      this.state.pageCount,
      this.state.count
    );
  }

  _getItemsKey() {
    return [
      this.state.page.current,
      this._isLocked() ? 'locked' : 'unlocked',
      ...this._getPageItems().map((item) => item.key),
    ].join('|');
  }

  _isLocked() {
    return this.props.lock && this.state.locked;
  }

  _isPrevDisabled() {
    return this._isLocked() || this.state.page.current <= 1;
  }

  _isNextDisabled() {
    return this._isLocked() || this.state.page.current >= this.state.pageCount;
  }

  _buildControlItem(type) {
    const item = jsx('li', {
      className: 'item',
      children: jsx('button', {
        className: 'j-button is-icon is-ghost',
        type: 'button',
        'data-page-action': type,
        children: icon(type === 'prev' ? 'arrow-left' : 'arrow-right'),
      }),
    });

    return item;
  }

  _buildPageItem(item) {
    const disabled = this._isLocked();

    if (item.type === 'more') {
      return jsx('li', {
        className: 'item more',
        'aria-hidden': 'true',
        children: jsx('button', {
          className: 'j-button is-icon is-ghost',
          type: 'button',
          disabled,
          children: icon('more'),
        }),
      });
    }

    return jsx('li', {
      className: 'item',
      children:
        item.page === this.state.page.current
          ? jsx('span', {
              className: 'j-button is-icon is-active',
              'data-current-page': String(item.page),
              'aria-current': 'page',
              'aria-label': `Page ${item.page}, current page`,
              children: disabled
                ? jsx('i', {
                    className: 'animate-spin',
                    children: icon('loader'),
                  })
                : String(item.page),
            })
          : jsx('button', {
              className: 'j-button is-icon is-ghost',
              type: 'button',
              'data-page': String(item.page),
              'aria-label': `Go to page ${item.page}`,
              'aria-disabled': disabled ? 'true' : null,
              disabled,
              tabindex: disabled ? '-1' : null,
              children: String(item.page),
            }),
    });
  }

  _bindControlState() {
    this.cleanup.controls?.();
    this.cleanup.controls = createRoot((dispose) => {
      const prev = this.dom.prev?.querySelector('[data-page-action]');
      const next = this.dom.next?.querySelector('[data-page-action]');

      if (prev) {
        // bindClass(prev, 'is-disabled', () => this._isPrevDisabled());
        bindAttr(prev, 'disabled', () => this._isPrevDisabled());
        bindAttr(prev, 'aria-disabled', () =>
          this._isPrevDisabled() ? 'true' : 'false'
        );
        bindAttr(prev, 'tabindex', () =>
          this._isPrevDisabled() ? '-1' : null
        );
        bindAttr(prev, 'aria-label', () => 'Go to previous page');
      }

      if (next) {
        // bindClass(next, 'is-disabled', () => this._isNextDisabled());
        bindAttr(next, 'disabled', () => this._isNextDisabled());
        bindAttr(next, 'aria-disabled', () =>
          this._isNextDisabled() ? 'true' : 'false'
        );
        bindAttr(next, 'tabindex', () =>
          this._isNextDisabled() ? '-1' : null
        );
        bindAttr(next, 'aria-label', () => 'Go to next page');
      }

      return dispose;
    });
  }

  _bindPageItems() {
    this.cleanup.itemsEffect?.dispose();
    this.cleanup.itemsEffect = createEffect(() => {
      const nextKey = this._getItemsKey();
      if (nextKey === this.runtime.itemsKey) return;

      this.runtime.itemsKey = nextKey;
      this._renderPageItems();
    });
  }

  _renderPageItems() {
    this.dom.items = [];

    const items = this._getPageItems();
    const nodes = items.map((item) => this._buildPageItem(item));

    for (const node of this.dom.pageNodes) node.remove();
    this.dom.pageNodes = nodes;
    for (const node of nodes) this.dom.list.insertBefore(node, this.dom.next);
  }

  _bindEvents() {
    this.cleanup.events.on('click', this.root, 'click', (event) => {
      const target = event.target.closest('[data-page], [data-page-action]');
      if (!target || !this.root.contains(target)) return;

      event.preventDefault();

      const action = target.dataset.pageAction;
      if (action === 'prev' && !this._isPrevDisabled()) {
        this.go(this.state.page.current - 1);
        return;
      }

      if (action === 'next' && !this._isNextDisabled()) {
        this.go(this.state.page.current + 1);
        return;
      }

      if (target.dataset.page) {
        this.go(Number(target.dataset.page));
      }
    });
  }

  _assertActive(method) {
    if (this.runtime.destroyed) {
      throw new Error(`Pagination.${method}: instance has been destroyed.`);
    }
  }

  onDestroy() {
    this.cleanup.events.clear();
    this.cleanup.controls?.();
    this.cleanup.itemsEffect?.dispose();
    this.cleanup.controls = null;
    this.cleanup.itemsEffect = null;

    if (this.dom.container) this.dom.container.textContent = '';

    this.runtime.built = false;
    this.runtime.itemsKey = '';
    this.runtime.changeId = 0;
    this.dom.container = null;
    this.dom.list = null;
    this.dom.prev = null;
    this.dom.next = null;
    this.dom.pageNodes = [];
    this.dom.items = [];
  }
}

export function createPagination(container, props = {}) {
  return new Pagination(container, props);
}

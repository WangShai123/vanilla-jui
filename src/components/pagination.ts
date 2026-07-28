import {
  bindAttr,
  createDeepStore,
  createEffect,
  createRoot,
  flushSync,
  jsx,
} from 'vanilla-signal';

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
} from '../core/Component.ts';
import {
  type ResolveSchema,
  hasOwn,
  resolveProps,
  validateParam,
} from '../utilities/core.ts';
import {
  type DOMReference,
  q,
  requireContainer,
  requireRenderDOM,
} from '../utilities/dom.ts';
import { icon } from './icons.ts';

export interface PaginationPage {
  size: number;
  current: number;
}

export interface PaginationCount {
  sibling: number;
  boundary: number;
}

export interface PaginationClassNames {
  root: string;
  list: string;
  item: string;
  more: string;
  button: string;
  buttonIcon: string;
  buttonGhost: string;
  active: string;
  loading: string;
}

export type PaginationClassNameConfig = Partial<PaginationClassNames>;

export interface PaginationProps extends Record<string, unknown> {
  total?: number;
  page?: Partial<PaginationPage>;
  count?: Partial<PaginationCount>;
  lock?: boolean;
  onChange?:
    | ((page: number, instance: Pagination) => void | Promise<unknown>)
    | null;
  className?: PaginationClassNameConfig;
}

interface ResolvedPaginationProps extends Record<string, unknown> {
  total: number;
  page: PaginationPage;
  count: PaginationCount;
  lock: boolean;
  onChange: NonNullable<PaginationProps['onChange']> | null;
  className: PaginationClassNames;
}

interface PaginationState extends Record<string, unknown> {
  total: number;
  page: PaginationPage;
  count: PaginationCount;
  pageCount: number;
  locked: boolean;
}

interface PageItem {
  type: 'page';
  key: string;
  page: number;
}

interface MoreItem {
  type: 'more';
  key: string;
}

type PaginationItem = PageItem | MoreItem;
type PageAction = 'prev' | 'next';
type Dispose = () => void;
type EffectDispose = { dispose: () => void };

interface PaginationDOM extends ComponentDOM {
  root: HTMLElement | null;
  container: Element | null;
  list: HTMLElement | null;
  prev: HTMLElement | null;
  next: HTMLElement | null;
  pageNodes: HTMLElement[];
  items: PaginationItem[];
}

interface PaginationRuntime extends ComponentRuntime {
  built: boolean;
  itemsKey: string;
  changeId: number;
}

interface PaginationCleanupExtras {
  controls?: Dispose | null;
  itemsEffect?: EffectDispose | null;
}

const DEFAULT_CLASS_NAMES: PaginationClassNames = {
  root: 'j-pagination',
  list: 'pagination',
  item: 'item',
  more: 'more',
  button: 'j-button',
  buttonIcon: 'is-icon',
  buttonGhost: 'is-ghost',
  active: 'is-active',
  loading: 'animate-spin',
};

const PAGE_RULE = {
  type: 'object',
  required: true,
  validate: (value: unknown) => {
    const page = value as Partial<PaginationPage>;
    return (
      !!page &&
      Number.isInteger(page.size) &&
      Number(page.size) > 0 &&
      Number.isInteger(page.current) &&
      Number(page.current) > 0
    );
  },
  message: 'expects { size, current } with positive integers.',
};

const COUNT_RULE = {
  type: 'object',
  required: true,
  validate: (value: unknown) => {
    const count = value as Partial<PaginationCount>;
    return (
      !!count &&
      Number.isInteger(count.sibling) &&
      Number(count.sibling) >= 0 &&
      Number.isInteger(count.boundary) &&
      Number(count.boundary) >= 0
    );
  },
  message:
    'expects { sibling, boundary } with integers greater than or equal 0.',
};

const PAGINATION_PROPS_SCHEMA = {
  total: {
    default: 0,
    type: 'number',
    validate: (value: unknown) => Number.isFinite(value) && Number(value) >= 0,
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
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
} satisfies ResolveSchema<PaginationProps>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeProps(input: PaginationProps = {}): ResolvedPaginationProps {
  const props = resolveProps(
    input,
    PAGINATION_PROPS_SCHEMA,
    'Pagination.props'
  ) as ResolvedPaginationProps;
  return {
    ...props,
    page: { ...props.page },
    count: { ...props.count },
    className: { ...props.className },
  };
}

function createMoreItem(key: string): MoreItem {
  return { type: 'more', key };
}

function createPageItem(page: number): PageItem {
  return { type: 'page', key: `page-${page}`, page };
}

function pageRange(start: number, end: number): number[] {
  const pages: number[] = [];
  for (let page = start; page <= end; page++) pages.push(page);
  return pages;
}

function resolvePageItems(
  current: number,
  pageCount: number,
  count: PaginationCount
): PaginationItem[] {
  if (pageCount <= 0) return [];

  const boundary = Math.max(0, count.boundary);
  const sibling = Math.max(0, count.sibling);
  const visibleCount = boundary * 2 + sibling * 2 + 3;

  if (pageCount <= visibleCount) {
    return pageRange(1, pageCount).map(createPageItem);
  }

  const pages = new Set<number>();

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
  const items: PaginationItem[] = [];

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
  declare props: ResolvedPaginationProps;
  declare state: PaginationState;
  declare dom: PaginationDOM;
  declare runtime: PaginationRuntime;
  declare cleanup: Component['cleanup'] & PaginationCleanupExtras;

  /**
   * @param {Element|Node|string|Array} container 挂载容器。
   * @param {object} [input={}] 分页配置。
   */
  constructor(container: DOMReference, input: PaginationProps = {}) {
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
  build(): this {
    this._assertActive('build');
    if (this.runtime.built) return this;

    this.init(this.props);
    this.root = jsx('div', {
      className: this.props.className.root,
      role: 'navigation',
      'aria-label': 'Pagination',
      'data-pagination': 'root',
      children: jsx('ul', {
        className: this.props.className.list,
        'data-pagination-list': '',
        'aria-live': 'polite',
      }),
    }) as HTMLElement;

    this.dom.list = q<HTMLElement>('[data-pagination-list]', this.root);
    this.dom.prev = this._buildControlItem('prev');
    this.dom.next = this._buildControlItem('next');
    this.dom.list?.append(this.dom.prev, this.dom.next);

    const container = this.dom.container;
    if (!container) return this;
    container.textContent = '';
    container.appendChild(this.root);
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
  go(page: number): this {
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
      let result: void | Promise<unknown>;
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
  update(newProps: PaginationProps = {}): this {
    this._assertActive('update');
    validateParam(
      'newProps',
      newProps,
      { type: 'object' },
      'Pagination.update'
    );

    const props = normalizeProps({
      total: newProps.total ?? this.props.total,
      lock: hasOwn(newProps, 'lock') ? newProps.lock : this.props.lock,
      onChange: hasOwn(newProps, 'onChange')
        ? newProps.onChange
        : this.props.onChange,
      className: {
        ...this.props.className,
        ...newProps.className,
      },
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

  _getPageCount(total: number, size: number): number {
    return Math.max(1, Math.ceil(total / size));
  }

  _getPageItems(): PaginationItem[] {
    return resolvePageItems(
      this.state.page.current,
      this.state.pageCount,
      this.state.count
    );
  }

  _getItemsKey(): string {
    return [
      this.state.page.current,
      this._isLocked() ? 'locked' : 'unlocked',
      ...this._getPageItems().map((item) => item.key),
    ].join('|');
  }

  _isLocked(): boolean {
    return this.props.lock && this.state.locked;
  }

  _isPrevDisabled(): boolean {
    return this._isLocked() || this.state.page.current <= 1;
  }

  _isNextDisabled(): boolean {
    return this._isLocked() || this.state.page.current >= this.state.pageCount;
  }

  _buttonClass(...extra: string[]): string {
    const { button, buttonIcon, buttonGhost } = this.props.className;
    return [button, buttonIcon, buttonGhost, ...extra]
      .filter(Boolean)
      .join(' ');
  }

  _buildControlItem(type: PageAction): HTMLElement {
    const item = jsx('li', {
      className: this.props.className.item,
      'data-pagination-control': type,
      children: jsx('button', {
        className: this._buttonClass(),
        type: 'button',
        'data-page-action': type,
        children: icon(type === 'prev' ? 'arrow-left' : 'arrow-right'),
      }),
    }) as HTMLElement;

    return item;
  }

  _buildPageItem(item: PaginationItem): HTMLElement {
    const disabled = this._isLocked();

    if (item.type === 'more') {
      return jsx('li', {
        className: [this.props.className.item, this.props.className.more]
          .filter(Boolean)
          .join(' '),
        'data-pagination-more': item.key,
        'aria-hidden': 'true',
        children: jsx('button', {
          className: this._buttonClass(),
          type: 'button',
          disabled,
          children: icon('more'),
        }),
      }) as HTMLElement;
    }

    return jsx('li', {
      className: this.props.className.item,
      'data-pagination-item': String(item.page),
      children:
        item.page === this.state.page.current
          ? jsx('span', {
              className: [
                this.props.className.button,
                this.props.className.buttonIcon,
                this.props.className.active,
              ]
                .filter(Boolean)
                .join(' '),
              'data-current-page': String(item.page),
              'aria-current': 'page',
              'aria-label': `Page ${item.page}, current page`,
              children: disabled
                ? jsx('i', {
                    className: this.props.className.loading,
                    children: icon('loader'),
                  })
                : String(item.page),
            })
          : jsx('button', {
              className: this._buttonClass(),
              type: 'button',
              'data-page': String(item.page),
              'aria-label': `Go to page ${item.page}`,
              'aria-disabled': disabled ? 'true' : null,
              disabled,
              tabindex: disabled ? '-1' : null,
              children: String(item.page),
            }),
    }) as HTMLElement;
  }

  _bindControlState(): void {
    this.cleanup.controls?.();
    this.cleanup.controls = createRoot((dispose) => {
      const prev = this.dom.prev
        ? q<HTMLButtonElement>('[data-page-action]', this.dom.prev)
        : null;
      const next = this.dom.next
        ? q<HTMLButtonElement>('[data-page-action]', this.dom.next)
        : null;

      if (prev) {
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

  _bindPageItems(): void {
    this.cleanup.itemsEffect?.dispose();
    this.cleanup.itemsEffect = createEffect(() => {
      const nextKey = this._getItemsKey();
      if (nextKey === this.runtime.itemsKey) return;

      this.runtime.itemsKey = nextKey;
      this._renderPageItems();
    });
  }

  _renderPageItems(): void {
    this.dom.items = [];
    if (!this.dom.list || !this.dom.next) return;

    const items = this._getPageItems();
    const nodes = items.map((item) => this._buildPageItem(item));

    for (const node of this.dom.pageNodes) node.remove();
    this.dom.pageNodes = nodes;
    for (const node of nodes) this.dom.list.insertBefore(node, this.dom.next);
  }

  _bindEvents(): void {
    const root = this.root;
    if (!root) return;
    this.cleanup.events.on('click', root, 'click', (event) => {
      const source = event.target;
      if (!(source instanceof Element)) return;

      const target = source.closest<HTMLElement>(
        '[data-page], [data-page-action]'
      );
      if (!target || !root.contains(target)) return;

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

  _assertActive(method: string): void {
    if (this.runtime.destroyed) {
      throw new Error(`Pagination.${method}: instance has been destroyed.`);
    }
  }

  protected onDestroy(): void {
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

export function createPagination(
  container: DOMReference,
  props: PaginationProps = {}
): Pagination {
  return new Pagination(container, props);
}

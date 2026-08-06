import {
  createDeepStore,
  createEffect,
  createRoot,
  flushSync,
  jsx,
  untrack,
} from 'vanilla-signal';

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
} from '../core/Component.ts';
import { icon } from '../primitives/icons.ts';
import { isPlainObject } from '../utilities/object.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';

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
  current: string;
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

interface PaginationDOM extends ComponentDOM {
  root: HTMLElement | null;
  list: HTMLElement | null;
}

interface PaginationRuntime extends ComponentRuntime {
  built: boolean;
  itemsKey: string;
  changeId: number;
}

interface PaginationCleanupExtras {
  state?: (() => void) | null;
}

interface PaginationSnapshot {
  total: number;
  size: number;
  current: number;
  sibling: number;
  boundary: number;
  locked: boolean;
}

const DEFAULT_PAGE: PaginationPage = {
  size: 10,
  current: 1,
};

const DEFAULT_COUNT: PaginationCount = {
  sibling: 1,
  boundary: 1,
};

const DEFAULT_CLASS_NAMES: PaginationClassNames = {
  root: 'j-pagination',
  list: 'pagination',
  item: 'item',
  more: 'more',
  button: 'j-button is-icon is-ghost',
  current: 'j-button is-icon is-active',
  loading: 'animate-spin',
};

const TOTAL_RULE = {
  default: 0,
  type: 'number',
  finite: true,
  min: 0,
};

const PAGE_RULE = {
  type: 'plainObject',
  required: true,
  shape: {
    size: { type: 'number', integer: true, greaterThan: 0 },
    current: { type: 'number', integer: true, greaterThan: 0 },
  },
};

const COUNT_RULE = {
  type: 'plainObject',
  required: true,
  shape: {
    sibling: { type: 'number', integer: true, min: 0 },
    boundary: { type: 'number', integer: true, min: 0 },
  },
};

const PAGINATION_PROPS_SCHEMA = {
  total: TOTAL_RULE,
  page: {
    default: () => ({ ...DEFAULT_PAGE }),
    factory: true,
    normalize: (value: unknown) => ({
      ...DEFAULT_PAGE,
      ...(value && typeof value === 'object' ? value : {}),
    }),
    ...PAGE_RULE,
  },
  count: {
    default: () => ({ ...DEFAULT_COUNT }),
    factory: true,
    normalize: (value: unknown) => ({
      ...DEFAULT_COUNT,
      ...(value && typeof value === 'object' ? value : {}),
    }),
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

const PAGINATION_STATE_SCHEMA = {
  total: TOTAL_RULE,
  page: PAGE_RULE,
  count: COUNT_RULE,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getPageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

function clonePage(page: PaginationPage): PaginationPage {
  return { size: page.size, current: page.current };
}

function cloneCount(count: PaginationCount): PaginationCount {
  return { sibling: count.sibling, boundary: count.boundary };
}

function normalizeProps(input: PaginationProps = {}): ResolvedPaginationProps {
  const props = resolveProps(
    input,
    PAGINATION_PROPS_SCHEMA,
    'Pagination.props'
  ) as ResolvedPaginationProps;
  const pageCount = getPageCount(props.total, props.page.size);

  return {
    ...props,
    page: {
      size: props.page.size,
      current: clamp(props.page.current, 1, pageCount),
    },
    count: cloneCount(props.count),
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
    const previous = items[items.length - 1];
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

class PaginationComponent extends Component<
  ResolvedPaginationProps,
  PaginationState,
  PaginationDOM
> {
  declare runtime: PaginationRuntime;
  declare state: PaginationState;
  declare cleanup: Component['cleanup'] & PaginationCleanupExtras;

  constructor(input: PaginationProps = {}) {
    const props = normalizeProps(input);
    super(props);

    this.dom.list = null;
    this.cleanup.state = null;

    this.runtime.built = false;
    this.runtime.itemsKey = '';
    this.runtime.changeId = 0;

    this.state = createDeepStore({
      total: props.total,
      page: clonePage(props.page),
      count: cloneCount(props.count),
      pageCount: getPageCount(props.total, props.page.size),
      locked: false,
    }) as PaginationState;
  }

  build(): this {
    if (this.runtime.destroyed) {
      throw new Error('Pagination.build: instance has been destroyed.');
    }
    if (this.runtime.built) return this;

    this.dom.root = jsx('div', {
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

    this.dom.list = this.dom.root.querySelector('[data-pagination-list]');
    this.runtime.built = true;
    this.bindState();
    this.bindEvents();
    this.emit('init', this.props);
    return this;
  }

  go(page: number): this {
    this.assertActive('go');
    validateParam(
      'page',
      page,
      {
        type: 'number',
        integer: true,
      },
      'Pagination.go'
    );

    if (this.isLocked()) return this;

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

    if (typeof this.props.onChange === 'function') {
      let result: void | Promise<unknown>;
      try {
        result = this.props.onChange(nextPage, this);
      } catch (error) {
        this.unlock(changeId);
        throw error;
      }

      if (shouldLock && result && typeof result.then === 'function') {
        const unlock = () => this.unlock(changeId);
        void Promise.resolve(result).then(unlock, unlock);
      } else {
        this.unlock(changeId);
      }
    }

    return this;
  }

  private bindState(): void {
    if (this.cleanup.state) return;

    this.cleanup.state = createRoot((dispose) => {
      createEffect(() => {
        const snapshot: PaginationSnapshot = {
          total: this.state.total,
          size: this.state.page.size,
          current: this.state.page.current,
          sibling: this.state.count.sibling,
          boundary: this.state.count.boundary,
          locked: this.state.locked,
        };
        untrack(() => this.syncState(snapshot));
      });
      return dispose;
    });
  }

  private syncState(snapshot: PaginationSnapshot): void {
    validateParam('total', snapshot.total, TOTAL_RULE, 'Pagination.state');
    validateParam(
      'page',
      { size: snapshot.size, current: snapshot.current },
      PAGE_RULE,
      'Pagination.state'
    );
    validateParam(
      'count',
      { sibling: snapshot.sibling, boundary: snapshot.boundary },
      COUNT_RULE,
      'Pagination.state'
    );

    const pageCount = getPageCount(snapshot.total, snapshot.size);
    const current = clamp(snapshot.current, 1, pageCount);

    if (
      this.state.pageCount !== pageCount ||
      this.state.page.current !== current
    ) {
      flushSync(() => {
        this.state.pageCount = pageCount;
        this.state.page.current = current;
      });
    }

    this.renderItems();
  }

  private renderItems(): void {
    if (!this.dom.list) return;

    const items = this.getPageItems();
    const itemsKey = [
      this.state.page.current,
      this.state.pageCount,
      this.isLocked() ? 'locked' : 'unlocked',
      ...items.map((item) => item.key),
    ].join('|');

    if (itemsKey === this.runtime.itemsKey) return;

    this.runtime.itemsKey = itemsKey;
    this.dom.list.textContent = '';
    this.dom.list.append(
      this.buildControlItem('prev'),
      ...items.map((item) => this.buildPageItem(item)),
      this.buildControlItem('next')
    );
  }

  private getPageItems(): PaginationItem[] {
    return resolvePageItems(this.state.page.current, this.state.pageCount, {
      sibling: this.state.count.sibling,
      boundary: this.state.count.boundary,
    });
  }

  private isLocked(): boolean {
    return this.props.lock && this.state.locked;
  }

  private isPrevDisabled(): boolean {
    return this.isLocked() || this.state.page.current <= 1;
  }

  private isNextDisabled(): boolean {
    return this.isLocked() || this.state.page.current >= this.state.pageCount;
  }

  private buildControlItem(type: PageAction): HTMLElement {
    const disabled =
      type === 'prev' ? this.isPrevDisabled() : this.isNextDisabled();
    return jsx('li', {
      className: this.props.className.item,
      'data-pagination-control': type,
      children: jsx('button', {
        className: this.props.className.button,
        type: 'button',
        'data-page-action': type,
        'aria-label':
          type === 'prev' ? 'Go to previous page' : 'Go to next page',
        'aria-disabled': disabled ? 'true' : 'false',
        tabindex: disabled ? '-1' : null,
        disabled,
        children: icon(type === 'prev' ? 'arrow-left' : 'arrow-right'),
      }),
    }) as HTMLElement;
  }

  private buildPageItem(item: PaginationItem): HTMLElement {
    const disabled = this.isLocked();

    if (item.type === 'more') {
      return jsx('li', {
        className: [this.props.className.item, this.props.className.more]
          .filter(Boolean)
          .join(' '),
        'data-pagination-more': item.key,
        children: jsx('span', {
          className: this.props.className.button,
          children: icon('more'),
        }),
      }) as HTMLElement;
    }

    if (item.page === this.state.page.current) {
      return jsx('li', {
        className: this.props.className.item,
        'data-pagination-item': String(item.page),
        children: jsx('span', {
          className: this.props.className.current,
          'data-current-page': String(item.page),
          'aria-current': 'page',
          'aria-label': `Page ${item.page}, current page`,
          children: disabled
            ? jsx('i', {
                className: this.props.className.loading,
                children: icon('loader'),
              })
            : String(item.page),
        }),
      }) as HTMLElement;
    }

    return jsx('li', {
      className: this.props.className.item,
      'data-pagination-item': String(item.page),
      children: jsx('button', {
        className: this.props.className.button,
        type: 'button',
        'data-page': String(item.page),
        'aria-label': `Go to page ${item.page}`,
        'aria-disabled': disabled ? 'true' : 'false',
        tabindex: disabled ? '-1' : null,
        disabled,
        children: String(item.page),
      }),
    }) as HTMLElement;
  }

  private bindEvents(): void {
    this.unbindEvents();
    const root = this.dom.root;
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
      if (action === 'prev' && !this.isPrevDisabled()) {
        this.go(this.state.page.current - 1);
        return;
      }

      if (action === 'next' && !this.isNextDisabled()) {
        this.go(this.state.page.current + 1);
        return;
      }

      if (target.dataset.page) {
        this.go(Number(target.dataset.page));
      }
    });
  }

  private unbindEvents(): void {
    this.cleanup.events.clear();
  }

  private unlock(changeId: number): void {
    if (
      this.props.lock &&
      !this.runtime.destroyed &&
      changeId === this.runtime.changeId
    ) {
      flushSync(() => {
        this.state.locked = false;
      });
    }
  }

  private assertActive(method: string): void {
    if (this.runtime.destroyed) {
      throw new Error(`Pagination.${method}: instance has been destroyed.`);
    }
    if (!this.runtime.built) {
      throw new Error(`Pagination.${method}: call build() first.`);
    }
  }

  protected override normalizeStatePatch(
    patch: Partial<PaginationState>
  ): Partial<PaginationState> {
    const nextPatch = { ...patch };
    if (Object.hasOwn(nextPatch, 'page') && isPlainObject(nextPatch.page)) {
      nextPatch.page = {
        ...this.state.page,
        ...(nextPatch.page as Partial<PaginationPage>),
      };
    }
    if (Object.hasOwn(nextPatch, 'count') && isPlainObject(nextPatch.count)) {
      nextPatch.count = {
        ...this.state.count,
        ...(nextPatch.count as Partial<PaginationCount>),
      };
    }
    return nextPatch;
  }

  protected override validateStatePatch(patch: Partial<PaginationState>): void {
    validateParam(
      'state',
      patch,
      {
        type: 'plainObject',
      },
      'Pagination.setState'
    );

    for (const key of Object.keys(patch)) {
      if (!Object.hasOwn(PAGINATION_STATE_SCHEMA, key)) {
        throw new Error(
          `Pagination.setState: "${key}" is not a supported state key.`
        );
      }
      const stateKey = key as keyof typeof PAGINATION_STATE_SCHEMA;
      validateParam(
        key,
        patch[key as keyof PaginationState],
        PAGINATION_STATE_SCHEMA[stateKey],
        'Pagination.setState'
      );
    }
  }

  protected onDestroy(): void {
    this.unbindEvents();
    this.cleanup.state?.();
    this.cleanup.state = null;
    this.dom.root?.remove();
    this.runtime.built = false;
    this.runtime.itemsKey = '';
    this.runtime.changeId = 0;
    this.dom.list = null;
  }
}

export type Pagination = PaginationComponent;

export function createPagination(input: PaginationProps = {}): Pagination {
  return new PaginationComponent(input);
}

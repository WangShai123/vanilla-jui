import {
  For,
  createDeepStore,
  createEffect,
  createMemo,
  flushSync,
  jsx,
} from 'vanilla-signal';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
import { icon } from '../primitives/icons.ts';
import { isPlainObject } from '../utilities/object.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';
import { translate } from '../utilities/locale.ts';
import { createLoading } from '../primitives/loading.ts';

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
  button: string;
  moreBtn: string;
  currentBtn: string;
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

interface PaginationActions {
  go(page: number): Pagination;
}

export type Pagination = FunctionalComponent<
  ResolvedPaginationProps,
  PaginationState,
  HTMLElement,
  PaginationActions
> & {
  readonly pageCount: number;
};

const DEFAULT_PAGE: PaginationPage = { size: 10, current: 1 };
const DEFAULT_COUNT: PaginationCount = { sibling: 1, boundary: 1 };
const DEFAULT_CLASS_NAMES: PaginationClassNames = {
  root: 'j-pagination',
  list: 'pagination',
  item: 'item',
  button: 'j-button is-default is-icon',
  currentBtn: 'j-button is-ghost is-icon is-active',
  moreBtn: 'j-button is-ghost is-icon',
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
  locked: { type: 'boolean' },
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
      items.push(
        page - previous.page === 2
          ? createPageItem(previous.page + 1)
          : createMoreItem(`more-${previous.page}-${page}`)
      );
    }
    items.push(createPageItem(page));
  }
  return items;
}

function requirePageItem(item: PaginationItem): PageItem {
  if (item.type !== 'page') {
    throw new Error('Pagination.itemView: expects page item.');
  }
  return item;
}

export function createPagination(input: PaginationProps = {}): Pagination {
  const props = normalizeProps(input);
  const state = createDeepStore({
    total: props.total,
    page: clonePage(props.page),
    count: cloneCount(props.count),
    locked: false,
  }) as PaginationState;
  let changeId = 0;
  let pagination: Pagination;

  const pageCount = createMemo(() =>
    getPageCount(state.total, state.page.size)
  );
  const isLocked = (): boolean => props.lock && state.locked;
  const isPrevDisabled = (): boolean => isLocked() || state.page.current <= 1;
  const isNextDisabled = (): boolean =>
    isLocked() || state.page.current >= pageCount();
  const pageItems = createMemo(() =>
    resolvePageItems(state.page.current, pageCount(), state.count)
  );

  const unlock = (id: number): void => {
    if (props.lock && !pagination.runtime.destroyed && id === changeId) {
      flushSync(() => {
        state.locked = false;
      });
    }
  };

  const go = (page: number): Pagination => {
    if (pagination.runtime.destroyed) {
      throw new Error('Pagination.go: instance destroyed');
    }
    if (!pagination.runtime.built) {
      throw new Error('Pagination.go: call build() first.');
    }
    validateParam(
      'page',
      page,
      { type: 'number', integer: true },
      'Pagination.go'
    );
    if (isLocked()) return pagination;

    const nextPage = clamp(page, 1, pageCount());
    if (nextPage === state.page.current) return pagination;
    const shouldLock = props.lock && typeof props.onChange === 'function';
    const currentChangeId = shouldLock ? ++changeId : changeId;

    flushSync(() => {
      state.page.current = nextPage;
      if (shouldLock) state.locked = true;
    });

    if (props.onChange) {
      let result: void | Promise<unknown>;
      try {
        result = props.onChange(nextPage, pagination);
      } catch (error) {
        unlock(currentChangeId);
        throw error;
      }

      if (shouldLock && result && typeof result.then === 'function') {
        const release = () => unlock(currentChangeId);
        void Promise.resolve(result).then(release, release);
      } else {
        unlock(currentChangeId);
      }
    }
    return pagination;
  };

  const controlView = (type: PageAction): HTMLElement => {
    const disabled = type === 'prev' ? isPrevDisabled : isNextDisabled;
    return jsx('li', {
      className: props.className.item,
      'data-pagination-control': type,
      children: jsx('button', {
        className: props.className.button,
        type: 'button',
        'data-page-action': type,
        'aria-label':
          type === 'prev'
            ? translate('Go to previous page')
            : translate('Go to next page'),
        'aria-disabled': () => (disabled() ? 'true' : 'false'),
        tabindex: () => (disabled() ? '-1' : null),
        disabled,
        onClick: () => {
          if (!disabled()) {
            go(state.page.current + (type === 'prev' ? -1 : 1));
          }
        },
        children: icon(type === 'prev' ? 'arrow-left' : 'arrow-right'),
      }),
    }) as HTMLElement;
  };

  const itemView = (itemAccessor: () => PaginationItem): HTMLElement => {
    if (itemAccessor().type === 'more') {
      return jsx('li', {
        className: props.className.item,
        'data-pagination-more': () =>
          itemAccessor().type === 'more' ? itemAccessor().key : null,
        children: jsx('span', {
          className: props.className.moreBtn,
          'aria-disabled': true,
          disabled: '',
          children: icon('more'),
        }),
      }) as HTMLElement;
    }

    const page = (): number => requirePageItem(itemAccessor()).page;
    const isCurrentPage = (): boolean => page() === state.page.current;

    return jsx('li', {
      className: props.className.item,
      'data-pagination-more': () =>
        itemAccessor().type === 'more' ? itemAccessor().key : null,
      'data-pagination-item': () => {
        const item = itemAccessor();
        return item.type === 'page' ? String(item.page) : null;
      },
      children: jsx('button', {
        className: () =>
          isCurrentPage() ? props.className.currentBtn : props.className.button,
        type: 'button',
        'data-page': () => String(page()),
        'data-current-page': () => (isCurrentPage() ? String(page()) : null),
        'aria-current': () => (isCurrentPage() ? 'page' : null),
        'aria-label': () =>
          isCurrentPage()
            ? `Page ${page()}, current page`
            : `Go to page ${page()}`,
        'aria-disabled': () =>
          isLocked() || isCurrentPage() ? 'true' : 'false',
        tabindex: () => (isLocked() || isCurrentPage() ? '-1' : null),
        disabled: () => isLocked() || isCurrentPage(),
        onClick: () => {
          const current = page();
          if (!isLocked() && !isCurrentPage()) go(current);
        },
        children: () =>
          isLocked() && isCurrentPage() ? createLoading() : String(page()),
      }),
    }) as HTMLElement;
  };

  pagination = defineComponent<
    ResolvedPaginationProps,
    PaginationState,
    HTMLElement,
    PaginationActions
  >({
    name: 'Pagination',
    props,
    state,
    actions: { go },
    normalizeStatePatch(patch) {
      const next = { ...patch };
      if (Object.hasOwn(next, 'page') && isPlainObject(next.page)) {
        next.page = { ...state.page, ...next.page } as PaginationPage;
      }
      if (Object.hasOwn(next, 'count') && isPlainObject(next.count)) {
        next.count = { ...state.count, ...next.count } as PaginationCount;
      }
      return next;
    },
    validateStatePatch(patch) {
      for (const key of Object.keys(patch)) {
        if (!Object.hasOwn(PAGINATION_STATE_SCHEMA, key)) {
          throw new Error(`Pagination.setState: "${key}" is not supported.`);
        }
        const stateKey = key as keyof typeof PAGINATION_STATE_SCHEMA;
        validateParam(
          key,
          patch[key as keyof PaginationState],
          PAGINATION_STATE_SCHEMA[stateKey],
          'Pagination.setState'
        );
      }
    },
    view: () => {
      createEffect(() => {
        const current = clamp(state.page.current, 1, pageCount());
        if (current !== state.page.current) state.page.current = current;
      });
      return jsx('div', {
        className: props.className.root,
        role: 'navigation',
        'aria-label': 'Pagination',
        'data-pagination': 'root',
        children: jsx('ul', {
          className: props.className.list,
          'data-pagination-list': '',
          'aria-live': 'polite',
          children: [
            controlView('prev'),
            For({
              each: pageItems,
              key: (item: PaginationItem) => item.key,
              children: (itemAccessor: () => PaginationItem) =>
                itemView(itemAccessor),
            }),
            controlView('next'),
          ],
        }),
      }) as HTMLElement;
    },
  }) as Pagination;

  Object.defineProperty(pagination, 'pageCount', {
    enumerable: true,
    get: pageCount,
  });
  return pagination;
}

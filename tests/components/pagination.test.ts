// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import {
  Pagination,
  createPagination,
} from '../../src/components/pagination.ts';

let pagination: Pagination | null = null;

function app(): HTMLElement {
  const element = document.querySelector<HTMLElement>('#app');
  if (!element) throw new Error('Missing #app fixture.');
  return element;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  pagination?.destroy();
  pagination = null;
  document.body.innerHTML = '';
});

describe('Pagination', () => {
  it('builds default classes and stable data markers', () => {
    pagination = new Pagination(app(), {
      total: 20,
      page: { size: 2, current: 1 },
      count: { sibling: 1, boundary: 1 },
    }).build();

    expect(pagination.root?.classList.contains('j-pagination')).toBe(true);
    expect(pagination.root?.getAttribute('data-pagination')).toBe('root');
    expect(pagination.dom.list?.classList.contains('pagination')).toBe(true);
    expect(pagination.dom.list?.hasAttribute('data-pagination-list')).toBe(
      true
    );
    expect(
      pagination.root?.querySelector('[data-page-action="prev"]')
    ).toBeTruthy();
    expect(
      pagination.root?.querySelector('[data-pagination-more] svg')
    ).toBeTruthy();
    expect(
      pagination.root?.querySelector('[aria-current="page"]')?.textContent
    ).toBe('1');
  });

  it('uses data markers for interaction when className is customized', () => {
    const onChange = vi.fn();

    pagination = createPagination(app(), {
      total: 10,
      page: { size: 2, current: 1 },
      count: { sibling: 1, boundary: 1 },
      className: {
        root: 'qa-pagination',
        list: 'qa-pagination-list',
        item: 'qa-pagination-item',
        button: 'qa-button',
        buttonIcon: 'qa-button-icon',
        buttonGhost: 'qa-button-ghost',
      },
      onChange,
    }).build();

    expect(pagination.root?.classList.contains('qa-pagination')).toBe(true);
    expect(pagination.root?.classList.contains('j-pagination')).toBe(false);
    expect(pagination.root?.querySelector('.pagination')).toBeNull();

    pagination.root
      ?.querySelector<HTMLButtonElement>('[data-page-action="next"]')
      ?.click();

    expect(pagination.state.page.current).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2, pagination);
    expect(
      pagination.root?.querySelector('[aria-current="page"]')?.textContent
    ).toBe('2');
  });

  it('locks while async onChange is pending and unlocks after settle', async () => {
    let resolveChange!: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveChange = resolve;
    });
    const onChange = vi.fn(() => pending);

    pagination = new Pagination(app(), {
      total: 10,
      page: { size: 2, current: 1 },
      count: { sibling: 1, boundary: 1 },
      onChange,
    }).build();

    pagination.go(2).go(3);

    expect(pagination.state.page.current).toBe(2);
    expect(pagination.state.locked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(
      pagination.root
        ?.querySelector('[data-page-action="next"]')
        ?.getAttribute('aria-disabled')
    ).toBe('true');

    resolveChange();
    await pending;
    await Promise.resolve();

    expect(pagination.state.locked).toBe(false);
    pagination.go(3);
    expect(pagination.state.page.current).toBe(3);
  });

  it('updates page count and clears DOM on destroy', () => {
    pagination = new Pagination(app(), {
      total: 20,
      page: { size: 2, current: 10 },
      count: { sibling: 1, boundary: 1 },
    }).build();

    pagination.update({ total: 6 });

    expect(pagination.state.pageCount).toBe(3);
    expect(pagination.state.page.current).toBe(3);

    pagination.destroy();
    pagination = null;

    expect(app().children).toHaveLength(0);
  });
});

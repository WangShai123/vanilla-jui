// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { createPagination } from '../src/components/pagination.ts';

type PaginationInstance = ReturnType<typeof createPagination>;

let pagination: PaginationInstance | null = null;

function app(): HTMLElement {
  const element = document.querySelector<HTMLElement>('#app');
  if (!element) throw new Error('Missing #app fixture.');
  return element;
}

function mount(instance: PaginationInstance): PaginationInstance {
  instance.build();
  if (!instance.element) throw new Error('Pagination did not build a root.');
  app().appendChild(instance.element);
  return instance;
}

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
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
  it('requires build before go', () => {
    pagination = createPagination({
      total: 20,
      page: { size: 2, current: 1 },
    });

    expect(() => pagination?.go(2)).toThrow('call build() first');
  });

  it('builds detached DOM with default classes and stable data markers', () => {
    pagination = createPagination({
      total: 20,
      page: { size: 2, current: 1 },
      count: { sibling: 1, boundary: 1 },
    });

    expect(pagination.element).toBeNull();

    pagination.build();
    expect(app().contains(pagination.element)).toBe(false);
    if (!pagination.element) throw new Error('Expected Pagination root.');
    app().appendChild(pagination.element);

    expect(pagination.element.classList.contains('j-pagination')).toBe(true);
    expect(pagination.element.getAttribute('data-pagination')).toBe('root');
    expect(
      pagination.element
        ?.querySelector('[data-pagination-list]')
        ?.classList.contains('pagination')
    ).toBe(true);
    expect(
      pagination.element
        ?.querySelector('[data-pagination-list]')
        ?.hasAttribute('data-pagination-list')
    ).toBe(true);
    expect(
      pagination.element.querySelector('[data-page-action="prev"]')
    ).toBeTruthy();
    expect(
      pagination.element.querySelector('[data-pagination-more] svg')
    ).toBeTruthy();
    expect(
      pagination.element
        .querySelector('[data-pagination-more]')
        ?.hasAttribute('aria-hidden')
    ).toBe(false);
    expect(
      pagination.element.querySelector('[data-pagination-more] button')
    ).toBeNull();
    expect(
      pagination.element.querySelector("[aria-current='page']")?.textContent
    ).toBe('1');
  });

  it('uses data markers for interaction when className is customized', () => {
    const onChange = vi.fn();

    pagination = mount(
      createPagination({
        total: 10,
        page: { size: 2, current: 1 },
        count: { sibling: 1, boundary: 1 },
        className: {
          root: 'qa-pagination',
          list: 'qa-pagination-list',
          item: 'qa-pagination-item',
          button: 'qa-button',
          current: 'qa-current',
        },
        onChange,
      })
    );

    expect(pagination.element?.classList.contains('qa-pagination')).toBe(true);
    expect(pagination.element?.classList.contains('j-pagination')).toBe(false);
    expect(pagination.element?.querySelector('.pagination')).toBeNull();

    pagination.element
      ?.querySelector<HTMLButtonElement>('[data-page-action="next"]')
      ?.click();

    expect(pagination.state.page.current).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2, pagination);
    expect(
      pagination.element?.querySelector("[aria-current='page']")?.textContent
    ).toBe('2');
  });

  it('locks while async onChange is pending and unlocks after settle', async () => {
    let resolveChange!: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveChange = resolve;
    });
    const onChange = vi.fn(() => pending);

    pagination = mount(
      createPagination({
        total: 10,
        page: { size: 2, current: 1 },
        count: { sibling: 1, boundary: 1 },
        onChange,
      })
    );

    pagination.go(2).go(3);

    expect(pagination.state.page.current).toBe(2);
    expect(pagination.state.locked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(
      pagination.element
        ?.querySelector('[data-page-action="next"]')
        ?.getAttribute('aria-disabled')
    ).toBe('true');

    resolveChange();
    await pending;
    await tick();

    expect(pagination.state.locked).toBe(false);
    pagination.go(3);
    expect(pagination.state.page.current).toBe(3);
  });

  it('refreshes from state updates and clamps current page', async () => {
    pagination = mount(
      createPagination({
        total: 20,
        page: { size: 2, current: 10 },
        count: { sibling: 1, boundary: 1 },
      })
    );

    pagination.setState({ total: 6 });
    await tick();

    expect(pagination.pageCount).toBe(3);
    expect(pagination.state.page.current).toBe(3);
    expect(
      pagination.element?.querySelector("[aria-current='page']")?.textContent
    ).toBe('3');

    pagination.setState({ page: { ...pagination.state.page, size: 3 } });
    await tick();

    expect(pagination.pageCount).toBe(2);
    expect(pagination.state.page.current).toBe(2);

    pagination.state.count.sibling = 0;
    pagination.state.count.boundary = 2;
    await tick();

    expect(
      pagination.element?.querySelectorAll('[data-pagination-item]')
    ).toHaveLength(2);
  });

  it('removes mounted DOM on destroy', () => {
    pagination = mount(
      createPagination({
        total: 20,
        page: { size: 2, current: 1 },
      })
    );

    expect(app().contains(pagination.element)).toBe(true);

    pagination.destroy();
    pagination = null;

    expect(app().children).toHaveLength(0);
  });
});

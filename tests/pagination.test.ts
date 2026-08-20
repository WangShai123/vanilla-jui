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

async function tick(count = 2): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await Promise.resolve();
  }
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
      pagination.element.querySelectorAll('[data-pagination-item="1"] button')
    ).toHaveLength(1);
    expect(
      pagination.element.querySelector('[data-pagination-item="1"] span')
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
          currentBtn: 'qa-current',
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

  it('updates from state changes and clamps current page', async () => {
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

  it('keeps root, mount parent, and keyed page nodes stable across state changes', async () => {
    pagination = mount(
      createPagination({
        total: 80,
        page: { size: 10, current: 1 },
        count: { sibling: 1, boundary: 1 },
      })
    );

    const root = pagination.element;
    const parent = root?.parentNode;
    const page2 = pagination.element?.querySelector(
      '[data-pagination-item="2"]'
    );
    if (!page2) throw new Error('Missing page 2 item.');

    pagination.state.total = 60;
    pagination.state.page.current = 2;
    pagination.state.count.sibling = 2;
    await tick();

    expect(pagination.element).toBe(root);
    expect(root?.parentNode).toBe(parent);
    expect(
      pagination.element?.querySelector('[data-pagination-item="2"]')
    ).toBe(page2);
    expect(
      pagination.element?.querySelector("[aria-current='page']")?.textContent
    ).toBe('2');
  });

  it('reacts to async data source pagination changes from onChange', async () => {
    const onChange = vi.fn(
      async (page: number, instance: PaginationInstance) => {
        await Promise.resolve();
        instance.setState({
          total: 12,
          page: { size: 5, current: page },
          count: { sibling: 0, boundary: 1 },
        });
      }
    );

    pagination = mount(
      createPagination({
        total: 100,
        page: { size: 10, current: 1 },
        count: { sibling: 1, boundary: 1 },
        onChange,
      })
    );
    const root = pagination.element;
    const parent = root?.parentNode;

    pagination.go(7);
    expect(pagination.state.page.current).toBe(7);
    expect(pagination.state.locked).toBe(true);

    await tick(6);

    expect(onChange).toHaveBeenCalledWith(7, pagination);
    expect(pagination.pageCount).toBe(3);
    expect(pagination.state.total).toBe(12);
    expect(pagination.state.page.size).toBe(5);
    expect(pagination.state.page.current).toBe(3);
    expect(pagination.state.count).toEqual({ sibling: 0, boundary: 1 });
    expect(pagination.state.locked).toBe(false);
    expect(pagination.element).toBe(root);
    expect(root?.parentNode).toBe(parent);
    expect(
      pagination.element?.querySelector("[aria-current='page']")?.textContent
    ).toBe('3');
    expect(
      pagination.element?.querySelectorAll('[data-pagination-item]')
    ).toHaveLength(3);
    expect(pagination.element?.querySelector('[data-pagination-more]')).toBe(
      null
    );
    expect(
      pagination.element
        ?.querySelector('[data-page-action="next"]')
        ?.getAttribute('aria-disabled')
    ).toBe('true');
  });

  it('unmounts and remounts with the same root and live state bindings', async () => {
    pagination = createPagination({
      total: 40,
      page: { size: 10, current: 1 },
    }).build();

    const root = pagination.element;
    if (!root) throw new Error('Expected Pagination root.');

    pagination.mount(app());
    expect(app().contains(root)).toBe(true);

    pagination.unmount();
    expect(app().contains(root)).toBe(false);

    pagination.mount(app());
    pagination.setState({ page: { ...pagination.state.page, current: 3 } });
    await tick();

    expect(pagination.element).toBe(root);
    expect(app().contains(root)).toBe(true);
    expect(
      pagination.element?.querySelector("[aria-current='page']")?.textContent
    ).toBe('3');
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

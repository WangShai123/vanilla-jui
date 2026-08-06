// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { createMenu, type MenuItem } from '../src/components/menu.ts';

type MenuInstance = ReturnType<typeof createMenu>;

let menu: MenuInstance | null = null;

function data(): MenuItem[] {
  return [
    { id: 'home', title: 'Home', url: '#home' },
    {
      id: 'docs',
      title: 'Docs',
      children: [
        { id: 'api', title: 'API', url: '#api' },
        { id: 'guide', title: 'Guide', url: '#guide' },
      ],
    },
  ];
}

function app(): HTMLElement {
  const element = document.querySelector<HTMLElement>('#app');
  if (!element) throw new Error('Missing #app fixture.');
  return element;
}

function mount(instance: MenuInstance): MenuInstance {
  instance.build();
  if (!instance.dom.root) throw new Error('Menu did not build a root.');
  app().appendChild(instance.dom.root);
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
  menu?.destroy();
  menu = null;
  document.body.innerHTML = '';
});

describe('Menu', () => {
  it('builds detached DOM with default classes and stable data markers', () => {
    menu = createMenu({ data: data() });

    expect(menu.dom.root).toBeNull();

    menu.build();
    expect(app().contains(menu.dom.root)).toBe(false);
    if (!menu.dom.root) throw new Error('Expected Menu root.');
    app().appendChild(menu.dom.root);

    expect(menu.dom.root.classList.contains('j-menu')).toBe(true);
    expect(menu.dom.root.getAttribute('data-menu')).toBe('root');
    expect(menu.dom.root.hasAttribute('data-menu-type')).toBe(false);
    expect(menu.dom.root.querySelector('[data-menu-list="root"]')).toBeTruthy();
    expect(menu.dom.root.querySelectorAll('[data-menu-item]')).toHaveLength(4);
    expect(
      menu.dom.root.querySelector('[data-menu-has-children]')
    ).toBeTruthy();
    expect(menu.dom.root.querySelector('[data-menu-list="sub"]')).toBeTruthy();
  });

  it('uses data markers for mobile submenu interaction when className is customized', () => {
    menu = mount(
      createMenu({
        type: 'mobile',
        data: data(),
        backText: 'Back',
        className: {
          root: 'qa-menu',
          list: 'qa-list',
          item: 'qa-item',
          hasChildren: 'qa-has-children',
          link: 'qa-link',
          subMenu: 'qa-sub-menu',
          backItem: 'qa-item qa-back',
        },
      })
    );

    expect(menu.dom.root?.classList.contains('qa-menu')).toBe(true);
    expect(menu.dom.root?.getAttribute('data-menu-type')).toBe('mobile');
    expect(menu.dom.root?.classList.contains('j-menu')).toBe(false);
    expect(menu.dom.root?.querySelector('.menu-item')).toBeNull();

    const parent = menu.dom.root?.querySelector<HTMLElement>(
      '[data-menu-has-children]'
    );
    parent?.querySelector<HTMLElement>('[data-menu-link]')?.click();

    expect(parent?.classList.contains('is-active')).toBe(true);
    expect(parent?.querySelector('[data-menu-back]')).toBeTruthy();
    expect(
      parent?.querySelector('[data-menu-back]')?.classList.contains('qa-back')
    ).toBe(true);

    parent
      ?.querySelector<HTMLElement>('[data-menu-back] [data-menu-link]')
      ?.click();

    expect(parent?.classList.contains('is-active')).toBe(false);
    expect(parent?.querySelector('[data-menu-back]')).toBeNull();
  });

  it('opens a mobile submenu when clicking the parent item surface', () => {
    menu = mount(
      createMenu({
        type: 'mobile',
        data: data(),
      })
    );

    const parent = menu.dom.root?.querySelector<HTMLElement>(
      '[data-menu-has-children]'
    );
    parent?.click();

    expect(parent?.classList.contains('is-active')).toBe(true);
    expect(parent?.querySelector('[data-menu-back]')).toBeTruthy();
  });

  it('toggles bottom first-level items and ignores submenu links', () => {
    menu = mount(
      createMenu({
        type: 'bottom',
        data: data(),
      })
    );

    const parent = menu.dom.root?.querySelector<HTMLElement>(
      '[data-menu-has-children]'
    );
    parent?.querySelector<HTMLElement>('[data-menu-link]')?.click();

    expect(parent?.classList.contains('is-active')).toBe(true);

    parent
      ?.querySelector<HTMLElement>('[data-menu-list="sub"] [data-menu-link]')
      ?.click();

    expect(parent?.classList.contains('is-active')).toBe(true);

    document.body.click();
    expect(parent?.classList.contains('is-active')).toBe(false);
  });

  it('refreshes rendered data from state', async () => {
    menu = mount(createMenu({ type: 'mobile', data: data() }));

    menu.setState({ data: [{ id: 'new', title: 'New', url: '#new' }] });
    await tick();

    expect(menu.dom.root?.querySelectorAll('[data-menu-item]')).toHaveLength(1);
    expect(menu.dom.root?.textContent).toBe('New');

    menu.state.data = [];
    await tick();

    expect(menu.dom.root?.querySelectorAll('[data-menu-item]')).toHaveLength(0);
  });

  it('keeps type fixed from props and uses configured mobile back text', () => {
    menu = mount(
      createMenu({ type: 'mobile', data: data(), backText: '返回' })
    );
    const parent = menu.dom.root?.querySelector<HTMLElement>(
      '[data-menu-has-children]'
    );
    parent?.querySelector<HTMLElement>('[data-menu-link]')?.click();

    expect(parent?.querySelector('[data-menu-back]')?.textContent).toContain(
      '返回'
    );
  });

  it('does not enable mobile or bottom interactions without a matching type', () => {
    menu = mount(createMenu({ data: data() }));

    const parent = menu.dom.root?.querySelector<HTMLElement>(
      '[data-menu-has-children]'
    );
    parent?.querySelector<HTMLElement>('[data-menu-link]')?.click();

    expect(parent?.classList.contains('is-active')).toBe(false);
    expect(parent?.querySelector('[data-menu-back]')).toBeNull();

    document.body.click();
    expect(parent?.classList.contains('is-active')).toBe(false);
  });

  it('accepts custom type as a data marker without built-in interactions', () => {
    menu = mount(createMenu({ type: 'flyout', data: data() }));

    expect(menu.dom.root?.classList.contains('j-menu')).toBe(true);
    expect(menu.dom.root?.getAttribute('data-menu-type')).toBe('flyout');

    const parent = menu.dom.root?.querySelector<HTMLElement>(
      '[data-menu-has-children]'
    );
    parent?.querySelector<HTMLElement>('[data-menu-link]')?.click();

    expect(parent?.classList.contains('is-active')).toBe(false);
    expect(parent?.querySelector('[data-menu-back]')).toBeNull();
  });

  it('renders leaf data without a usable url as spans', () => {
    menu = mount(
      createMenu({
        data: [
          { id: 'empty', title: 'Empty URL', url: '   ' },
          { id: 'missing', title: 'Missing URL' },
          { id: 'link', title: 'Link', url: ' #link ' },
          {
            id: 'parent',
            title: 'Parent Without URL',
            children: [{ id: 'child', title: 'Child' }],
          },
        ],
      })
    );

    expect(
      menu.dom.root?.querySelector('[data-menu-item="empty"] > span')
    ).toBeTruthy();
    expect(
      menu.dom.root?.querySelector('[data-menu-item="missing"] > span')
    ).toBeTruthy();
    expect(
      menu.dom.root
        ?.querySelector<HTMLAnchorElement>('[data-menu-item="link"] > a')
        ?.getAttribute('href')
    ).toBe('#link');
    expect(
      menu.dom.root
        ?.querySelector<HTMLAnchorElement>('[data-menu-item="parent"] > a')
        ?.getAttribute('href')
    ).toBe('');
    expect(
      menu.dom.root?.querySelector('[data-menu-item="parent"] > span')
    ).toBeNull();
  });

  it('allows extra item fields without blocking rendering', async () => {
    const extendedItems: MenuItem[] = [
      {
        id: 'extended',
        title: 'Extended',
        url: '#extended',
        classes: 'is-current custom-link',
        a: 'custom data',
        meta: { icon: 'home' },
        children: [
          {
            id: 'child',
            title: 'Child',
            url: '#child',
            classes: '',
            badge: 2,
          },
        ],
      },
    ];

    menu = mount(createMenu({ type: 'mobile', data: extendedItems }));

    expect(menu.dom.root?.querySelectorAll('[data-menu-item]')).toHaveLength(2);
    expect(menu.dom.root?.textContent).toContain('Extended');
    expect(
      menu.dom.root?.querySelector('[data-menu-item="extended"]')?.className
    ).toContain('is-current');
    expect(
      menu.dom.root?.querySelector('[data-menu-item="extended"]')?.className
    ).toContain('custom-link');
    expect(menu.state.data[0]?.a).toBe('custom data');

    menu.setState({
      data: [{ id: 'next', title: 'Next', url: '#next', a: true }],
    });
    await tick();

    expect(menu.dom.root?.querySelectorAll('[data-menu-item]')).toHaveLength(1);
    expect(menu.state.data[0]?.a).toBe(true);
  });

  it('accepts WordPress-like menu items with string classes', () => {
    const wordpressItems: MenuItem[] = [
      {
        id: 251,
        title: '首页',
        url: 'http://g3.local/',
        target: '',
        description: '',
        classes: '',
        menu_item_parent: null,
        children: [],
      },
      {
        id: 254,
        title: '焦点推荐',
        url: 'http://g3.local/category/uncategorized/',
        target: '_blank',
        description: '',
        classes: 'menu-item current-menu-item',
        menu_item_parent: null,
        children: [
          {
            id: 253,
            title: '人话',
            url: 'http://g3.local/人话/',
            target: '',
            description: '',
            classes: '',
            menu_item_parent: 254,
            children: [],
          },
        ],
      },
    ];

    menu = mount(createMenu({ type: 'mobile', data: wordpressItems }));

    expect(menu.dom.root?.querySelectorAll('[data-menu-item]')).toHaveLength(3);
    expect(menu.dom.root?.textContent).toContain('首页');
    expect(menu.dom.root?.textContent).toContain('人话');
    expect(
      menu.dom.root?.querySelector('[data-menu-item="254"]')?.className
    ).toContain('current-menu-item');
    expect(
      menu.dom.root?.querySelector<HTMLAnchorElement>(
        '[data-menu-item="254"] a'
      )?.target
    ).toBe('_blank');
    expect(menu.state.data[1]?.menu_item_parent).toBeNull();
  });

  it('removes mounted DOM on destroy', () => {
    menu = mount(createMenu({ type: 'mobile', data: data() }));

    expect(app().contains(menu.dom.root)).toBe(true);

    menu.destroy();
    menu = null;

    expect(app().children).toHaveLength(0);
  });
});

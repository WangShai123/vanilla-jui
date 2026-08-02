// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { Menu, createMenu, type MenuItem } from '../src/components/menu.ts';

let menu: Menu | null = null;

function items(): MenuItem[] {
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

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  menu?.destroy();
  menu = null;
  document.body.innerHTML = '';
});

describe('Menu', () => {
  it('builds default classes and stable data markers', () => {
    menu = new Menu({ type: 'mobile', items: items() }).build();
    app().appendChild(menu.root!);

    expect(menu.root?.classList.contains('j-mobile-menu')).toBe(true);
    expect(menu.root?.getAttribute('data-menu')).toBe('root');
    expect(menu.root?.getAttribute('data-menu-type')).toBe('mobile');
    expect(menu.root?.querySelector('[data-menu-list="root"]')).toBeTruthy();
    expect(menu.root?.querySelectorAll('[data-menu-item]')).toHaveLength(4);
    expect(menu.root?.querySelector('[data-menu-has-children]')).toBeTruthy();
    expect(menu.root?.querySelector('[data-menu-list="sub"]')).toBeTruthy();
  });

  it('uses data markers for mobile submenu interaction when className is customized', () => {
    menu = createMenu({
      type: 'mobile',
      items: items(),
      backText: 'Back',
      className: {
        root: 'qa-menu',
        list: 'qa-list',
        item: 'qa-item',
        hasChildren: 'qa-has-children',
        link: 'qa-link',
        subMenu: 'qa-sub-menu',
        back: 'qa-back',
      },
    }).build();
    app().appendChild(menu.root!);

    expect(menu.root?.classList.contains('qa-menu')).toBe(true);
    expect(menu.root?.classList.contains('j-mobile-menu')).toBe(false);
    expect(menu.root?.querySelector('.menu-item')).toBeNull();

    const parent = menu.root?.querySelector<HTMLElement>(
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

  it('toggles bottom first-level items and ignores submenu links', () => {
    menu = new Menu({
      type: 'bottom',
      items: items(),
    }).build();
    app().appendChild(menu.root!);

    const parent = menu.root?.querySelector<HTMLElement>(
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

  it('sets and removes items through data markers', () => {
    menu = new Menu({ type: 'mobile', items: items() }).build();
    app().appendChild(menu.root!);

    menu.setItems([{ id: 'new', title: 'New', url: '#new' }]);
    expect(menu.root?.querySelectorAll('[data-menu-item]')).toHaveLength(1);
    expect(menu.root?.textContent).toBe('New');

    menu.removeItem('new');
    expect(menu.root?.querySelectorAll('[data-menu-item]')).toHaveLength(0);
    expect(menu.options?.items).toHaveLength(0);
  });

  it('allows extra item fields without blocking rendering', () => {
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

    menu = new Menu({ type: 'mobile', items: extendedItems }).build();
    app().appendChild(menu.root!);

    expect(menu.root?.querySelectorAll('[data-menu-item]')).toHaveLength(2);
    expect(menu.root?.textContent).toContain('Extended');
    expect(
      menu.root?.querySelector('[data-menu-item="extended"]')?.className
    ).toContain('is-current');
    expect(
      menu.root?.querySelector('[data-menu-item="extended"]')?.className
    ).toContain('custom-link');
    expect(menu.options?.items[0]?.a).toBe('custom data');

    menu.setItems([{ id: 'next', title: 'Next', url: '#next', a: true }]);

    expect(menu.root?.querySelectorAll('[data-menu-item]')).toHaveLength(1);
    expect(menu.options?.items[0]?.a).toBe(true);
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

    menu = new Menu({ type: 'mobile', items: wordpressItems }).build();
    app().appendChild(menu.root!);

    expect(menu.root?.querySelectorAll('[data-menu-item]')).toHaveLength(3);
    expect(menu.root?.textContent).toContain('首页');
    expect(menu.root?.textContent).toContain('人话');
    expect(
      menu.root?.querySelector('[data-menu-item="254"]')?.className
    ).toContain('current-menu-item');
    expect(
      menu.root?.querySelector<HTMLAnchorElement>('[data-menu-item="254"] a')
        ?.target
    ).toBe('_blank');
    expect(menu.options?.items[1]?.menu_item_parent).toBeNull();
  });

  it('binds existing data DOM and updates the list', () => {
    app().innerHTML = `
      <nav class="qa-bound" data-menu="root" data-menu-type="mobile">
        <ul class="qa-list" data-menu-list="root">
          <li class="qa-item" data-menu-item="old">
            <a class="qa-link" data-menu-link>Old</a>
          </li>
        </ul>
      </nav>
    `;

    const root = app().querySelector<HTMLElement>('[data-menu="root"]');
    menu = new Menu({ type: 'mobile', items: [] }, root).build();
    menu.setItems([{ id: 'bound', title: 'Bound', url: '#bound' }]);

    expect(menu.root).toBe(root);
    expect(menu.root?.textContent?.trim()).toBe('Bound');

    menu.destroy();
    menu = null;

    expect(app().querySelector('[data-menu="root"]')).toBe(root);
  });

  it('createMenu passes options and element in constructor order', () => {
    const root = document.createElement('nav');
    root.setAttribute('data-menu', 'root');
    root.innerHTML = '<ul data-menu-list="root"></ul>';
    app().appendChild(root);

    menu = createMenu({ type: 'mobile', items: [] }, root).build();

    expect(menu).toBeInstanceOf(Menu);
    expect(menu.root).toBe(root);
    expect(menu.options?.type).toBe('mobile');
  });
});

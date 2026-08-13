// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { createDeepStore } from 'vanilla-signal';

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
  if (!instance.element) throw new Error('Menu did not build a root.');
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
  menu?.destroy();
  menu = null;
  document.body.innerHTML = '';
});

describe('Menu', () => {
  it('builds detached DOM with default classes and stable data markers', () => {
    menu = createMenu({ data: data() });

    expect(menu.element).toBeNull();

    menu.build();
    expect(app().contains(menu.element)).toBe(false);
    if (!menu.element) throw new Error('Expected Menu root.');
    app().appendChild(menu.element);

    expect(menu.element.classList.contains('j-menu')).toBe(true);
    expect(menu.element.getAttribute('data-menu')).toBe('root');
    expect(menu.element.hasAttribute('data-menu-type')).toBe(false);
    expect(menu.element.querySelector('[data-menu-list="root"]')).toBeTruthy();
    expect(menu.element.querySelectorAll('[data-menu-item]')).toHaveLength(4);
    expect(menu.element.querySelector('[data-menu-has-children]')).toBeTruthy();
    expect(menu.element.querySelector('[data-menu-list="sub"]')).toBeTruthy();
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

    expect(menu.element?.classList.contains('qa-menu')).toBe(true);
    expect(menu.element?.getAttribute('data-menu-type')).toBe('mobile');
    expect(menu.element?.classList.contains('j-menu')).toBe(false);
    expect(menu.element?.querySelector('.menu-item')).toBeNull();

    const parent = menu.element?.querySelector<HTMLElement>(
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

    const parent = menu.element?.querySelector<HTMLElement>(
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

    const parent = menu.element?.querySelector<HTMLElement>(
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

    expect(menu.element?.querySelectorAll('[data-menu-item]')).toHaveLength(1);
    expect(menu.element?.textContent).toBe('New');

    menu.state.data = [];
    await tick();

    expect(menu.element?.querySelectorAll('[data-menu-item]')).toHaveLength(0);
  });

  it('filters menu items by user login state', () => {
    const authData: MenuItem[] = [
      { id: 'public', title: 'Public', url: '#public' },
      { id: 'account', title: 'Account', type: 1, url: '#account' },
      { id: 'login', title: 'Login', type: 2, url: '#login' },
      {
        id: 'parent',
        title: 'Parent',
        children: [
          { id: 'profile', title: 'Profile', type: 1, url: '#profile' },
          { id: 'register', title: 'Register', type: 2, url: '#register' },
        ],
      },
    ];

    menu = mount(createMenu({ data: authData }));

    expect(
      menu.element?.querySelector('[data-menu-item="public"]')
    ).toBeTruthy();
    expect(
      menu.element?.querySelector('[data-menu-item="login"]')
    ).toBeTruthy();
    expect(
      menu.element?.querySelector('[data-menu-item="register"]')
    ).toBeTruthy();
    expect(
      menu.element?.querySelector('[data-menu-item="account"]')
    ).toBeNull();
    expect(
      menu.element?.querySelector('[data-menu-item="profile"]')
    ).toBeNull();
    expect(menu.state.data[0]?.type).toBe(0);

    menu.destroy();
    menu = mount(createMenu({ user: 12, data: authData }));

    expect(
      menu.element?.querySelector('[data-menu-item="public"]')
    ).toBeTruthy();
    expect(
      menu.element?.querySelector('[data-menu-item="account"]')
    ).toBeTruthy();
    expect(
      menu.element?.querySelector('[data-menu-item="profile"]')
    ).toBeTruthy();
    expect(menu.element?.querySelector('[data-menu-item="login"]')).toBeNull();
    expect(
      menu.element?.querySelector('[data-menu-item="register"]')
    ).toBeNull();
  });

  it('uses visible children when deciding submenu rendering', () => {
    menu = mount(
      createMenu({
        user: 7,
        data: [
          {
            id: 'guest-parent',
            title: 'Guest Parent',
            children: [{ id: 'login', title: 'Login', type: 2 }],
          },
        ],
      })
    );

    const parent = menu.element?.querySelector<HTMLElement>(
      '[data-menu-item="guest-parent"]'
    );

    expect(parent?.hasAttribute('data-menu-has-children')).toBe(false);
    expect(parent?.querySelector('[data-menu-list="sub"]')).toBeNull();
    expect(parent?.querySelector(':scope > span')).toBeTruthy();
  });

  it('reacts to external store accessors for user and data', async () => {
    const business = createDeepStore({
      userId: 0,
      menuData: [
        { id: 'home', title: 'Home', url: '#home' },
        { id: 'account', title: 'Account', type: 1, url: '#account' },
        { id: 'login', title: 'Login', type: 2, url: '#login' },
      ] as MenuItem[],
    });

    menu = mount(
      createMenu({
        user: () => business.userId,
        data: () => business.menuData,
      })
    );

    expect(menu.state.user).toBe(0);
    expect(
      menu.element?.querySelector('[data-menu-item="login"]')
    ).toBeTruthy();
    expect(
      menu.element?.querySelector('[data-menu-item="account"]')
    ).toBeNull();

    business.userId = 9;
    await tick();

    expect(menu.state.user).toBe(9);
    expect(
      menu.element?.querySelector('[data-menu-item="account"]')
    ).toBeTruthy();
    expect(menu.element?.querySelector('[data-menu-item="login"]')).toBeNull();

    business.menuData.push({
      id: 'settings',
      title: 'Settings',
      type: 1,
      url: '#settings',
    });
    await tick();

    expect(
      menu.element?.querySelector('[data-menu-item="settings"]')
    ).toBeTruthy();

    business.menuData[3].type = 2;
    await tick();

    expect(
      menu.element?.querySelector('[data-menu-item="settings"]')
    ).toBeNull();
  });

  it('keeps type fixed from props and uses configured mobile back text', () => {
    menu = mount(
      createMenu({ type: 'mobile', data: data(), backText: '返回' })
    );
    const parent = menu.element?.querySelector<HTMLElement>(
      '[data-menu-has-children]'
    );
    parent?.querySelector<HTMLElement>('[data-menu-link]')?.click();

    expect(parent?.querySelector('[data-menu-back]')?.textContent).toContain(
      '返回'
    );
  });

  it('does not enable mobile or bottom interactions without a matching type', () => {
    menu = mount(createMenu({ data: data() }));

    const parent = menu.element?.querySelector<HTMLElement>(
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

    expect(menu.element?.classList.contains('j-menu')).toBe(true);
    expect(menu.element?.getAttribute('data-menu-type')).toBe('flyout');

    const parent = menu.element?.querySelector<HTMLElement>(
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
      menu.element?.querySelector('[data-menu-item="empty"] > span')
    ).toBeTruthy();
    expect(
      menu.element?.querySelector('[data-menu-item="missing"] > span')
    ).toBeTruthy();
    expect(
      menu.element
        ?.querySelector<HTMLAnchorElement>('[data-menu-item="link"] > a')
        ?.getAttribute('href')
    ).toBe('#link');
    expect(
      menu.element
        ?.querySelector<HTMLAnchorElement>('[data-menu-item="parent"] > a')
        ?.getAttribute('href')
    ).toBe('');
    expect(
      menu.element?.querySelector('[data-menu-item="parent"] > span')
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

    expect(menu.element?.querySelectorAll('[data-menu-item]')).toHaveLength(2);
    expect(menu.element?.textContent).toContain('Extended');
    expect(
      menu.element?.querySelector('[data-menu-item="extended"]')?.className
    ).toContain('is-current');
    expect(
      menu.element?.querySelector('[data-menu-item="extended"]')?.className
    ).toContain('custom-link');
    expect(menu.state.data[0]?.a).toBe('custom data');

    menu.setState({
      data: [{ id: 'next', title: 'Next', url: '#next', a: true }],
    });
    await tick();

    expect(menu.element?.querySelectorAll('[data-menu-item]')).toHaveLength(1);
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

    expect(menu.element?.querySelectorAll('[data-menu-item]')).toHaveLength(3);
    expect(menu.element?.textContent).toContain('首页');
    expect(menu.element?.textContent).toContain('人话');
    expect(
      menu.element?.querySelector('[data-menu-item="254"]')?.className
    ).toContain('current-menu-item');
    expect(
      menu.element?.querySelector<HTMLAnchorElement>('[data-menu-item="254"] a')
        ?.target
    ).toBe('_blank');
    expect(menu.state.data[1]?.menu_item_parent).toBeNull();
  });

  it('removes mounted DOM on destroy', () => {
    menu = mount(createMenu({ type: 'mobile', data: data() }));

    expect(app().contains(menu.element)).toBe(true);

    menu.destroy();
    menu = null;

    expect(app().children).toHaveLength(0);
  });
});

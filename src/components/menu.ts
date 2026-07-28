import { render, jsx } from 'vanilla-signal';

import {
  type ResolveSchema,
  randomId,
  resolveProps,
  validateParam,
} from '../utilities/core.ts';
import {
  all,
  type DOMReference,
  q,
  requireRenderDOM,
  resolveElement,
} from '../utilities/dom.ts';
import { createEventManager, type IEventManager } from '../utilities/events.ts';
import { icon } from './icons.ts';

export type MenuType = string;
export type MenuItemId = string | number;

export interface MenuClassNames {
  root: string;
  list: string;
  item: string;
  hasChildren: string;
  link: string;
  subMenu: string;
  back: string;
  active: string;
  icon: string;
  iconPrefix: string;
  text: string;
}

export type MenuClassNameConfig = Partial<MenuClassNames>;

export interface MenuItem extends Record<string, unknown> {
  id?: MenuItemId;
  title: string | number;
  url?: string;
  target?: string;
  classes?: string[];
  children?: MenuItem[];
}

export interface MenuOptions extends Record<string, unknown> {
  type?: MenuType;
  id?: string;
  items?: MenuItem[];
  backText?: string;
  className?: MenuClassNameConfig;
}

interface ResolvedMenuOptions extends Record<string, unknown> {
  type: MenuType;
  id: string;
  items: MenuItem[];
  backText: string;
  className: MenuClassNames;
}

interface MenuDOM {
  root: HTMLElement | null;
}

interface MenuCleanup {
  events: IEventManager;
  items?: (() => void) | null;
}

const DEFAULT_CLASS_NAMES: MenuClassNames = {
  root: '',
  list: 'menu',
  item: 'menu-item',
  hasChildren: 'menu-item-has-children',
  link: 'menu-link',
  subMenu: 'sub-menu',
  back: 'back',
  active: 'is-active',
  icon: 'el-icon',
  iconPrefix: 'el-prefix',
  text: 'menu-text',
};

const MENU_OPTIONS_SCHEMA = {
  type: { default: 'mobile', type: 'string' },
  id: {
    default: '',
    type: 'string',
    normalize: (value: unknown) => {
      if (typeof value !== 'string') return value;
      return value.trim() === '' ? randomId() : value.trim();
    },
  },
  items: { default: [], type: 'array' },
  backText: { default: 'Back', type: 'string' },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
} satisfies ResolveSchema<MenuOptions>;

const MENU_ITEMS_RULE = { type: 'array' };

function normalizeOptions(options: MenuOptions = {}): ResolvedMenuOptions {
  const props = resolveProps(
    options,
    MENU_OPTIONS_SCHEMA,
    'Menu.options'
  ) as ResolvedMenuOptions;
  return {
    ...props,
    items: props.items.slice(),
    className: { ...props.className },
  };
}

function classList(...tokens: Array<string | null | undefined>): string {
  return tokens.filter(Boolean).join(' ');
}

function itemId(id: MenuItemId | undefined): string {
  return `menu-item-${id ?? randomId()}`;
}

function isListElement(element: Element): element is HTMLUListElement {
  const tag = element.tagName.toLowerCase();
  return tag === 'ul' || tag === 'ol';
}

function isMenuItem(value: unknown): value is MenuItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const item = value as Partial<MenuItem>;
  return (
    (typeof item.title === 'string' || typeof item.title === 'number') &&
    (item.id == null ||
      typeof item.id === 'string' ||
      typeof item.id === 'number') &&
    (item.url == null || typeof item.url === 'string') &&
    (item.target == null || typeof item.target === 'string') &&
    (item.classes == null ||
      (Array.isArray(item.classes) &&
        item.classes.every((className) => typeof className === 'string'))) &&
    (item.children == null ||
      (Array.isArray(item.children) && item.children.every(isMenuItem)))
  );
}

function findMenuList(root: HTMLElement): HTMLElement | null {
  if (root.hasAttribute('data-menu-list')) return root;
  if (isListElement(root)) return root;
  return q<HTMLElement>('[data-menu-list]', root);
}

function findDirectMenuLink(menuItem: HTMLElement): HTMLElement | null {
  return (
    all<HTMLElement>('[data-menu-link]', menuItem).find(
      (link) => link.parentElement === menuItem
    ) || null
  );
}

function findDirectSubMenu(menuItem: HTMLElement): HTMLElement | null {
  return (
    all<HTMLElement>('[data-menu-list="sub"]', menuItem).find(
      (list) => list.parentElement === menuItem
    ) || null
  );
}

function findDirectBackItem(subMenu: HTMLElement): HTMLElement | null {
  return (
    all<HTMLElement>('[data-menu-back]', subMenu).find(
      (item) => item.parentElement === subMenu
    ) || null
  );
}

/**
 * 菜单组件。
 *
 * 支持绑定已有菜单 DOM，也支持通过配置动态创建移动菜单或底部菜单。
 */
export class Menu {
  options: ResolvedMenuOptions | null;
  dom: MenuDOM;
  cleanup: MenuCleanup | null;
  private _element: DOMReference;
  private _bound: boolean;
  private _destroyed: boolean;

  /**
   * 创建菜单实例。
   * @param {MenuOptions} [options={}] 菜单配置。
   * @param {Element|Node|string|Array|false} [element=false] 已有菜单节点、选择器或 JSX/h 返回节点；默认 `false` 按 items 动态创建。
   */
  constructor(options: MenuOptions = {}, element: DOMReference = false) {
    this.options = normalizeOptions(options);
    this._element = element;
    this.dom = {
      root: null,
    };
    this.cleanup = {
      events: createEventManager(),
    };
    this._bound = false;
    this._destroyed = false;
  }

  get root(): HTMLElement | null {
    return this.dom.root;
  }

  /**
   * 校验菜单数据。
   * @private
   * @param {MenuItem[]} items 菜单数据。
   * @returns {void}
   */
  _verifyItems(items: MenuItem[]): void {
    validateParam('items', items, MENU_ITEMS_RULE, 'Menu');
    items.forEach((item, index) => {
      validateParam(
        String(index),
        item,
        {
          validate: isMenuItem,
          message:
            'expects { title, id?, url?, target?, classes?, children? }.',
        },
        'Menu.items'
      );
    });
  }

  /**
   * 构建菜单。
   *
   * element 为 false 时动态创建 DOM；否则绑定已有节点。
   * @returns {Menu}
   */
  build(): this {
    if (this._bound) return this;
    if (!this.options) throw new Error('Menu.build: instance destroyed.');

    requireRenderDOM('Menu');

    if (this._element === false) {
      this._verifyItems(this.options.items);
      this.dom.root = this._buildRoot();
      this._bound = true;
    } else {
      const root = resolveElement(this._element, 'Menu.element');
      if (!root) throw new Error('Menu.element: container not found.');
      this.dom.root = root as HTMLElement;
      this._bound = true;
    }

    this._bindEvents();

    return this;
  }

  /**
   * 根据 items 创建菜单根节点。
   * @private
   * @returns {HTMLElement}
   */
  _buildRoot(): HTMLElement {
    if (!this.options) throw new Error('Menu._buildRoot: instance destroyed.');
    const { items, id, type, className } = this.options;
    const rootClass = className.root || `j-${type}-menu`;

    return jsx('nav', {
      className: rootClass,
      'data-menu': 'root',
      'data-menu-type': type,
      children: jsx('ul', {
        className: className.list,
        id: id,
        'data-menu-list': 'root',
        children: items.map((item) => this._buildItem(item)),
      }),
    }) as HTMLElement;
  }

  /**
   * 递归创建菜单项。
   * @private
   * @param {MenuItem} item 菜单项配置。
   * @returns {HTMLElement}
   */
  _buildItem(item: MenuItem): HTMLElement {
    if (!this.options) throw new Error('Menu._buildItem: instance destroyed.');
    const { className } = this.options;
    const childrenItems = item.children || [];
    const hasChildren = childrenItems.length > 0;
    const classes = [className.item];

    if (hasChildren) {
      classes.push(className.hasChildren);
    }

    if (item.classes) {
      classes.push(...item.classes);
    }

    const children: Node[] = [
      jsx('a', {
        className: className.link,
        href: item.url || '',
        ...(item.target && { target: item.target }),
        'data-menu-link': '',
        children: item.title,
      }) as HTMLElement,
    ];

    if (hasChildren) {
      children.push(
        jsx('ul', {
          className: className.subMenu,
          'data-menu-list': 'sub',
          children: childrenItems.map((child) => this._buildItem(child)),
        }) as HTMLElement
      );
    }

    return jsx('li', {
      className: classList(...classes),
      id: itemId(item.id),
      'data-menu-item': item.id == null ? '' : String(item.id),
      ...(hasChildren && { 'data-menu-has-children': '' }),
      children,
    }) as HTMLElement;
  }

  /**
   * 根据菜单类型绑定交互事件。
   * @private
   * @returns {void}
   */
  _bindEvents(): void {
    if (!this.dom.root || !this.options || !this.cleanup) return;

    if (this.options.type === 'mobile') {
      this.cleanup.events.on('mobile', this.dom.root, 'click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const backItem = target.closest<HTMLElement>('[data-menu-back]');
        if (backItem && this.dom.root?.contains(backItem)) {
          event.preventDefault();
          this._handleBack(backItem);
          return;
        }

        const menuItem = target.closest<HTMLElement>(
          '[data-menu-has-children]'
        );

        if (menuItem && this.dom.root?.contains(menuItem)) {
          const directLink = findDirectMenuLink(menuItem);
          if (
            directLink &&
            (target === directLink || directLink.contains(target))
          ) {
            event.preventDefault();
            this._handleMenuClick(menuItem);
          }
        }
      });
    } else if (this.options.type === 'bottom') {
      this.cleanup.events.on('bottom', document, 'click', (event) => {
        const target = event.target;
        if (!(target instanceof Element) || !this.dom.root) return;

        const submenuLink = target.closest(
          '[data-menu-list="sub"] [data-menu-link]'
        );
        if (submenuLink && this.dom.root.contains(submenuLink)) {
          return;
        }

        const firstLevelMenuItem = target.closest<HTMLElement>(
          '[data-menu-list="root"] > [data-menu-has-children]'
        );

        if (firstLevelMenuItem && this.dom.root.contains(firstLevelMenuItem)) {
          event.preventDefault();
          this._toggleActive(firstLevelMenuItem);
        } else {
          this._clearActive();
        }
      });
    }
  }

  /**
   * 解绑当前菜单实例绑定的事件。
   * @private
   * @returns {void}
   */
  _unbindEvents(): void {
    this.cleanup?.events.clear();
  }

  /**
   * 清理当前构建出的 DOM 与事件，可选择保留实例引用用于重建。
   * @private
   * @param {object} [options={}] 清理选项。
   * @param {boolean} [options.keepElement=false] 是否保留初始 element 引用。
   * @returns {void}
   */
  _teardown({ keepElement = false }: { keepElement?: boolean } = {}): void {
    this._unbindEvents();
    this.cleanup?.items?.();
    if (this.cleanup) this.cleanup.items = null;

    if (this._element === false && this.dom.root?.parentElement) {
      this.dom.root.remove();
    }

    if (!keepElement) {
      this._element = null;
    }

    this.dom.root = null;
    this._bound = false;
  }

  /**
   * 处理移动端有子菜单项的进入操作。
   * @private
   * @param {HTMLElement} menuItem 菜单项节点。
   * @returns {void}
   */
  _handleMenuClick(menuItem: HTMLElement): void {
    if (!this.options) return;
    menuItem.classList.add(this.options.className.active);

    const subMenu = findDirectSubMenu(menuItem);
    if (!subMenu) return;

    const existingBack = findDirectBackItem(subMenu);
    if (existingBack) return;

    const { className } = this.options;
    const backButton = jsx('li', {
      className: classList(className.item, className.back),
      'data-menu-back': '',
      children: jsx('a', {
        className: className.link,
        href: '',
        'data-menu-link': '',
        children: [
          jsx('icon', {
            className: classList(className.icon, className.iconPrefix),
            children: icon('arrow-left'),
          }),
          jsx('span', {
            className: className.text,
            children: this.options.backText,
          }),
        ],
      }),
    }) as HTMLElement;

    subMenu.insertBefore(backButton, subMenu.firstChild);
  }

  /**
   * 处理移动端子菜单返回操作。
   * @private
   * @param {Element} target 点击目标。
   * @returns {void}
   */
  _handleBack(target: Element): void {
    if (!this.options) return;

    const backItem = target.closest<HTMLElement>('[data-menu-back]');
    if (!backItem) return;

    const subMenu = backItem.parentElement;
    const parentMenuItem = subMenu?.parentElement;

    if (parentMenuItem?.hasAttribute('data-menu-has-children')) {
      parentMenuItem.classList.remove(this.options.className.active);
    }

    backItem.remove();
  }

  /**
   * 切换底部菜单激活状态。
   * @private
   * @param {HTMLElement} menuItem 菜单项节点。
   * @returns {void}
   */
  _toggleActive(menuItem: HTMLElement): void {
    if (!this.options) return;
    const isActive = menuItem.classList.contains(this.options.className.active);

    this._clearActive();

    if (!isActive) {
      menuItem.classList.add(this.options.className.active);
    }
  }

  _clearActive(): void {
    if (!this.dom.root || !this.options) return;
    all<HTMLElement>('[data-menu-item]', this.dom.root).forEach((item) => {
      item.classList.remove(this.options?.className.active || 'is-active');
    });
  }

  /**
   * 替换菜单数据；动态创建的菜单会在已构建时重建 DOM。
   * @param {MenuItem[]} items 新菜单数据。
   * @returns {Menu}
   */
  setItems(items: MenuItem[]): this {
    if (!this.options) throw new Error('Menu.setItems: instance destroyed.');
    this._verifyItems(items);

    this.options.items = items;

    if (this._bound) {
      if (this._element === false) {
        const element = this._element;
        this._teardown({ keepElement: true });
        this._element = element;
        this.build();
      } else if (this.dom.root) {
        const list = findMenuList(this.dom.root);

        if (!list) {
          throw new Error('Menu: [data-menu-list] element not found.');
        }

        this._unbindEvents();
        this.cleanup?.items?.();
        if (this.cleanup) {
          this.cleanup.items = render(
            () => items.map((item) => this._buildItem(item)),
            list
          );
        }
        this._bindEvents();
      }
    }

    return this;
  }

  /**
   * 根据 id 移除菜单项。
   * @param {string|number} id 菜单项 id。
   * @returns {Menu}
   */
  removeItem(id: MenuItemId): this {
    if (!this.dom.root) return this;

    const item = all<HTMLElement>('[data-menu-item]', this.dom.root).find(
      (node) => node.dataset.menuItem === String(id)
    );

    if (item) {
      item.remove();
    }

    if (this.options?.items) {
      const removeFromArray = (arr: MenuItem[]): void => {
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i].id === id) {
            arr.splice(i, 1);
          } else {
            const children = arr[i].children;
            if (children) removeFromArray(children);
          }
        }
      };
      removeFromArray(this.options.items);
    }

    return this;
  }

  /**
   * 销毁当前菜单实例并解绑事件。
   * @returns {void}
   */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._bound) {
      this._teardown();
    } else {
      this._element = null;
      this.dom.root = null;
      this.cleanup?.events.clear();
    }

    this.cleanup = null;
    this.options = null;
  }
}

export function createMenu(
  options: MenuOptions = {},
  element: DOMReference = false
): Menu {
  return new Menu(options, element);
}

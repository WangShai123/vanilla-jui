import {
  createDeepStore,
  createEffect,
  createRoot,
  jsx,
  untrack,
} from 'vanilla-signal';
import { t } from 'vanilla-signal-i18n';

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
} from '../core/Component.ts';
import locales from '../locales/index.ts';
import { icon } from '../primitives/icons.ts';
import { joinClasses } from '../utilities/class-name.ts';
import { all } from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';

export type MenuType = string | undefined;
export type MenuItemId = string | number;

export interface MenuClassNames {
  root: string;
  list: string;
  item: string;
  hasChildren: string;
  link: string;
  subMenu: string;
  backItem: string;
  active: string;
  backIcon: string;
  text: string;
}

export type MenuClassNameConfig = Partial<MenuClassNames>;

export interface MenuItem extends Record<string, unknown> {
  id?: MenuItemId;
  title: string | number;
  url?: string;
  target?: string;
  classes?: string | string[];
  children?: MenuItem[];
}

export interface MenuProps extends Record<string, unknown> {
  type?: MenuType;
  id?: string | null;
  data?: MenuItem[];
  backText?: string;
  className?: MenuClassNameConfig;
}

interface ResolvedMenuProps extends Record<string, unknown> {
  type?: MenuType;
  id: string;
  data: MenuItem[];
  backText: string;
  className: MenuClassNames;
}

interface MenuState extends Record<string, unknown> {
  data: MenuItem[];
}

interface MenuDOM extends ComponentDOM {
  root: HTMLElement | null;
  list: HTMLElement | null;
}

interface MenuRuntime extends ComponentRuntime {
  built: boolean;
}

interface MenuCleanupExtras {
  state?: (() => void) | null;
}

interface MenuSnapshot {
  data: unknown;
}

const DEFAULT_CLASS_NAMES: MenuClassNames = {
  root: 'j-menu',
  list: 'menu',
  item: 'menu-item',
  hasChildren: 'menu-item-has-children',
  link: 'menu-link',
  subMenu: 'sub-menu',
  active: 'is-active',
  text: 'menu-text',
  backItem: 'menu-item back',
  backIcon: 'el-icon el-prefix',
};

const MENU_ITEM_RULE = {
  type: 'object',
  validate: isMenuItem,
  message: 'expects { title, id?, url?, target?, classes?, children? }.',
};

const MENU_DATA_RULE = {
  type: 'array',
  items: MENU_ITEM_RULE,
};

const MENU_PROPS_SCHEMA = {
  type: { default: undefined, types: ['string', 'undefined'] },
  id: {
    default: null,
    types: ['string', 'null'],
    normalize: (value: unknown) => {
      if (typeof value === 'string') {
        const id = value.trim();
        return id || randomId();
      }
      if (value == null) return randomId();
      return value;
    },
  },
  data: {
    default: [],
    type: 'array',
    normalize: cloneMenuData,
    items: MENU_ITEM_RULE,
  },
  backText: { default: t('b', locales), type: 'string' },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
} satisfies ResolveSchema<MenuProps>;

const MENU_STATE_SCHEMA = {
  data: MENU_DATA_RULE,
};

function normalizeProps(input: MenuProps = {}): ResolvedMenuProps {
  const props = resolveProps(
    input,
    MENU_PROPS_SCHEMA,
    'Menu.props'
  ) as ResolvedMenuProps;

  return {
    ...props,
    data: cloneMenuData(props.data),
    className: { ...props.className },
  };
}

function normalizeItemClasses(classes: MenuItem['classes']): string[] {
  if (classes == null) return [];
  if (typeof classes === 'string') {
    return classes.trim().split(/\s+/).filter(Boolean);
  }
  return classes.slice();
}

function itemId(id: MenuItemId | undefined): string {
  return `menu-item-${id ?? randomId()}`;
}

function itemUrl(url: MenuItem['url']): string {
  return typeof url === 'string' ? url.trim() : '';
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
      typeof item.classes === 'string' ||
      (Array.isArray(item.classes) &&
        item.classes.every((className) => typeof className === 'string'))) &&
    (item.children == null ||
      (Array.isArray(item.children) && item.children.every(isMenuItem)))
  );
}

function cloneMenuData(data: unknown): MenuItem[] {
  if (!Array.isArray(data)) return [];
  return data.map((item) => {
    validateParam('item', item, MENU_ITEM_RULE, 'Menu.data');
    const nextItem = { ...(item as MenuItem) };
    if (Array.isArray(nextItem.classes)) {
      nextItem.classes = nextItem.classes.slice();
    }
    if (Array.isArray(nextItem.children)) {
      nextItem.children = cloneMenuData(nextItem.children);
    }
    return nextItem;
  });
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

class MenuComponent extends Component<ResolvedMenuProps, MenuState, MenuDOM> {
  declare runtime: MenuRuntime;
  declare state: MenuState;
  declare cleanup: Component['cleanup'] & MenuCleanupExtras;

  constructor(input: MenuProps = {}) {
    const props = normalizeProps(input);
    super(props);

    this.dom.list = null;
    this.cleanup.state = null;
    this.runtime.built = false;

    this.state = createDeepStore({
      data: cloneMenuData(props.data),
    }) as MenuState;
  }

  build(): this {
    if (this.runtime.destroyed) {
      throw new Error('Menu.build: instance has been destroyed.');
    }
    if (this.runtime.built) return this;

    this.validateData(this.state.data);
    this.dom.root = jsx('nav', {
      className: this.props.className.root,
      'data-menu': 'root',
      ...(this.props.type !== undefined && {
        'data-menu-type': this.props.type,
      }),
      children: jsx('ul', {
        className: this.props.className.list,
        id: this.props.id,
        'data-menu-list': 'root',
      }),
    }) as HTMLElement;
    this.dom.list = this.dom.root.querySelector('[data-menu-list="root"]');
    this.runtime.built = true;
    this.bindState();
    this.bindEvents();
    this.emit('init', this.props);
    return this;
  }

  private bindState(): void {
    if (this.cleanup.state) return;

    this.cleanup.state = createRoot((dispose) => {
      createEffect(() => {
        const snapshot = {
          data: this.state.data,
        };
        untrack(() => this.renderSnapshot(snapshot));
      });
      return dispose;
    });
  }

  private renderSnapshot(snapshot: MenuSnapshot): void {
    if (!this.runtime.built || !this.dom.root || !this.dom.list) return;
    this.validateData(snapshot.data);
    const data = cloneMenuData(snapshot.data);

    this.dom.list.textContent = '';
    this.dom.list.append(...data.map((item) => this.buildItem(item)));
  }

  private buildItem(item: MenuItem): HTMLElement {
    const { className } = this.props;
    const childrenItems = item.children || [];
    const hasChildren = childrenItems.length > 0;
    const classes = [className.item];

    if (hasChildren) classes.push(className.hasChildren);
    classes.push(...normalizeItemClasses(item.classes));

    const url = itemUrl(item.url);
    const shouldRenderSpan = !hasChildren && !url;
    const title = shouldRenderSpan
      ? (jsx('span', {
          className: className.link,
          'data-menu-link': '',
          children: item.title,
        }) as HTMLElement)
      : (jsx('a', {
          className: className.link,
          href: url,
          ...(item.target && { target: item.target }),
          'data-menu-link': '',
          children: item.title,
        }) as HTMLElement);

    const children: Node[] = [title];

    if (hasChildren) {
      children.push(
        jsx('ul', {
          className: className.subMenu,
          'data-menu-list': 'sub',
          children: childrenItems.map((child) => this.buildItem(child)),
        }) as HTMLElement
      );
    }

    return jsx('li', {
      className: joinClasses(...classes),
      id: itemId(item.id),
      'data-menu-item': item.id == null ? '' : String(item.id),
      ...(hasChildren && { 'data-menu-has-children': '' }),
      children,
    }) as HTMLElement;
  }

  private bindEvents(): void {
    this.unbindEvents();
    const root = this.dom.root;
    if (!root) return;

    if (this.props.type === 'mobile') {
      this.cleanup.events.on('mobile', root, 'click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const backItem = target.closest<HTMLElement>('[data-menu-back]');
        if (backItem && root.contains(backItem)) {
          event.preventDefault();
          this.handleBack(backItem);
          return;
        }

        const menuItem = target.closest<HTMLElement>(
          '[data-menu-has-children]'
        );
        if (!menuItem || !root.contains(menuItem)) return;

        const subMenu = findDirectSubMenu(menuItem);
        if (subMenu?.contains(target)) return;

        const directLink = findDirectMenuLink(menuItem);
        if (
          target === menuItem ||
          (directLink && (target === directLink || directLink.contains(target)))
        ) {
          event.preventDefault();
          this.handleMenuClick(menuItem);
        }
      });
    }

    if (this.props.type === 'bottom') {
      this.cleanup.events.on('bottom', document, 'click', (event) => {
        const target = event.target;
        if (!(target instanceof Element) || !root.isConnected) return;

        const submenuLink = target.closest(
          '[data-menu-list="sub"] [data-menu-link]'
        );
        if (submenuLink && root.contains(submenuLink)) return;

        const firstLevelMenuItem = target.closest<HTMLElement>(
          '[data-menu-list="root"] > [data-menu-has-children]'
        );

        if (firstLevelMenuItem && root.contains(firstLevelMenuItem)) {
          event.preventDefault();
          this.toggleActive(firstLevelMenuItem);
        } else {
          this.clearActive();
        }
      });
    }
  }

  private unbindEvents(): void {
    this.cleanup.events.clear();
  }

  private handleMenuClick(menuItem: HTMLElement): void {
    menuItem.classList.add(this.props.className.active);

    const subMenu = findDirectSubMenu(menuItem);
    if (!subMenu) return;

    const existingBack = findDirectBackItem(subMenu);
    if (existingBack) return;

    const { className } = this.props;
    const backButton = jsx('li', {
      className: className.backItem,
      'data-menu-back': '',
      children: jsx('a', {
        className: className.link,
        href: '',
        'data-menu-link': '',
        children: [
          jsx('span', {
            className: className.backIcon,
            children: icon('arrow-left'),
          }),
          jsx('span', {
            className: className.text,
            children: this.props.backText,
          }),
        ],
      }),
    }) as HTMLElement;

    subMenu.insertBefore(backButton, subMenu.firstChild);
  }

  private handleBack(target: Element): void {
    const backItem = target.closest<HTMLElement>('[data-menu-back]');
    if (!backItem) return;

    const subMenu = backItem.parentElement;
    const parentMenuItem = subMenu?.parentElement;

    if (parentMenuItem?.hasAttribute('data-menu-has-children')) {
      parentMenuItem.classList.remove(this.props.className.active);
    }

    backItem.remove();
  }

  private toggleActive(menuItem: HTMLElement): void {
    const isActive = menuItem.classList.contains(this.props.className.active);
    this.clearActive();
    if (!isActive) menuItem.classList.add(this.props.className.active);
  }

  private clearActive(): void {
    if (!this.dom.root) return;
    all<HTMLElement>('[data-menu-item]', this.dom.root).forEach((item) => {
      item.classList.remove(this.props.className.active);
    });
  }

  private validateData(data: unknown): void {
    validateParam('data', data, MENU_DATA_RULE, 'Menu');
  }

  private assertStatePatchKey(key: string): void {
    if (!Object.hasOwn(MENU_STATE_SCHEMA, key)) {
      throw new Error(`Menu.setState: "${key}" is not a supported state key.`);
    }
  }

  protected override normalizeStatePatch(
    patch: Partial<MenuState>
  ): Partial<MenuState> {
    const nextPatch = { ...patch };
    if (Object.hasOwn(nextPatch, 'data')) {
      nextPatch.data = cloneMenuData(nextPatch.data);
    }
    return nextPatch;
  }

  protected override validateStatePatch(patch: Partial<MenuState>): void {
    validateParam(
      'state',
      patch,
      {
        type: 'plainObject',
      },
      'Menu.setState'
    );

    for (const key of Object.keys(patch)) {
      this.assertStatePatchKey(key);
      const stateKey = key as keyof typeof MENU_STATE_SCHEMA;
      validateParam(
        key,
        patch[key as keyof MenuState],
        MENU_STATE_SCHEMA[stateKey],
        'Menu.setState'
      );
    }
  }

  protected onDestroy(): void {
    this.unbindEvents();
    this.cleanup.state?.();
    this.cleanup.state = null;
    this.dom.root?.remove();
    this.dom.list = null;
    this.runtime.built = false;
  }
}

export type Menu = MenuComponent;

export function createMenu(input: MenuProps = {}): Menu {
  return new MenuComponent(input);
}

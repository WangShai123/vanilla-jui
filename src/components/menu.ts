import {
  For,
  type MaybeAccessor,
  access,
  createDeepStore,
  createEffect,
  createMemo,
  flushSync,
  jsx,
} from 'vanilla-signal';
import { t } from 'vanilla-signal-i18n';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
import locales from '../locales/index.ts';
import { icon } from '../primitives/icons.ts';
import { joinClasses } from '../utilities/class-name.ts';
import { createEventManager } from '../utilities/events.ts';
import { randomId } from '../utilities/id.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';

export type MenuType = string | undefined;
export type MenuItemId = string | number;
export type MenuItemRenderType = 0 | 1 | 2;

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
  type?: MenuItemRenderType;
  url?: string;
  target?: string;
  classes?: string | string[];
  children?: MenuItem[];
}

export interface MenuProps extends Record<string, unknown> {
  type?: MenuType;
  id?: string | null;
  user?: MaybeAccessor<number>;
  data?: MaybeAccessor<MenuItem[]>;
  backText?: string;
  className?: MenuClassNameConfig;
}

interface ResolvedMenuProps extends Record<string, unknown> {
  type?: MenuType;
  id: string;
  user: MaybeAccessor<number>;
  data: MaybeAccessor<MenuItem[]>;
  backText: string;
  className: MenuClassNames;
}

interface MenuState extends Record<string, unknown> {
  user: number;
  data: MenuItem[];
  activeKeys: string[];
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
  message: 'expects { title, id?, type?, url?, target?, classes?, children? }.',
};

const MENU_DATA_RULE = {
  type: 'array',
  items: MENU_ITEM_RULE,
};

const MENU_PROPS_SCHEMA = {
  type: { default: undefined, types: ['string', 'undefined'] },
  user: { default: 0, types: ['number', 'function'] },
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
    types: ['array', 'function'],
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
  user: { type: 'number' },
  data: MENU_DATA_RULE,
  activeKeys: { type: 'array', items: 'string' },
};

function normalizeProps(input: MenuProps = {}): ResolvedMenuProps {
  const props = resolveProps(
    input,
    MENU_PROPS_SCHEMA,
    'Menu.props'
  ) as ResolvedMenuProps;

  return {
    ...props,
    user: props.user,
    data: props.data,
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
    (item.type == null ||
      item.type === 0 ||
      item.type === 1 ||
      item.type === 2) &&
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
    nextItem.type = nextItem.type ?? 0;
    if (Array.isArray(nextItem.classes)) {
      nextItem.classes = nextItem.classes.slice();
    }
    if (Array.isArray(nextItem.children)) {
      nextItem.children = cloneMenuData(nextItem.children);
    }
    return nextItem;
  });
}

function resolveMenuUser(user: MaybeAccessor<number> | undefined): number {
  const value = access(user ?? 0);
  validateParam('user', value, 'number', 'Menu.props');
  return value;
}

function resolveMenuData(
  data: MaybeAccessor<MenuItem[]> | undefined
): MenuItem[] {
  const value = access(data ?? []);
  validateParam('data', value, MENU_DATA_RULE, 'Menu.props');
  return cloneMenuData(value);
}

export type Menu = FunctionalComponent<
  ResolvedMenuProps,
  MenuState,
  HTMLElement
>;

export function createMenu(input: MenuProps = {}): Menu {
  const props = normalizeProps(input);
  const state = createDeepStore({
    user: resolveMenuUser(props.user),
    data: resolveMenuData(props.data),
    activeKeys: [],
  }) as MenuState;
  const generatedKeys = new WeakMap<object, string>();
  const events = createEventManager();
  let menu: Menu;

  const itemKey = (item: MenuItem): string => {
    if (item.id != null) return String(item.id);
    if (!generatedKeys.has(item)) generatedKeys.set(item, randomId());
    return generatedKeys.get(item) as string;
  };
  const isActive = (key: string): boolean => state.activeKeys.includes(key);
  const isLoggedIn = (): boolean => state.user > 0;
  const shouldRenderItem = (item: MenuItem): boolean => {
    if (item.type === 1) return isLoggedIn();
    if (item.type === 2) return !isLoggedIn();
    return true;
  };
  const visibleItems = (items: readonly MenuItem[] | undefined): MenuItem[] => {
    if (!Array.isArray(items)) return [];
    return items.filter(shouldRenderItem);
  };
  const open = (key: string): void => {
    flushSync(() => {
      state.activeKeys =
        props.type === 'bottom'
          ? [key]
          : state.activeKeys.includes(key)
            ? state.activeKeys
            : [...state.activeKeys, key];
    });
  };
  const close = (key: string): void => {
    flushSync(() => {
      state.activeKeys = state.activeKeys.filter((item) => item !== key);
    });
  };
  const toggle = (key: string): void => {
    flushSync(() => {
      state.activeKeys = isActive(key) ? [] : [key];
    });
  };

  const backView = (key: string): HTMLElement =>
    jsx('li', {
      className: props.className.backItem,
      'data-menu-back': '',
      children: jsx('a', {
        className: props.className.link,
        href: '',
        'data-menu-link': '',
        onClick: (event: Event) => {
          event.preventDefault();
          close(key);
        },
        children: [
          jsx('span', {
            className: props.className.backIcon,
            children: icon('arrow-left'),
          }),
          jsx('span', {
            className: props.className.text,
            children: props.backText,
          }),
        ],
      }),
    }) as HTMLElement;

  const listView = (
    items: () => MenuItem[],
    root = false,
    parentKey?: string
  ): HTMLElement =>
    jsx('ul', {
      className: root ? props.className.list : props.className.subMenu,
      ...(root ? { id: props.id } : {}),
      'data-menu-list': root ? 'root' : 'sub',
      children: [
        For({
          each: () =>
            props.type === 'mobile' && parentKey && isActive(parentKey)
              ? [parentKey]
              : [],
          key: (key: string) => key,
          children: (key: () => string) => backView(key()),
        }),
        For({
          each: items,
          key: (item: MenuItem) => itemKey(item),
          children: (itemAccessor: () => MenuItem) => {
            const key = itemKey(itemAccessor());
            const childrenAccessor = createMemo(() =>
              visibleItems(itemAccessor().children)
            );
            const hasChildren = (): boolean => childrenAccessor().length > 0;
            return jsx('li', {
              className: () => {
                const item = itemAccessor();
                return joinClasses(
                  props.className.item,
                  hasChildren() ? props.className.hasChildren : '',
                  ...normalizeItemClasses(item.classes),
                  isActive(key) ? props.className.active : ''
                );
              },
              id: () =>
                itemAccessor().id == null
                  ? `menu-item-${key}`
                  : itemId(itemAccessor().id),
              'data-menu-item': () =>
                itemAccessor().id == null ? '' : String(itemAccessor().id),
              'data-menu-has-children': () => (hasChildren() ? '' : null),
              onClick: (event: Event) => {
                if (
                  props.type === 'mobile' &&
                  event.target === event.currentTarget &&
                  hasChildren()
                ) {
                  open(key);
                }
              },
              children: [
                () => {
                  const item = itemAccessor();
                  const itemHasChildren = hasChildren();
                  const url = itemUrl(item.url);
                  if (!itemHasChildren && !url) {
                    return jsx('span', {
                      className: props.className.link,
                      'data-menu-link': '',
                      children: item.title,
                    });
                  }
                  return jsx('a', {
                    className: props.className.link,
                    href: url,
                    target: item.target,
                    'data-menu-link': '',
                    onClick: (event: Event) => {
                      if (!itemHasChildren) return;
                      if (props.type === 'mobile' || props.type === 'bottom') {
                        event.preventDefault();
                        if (props.type === 'bottom') toggle(key);
                        else open(key);
                      }
                    },
                    children: item.title,
                  });
                },
                () => {
                  if (!hasChildren()) return null;
                  return listView(childrenAccessor, false, key);
                },
              ],
            });
          },
        }),
      ],
    }) as HTMLElement;

  menu = defineComponent({
    name: 'Menu',
    props,
    state,
    normalizeStatePatch(patch) {
      const next = { ...patch };
      if (Object.hasOwn(next, 'user')) {
        next.user = resolveMenuUser(next.user as MaybeAccessor<number>);
      }
      if (Object.hasOwn(next, 'data')) next.data = cloneMenuData(next.data);
      return next;
    },
    validateStatePatch(patch) {
      for (const key of Object.keys(patch)) {
        if (!Object.hasOwn(MENU_STATE_SCHEMA, key)) {
          throw new Error(`Menu.setState: "${key}" is not supported.`);
        }
        const stateKey = key as keyof typeof MENU_STATE_SCHEMA;
        validateParam(
          key,
          patch[key as keyof MenuState],
          MENU_STATE_SCHEMA[stateKey],
          'Menu.setState'
        );
      }
    },
    view: () => {
      const renderedData = createMemo(() => visibleItems(state.data));
      createEffect(() => {
        state.user = resolveMenuUser(props.user);
        state.data = resolveMenuData(props.data);
      });
      createEffect(() =>
        validateParam('data', state.data, MENU_DATA_RULE, 'Menu')
      );
      return jsx('nav', {
        className: props.className.root,
        'data-menu': 'root',
        'data-menu-type': props.type,
        children: listView(renderedData, true),
      }) as HTMLElement;
    },
    onBuild(context) {
      if (props.type !== 'bottom') return;
      events.on('outside', document, 'click', (event) => {
        const target = event.target;
        if (!(target instanceof Node) || context.element?.contains(target))
          return;
        flushSync(() => {
          state.activeKeys = [];
        });
      });
      context.own(() => events.clear());
    },
  });

  return menu;
}

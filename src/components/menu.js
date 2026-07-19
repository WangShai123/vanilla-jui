import { render, jsx } from 'vanilla-signal';

import { randomId, resolveProps, validateParam } from '../utilities/core.js';
import { q, requireRenderDOM, resolveElement } from '../utilities/dom.js';
import { createEventManager } from '../utilities/events.js';
import { icon } from './icons.js';

const MENU_OPTIONS_SCHEMA = {
  type: { default: 'mobile', type: 'string' },
  id: {
    default: '',
    type: 'string',
    normalize: (value) => (value.trim() === '' ? randomId() : value.trim()),
  },
  items: { default: [], type: 'array' },
  backText: { default: 'Back', type: 'string' },
};

const MENU_ITEMS_RULE = { type: 'array' };

/**
 * @typedef {object} MenuItem
 * @property {string|number} [id] 菜单项 id，会用于生成 DOM id。
 * @property {string} title 菜单项标题。
 * @property {string} [url="#"] 菜单链接。
 * @property {string} [target] 链接 target。
 * @property {string[]} [classes] 菜单项额外类名。
 * @property {MenuItem[]} [children] 子菜单列表。
 */

/**
 * @typedef {object} MenuOptions
 * @property {string} [type="mobile"] 菜单类型，对应 `j-${type}-menu` 类名，可选值为 `mobile` 或 `bottom`。
 * @property {string} [id] 菜单 ul 节点 id，不传时自动生成。
 * @property {MenuItem[]} [items=[]] 菜单数据。
 * @property {string} [backText="Back"] 移动端子菜单返回按钮文案。
 */

/**
 * 菜单组件。
 *
 * 支持绑定已有菜单 DOM，也支持通过配置动态创建移动菜单或底部菜单。
 */
export class Menu {
  /**
   * 创建菜单实例。
   * @param {MenuOptions} [options={}] 菜单配置。
   * @param {Element|Node|string|Array|false} [element=false] 已有菜单节点、选择器或 JSX/h 返回节点；默认 `false` 按 items 动态创建。
   */
  constructor(options = {}, element = false) {
    this.options = resolveProps(options, MENU_OPTIONS_SCHEMA, 'Menu.options');
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

  /**
   * 校验菜单数据。
   * @private
   * @param {MenuItem[]} items 菜单数据。
   * @returns {void}
   */
  _verifyItems(items) {
    validateParam('items', items, MENU_ITEMS_RULE, 'Menu');
  }

  /**
   * 构建菜单。
   *
   * element 为 false 时动态创建 DOM；否则绑定已有节点。
   * @returns {Menu}
   */
  build() {
    if (this._bound) return this;

    requireRenderDOM('Menu');

    if (this._element === false) {
      this.dom.root = this._buildRoot();
      this._bound = true;
    } else {
      this.dom.root = resolveElement(this._element, 'Menu.element');
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
  _buildRoot() {
    const { items, id, type } = this.options;

    return jsx('nav', {
      className: `j-${type}-menu`,
      children: jsx('ul', {
        className: 'menu',
        id: id,
        children: items.map((item) => this._buildItem(item)),
      }),
    });
  }

  /**
   * 递归创建菜单项。
   * @private
   * @param {MenuItem} item 菜单项配置。
   * @returns {HTMLElement}
   */
  _buildItem(item) {
    const hasChildren = item.children && item.children.length > 0;
    const classes = ['menu-item'];

    if (hasChildren) {
      classes.push('menu-item-has-children');
    }

    if (item.classes && Array.isArray(item.classes)) {
      classes.push(...item.classes);
    }

    const children = [
      jsx('a', {
        className: 'menu-link',
        href: item.url || '',
        ...(item.target && { target: item.target }),
        children: item.title,
      }),
    ];

    if (hasChildren) {
      children.push(
        jsx('ul', {
          className: 'sub-menu',
          children: item.children.map((child) => this._buildItem(child)),
        })
      );
    }

    return jsx('li', {
      className: classes.join(' '),
      id: `menu-item-${item.id || randomId()}`,
      children,
    });
  }

  /**
   * 根据菜单类型绑定交互事件。
   * @private
   * @returns {void}
   */
  _bindEvents() {
    if (!this.dom.root) return;

    if (this.options.type === 'mobile') {
      this.cleanup.events.on('mobile', this.dom.root, 'click', (e) => {
        const target = e.target;

        if (target.closest('.menu-item.back')) {
          e.preventDefault();
          this._handleBack(target);
          return;
        }

        const menuItem = target.closest('.menu-item.menu-item-has-children');

        if (menuItem) {
          const directLink = q(':scope > a', menuItem);
          if (
            directLink &&
            (target === directLink || directLink.contains(target))
          ) {
            e.preventDefault();
            this._handleMenuClick(menuItem);
          }
        }
      });
    } else if (this.options.type === 'bottom') {
      this.cleanup.events.on('bottom', document, 'click', (e) => {
        const target = e.target;

        // 检查是否点击的是子菜单中的链接
        const isSubmenuLink = target.closest('.sub-menu a');
        if (isSubmenuLink) {
          // 如果是子菜单链接，不阻止默认行为，允许跳转
          return;
        }

        // 只允许第一层 menu-item-has-children 被点击
        const firstLevelMenuItem = target.closest(
          '.menu > .menu-item.menu-item-has-children'
        );

        if (firstLevelMenuItem) {
          e.preventDefault();
          this._toggleActive(firstLevelMenuItem);
        } else {
          // 点击其他地方移除所有 is-active
          q('.menu-item.is-active', this.dom.root)?.classList.remove(
            'is-active'
          );
        }
      });
    }
  }

  /**
   * 解绑当前菜单实例绑定的事件。
   * @private
   * @returns {void}
   */
  _unbindEvents() {
    this.cleanup.events.clear();
  }

  /**
   * 清理当前构建出的 DOM 与事件，可选择保留实例引用用于重建。
   * @private
   * @param {object} [options={}] 清理选项。
   * @param {boolean} [options.keepElement=false] 是否保留初始 element 引用。
   * @returns {void}
   */
  _teardown({ keepElement = false } = {}) {
    this._unbindEvents();
    this.cleanup.items?.();
    this.cleanup.items = null;

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
  _handleMenuClick(menuItem) {
    menuItem.classList.add('is-active');

    const subMenu = q(':scope > .sub-menu', menuItem);
    if (!subMenu) return;

    const existingBack = q(':scope > .menu-item.back', subMenu);
    if (existingBack) return;

    const backButton = jsx('li', {
      className: 'menu-item back',
      children: jsx('a', {
        className: 'menu-link',
        children: [
          jsx('icon', {
            className: 'el-icon el-prefix',
            children: icon('arrow-left'),
          }),
          jsx('span', {
            className: 'menu-text',
            children: this.options.backText,
          }),
        ],
      }),
    });

    subMenu.insertBefore(backButton, subMenu.firstChild);
  }

  /**
   * 处理移动端子菜单返回操作。
   * @private
   * @param {Element} target 点击目标。
   * @returns {void}
   */
  _handleBack(target) {
    const backItem = target.closest('.menu-item.back');
    if (!backItem) return;

    const subMenu = backItem.parentElement;
    const parentMenuItem = subMenu.parentElement;

    if (
      parentMenuItem &&
      parentMenuItem.classList.contains('menu-item-has-children')
    ) {
      parentMenuItem.classList.remove('is-active');
    }

    backItem.remove();
  }

  /**
   * 切换底部菜单激活状态。
   * @private
   * @param {HTMLElement} menuItem 菜单项节点。
   * @returns {void}
   */
  _toggleActive(menuItem) {
    const isActive = menuItem.classList.contains('is-active');

    // 移除其他所有 is-active
    q('.menu-item.is-active', this.dom.root)?.classList.remove('is-active');

    // 切换当前项的 is-active
    if (!isActive) {
      menuItem.classList.add('is-active');
    }
  }

  /**
   * 替换菜单数据；动态创建的菜单会在已构建时重建 DOM。
   * @param {MenuItem[]} items 新菜单数据。
   * @returns {Menu}
   */
  setItems(items) {
    this._verifyItems(items);

    this.options.items = items;

    if (this._bound) {
      if (this._element === false) {
        const element = this._element;
        this._teardown({ keepElement: true });
        this._element = element;
        this.build();
      } else {
        const rootIsList =
          this.dom.root.matches?.('.menu') ||
          this.dom.root.matches?.('ul') ||
          this.dom.root.matches?.('ol');
        const list = rootIsList
          ? this.dom.root
          : q(':scope > .menu', this.dom.root) || q('.menu', this.dom.root);

        if (!list) {
          throw new Error('Menu: .menu element not found for setItems().');
        }

        this._unbindEvents();
        this.cleanup.items?.();
        this.cleanup.items = render(
          () => items.map((item) => this._buildItem(item)),
          list
        );
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
  removeItem(id) {
    if (!this.dom.root) return this;

    const item = q(`[id^="menu-item-${id}"]`, this.dom.root);

    if (item) {
      item.remove();
    }

    if (this.options.items) {
      const removeFromArray = (arr) => {
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i].id === id) {
            arr.splice(i, 1);
          } else if (arr[i].children) {
            removeFromArray(arr[i].children);
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
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._bound) {
      this._teardown();
    } else {
      this._element = null;
      this.dom.root = null;
      this.cleanup.events.clear();
    }

    this.cleanup = null;
    this.options = null;
  }
}

export function createMenu(element, options = {}) {
  return new Menu(element, options);
}

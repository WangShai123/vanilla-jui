import { jsx } from 'vanilla-signal';
import { t } from 'vanilla-signal-i18n';

import locales from '../locales/index.js';
import { all, requireRenderDOM } from '../utilities/dom.js';
import { createEventManager } from '../utilities/events.js';
import { getCookie, setCookie } from '../utilities/storage.js';

/**
 * @typedef {object} ThemeOptions
 * @property {string} [mode="dark"] 主题明暗模式，支持 light、dark、auto 或自定义值。
 * @property {string} [render="dark"] 实际渲染模式，mode 为 auto 时根据系统偏好生成。
 * @property {string} [theme="indigo"] 色彩主题名。
 * @property {string} [radius="sm"] 圆角等级。
 * @property {string} [shadow="sm"] 阴影等级。
 * @property {string} [font="sm"] 字号等级。
 * @property {string} [key="jui-theme"] Cookie 存储 key。
 */

/**
 * @typedef {object} ThemePanelGroup
 * @property {string} title 分组标题。
 * @property {string} type 对应 ThemeOptions 中的配置项。
 * @property {Array<[string,string]>} buttons 按钮配置，格式为 `[值, 展示文案]`。
 */

/**
 * 主题管理组件。
 *
 * 负责把主题配置同步到 html 类名、Cookie 和可选的主题面板交互。
 */
class Theme {
  /**
   * 创建主题实例。
   * @param {ThemeOptions} [options={}] 主题配置。
   */
  constructor(options = {}) {
    requireRenderDOM('Theme');

    this.options = {
      /**
       * 模式
       * @type {string}
       * @default 'dark'
       */
      mode: 'dark',

      /**
       * 渲染模式
       * @type {string}
       * @default 'dark'
       */
      render: 'dark',

      /**
       * 主题
       * @type {string}
       * @default 'indigo'
       */
      theme: 'indigo',

      /**
       * 圆角
       * @type {string}
       * @default 'sm'
       */
      radius: 'sm',

      /**
       * 阴影
       * @type {string}
       * @default 'sm'
       */
      shadow: 'sm',

      /**
       * 字体大小
       * @type {string}
       * @default 'sm'
       */
      font: 'sm',

      /**
       * 存储的key
       * @type {string}
       * @default 'jui-theme'
       */
      key: 'jui-theme',

      ...options,
    };

    // 语言配置
    this.languages = locales;

    this._init();
  }

  /**
   * 初始化主题状态、读取缓存并绑定事件。
   * @private
   * @returns {void}
   */
  _init() {
    this.cleanup = {
      events: createEventManager(),
    };
    this._destroyed = false;
    // mq 用于监听系统配色变化（用于 mode === 'auto'）
    this.mq =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    this._loadConfig();
    this._applyConfig();
    this._bindEvent();
    this._syncActiveButtons(document);
  }

  /**
   * 获取主题面板文案。
   * @private
   * @param {string} key 文案 key。
   * @returns {string}
   */
  _t(key) {
    return t(key, this.languages);
  }

  /**
   * 从 Cookie 读取主题配置。
   * @private
   * @returns {void}
   */
  _loadConfig() {
    try {
      const result = getCookie(this.options.key);
      if (result && result.trim()) {
        this.options = Object.assign({}, this.options, JSON.parse(result));
      }
    } catch {}
  }

  /**
   * 将当前主题配置写入 Cookie。
   * @private
   * @returns {void}
   */
  _saveConfig() {
    const actual = this.mq && this.mq.matches ? 'dark' : 'light';
    this.options.render =
      this.options.mode === 'auto' ? actual : this.options.mode;
    const str = JSON.stringify(this.options);
    setCookie(this.options.key, str);
  }

  /**
   * 清理 html 上旧的主题相关类名。
   * @private
   * @returns {void}
   */
  _removePrefixedClasses() {
    const toRemove = [];
    const h = document.documentElement;
    for (const c of h.classList) {
      if (c === 'light' || c === 'dark') toRemove.push(c);
      if (
        c.startsWith('j-theme-') ||
        c.startsWith('j-radius-') ||
        c.startsWith('j-shadow-') ||
        c.startsWith('j-font-')
      )
        toRemove.push(c);
    }
    if (toRemove.length) h.classList.remove(...toRemove);
  }

  /**
   * 根据 mode 同步 html 的 light/dark 类名。
   * @private
   * @returns {void}
   */
  _applyMqClass() {
    const h = document.documentElement;
    const { mode } = this.options;
    if (mode === 'auto') {
      const actual = this.mq && this.mq.matches ? 'dark' : 'light';
      h.classList.remove('light', 'dark');
      h.classList.add(actual);
    } else {
      h.classList.remove('light', 'dark');
      h.classList.add(mode === 'dark' ? 'dark' : 'light');
    }
  }

  /**
   * 将当前配置应用到 html 类名。
   * @private
   * @returns {void}
   */
  _applyConfig() {
    const { theme, radius, shadow, font } = this.options;
    this._removePrefixedClasses();
    this._applyMqClass();
    const h = document.documentElement;
    h.classList.add(
      `j-theme-${theme}`,
      `j-radius-${radius}`,
      `j-shadow-${shadow}`,
      `j-font-${font}`
    );
  }

  /**
   * 同步主题面板按钮激活态。
   * @private
   * @param {Document|Element} [scope=document] 需要同步的 DOM 范围。
   * @returns {void}
   */
  _syncActiveButtons(scope = document) {
    const items = all('.palette-item', scope);
    for (const item of items) {
      const type = item.dataset.palette;
      const val = this.options[type];
      const buttons = all('button[data-palette]', item);
      for (const btn of buttons) {
        const v = btn.dataset.palette;
        const isActive = v === (val === undefined ? null : val);
        btn.classList.toggle('is-active', isActive);
      }
    }
  }

  /**
   * 绑定主题面板点击事件。
   * @private
   * @returns {void}
   */
  _bindEvent() {
    this.cleanup.events.on('palette', document.body, 'click', (e) => {
      // 主题面板内的按钮。
      const btn = e.target.closest(
        '.palette-item .items > button[data-palette]'
      );
      if (!btn) return;

      // 主题面板内的配置分组。
      const groupEl = btn.closest('.palette-item');
      if (!groupEl) return;

      const type = groupEl.dataset.palette;
      const value = btn.dataset.palette;

      if (btn.classList.contains('is-active')) return;

      this.options[type] = value;
      this._applyConfig();
      this._saveConfig();
      this._syncActiveButtons();
    });
  }

  /**
   * 解绑主题面板点击事件。
   * @private
   * @returns {void}
   */
  _unbindEvent() {
    this.cleanup?.events.clear();
  }

  /**
   * 创建主题交互面板。
   * @param {string} [containerClass="j-theme-palette"] 主题交互面板容器类名。
   * @param {ThemePanelGroup[]|null} [panelConfig=null] 自定义面板分组配置。
   * @returns {HTMLElement} 主题交互面板节点。
   */
  createPanel(containerClass = 'j-theme-palette', panelConfig = null) {
    const groups = panelConfig || [
      {
        title: this._t('theme'),
        type: 'theme',
        buttons: [
          ['gray', this._t('gray')],
          ['olive', this._t('olive')],
          ['tomato', this._t('tomato')],
          ['ruby', this._t('ruby')],
          ['pink', this._t('pink')],
          ['violet', this._t('violet')],
          ['indigo', this._t('indigo')],
          ['blue', this._t('blue')],
          ['teal', this._t('teal')],
          ['grass', this._t('grass')],
          ['mint', this._t('mint')],
          ['lime', this._t('lime')],
          ['yellow', this._t('yellow')],
          ['orange', this._t('orange')],
          ['gold', this._t('gold')],
        ],
      },
      {
        title: this._t('radius'),
        type: 'radius',
        buttons: [
          ['none', this._t('n')],
          ['sm', this._t('sm')],
          ['md', this._t('md')],
          ['lg', this._t('lg')],
          ['xl', this._t('xl')],
          ['round', this._t('round')],
        ],
      },
      {
        title: this._t('shadow'),
        type: 'shadow',
        buttons: [
          ['none', this._t('n')],
          ['sm', this._t('sm')],
          ['md', this._t('md')],
          ['lg', this._t('lg')],
        ],
      },
      {
        title: this._t('font'),
        type: 'font',
        buttons: [
          ['sm', this._t('sm')],
          ['md', this._t('md')],
        ],
      },
      {
        title: this._t('mode'),
        type: 'mode',
        buttons: [
          ['light', this._t('light')],
          ['dark', this._t('dark')],
          ['auto', this._t('auto')],
        ],
      },
    ];

    const panel = jsx('div', {
      className: containerClass,
      children: [
        jsx('div', {
          style: {
            display: 'flex',
            justifyContent: 'center',
          },
          children: jsx('button', {
            className: 'j-button is-text',
            'data-action': 'close',
            children: this._t('b'),
          }),
        }),
        jsx('h3', { children: this._t('t') }),
        jsx('p', {
          style: {
            marginTop: 0,
            fontSize: 'var(--text-sm, 0.875rem)',
          },
          // className: 'mt-0 text-sm',
          children: this._t('d'),
        }),
        jsx('div', {
          className: 'palette-container',
          children: groups.map((group) =>
            jsx('div', {
              className: 'palette-item',
              'data-palette': group.type,
              children: [
                jsx('div', { className: 'item-title', children: group.title }),
                jsx('div', {
                  className: 'items',
                  children: group.buttons.map(([val, label]) => {
                    const isActive =
                      String(this.options[group.type]) === String(val);
                    return jsx('button', {
                      className: `j-button is-default${isActive ? ' is-active' : ''}`,
                      'data-palette': val,
                      children: [
                        group.type === 'theme'
                          ? jsx('span', {
                              // className: `el-prefix item-hex bg-${val}-10`,
                              className: `el-prefix item-hex`,
                              style: {
                                backgroundColor: `var(--ui-${val})`,
                              },
                            })
                          : null,
                        jsx('span', {
                          className: 'button-text',
                          children: label,
                        }),
                      ],
                    });
                  }),
                }),
              ],
            })
          ),
        }),
      ],
    });
    return panel;
  }

  /**
   * 更新主题配置并立即应用。
   * @param {Partial<ThemeOptions>} newConfig 需要覆盖的主题配置。
   * @returns {void}
   */
  setConfig(newConfig) {
    this.options = Object.assign({}, this.options, newConfig);
    this._applyConfig();
    this._saveConfig();
    this._syncActiveButtons(document);
  }

  /**
   * 销毁当前主题实例并解绑事件。
   * @returns {void}
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this._unbindEvent();
    this.options = {};
    this.languages = {};
    this.cleanup = null;
    this.mq = null;
  }
}

export default Theme;

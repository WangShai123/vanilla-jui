import { jsx } from 'vanilla-signal';
import { t } from 'vanilla-signal-i18n';

import locales from '../locales/index.js';
import { all, requireRenderDOM } from '../utilities/dom.js';
import { createEventManager } from '../utilities/events.js';
import { getCookie, setCookie } from '../utilities/storage.js';

/**
 * @typedef {object} ThemeOptions
 * @property {string} [mode="dark"] 主题明暗模式，支持 light、dark、auto 或自定义值。
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
 * 负责主题配置的实例化、主题面板交互和 Cookie 读写。实例初始化不修改 html
 * 类名，仅在面板点击交互时同步当前点击项对应的 html class。
 *
 * 如需首屏按 Cookie 渲染 html class，可在 <head> 中放置：
 *
 * ```html
 * <script>
 * (function(d,k){var m=d.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]*)'));if(!m)return;try{var o=JSON.parse(m[1]),r=o.mode==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):o.mode,h=d.documentElement;h.classList.add(r||'dark','j-theme-'+(o.theme||'indigo'),'j-radius-'+(o.radius||'sm'),'j-shadow-'+(o.shadow||'sm'),'j-font-'+(o.font||'sm'));}catch(e){}})(document,'jui-theme');
 * </script>
 * ```
 */
export class Theme {
  /**
   * 创建主题实例。
   * @param {ThemeOptions} [options={}] 主题配置。
   */
  constructor(options = {}) {
    requireRenderDOM('Theme');

    this.props = {
      mode: 'dark',
      theme: 'indigo',
      radius: 'sm',
      shadow: 'sm',
      font: 'sm',
      key: 'jui-theme',
      ...options,
    };

    this.languages = locales;

    this._init();
  }

  /**
   * 初始化主题状态、读取缓存并绑定事件。
   * @private
   * @returns {void}
   */
  _init() {
    this.cleanup = { events: createEventManager() };
    this.runtime = { destroyed: false };
    this._loadConfig();
    this._bindEvent();
    this._syncActiveButtons();
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
      const result = getCookie(this.props.key);
      if (result && result.trim()) {
        this.props = Object.assign({}, this.props, JSON.parse(result));
      }
    } catch {}
  }

  /**
   * 将当前主题配置写入 Cookie。
   * @private
   * @returns {void}
   */
  _saveConfig() {
    const { mode, theme, radius, shadow, font } = this.props;
    const render = mode === 'auto' ? this._scheme() : mode;
    setCookie(
      this.props.key,
      JSON.stringify({ mode, theme, radius, shadow, font, render })
    );
  }

  _scheme() {
    return window?.matchMedia('(prefers-color-scheme: dark)')?.matches
      ? 'dark'
      : 'light';
  }

  /**
   * 同步主题面板按钮激活态。
   * @private
   * @returns {void}
   */
  _syncActiveButtons() {
    const items = all('.palette-item');
    for (const item of items) {
      const type = item.dataset.palette;
      const val = this.props[type];
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
      const btn = e.target.closest(
        '.palette-item .items > button[data-palette]'
      );
      if (!btn) return;

      const groupEl = btn.closest('.palette-item');
      if (!groupEl) return;

      const type = groupEl.dataset.palette;
      const value = btn.dataset.palette;

      if (btn.classList.contains('is-active')) return;

      const previous = this.props[type];
      this.props[type] = value;

      const h = document.documentElement;
      if (type === 'mode') {
        const actual = value === 'auto' ? this._scheme() : value;
        h.classList.remove('light', 'dark', previous);
        if (actual) h.classList.add(actual);
      } else {
        const prefixes = {
          theme: 'j-theme-',
          radius: 'j-radius-',
          shadow: 'j-shadow-',
          font: 'j-font-',
        };
        const prefix = prefixes[type];
        if (prefix) {
          const toRemove = Array.from(h.classList).filter((c) =>
            c.startsWith(prefix)
          );
          if (toRemove.length) h.classList.remove(...toRemove);
          h.classList.add(`${prefix}${value}`);
        }
      }

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
    this.cleanup.events.clear();
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
                      String(this.props[group.type]) === String(val);
                    return jsx('button', {
                      className: `j-button is-default${isActive ? ' is-active' : ''}`,
                      'data-palette': val,
                      children: [
                        group.type === 'theme'
                          ? jsx('span', {
                              className: 'el-prefix item-hex',
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
   * 更新主题配置并写入 Cookie。
   * @param {Partial<ThemeOptions>} newConfig 需要覆盖的主题配置。
   * @returns {void}
   */
  setConfig(newConfig) {
    this.props = Object.assign({}, this.props, newConfig);
    this._saveConfig();
    this._syncActiveButtons();
  }

  /**
   * 销毁当前主题实例并解绑事件。
   * @returns {void}
   */
  destroy() {
    if (this.runtime.destroyed) return;
    this.runtime.destroyed = true;
    this._unbindEvent();
    this.cleanup = null;
  }
}

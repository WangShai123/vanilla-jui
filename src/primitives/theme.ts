import { createStorage, type Storage } from 'vanilla-create-storage';
import {
  bindAttr,
  bindClass,
  createDeepStore,
  createRoot,
  flushSync,
  jsx,
} from 'vanilla-signal';
import { t } from 'vanilla-signal-i18n';

import locales from '../locales/index.ts';
import { joinClasses } from '../utilities/class-name.ts';
import { all } from '../utilities/dom.ts';
import { createEventManager, type IEventManager } from '../utilities/events.ts';
import { isPlainObject } from '../utilities/object.ts';

export type ThemeConfigKey = 'mode' | 'theme' | 'radius' | 'shadow' | 'font';

export interface ThemeClassNames {
  panel: string;
  title: string;
  container: string;
  item: string;
  itemTitle: string;
  items: string;
  button: string;
  active: string;
  prefix: string;
  swatch: string;
  buttonText: string;
}

export type ThemeClassNameConfig = Partial<ThemeClassNames>;

export interface ThemeOptions extends Record<string, unknown> {
  mode?: string;
  theme?: string;
  radius?: string;
  shadow?: string;
  font?: string;
  key?: string;
  className?: ThemeClassNameConfig;
}

export interface ThemePanelGroup {
  title: string;
  type: ThemeConfigKey;
  buttons: Array<[string, string]>;
}

export interface ThemeResolvedOptions {
  mode: string;
  theme: string;
  radius: string;
  shadow: string;
  font: string;
  key: string;
  className: ThemeClassNames;
}

interface ThemeCleanup {
  bindings: Set<() => void>;
  events: IEventManager;
}

export interface ThemeInstance {
  props: ThemeResolvedOptions;
  createPanel(
    containerClass?: string | null,
    panelConfig?: ThemePanelGroup[] | null
  ): HTMLElement;
  setConfig(newConfig: ThemeOptions): void;
  destroy(): void;
}

type ThemeStoredConfig = Partial<Record<ThemeConfigKey, string>> & {
  render?: string;
};

const DEFAULT_CLASS_NAMES: ThemeClassNames = {
  panel: 'j-theme-palette',
  title: 'theme-palette-title',
  container: 'palette-container',
  item: 'palette-item',
  itemTitle: 'item-title',
  items: 'items',
  button: 'j-button is-default',
  active: 'is-active',
  prefix: 'el-prefix',
  swatch: 'item-hex',
  buttonText: 'button-text',
};

const DEFAULT_OPTIONS: ThemeResolvedOptions = {
  mode: 'dark',
  theme: 'indigo',
  radius: 'sm',
  shadow: 'sm',
  font: 'sm',
  key: 'ui-theme',
  className: DEFAULT_CLASS_NAMES,
};

const THEME_CLASS_PREFIX: Record<Exclude<ThemeConfigKey, 'mode'>, string> = {
  theme: 'j-theme-',
  radius: 'j-radius-',
  shadow: 'j-shadow-',
  font: 'j-font-',
};

function mergeClassNames(className?: ThemeClassNameConfig): ThemeClassNames {
  return { ...DEFAULT_CLASS_NAMES, ...className };
}

function normalizeOptions(options: ThemeOptions = {}): ThemeResolvedOptions {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    className: mergeClassNames(options.className),
  };
}

function isThemeConfigKey(value: string | undefined): value is ThemeConfigKey {
  return (
    value === 'mode' ||
    value === 'theme' ||
    value === 'radius' ||
    value === 'shadow' ||
    value === 'font'
  );
}

function createThemeStorage(): Storage {
  return createStorage({
    driver: 'cookie',
    codec: 'json',
    driverOptions: {
      path: '/',
      sameSite: 'Lax',
      secure: typeof location !== 'undefined' && location.protocol === 'https:',
    },
    ttl: 864e5,
  });
}

function normalizeStoredConfig(value: unknown): Partial<ThemeOptions> | null {
  if (!isPlainObject(value)) return null;

  const source = value as Record<string, unknown>;
  const config: Partial<ThemeOptions> = {};
  const keys: ThemeConfigKey[] = ['mode', 'theme', 'radius', 'shadow', 'font'];

  for (const key of keys) {
    const item = source[key];
    if (typeof item === 'string') config[key] = item;
  }

  return Object.keys(config).length ? config : null;
}

/**
 * 主题管理组件。
 *
 * 负责主题配置的实例化、主题面板交互和 createStorage 持久化。实例初始化不修改
 * html 类名，仅在面板点击交互时同步当前点击项对应的 html class。
 */
class Theme implements ThemeInstance {
  props: ThemeResolvedOptions;
  languages: typeof locales;
  cleanup: ThemeCleanup | null;
  runtime: { configVersion: number; destroyed: boolean };
  storage: Storage;

  constructor(options: ThemeOptions = {}) {
    this.props = createDeepStore(normalizeOptions(options));
    this.languages = locales;
    this.cleanup = null;
    this.runtime = { configVersion: 0, destroyed: false };
    this.storage = createThemeStorage();

    this.init();
  }

  private init(): void {
    this.cleanup = { bindings: new Set(), events: createEventManager() };
    this.loadConfig();
    this.bindEvent();
  }

  private translate(key: string): string {
    return t(key, this.languages);
  }

  private loadConfig(): void {
    const configVersion = this.runtime.configVersion;
    void this.storage
      .get<unknown>(this.props.key)
      .then((result) => {
        if (
          this.runtime.destroyed ||
          this.runtime.configVersion !== configVersion
        )
          return;

        const config = normalizeStoredConfig(result);
        if (!config) return;

        flushSync(() => {
          Object.assign(this.props, config);
        });
      })
      .catch(() => {});
  }

  private saveConfig(): void {
    const { mode, theme, radius, shadow, font } = this.props;
    const render = mode === 'auto' ? this.scheme() : mode;
    const config: ThemeStoredConfig = {
      mode,
      theme,
      radius,
      shadow,
      font,
      render,
    };

    void this.storage.set(this.props.key, config).catch(() => {});
  }

  private scheme(): string {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private bindActiveButtons(root: HTMLElement): void {
    const dispose = createRoot((dispose) => {
      const items = all<HTMLElement>('[data-theme-group]', root);
      for (const item of items) {
        const type = item.dataset.themeGroup;
        if (!isThemeConfigKey(type)) continue;

        const buttons = all<HTMLButtonElement>('[data-theme-button]', item);
        for (const button of buttons) {
          const isActive = () =>
            button.dataset.themeValue === String(this.props[type]);
          bindClass(button, this.props.className.active, isActive);
          bindAttr(button, 'aria-selected', () => (isActive() ? 'true' : null));
        }
      }

      return dispose;
    });
    this.cleanup?.bindings.add(dispose);
  }

  private bindEvent(): void {
    this.cleanup?.events.on('palette', document.body, 'click', (event) => {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest<HTMLButtonElement>(
        '[data-theme-button]'
      );
      if (!button) return;

      const groupEl = button.closest<HTMLElement>('[data-theme-group]');
      const type = groupEl?.dataset.themeGroup;
      const value = button.dataset.themeValue;
      if (!groupEl || !isThemeConfigKey(type) || !value) return;
      if (button.classList.contains(this.props.className.active)) return;

      const previous = this.props[type];
      this.runtime.configVersion += 1;
      flushSync(() => {
        this.props[type] = value;
      });

      const root = document.documentElement;
      if (type === 'mode') {
        const actual = value === 'auto' ? this.scheme() : value;
        root.classList.remove('light', 'dark', previous);
        root.classList.add(actual);
      } else {
        const prefix = THEME_CLASS_PREFIX[type];
        const toRemove = Array.from(root.classList).filter((className) =>
          className.startsWith(prefix)
        );
        if (toRemove.length) root.classList.remove(...toRemove);
        root.classList.add(`${prefix}${value}`);
      }

      this.saveConfig();
    });
  }

  private unbindEvent(): void {
    this.cleanup?.events.clear();
  }

  createPanel(
    containerClass: string | null = null,
    panelConfig: ThemePanelGroup[] | null = null
  ): HTMLElement {
    const className = this.props.className;
    const groups = panelConfig || this.defaultPanelConfig();
    const panel = jsx('div', {
      className: containerClass || className.panel,
      'data-theme-palette': 'root',
      children: [
        jsx('h3', {
          className: className.title,
          'data-theme-title': '',
          style: {
            margin: '0 0 1rem',
          },
          children: this.translate('t'),
        }),
        jsx('div', {
          className: className.container,
          'data-theme-container': '',
          children: groups.map((group) =>
            jsx('div', {
              className: className.item,
              'data-palette': group.type,
              'data-theme-group': group.type,
              children: [
                jsx('div', {
                  className: className.itemTitle,
                  'data-theme-group-title': group.type,
                  children: group.title,
                }),
                jsx('div', {
                  className: className.items,
                  'data-theme-items': group.type,
                  children: group.buttons.map(([value, label]) => {
                    const isActive =
                      String(this.props[group.type]) === String(value);
                    return jsx('button', {
                      className: joinClasses(
                        className.button,
                        isActive && className.active
                      ),
                      'data-palette': value,
                      'data-theme-button': group.type,
                      'data-theme-value': value,
                      'aria-selected': isActive ? 'true' : null,
                      children: [
                        group.type === 'theme'
                          ? jsx('span', {
                              className: joinClasses(
                                className.prefix,
                                className.swatch
                              ),
                              'data-theme-swatch': value,
                              style: {
                                backgroundColor: `var(--ui-${value})`,
                              },
                            })
                          : null,
                        jsx('span', {
                          className: className.buttonText,
                          'data-theme-button-text': value,
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
    }) as HTMLElement;

    this.bindActiveButtons(panel);
    return panel;
  }

  setConfig(newConfig: ThemeOptions): void {
    this.runtime.configVersion += 1;
    flushSync(() => {
      Object.assign(this.props, newConfig, {
        className: mergeClassNames({
          ...this.props.className,
          ...newConfig.className,
        }),
      });
    });
    this.saveConfig();
  }

  destroy(): void {
    if (this.runtime.destroyed) return;
    this.runtime.destroyed = true;
    this.unbindEvent();
    this.cleanup?.bindings.forEach((dispose) => dispose());
    this.cleanup?.bindings.clear();
    this.cleanup = null;
    void this.storage.close().catch(() => {});
  }

  private defaultPanelConfig(): ThemePanelGroup[] {
    return [
      {
        title: this.translate('Primary'),
        type: 'theme',
        buttons: [
          ['gray', this.translate('Gray')],
          ['olive', this.translate('Olive')],
          ['tomato', this.translate('Tomato')],
          ['ruby', this.translate('Ruby')],
          ['pink', this.translate('Pink')],
          ['violet', this.translate('Violet')],
          ['indigo', this.translate('Indigo')],
          ['blue', this.translate('Blue')],
          ['teal', this.translate('Teal')],
          ['grass', this.translate('Grass')],
          ['mint', this.translate('Mint')],
          ['lime', this.translate('Lime')],
          ['yellow', this.translate('Yellow')],
          ['orange', this.translate('Orange')],
          ['gold', this.translate('Gold')],
        ],
      },
      {
        title: this.translate('Radius'),
        type: 'radius',
        buttons: [
          ['none', this.translate('None')],
          ['sm', this.translate('sm')],
          ['md', this.translate('md')],
          ['lg', this.translate('lg')],
          ['xl', this.translate('XL')],
          ['round', this.translate('Round')],
        ],
      },
      {
        title: this.translate('Shadow'),
        type: 'shadow',
        buttons: [
          ['none', this.translate('None')],
          ['sm', this.translate('sm')],
          ['md', this.translate('md')],
          ['lg', this.translate('lg')],
        ],
      },
      {
        title: this.translate('Font'),
        type: 'font',
        buttons: [
          ['sm', this.translate('sm')],
          ['md', this.translate('md')],
        ],
      },
      {
        title: this.translate('Mode'),
        type: 'mode',
        buttons: [
          ['light', this.translate('Light')],
          ['dark', this.translate('Dark')],
          ['auto', this.translate('Auto')],
        ],
      },
    ];
  }
}

export function createTheme(options: ThemeOptions = {}): ThemeInstance {
  return new Theme(options);
}

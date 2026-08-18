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
import { all, joinClasses } from '../utilities/dom.ts';
import { createEventManager } from '../utilities/events.ts';
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
    namespace: '',
    keySeparator: '',
    driverOptions: {
      path: '/',
      sameSite: 'Lax',
      secure: typeof location !== 'undefined' && location.protocol === 'https:',
    },
    ttl: 864e5 * 7, // 7 days
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

function defaultPanelConfig(
  translate: (key: string) => string
): ThemePanelGroup[] {
  return [
    {
      title: translate('Primary'),
      type: 'theme',
      buttons: [
        ['gray', translate('Gray')],
        ['olive', translate('Olive')],
        ['tomato', translate('Tomato')],
        ['ruby', translate('Ruby')],
        ['pink', translate('Pink')],
        ['violet', translate('Violet')],
        ['indigo', translate('Indigo')],
        ['blue', translate('Blue')],
        ['teal', translate('Teal')],
        ['grass', translate('Grass')],
        ['mint', translate('Mint')],
        ['lime', translate('Lime')],
        ['yellow', translate('Yellow')],
        ['orange', translate('Orange')],
        ['gold', translate('Gold')],
      ],
    },
    {
      title: translate('Radius'),
      type: 'radius',
      buttons: [
        ['none', translate('None')],
        ['sm', translate('sm')],
        ['md', translate('md')],
        ['lg', translate('lg')],
        ['xl', translate('XL')],
        ['round', translate('Round')],
      ],
    },
    {
      title: translate('Shadow'),
      type: 'shadow',
      buttons: [
        ['none', translate('None')],
        ['sm', translate('sm')],
        ['md', translate('md')],
        ['lg', translate('lg')],
      ],
    },
    {
      title: translate('Font'),
      type: 'font',
      buttons: [
        ['sm', translate('sm')],
        ['md', translate('md')],
      ],
    },
    {
      title: translate('Mode'),
      type: 'mode',
      buttons: [
        ['light', translate('Light')],
        ['dark', translate('Dark')],
        ['auto', translate('Auto')],
      ],
    },
  ];
}

export function createTheme(options: ThemeOptions = {}): ThemeInstance {
  const props = createDeepStore(normalizeOptions(options));
  const runtime = { configVersion: 0, destroyed: false };
  const storage = createThemeStorage();
  const bindings = new Set<() => void>();
  const events = createEventManager();
  const translate = (key: string): string => t(key, locales);
  const scheme = (): string =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  const saveConfig = (): void => {
    const { mode, theme, radius, shadow, font } = props;
    const config: ThemeStoredConfig = {
      mode,
      theme,
      radius,
      shadow,
      font,
      render: mode === 'auto' ? scheme() : mode,
    };
    void storage.set(props.key, config).catch(() => {});
  };
  const bindActiveButtons = (root: HTMLElement): void => {
    const dispose = createRoot((dispose) => {
      for (const item of all<HTMLElement>('[data-theme-group]', root)) {
        const type = item.dataset.themeGroup;
        if (!isThemeConfigKey(type)) continue;
        for (const button of all<HTMLButtonElement>(
          '[data-theme-button]',
          item
        )) {
          const isActive = () =>
            button.dataset.themeValue === String(props[type]);
          bindClass(button, props.className.active, isActive);
          bindAttr(button, 'aria-selected', () => (isActive() ? 'true' : null));
        }
      }
      return dispose;
    });
    bindings.add(dispose);
  };
  const createPanel: ThemeInstance['createPanel'] = (
    containerClass = null,
    panelConfig = null
  ) => {
    const className = props.className;
    const groups = panelConfig || defaultPanelConfig(translate);
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
          children: translate('t'),
        }),
        jsx('div', {
          className: className.container,
          'data-theme-container': '',
          children: groups.map((group) =>
            jsx('div', {
              className: className.item,
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
                      String(props[group.type]) === String(value);
                    return jsx('button', {
                      className: joinClasses(
                        className.button,
                        isActive && className.active
                      ),
                      'data-action': 'customTheme',
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

    bindActiveButtons(panel);
    return panel;
  };
  const setConfig = (newConfig: ThemeOptions): void => {
    runtime.configVersion += 1;
    flushSync(() => {
      Object.assign(props, newConfig, {
        className: mergeClassNames({
          ...props.className,
          ...newConfig.className,
        }),
      });
    });
    saveConfig();
  };
  const destroy = (): void => {
    if (runtime.destroyed) return;
    runtime.destroyed = true;
    events.clear();
    for (const dispose of bindings) dispose();
    bindings.clear();
    void storage.close().catch(() => {});
  };

  events.on('palette', document.body, 'click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>(
      '[data-theme-button]'
    );
    const group = button?.closest<HTMLElement>('[data-theme-group]');
    const type = group?.dataset.themeGroup;
    const value = button?.dataset.themeValue;
    if (!button || !isThemeConfigKey(type) || !value) return;
    if (button.classList.contains(props.className.active)) return;

    const previous = props[type];
    runtime.configVersion += 1;
    flushSync(() => {
      props[type] = value;
    });

    const root = document.documentElement;
    if (type === 'mode') {
      root.classList.remove('light', 'dark', previous);
      root.classList.add(value === 'auto' ? scheme() : value);
    } else {
      const prefix = THEME_CLASS_PREFIX[type];
      const obsolete = Array.from(root.classList).filter((className) =>
        className.startsWith(prefix)
      );
      if (obsolete.length) root.classList.remove(...obsolete);
      root.classList.add(`${prefix}${value}`);
    }
    saveConfig();
  });

  const configVersion = runtime.configVersion;
  void storage
    .get<unknown>(props.key)
    .then((result) => {
      if (runtime.destroyed || runtime.configVersion !== configVersion) return;
      const config = normalizeStoredConfig(result);
      if (!config) return;
      flushSync(() => {
        Object.assign(props, config);
      });
    })
    .catch(() => {});

  return { props, createPanel, setConfig, destroy };
}

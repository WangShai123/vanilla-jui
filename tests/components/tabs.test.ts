// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { Tabs, createTabs, type TabItem } from '../../src/components/tabs.ts';

let tabs: Tabs | null = null;

function app(): HTMLElement {
  const element = document.querySelector<HTMLElement>('#app');
  if (!element) throw new Error('Missing #app fixture.');
  return element;
}

function tabItems(): TabItem[] {
  return [
    { name: 'intro', title: 'Intro', panel: 'Intro panel' },
    { name: 'usage', title: 'Usage', panel: 'Usage panel' },
    { name: 'api', title: 'API', panel: 'API panel' },
  ];
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  tabs?.destroy();
  tabs = null;
  document.body.innerHTML = '';
});

describe('Tabs', () => {
  it('builds default classes and stable data markers', () => {
    tabs = new Tabs(app(), {
      id: 'default-tabs',
      active: 'usage',
      tabs: tabItems(),
    }).build();

    expect(tabs.root?.classList.contains('j-tabs')).toBe(true);
    expect(tabs.root?.classList.contains('is-top')).toBe(true);
    expect(tabs.root?.getAttribute('data-tabs')).toBe('root');
    expect(tabs.root?.querySelectorAll('[data-tabs-tab]')).toHaveLength(3);
    expect(tabs.root?.querySelectorAll('[data-tabs-panel]')).toHaveLength(3);
    expect(tabs.root?.querySelector('[data-tabs-tab-title]')).toBeNull();
    expect(tabs.root?.querySelector('[data-tabs-panel-body]')).toBeNull();
    expect(tabs.dom.tabs[1]?.textContent).toBe('Usage');
    expect(tabs.dom.panels[1]?.textContent).toBe('Usage panel');
    expect(tabs.dom.tabs[1]?.classList.contains('is-active')).toBe(true);
    expect(tabs.dom.panels[1]?.classList.contains('is-active')).toBe(true);
    expect(tabs.state.current.name).toBe('usage');
  });

  it('uses data markers for interaction when className is customized', async () => {
    const onChange = vi.fn();

    tabs = createTabs(app(), {
      active: 'intro',
      className: {
        root: 'qa-tabs',
        top: 'qa-top',
        wrap: 'qa-wrap',
        list: 'qa-list',
        tab: 'qa-tab',
        panelWrap: 'qa-panel-wrap',
        panel: 'qa-panel',
      },
      tabs: tabItems(),
      onChange,
    }).build();

    expect(tabs.root?.classList.contains('qa-tabs')).toBe(true);
    expect(tabs.root?.classList.contains('j-tabs')).toBe(false);
    expect(tabs.root?.querySelector('.tab-item')).toBeNull();

    tabs.root?.querySelector<HTMLElement>('[data-tabs-tab="usage"]')?.click();
    await Promise.resolve();

    expect(tabs.state.current.name).toBe('usage');
    expect(onChange).toHaveBeenCalledWith(
      1,
      'usage',
      tabs.dom.tabs[1],
      tabs.dom.panels[1]
    );
  });

  it('honors disabled tabs and can enable them later', async () => {
    tabs = createTabs(app(), {
      active: 'intro',
      disabled: 'usage',
      tabs: tabItems(),
    }).build();

    tabs.root?.querySelector<HTMLElement>('[data-tabs-tab="usage"]')?.click();
    await Promise.resolve();
    expect(tabs.state.current.name).toBe('intro');
    expect(tabs.dom.tabs[1]?.classList.contains('is-disabled')).toBe(true);

    tabs.enable('usage');
    tabs.root?.querySelector<HTMLElement>('[data-tabs-tab="usage"]')?.click();
    await Promise.resolve();
    expect(tabs.state.current.name).toBe('usage');
  });

  it('loads async panel content and caches it', async () => {
    const load = vi.fn(async () => 'Async content');

    tabs = createTabs(app(), {
      active: 'intro',
      tabs: [
        { name: 'intro', title: 'Intro', panel: 'Intro panel' },
        { name: 'async', title: 'Async', panel: load, cache: true },
      ],
    }).build();

    await tabs.activate('async');
    await Promise.resolve();

    expect(load).toHaveBeenCalledTimes(1);
    expect(tabs.dom.panels[1]?.textContent).toBe('Async content');
    expect(tabs.dom.panels[1]?.getAttribute('aria-live')).toBe('polite');
    expect(tabs.dom.panels[1]?.getAttribute('aria-busy')).toBe('false');

    await tabs.activate('intro');
    await tabs.activate('async');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('supports add, delete and reInit', async () => {
    tabs = createTabs(app(), {
      active: 'intro',
      tabs: tabItems(),
    }).build();

    await tabs.add({ name: 'more', title: 'More', panel: 'More panel' });
    expect(tabs.root?.querySelector('[data-tabs-tab="more"]')).toBeTruthy();

    await tabs.delete('usage');
    expect(tabs.root?.querySelector('[data-tabs-tab="usage"]')).toBeNull();

    await tabs.reInit({
      active: 'new',
      tabs: [{ name: 'new', title: 'New', panel: 'New panel' }],
    });

    expect(tabs.root?.querySelectorAll('[data-tabs-tab]')).toHaveLength(1);
    expect(tabs.state.current.name).toBe('new');
  });
});

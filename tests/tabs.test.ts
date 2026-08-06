// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { createTabs, type TabItem } from '../src/components/tabs.ts';

type TabsInstance = ReturnType<typeof createTabs>;

let tabs: TabsInstance | null = null;

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

function mount(instance: TabsInstance): TabsInstance {
  instance.build();
  if (!instance.dom.root) throw new Error('Tabs did not build a root.');
  app().appendChild(instance.dom.root);
  instance.refresh();
  return instance;
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
    tabs = createTabs({
      id: 'default-tabs',
      active: 'usage',
      data: tabItems(),
    });

    expect(tabs.dom.root).toBeNull();

    tabs.build();
    expect(app().contains(tabs.dom.root)).toBe(false);
    if (!tabs.dom.root) throw new Error('Expected Tabs root.');
    app().appendChild(tabs.dom.root);
    tabs.refresh();

    expect(tabs.dom.root.classList.contains('j-tabs')).toBe(true);
    expect(tabs.dom.root.getAttribute('data-tabs-direction')).toBe('top');
    expect(tabs.dom.root.getAttribute('data-tabs')).toBe('root');
    expect(tabs.dom.root.querySelectorAll('[data-tabs-tab]')).toHaveLength(3);
    expect(tabs.dom.root.querySelectorAll('[data-tabs-panel]')).toHaveLength(3);
    expect(tabs.dom.root.querySelector('[data-tabs-tab-title]')).toBeNull();
    expect(tabs.dom.root.querySelector('[data-tabs-panel-body]')).toBeNull();
    expect(tabs.dom.tabs[1]?.textContent).toBe('Usage');
    expect(tabs.dom.panels[1]?.textContent).toBe('Usage panel');
    expect(tabs.dom.tabs[1]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs.dom.panels[1]?.getAttribute('aria-hidden')).toBe('false');
    expect(tabs.state.current.name).toBe('usage');
  });

  it('uses data markers for interaction when className is customized', async () => {
    const onChange = vi.fn();

    tabs = mount(
      createTabs({
        active: 'intro',
        className: {
          root: 'qa-tabs',
          wrap: 'qa-wrap',
          list: 'qa-list',
          tab: 'qa-tab',
          panelWrap: 'qa-panel-wrap',
          panel: 'qa-panel',
        },
        data: tabItems(),
        onChange,
      })
    );

    expect(tabs.dom.root?.classList.contains('qa-tabs')).toBe(true);
    expect(tabs.dom.root?.classList.contains('j-tabs')).toBe(false);
    expect(tabs.dom.root?.querySelector('.tab-item')).toBeNull();

    tabs.dom.root
      ?.querySelector<HTMLElement>('[data-tabs-tab="usage"]')
      ?.click();
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
    tabs = mount(
      createTabs({
        active: 'intro',
        disabled: 'usage',
        data: tabItems(),
      })
    );

    tabs.dom.root
      ?.querySelector<HTMLElement>('[data-tabs-tab="usage"]')
      ?.click();
    await Promise.resolve();
    expect(tabs.state.current.name).toBe('intro');
    expect(tabs.dom.tabs[1]?.getAttribute('aria-disabled')).toBe('true');

    tabs.state.disabled = [];
    tabs.dom.root
      ?.querySelector<HTMLElement>('[data-tabs-tab="usage"]')
      ?.click();
    await Promise.resolve();
    expect(tabs.state.current.name).toBe('usage');
  });

  it('loads async panel content and caches it', async () => {
    const load = vi.fn(async () => 'Async content');

    tabs = mount(
      createTabs({
        active: 'intro',
        data: [
          { name: 'intro', title: 'Intro', panel: 'Intro panel' },
          { name: 'async', title: 'Async', panel: load, cache: true },
        ],
      })
    );

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

  it('refreshes tabs when state data changes', async () => {
    tabs = mount(
      createTabs({
        active: 'intro',
        data: tabItems(),
      })
    );

    tabs.state.data = [
      ...tabs.state.data,
      { name: 'more', title: 'More', panel: 'More panel' },
    ];
    await Promise.resolve();
    expect(tabs.dom.root?.querySelector('[data-tabs-tab="more"]')).toBeTruthy();

    tabs.state.data = tabs.state.data.filter((item) => item.name !== 'usage');
    await Promise.resolve();
    expect(tabs.dom.root?.querySelector('[data-tabs-tab="usage"]')).toBeNull();

    tabs.setState({
      active: 'new',
      data: [{ name: 'new', title: 'New', panel: 'New panel' }],
    });
    await Promise.resolve();

    expect(tabs.dom.root?.querySelectorAll('[data-tabs-tab]')).toHaveLength(1);
    expect(tabs.state.current.name).toBe('new');
  });
});

// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { jsx } from 'vanilla-signal';

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
    { name: 'intro', title: 'Intro', content: 'Intro content' },
    { name: 'usage', title: 'Usage', content: 'Usage content' },
    { name: 'api', title: 'API', content: 'API content' },
  ];
}

function mount(instance: TabsInstance): TabsInstance {
  instance.build();
  if (!instance.element) throw new Error('Tabs did not build a root.');
  app().appendChild(instance.element);
  return instance;
}

function tabElements(instance: TabsInstance): HTMLElement[] {
  return Array.from(
    instance.element?.querySelectorAll<HTMLElement>('[data-tabs-tab]') || []
  );
}

function panelElements(instance: TabsInstance): HTMLElement[] {
  return Array.from(
    instance.element?.querySelectorAll<HTMLElement>('[data-tabs-panel]') || []
  );
}

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  vi.useRealTimers();
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

    expect(tabs.element).toBeNull();

    tabs.build();
    expect(app().contains(tabs.element)).toBe(false);
    if (!tabs.element) throw new Error('Expected Tabs root.');
    app().appendChild(tabs.element);

    expect(tabs.element.classList.contains('j-tabs')).toBe(true);
    expect(tabs.element.getAttribute('data-tabs-direction')).toBe('top');
    expect(tabs.element.getAttribute('data-tabs')).toBe('root');
    expect(tabs.element.querySelectorAll('[data-tabs-tab]')).toHaveLength(3);
    expect(tabs.element.querySelectorAll('[data-tabs-panel]')).toHaveLength(3);
    expect(tabs.element.querySelector('[data-tabs-tab-title]')).toBeNull();
    expect(tabs.element.querySelector('[data-tabs-panel-body]')).toBeNull();
    expect(tabElements(tabs)[1]?.textContent).toBe('Usage');
    expect(panelElements(tabs)[1]?.textContent).toBe('Usage content');
    expect(tabElements(tabs)[1]?.getAttribute('aria-selected')).toBe('true');
    expect(panelElements(tabs)[1]?.getAttribute('aria-hidden')).toBe('false');
    expect(tabs.current.name).toBe('usage');
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

    expect(tabs.element?.classList.contains('qa-tabs')).toBe(true);
    expect(tabs.element?.classList.contains('j-tabs')).toBe(false);
    expect(tabs.element?.querySelector('.tab-item')).toBeNull();

    tabs.element
      ?.querySelector<HTMLElement>('[data-tabs-tab="usage"]')
      ?.click();
    await Promise.resolve();

    expect(tabs.current.name).toBe('usage');
    expect(onChange).toHaveBeenCalledWith(
      1,
      'usage',
      tabElements(tabs)[1],
      panelElements(tabs)[1]
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

    tabs.element
      ?.querySelector<HTMLElement>('[data-tabs-tab="usage"]')
      ?.click();
    await Promise.resolve();
    expect(tabs.current.name).toBe('intro');
    expect(tabElements(tabs)[1]?.getAttribute('aria-disabled')).toBe('true');

    tabs.state.disabled = [];
    tabs.element
      ?.querySelector<HTMLElement>('[data-tabs-tab="usage"]')
      ?.click();
    await Promise.resolve();
    expect(tabs.current.name).toBe('usage');
  });

  it('loads async content and caches it', async () => {
    const load = vi.fn(async () => 'Async content');

    tabs = mount(
      createTabs({
        active: 'intro',
        data: [
          { name: 'intro', title: 'Intro', content: 'Intro content' },
          { name: 'async', title: 'Async', content: load, cache: true },
        ],
      })
    );

    await tabs.activate('async');
    await Promise.resolve();

    expect(load).toHaveBeenCalledTimes(1);
    expect(panelElements(tabs)[1]?.textContent).toBe('Async content');
    expect(panelElements(tabs)[1]?.getAttribute('aria-live')).toBe('polite');
    expect(panelElements(tabs)[1]?.getAttribute('aria-busy')).toBe('false');

    await tabs.activate('intro');
    await tabs.activate('async');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('uses milliseconds for async content cache ttl', async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => `Async content ${load.mock.calls.length}`);

    tabs = mount(
      createTabs({
        active: 'intro',
        data: [
          { name: 'intro', title: 'Intro', content: 'Intro content' },
          {
            name: 'async',
            title: 'Async',
            content: load,
            cache: true,
            ttl: 1000,
          },
        ],
      })
    );

    await tabs.activate('async');
    await tick();
    expect(load).toHaveBeenCalledTimes(1);
    expect(panelElements(tabs)[1]?.textContent).toBe('Async content 1');

    await tabs.activate('intro');
    vi.advanceTimersByTime(999);
    await tabs.activate('async');
    await tick();
    expect(load).toHaveBeenCalledTimes(1);

    await tabs.activate('intro');
    vi.advanceTimersByTime(2);
    await tabs.activate('async');
    await tick();
    expect(load).toHaveBeenCalledTimes(2);
    expect(panelElements(tabs)[1]?.textContent).toBe('Async content 2');
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
      { name: 'more', title: 'More', content: 'More content' },
    ];
    await tick();
    expect(tabs.element?.querySelector('[data-tabs-tab="more"]')).toBeTruthy();

    tabs.state.data = tabs.state.data.filter((item) => item.name !== 'usage');
    await tick();
    expect(tabs.element?.querySelector('[data-tabs-tab="usage"]')).toBeNull();

    tabs.setState({
      active: 'new',
      data: [{ name: 'new', title: 'New', content: 'New content' }],
    });
    await tick();

    expect(tabs.element?.querySelectorAll('[data-tabs-tab]')).toHaveLength(1);
    expect(tabs.current.name).toBe('new');
  });

  it('updates keyed data through state without recreating stable nodes', async () => {
    tabs = mount(
      createTabs({
        active: 'intro',
        data: tabItems(),
      })
    );

    const introTab = tabs.element?.querySelector<HTMLElement>(
      '[data-tabs-tab="intro"]'
    );
    const usagePanel = tabs.element?.querySelector<HTMLElement>(
      '[data-tabs-panel="usage"]'
    );
    const apiTab = tabs.element?.querySelector<HTMLElement>(
      '[data-tabs-tab="api"]'
    );

    tabs.state.data.splice(1, 0, {
      name: 'more',
      title: 'More',
      content: 'More content',
    });
    await tick();

    expect(tabs.element?.querySelector('[data-tabs-tab="more"]')).toBeTruthy();
    expect(tabs.element?.querySelector('[data-tabs-tab="intro"]')).toBe(
      introTab
    );
    expect(tabs.element?.querySelector('[data-tabs-panel="usage"]')).toBe(
      usagePanel
    );

    const usage = tabs.state.data.find((item) => item.name === 'usage');
    if (!usage) throw new Error('Missing Tabs test data.');
    usage.content = 'Usage updated';
    await tick();

    expect(tabs.element?.querySelector('[data-tabs-tab="intro"]')).toBe(
      introTab
    );
    expect(tabs.element?.querySelector('[data-tabs-panel="usage"]')).toBe(
      usagePanel
    );
    expect(usagePanel?.textContent).toBe('Usage updated');

    const apiIndex = tabs.state.data.findIndex((item) => item.name === 'api');
    const [apiItem] = tabs.state.data.splice(apiIndex, 1);
    tabs.state.data.splice(0, 0, apiItem);
    await tick();
    expect(tabElements(tabs)[0]).toBe(apiTab);

    tabs.state.data = tabs.state.data.filter((item) => item.name !== 'usage');
    await tick();
    expect(tabs.element?.querySelector('[data-tabs-tab="usage"]')).toBeNull();
    expect(tabs.element?.querySelector('[data-tabs-panel="usage"]')).toBeNull();

    tabs.state.data = [
      { name: 'api', title: 'API updated', content: 'API updated content' },
      { name: 'intro', title: 'Intro', content: 'Intro content' },
    ];
    await tick();

    expect(tabs.element?.querySelector('[data-tabs-tab="api"]')).toBe(apiTab);
    expect(tabs.element?.querySelector('[data-tabs-tab="intro"]')).toBe(
      introTab
    );
  });

  it('inserts keyed data without moving unchanged top-level nodes', async () => {
    tabs = mount(
      createTabs({
        active: 'intro',
        data: tabItems(),
      })
    );

    const list = tabs.element?.querySelector<HTMLElement>('[data-tabs-list]');
    const panelWrap = tabs.element?.querySelector<HTMLElement>(
      '[data-tabs-panel-wrap]'
    );
    if (!list || !panelWrap) throw new Error('Missing Tabs containers.');
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => {
      mutations.push(...records);
    });
    observer.observe(list, { childList: true });
    observer.observe(panelWrap, { childList: true });

    tabs.state.data.splice(1, 0, {
      name: 'more',
      title: 'More',
      content: 'More content',
    });
    await tick();
    observer.disconnect();

    const added = mutations.flatMap((record) => Array.from(record.addedNodes));
    const removed = mutations.flatMap((record) =>
      Array.from(record.removedNodes)
    );
    const addedTabs = added.filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.hasAttribute('data-tabs-tab')
    );
    const addedPanels = added.filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.hasAttribute('data-tabs-panel')
    );

    expect(removed).toHaveLength(0);
    expect(addedTabs).toHaveLength(1);
    expect(addedTabs[0]?.dataset.tabsTab).toBe('more');
    expect(addedPanels).toHaveLength(1);
    expect(addedPanels[0]?.dataset.tabsPanel).toBe('more');
  });

  it('inserts keyed data without refreshing unchanged item content', async () => {
    tabs = mount(
      createTabs({
        active: 'profile',
        data: [
          { name: 'overview', title: 'Overview', content: 'Overview content' },
          {
            name: 'profile',
            title: 'Profile',
            content: () =>
              jsx('div', {
                children: [
                  jsx('strong', { children: 'Profile content' }),
                  jsx('p', {
                    children: 'Tab content can be a function.',
                  }),
                ],
              }),
          },
          { name: 'settings', title: 'Settings', content: 'Settings content' },
        ],
      })
    );
    await tick();

    const stableNodes = [
      tabs.element?.querySelector<HTMLElement>('[data-tabs-tab="overview"]'),
      tabs.element?.querySelector<HTMLElement>('[data-tabs-tab="profile"]'),
      tabs.element?.querySelector<HTMLElement>('[data-tabs-tab="settings"]'),
      tabs.element?.querySelector<HTMLElement>('[data-tabs-panel="overview"]'),
      tabs.element?.querySelector<HTMLElement>('[data-tabs-panel="profile"]'),
      tabs.element?.querySelector<HTMLElement>('[data-tabs-panel="settings"]'),
    ].filter((node): node is HTMLElement => !!node);
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => {
      mutations.push(...records);
    });
    for (const node of stableNodes) {
      observer.observe(node, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    tabs.state.data.push({
      name: 'more',
      title: 'More',
      content: () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('More content'), 10);
        }),
    });
    await tick();
    observer.disconnect();

    expect(mutations).toHaveLength(0);
  });

});

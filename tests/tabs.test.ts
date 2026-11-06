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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('Tabs', () => {
  it('remeasures resized tabs, hides a removed selection, and disposes observation', async () => {
    let notify = () => {};
    const disconnect = vi.fn();
    const unobserve = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe = observe;
        unobserve = unobserve;
        disconnect = disconnect;
      }
    );
    let width = 100;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return new DOMRect(
          this.dataset.tabsTab === 'usage' ? 120 : 0,
          0,
          width,
          32
        );
      }
    );
    tabs = createTabs({ active: 'usage', data: tabItems() });
    tabs.mount(app());
    await tick();
    const indicator = tabs.element?.querySelector<HTMLElement>(
      '[data-tabs-indicator]'
    );
    expect(indicator?.style.width).toBe('100px');
    expect(observe).toHaveBeenCalledTimes(5);
    width = 160;
    notify();
    await tick();
    expect(indicator?.style.width).toBe('160px');
    tabs.state.data.splice(1, 1);
    await tick();
    expect(indicator?.style.display).toBe('none');
    expect(unobserve).toHaveBeenCalledTimes(1);
    tabs.destroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
    notify();
    await tick();
    expect(observe).toHaveBeenCalledTimes(5);
  });

  it.each(['top', 'bottom', 'left', 'right'] as const)(
    'slides one stable indicator for %s tabs and cancels interrupted motion',
    async (direction) => {
      const vertical = direction === 'left' || direction === 'right';
      const rect = (x: number, y: number, width = 100, height = 32) =>
        new DOMRect(x, y, width, height);
      let visible = rect(100, 50);
      vi.spyOn(
        HTMLElement.prototype,
        'getBoundingClientRect'
      ).mockImplementation(function (this: HTMLElement) {
        if (this.hasAttribute('data-tabs-indicator')) return visible;
        const name = this.dataset.tabsTab;
        const index = ['intro', 'usage', 'api'].indexOf(name || '');
        return index < 0
          ? rect(100, 50)
          : rect(
              100 + (vertical ? 0 : index * 120),
              50 + (vertical ? index * 40 : 0)
            );
      });
      const cancellations: ReturnType<typeof vi.fn>[] = [];
      const animate = vi.fn(
        (_keyframes: Keyframe[], _options: KeyframeAnimationOptions) => {
          const cancel = vi.fn();
          cancellations.push(cancel);
          return {
            finished: new Promise<void>(() => {}),
            cancel,
          } as unknown as Animation;
        }
      );
      vi.stubGlobal('ResizeObserver', undefined);
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: direction === 'top' }))
      );
      const rootDescriptor = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        'animate'
      );
      Object.defineProperty(HTMLElement.prototype, 'animate', {
        configurable: true,
        value: animate,
      });
      try {
        tabs = createTabs({
          direction,
          active: 'intro',
          disabled: 'api',
          data: tabItems(),
          className: { root: 'custom-tabs', indicator: 'custom-indicator' },
        });
        tabs.mount(app());
        await tick();
        const root = tabs.element;
        const parent = root?.parentElement;
        const intro = tabElements(tabs)[0];
        const indicator = root?.querySelector<HTMLElement>(
          '[data-tabs-indicator]'
        );
        expect(indicator?.className).toBe('custom-indicator');
        expect(indicator?.style.transform).toBe('translate3d(0px, 0px, 0)');
        expect(animate).not.toHaveBeenCalled();

        await tabs.activate('api');
        expect(animate).not.toHaveBeenCalled();
        await tabs.activate('usage');
        await tick();
        const destination = vertical
          ? 'translate3d(0px, 40px, 0)'
          : 'translate3d(120px, 0px, 0)';
        expect(indicator?.style.transform).toBe(destination);
        expect(animate.mock.calls[0]?.[0]).toEqual([
          { transform: 'translate3d(0px, 0px, 0) scale(1, 1)' },
          { transform: destination },
        ]);
        expect(animate.mock.calls[0]?.[1]?.duration).toBe(
          direction === 'top' ? 0 : 240
        );

        visible = vertical ? rect(100, 70) : rect(160, 50);
        tabs.state.disabled = [];
        await tabs.activate('api');
        await tick();
        expect(cancellations[0]).toHaveBeenCalled();
        expect(animate.mock.calls[1]?.[0]?.[0]).toEqual({
          transform: vertical
            ? 'translate3d(0px, 20px, 0) scale(1, 1)'
            : 'translate3d(60px, 0px, 0) scale(1, 1)',
        });
        expect(tabs.element).toBe(root);
        expect(root?.parentElement).toBe(parent);
        expect(root?.querySelectorAll('[data-tabs-indicator]')).toHaveLength(1);
        expect(root?.querySelector('[data-tabs-indicator]')).toBe(indicator);
        expect(tabElements(tabs)[0]).toBe(intro);
        tabs.destroy();
        expect(cancellations[1]).toHaveBeenCalled();
      } finally {
        if (rootDescriptor)
          Object.defineProperty(
            HTMLElement.prototype,
            'animate',
            rootDescriptor
          );
        else Reflect.deleteProperty(HTMLElement.prototype, 'animate');
      }
    }
  );

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
    expect(Object.hasOwn(tabs, 'activeIndex')).toBe(false);
    expect(Object.hasOwn(tabs, 'disabledNames')).toBe(false);
  });

  it('renders tab titles from renderable functions with context', async () => {
    tabs = mount(
      createTabs({
        active: 'chart',
        data: [
          {
            name: 'chart',
            count: 1,
            title: ({ item, index, name }) => [
              jsx('strong', {
                children: `${name}:${index}`,
              }),
              ` ${String(item.count)}`,
              jsx('button', {
                type: 'button',
                children: 'Action',
              }),
            ],
            content: 'Chart panel',
          },
        ],
      })
    );

    const tab = tabs.element?.querySelector<HTMLElement>(
      '[data-tabs-tab="chart"]'
    );
    expect(tab?.textContent).toBe('chart:0 1Action');

    tabs.state.data[0]!.count = 2;
    await tick();

    expect(tab?.textContent).toBe('chart:0 2Action');
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

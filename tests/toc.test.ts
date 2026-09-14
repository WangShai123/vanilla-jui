// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { insert } from 'vanilla-signal';

import { createToc } from '../src/components/toc.ts';

let toc: ReturnType<typeof createToc> | null = null;

function mount(): { container: HTMLElement; target: HTMLElement } {
  document.body.innerHTML = `
    <aside id="toc"></aside>
    <main id="content" class="j-content">
      <h2 id="intro">Intro</h2>
      <h3 id="details">Details</h3>
      <h2 id="summary">Summary</h2>
    </main>
  `;
  const container = document.querySelector<HTMLElement>('#toc');
  const target = document.querySelector<HTMLElement>('#content');
  if (!container || !target) throw new Error('Missing Toc fixture.');
  return { container, target };
}

function mountMany(count: number): {
  container: HTMLElement;
  target: HTMLElement;
} {
  document.body.innerHTML = `
    <aside id="toc"></aside>
    <main id="content" class="j-content">
      ${Array.from({ length: count }, (_, index) => `<h2 id="heading-${index}">Heading ${index + 1}</h2>`).join('')}
    </main>
  `;
  const container = document.querySelector<HTMLElement>('#toc');
  const target = document.querySelector<HTMLElement>('#content');
  if (!container || !target) throw new Error('Missing Toc fixture.');
  return { container, target };
}

function mockHeadingTop(element: Element, top: number): void {
  element.getBoundingClientRect = () =>
    ({
      top,
      left: 0,
      right: 0,
      bottom: top,
      width: 0,
      height: 0,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

function mockScrollY(value: number): void {
  Object.defineProperty(window, 'scrollY', {
    value,
    configurable: true,
  });
  Object.defineProperty(window, 'pageYOffset', {
    value,
    configurable: true,
  });
}

function mockLinkMetrics(links: NodeListOf<HTMLElement>, height: number): void {
  links.forEach((link, index) => {
    const top = index * height;
    Object.defineProperty(link, 'offsetHeight', {
      value: height,
      configurable: true,
    });
    Object.defineProperty(link, 'offsetTop', {
      value: top,
      configurable: true,
    });
    link.getBoundingClientRect = () =>
      ({
        top,
        left: 0,
        right: 0,
        bottom: top + height,
        width: 0,
        height,
        x: 0,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect;
  });
}

function mockListMetrics(list: HTMLElement, height: number): void {
  Object.defineProperty(list, 'offsetHeight', {
    value: height,
    configurable: true,
  });
  list.getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      right: 0,
      bottom: height,
      width: 0,
      height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

async function tick(count = 4): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  document.body.innerHTML = '';
  mockScrollY(0);
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    configurable: true,
  });
  Object.defineProperty(window, 'requestAnimationFrame', {
    value: (callback: FrameRequestCallback) => {
      queueMicrotask(() => callback(0));
      return 1;
    },
    configurable: true,
  });
  Object.defineProperty(window, 'cancelAnimationFrame', {
    value: vi.fn(),
    configurable: true,
  });
});

afterEach(() => {
  toc?.destroy();
  toc = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Toc', () => {
  it('builds default classes and data markers from headings', () => {
    const { container } = mount();

    toc = createToc({ target: '#content' }).build();
    if (toc.element) container.appendChild(toc.element);

    expect(
      container.querySelector('[data-toc="root"]')?.classList.contains('j-toc')
    ).toBe(true);
    expect(
      container
        .querySelector('[data-toc-list="root"]')
        ?.classList.contains('toc-list')
    ).toBe(true);
    expect(container.querySelectorAll('[data-toc-link]')).toHaveLength(3);
    const intro = container.querySelector('[data-toc-target="intro"]');
    expect(intro?.classList.contains('toc-link')).toBe(true);
    expect(intro?.getAttribute('data-toc-level')).toBe('2');
    expect(intro?.hasAttribute('data-toc-index')).toBe(false);
    expect(
      container
        .querySelector('[data-toc-indicator]')
        ?.classList.contains('toc-indicator')
    ).toBe(true);
  });

  it('allows className overrides without changing data selectors', () => {
    const { container } = mount();

    toc = createToc({
      target: '#content',
      className: {
        toc: 'doc-toc',
        title: 'doc-toc-title',
        list: 'doc-toc-list',
        link: 'doc-toc-link',
        indicator: 'doc-indicator',
      },
    }).build();
    if (toc.element) container.appendChild(toc.element);

    const link = container.querySelector<HTMLElement>('[data-toc-link="1"]');
    expect(
      container
        .querySelector('[data-toc="root"]')
        ?.classList.contains('doc-toc')
    ).toBe(true);
    expect(link?.classList.contains('doc-toc-link')).toBe(true);
    expect(link?.getAttribute('data-toc-level')).toBe('3');
    expect(link?.classList.contains('toc-link')).toBe(false);
    expect(
      container
        .querySelector('[data-toc-indicator]')
        ?.classList.contains('doc-indicator')
    ).toBe(true);
  });

  it('renders translated title before the list when title is enabled', () => {
    const { container } = mount();

    toc = createToc({ target: '#content', title: true }).build();
    if (toc.element) container.appendChild(toc.element);

    const title = container.querySelector<HTMLElement>('[data-toc-title]');
    const list = container.querySelector<HTMLElement>('[data-toc-list]');
    expect(title?.classList.contains('toc-title')).toBe(true);
    expect(title?.textContent).toBe('On this page');
    expect(title?.nextElementSibling).toBe(list);
  });

  it('creates stable heading ids from text and appends suffixes for duplicates', () => {
    document.body.innerHTML = `
      <aside id="toc"></aside>
      <main id="content" class="j-content">
        <h2>Repeated Title</h2>
        <h2>Repeated Title</h2>
        <h3 id="custom">Custom</h3>
        <h3 id="custom">Custom Again</h3>
      </main>
    `;
    const container = document.querySelector<HTMLElement>('#toc');
    const target = document.querySelector<HTMLElement>('#content');
    if (!container || !target) throw new Error('Missing Toc fixture.');

    toc = createToc({ target }).build();
    if (toc.element) container.appendChild(toc.element);

    expect(toc.state.items.map((item) => item.id)).toEqual([
      'Repeated-Title',
      'Repeated-Title-1',
      'custom',
      'custom-1',
    ]);
    expect(
      Array.from(target.querySelectorAll('h2, h3')).map((heading) => heading.id)
    ).toEqual(['Repeated-Title', 'Repeated-Title-1', 'custom', 'custom-1']);
  });

  it('updates active item from heading positions and moves indicator', async () => {
    const { container, target } = mount();
    const headings = Array.from(target.querySelectorAll('h2, h3'));
    mockHeadingTop(headings[0], -20);
    mockHeadingTop(headings[1], 30);
    mockHeadingTop(headings[2], 120);

    toc = createToc({ target, offset: 40 }).build();
    if (toc.element) container.appendChild(toc.element);

    const links = container.querySelectorAll<HTMLElement>('[data-toc-link]');
    const list = container.querySelector<HTMLElement>('[data-toc-list]');
    if (!list) throw new Error('Missing Toc list.');
    mockLinkMetrics(links, 24);
    mockListMetrics(list, 72);
    window.dispatchEvent(new Event('scroll'));
    await tick();

    const indicator = container.querySelector<HTMLElement>(
      '[data-toc-indicator]'
    );
    expect(toc.state?.current.index).toBe(1);
    expect(links[1].getAttribute('aria-current')).toBe('location');
    expect(links[0].hasAttribute('aria-current')).toBe(false);
    expect(links[2].hasAttribute('aria-current')).toBe(false);
    expect(links[1].classList.contains('is-active')).toBe(false);
    expect(indicator?.hidden).toBe(false);
    expect(indicator?.style.height).toBe('12px');
    expect(indicator?.style.top).toBe('30px');
    expect(indicator?.style.width).toBe('2px');
    expect(indicator?.style.transitionDuration).toBe('0ms');
    expect(indicator?.style.transitionTimingFunction).toBe('ease-in-out');
  });

  it('applies configured indicator width and height ratio', async () => {
    const { container, target } = mount();
    const headings = Array.from(target.querySelectorAll('h2, h3'));
    mockHeadingTop(headings[0], -20);
    mockHeadingTop(headings[1], 30);
    mockHeadingTop(headings[2], 120);

    toc = createToc({
      target,
      offset: 40,
      indicatorWidth: '4px',
      indicatorHeightRatio: 10,
    }).build();
    if (toc.element) container.appendChild(toc.element);

    const links = container.querySelectorAll<HTMLElement>('[data-toc-link]');
    const list = container.querySelector<HTMLElement>('[data-toc-list]');
    if (!list) throw new Error('Missing Toc list.');
    mockLinkMetrics(links, 24);
    mockListMetrics(list, 72);
    window.dispatchEvent(new Event('scroll'));
    await tick();

    const indicator = container.querySelector<HTMLElement>(
      '[data-toc-indicator]'
    );
    expect(indicator?.style.width).toBe('4px');
    expect(indicator?.style.height).toBe('24px');
    expect(indicator?.style.top).toBe('24px');
  });

  it('validates indicatorHeightRatio range', () => {
    expect(() =>
      createToc({
        target: '#content',
        indicatorHeightRatio: 0,
      })
    ).toThrow();
    expect(() =>
      createToc({
        target: '#content',
        indicatorHeightRatio: 11,
      })
    ).toThrow();
  });

  it('updates only previous and next aria-current markers on distant jumps', async () => {
    const { container, target } = mountMany(10);
    const headings = Array.from(target.querySelectorAll('h2'));
    headings.forEach((heading, index) => {
      mockHeadingTop(heading, index === 0 ? -20 : 200 + index * 20);
    });

    toc = createToc({ target, offset: 40 }).build();
    if (toc.element) container.appendChild(toc.element);
    const links = container.querySelectorAll<HTMLElement>('[data-toc-link]');
    const list = container.querySelector<HTMLElement>('[data-toc-list]');
    if (!list) throw new Error('Missing Toc list.');
    mockLinkMetrics(links, 24);
    mockListMetrics(list, 240);
    await tick();
    expect(links[0].getAttribute('aria-current')).toBe('location');

    const changedIndexes = new Set<number>();
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        changedIndexes.add(
          Number((record.target as HTMLElement).dataset.tocLink)
        );
      }
    });
    links.forEach((link) => {
      observer.observe(link, {
        attributes: true,
        attributeFilter: ['aria-current'],
      });
    });

    links[8].dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );
    await tick();
    observer.disconnect();

    expect(changedIndexes).toEqual(new Set([0, 8]));
    expect(links[0].hasAttribute('aria-current')).toBe(false);
    expect(links[8].getAttribute('aria-current')).toBe('location');
    expect(
      Array.from(links).filter((link) => link.hasAttribute('aria-current'))
    ).toHaveLength(1);
    expect(
      container.querySelector<HTMLElement>('[data-toc-indicator]')?.style
        .transitionDuration
    ).toBe('960ms');
  });

  it('keeps the clicked lower target current during pending smooth scroll', async () => {
    const { container, target } = mountMany(8);
    const headings = Array.from(target.querySelectorAll('h2'));
    headings.forEach((heading, index) => {
      mockHeadingTop(heading, index === 0 ? -20 : 160 + index * 20);
    });

    toc = createToc({ target, offset: 40 }).build();
    if (toc.element) container.appendChild(toc.element);
    const links = container.querySelectorAll<HTMLElement>('[data-toc-link]');
    const list = container.querySelector<HTMLElement>('[data-toc-list]');
    if (!list) throw new Error('Missing Toc list.');
    mockLinkMetrics(links, 24);
    mockListMetrics(list, 192);
    await tick();
    expect(toc.state.current.index).toBe(0);

    const changedIndexes = new Set<number>();
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        changedIndexes.add(
          Number((record.target as HTMLElement).dataset.tocLink)
        );
      }
    });
    links.forEach((link) => {
      observer.observe(link, {
        attributes: true,
        attributeFilter: ['aria-current'],
      });
    });

    links[6].dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );
    await tick();

    mockHeadingTop(headings[5], 30);
    mockHeadingTop(headings[6], 80);
    mockScrollY(120);
    window.dispatchEvent(new Event('scroll'));
    await tick();
    observer.disconnect();

    expect(toc.state.current.index).toBe(6);
    expect(links[5].hasAttribute('aria-current')).toBe(false);
    expect(links[6].getAttribute('aria-current')).toBe('location');
    expect(changedIndexes).toEqual(new Set([0, 6]));
  });

  it('keeps the clicked upper target current during pending smooth scroll', async () => {
    const { container, target } = mountMany(8);
    const headings = Array.from(target.querySelectorAll('h2'));
    mockScrollY(600);
    headings.forEach((heading, index) => {
      const tops = [-600, -500, -400, -300, -200, -100, 20, 200];
      mockHeadingTop(heading, tops[index]);
    });

    toc = createToc({ target, offset: 40 }).build();
    if (toc.element) container.appendChild(toc.element);
    const links = container.querySelectorAll<HTMLElement>('[data-toc-link]');
    const list = container.querySelector<HTMLElement>('[data-toc-list]');
    if (!list) throw new Error('Missing Toc list.');
    mockLinkMetrics(links, 24);
    mockListMetrics(list, 192);
    await tick();
    expect(toc.state.current.index).toBe(6);

    const changedIndexes = new Set<number>();
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        changedIndexes.add(
          Number((record.target as HTMLElement).dataset.tocLink)
        );
      }
    });
    links.forEach((link) => {
      observer.observe(link, {
        attributes: true,
        attributeFilter: ['aria-current'],
      });
    });

    links[1].dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );
    await tick();

    mockHeadingTop(headings[1], -20);
    mockHeadingTop(headings[2], 30);
    mockHeadingTop(headings[3], 90);
    mockScrollY(300);
    window.dispatchEvent(new Event('scroll'));
    await tick();
    observer.disconnect();

    expect(toc.state.current.index).toBe(1);
    expect(links[1].getAttribute('aria-current')).toBe('location');
    expect(links[2].hasAttribute('aria-current')).toBe(false);
    expect(changedIndexes).toEqual(new Set([6, 1]));
  });

  it('delegates link clicks through data-toc-link', () => {
    const { container } = mount();
    const pushState = vi.spyOn(window.history, 'pushState');

    toc = createToc({ target: '#content', offset: 24 }).build();
    if (toc.element) container.appendChild(toc.element);
    const link = container.querySelector<HTMLElement>('[data-toc-link="1"]');
    if (!link) throw new Error('Missing Toc link.');
    link.appendChild(document.createElement('span'));
    link
      .querySelector('span')
      ?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );

    expect(window.scrollTo).toHaveBeenCalled();
    expect(pushState).toHaveBeenCalledWith(
      null,
      '',
      `#${toc.state?.items[1].id}`
    );
    expect(toc.state?.current.index).toBe(1);
  });

  it('updates rendered items when heading data changes through state', async () => {
    const { container, target } = mount();

    toc = createToc({ target }).build();
    if (toc.element) container.appendChild(toc.element);
    expect(container.querySelectorAll('[data-toc-link]')).toHaveLength(3);

    toc.setState({
      items: [
        { id: 'intro', text: 'Edited Intro', level: 2 },
        { id: 'details', text: 'Details', level: 3 },
        { id: 'summary', text: 'Summary', level: 2 },
        { id: 'live-heading', text: 'Live Heading', level: 3 },
      ],
    });
    await tick();

    expect(toc.state.items.map((item) => item.text)).toContain('Edited Intro');
    expect(toc.state.items.map((item) => item.id)).toContain('live-heading');
    expect(container.querySelectorAll('[data-toc-link]')).toHaveLength(4);
    expect(
      container.querySelector('[data-toc-target="live-heading"]')?.textContent
    ).toBe('Live Heading');
  });

  it('does not observe target DOM changes when reactive is disabled', async () => {
    const { container, target } = mount();

    toc = createToc({ target }).build();
    if (toc.element) container.appendChild(toc.element);
    expect(container.querySelectorAll('[data-toc-link]')).toHaveLength(3);

    const intro = target.querySelector<HTMLElement>('#intro');
    if (!intro) throw new Error('Missing intro heading.');
    intro.textContent = 'Edited Intro';

    const added = document.createElement('h3');
    added.id = 'manual-heading';
    added.textContent = 'Manual Heading';
    insert(target, added);

    await tick();

    expect(toc.state.items.map((item) => item.text)).not.toContain(
      'Edited Intro'
    );
    expect(toc.state.items.map((item) => item.id)).not.toContain(
      'manual-heading'
    );
    expect(container.querySelectorAll('[data-toc-link]')).toHaveLength(3);
  });

  it('observes target heading changes only when reactive is enabled', async () => {
    const { container, target } = mount();

    toc = createToc({ target, reactive: true }).build();
    if (toc.element) container.appendChild(toc.element);
    expect(container.querySelectorAll('[data-toc-link]')).toHaveLength(3);

    const added = document.createElement('h3');
    added.id = 'observed-heading';
    added.textContent = 'Observed Heading';
    insert(target, added);
    await tick();

    expect(toc.state.items.map((item) => item.id)).toContain(
      'observed-heading'
    );
    expect(container.querySelectorAll('[data-toc-link]')).toHaveLength(4);
  });
});

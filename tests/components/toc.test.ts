// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { Toc } from '../../src/components/toc.ts';

let toc: Toc | null = null;

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

beforeEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    configurable: true,
  });
  Object.defineProperty(window, 'requestAnimationFrame', {
    value: (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    },
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

    toc = new Toc({ container, target: '#content' }).build();

    expect(
      container.querySelector('[data-toc="root"]')?.classList.contains('j-toc')
    ).toBe(true);
    expect(
      container
        .querySelector('[data-toc-list="root"]')
        ?.classList.contains('toc-list')
    ).toBe(true);
    expect(container.querySelectorAll('[data-toc-index]')).toHaveLength(3);
    const intro = container.querySelector('[data-toc-target="intro"]');
    expect(intro?.classList.contains('toc-link')).toBe(true);
    expect(intro?.classList.contains('is-level-2')).toBe(true);
  });

  it('allows className overrides without changing data selectors', () => {
    const { container } = mount();

    toc = new Toc({
      container,
      target: '#content',
      className: {
        toc: 'doc-toc',
        list: 'doc-toc-list',
        link: 'doc-toc-link',
        active: 'doc-active',
        levelPrefix: 'doc-level-',
      },
    }).build();

    const link = container.querySelector<HTMLElement>('[data-toc-index="1"]');
    expect(
      container
        .querySelector('[data-toc="root"]')
        ?.classList.contains('doc-toc')
    ).toBe(true);
    expect(link?.classList.contains('doc-toc-link')).toBe(true);
    expect(link?.classList.contains('doc-level-3')).toBe(true);
    expect(link?.classList.contains('toc-link')).toBe(false);
  });

  it('updates active item from heading positions and keeps status data', () => {
    const { container, target } = mount();
    const headings = Array.from(target.querySelectorAll('h2, h3'));
    mockHeadingTop(headings[0], -20);
    mockHeadingTop(headings[1], 30);
    mockHeadingTop(headings[2], 120);

    toc = new Toc({ container, target, offset: 40 }).build();

    const links = container.querySelectorAll<HTMLElement>('[data-toc-index]');
    expect(toc.state?.current.index).toBe(1);
    expect(links[1].dataset.active).toBe('1');
    expect(links[1].classList.contains('is-active')).toBe(true);
  });

  it('delegates link clicks through data-toc-index', () => {
    const { container } = mount();
    const pushState = vi.spyOn(window.history, 'pushState');

    toc = new Toc({ container, target: '#content', offset: 24 }).build();
    const link = container.querySelector<HTMLElement>('[data-toc-index="1"]');
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
});

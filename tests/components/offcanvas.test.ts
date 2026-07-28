// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { Offcanvas, createOffcanvas } from '../../src/components/offcanvas.ts';

let offcanvas: Offcanvas | null = null;

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.className = '';
  document.body.style.overflow = '';
  vi.useFakeTimers();
});

afterEach(() => {
  offcanvas?.destroy();
  offcanvas = null;
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
  document.body.className = '';
  document.body.style.overflow = '';
});

describe('Offcanvas', () => {
  it('builds default classes and stable data markers', async () => {
    offcanvas = new Offcanvas({
      id: 'default-offcanvas',
      direction: 'right',
      content: '<button data-action="close">Close</button><p>Panel</p>',
    });

    expect(offcanvas.root?.classList.contains('j-offcanvas')).toBe(true);
    expect(offcanvas.root?.classList.contains('is-right')).toBe(true);
    expect(offcanvas.root?.getAttribute('data-offcanvas')).toBe('root');
    expect(
      offcanvas.root?.querySelector(
        '[data-offcanvas-content="default-offcanvas"]'
      )
    ).toBeTruthy();

    await offcanvas.show();
    vi.advanceTimersByTime(11);

    expect(document.body.contains(offcanvas.root)).toBe(true);
    expect(offcanvas.root?.classList.contains('is-active')).toBe(true);
    expect(document.querySelector('[data-offcanvas-overlay]')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('allows className overrides without changing data selectors', async () => {
    offcanvas = createOffcanvas({
      id: 'custom-offcanvas',
      overlay: false,
      direction: 'left',
      animation: 'push',
      content: 'Custom panel',
      className: {
        root: 'qa-offcanvas',
        content: 'qa-offcanvas-content',
        active: 'qa-active',
        left: 'qa-left',
        push: 'qa-push',
        pushBody: 'qa-push-body',
        pushLeft: 'qa-push-left',
      },
    });

    expect(offcanvas.root?.classList.contains('qa-offcanvas')).toBe(true);
    expect(offcanvas.root?.classList.contains('j-offcanvas')).toBe(false);
    expect(
      offcanvas.root?.querySelector(
        '[data-offcanvas-content="custom-offcanvas"]'
      )
    ).toBeTruthy();

    await offcanvas.show();
    vi.advanceTimersByTime(11);

    expect(offcanvas.root?.classList.contains('qa-active')).toBe(true);
    expect(document.body.classList.contains('qa-push-body')).toBe(true);
    expect(document.body.classList.contains('qa-push-left')).toBe(true);
  });

  it('closes by nested data-action, overlay and Escape', async () => {
    offcanvas = new Offcanvas({
      id: 'close-offcanvas',
      content:
        '<button data-action="close"><span data-testid="inner">Close</span></button>',
    });

    await offcanvas.show();
    vi.advanceTimersByTime(11);
    offcanvas.root
      ?.querySelector<HTMLElement>('[data-testid="inner"]')
      ?.click();
    expect(offcanvas.state.visible).toBe(false);

    await offcanvas.show();
    vi.advanceTimersByTime(11);
    document.querySelector<HTMLElement>('[data-offcanvas-overlay]')?.click();
    expect(offcanvas.state.visible).toBe(false);

    await offcanvas.show();
    vi.advanceTimersByTime(11);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(offcanvas.state.visible).toBe(false);
  });

  it('loads async content, caches it and respects ttl', async () => {
    let calls = 0;
    const load = vi.fn(async () => {
      calls += 1;
      return `Async ${calls}`;
    });

    offcanvas = new Offcanvas({
      id: 'async-offcanvas',
      overlay: false,
      cache: true,
      ttl: 1000,
      content: load,
    });

    await offcanvas.show();
    await Promise.resolve();
    expect(offcanvas.state.loading).toBe(false);
    expect(offcanvas.root?.textContent).toBe('Async 1');
    expect(load).toHaveBeenCalledTimes(1);

    await offcanvas.hide();
    vi.advanceTimersByTime(100);
    await offcanvas.show();
    expect(offcanvas.root?.textContent).toBe('Async 1');
    expect(load).toHaveBeenCalledTimes(1);

    await offcanvas.hide();
    vi.advanceTimersByTime(1001);
    await offcanvas.show();
    await Promise.resolve();
    expect(offcanvas.root?.textContent).toBe('Async 2');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('ignores async content resolved after hide', async () => {
    let resolveContent!: (value: string) => void;
    const pending = new Promise<string>((resolve) => {
      resolveContent = resolve;
    });

    offcanvas = new Offcanvas({
      id: 'stale-offcanvas',
      overlay: false,
      content: async () => pending,
    });

    const showing = offcanvas.show();
    await Promise.resolve();
    expect(offcanvas.state.loading).toBe(true);

    await offcanvas.hide();
    resolveContent('Late content');
    await showing;

    expect(offcanvas.state.loading).toBe(false);
    expect(offcanvas.root?.textContent).not.toBe('Late content');
  });
});

// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { createOffcanvas } from '../src/components/offcanvas.ts';

type OffcanvasInstance = ReturnType<typeof createOffcanvas>;

let offcanvas: OffcanvasInstance | null = null;

function mount(instance: OffcanvasInstance): OffcanvasInstance {
  instance.build();
  if (!instance.dom.root) throw new Error('Offcanvas did not build a root.');
  return instance;
}

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

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
  it('requires build before show and hide', async () => {
    offcanvas = createOffcanvas({
      id: 'unbuilt-offcanvas',
      content: 'Unbuilt',
    });

    await expect(offcanvas.show()).rejects.toThrow('call build() first');
    await expect(offcanvas.hide()).rejects.toThrow('call build() first');
  });

  it('builds detached DOM and inserts into body on show', async () => {
    offcanvas = createOffcanvas({
      id: 'default-offcanvas',
      direction: 'right',
      content: '<button data-action="close">Close</button><p>Panel</p>',
    });

    expect(offcanvas.dom.root).toBeNull();

    offcanvas.build();
    expect(document.body.contains(offcanvas.dom.root)).toBe(false);
    if (!offcanvas.dom.root) throw new Error('Expected Offcanvas root.');

    expect(offcanvas.dom.root.getAttribute('data-offcanvas')).toBe('root');
    expect(offcanvas.dom.root.classList.contains('j-offcanvas')).toBe(true);
    expect(offcanvas.dom.root.getAttribute('data-direction')).toBe('right');
    expect(
      offcanvas.dom.root.querySelector(
        '[data-offcanvas-content="default-offcanvas"]'
      )
    ).toBeTruthy();
    expect(offcanvas.dom.overlay?.hidden).toBe(true);

    await offcanvas.show();
    vi.advanceTimersByTime(11);

    expect(document.body.contains(offcanvas.dom.root)).toBe(true);
    expect(document.body.contains(offcanvas.dom.overlay)).toBe(true);
    expect(offcanvas.dom.root.getAttribute('aria-expanded')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');

    await offcanvas.hide();
    vi.advanceTimersByTime(101);
    expect(document.body.contains(offcanvas.dom.root)).toBe(false);
    expect(document.body.contains(offcanvas.dom.overlay)).toBe(false);
  });

  it('allows className overrides without changing data selectors', async () => {
    offcanvas = mount(
      createOffcanvas({
        id: 'custom-offcanvas',
        overlay: false,
        direction: 'left',
        animate: 'push',
        content: 'Custom panel',
        className: {
          root: 'qa-offcanvas',
          content: 'qa-offcanvas-content',
        },
      })
    );

    expect(offcanvas.dom.root?.classList.contains('qa-offcanvas')).toBe(true);
    expect(offcanvas.dom.root?.classList.contains('j-offcanvas')).toBe(false);
    expect(
      offcanvas.dom.root?.querySelector(
        '[data-offcanvas-content="custom-offcanvas"]'
      )
    ).toBeTruthy();

    await offcanvas.show();
    vi.advanceTimersByTime(11);

    expect(offcanvas.dom.root?.getAttribute('aria-expanded')).toBe('true');
    expect(offcanvas.dom.root?.getAttribute('data-animate')).toBe('push');
    expect(document.body.className).toBe('');
  });

  it('keeps DOM mounted when reopened before hide removal finishes', async () => {
    offcanvas = mount(
      createOffcanvas({
        id: 'reopen-offcanvas',
        content: 'Quick reopen',
      })
    );

    await offcanvas.show();
    vi.advanceTimersByTime(11);
    await offcanvas.hide();

    expect(document.body.contains(offcanvas.dom.root)).toBe(true);
    expect(offcanvas.dom.root?.getAttribute('aria-expanded')).toBe('false');

    await offcanvas.show();
    vi.advanceTimersByTime(101);

    expect(document.body.contains(offcanvas.dom.root)).toBe(true);
    expect(document.body.contains(offcanvas.dom.overlay)).toBe(true);
    expect(offcanvas.dom.root?.getAttribute('aria-expanded')).toBe('true');
  });

  it('can skip body overflow control', async () => {
    document.body.style.overflow = 'auto';
    offcanvas = mount(
      createOffcanvas({
        id: 'body-overflow-offcanvas',
        bodyOverflow: false,
        content: 'No body lock',
      })
    );

    await offcanvas.show();
    vi.advanceTimersByTime(11);
    expect(document.body.style.overflow).toBe('auto');

    await offcanvas.hide();
    vi.advanceTimersByTime(101);
    expect(document.body.style.overflow).toBe('auto');

    offcanvas.destroy();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('closes by nested data-action, overlay and Escape', async () => {
    offcanvas = mount(
      createOffcanvas({
        id: 'close-offcanvas',
        content:
          '<button data-action="close"><span data-testid="inner">Close</span></button>',
      })
    );

    await offcanvas.show();
    vi.advanceTimersByTime(11);
    offcanvas.dom.root
      ?.querySelector<HTMLElement>('[data-testid="inner"]')
      ?.click();
    expect(offcanvas.state.visible).toBe(false);

    await offcanvas.show();
    vi.advanceTimersByTime(11);
    offcanvas.dom.overlay?.click();
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

    offcanvas = mount(
      createOffcanvas({
        id: 'async-offcanvas',
        overlay: false,
        cache: true,
        ttl: 1000,
        content: load,
      })
    );

    await offcanvas.show();
    await tick();
    expect(offcanvas.state.loading).toBe(false);
    expect(offcanvas.dom.content?.textContent).toBe('Async 1');
    expect(load).toHaveBeenCalledTimes(1);

    await offcanvas.hide();
    vi.advanceTimersByTime(100);
    await offcanvas.show();
    expect(offcanvas.dom.content?.textContent).toBe('Async 1');
    expect(load).toHaveBeenCalledTimes(1);

    await offcanvas.hide();
    vi.advanceTimersByTime(1001);
    await offcanvas.show();
    await tick();
    expect(offcanvas.dom.content?.textContent).toBe('Async 2');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('refreshes rendered content from state', async () => {
    offcanvas = mount(
      createOffcanvas({
        id: 'state-content-offcanvas',
        overlay: false,
        content: 'Initial',
      })
    );

    expect(offcanvas.dom.content?.textContent).toBe('Initial');

    offcanvas.setState({ content: 'Updated' });
    await tick();
    expect(offcanvas.dom.content?.textContent).toBe('Updated');

    offcanvas.state.content = 'Direct';
    await tick();
    expect(offcanvas.dom.content?.textContent).toBe('Direct');
  });

  it('ignores async content resolved after hide', async () => {
    let resolveContent!: (value: string) => void;
    const pending = new Promise<string>((resolve) => {
      resolveContent = resolve;
    });

    offcanvas = mount(
      createOffcanvas({
        id: 'stale-offcanvas',
        overlay: false,
        content: async () => pending,
      })
    );

    const showing = offcanvas.show();
    await tick();
    expect(offcanvas.state.loading).toBe(true);

    await offcanvas.hide();
    resolveContent('Late content');
    await showing;

    expect(offcanvas.state.loading).toBe(false);
    expect(offcanvas.dom.content?.textContent).not.toBe('Late content');
  });
});

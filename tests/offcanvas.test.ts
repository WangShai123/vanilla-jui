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

import { createOffcanvas } from '../src/components/offcanvas.ts';

type OffcanvasInstance = ReturnType<typeof createOffcanvas>;

let offcanvas: OffcanvasInstance | null = null;

function mount(instance: OffcanvasInstance): OffcanvasInstance {
  instance.build();
  if (!instance.element) throw new Error('Offcanvas did not build a root.');
  return instance;
}

function overlay(instance: OffcanvasInstance): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-offcanvas-overlay="${instance.props.id}"]`
  );
}

function content(instance: OffcanvasInstance): HTMLElement | null {
  return (
    instance.element?.querySelector<HTMLElement>('[data-offcanvas-content]') ||
    null
  );
}

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function mockTransition(element: HTMLElement): {
  animation: Animation;
  animate: ReturnType<typeof vi.fn>;
  setFinished: (finished: Promise<void>) => void;
} {
  let finished = Promise.resolve();
  const animation = {
    effect: { getComputedTiming: () => ({ endTime: 300 }) },
    get finished() {
      return finished;
    },
    currentTime: null,
    playbackRate: 1,
    pause: vi.fn(),
    play: vi.fn(),
    cancel: vi.fn(),
  } as unknown as Animation;
  const animate = vi.fn(() => animation);
  Object.defineProperty(element, 'animate', {
    configurable: true,
    value: animate,
  });
  return {
    animation,
    animate,
    setFinished(next) {
      finished = next;
    },
  };
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
      content: [
        jsx('button', {
          'data-action': 'close',
          children: 'Close',
        }),
        jsx('p', {
          children: 'Panel',
        }),
      ],
    });

    expect(offcanvas.element).toBeNull();

    offcanvas.build();
    expect(document.body.contains(offcanvas.element)).toBe(false);
    if (!offcanvas.element) throw new Error('Expected Offcanvas root.');

    expect(offcanvas.element.getAttribute('data-offcanvas')).toBe('root');
    expect(offcanvas.element.classList.contains('j-offcanvas')).toBe(true);
    expect(offcanvas.element.getAttribute('data-direction')).toBe('right');
    expect(
      offcanvas.element.querySelector(
        '[data-offcanvas-content="default-offcanvas"]'
      )
    ).toBeTruthy();
    expect(overlay(offcanvas)).toBeNull();

    await offcanvas.show();
    vi.advanceTimersByTime(11);

    expect(document.body.contains(offcanvas.element)).toBe(true);
    expect(document.body.contains(overlay(offcanvas))).toBe(true);
    expect(offcanvas.element.getAttribute('aria-expanded')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');

    await offcanvas.hide();
    expect(document.body.contains(offcanvas.element)).toBe(false);
    expect(document.body.contains(overlay(offcanvas))).toBe(false);
  });

  it('unmounts and calls onHidden after active Motion settles', async () => {
    const onHidden = vi.fn();
    offcanvas = mount(
      createOffcanvas({
        id: 'hidden-lifecycle-offcanvas',
        overlay: false,
        content: 'Lifecycle panel',
        className: { root: 'qa-motion-offcanvas' },
        onHidden,
      })
    );

    if (!offcanvas.element) throw new Error('Expected Offcanvas root.');
    const motion = mockTransition(offcanvas.element);
    await offcanvas.show();
    expect(offcanvas.element.className).toBe('qa-motion-offcanvas');
    expect(motion.animate).toHaveBeenCalledOnce();
    let finishMotion!: () => void;
    const finished = new Promise<void>((resolve) => {
      finishMotion = resolve;
    });
    motion.setFinished(finished);

    const hiding = offcanvas.hide();
    await tick();

    expect(document.body.contains(offcanvas.element)).toBe(true);
    expect(onHidden).not.toHaveBeenCalled();

    finishMotion();
    await hiding;
    expect(document.body.contains(offcanvas.element)).toBe(false);
    expect(onHidden).toHaveBeenCalledWith(offcanvas);
    expect(motion.animate).toHaveBeenCalledTimes(2);
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

    expect(offcanvas.element?.classList.contains('qa-offcanvas')).toBe(true);
    expect(offcanvas.element?.classList.contains('j-offcanvas')).toBe(false);
    expect(
      offcanvas.element?.querySelector(
        '[data-offcanvas-content="custom-offcanvas"]'
      )
    ).toBeTruthy();

    await offcanvas.show();
    vi.advanceTimersByTime(11);

    expect(offcanvas.element?.getAttribute('aria-expanded')).toBe('true');
    expect(offcanvas.element?.getAttribute('data-animate')).toBe('push');
    expect(document.body.className).toBe('');
  });

  it('keeps DOM mounted when reopened before hide removal finishes', async () => {
    offcanvas = mount(
      createOffcanvas({
        id: 'reopen-offcanvas',
        overlay: false,
        content: 'Quick reopen',
      })
    );

    if (!offcanvas.element) throw new Error('Expected Offcanvas root.');
    const motion = mockTransition(offcanvas.element);
    await offcanvas.show();
    let finishMotion!: () => void;
    const finished = new Promise<void>((resolve) => {
      finishMotion = resolve;
    });
    motion.setFinished(finished);

    const hiding = offcanvas.hide();
    await tick();

    expect(document.body.contains(offcanvas.element)).toBe(true);
    expect(offcanvas.element?.getAttribute('aria-expanded')).toBe('false');
    expect(offcanvas.element?.getAttribute('data-mount')).toBe('false');

    motion.setFinished(Promise.resolve());
    await offcanvas.show();
    finishMotion();
    await hiding;

    expect(document.body.contains(offcanvas.element)).toBe(true);
    expect(overlay(offcanvas)).toBeNull();
    expect(offcanvas.element?.getAttribute('aria-expanded')).toBe('true');
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
    expect(document.body.style.overflow).toBe('auto');

    offcanvas.destroy();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('keeps body overflow locked until every visible offcanvas is hidden', async () => {
    document.body.style.overflow = 'auto';
    const first = mount(
      createOffcanvas({
        id: 'first-scroll-offcanvas',
        overlay: false,
        content: 'First',
      })
    );
    const second = mount(
      createOffcanvas({
        id: 'second-scroll-offcanvas',
        overlay: false,
        content: 'Second',
      })
    );
    offcanvas = second;

    await first.show();
    await second.show();
    expect(document.body.style.overflow).toBe('hidden');

    await first.hide();
    expect(document.body.style.overflow).toBe('hidden');

    await second.hide();
    expect(document.body.style.overflow).toBe('auto');

    first.destroy();
  });

  it('closes by nested data-action, overlay and Escape', async () => {
    offcanvas = mount(
      createOffcanvas({
        id: 'close-offcanvas',
        content: jsx('button', {
          'data-action': 'close',
          children: jsx('span', {
            'data-testid': 'inner',
            children: 'Close',
          }),
        }),
      })
    );

    await offcanvas.show();
    vi.advanceTimersByTime(11);
    offcanvas.element
      ?.querySelector<HTMLElement>('[data-testid="inner"]')
      ?.click();
    expect(offcanvas.state.visible).toBe(false);

    await offcanvas.show();
    vi.advanceTimersByTime(11);
    overlay(offcanvas)?.click();
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
    expect(content(offcanvas)?.textContent).toBe('Async 1');
    expect(load).toHaveBeenCalledTimes(1);

    await offcanvas.hide();
    vi.advanceTimersByTime(100);
    await offcanvas.show();
    expect(content(offcanvas)?.textContent).toBe('Async 1');
    expect(load).toHaveBeenCalledTimes(1);

    await offcanvas.hide();
    vi.advanceTimersByTime(1001);
    await offcanvas.show();
    await tick();
    expect(content(offcanvas)?.textContent).toBe('Async 2');
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

    expect(content(offcanvas)?.textContent).toBe('Initial');

    offcanvas.setState({ content: 'Updated' });
    await tick();
    expect(content(offcanvas)?.textContent).toBe('Updated');

    offcanvas.state.content = 'Direct';
    await tick();
    expect(content(offcanvas)?.textContent).toBe('Direct');
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
    expect(content(offcanvas)?.textContent).not.toBe('Late content');
  });
});

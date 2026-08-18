// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { createParabola } from '../src/primitives/parabola.ts';

let instances: Array<ReturnType<typeof createParabola>> = [];

function mount(): { from: HTMLElement; to: HTMLElement } {
  document.body.innerHTML = `
    <button id="from">Add</button>
    <div id="cart"></div>
  `;
  const from = document.querySelector<HTMLElement>('#from');
  const to = document.querySelector<HTMLElement>('#cart');
  if (!from || !to) throw new Error('Missing Parabola fixture.');
  mockRect(from, { left: 10, top: 20, width: 100, height: 50 });
  mockRect(to, { left: 300, top: 120, width: 40, height: 40 });
  return { from, to };
}

function mockRect(
  element: HTMLElement,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
): void {
  element.getBoundingClientRect = () =>
    ({
      ...rect,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }) as DOMRect;
}

function raf(time: number): void {
  const request = window.requestAnimationFrame as unknown as ReturnType<
    typeof vi.fn
  >;
  const callback = request.mock.calls[request.mock.calls.length - 1]?.[0] as
    | FrameRequestCallback
    | undefined;
  callback?.(time);
}

function balls(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-parabola="ball"]')];
}

beforeEach(() => {
  vi.useFakeTimers();
  let animationFrameId = 0;
  Object.defineProperty(window, 'requestAnimationFrame', {
    value: vi.fn(() => {
      animationFrameId += 1;
      return animationFrameId;
    }),
    configurable: true,
  });
  Object.defineProperty(window, 'cancelAnimationFrame', {
    value: vi.fn(),
    configurable: true,
  });
  vi.spyOn(performance, 'now').mockReturnValue(0);
});

afterEach(() => {
  for (const instance of instances) instance.destroy();
  instances = [];
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Parabola', () => {
  it('does not create DOM during instantiation', () => {
    const { from, to } = mount();
    const parabola = createParabola({ from, to });
    instances.push(parabola);

    expect(parabola.element).toBeNull();
    expect(document.querySelector('[data-parabola="root"]')).toBeNull();
    expect(balls()).toHaveLength(0);
    expect(parabola.runtime.destroyed).toBe(false);
  });

  it('produces a default ball when show is called', async () => {
    const { from, to } = mount();
    const parabola = createParabola({ from, to });
    instances.push(parabola);

    const started = parabola.show();
    vi.runOnlyPendingTimers();
    await expect(started).resolves.toBe(true);

    const [ball] = balls();
    expect(ball?.parentElement).toBe(parabola.element);
    expect(ball?.classList.contains('parabola-ball')).toBe(true);
    expect(ball?.style.backgroundColor).toBe('var(--tone-solid)');
    expect(ball?.style.width).toBe('12px');
  });

  it('allows className and ball overrides', async () => {
    const { from, to } = mount();
    const parabola = createParabola({
      from,
      to,
      ball: { color: 'rgb(255, 0, 0)', size: '16px' },
      className: { ball: 'cart-fly-ball' },
    });
    instances.push(parabola);

    const started = parabola.show();
    vi.runOnlyPendingTimers();
    await expect(started).resolves.toBe(true);

    const [ball] = balls();
    expect(ball?.classList.contains('cart-fly-ball')).toBe(true);
    expect(ball?.classList.contains('parabola-ball')).toBe(false);
    expect(ball?.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(ball?.style.width).toBe('16px');
  });

  it('starts from the configured direction and calls onShow', async () => {
    const { from, to } = mount();
    const onShow = vi.fn();
    const parabola = createParabola({
      from,
      to,
      direction: 'top-right',
      onShow,
    });
    instances.push(parabola);

    const started = parabola.show();
    vi.runOnlyPendingTimers();
    await expect(started).resolves.toBe(true);

    expect(onShow).toHaveBeenCalledWith(parabola);
    const [ball] = balls();
    expect(ball?.style.left).toBe('90px');
    expect(ball?.style.top).toBe('30px');
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('returns false without destroying when endpoints are missing', async () => {
    mount();
    const onHidden = vi.fn();
    const parabola = createParabola({
      from: '#missing',
      to: '#cart',
      onHidden,
    });
    instances.push(parabola);

    const started = parabola.show();
    vi.runOnlyPendingTimers();
    await expect(started).resolves.toBe(false);

    expect(parabola.runtime.destroyed).toBe(false);
    expect(parabola.element).toBeNull();
    expect(document.querySelector('[data-parabola="root"]')).toBeNull();
    expect(balls()).toHaveLength(0);
    expect(onHidden).not.toHaveBeenCalled();
  });

  it('keeps showDelay timers isolated per instance', async () => {
    const { from, to } = mount();
    const firstShow = vi.fn();
    const secondShow = vi.fn();
    const first = createParabola({
      from,
      to,
      showDelay: 20,
      onShow: firstShow,
    });
    const second = createParabola({
      from,
      to,
      showDelay: 20,
      onShow: secondShow,
    });
    instances.push(first, second);

    const firstStarted = first.show();
    const secondStarted = second.show();
    vi.advanceTimersByTime(20);

    await expect(firstStarted).resolves.toBe(true);
    await expect(secondStarted).resolves.toBe(true);
    expect(firstShow).toHaveBeenCalledTimes(1);
    expect(secondShow).toHaveBeenCalledTimes(1);
  });

  it('produces an independent ball for every show call', async () => {
    const { from, to } = mount();
    const onShow = vi.fn();
    const parabola = createParabola({ from, to, onShow });
    instances.push(parabola);

    const first = parabola.show();
    const second = parabola.show();
    vi.runOnlyPendingTimers();

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
    expect(onShow).toHaveBeenCalledTimes(2);
    expect(balls()).toHaveLength(2);
  });

  it('removes each ball after its animation completes without destroying the instance', async () => {
    const { from, to } = mount();
    const onShow = vi.fn();
    const onHidden = vi.fn();
    const parabola = createParabola({ from, to, onShow, onHidden });
    instances.push(parabola);

    const started = parabola.show();
    vi.runOnlyPendingTimers();
    await expect(started).resolves.toBe(true);

    raf(900);

    expect(parabola.runtime.destroyed).toBe(false);
    expect(parabola.element).toBeNull();
    expect(document.querySelector('[data-parabola="root"]')).toBeNull();
    expect(balls()).toHaveLength(0);
    expect(onHidden).toHaveBeenCalledWith(parabola);

    const replayed = parabola.show();
    vi.runOnlyPendingTimers();
    await expect(replayed).resolves.toBe(true);
    expect(onShow).toHaveBeenCalledTimes(2);
    expect(balls()).toHaveLength(1);
  });

  it('destroy cancels active animations and removes active balls', async () => {
    const { from, to } = mount();
    const parabola = createParabola({ from, to });
    instances.push(parabola);

    const started = parabola.show();
    vi.runOnlyPendingTimers();
    await expect(started).resolves.toBe(true);
    expect(balls()).toHaveLength(1);

    parabola.destroy();

    expect(parabola.runtime.destroyed).toBe(true);
    expect(balls()).toHaveLength(0);
    expect(parabola.element).toBeNull();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    await expect(parabola.show()).resolves.toBe(false);
  });
});

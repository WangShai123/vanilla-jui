// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { Parabola, createParabola } from '../../src/components/parabola.ts';

let instances: Parabola[] = [];

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
  const callback = request.mock.calls.at(-1)?.[0] as
    | FrameRequestCallback
    | undefined;
  callback?.(time);
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, 'requestAnimationFrame', {
    value: vi.fn(() => 1),
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
  it('creates a default ball with data marker and default styles', () => {
    const { from, to } = mount();
    const parabola = createParabola({ from, to });
    instances.push(parabola);

    const ball = document.querySelector<HTMLElement>('[data-parabola="ball"]');
    expect(ball).toBe(parabola._ball);
    expect(ball?.classList.contains('parabola-ball')).toBe(true);
    expect(ball?.style.backgroundColor).toBe('var(--primary, #3e63dd)');
    expect(ball?.style.width).toBe('10px');
    expect(parabola.hidden).toBe(false);
  });

  it('allows className and ball overrides', () => {
    const { from, to } = mount();
    const parabola = new Parabola({
      from,
      to,
      ball: { color: 'rgb(255, 0, 0)', size: '16px' },
      className: { ball: 'cart-fly-ball' },
    });
    instances.push(parabola);

    const ball = document.querySelector<HTMLElement>('[data-parabola="ball"]');
    expect(ball?.classList.contains('cart-fly-ball')).toBe(true);
    expect(ball?.classList.contains('parabola-ball')).toBe(false);
    expect(ball?.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(ball?.style.width).toBe('16px');
  });

  it('starts from the configured direction and calls onShow', async () => {
    const { from, to } = mount();
    const onShow = vi.fn();
    const parabola = new Parabola({
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
    expect(parabola._ball?.style.left).toBe('90px');
    expect(parabola._ball?.style.top).toBe('30px');
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('destroys and returns false when endpoints are missing', async () => {
    mount();
    const onHidden = vi.fn();
    const parabola = new Parabola({
      from: '#missing',
      to: '#cart',
      onHidden,
    });
    instances.push(parabola);

    const started = parabola.show();
    vi.runOnlyPendingTimers();
    await expect(started).resolves.toBe(false);

    expect(parabola.hidden).toBe(true);
    expect(document.querySelector('[data-parabola="ball"]')).toBeNull();
    expect(onHidden).toHaveBeenCalledWith(parabola);
  });

  it('keeps showDelay timers isolated per instance', async () => {
    const { from, to } = mount();
    const firstShow = vi.fn();
    const secondShow = vi.fn();
    const first = new Parabola({ from, to, showDelay: 20, onShow: firstShow });
    const second = new Parabola({
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

  it('auto destroys when animation completes', async () => {
    const { from, to } = mount();
    const onHidden = vi.fn();
    const parabola = new Parabola({ from, to, onHidden });
    instances.push(parabola);

    const started = parabola.start();
    vi.runOnlyPendingTimers();
    await expect(started).resolves.toBe(true);

    raf(900);

    expect(parabola.hidden).toBe(true);
    expect(parabola._ball).toBeNull();
    expect(document.querySelector('[data-parabola="ball"]')).toBeNull();
    expect(onHidden).toHaveBeenCalledWith(parabola);
  });
});

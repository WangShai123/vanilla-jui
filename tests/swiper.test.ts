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

import { createSwiper } from '../src/components/swiper.ts';

type SwiperInstance = ReturnType<typeof createSwiper>;

let swiper: SwiperInstance | null = null;

const SLIDES = [
  { children: 'Slide 1', title: 'One' },
  { children: 'Slide 2', title: 'Two' },
  { children: 'Slide 3', title: 'Three' },
];

function app(): HTMLElement {
  const element = document.querySelector<HTMLElement>('#app');
  if (!element) throw new Error('Missing #app fixture.');
  return element;
}

function setWidth(element: HTMLElement, width = 320): void {
  Object.defineProperty(element, 'clientWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(element, 'offsetWidth', {
    configurable: true,
    value: width,
  });
}

function mount(instance: SwiperInstance): SwiperInstance {
  instance.build();
  if (!instance.element) throw new Error('Swiper did not build a root.');
  insert(app(), instance.element);
  setWidth(instance.element);
  vi.advanceTimersByTime(16);
  return instance;
}

function wrapper(instance: SwiperInstance): HTMLElement | null {
  return (
    instance.element?.querySelector<HTMLElement>('[data-swiper-wrapper]') ||
    null
  );
}

function slides(instance: SwiperInstance): HTMLElement[] {
  return Array.from(
    instance.element?.querySelectorAll<HTMLElement>('[data-swiper-slide]') || []
  );
}

function bullets(instance: SwiperInstance): HTMLButtonElement[] {
  return Array.from(
    instance.element?.querySelectorAll<HTMLButtonElement>(
      '[data-swiper-bullet]'
    ) || []
  );
}

function navigation(
  instance: SwiperInstance,
  direction: 'prev' | 'next'
): HTMLButtonElement | null {
  return (
    instance.element?.querySelector<HTMLButtonElement>(
      `[data-action="${direction}"]`
    ) || null
  );
}

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function flushMountRefresh(): Promise<void> {
  vi.advanceTimersByTime(16);
  await tick();
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  vi.useFakeTimers();
});

afterEach(() => {
  swiper?.destroy();
  swiper = null;
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('Swiper', () => {
  it('builds dynamic DOM without mounting automatically', () => {
    swiper = createSwiper({
      id: 'banner-swiper',
      data: SLIDES,
      autoplay: false,
    });

    expect(swiper.element).toBeNull();

    swiper.build();
    expect(swiper.element?.id).toBe('banner-swiper');
    expect(swiper.element?.classList.contains('j-swiper')).toBe(true);
    expect(swiper.element?.getAttribute('data-swiper')).toBe('root');
    expect(app().contains(swiper.element)).toBe(false);

    if (!swiper.element) throw new Error('Expected Swiper root.');
    insert(app(), swiper.element);
    setWidth(swiper.element);
    vi.advanceTimersByTime(16);

    expect(wrapper(swiper)?.hasAttribute('data-swiper-wrapper')).toBe(true);
    expect(slides(swiper)).toHaveLength(5);
    expect(
      slides(swiper).every((slide) => slide.hasAttribute('data-swiper-slide'))
    ).toBe(true);
    expect(
      swiper.element?.querySelector('[data-swiper-pagination]')
    ).toBeTruthy();
    expect(bullets(swiper)).toHaveLength(3);
    expect(navigation(swiper, 'prev')?.dataset.action).toBe('prev');
    expect(navigation(swiper, 'next')?.dataset.action).toBe('next');
  });

  it('loads the current and adjacent lazy images without empty src values', () => {
    swiper = mount(
      createSwiper({
        autoplay: false,
        data: [
          { image: '/one.jpg', title: 'One' },
          { image: '/two.jpg', title: 'Two' },
          { image: '/three.jpg', title: 'Three' },
        ],
      })
    );

    const images = Array.from(
      swiper.element?.querySelectorAll<HTMLImageElement>('img[data-lazy]') || []
    );
    expect(images).toHaveLength(5);
    expect(images.filter((image) => image.hasAttribute('src'))).toHaveLength(3);
    expect(images.every((image) => image.getAttribute('src') !== '')).toBe(
      true
    );
    expect(
      images.filter((image) => image.dataset.status === 'loading')
    ).toHaveLength(3);
    expect(images.every((image) => !image.classList.contains('loading'))).toBe(
      true
    );
    expect(images.every((image) => !image.classList.contains('loaded'))).toBe(
      true
    );
  });

  it('uses data markers for navigation when className is customized', () => {
    swiper = mount(
      createSwiper({
        data: SLIDES,
        loop: false,
        autoplay: false,
        className: {
          root: 'qa-swiper',
          wrapper: 'qa-swiper-wrapper',
          slide: 'qa-swiper-slide',
          pagination: 'qa-swiper-pagination',
          indicator: 'qa-swiper-indicator',
          bullet: 'qa-swiper-bullet',
          navigation: 'qa-swiper-navigation',
          prev: 'qa-prev',
          next: 'qa-next',
        },
      })
    );

    expect(swiper.element?.classList.contains('qa-swiper')).toBe(true);
    expect(swiper.element?.classList.contains('j-swiper')).toBe(false);
    expect(swiper.element?.querySelector('.swiper-wrapper')).toBeNull();

    swiper.element
      ?.querySelector<HTMLButtonElement>('[data-action="next"]')
      ?.click();

    expect(swiper.state.index).toBe(1);
    expect(swiper.state.trackIndex).toBe(1);
    expect(bullets(swiper)[1]?.classList.contains('is-active')).toBe(true);
  });

  it('keeps state-mode interactions available after manual mount', async () => {
    swiper = createSwiper({
      data: SLIDES,
      autoplay: false,
    }).build();

    swiper.next();

    expect(swiper.state.width).toBe(0);
    expect(swiper.state.animating).toBe(false);
    expect(swiper.state.index).toBe(0);

    if (!swiper.element) throw new Error('Expected Swiper root.');
    insert(app(), swiper.element);
    setWidth(swiper.element);
    await flushMountRefresh();

    expect(swiper.state.width).toBe(320);

    navigation(swiper, 'next')?.click();

    expect(swiper.state.index).toBe(1);
    expect(swiper.state.trackIndex).toBe(2);
  });

  it('starts state-mode autoplay only after layout is available', async () => {
    swiper = createSwiper({
      data: SLIDES,
      delay: 40,
    }).build();

    vi.advanceTimersByTime(80);
    expect(swiper.state.index).toBe(0);

    if (!swiper.element) throw new Error('Expected Swiper root.');
    insert(app(), swiper.element);
    setWidth(swiper.element);
    await flushMountRefresh();

    vi.advanceTimersByTime(40);

    expect(swiper.state.index).toBe(1);
    expect(swiper.state.trackIndex).toBe(2);
  });

  it('updates dynamic slides when state data changes through setState', async () => {
    swiper = mount(
      createSwiper({
        data: SLIDES,
        autoplay: false,
      })
    );

    swiper.slideTo(2);
    expect(swiper.realIndex).toBe(2);

    swiper.setState({
      data: [{ children: 'Only slide' }],
    });
    await tick();

    expect(swiper.realCount).toBe(1);
    expect(bullets(swiper)).toHaveLength(1);
    expect(slides(swiper)).toHaveLength(1);
    expect(swiper.state.index).toBe(0);
    expect(swiper.element?.textContent).toContain('Only slide');
  });

  it('updates dynamic slides when state data is assigned directly', async () => {
    swiper = mount(
      createSwiper({
        data: [],
        autoplay: false,
      })
    );

    expect(swiper.realCount).toBe(0);

    swiper.state.data = [{ children: 'Direct 1' }, { children: 'Direct 2' }];
    await tick();

    expect(swiper.realCount).toBe(2);
    expect(bullets(swiper)).toHaveLength(2);
    expect(swiper.element?.textContent).toContain('Direct 2');
  });

  it('reuses unchanged slide nodes and content when state data is pushed or spliced', async () => {
    const calls = new Map<string, number>();
    const item = (name: string) => ({
      children: () => {
        calls.set(name, (calls.get(name) || 0) + 1);
        return name;
      },
    });
    swiper = mount(
      createSwiper({
        data: [item('one'), item('two'), item('three')],
        autoplay: false,
        loop: false,
      })
    );

    const before = slides(swiper);
    expect(Object.fromEntries(calls)).toEqual({
      one: 1,
      two: 1,
      three: 1,
    });

    swiper.state.data.push(item('four'));
    await tick();

    const afterPush = slides(swiper);
    expect(afterPush).toHaveLength(4);
    expect(afterPush[0]).toBe(before[0]);
    expect(afterPush[1]).toBe(before[1]);
    expect(afterPush[2]).toBe(before[2]);
    expect(Object.fromEntries(calls)).toEqual({
      one: 1,
      two: 1,
      three: 1,
      four: 1,
    });

    swiper.state.data.splice(1, 1);
    await tick();

    const afterRemove = slides(swiper);
    expect(afterRemove).toHaveLength(3);
    expect(afterRemove[0]).toBe(before[0]);
    expect(afterRemove[1]).toBe(before[2]);
    expect(afterRemove[2]).toBe(afterPush[3]);
    expect(Object.fromEntries(calls)).toEqual({
      one: 1,
      two: 1,
      three: 1,
      four: 1,
    });
  });

  it('keeps unchanged loop slide content stable when state data is pushed or spliced', async () => {
    const calls = new Map<string, number>();
    const item = (name: string) => ({
      children: () => {
        calls.set(name, (calls.get(name) || 0) + 1);
        return name;
      },
    });
    swiper = mount(
      createSwiper({
        data: [item('one'), item('two'), item('three')],
        autoplay: false,
      })
    );

    expect(Object.fromEntries(calls)).toEqual({
      one: 2,
      two: 1,
      three: 2,
    });

    swiper.state.data.push(item('four'));
    await tick();

    expect(Object.fromEntries(calls)).toEqual({
      one: 2,
      two: 1,
      three: 2,
      four: 2,
    });

    swiper.state.data.splice(1, 1);
    await tick();

    expect(Object.fromEntries(calls)).toEqual({
      one: 2,
      two: 1,
      three: 2,
      four: 2,
    });
  });

  it('loads data from a function and shows loading while pending', async () => {
    const loadData = vi.fn(
      () =>
        new Promise<typeof SLIDES>((resolve) => {
          setTimeout(() => resolve(SLIDES), 80);
        })
    );

    swiper = createSwiper({
      data: loadData,
      autoplay: false,
    }).build();

    if (!swiper.element) throw new Error('Expected Swiper root.');
    insert(app(), swiper.element);
    setWidth(swiper.element);
    vi.advanceTimersByTime(16);

    expect(loadData).toHaveBeenCalledTimes(1);
    expect(swiper.state.loading).toBe(true);
    expect(
      wrapper(swiper)?.querySelector('[data-swiper-loading]')
    ).toBeTruthy();
    expect(slides(swiper)).toHaveLength(0);

    vi.advanceTimersByTime(80);
    await tick();
    await tick();

    expect(swiper.state.loading).toBe(false);
    expect(swiper.state.data).toHaveLength(3);
    expect(swiper.realCount).toBe(3);
    expect(wrapper(swiper)?.querySelector('[data-swiper-loading]')).toBeNull();
    expect(slides(swiper)).toHaveLength(5);
    expect(bullets(swiper)).toHaveLength(3);
    expect(swiper.element?.textContent).toContain('Slide 3');
  });

  it('clears loading when a data function rejects', async () => {
    const error = new Error('Request failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    swiper = createSwiper({
      data: () => Promise.reject(error),
      autoplay: false,
    }).build();

    await tick();
    await tick();

    expect(swiper.state.loading).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('Swiper.data error:', error);
  });

  it('clears autoplay timer before destroy finishes', () => {
    swiper = mount(
      createSwiper({
        data: SLIDES,
        delay: 40,
      })
    );

    const nextSpy = vi.spyOn(swiper, 'next');

    swiper.destroy();

    expect(swiper.runtime.destroyed).toBe(true);

    expect(() => {
      vi.advanceTimersByTime(120);
    }).not.toThrow();
    expect(nextSpy).not.toHaveBeenCalled();
  });

  it('exposes factory-created instances with current controls', () => {
    swiper = createSwiper({
      data: SLIDES,
      autoplay: false,
      loop: false,
    }).build();

    expect(swiper.props.loop).toBe(false);
    expect(swiper.element?.getAttribute('data-swiper')).toBe('root');
    expect('refresh' in swiper).toBe(false);
    expect(typeof swiper.next).toBe('function');
    expect(typeof swiper.prev).toBe('function');
    expect(typeof swiper.setState).toBe('function');
  });
});

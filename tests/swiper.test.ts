// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

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
  app().appendChild(instance.element);
  setWidth(instance.element);
  instance.refresh();
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
    app().appendChild(swiper.element);
    setWidth(swiper.element);
    swiper.refresh();

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
  });

  it('binds an existing root by unique id', () => {
    app().innerHTML = `
      <section id="static-swiper" class="qa-shell">
        <div class="qa-track" data-swiper-wrapper>
          <div class="qa-slide" data-swiper-slide>Static 1</div>
          <div class="qa-slide" data-swiper-slide>Static 2</div>
        </div>
      </section>
    `;
    const root = document.getElementById('static-swiper');
    if (!(root instanceof HTMLElement)) {
      throw new Error('Expected static swiper root.');
    }
    setWidth(root);

    swiper = createSwiper({
      id: 'static-swiper',
      autoplay: false,
      loop: false,
      pagination: false,
      navigation: false,
    }).build();

    expect(swiper.element).toBe(root);
    expect(swiper.element?.getAttribute('data-swiper')).toBeNull();
    expect(slides(swiper)).toHaveLength(2);
    expect(wrapper(swiper)?.classList.contains('qa-track')).toBe(true);

    swiper.destroy();
    expect(document.getElementById('static-swiper')).toBe(root);
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
    app().appendChild(swiper.element);
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
    app().appendChild(swiper.element);
    setWidth(swiper.element);
    await flushMountRefresh();

    vi.advanceTimersByTime(40);

    expect(swiper.state.index).toBe(1);
    expect(swiper.state.trackIndex).toBe(2);
  });

  it('refreshes dynamic slides when state data changes through setState', async () => {
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

  it('refreshes dynamic slides when state data is assigned directly', async () => {
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
    expect(typeof swiper.refresh).toBe('function');
    expect(typeof swiper.next).toBe('function');
    expect(typeof swiper.prev).toBe('function');
    expect(typeof swiper.setState).toBe('function');
  });
});

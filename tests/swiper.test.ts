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
  if (!instance.dom.root) throw new Error('Swiper did not build a root.');
  app().appendChild(instance.dom.root);
  setWidth(instance.dom.root);
  instance.refresh();
  return instance;
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

    expect(swiper.dom.root).toBeNull();

    swiper.build();
    expect(swiper.dom.root?.id).toBe('banner-swiper');
    expect(swiper.dom.root?.classList.contains('j-swiper')).toBe(true);
    expect(swiper.dom.root?.getAttribute('data-swiper')).toBe('root');
    expect(app().contains(swiper.dom.root)).toBe(false);

    if (!swiper.dom.root) throw new Error('Expected Swiper root.');
    app().appendChild(swiper.dom.root);
    setWidth(swiper.dom.root);
    swiper.refresh();

    expect(swiper.dom.wrapper?.hasAttribute('data-swiper-wrapper')).toBe(true);
    expect(swiper.dom.slides).toHaveLength(5);
    expect(
      swiper.dom.slides.every((slide) =>
        slide.hasAttribute('data-swiper-slide')
      )
    ).toBe(true);
    expect(swiper.dom.pagination?.hasAttribute('data-swiper-pagination')).toBe(
      true
    );
    expect(swiper.dom.bullets).toHaveLength(3);
    expect(swiper.dom.prevButton?.dataset.action).toBe('prev');
    expect(swiper.dom.nextButton?.dataset.action).toBe('next');
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

    expect(swiper.dom.root).toBe(root);
    expect(swiper.dom.createdRoot).toBe(false);
    expect(swiper.dom.root?.getAttribute('data-swiper')).toBeNull();
    expect(swiper.dom.slides).toHaveLength(2);
    expect(swiper.dom.wrapper?.classList.contains('qa-track')).toBe(true);

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

    expect(swiper.dom.root?.classList.contains('qa-swiper')).toBe(true);
    expect(swiper.dom.root?.classList.contains('j-swiper')).toBe(false);
    expect(swiper.dom.root?.querySelector('.swiper-wrapper')).toBeNull();

    swiper.dom.root
      ?.querySelector<HTMLButtonElement>('[data-action="next"]')
      ?.click();

    expect(swiper.state.index).toBe(1);
    expect(swiper.state.trackIndex).toBe(1);
    expect(swiper.dom.bullets[1]?.classList.contains('is-active')).toBe(true);
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

    if (!swiper.dom.root) throw new Error('Expected Swiper root.');
    app().appendChild(swiper.dom.root);
    setWidth(swiper.dom.root);
    await flushMountRefresh();

    expect(swiper.state.width).toBe(320);

    swiper.dom.nextButton?.click();

    expect(swiper.state.index).toBe(1);
    expect(swiper.state.trackIndex).toBe(2);
  });

  it('starts state-mode autoplay only after layout is available', async () => {
    swiper = createSwiper({
      data: SLIDES,
      delay: 40,
    }).build();

    expect(swiper.runtime.timer).toBeNull();

    if (!swiper.dom.root) throw new Error('Expected Swiper root.');
    app().appendChild(swiper.dom.root);
    setWidth(swiper.dom.root);
    await flushMountRefresh();

    expect(swiper.runtime.timer).toBeTruthy();

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
    expect(swiper.dom.bullets).toHaveLength(1);
    expect(swiper.dom.slides).toHaveLength(1);
    expect(swiper.state.index).toBe(0);
    expect(swiper.dom.root?.textContent).toContain('Only slide');
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
    expect(swiper.dom.bullets).toHaveLength(2);
    expect(swiper.dom.root?.textContent).toContain('Direct 2');
  });

  it('clears autoplay timer before destroy finishes', () => {
    swiper = mount(
      createSwiper({
        data: SLIDES,
        delay: 40,
      })
    );

    const nextSpy = vi.spyOn(swiper, 'next');

    expect(swiper.runtime.timer).toBeTruthy();

    swiper.destroy();

    expect(swiper.runtime.destroyed).toBe(true);
    expect(swiper.runtime.timer).toBeNull();

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
    expect(swiper.dom.root?.getAttribute('data-swiper')).toBe('root');
    expect(typeof swiper.refresh).toBe('function');
    expect(typeof swiper.next).toBe('function');
    expect(typeof swiper.prev).toBe('function');
    expect(typeof swiper.setState).toBe('function');
  });
});

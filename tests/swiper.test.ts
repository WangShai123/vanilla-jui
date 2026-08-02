// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { Swiper, createSwiper } from '../src/components/swiper.ts';

let swiper: Swiper | null = null;

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
  it('builds dynamic DOM with default classes and stable data markers', () => {
    swiper = new Swiper(app(), {
      data: SLIDES,
      autoplay: false,
    }).build();
    if (swiper.dom.root) setWidth(swiper.dom.root);
    swiper.update();

    expect(swiper.root?.classList.contains('j-swiper')).toBe(true);
    expect(swiper.root?.getAttribute('data-swiper')).toBe('root');
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

  it('uses data markers for navigation when className is customized', () => {
    swiper = createSwiper(app(), {
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
    }).build();

    expect(swiper.root?.classList.contains('qa-swiper')).toBe(true);
    expect(swiper.root?.classList.contains('j-swiper')).toBe(false);
    expect(swiper.root?.querySelector('.swiper-wrapper')).toBeNull();

    swiper.root
      ?.querySelector<HTMLButtonElement>('[data-action="next"]')
      ?.click();

    expect(swiper.state.index).toBe(1);
    expect(swiper.state.trackIndex).toBe(1);
    expect(swiper.dom.bullets[1]?.classList.contains('is-active')).toBe(true);
  });

  it('binds existing DOM by data markers instead of class selectors', () => {
    app().innerHTML = `
      <section class="qa-shell" data-swiper="root">
        <div class="qa-track" data-swiper-wrapper>
          <div class="qa-slide" data-swiper-slide>Static 1</div>
          <div class="qa-slide" data-swiper-slide>Static 2</div>
        </div>
      </section>
    `;
    const root = app().querySelector<HTMLElement>('[data-swiper="root"]');
    if (root) setWidth(root);

    swiper = new Swiper(app(), {
      autoplay: false,
      loop: false,
    }).build();

    expect(swiper.dom.root).toBe(root);
    expect(swiper.dom.createdRoot).toBe(false);
    expect(swiper.dom.slides).toHaveLength(2);
    expect(swiper.dom.wrapper?.classList.contains('qa-track')).toBe(true);
  });

  it('updates data and cleans up created root on destroy', () => {
    swiper = new Swiper(app(), {
      data: SLIDES,
      autoplay: false,
    }).build();

    swiper.updateData([{ children: 'Only slide' }]);

    expect(swiper.realCount).toBe(1);
    expect(swiper.dom.bullets).toHaveLength(1);
    expect(swiper.dom.slides).toHaveLength(1);

    swiper.destroy();
    swiper = null;

    expect(app().children).toHaveLength(0);
  });

  it('clears autoplay timer before destroy finishes', () => {
    swiper = new Swiper(app(), {
      data: SLIDES,
      delay: 40,
    }).build();

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

  it('createSwiper passes container and options through', () => {
    swiper = createSwiper(app(), {
      data: SLIDES,
      autoplay: false,
      loop: false,
    }).build();

    expect(swiper).toBeInstanceOf(Swiper);
    expect(swiper.props.loop).toBe(false);
    expect(swiper.dom.mountTarget).toBe(app());
  });
});

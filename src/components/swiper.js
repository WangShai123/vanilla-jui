import {
  bindAttr,
  bindClass,
  createDeepStore,
  createRoot,
  h,
} from 'vanilla-signal';

import Component from '../core/Component.js';
import { resolveProps, validateParam } from '../utilities/core.js';
import {
  all,
  isElement,
  isRenderableContent,
  normalizeContentNodes,
  q,
  requireContainer,
  requireRenderDOM,
} from '../utilities/dom.js';
import { icon } from './icons.js';

const SWIPE_THRESHOLD = 6;
const AUTOPLAY_DELAY_FLOOR = 16;

const SWIPER_OPTIONS_SCHEMA = {
  data: {
    default: null,
    validate: (value) => value == null || Array.isArray(value),
    message: 'expects an array or null.',
  },
  loop: { default: true, type: 'boolean' },
  autoplay: { default: true, type: 'boolean' },
  delay: {
    default: 3000,
    type: 'number',
    validate: (value) => value >= 0,
    message: 'expects a positive number or 0.',
  },
  lazyload: { default: true, type: 'boolean' },
  pagination: { default: true, type: 'boolean' },
  navigation: { default: true, type: 'boolean' },
  speed: {
    default: 300,
    type: 'number',
    validate: (value) => value >= 0,
    message: 'expects a positive number or 0.',
  },
  touchRatio: {
    default: 1,
    type: 'number',
    validate: (value) => value > 0,
    message: 'expects a number greater than 0.',
  },
  touchAngle: {
    default: 45,
    type: 'number',
    validate: (value) => value >= 0 && value <= 90,
    message: 'expects a number between 0 and 90.',
  },
  longSwipesMs: {
    default: 300,
    type: 'number',
    validate: (value) => value >= 0,
    message: 'expects a positive number or 0.',
  },
  longSwipesRatio: {
    default: 0.05,
    type: 'number',
    validate: (value) => value >= 0 && value <= 1,
    message: 'expects a number between 0 and 1.',
  },
  preventClick: { default: true, type: 'boolean' },
};

const SWIPER_DATA_ITEM_RULE = {
  validate: (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    return (
      (value.image == null || typeof value.image === 'string') &&
      (value.url == null || typeof value.url === 'string') &&
      (value.title == null || typeof value.title === 'string') &&
      (value.sort == null || typeof value.sort === 'number') &&
      (value.blank == null || typeof value.blank === 'boolean') &&
      (value.children == null || isRenderableContent(value.children))
    );
  },
  message:
    'expects items with optional image, url, title, sort, blank and children fields.',
};

function isInteractiveTarget(target) {
  return !!target?.closest?.(
    'a, button, input, textarea, select, label, [data-swiper-ignore]'
  );
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getRenderableNodes(content, context) {
  return normalizeContentNodes(content, context);
}

function resolveSwiperRoot(container) {
  const roots = all('.j-swiper', container);
  validateParam(
    'container',
    roots,
    {
      validate: (value) => value.length === 1,
      message: 'expects exactly one .j-swiper descendant.',
    },
    'Swiper'
  );
  return roots[0];
}

/**
 * 轻量轮播组件，继承 Component。
 *
 * 支持链接 slide、图片 lazyload、分页、导航、loop 和桌面/移动端拖拽滑动。
 * 使用 vanilla-signal 响应式管理 pagination 和 navigation 状态。
 */
class Swiper extends Component {
  /**
   * 创建轮播实例。
   * @param {Element|Node|string|Array} container 挂载容器、选择器或 JSX/h 返回节点。
   * @param {object} [options={}] Swiper 配置。
   */
  constructor(container, options = {}) {
    const resolvedOptions = resolveProps(
      options,
      SWIPER_OPTIONS_SCHEMA,
      'Swiper.options'
    );

    super(resolvedOptions);

    this.dom.container = container;
    this._built = false;

    this.dom.mountTarget = null;
    this.dom.createdRoot = false;
    this.dom.createdSlides = false;
    this.dom.wrapper = null;
    this.dom.slides = [];
    this.dom.pagination = null;
    this.dom.prevButton = null;
    this.dom.nextButton = null;
    this.dom.bullets = [];
    this.dom.createdPagination = false;
    this.dom.createdPrevButton = false;
    this.dom.createdNextButton = false;

    this.runtime.logs = [];
    this.runtime.startTarget = null;
    this.runtime.touching = false;
    this.runtime.scrolling = false;
    this.runtime.swiping = false;
    this.runtime.clickPrevented = false;
    this.runtime.timer = null;
    this.runtime.imageCleanups = new Set();

    this.runtime.realCount = 0;

    this.state = createDeepStore({
      index: 0,
      trackIndex: 0,
      transform: 0,
      animating: false,
      width: 0,
    });
  }

  /**
   * 构建或绑定 Swiper DOM。
   * @returns {Swiper} 当前实例。
   */
  build() {
    if (this.runtime.destroyed)
      throw new Error('Swiper.build: instance destroyed');
    if (this._built) return this;

    requireRenderDOM('Swiper');

    const hasData = Array.isArray(this.props.data);
    const root = requireContainer(this.dom.container, 'Swiper');

    let mountRoot = null;
    let mountTarget = null;

    if (hasData) {
      mountTarget = root;
      mountRoot = h('div', { className: 'j-swiper' });
      mountTarget.appendChild(mountRoot);
    } else {
      mountRoot = resolveSwiperRoot(root);
    }

    try {
      this.dom.root = mountRoot;
      this.dom.mountTarget = mountTarget;
      this.dom.createdRoot = hasData;
      this.dom.createdSlides = hasData;

      const wrapper = hasData
        ? this.createDataView(mountRoot, this.props.data)
        : q('.swiper-wrapper', mountRoot);
      validateParam(
        'wrapper',
        wrapper,
        {
          validate: isElement,
          message: 'expects .swiper-wrapper in the root element.',
        },
        'Swiper'
      );

      this.dom.wrapper = wrapper;
      this.dom.slides = all('.swiper-slide', wrapper);
      this.dom.pagination = q('.swiper-pagination', mountRoot);
      this.dom.prevButton = q('.swiper-navigation.is-prev', mountRoot);
      this.dom.nextButton = q('.swiper-navigation.is-next', mountRoot);
      this.dom.bullets = [];
      this.dom.createdPagination = false;
      this.dom.createdPrevButton = false;
      this.dom.createdNextButton = false;

      this.runtime.realCount = this.dom.slides.length;
      this._built = true;

      if (this.dom.slides.length > 0) this.onInit();
    } catch (error) {
      this.destroy();
      throw error;
    }

    this.emit('init', this.props);
    return this;
  }

  set index(v) {
    this.setState({ index: normalizeNumber(v) });
  }

  set trackIndex(v) {
    this.setState({ trackIndex: normalizeNumber(v) });
  }

  set transform(v) {
    this.setState({ transform: normalizeNumber(v) });
  }

  set animating(v) {
    this.setState({ animating: !!v });
  }

  set width(v) {
    this.setState({ width: normalizeNumber(v) });
  }

  get realCount() {
    if (this.runtime?.destroyed) return 0;
    return this.runtime?.realCount || 0;
  }

  get realIndex() {
    return this.toRealIndex();
  }

  assertBuilt(method) {
    if (!this._built) {
      throw new Error(`Swiper.${method}: call build() first.`);
    }
  }

  createDataView(root, data) {
    const items = this.normalizeData(data);
    const wrapper = h('div', {
      className: 'swiper-wrapper',
      'aria-live': 'polite',
    });
    root.textContent = '';

    items.forEach((item, index) => {
      wrapper.appendChild(this.createDataSlide(item, index));
    });

    root.appendChild(wrapper);
    return wrapper;
  }

  normalizeData(data) {
    data.forEach((item, index) => {
      validateParam(
        String(index),
        item,
        SWIPER_DATA_ITEM_RULE,
        'Swiper.options.data'
      );
    });

    const items = data.map((item, index) => ({
      ...item,
      blank: item.blank !== false,
      index,
    }));
    if (!items.some((item) => item.sort != null)) return items;

    return items.sort((a, b) => {
      if (a.sort == null && b.sort == null) return a.index - b.index;
      if (a.sort == null) return 1;
      if (b.sort == null) return -1;
      return a.sort - b.sort || a.index - b.index;
    });
  }

  createDataSlide(item, index) {
    const slide = h(item.url ? 'a' : 'div', {
      className: 'swiper-slide',
      href: item.url || undefined,
      target: item.url ? (item.blank ? '_blank' : '_self') : undefined,
      'data-swiper-index': String(index),
      role: 'group',
      'aria-label': `Slide ${index + 1}`,
    });

    if (item.children != null) {
      slide.append(
        ...getRenderableNodes(item.children, { swiper: this, item, index })
      );
      return slide;
    }

    if (item.image) {
      const img = h('img', {
        className: 'swiper-image',
        alt: item.title || '',
        loading: 'lazy',
      });
      if (this.props.lazyload) img.dataset.lazy = item.image;
      else img.src = item.image;
      slide.appendChild(img);
    }

    if (item.title) {
      slide.appendChild(
        h('span', {
          className: 'swiper-slide-title',
          children: item.title,
        })
      );
    }

    return slide;
  }

  onInit() {
    this.dom.wrapper.setAttribute('aria-live', 'polite');
    this.updateSize();

    if (this.props.loop && this.realCount > 1) {
      this.initLoop();
    }

    this.setupStyles();

    this.setTrackIndex(this.props.loop ? 1 : 0, false);
    this.render(false);
    this.bindEvents();

    if (this.props.pagination) this.initPagination();
    if (this.props.navigation) this.initNavigation();
    if (this.props.lazyload) this.loadImages();
    if (this.props.autoplay) this.play();
  }

  onDestroy() {
    this.pause();
    this.clearImageCleanups();
    this.cleanup.events.clear();
    this.cleanup.bindings?.();
    this.cleanup.bindings = null;
    this.cleanup.navBindings?.();
    this.cleanup.navBindings = null;

    if (this.dom.wrapper) {
      all('[data-clone]', this.dom.wrapper).forEach((slide) => slide.remove());
    }
    if (this.dom.createdPagination) this.dom.pagination?.remove();
    if (this.dom.createdPrevButton) this.dom.prevButton?.remove();
    if (this.dom.createdNextButton) this.dom.nextButton?.remove();
    if (this.dom.createdRoot) this.dom.root?.remove();
    this._built = false;
  }

  updateSize() {
    this.assertBuilt('updateSize');
    this.width = this.dom.root.clientWidth || this.dom.root.offsetWidth;
  }

  refreshSlides() {
    this.dom.slides = all('.swiper-slide', this.dom.wrapper);
    this.runtime.realCount = this.dom.slides.filter(
      (slide) => !slide.hasAttribute('data-clone')
    ).length;
  }

  initLoop() {
    const first = this.dom.slides[0].cloneNode(true);
    const last = this.dom.slides[this.dom.slides.length - 1].cloneNode(true);

    first.setAttribute('data-clone', '');
    last.setAttribute('data-clone', '');
    first.removeAttribute('data-swiper-index');
    last.removeAttribute('data-swiper-index');

    this.dom.wrapper.appendChild(first);
    this.dom.wrapper.insertBefore(last, this.dom.slides[0]);
    this.refreshSlides();
  }

  setupStyles() {
    this.dom.root.style.setProperty(
      '--swiper-slide-width',
      `${this.state.width}px`
    );
  }

  reInitView() {
    this.pause();
    this.clearImageCleanups();
    this.cleanup.bindings?.();
    this.cleanup.bindings = null;
    this.cleanup.navBindings?.();
    this.cleanup.navBindings = null;
    this.cleanup.events.clear();

    all('[data-clone]', this.dom.wrapper).forEach((slide) => slide.remove());

    this.refreshSlides();

    if (this.props.loop && this.realCount > 1) {
      this.initLoop();
    }

    this.updateSize();
    this.setupStyles();
    this.setTrackIndex(this.trackIndexForRealIndex(this.state.index), false);
    this.render(false);
    this.bindEvents();

    if (this.props.pagination) this.initPagination();
    else this.clearPagination();

    if (this.props.navigation) this.initNavigation();
    else this.clearNavigation();

    if (this.props.lazyload) this.loadImages();
    if (this.props.autoplay) this.play();
  }

  clearPagination() {
    this.cleanup.bindings?.();
    this.cleanup.bindings = null;
    this.dom.bullets.forEach((_, index) => {
      this.cleanup.events.off(`bullet:${index}:click`);
      this.cleanup.events.off(`bullet:${index}:keydown`);
    });
    this.dom.bullets = [];
    if (this.dom.createdPagination) {
      this.dom.pagination?.remove();
      this.dom.pagination = null;
      this.dom.createdPagination = false;
    } else if (this.dom.pagination) {
      this.dom.pagination.textContent = '';
    }
  }

  clearNavigation() {
    this.cleanup.navBindings?.();
    this.cleanup.navBindings = null;
    this.cleanup.events.off('nav:prev');
    this.cleanup.events.off('nav:next');
    if (this.dom.createdPrevButton) {
      this.dom.prevButton?.remove();
      this.dom.prevButton = null;
      this.dom.createdPrevButton = false;
    }
    if (this.dom.createdNextButton) {
      this.dom.nextButton?.remove();
      this.dom.nextButton = null;
      this.dom.createdNextButton = false;
    }
  }

  bindEvents() {
    this.cleanup.events.on(
      'touchstart',
      this.dom.wrapper,
      'touchstart',
      (event) => {
        if (event.touches[0]) this.onStart(event.touches[0], event.target);
      },
      { passive: true }
    );
    this.cleanup.events.on(
      'touchmove',
      this.dom.wrapper,
      'touchmove',
      (event) => {
        if (event.touches[0]) this.onMove(event.touches[0], event);
      },
      { passive: false }
    );
    this.cleanup.events.on(
      'touchend',
      this.dom.wrapper,
      'touchend',
      (event) => {
        if (event.changedTouches[0]) this.pushLog(event.changedTouches[0]);
        this.onEnd();
      }
    );
    this.cleanup.events.on(
      'touchcancel',
      this.dom.wrapper,
      'touchcancel',
      () => {
        this.resetDrag(true);
      }
    );
    this.cleanup.events.on('window:touchcancel', window, 'touchcancel', () => {
      this.resetDrag(true);
    });
    this.cleanup.events.on(
      'mousedown',
      this.dom.wrapper,
      'mousedown',
      (event) => {
        if (event.button !== 0) return;
        this.onStart(event, event.target);
        this.dom.wrapper.style.cursor = 'grabbing';
      }
    );
    this.cleanup.events.on(
      'mousemove',
      this.dom.wrapper,
      'mousemove',
      (event) => {
        if (event.buttons === 1) this.onMove(event, event);
      }
    );
    this.cleanup.events.on('window:mousemove', window, 'mousemove', (event) => {
      if (this.runtime.touching && event.buttons === 1)
        this.onMove(event, event);
    });
    this.cleanup.events.on('mouseup', this.dom.wrapper, 'mouseup', (event) => {
      this.dom.wrapper.style.cursor = 'grab';
      this.pushLog(event);
      this.onEnd();
    });
    this.cleanup.events.on('window:mouseup', window, 'mouseup', (event) => {
      if (!this.runtime.touching) return;
      this.dom.wrapper.style.cursor = 'grab';
      this.pushLog(event);
      this.onEnd();
    });
    this.cleanup.events.on(
      'wrapper:mouseleave',
      this.dom.wrapper,
      'mouseleave',
      () => {
        this.dom.wrapper.style.cursor = 'grab';
      }
    );
    this.cleanup.events.on(
      'click',
      this.dom.wrapper,
      'click',
      (event) => {
        if (!this.runtime.clickPrevented || !this.props.preventClick) return;
        event.preventDefault();
        event.stopPropagation();
        this.runtime.clickPrevented = false;
      },
      { capture: true }
    );
    this.cleanup.events.on(
      'dragstart',
      this.dom.wrapper,
      'dragstart',
      (event) => event.preventDefault()
    );
    this.cleanup.events.on(
      'transitionend',
      this.dom.wrapper,
      'transitionend',
      (event) => this.onTransitionEnd(event)
    );
    this.cleanup.events.on('window:resize', window, 'resize', () =>
      this.update(null, { force: true })
    );
    this.cleanup.events.on('root:mouseenter', this.dom.root, 'mouseenter', () =>
      this.pause()
    );
    this.cleanup.events.on('root:mouseleave', this.dom.root, 'mouseleave', () =>
      this.resume()
    );
  }

  onStart(point, target = null) {
    if (this.state.animating) return;

    this.runtime.logs = [];
    this.pushLog(point);
    this.runtime.startTarget = target;
    this.runtime.touching = true;
    this.runtime.scrolling = false;
    this.runtime.swiping = false;
    this.runtime.clickPrevented = false;

    this.pause();
    this.dom.wrapper.style.transition = 'none';
  }

  onMove(point, event) {
    if (
      !this.runtime.touching ||
      this.runtime.scrolling ||
      this.state.animating
    )
      return;

    this.pushLog(point);

    const offset = this.getOffset();
    const ax = Math.abs(offset.x);
    const ay = Math.abs(offset.y);
    if (ax < SWIPE_THRESHOLD && ay < SWIPE_THRESHOLD) return;

    if (!this.runtime.swiping) {
      const angle = (Math.atan2(ay, ax) * 180) / Math.PI;

      if (angle < this.props.touchAngle) {
        this.runtime.swiping = true;
        this.runtime.clickPrevented = isInteractiveTarget(
          this.runtime.startTarget
        );
      } else {
        this.runtime.scrolling = true;
        this.resetDrag(true);
        return;
      }
    }

    if (this.runtime.swiping) {
      event.preventDefault();
      this.transform =
        -this.state.trackIndex * this.state.width +
        offset.x * this.props.touchRatio;
      this.render(false);
    }
  }

  onEnd() {
    if (!this.runtime.touching) return;

    this.runtime.touching = false;

    if (!this.runtime.swiping) {
      this.resetDrag(true);
      return;
    }

    const duration = this.getDuration();
    const offset = this.getOffset();
    const ox = offset.x;
    let target = this.state.trackIndex;

    if (duration > this.props.longSwipesMs) {
      const steps = Math.ceil(
        Math.abs(ox) / this.state.width - this.props.longSwipesRatio
      );
      if (steps > 0) target = this.state.trackIndex + steps * (ox > 0 ? -1 : 1);
    } else {
      const distance = Math.abs(ox) / this.state.width;
      const slides =
        distance >= this.props.longSwipesRatio
          ? Math.max(1, Math.ceil(distance - this.props.longSwipesRatio))
          : 0;
      if (slides > 0)
        target =
          ox > 0
            ? this.state.trackIndex - slides
            : this.state.trackIndex + slides;
    }

    this.slideToTrack(target);
    this.runtime.logs = [];
    this.resume();
  }

  resetDrag(animate = true) {
    const target =
      this.state.trackIndex === 0
        ? 0
        : -this.state.trackIndex * this.state.width;
    const shouldAnimate = animate && this.state.transform !== target;

    this.runtime.touching = false;
    this.runtime.scrolling = false;
    this.runtime.swiping = false;
    this.runtime.logs = [];
    this.runtime.startTarget = null;
    this.transform = target;
    this.render(shouldAnimate);
    this.resume();
  }

  onTransitionEnd(event) {
    if (
      event &&
      (event.target !== this.dom.wrapper || event.propertyName !== 'transform')
    )
      return;

    this.animating = false;

    if (this.props.loop) {
      if (this.state.trackIndex === 0) {
        this.setTrackIndex(this.realCount, false);
        this.render(false);
      } else if (this.state.trackIndex === this.dom.slides.length - 1) {
        this.setTrackIndex(1, false);
        this.render(false);
      }
    }
  }

  pushLog(point) {
    this.runtime.logs.push({
      x: point.pageX ?? point.clientX ?? 0,
      y: point.pageY ?? point.clientY ?? 0,
      time: Date.now(),
    });
    if (this.runtime.logs.length > 5) this.runtime.logs.shift();
  }

  getDuration() {
    if (this.runtime.logs.length === 0) return 0;
    return (
      this.runtime.logs[this.runtime.logs.length - 1].time -
      this.runtime.logs[0].time
    );
  }

  getOffset() {
    if (this.runtime.logs.length === 0) return { x: 0, y: 0 };
    const first = this.runtime.logs[0];
    const last = this.runtime.logs[this.runtime.logs.length - 1];
    return { x: last.x - first.x, y: last.y - first.y };
  }

  toRealIndex(index = this.state.trackIndex) {
    if (!this.realCount) return 0;
    if (!this.props.loop) return index;
    if (index === 0) return this.realCount - 1;
    if (index === this.dom.slides.length - 1) return 0;
    return index - 1;
  }

  trackIndexForRealIndex(index) {
    if (!this.realCount) return 0;
    const target = Math.max(0, Math.min(index, this.realCount - 1));
    return this.props.loop && this.realCount > 1 ? target + 1 : target;
  }

  setTrackIndex(trackIndex, animate = true) {
    const target = normalizeNumber(trackIndex);
    this.setState({
      trackIndex: target,
      index: this.toRealIndex(target),
      transform: -target * this.state.width,
    });
    if (animate != null) this.render(animate);
  }

  slideTo(index) {
    return this.slideToTrack(this.trackIndexForRealIndex(index));
  }

  slideToTrack(idx) {
    this.assertBuilt('slideToTrack');
    if (this.state.animating) return;
    if (this.dom.slides.length === 0) return;

    let target = idx;

    if (this.props.loop) {
      if (idx < 0) target = 0;
      else if (idx >= this.dom.slides.length)
        target = this.dom.slides.length - 1;
    } else {
      target = Math.max(0, Math.min(idx, this.dom.slides.length - 1));
    }

    this.setTrackIndex(target, true);

    if (this.props.lazyload) this.loadImages();
  }

  next() {
    this.assertBuilt('next');
    if (this.state.animating) return;
    this.slideToTrack(this.state.trackIndex + 1);
  }

  prev() {
    this.assertBuilt('prev');
    if (this.state.animating) return;
    this.slideToTrack(this.state.trackIndex - 1);
  }

  render(animate) {
    this.assertBuilt('render');
    if (animate) {
      this.dom.wrapper.style.transition = `transform ${this.props.speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      this.animating = true;
    } else {
      this.dom.wrapper.style.transition = 'none';
      this.animating = false;
    }

    this.dom.wrapper.style.transform = `translate3d(${this.state.transform}px, 0, 0)`;
  }

  loadImages() {
    this.assertBuilt('loadImages');
    const indices = [this.state.trackIndex];
    if (this.state.trackIndex > 0) indices.push(this.state.trackIndex - 1);
    if (this.state.trackIndex < this.dom.slides.length - 1)
      indices.push(this.state.trackIndex + 1);

    indices.forEach((index) => {
      const slide = this.dom.slides[index];
      if (!slide) return;

      const img = q('img[data-lazy]', slide);
      if (!img || img.src) return;

      img.classList.add('loading');
      img.src = img.dataset.lazy;
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
        this.runtime.imageCleanups.delete(cleanup);
      };
      this.runtime.imageCleanups.add(cleanup);
      img.onload = () => {
        img.classList.remove('loading');
        img.classList.add('loaded');
        cleanup();
      };
      img.onerror = () => {
        img.classList.remove('loading');
        img.classList.add('error');
        cleanup();
      };
    });
  }

  clearImageCleanups() {
    this.runtime.imageCleanups?.forEach((cleanup) => cleanup());
    this.runtime.imageCleanups?.clear();
  }

  initPagination() {
    if (!this.dom.pagination) {
      this.dom.pagination = h('div', {
        className: 'swiper-pagination is-horizontal is-clickable is-bullet',
      });
      this.dom.root.appendChild(this.dom.pagination);
      this.dom.createdPagination = true;
    } else {
      this.dom.pagination.classList.add(
        'is-horizontal',
        'is-clickable',
        'is-bullet'
      );
    }

    this.dom.pagination.textContent = '';
    this.dom.bullets = [];

    for (let index = 0; index < this.realCount; index++) {
      const bullet = h('button', {
        type: 'button',
        className: 'swiper-pagination-indicator swiper-pagination-bullet',
        'aria-label': `Go to slide ${index + 1}`,
      });
      this.cleanup.events.on(`bullet:${index}:click`, bullet, 'click', () => {
        this.slideTo(index);
      });
      this.cleanup.events.on(
        `bullet:${index}:keydown`,
        bullet,
        'keydown',
        (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          this.slideTo(index);
        }
      );
      this.dom.bullets.push(bullet);
      this.dom.pagination.appendChild(bullet);
    }

    this.cleanup.bindings = createRoot((dispose) => {
      this.dom.bullets.forEach((bullet, i) => {
        bindClass(bullet, 'is-active', () => this.state.index === i);
        bindAttr(bullet, 'aria-current', () =>
          this.state.index === i ? 'true' : null
        );
      });
      return dispose;
    });
  }

  initNavigation() {
    this.dom.prevButton = this.ensureNavigation('prev', 'arrow-left');
    this.dom.nextButton = this.ensureNavigation('next', 'arrow-right');

    this.cleanup.events.on('nav:prev', this.dom.prevButton, 'click', () =>
      this.prev()
    );
    this.cleanup.events.on('nav:next', this.dom.nextButton, 'click', () =>
      this.next()
    );

    if (!this.props.loop) {
      this.cleanup.navBindings = createRoot((dispose) => {
        bindClass(
          this.dom.prevButton,
          'is-disabled',
          () => this.state.trackIndex <= 0
        );
        bindAttr(this.dom.prevButton, 'disabled', () =>
          this.state.trackIndex <= 0 ? '' : null
        );
        bindClass(
          this.dom.nextButton,
          'is-disabled',
          () => this.state.trackIndex >= this.dom.slides.length - 1
        );
        bindAttr(this.dom.nextButton, 'disabled', () =>
          this.state.trackIndex >= this.dom.slides.length - 1 ? '' : null
        );
        return dispose;
      });
    }
  }

  ensureNavigation(direction, iconName) {
    const key =
      direction === 'prev' ? 'createdPrevButton' : 'createdNextButton';
    const className = `swiper-navigation is-${direction}`;
    let button = q(`.swiper-navigation.is-${direction}`, this.dom.root);

    if (!button) {
      button = h('button', { type: 'button', className });
      this.dom.root.appendChild(button);
      this.dom[key] = true;
    } else if (!button.matches('button')) {
      button.setAttribute('role', 'button');
      button.setAttribute('tabindex', '0');
      button.classList.add('swiper-navigation', `is-${direction}`);
    }

    button.setAttribute(
      'aria-label',
      direction === 'prev' ? 'Previous slide' : 'Next slide'
    );
    if (!button.querySelector('svg')) {
      button.textContent = '';
      button.appendChild(icon(iconName));
    }

    return button;
  }

  play() {
    this.assertBuilt('play');
    if (this.runtime.destroyed || this.runtime.timer) return;
    if (this.realCount <= 1) return;
    const delay = Math.max(this.props.delay, AUTOPLAY_DELAY_FLOOR);
    this.runtime.timer = setInterval(() => this.next(), delay);
  }

  pause() {
    if (!this.runtime.timer) return;
    clearInterval(this.runtime.timer);
    this.runtime.timer = null;
  }

  resume() {
    if (this.runtime.destroyed) return;
    if (this.props.autoplay && !this.runtime.timer) this.play();
  }

  restartAutoplay() {
    this.pause();
    if (this.props.autoplay) this.play();
  }

  update(propsPatch = {}, { force = false } = {}) {
    if (this.runtime.destroyed)
      throw new Error('Component.update: instance destroyed');
    this.assertBuilt('update');

    const patch =
      propsPatch && typeof propsPatch === 'object' && !Array.isArray(propsPatch)
        ? propsPatch
        : {};
    const nextProps = resolveProps(
      Object.assign({}, this.props, patch),
      SWIPER_OPTIONS_SCHEMA,
      'Swiper.options'
    );
    const normalizedPatch = {};

    Object.keys(patch).forEach((key) => {
      normalizedPatch[key] = nextProps[key];
    });

    this.props = nextProps;
    this.emit('beforeUpdate', normalizedPatch, { force });
    this.onUpdate(normalizedPatch, { force });
    this.emit('afterUpdate', normalizedPatch, { force });
    return this;
  }

  onUpdate(propsPatch = {}) {
    if (
      propsPatch &&
      Object.prototype.hasOwnProperty.call(propsPatch, 'data')
    ) {
      this.updateData(propsPatch.data);
      return;
    }

    const needsReInit = ['loop', 'pagination', 'navigation', 'lazyload'].some(
      (key) => Object.prototype.hasOwnProperty.call(propsPatch, key)
    );

    if (needsReInit) {
      this.reInitView();
      return;
    }

    this.updateSize();
    this.setupStyles();
    this.setTrackIndex(this.trackIndexForRealIndex(this.state.index), false);

    if (
      Object.prototype.hasOwnProperty.call(propsPatch, 'autoplay') ||
      Object.prototype.hasOwnProperty.call(propsPatch, 'delay')
    ) {
      this.restartAutoplay();
    } else if (this.props.autoplay) this.resume();
    else this.pause();
  }

  updateData(data = this.props.data) {
    if (this.runtime.destroyed)
      throw new Error('Swiper.updateData: instance destroyed');
    this.assertBuilt('updateData');
    if (!this.dom.createdRoot)
      throw new Error(
        'Swiper.updateData: not supported on DOM-bound instances.'
      );

    validateParam('data', data, SWIPER_OPTIONS_SCHEMA.data, 'Swiper.options');
    if (!Array.isArray(data)) {
      this.props.data = data;
      this.reInitView();
      return this;
    }

    this.props.data = data;
    const realIndex = this.state.index;

    this.pause();
    this.clearImageCleanups();
    this.cleanup.bindings?.();
    this.cleanup.bindings = null;
    this.cleanup.navBindings?.();
    this.cleanup.navBindings = null;
    this.cleanup.events.clear();

    const items = this.normalizeData(data);
    this.dom.wrapper.textContent = '';
    items.forEach((item, index) => {
      this.dom.wrapper.appendChild(this.createDataSlide(item, index));
    });
    this.refreshSlides();
    this.runtime.realCount = this.dom.slides.length;
    this.setState({
      index: Math.min(realIndex, Math.max(0, this.realCount - 1)),
    });
    this.reInitView();
    return this;
  }
}

export default Swiper;

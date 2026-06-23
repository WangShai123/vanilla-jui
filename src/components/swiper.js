import {
  bindAttr,
  bindClass,
  createDeepStore,
  createRoot,
} from 'vanilla-signal';

import Component from '../core/Component.js';
import { resolveProps, validateParam } from '../utilities/core.js';
import {
  all,
  canRenderDOM,
  isElement,
  isRenderableContent,
  normalizeContentNodes,
  q,
} from '../utilities/dom.js';
import { icon } from './icons.js';

const SWIPE_THRESHOLD = 6;

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
      (value.children == null || isRenderableContent(value.children))
    );
  },
  message:
    'expects items with optional image, url, title, sort and children fields.',
};

function isInteractiveTarget(target) {
  return !!target?.closest?.(
    'a, button, input, textarea, select, label, [data-swiper-ignore]'
  );
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
   * @param {HTMLElement|string} container 根节点或选择器。
   * @param {object} [options={}] Swiper 配置。
   */
  constructor(container, options = {}) {
    if (!canRenderDOM()) {
      throw new Error('Swiper: DOM render environment is required.');
    }

    const resolvedOptions = resolveProps(
      options,
      SWIPER_OPTIONS_SCHEMA,
      'Swiper.options'
    );
    const hasData = Array.isArray(resolvedOptions.data);
    const root =
      typeof container === 'string'
        ? q(container)
        : isElement(container)
          ? container
          : null;

    if (!root && !hasData) {
      validateParam(
        'container',
        root,
        {
          validate: isElement,
          message: 'expects a valid HTMLElement or selector.',
        },
        'Swiper'
      );
    }

    let mountRoot = root;
    let mountTarget = null;
    const createdRoot = hasData;

    if (hasData) {
      mountTarget = root || document.body;
      mountRoot = document.createElement('div');
      mountRoot.className = 'j-swiper';
      mountTarget.appendChild(mountRoot);
    } else if (!mountRoot.classList.contains('j-swiper')) {
      throw new Error('Swiper: root element must have .j-swiper.');
    }

    super(resolvedOptions);

    this.dom.root = mountRoot;
    this.dom.mountTarget = mountTarget;
    this.dom.createdRoot = createdRoot;
    this.dom.createdSlides = hasData;

    this.runtime.logs = [];
    this.runtime.startTarget = null;
    this.runtime.touching = false;
    this.runtime.scrolling = false;
    this.runtime.swiping = false;
    this.runtime.clickPrevented = false;
    this.runtime.timer = null;

    const wrapper = hasData
      ? this.createDataView(mountRoot, resolvedOptions.data)
      : q('.swiper-wrapper', mountRoot);
    if (!wrapper) throw new Error('Swiper: .swiper-wrapper not found.');

    this.dom.wrapper = wrapper;
    this.dom.slides = all('.swiper-slide', wrapper);
    this.dom.pagination = q('.swiper-pagination', mountRoot);
    this.dom.prevButton = q('.swiper-navigation.is-prev', mountRoot);
    this.dom.nextButton = q('.swiper-navigation.is-next', mountRoot);
    this.dom.bullets = [];
    this.dom.createdPagination = false;
    this.dom.createdPrevButton = false;
    this.dom.createdNextButton = false;

    if (this.dom.slides.length === 0) return;

    this.runtime.realCount = this.dom.slides.length;

    this.state = createDeepStore({
      index: 0,
      transform: 0,
      animating: false,
      width: 0,
    });

    this.onInit();
  }

  set index(v) {
    this.state.index = Number(v) || 0;
  }

  set transform(v) {
    this.state.transform = Number(v) || 0;
  }

  set animating(v) {
    this.state.animating = !!v;
  }

  set width(v) {
    this.state.width = Number(v) || 0;
  }

  get realCount() {
    return this.runtime?.realCount || 0;
  }

  createDataView(root, data) {
    const items = this.normalizeData(data);
    const wrapper = document.createElement('div');
    wrapper.className = 'swiper-wrapper';
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

    const items = data.map((item, index) => ({ ...item, index }));
    if (!items.some((item) => item.sort != null)) return items;

    return items.sort((a, b) => {
      if (a.sort == null && b.sort == null) return a.index - b.index;
      if (a.sort == null) return 1;
      if (b.sort == null) return -1;
      return a.sort - b.sort || a.index - b.index;
    });
  }

  createDataSlide(item, index) {
    const slide = item.url
      ? document.createElement('a')
      : document.createElement('div');

    slide.className = 'swiper-slide';
    slide.setAttribute('data-swiper-index', String(index));
    if (item.url) slide.href = item.url;

    if (item.children != null) {
      slide.append(
        ...normalizeContentNodes(item.children, { swiper: this, item, index })
      );
      return slide;
    }

    if (item.image) {
      const img = document.createElement('img');
      img.className = 'swiper-image';
      img.alt = item.title || '';
      img.loading = 'lazy';
      if (this.props.lazyload) img.dataset.lazy = item.image;
      else img.src = item.image;
      slide.appendChild(img);
    }

    if (item.title) {
      const title = document.createElement('span');
      title.className = 'swiper-slide-title';
      title.textContent = item.title;
      slide.appendChild(title);
    }

    return slide;
  }

  onInit() {
    this.updateSize();

    if (this.props.loop && this.realCount > 1) {
      this.initLoop();
    }

    this.setupStyles();

    this.index = this.props.loop ? 1 : 0;
    this.transform = -this.state.index * this.state.width;
    this.render(false);
    this.bindEvents();

    if (this.props.pagination) this.initPagination();
    if (this.props.navigation) this.initNavigation();
    if (this.props.lazyload) this.loadImages();
    if (this.props.autoplay) this.play();
  }

  onDestroy() {
    this.pause();
    this.cleanup.events.clear();
    this.cleanup.bindings?.();
    this.cleanup.bindings = null;
    this.cleanup.navBindings?.();
    this.cleanup.navBindings = null;

    all('[data-clone]', this.dom.wrapper).forEach((slide) => slide.remove());
    if (this.dom.createdPagination) this.dom.pagination?.remove();
    if (this.dom.createdPrevButton) this.dom.prevButton?.remove();
    if (this.dom.createdNextButton) this.dom.nextButton?.remove();
    if (this.dom.createdRoot) this.dom.root?.remove();
  }

  destroy() {
    if (this.runtime.destroyed) return;
    this.onDestroy();
    super.destroy();
  }

  updateSize() {
    this.width = this.dom.root.clientWidth || this.dom.root.offsetWidth;
  }

  refreshSlides() {
    this.dom.slides = all('.swiper-slide', this.dom.wrapper);
  }

  initLoop() {
    const first = this.dom.slides[0].cloneNode(true);
    const last = this.dom.slides[this.dom.slides.length - 1].cloneNode(true);

    first.setAttribute('data-clone', '');
    last.setAttribute('data-clone', '');

    this.dom.wrapper.appendChild(first);
    this.dom.wrapper.insertBefore(last, this.dom.slides[0]);
    this.refreshSlides();
  }

  setupStyles() {
    this.dom.wrapper.style.display = 'flex';
    this.dom.wrapper.style.willChange = 'transform';

    this.dom.slides.forEach((slide) => {
      slide.style.flexShrink = '0';
      slide.style.width = `${this.state.width}px`;
    });
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
        if (!this.runtime.touching) return;
        this.dom.wrapper.style.cursor = 'grab';
        this.onEnd();
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
      () => this.onTransitionEnd()
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
        -this.state.index * this.state.width + offset.x * this.props.touchRatio;
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
    let target = this.state.index;

    if (duration > this.props.longSwipesMs) {
      const steps = Math.ceil(
        Math.abs(ox) / this.state.width - this.props.longSwipesRatio
      );
      if (steps > 0) target = this.state.index + steps * (ox > 0 ? -1 : 1);
    } else {
      const distance = Math.abs(ox) / this.state.width;
      const slides =
        distance >= this.props.longSwipesRatio
          ? Math.max(1, Math.ceil(distance - this.props.longSwipesRatio))
          : 0;
      if (slides > 0)
        target = ox > 0 ? this.state.index - slides : this.state.index + slides;
    }

    this.slideTo(target);
    this.runtime.logs = [];
    this.resume();
  }

  resetDrag(animate = true) {
    const target =
      this.state.index === 0 ? 0 : -this.state.index * this.state.width;
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

  onTransitionEnd() {
    this.animating = false;

    if (this.props.loop) {
      if (this.state.index === 0) {
        this.index = this.realCount;
        this.transform = -this.state.index * this.state.width;
        this.render(false);
      } else if (this.state.index === this.dom.slides.length - 1) {
        this.index = 1;
        this.transform = -this.state.index * this.state.width;
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

  toRealIndex(index = this.state.index) {
    if (!this.props.loop) return index;
    if (index === 0) return this.realCount - 1;
    if (index === this.dom.slides.length - 1) return 0;
    return index - 1;
  }

  slideTo(idx) {
    if (this.state.animating) return;

    let target = idx;

    if (this.props.loop) {
      if (idx < 0) target = 0;
      else if (idx >= this.dom.slides.length)
        target = this.dom.slides.length - 1;
    } else {
      target = Math.max(0, Math.min(idx, this.dom.slides.length - 1));
    }

    this.index = target;
    this.transform = -target * this.state.width;
    this.render(true);

    if (this.props.lazyload) this.loadImages();
  }

  next() {
    if (this.state.animating) return;
    this.slideTo(this.state.index + 1);
  }

  prev() {
    if (this.state.animating) return;
    this.slideTo(this.state.index - 1);
  }

  render(animate) {
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
    const indices = [this.state.index];
    if (this.state.index > 0) indices.push(this.state.index - 1);
    if (this.state.index < this.dom.slides.length - 1)
      indices.push(this.state.index + 1);

    indices.forEach((index) => {
      const slide = this.dom.slides[index];
      if (!slide) return;

      const img = q('img[data-lazy]', slide);
      if (!img || img.src) return;

      img.classList.add('loading');
      img.src = img.dataset.lazy;
      img.onload = () => {
        img.classList.remove('loading');
        img.classList.add('loaded');
      };
      img.onerror = () => {
        img.classList.remove('loading');
        img.classList.add('error');
      };
    });
  }

  initPagination() {
    if (!this.dom.pagination) {
      this.dom.pagination = document.createElement('div');
      this.dom.pagination.className =
        'swiper-pagination is-horizontal is-clickable is-bullet';
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
      const bullet = document.createElement('span');
      bullet.className = 'swiper-pagination-indicator swiper-pagination-bullet';
      bullet.setAttribute('role', 'button');
      bullet.setAttribute('tabindex', '0');
      bullet.setAttribute('aria-label', `Go to slide ${index + 1}`);
      this.cleanup.events.on(`bullet:${index}:click`, bullet, 'click', () => {
        this.slideTo(this.props.loop ? index + 1 : index);
      });
      this.cleanup.events.on(
        `bullet:${index}:keydown`,
        bullet,
        'keydown',
        (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          this.slideTo(this.props.loop ? index + 1 : index);
        }
      );
      this.dom.bullets.push(bullet);
      this.dom.pagination.appendChild(bullet);
    }

    this.cleanup.bindings = createRoot((dispose) => {
      this.dom.bullets.forEach((bullet, i) => {
        bindClass(bullet, 'is-active', () => this.toRealIndex() === i);
        // bindClass(bullet, 'active', () => this.toRealIndex() === i);
        bindAttr(bullet, 'aria-current', () =>
          String(this.toRealIndex() === i)
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
          () => this.state.index <= 0
        );
        bindAttr(this.dom.prevButton, 'disabled', () =>
          this.state.index <= 0 ? '' : null
        );
        bindClass(
          this.dom.nextButton,
          'is-disabled',
          () => this.state.index >= this.dom.slides.length - 1
        );
        bindAttr(this.dom.nextButton, 'disabled', () =>
          this.state.index >= this.dom.slides.length - 1 ? '' : null
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
      button = document.createElement('button');
      button.type = 'button';
      button.className = className;
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
    if (this.runtime.timer) return;
    this.runtime.timer = setInterval(() => this.next(), this.props.delay);
  }

  pause() {
    if (!this.runtime.timer) return;
    clearInterval(this.runtime.timer);
    this.runtime.timer = null;
  }

  resume() {
    if (this.props.autoplay && !this.runtime.timer) this.play();
  }
}

export default Swiper;

import { resolveOptions, validateParam } from '../utilities/core.js';
import {
  all,
  canRenderDOM,
  isElement,
  isRenderableContent,
  normalizeContentNodes,
  q,
} from '../utilities/dom.js';
import { createEventManager } from '../utilities/events.js';
import { icon } from './icons.js';

const SWIPE_THRESHOLD = 6;

const SWIPER_OPTIONS_SCHEMA = {
  data: {
    default: null,
    validate: (value) => value == null || Array.isArray(value),
    message: 'expects an array or null.',
  },
  loop: { default: false, type: 'boolean' },
  autoplay: { default: false, type: 'boolean' },
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
 * 轻量轮播组件。
 *
 * 支持链接 slide、图片 lazyload、分页、导航、loop 和桌面/移动端拖拽滑动。
 */
class Swiper {
  /**
   * 创建轮播实例。
   * @param {HTMLElement|string} container 根节点或选择器。
   * @param {object} [options={}] Swiper 配置。
   */
  constructor(container, options = {}) {
    if (!canRenderDOM()) {
      throw new Error('Swiper: DOM render environment is required.');
    }

    const resolvedOptions = resolveOptions(
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

    this.settings = {
      options: resolvedOptions,
    };

    const wrapper = hasData
      ? this.createDataView(mountRoot, resolvedOptions.data)
      : q('.swiper-wrapper', mountRoot);
    if (!wrapper) throw new Error('Swiper: .swiper-wrapper not found.');

    const slides = all('.swiper-slide', wrapper);

    this.dom = {
      root: mountRoot,
      wrapper,
      slides,
      pagination: q('.swiper-pagination', mountRoot),
      prevButton: q('.swiper-navigation.is-prev', mountRoot),
      nextButton: q('.swiper-navigation.is-next', mountRoot),
      bullets: [],
      createdPagination: false,
      createdPrevButton: false,
      createdNextButton: false,
      createdRoot,
      createdSlides: hasData,
      mountTarget,
    };
    this.runtime = {
      realCount: slides.length,
      index: 0,
      transform: 0,
      width: 0,
      timer: null,
      logs: [],
      startTarget: null,
      touching: false,
      scrolling: false,
      swiping: false,
      animating: false,
      clickPrevented: false,
      destroyed: false,
    };
    this.cleanup = {
      events: createEventManager(),
    };

    if (this.slides.length === 0) return;

    this.init();
  }

  createDataView(root, data) {
    const items = this.normalizeData(data);
    const wrapper = document.createElement('div');
    wrapper.className = 'swiper-wrapper';
    root.textContent = '';

    items.forEach((item, index) => {
      wrapper.appendChild(this.createDataSlide(item, index, this.config));
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

  createDataSlide(item, index, options = this.config) {
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
      if (options.lazyload) img.dataset.lazy = item.image;
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

  get config() {
    return this.settings?.options || {};
  }

  set config(value) {
    if (!this.settings) this.settings = {};
    this.settings.options = value || {};
  }

  get el() {
    return this.dom?.root || null;
  }

  set el(value) {
    if (!this.dom) this.dom = {};
    this.dom.root = value;
  }

  get wrapper() {
    return this.dom?.wrapper || null;
  }

  set wrapper(value) {
    if (!this.dom) this.dom = {};
    this.dom.wrapper = value;
  }

  get slides() {
    return this.dom?.slides || [];
  }

  set slides(value) {
    if (!this.dom) this.dom = {};
    this.dom.slides = Array.isArray(value) ? value : [];
  }

  get bullets() {
    return this.dom?.bullets || [];
  }

  set bullets(value) {
    if (!this.dom) this.dom = {};
    this.dom.bullets = Array.isArray(value) ? value : [];
  }

  get pagination() {
    return this.dom?.pagination || null;
  }

  set pagination(value) {
    if (!this.dom) this.dom = {};
    this.dom.pagination = value;
  }

  get prevButton() {
    return this.dom?.prevButton || null;
  }

  set prevButton(value) {
    if (!this.dom) this.dom = {};
    this.dom.prevButton = value;
  }

  get nextButton() {
    return this.dom?.nextButton || null;
  }

  set nextButton(value) {
    if (!this.dom) this.dom = {};
    this.dom.nextButton = value;
  }

  get realCount() {
    return this.runtime?.realCount || 0;
  }

  set realCount(value) {
    if (!this.runtime) this.runtime = {};
    this.runtime.realCount = Number(value) || 0;
  }

  get index() {
    return this.runtime?.index || 0;
  }

  set index(value) {
    if (!this.runtime) this.runtime = {};
    this.runtime.index = Number(value) || 0;
  }

  get transform() {
    return this.runtime?.transform || 0;
  }

  set transform(value) {
    if (!this.runtime) this.runtime = {};
    this.runtime.transform = Number(value) || 0;
  }

  get width() {
    return this.runtime?.width || 0;
  }

  set width(value) {
    if (!this.runtime) this.runtime = {};
    this.runtime.width = Number(value) || 0;
  }

  get timer() {
    return this.runtime?.timer || null;
  }

  set timer(value) {
    if (!this.runtime) this.runtime = {};
    this.runtime.timer = value;
  }

  get logs() {
    return this.runtime?.logs || [];
  }

  set logs(value) {
    if (!this.runtime) this.runtime = {};
    this.runtime.logs = Array.isArray(value) ? value : [];
  }

  get touching() {
    return !!this.runtime?.touching;
  }

  set touching(value) {
    if (!this.runtime) this.runtime = {};
    this.runtime.touching = !!value;
  }

  get scrolling() {
    return !!this.runtime?.scrolling;
  }

  set scrolling(value) {
    if (!this.runtime) this.runtime = {};
    this.runtime.scrolling = !!value;
  }

  get swiping() {
    return !!this.runtime?.swiping;
  }

  set swiping(value) {
    if (!this.runtime) this.runtime = {};
    this.runtime.swiping = !!value;
  }

  get animating() {
    return !!this.runtime?.animating;
  }

  set animating(value) {
    if (!this.runtime) this.runtime = {};
    this.runtime.animating = !!value;
  }

  init() {
    this.updateSize();

    if (this.config.loop && this.slides.length > 1) {
      this.initLoop();
    }

    this.setupStyles();

    this.index = this.config.loop ? 1 : 0;
    this.transform = -this.index * this.width;
    this.render(false);
    this.bindEvents();

    if (this.config.pagination) this.initPagination();
    if (this.config.navigation) this.initNavigation();
    this.updateControls();
    if (this.config.lazyload) this.loadImages();
    if (this.config.autoplay) this.play();
  }

  updateSize() {
    this.width = this.el.clientWidth || this.el.offsetWidth;
  }

  refreshSlides() {
    this.slides = all('.swiper-slide', this.wrapper);
  }

  initLoop() {
    const first = this.slides[0].cloneNode(true);
    const last = this.slides[this.slides.length - 1].cloneNode(true);

    first.setAttribute('data-clone', '');
    last.setAttribute('data-clone', '');

    this.wrapper.appendChild(first);
    this.wrapper.insertBefore(last, this.slides[0]);
    this.refreshSlides();
  }

  setupStyles() {
    this.wrapper.style.display = 'flex';
    this.wrapper.style.willChange = 'transform';

    this.slides.forEach((slide) => {
      slide.style.flexShrink = '0';
      slide.style.width = `${this.width}px`;
    });
  }

  bindEvents() {
    this.cleanup.events.on(
      'touchstart',
      this.wrapper,
      'touchstart',
      (event) => {
        if (event.touches[0]) this.onStart(event.touches[0], event.target);
      },
      { passive: true }
    );
    this.cleanup.events.on(
      'touchmove',
      this.wrapper,
      'touchmove',
      (event) => {
        if (event.touches[0]) this.onMove(event.touches[0], event);
      },
      { passive: false }
    );
    this.cleanup.events.on('touchend', this.wrapper, 'touchend', (event) => {
      if (event.changedTouches[0]) this.pushLog(event.changedTouches[0]);
      this.onEnd();
    });
    this.cleanup.events.on('touchcancel', this.wrapper, 'touchcancel', () => {
      this.resetDrag(true);
    });
    this.cleanup.events.on('window:touchcancel', window, 'touchcancel', () => {
      this.resetDrag(true);
    });
    this.cleanup.events.on('mousedown', this.wrapper, 'mousedown', (event) => {
      if (event.button !== 0) return;
      this.onStart(event, event.target);
      this.wrapper.style.cursor = 'grabbing';
    });
    this.cleanup.events.on('mousemove', this.wrapper, 'mousemove', (event) => {
      if (event.buttons === 1) this.onMove(event, event);
    });
    this.cleanup.events.on('mouseup', this.wrapper, 'mouseup', (event) => {
      this.wrapper.style.cursor = 'grab';
      this.pushLog(event);
      this.onEnd();
    });
    this.cleanup.events.on('window:mouseup', window, 'mouseup', (event) => {
      if (!this.touching) return;
      this.wrapper.style.cursor = 'grab';
      this.pushLog(event);
      this.onEnd();
    });
    this.cleanup.events.on(
      'wrapper:mouseleave',
      this.wrapper,
      'mouseleave',
      () => {
        if (!this.touching) return;
        this.wrapper.style.cursor = 'grab';
        this.onEnd();
      }
    );
    this.cleanup.events.on(
      'click',
      this.wrapper,
      'click',
      (event) => {
        if (!this.runtime.clickPrevented || !this.config.preventClick) return;
        event.preventDefault();
        event.stopPropagation();
        this.runtime.clickPrevented = false;
      },
      { capture: true }
    );
    this.cleanup.events.on('dragstart', this.wrapper, 'dragstart', (event) =>
      event.preventDefault()
    );
    this.cleanup.events.on('transitionend', this.wrapper, 'transitionend', () =>
      this.onTransitionEnd()
    );
    this.cleanup.events.on('root:mouseenter', this.el, 'mouseenter', () =>
      this.pause()
    );
    this.cleanup.events.on('root:mouseleave', this.el, 'mouseleave', () =>
      this.resume()
    );
  }

  onStart(point, target = null) {
    if (this.animating) return;

    this.logs = [];
    this.pushLog(point);
    this.runtime.startTarget = target;
    this.touching = true;
    this.scrolling = false;
    this.swiping = false;
    this.runtime.clickPrevented = false;

    this.pause();
    this.wrapper.style.transition = 'none';
  }

  onMove(point, event) {
    if (!this.touching || this.scrolling || this.animating) return;

    this.pushLog(point);

    const offset = this.getOffset();
    const ax = Math.abs(offset.x);
    const ay = Math.abs(offset.y);
    if (ax < SWIPE_THRESHOLD && ay < SWIPE_THRESHOLD) return;

    if (!this.swiping) {
      const angle = (Math.atan2(ay, ax) * 180) / Math.PI;

      if (angle < this.config.touchAngle) {
        this.swiping = true;
        this.runtime.clickPrevented = isInteractiveTarget(
          this.runtime.startTarget
        );
      } else {
        this.scrolling = true;
        this.resetDrag(true);
        return;
      }
    }

    if (this.swiping) {
      event.preventDefault();
      this.transform =
        -this.index * this.width + offset.x * this.config.touchRatio;
      this.render(false);
    }
  }

  onEnd() {
    if (!this.touching) return;

    this.touching = false;

    if (!this.swiping) {
      this.resetDrag(true);
      return;
    }

    const duration = this.getDuration();
    const offset = this.getOffset();
    const ox = offset.x;
    let target = this.index;

    if (duration > this.config.longSwipesMs) {
      const steps = Math.ceil(
        Math.abs(ox) / this.width - this.config.longSwipesRatio
      );
      if (steps > 0) target = this.index + steps * (ox > 0 ? -1 : 1);
    } else {
      const distance = Math.abs(ox) / this.width;
      const slides =
        distance >= this.config.longSwipesRatio
          ? Math.max(1, Math.ceil(distance - this.config.longSwipesRatio))
          : 0;
      if (slides > 0)
        target = ox > 0 ? this.index - slides : this.index + slides;
    }

    this.slideTo(target);
    this.logs = [];
    this.resume();
  }

  resetDrag(animate = true) {
    const target = this.index === 0 ? 0 : -this.index * this.width;
    const shouldAnimate = animate && this.transform !== target;

    this.touching = false;
    this.scrolling = false;
    this.swiping = false;
    this.logs = [];
    this.runtime.startTarget = null;
    this.transform = target;
    this.render(shouldAnimate);
    this.resume();
  }

  onTransitionEnd() {
    this.animating = false;

    if (this.config.loop) {
      if (this.index === 0) {
        this.index = this.realCount;
        this.transform = -this.index * this.width;
        this.render(false);
      } else if (this.index === this.slides.length - 1) {
        this.index = 1;
        this.transform = -this.index * this.width;
        this.render(false);
      }
    }

    this.updateControls();
  }

  pushLog(point) {
    this.logs.push({
      x: point.pageX ?? point.clientX ?? 0,
      y: point.pageY ?? point.clientY ?? 0,
      time: Date.now(),
    });
    if (this.logs.length > 5) this.logs.shift();
  }

  getDuration() {
    if (this.logs.length === 0) return 0;
    return this.logs[this.logs.length - 1].time - this.logs[0].time;
  }

  getOffset() {
    if (this.logs.length === 0) return { x: 0, y: 0 };
    const first = this.logs[0];
    const last = this.logs[this.logs.length - 1];
    return { x: last.x - first.x, y: last.y - first.y };
  }

  toRealIndex(index = this.index) {
    if (!this.config.loop) return index;
    if (index === 0) return this.realCount - 1;
    if (index === this.slides.length - 1) return 0;
    return index - 1;
  }

  slideTo(idx) {
    if (this.animating) return;

    let target = idx;

    if (this.config.loop) {
      if (idx < 0) target = 0;
      else if (idx >= this.slides.length) target = this.slides.length - 1;
    } else {
      target = Math.max(0, Math.min(idx, this.slides.length - 1));
    }

    this.index = target;
    this.transform = -target * this.width;
    this.render(true);
    this.updateControls();

    if (this.config.lazyload) this.loadImages();
  }

  next() {
    if (this.animating) return;
    this.slideTo(this.index + 1);
  }

  prev() {
    if (this.animating) return;
    this.slideTo(this.index - 1);
  }

  render(animate) {
    if (animate) {
      this.wrapper.style.transition = `transform ${this.config.speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      this.animating = true;
    } else {
      this.wrapper.style.transition = 'none';
      this.animating = false;
    }

    this.wrapper.style.transform = `translate3d(${this.transform}px, 0, 0)`;
  }

  loadImages() {
    const indices = [this.index];
    if (this.index > 0) indices.push(this.index - 1);
    if (this.index < this.slides.length - 1) indices.push(this.index + 1);

    indices.forEach((index) => {
      const slide = this.slides[index];
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
    if (!this.pagination) {
      this.pagination = document.createElement('div');
      this.pagination.className =
        'swiper-pagination is-horizontal is-clickable is-bullet';
      this.el.appendChild(this.pagination);
      this.dom.createdPagination = true;
    } else {
      this.pagination.classList.add(
        'is-horizontal',
        'is-clickable',
        'is-bullet'
      );
    }

    this.pagination.textContent = '';
    this.bullets = [];

    for (let index = 0; index < this.realCount; index++) {
      const bullet = document.createElement('span');
      bullet.className = 'swiper-pagination-indicator swiper-pagination-bullet';
      bullet.setAttribute('role', 'button');
      bullet.setAttribute('tabindex', '0');
      bullet.setAttribute('aria-label', `Go to slide ${index + 1}`);
      this.cleanup.events.on(`bullet:${index}:click`, bullet, 'click', () => {
        this.slideTo(this.config.loop ? index + 1 : index);
      });
      this.cleanup.events.on(
        `bullet:${index}:keydown`,
        bullet,
        'keydown',
        (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          this.slideTo(this.config.loop ? index + 1 : index);
        }
      );
      this.bullets.push(bullet);
      this.pagination.appendChild(bullet);
    }
  }

  initNavigation() {
    this.prevButton = this.ensureNavigation('prev', 'arrow-left');
    this.nextButton = this.ensureNavigation('next', 'arrow-right');

    this.cleanup.events.on('nav:prev', this.prevButton, 'click', () =>
      this.prev()
    );
    this.cleanup.events.on('nav:next', this.nextButton, 'click', () =>
      this.next()
    );
  }

  ensureNavigation(direction, iconName) {
    const key =
      direction === 'prev' ? 'createdPrevButton' : 'createdNextButton';
    const className = `swiper-navigation is-${direction}`;
    let button = q(`.swiper-navigation.is-${direction}`, this.el);

    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      this.el.appendChild(button);
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

  updateControls() {
    this.updatePagination();
    this.updateNavigation();
  }

  updatePagination() {
    if (!this.bullets.length) return;

    const active = this.toRealIndex();
    this.bullets.forEach((bullet, index) => {
      const isActive = index === active;
      bullet.classList.toggle('is-active', isActive);
      bullet.classList.toggle('active', isActive);
      bullet.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  updateNavigation() {
    if (this.config.loop) return;

    const atStart = this.index <= 0;
    const atEnd = this.index >= this.slides.length - 1;

    if (this.prevButton) {
      this.prevButton.classList.toggle('is-disabled', atStart);
      this.prevButton.toggleAttribute('disabled', atStart);
    }
    if (this.nextButton) {
      this.nextButton.classList.toggle('is-disabled', atEnd);
      this.nextButton.toggleAttribute('disabled', atEnd);
    }
  }

  play() {
    if (this.timer) return;
    this.timer = setInterval(() => this.next(), this.config.delay);
  }

  pause() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  resume() {
    if (this.config.autoplay && !this.timer) this.play();
  }

  update() {
    this.updateSize();
    this.setupStyles();
    this.transform = -this.index * this.width;
    this.render(false);
    this.updateControls();
  }

  destroy() {
    if (this.runtime?.destroyed) return;
    this.runtime.destroyed = true;

    this.pause();
    this.cleanup.events.clear();
    all('[data-clone]', this.wrapper).forEach((slide) => slide.remove());
    if (this.dom.createdPagination) this.pagination?.remove();
    if (this.dom.createdPrevButton) this.prevButton?.remove();
    if (this.dom.createdNextButton) this.nextButton?.remove();
    if (this.dom.createdRoot) this.el?.remove();
    this.dom = {
      root: null,
      wrapper: null,
      slides: [],
      pagination: null,
      prevButton: null,
      nextButton: null,
      bullets: [],
      createdRoot: false,
      createdSlides: false,
      mountTarget: null,
    };
    this.runtime = {
      destroyed: true,
    };
    this.settings = null;
  }
}

export default Swiper;

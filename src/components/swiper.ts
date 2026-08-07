import {
  bindAttr,
  bindClass,
  createDeepStore,
  createRoot,
  h,
} from 'vanilla-signal';

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
} from '../core/Component.ts';
import { icon } from '../primitives/icons.ts';
import { joinClasses } from '../utilities/class-name.ts';
import {
  all,
  isElement,
  normalizeContentNodes,
  q,
  type RenderableContent,
} from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import {
  createStateSync,
  stateSnapshot,
  trackStoreVersion,
} from '../utilities/scheduler.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';

const SWIPE_THRESHOLD = 6;
const AUTOPLAY_DELAY_FLOOR = 16;

export interface SwiperClassNames {
  root: string;
  wrapper: string;
  slide: string;
  image: string;
  title: string;
  pagination: string;
  paginationHorizontal: string;
  paginationClickable: string;
  paginationBulletGroup: string;
  indicator: string;
  bullet: string;
  navigation: string;
  prev: string;
  next: string;
  active: string;
  disabled: string;
  loading: string;
  loaded: string;
  error: string;
}

export type SwiperClassNameConfig = Partial<SwiperClassNames>;

export interface SwiperDataItem extends Record<string, unknown> {
  image?: string | null;
  url?: string | null;
  title?: string | null;
  sort?: number | null;
  blank?: boolean | null;
  children?: RenderableContent<SwiperSlideContext> | null;
}

interface NormalizedSwiperDataItem extends SwiperDataItem {
  blank: boolean;
  index: number;
}

export interface SwiperSlideContext {
  swiper: Swiper;
  item: NormalizedSwiperDataItem;
  index: number;
}

export interface SwiperProps extends Record<string, unknown> {
  id?: string | null;
  data?: SwiperDataItem[];
  loop?: boolean;
  autoplay?: boolean;
  delay?: number;
  lazyload?: boolean;
  pagination?: boolean;
  navigation?: boolean;
  speed?: number;
  touchRatio?: number;
  touchAngle?: number;
  longSwipesMs?: number;
  longSwipesRatio?: number;
  preventClick?: boolean;
  className?: SwiperClassNameConfig;
}

interface ResolvedSwiperProps extends Record<string, unknown> {
  id: string | null;
  data: SwiperDataItem[];
  loop: boolean;
  autoplay: boolean;
  delay: number;
  lazyload: boolean;
  pagination: boolean;
  navigation: boolean;
  speed: number;
  touchRatio: number;
  touchAngle: number;
  longSwipesMs: number;
  longSwipesRatio: number;
  preventClick: boolean;
  className: SwiperClassNames;
}

interface SwiperState extends Record<string, unknown> {
  data: SwiperDataItem[];
  index: number;
  trackIndex: number;
  transform: number;
  animating: boolean;
  width: number;
}

interface SwiperDOM extends ComponentDOM {
  root: HTMLElement | null;
  createdRoot: boolean;
  wrapper: HTMLElement | null;
  slides: HTMLElement[];
  pagination: HTMLElement | null;
  prevButton: HTMLButtonElement | null;
  nextButton: HTMLButtonElement | null;
  bullets: HTMLButtonElement[];
  createdPagination: boolean;
  createdPrevButton: boolean;
  createdNextButton: boolean;
}

interface SwipeLog {
  x: number;
  y: number;
  time: number;
}

interface SwipePoint {
  pageX?: number;
  pageY?: number;
  clientX?: number;
  clientY?: number;
}

interface SwiperRuntime extends ComponentRuntime {
  built: boolean;
  logs: SwipeLog[];
  startTarget: EventTarget | null;
  touching: boolean;
  scrolling: boolean;
  swiping: boolean;
  clickPrevented: boolean;
  timer: ReturnType<typeof setInterval> | null;
  mountRefreshId: number | null;
  imageCleanups: Set<() => void>;
  realCount: number;
}

interface SwiperCleanupExtras {
  bindings?: (() => void) | null;
  navBindings?: (() => void) | null;
  data?: (() => void) | null;
}

type SwiperDirection = 'prev' | 'next';
type CreatedNavigationKey = 'createdPrevButton' | 'createdNextButton';

const DEFAULT_CLASS_NAMES: SwiperClassNames = {
  root: 'j-swiper',
  wrapper: 'swiper-wrapper',
  slide: 'swiper-slide',
  image: 'swiper-image',
  title: 'swiper-slide-title',
  pagination: 'swiper-pagination',
  paginationHorizontal: 'is-horizontal',
  paginationClickable: 'is-clickable',
  paginationBulletGroup: 'is-bullet',
  indicator: 'swiper-pagination-indicator',
  bullet: 'swiper-pagination-bullet',
  navigation: 'swiper-navigation',
  prev: 'is-prev',
  next: 'is-next',
  active: 'is-active',
  disabled: 'is-disabled',
  loading: 'loading',
  loaded: 'loaded',
  error: 'error',
};

const SWIPER_OPTIONS_SCHEMA = {
  id: {
    default: null,
    types: ['string', 'null'],
    nonEmpty: true,
    normalize: (value: unknown) =>
      typeof value === 'string' ? value.trim() : value,
  },
  data: { default: [], type: 'array' },
  loop: { default: true, type: 'boolean' },
  autoplay: { default: true, type: 'boolean' },
  delay: {
    default: 3000,
    type: 'number',
    min: 0,
  },
  lazyload: { default: true, type: 'boolean' },
  pagination: { default: true, type: 'boolean' },
  navigation: { default: true, type: 'boolean' },
  speed: {
    default: 300,
    type: 'number',
    min: 0,
  },
  touchRatio: {
    default: 1,
    type: 'number',
    greaterThan: 0,
  },
  touchAngle: {
    default: 45,
    type: 'number',
    min: 0,
    max: 90,
  },
  longSwipesMs: {
    default: 300,
    type: 'number',
    min: 0,
  },
  longSwipesRatio: {
    default: 0.05,
    type: 'number',
    min: 0,
    max: 1,
  },
  preventClick: { default: true, type: 'boolean' },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
} satisfies ResolveSchema<SwiperProps>;

const SWIPER_DATA_ITEM_RULE = {
  type: 'plainObject',
  shape: {
    image: ['string', 'null', 'undefined'],
    url: ['string', 'null', 'undefined'],
    title: ['string', 'null', 'undefined'],
    sort: ['number', 'null', 'undefined'],
    blank: ['boolean', 'null', 'undefined'],
    children: 'renderable',
  },
};

const SWIPER_STATE_SCHEMA = {
  data: SWIPER_OPTIONS_SCHEMA.data,
  index: { type: 'number' },
  trackIndex: { type: 'number' },
  transform: { type: 'number' },
  animating: { type: 'boolean' },
  width: { type: 'number' },
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    !!target.closest(
      'a, button, input, textarea, select, label, [data-swiper-ignore]'
    )
  );
}

function normalizeNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getRenderableNodes(
  content: RenderableContent<SwiperSlideContext>,
  context: SwiperSlideContext
): Node[] {
  return normalizeContentNodes(content, context);
}

function cloneData(data: SwiperDataItem[] | undefined): SwiperDataItem[] {
  if (!Array.isArray(data)) return [];
  return data.map((item) => ({ ...item }));
}

function normalizeProps(input: SwiperProps = {}): ResolvedSwiperProps {
  const props = resolveProps(
    input,
    SWIPER_OPTIONS_SCHEMA,
    'Swiper.props'
  ) as ResolvedSwiperProps;
  return {
    ...props,
    id: props.id?.trim() || null,
    data: cloneData(props.data),
    className: { ...props.className },
  };
}

function findUniqueElementById(id: string): HTMLElement | null {
  const matches = Array.from(
    document.querySelectorAll<HTMLElement>('[id]')
  ).filter((element) => element.id === id);
  validateParam(
    'id',
    matches,
    {
      type: 'array',
      maxLength: 1,
    },
    'Swiper.props'
  );
  return matches[0] || null;
}

/**
 * 轻量轮播组件，继承 Component。
 *
 * 支持链接 slide、图片 lazyload、分页、导航、loop 和桌面/移动端拖拽滑动。
 * 使用 vanilla-signal 响应式管理 pagination 和 navigation 状态。
 */
class SwiperComponent extends Component<
  ResolvedSwiperProps,
  SwiperState,
  SwiperDOM
> {
  declare props: ResolvedSwiperProps;
  declare state: SwiperState;
  declare dom: SwiperDOM;
  declare runtime: SwiperRuntime;
  declare cleanup: Component['cleanup'] & SwiperCleanupExtras;

  /**
   * 创建轮播实例。
   * @param {object} [props={}] Swiper 配置。
   */
  constructor(props: SwiperProps = {}) {
    const resolvedOptions = normalizeProps(props);

    super(resolvedOptions);

    this.dom.createdRoot = false;
    this.dom.wrapper = null;
    this.dom.slides = [];
    this.dom.pagination = null;
    this.dom.prevButton = null;
    this.dom.nextButton = null;
    this.dom.bullets = [];
    this.dom.createdPagination = false;
    this.dom.createdPrevButton = false;
    this.dom.createdNextButton = false;

    this.cleanup.data = null;
    this.cleanup.bindings = null;
    this.cleanup.navBindings = null;

    this.runtime.built = false;
    this.runtime.logs = [];
    this.runtime.startTarget = null;
    this.runtime.touching = false;
    this.runtime.scrolling = false;
    this.runtime.swiping = false;
    this.runtime.clickPrevented = false;
    this.runtime.timer = null;
    this.runtime.mountRefreshId = null;
    this.runtime.imageCleanups = new Set();

    this.runtime.realCount = 0;

    this.state = createDeepStore({
      data: cloneData(this.props.data),
      index: 0,
      trackIndex: 0,
      transform: 0,
      animating: false,
      width: 0,
    });
  }

  /**
   * 构建 Swiper DOM。
   * @returns {Swiper} 当前实例。
   */
  build(): this {
    if (this.runtime.destroyed)
      throw new Error('Swiper.build: instance destroyed');
    if (this.runtime.built) return this;

    const boundRoot = this.props.id
      ? findUniqueElementById(this.props.id)
      : null;
    const mountRoot =
      boundRoot ||
      (h('div', {
        id: this.props.id || randomId(),
        className: this.props.className.root,
        'data-swiper': 'root',
      }) as HTMLElement);

    try {
      this.dom.root = mountRoot;
      this.dom.createdRoot = !boundRoot;

      const wrapper = this.dom.createdRoot
        ? this.createDataView(mountRoot, this.state.data)
        : q<HTMLElement>('[data-swiper-wrapper]', mountRoot);
      validateParam(
        'wrapper',
        wrapper,
        {
          validate: isElement,
          message: 'expects [data-swiper-wrapper] in the root element.',
        },
        'Swiper'
      );

      this.dom.wrapper = wrapper as HTMLElement;
      this.dom.slides = all<HTMLElement>(
        '[data-swiper-slide]',
        this.dom.wrapper
      );
      this.dom.pagination = q<HTMLElement>(
        '[data-swiper-pagination]',
        mountRoot
      );
      this.dom.prevButton = q<HTMLButtonElement>(
        '[data-action="prev"]',
        mountRoot
      );
      this.dom.nextButton = q<HTMLButtonElement>(
        '[data-action="next"]',
        mountRoot
      );
      this.dom.bullets = [];
      this.dom.createdPagination = false;
      this.dom.createdPrevButton = false;
      this.dom.createdNextButton = false;

      this.runtime.realCount = this.dom.slides.length;
      this.runtime.built = true;

      if (this.dom.slides.length > 0) this.onInit();
      if (this.dom.createdRoot) this.bindStateData();
      this.queueMountRefresh();
    } catch (error) {
      this.destroy();
      throw error;
    }

    this.emit('init', this.props);
    return this;
  }

  set index(v: unknown) {
    this.setState({ index: normalizeNumber(v) });
  }

  set trackIndex(v: unknown) {
    this.setState({ trackIndex: normalizeNumber(v) });
  }

  set transform(v: unknown) {
    this.setState({ transform: normalizeNumber(v) });
  }

  set animating(v: unknown) {
    this.setState({ animating: !!v });
  }

  set width(v: unknown) {
    this.setState({ width: normalizeNumber(v) });
  }

  get realCount(): number {
    if (this.runtime?.destroyed) return 0;
    return this.runtime?.realCount || 0;
  }

  get realIndex(): number {
    return this.toRealIndex();
  }

  private assertBuilt(method: string): void {
    if (!this.runtime.built) {
      throw new Error(`Swiper.${method}: call build() first.`);
    }
  }

  private createDataView(
    root: HTMLElement,
    data: SwiperDataItem[]
  ): HTMLElement {
    const items = this.normalizeData(data);
    const wrapper = h('div', {
      className: this.props.className.wrapper,
      'data-swiper-wrapper': '',
      'aria-live': 'polite',
    }) as HTMLElement;
    root.textContent = '';

    items.forEach((item, index) => {
      wrapper.appendChild(this.createDataSlide(item, index));
    });

    root.appendChild(wrapper);
    return wrapper;
  }

  private bindStateData(): void {
    if (this.cleanup.data) return;

    this.cleanup.data = createStateSync(
      () => trackStoreVersion(this.state.data),
      (data) => this.syncStateData(data)
    );
  }

  private syncStateData(data: SwiperDataItem[]): void {
    if (!this.runtime.built || !this.dom.createdRoot) return;
    const nextData = cloneData(stateSnapshot(data));
    validateParam('data', nextData, SWIPER_OPTIONS_SCHEMA.data, 'Swiper.state');

    const realIndex = this.state.index;
    let wrapper = this.dom.wrapper;
    if (!wrapper && this.dom.root) {
      wrapper = this.createDataView(this.dom.root, nextData);
      this.dom.wrapper = wrapper;
    }
    if (!wrapper) return;

    this.pause();
    this.clearImageCleanups();
    this.cleanup.bindings?.();
    this.cleanup.bindings = null;
    this.cleanup.navBindings?.();
    this.cleanup.navBindings = null;
    this.cleanup.events.clear();

    all('[data-clone]', wrapper).forEach((slide) => slide.remove());
    wrapper.textContent = '';
    this.normalizeData(nextData).forEach((item, index) => {
      wrapper.appendChild(this.createDataSlide(item, index));
    });
    this.refreshSlides();
    this.runtime.realCount = this.dom.slides.length;
    this.setState({
      index: Math.min(realIndex, Math.max(0, this.realCount - 1)),
    });
    this.reInitView();
  }

  private normalizeData(data: SwiperDataItem[]): NormalizedSwiperDataItem[] {
    data.forEach((item, index) => {
      validateParam(
        String(index),
        item,
        SWIPER_DATA_ITEM_RULE,
        'Swiper.options.data'
      );
    });

    const items: NormalizedSwiperDataItem[] = data.map((item, index) => ({
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

  private createDataSlide(
    item: NormalizedSwiperDataItem,
    index: number
  ): HTMLElement {
    const slide = h(item.url ? 'a' : 'div', {
      className: this.props.className.slide,
      href: item.url || undefined,
      target: item.url ? (item.blank ? '_blank' : '_self') : undefined,
      'data-swiper-slide': String(index),
      'data-swiper-index': String(index),
      role: 'group',
      'aria-label': `Slide ${index + 1}`,
    }) as HTMLElement;

    if (item.children != null) {
      slide.append(
        ...getRenderableNodes(item.children, { swiper: this, item, index })
      );
      return slide;
    }

    if (item.image) {
      const img = h('img', {
        className: this.props.className.image,
        alt: item.title || '',
        loading: 'lazy',
      }) as HTMLImageElement;
      if (this.props.lazyload) img.dataset.lazy = item.image;
      else img.src = item.image;
      slide.appendChild(img);
    }

    if (item.title) {
      slide.appendChild(
        h('span', {
          className: this.props.className.title,
          children: item.title,
        }) as HTMLElement
      );
    }

    return slide;
  }

  protected onInit(): void {
    if (!this.dom.root || !this.dom.wrapper) return;
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

  protected onDestroy(): void {
    this.pause();
    this.cancelMountRefresh();
    this.clearImageCleanups();
    this.cleanup.events.clear();
    this.cleanup.data?.();
    this.cleanup.data = null;
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
    this.runtime.built = false;
  }

  private updateSize(): void {
    this.assertBuilt('updateSize');
    if (!this.dom.root) return;
    const width = this.dom.root.clientWidth || this.dom.root.offsetWidth;
    if (width > 0 || !this.dom.root.isConnected || this.state.width === 0) {
      this.width = width;
    }
  }

  refresh(): this {
    this.assertBuilt('refresh');
    this.updateSize();
    this.setupStyles();
    this.setTrackIndex(this.trackIndexForRealIndex(this.state.index), false);
    if (this.props.lazyload) this.loadImages();
    if (this.props.autoplay && this.hasLayout()) this.resume();
    else this.pause();
    return this;
  }

  private hasLayout(): boolean {
    return !!this.dom.root?.isConnected && this.state.width > 0;
  }

  private syncLayout(): boolean {
    this.updateSize();
    if (!this.hasLayout()) return false;
    this.setupStyles();
    return true;
  }

  private queueMountRefresh(): void {
    if (!this.dom.createdRoot || !this.dom.root || this.runtime.mountRefreshId)
      return;
    if (typeof requestAnimationFrame !== 'function') {
      queueMicrotask(() => {
        if (
          !this.runtime.destroyed &&
          this.runtime.built &&
          this.dom.root?.isConnected
        ) {
          this.refresh();
        }
      });
      return;
    }
    this.runtime.mountRefreshId = requestAnimationFrame(() => {
      this.runtime.mountRefreshId = null;
      if (
        !this.runtime.destroyed &&
        this.runtime.built &&
        this.dom.root?.isConnected
      ) {
        this.refresh();
      }
    });
  }

  private cancelMountRefresh(): void {
    if (
      this.runtime.mountRefreshId == null ||
      typeof cancelAnimationFrame !== 'function'
    ) {
      this.runtime.mountRefreshId = null;
      return;
    }
    cancelAnimationFrame(this.runtime.mountRefreshId);
    this.runtime.mountRefreshId = null;
  }

  private refreshSlides(): void {
    if (!this.dom.wrapper) return;
    this.dom.slides = all<HTMLElement>('[data-swiper-slide]', this.dom.wrapper);
    this.runtime.realCount = this.dom.slides.filter(
      (slide) => !slide.hasAttribute('data-clone')
    ).length;
  }

  private initLoop(): void {
    if (!this.dom.wrapper || this.dom.slides.length === 0) return;

    const first = this.dom.slides[0].cloneNode(true) as HTMLElement;
    const last = this.dom.slides[this.dom.slides.length - 1].cloneNode(
      true
    ) as HTMLElement;

    first.setAttribute('data-clone', '');
    last.setAttribute('data-clone', '');
    first.removeAttribute('data-swiper-index');
    last.removeAttribute('data-swiper-index');

    this.dom.wrapper.appendChild(first);
    this.dom.wrapper.insertBefore(last, this.dom.slides[0]);
    this.refreshSlides();
  }

  private setupStyles(): void {
    if (!this.dom.root) return;
    this.dom.root.style.setProperty(
      '--swiper-slide-width',
      `${this.state.width}px`
    );
  }

  private reInitView(): void {
    if (!this.dom.wrapper) return;
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

  private clearPagination(): void {
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

  private clearNavigation(): void {
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

  private bindEvents(): void {
    const root = this.dom.root;
    const wrapper = this.dom.wrapper;
    if (!root || !wrapper) return;

    this.cleanup.events.on(
      'touchstart',
      wrapper,
      'touchstart',
      (event) => {
        const touchEvent = event as TouchEvent;
        if (touchEvent.touches[0])
          this.onStart(touchEvent.touches[0], touchEvent.target);
      },
      { passive: true }
    );
    this.cleanup.events.on(
      'touchmove',
      wrapper,
      'touchmove',
      (event) => {
        const touchEvent = event as TouchEvent;
        if (touchEvent.touches[0]) this.onMove(touchEvent.touches[0], event);
      },
      { passive: false }
    );
    this.cleanup.events.on('touchend', wrapper, 'touchend', (event) => {
      const touchEvent = event as TouchEvent;
      if (touchEvent.changedTouches[0])
        this.pushLog(touchEvent.changedTouches[0]);
      this.onEnd();
    });
    this.cleanup.events.on('touchcancel', wrapper, 'touchcancel', () => {
      this.resetDrag(true);
    });
    this.cleanup.events.on('window:touchcancel', window, 'touchcancel', () => {
      this.resetDrag(true);
    });
    this.cleanup.events.on('mousedown', wrapper, 'mousedown', (event) => {
      const mouseEvent = event as MouseEvent;
      if (mouseEvent.button !== 0) return;
      this.onStart(mouseEvent, mouseEvent.target);
      wrapper.style.cursor = 'grabbing';
    });
    this.cleanup.events.on('mousemove', wrapper, 'mousemove', (event) => {
      const mouseEvent = event as MouseEvent;
      if (mouseEvent.buttons === 1) this.onMove(mouseEvent, event);
    });
    this.cleanup.events.on('window:mousemove', window, 'mousemove', (event) => {
      const mouseEvent = event as MouseEvent;
      if (this.runtime.touching && mouseEvent.buttons === 1)
        this.onMove(mouseEvent, event);
    });
    this.cleanup.events.on('mouseup', wrapper, 'mouseup', (event) => {
      wrapper.style.cursor = 'grab';
      this.pushLog(event as MouseEvent);
      this.onEnd();
    });
    this.cleanup.events.on('window:mouseup', window, 'mouseup', (event) => {
      if (!this.runtime.touching) return;
      wrapper.style.cursor = 'grab';
      this.pushLog(event as MouseEvent);
      this.onEnd();
    });
    this.cleanup.events.on('wrapper:mouseleave', wrapper, 'mouseleave', () => {
      wrapper.style.cursor = 'grab';
    });
    this.cleanup.events.on(
      'click',
      wrapper,
      'click',
      (event) => {
        if (!this.runtime.clickPrevented || !this.props.preventClick) return;
        event.preventDefault();
        event.stopPropagation();
        this.runtime.clickPrevented = false;
      },
      { capture: true }
    );
    this.cleanup.events.on('dragstart', wrapper, 'dragstart', (event) =>
      event.preventDefault()
    );
    this.cleanup.events.on('transitionend', wrapper, 'transitionend', (event) =>
      this.onTransitionEnd(event)
    );
    this.cleanup.events.on('window:resize', window, 'resize', () =>
      this.refresh()
    );
    this.cleanup.events.on('root:mouseenter', root, 'mouseenter', () =>
      this.pause()
    );
    this.cleanup.events.on('root:mouseleave', root, 'mouseleave', () =>
      this.resume()
    );
  }

  private onStart(point: SwipePoint, target: EventTarget | null = null): void {
    if (this.state.animating || !this.syncLayout()) return;

    this.runtime.logs = [];
    this.pushLog(point);
    this.runtime.startTarget = target;
    this.runtime.touching = true;
    this.runtime.scrolling = false;
    this.runtime.swiping = false;
    this.runtime.clickPrevented = false;

    this.pause();
    if (this.dom.wrapper) this.dom.wrapper.style.transition = 'none';
  }

  private onMove(point: SwipePoint, event: Event): void {
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

  private onEnd(): void {
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

  private resetDrag(animate = true): void {
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

  private onTransitionEnd(event?: Event): void {
    if (
      event &&
      (event.target !== this.dom.wrapper ||
        !('propertyName' in event) ||
        event.propertyName !== 'transform')
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

  private pushLog(point: SwipePoint): void {
    this.runtime.logs.push({
      x: point.pageX ?? point.clientX ?? 0,
      y: point.pageY ?? point.clientY ?? 0,
      time: Date.now(),
    });
    if (this.runtime.logs.length > 5) this.runtime.logs.shift();
  }

  private getDuration(): number {
    if (this.runtime.logs.length === 0) return 0;
    return (
      this.runtime.logs[this.runtime.logs.length - 1].time -
      this.runtime.logs[0].time
    );
  }

  private getOffset(): { x: number; y: number } {
    if (this.runtime.logs.length === 0) return { x: 0, y: 0 };
    const first = this.runtime.logs[0];
    const last = this.runtime.logs[this.runtime.logs.length - 1];
    return { x: last.x - first.x, y: last.y - first.y };
  }

  toRealIndex(index = this.state.trackIndex): number {
    if (!this.realCount) return 0;
    if (!this.props.loop) return index;
    if (index === 0) return this.realCount - 1;
    if (index === this.dom.slides.length - 1) return 0;
    return index - 1;
  }

  trackIndexForRealIndex(index: number): number {
    if (!this.realCount) return 0;
    const target = Math.max(0, Math.min(index, this.realCount - 1));
    return this.props.loop && this.realCount > 1 ? target + 1 : target;
  }

  private setTrackIndex(
    trackIndex: number,
    animate: boolean | null = true
  ): void {
    const target = normalizeNumber(trackIndex);
    this.setState({
      trackIndex: target,
      index: this.toRealIndex(target),
      transform: -target * this.state.width,
    });
    if (animate != null) this.render(animate);
  }

  slideTo(index: number): void {
    return this.slideToTrack(this.trackIndexForRealIndex(index));
  }

  slideToTrack(idx: number): void {
    this.assertBuilt('slideToTrack');
    if (this.state.animating) return;
    if (this.dom.slides.length === 0) return;
    if (!this.syncLayout()) return;

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

  next(): void {
    this.assertBuilt('next');
    if (this.state.animating) return;
    this.slideToTrack(this.state.trackIndex + 1);
  }

  prev(): void {
    this.assertBuilt('prev');
    if (this.state.animating) return;
    this.slideToTrack(this.state.trackIndex - 1);
  }

  private render(animate: boolean): void {
    this.assertBuilt('render');
    if (!this.dom.wrapper) return;
    const transform = `translate3d(${this.state.transform}px, 0, 0)`;
    const shouldAnimate =
      animate &&
      this.props.speed > 0 &&
      this.state.width > 0 &&
      this.dom.wrapper.style.transform !== transform;

    if (shouldAnimate) {
      this.dom.wrapper.style.transition = `transform ${this.props.speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      this.animating = true;
    } else {
      this.dom.wrapper.style.transition = 'none';
      this.animating = false;
    }

    this.dom.wrapper.style.transform = transform;
  }

  private loadImages(): void {
    this.assertBuilt('loadImages');
    const indices = [this.state.trackIndex];
    if (this.state.trackIndex > 0) indices.push(this.state.trackIndex - 1);
    if (this.state.trackIndex < this.dom.slides.length - 1)
      indices.push(this.state.trackIndex + 1);

    indices.forEach((index) => {
      const slide = this.dom.slides[index];
      if (!slide) return;

      const img = q<HTMLImageElement>('img[data-lazy]', slide);
      if (!img || img.src) return;

      img.classList.add(this.props.className.loading);
      img.src = img.dataset.lazy || '';
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
        this.runtime.imageCleanups.delete(cleanup);
      };
      this.runtime.imageCleanups.add(cleanup);
      img.onload = () => {
        img.classList.remove(this.props.className.loading);
        img.classList.add(this.props.className.loaded);
        cleanup();
      };
      img.onerror = () => {
        img.classList.remove(this.props.className.loading);
        img.classList.add(this.props.className.error);
        cleanup();
      };
    });
  }

  private clearImageCleanups(): void {
    this.runtime.imageCleanups?.forEach((cleanup) => cleanup());
    this.runtime.imageCleanups?.clear();
  }

  private initPagination(): void {
    if (!this.dom.root) return;

    if (!this.dom.pagination) {
      this.dom.pagination = h('div', {
        className: joinClasses(
          this.props.className.pagination,
          this.props.className.paginationHorizontal,
          this.props.className.paginationClickable,
          this.props.className.paginationBulletGroup
        ),
        'data-swiper-pagination': '',
      }) as HTMLElement;
      this.dom.root.appendChild(this.dom.pagination);
      this.dom.createdPagination = true;
    } else {
      this.dom.pagination.classList.add(
        this.props.className.paginationHorizontal,
        this.props.className.paginationClickable,
        this.props.className.paginationBulletGroup
      );
      this.dom.pagination.setAttribute('data-swiper-pagination', '');
    }

    const pagination = this.dom.pagination;
    if (!pagination) return;

    pagination.textContent = '';
    this.dom.bullets = [];

    for (let index = 0; index < this.realCount; index++) {
      const bullet = h('button', {
        type: 'button',
        className: joinClasses(
          this.props.className.indicator,
          this.props.className.bullet
        ),
        'data-swiper-bullet': String(index),
        'aria-label': `Go to slide ${index + 1}`,
      }) as HTMLButtonElement;
      this.cleanup.events.on(`bullet:${index}:click`, bullet, 'click', () => {
        this.slideTo(index);
      });
      this.cleanup.events.on(
        `bullet:${index}:keydown`,
        bullet,
        'keydown',
        (event) => {
          const keyboardEvent = event as KeyboardEvent;
          if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ')
            return;
          event.preventDefault();
          this.slideTo(index);
        }
      );
      this.dom.bullets.push(bullet);
      pagination.appendChild(bullet);
    }

    this.cleanup.bindings = createRoot((dispose) => {
      this.dom.bullets.forEach((bullet, i) => {
        bindClass(bullet, this.props.className.active, () => {
          return this.state.index === i;
        });
        bindAttr(bullet, 'aria-current', () =>
          this.state.index === i ? 'true' : null
        );
      });
      return dispose;
    });
  }

  private initNavigation(): void {
    const prevButton = this.ensureNavigation('prev', 'arrow-left');
    const nextButton = this.ensureNavigation('next', 'arrow-right');
    this.dom.prevButton = prevButton;
    this.dom.nextButton = nextButton;

    this.cleanup.events.on('nav:prev', prevButton, 'click', () => this.prev());
    this.cleanup.events.on('nav:next', nextButton, 'click', () => this.next());

    if (!this.props.loop) {
      this.cleanup.navBindings = createRoot((dispose) => {
        bindClass(
          prevButton,
          this.props.className.disabled,
          () => this.state.trackIndex <= 0
        );
        bindAttr(prevButton, 'disabled', () =>
          this.state.trackIndex <= 0 ? '' : null
        );
        bindClass(
          nextButton,
          this.props.className.disabled,
          () => this.state.trackIndex >= this.dom.slides.length - 1
        );
        bindAttr(nextButton, 'disabled', () =>
          this.state.trackIndex >= this.dom.slides.length - 1 ? '' : null
        );
        return dispose;
      });
    }
  }

  private ensureNavigation(
    direction: SwiperDirection,
    iconName: 'arrow-left' | 'arrow-right'
  ): HTMLButtonElement {
    if (!this.dom.root) {
      throw new Error('Swiper.ensureNavigation: root not found.');
    }

    const key: CreatedNavigationKey =
      direction === 'prev' ? 'createdPrevButton' : 'createdNextButton';
    const directionClass =
      direction === 'prev'
        ? this.props.className.prev
        : this.props.className.next;
    const className = joinClasses(
      this.props.className.navigation,
      directionClass
    );
    let button = q<HTMLButtonElement>(
      `[data-action="${direction}"]`,
      this.dom.root
    );

    if (!button) {
      button = h('button', {
        type: 'button',
        className,
        'data-action': direction,
        'data-swiper-navigation': direction,
      }) as HTMLButtonElement;
      this.dom.root.appendChild(button);
      this.dom[key] = true;
    } else if (button.tagName.toLowerCase() !== 'button') {
      button.setAttribute('role', 'button');
      button.setAttribute('tabindex', '0');
      button.classList.add(this.props.className.navigation, directionClass);
      button.setAttribute('data-swiper-navigation', direction);
    } else {
      button.classList.add(this.props.className.navigation, directionClass);
      button.setAttribute('data-swiper-navigation', direction);
    }

    button.setAttribute(
      'aria-label',
      direction === 'prev' ? 'Previous slide' : 'Next slide'
    );
    if (!q('svg', button)) {
      button.textContent = '';
      button.appendChild(icon(iconName));
    }

    return button;
  }

  play(): void {
    this.assertBuilt('play');
    if (this.runtime.destroyed || this.runtime.timer) return;
    if (this.realCount <= 1) return;
    if (!this.syncLayout()) return;
    const delay = Math.max(this.props.delay, AUTOPLAY_DELAY_FLOOR);
    this.runtime.timer = setInterval(() => this.next(), delay);
  }

  pause(): void {
    if (!this.runtime.timer) return;
    clearInterval(this.runtime.timer);
    this.runtime.timer = null;
  }

  resume(): void {
    if (this.runtime.destroyed) return;
    if (this.props.autoplay && !this.runtime.timer) this.play();
  }

  restartAutoplay(): void {
    this.pause();
    if (this.props.autoplay) this.play();
  }

  protected override normalizeStatePatch(
    patch: Partial<SwiperState>
  ): Partial<SwiperState> {
    const nextPatch = { ...patch };
    if (Object.hasOwn(nextPatch, 'data') && Array.isArray(nextPatch.data)) {
      nextPatch.data = cloneData(nextPatch.data);
    }
    return nextPatch;
  }

  protected override validateStatePatch(patch: Partial<SwiperState>): void {
    validateParam(
      'state',
      patch,
      {
        type: 'plainObject',
      },
      'Swiper.setState'
    );

    for (const key of Object.keys(patch)) {
      if (!Object.hasOwn(SWIPER_STATE_SCHEMA, key)) {
        throw new Error(
          `Swiper.setState: "${key}" is not a supported state key.`
        );
      }
      validateParam(
        key,
        patch[key as keyof SwiperState],
        SWIPER_STATE_SCHEMA[key as keyof typeof SWIPER_STATE_SCHEMA],
        'Swiper.setState'
      );
    }

    if (Array.isArray(patch.data)) this.normalizeData(patch.data);
  }
}

export type Swiper = SwiperComponent;

export function createSwiper(input: SwiperProps = {}): Swiper {
  return new SwiperComponent(input);
}

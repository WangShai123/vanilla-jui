import {
  For,
  createDeepStore,
  createEffect,
  createMemo,
  flushSync,
  jsx,
} from 'vanilla-signal';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
import { icon } from '../primitives/icons.ts';
import { createLoading } from '../primitives/loading.ts';
import { joinClasses } from '../utilities/class-name.ts';
import { all, q, type RenderableContent } from '../utilities/dom.ts';
import { createEventManager } from '../utilities/events.ts';
import { randomId } from '../utilities/id.ts';
import { createScheduledTask } from '../core/scheduler.ts';
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
  key: string;
}

interface TrackItem {
  item: NormalizedSwiperDataItem;
  index: number;
  clone: 'first' | 'last' | null;
  key: string;
}

export interface SwiperSlideContext {
  swiper: Swiper;
  item: NormalizedSwiperDataItem;
  index: number;
}

export type SwiperDataLoader = (
  swiper: Swiper
) => SwiperDataItem[] | Promise<SwiperDataItem[]>;

export type SwiperDataSource = SwiperDataItem[] | SwiperDataLoader;

export interface SwiperProps extends Record<string, unknown> {
  id?: string | null;
  data?: SwiperDataSource;
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
  data: SwiperDataSource;
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
  loading: boolean;
  index: number;
  trackIndex: number;
  transform: number;
  animating: boolean;
  width: number;
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

interface SwiperActions {
  slideTo(index: number): void;
  slideToTrack(index: number): void;
  next(): void;
  prev(): void;
  play(): void;
  pause(): void;
  resume(): void;
  restartAutoplay(): void;
}

type SwiperBase = FunctionalComponent<
  ResolvedSwiperProps,
  SwiperState,
  HTMLElement,
  SwiperActions
>;

export type Swiper = SwiperBase & {
  readonly realCount: number;
  readonly realIndex: number;
};

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
};

const SWIPER_OPTIONS_SCHEMA = {
  id: {
    default: null,
    types: ['string', 'null'],
    nonEmpty: true,
    normalize: (value: unknown) =>
      typeof value === 'string' ? value.trim() : value,
  },
  data: { default: [], types: ['array', 'function'] },
  loop: { default: true, type: 'boolean' },
  autoplay: { default: true, type: 'boolean' },
  delay: { default: 3000, type: 'number', min: 0 },
  lazyload: { default: true, type: 'boolean' },
  pagination: { default: true, type: 'boolean' },
  navigation: { default: true, type: 'boolean' },
  speed: { default: 300, type: 'number', min: 0 },
  touchRatio: { default: 1, type: 'number', greaterThan: 0 },
  touchAngle: { default: 45, type: 'number', min: 0, max: 90 },
  longSwipesMs: { default: 300, type: 'number', min: 0 },
  longSwipesRatio: { default: 0.05, type: 'number', min: 0, max: 1 },
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
  data: { type: 'array' },
  loading: { type: 'boolean' },
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

function cloneData(data: SwiperDataItem[] | undefined): SwiperDataItem[] {
  return Array.isArray(data) ? data.map((item) => ({ ...item })) : [];
}

function cloneDataSource(source: SwiperDataSource): SwiperDataSource {
  return Array.isArray(source) ? cloneData(source) : source;
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
    data: cloneDataSource(props.data),
    className: { ...props.className },
  };
}

export function createSwiper(input: SwiperProps = {}): Swiper {
  const props = normalizeProps(input);
  const initialData = Array.isArray(props.data) ? props.data : [];
  const state = createDeepStore({
    data: cloneData(initialData),
    loading: false,
    index: 0,
    trackIndex: 0,
    transform: 0,
    animating: false,
    width: 0,
  }) as SwiperState;
  const events = createEventManager();
  const itemKeys = new WeakMap<object, string>();
  const imageCleanups = new Set<() => void>();
  let swiper!: Swiper;
  let wrapper: HTMLElement | null = null;
  let slides: HTMLElement[] = [];
  let normalizedItems: () => NormalizedSwiperDataItem[] = () => [];
  let trackItems: () => TrackItem[] = () => [];
  let dataLoadId = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let mountFrame: number | null = null;
  let logs: SwipeLog[] = [];
  let startTarget: EventTarget | null = null;
  let touching = false;
  let scrolling = false;
  let swiping = false;
  let clickPrevented = false;

  const itemKey = (item: SwiperDataItem): string => {
    if (!itemKeys.has(item)) itemKeys.set(item, randomId());
    return itemKeys.get(item) as string;
  };
  const normalizeData = (
    data: SwiperDataItem[]
  ): NormalizedSwiperDataItem[] => {
    const items = data.map((item, index) => {
      validateParam(
        String(index),
        item,
        SWIPER_DATA_ITEM_RULE,
        'Swiper.state.data'
      );
      return {
        ...item,
        blank: item.blank !== false,
        index,
        key: itemKey(item),
      };
    });
    if (!items.some((item) => item.sort != null)) return items;
    return items.sort((a, b) => {
      if (a.sort == null && b.sort == null) return a.index - b.index;
      if (a.sort == null) return 1;
      if (b.sort == null) return -1;
      return a.sort - b.sort || a.index - b.index;
    });
  };
  const createTrackItems = (items: NormalizedSwiperDataItem[]): TrackItem[] => {
    const real = items.map((item, index) => ({
      item,
      index,
      clone: null,
      key: `real:${item.key}:${Boolean(item.url)}`,
    })) satisfies TrackItem[];
    if (!props.loop || items.length <= 1) return real;
    const first = items[0];
    const last = items[items.length - 1];
    return [
      {
        item: last,
        index: items.length - 1,
        clone: 'last',
        key: `clone:last:${last.key}:${Boolean(last.url)}`,
      },
      ...real,
      {
        item: first,
        index: 0,
        clone: 'first',
        key: `clone:first:${first.key}:${Boolean(first.url)}`,
      },
    ];
  };
  const realCount = (): number => normalizedItems().length;
  const trackCount = (): number => trackItems().length;
  const toRealIndex = (index = state.trackIndex): number => {
    const count = realCount();
    if (!count) return 0;
    if (!props.loop || count <= 1)
      return Math.max(0, Math.min(index, count - 1));
    if (index === 0) return count - 1;
    if (index === trackCount() - 1) return 0;
    return index - 1;
  };
  const trackIndexForRealIndex = (index: number): number => {
    const count = realCount();
    if (!count) return 0;
    const target = Math.max(0, Math.min(index, count - 1));
    return props.loop && count > 1 ? target + 1 : target;
  };
  const refreshSlides = (): void => {
    slides = wrapper ? all<HTMLElement>('[data-swiper-slide]', wrapper) : [];
  };
  const clearImageCleanups = (): void => {
    for (const cleanup of imageCleanups) cleanup();
    imageCleanups.clear();
  };
  const updateSize = (): void => {
    const root = swiper.element;
    if (!root) return;
    const width = root.clientWidth || root.offsetWidth;
    if (width > 0 || !root.isConnected || state.width === 0) {
      flushSync(() => {
        state.width = width;
      });
    }
  };
  const hasLayout = (): boolean =>
    !!swiper.element?.isConnected && state.width > 0;
  const syncLayout = (): boolean => {
    updateSize();
    return hasLayout();
  };
  const setTrackIndex = (index: number, animate = true): void => {
    const target = normalizeNumber(index);
    const transform = -target * state.width;
    const shouldAnimate =
      animate &&
      props.speed > 0 &&
      state.width > 0 &&
      state.transform !== transform;
    flushSync(() => {
      state.trackIndex = target;
      state.index = toRealIndex(target);
      state.transform = transform;
      state.animating = shouldAnimate;
    });
  };
  const loadImages = (): void => {
    const indices = [state.trackIndex];
    if (state.trackIndex > 0) indices.push(state.trackIndex - 1);
    if (state.trackIndex < slides.length - 1)
      indices.push(state.trackIndex + 1);
    for (const index of indices) {
      const image = slides[index]
        ? q<HTMLImageElement>('img[data-lazy]', slides[index])
        : null;
      if (!image) continue;
      const hasSource = !!image.getAttribute('src');
      if (hasSource && !image.complete && (image.onload || image.onerror)) {
        continue;
      }
      image.dataset.status = 'loading';
      const cleanup = (): void => {
        image.onload = null;
        image.onerror = null;
        imageCleanups.delete(cleanup);
      };
      imageCleanups.add(cleanup);
      const markLoaded = (): void => {
        image.dataset.status = 'loaded';
        cleanup();
      };
      const markError = (): void => {
        image.dataset.status = 'error';
        cleanup();
      };
      image.onload = markLoaded;
      image.onerror = markError;
      if (!hasSource) image.src = image.dataset.lazy || '';
      if (image.complete) {
        if (image.naturalWidth > 0) markLoaded();
        else markError();
      }
    }
  };

  const pause = (): void => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };
  const play = (): void => {
    if (swiper.runtime.destroyed || timer || realCount() <= 1) return;
    if (!syncLayout()) return;
    timer = setInterval(
      () => swiper.next(),
      Math.max(props.delay, AUTOPLAY_DELAY_FLOOR)
    );
  };
  const resume = (): void => {
    if (props.autoplay && !timer && !swiper.runtime.destroyed) play();
  };
  const restartAutoplay = (): void => {
    pause();
    if (props.autoplay) play();
  };
  const pushLog = (point: SwipePoint): void => {
    logs.push({
      x: point.pageX ?? point.clientX ?? 0,
      y: point.pageY ?? point.clientY ?? 0,
      time: Date.now(),
    });
    if (logs.length > 5) logs.shift();
  };
  const offset = (): { x: number; y: number } => {
    if (!logs.length) return { x: 0, y: 0 };
    return {
      x: logs[logs.length - 1].x - logs[0].x,
      y: logs[logs.length - 1].y - logs[0].y,
    };
  };
  const resetDrag = (animate = true): void => {
    const target = -state.trackIndex * state.width;
    const shouldAnimate = animate && state.transform !== target;
    touching = false;
    scrolling = false;
    swiping = false;
    logs = [];
    startTarget = null;
    flushSync(() => {
      state.transform = target;
      state.animating = shouldAnimate;
    });
    resume();
  };
  const onStart = (point: SwipePoint, target: EventTarget | null): void => {
    if (state.animating || !syncLayout()) return;
    logs = [];
    pushLog(point);
    startTarget = target;
    touching = true;
    scrolling = false;
    swiping = false;
    clickPrevented = false;
    pause();
    flushSync(() => {
      state.animating = false;
    });
  };
  const onMove = (point: SwipePoint, event: Event): void => {
    if (!touching || scrolling || state.animating) return;
    pushLog(point);
    const current = offset();
    const x = Math.abs(current.x);
    const y = Math.abs(current.y);
    if (x < SWIPE_THRESHOLD && y < SWIPE_THRESHOLD) return;
    if (!swiping) {
      const angle = (Math.atan2(y, x) * 180) / Math.PI;
      if (angle < props.touchAngle) {
        swiping = true;
        clickPrevented = isInteractiveTarget(startTarget);
      } else {
        scrolling = true;
        resetDrag(true);
        return;
      }
    }
    event.preventDefault();
    flushSync(() => {
      state.transform =
        -state.trackIndex * state.width + current.x * props.touchRatio;
    });
  };
  const onEnd = (): void => {
    if (!touching) return;
    touching = false;
    if (!swiping || state.width <= 0) {
      resetDrag(true);
      return;
    }
    const duration = logs.length
      ? logs[logs.length - 1].time - logs[0].time
      : 0;
    const x = offset().x;
    const distance = Math.abs(x) / state.width;
    let steps = 0;
    if (duration > props.longSwipesMs) {
      steps = Math.ceil(distance - props.longSwipesRatio);
    } else if (distance >= props.longSwipesRatio) {
      steps = Math.max(1, Math.ceil(distance - props.longSwipesRatio));
    }
    swiper.slideToTrack(state.trackIndex + steps * (x > 0 ? -1 : 1));
    logs = [];
    resume();
  };
  const onTransitionEnd = (event: Event): void => {
    if (
      event.target !== wrapper ||
      !('propertyName' in event) ||
      event.propertyName !== 'transform'
    ) {
      return;
    }
    flushSync(() => {
      state.animating = false;
    });
    if (!props.loop || realCount() <= 1) return;
    if (state.trackIndex === 0) setTrackIndex(realCount(), false);
    else if (state.trackIndex === trackCount() - 1) setTrackIndex(1, false);
  };

  const bindEvents = (): void => {
    const root = swiper.element;
    if (!root || !wrapper) return;
    events.clear();
    events.on(
      'touchstart',
      wrapper,
      'touchstart',
      (event) => {
        const touch = (event as TouchEvent).touches[0];
        if (touch) onStart(touch, event.target);
      },
      { passive: true }
    );
    events.on(
      'touchmove',
      wrapper,
      'touchmove',
      (event) => {
        const touch = (event as TouchEvent).touches[0];
        if (touch) onMove(touch, event);
      },
      { passive: false }
    );
    events.on('touchend', wrapper, 'touchend', (event) => {
      const touch = (event as TouchEvent).changedTouches[0];
      if (touch) pushLog(touch);
      onEnd();
    });
    events.on('touchcancel', window, 'touchcancel', () => resetDrag(true));
    events.on('mousedown', wrapper, 'mousedown', (event) => {
      const mouse = event as MouseEvent;
      if (mouse.button !== 0) return;
      onStart(mouse, mouse.target);
      wrapper?.style.setProperty('cursor', 'grabbing');
    });
    events.on('mousemove', window, 'mousemove', (event) => {
      const mouse = event as MouseEvent;
      if (touching && mouse.buttons === 1) onMove(mouse, event);
    });
    events.on('mouseup', window, 'mouseup', (event) => {
      if (!touching) return;
      wrapper?.style.setProperty('cursor', 'grab');
      pushLog(event as MouseEvent);
      onEnd();
    });
    events.on(
      'click',
      wrapper,
      'click',
      (event) => {
        if (!clickPrevented || !props.preventClick) return;
        event.preventDefault();
        event.stopPropagation();
        clickPrevented = false;
      },
      { capture: true }
    );
    events.on('dragstart', wrapper, 'dragstart', (event) =>
      event.preventDefault()
    );
    events.on('transitionend', wrapper, 'transitionend', onTransitionEnd);
    events.on('resize', window, 'resize', syncAfterData);
    events.on('mouseenter', root, 'mouseenter', pause);
    events.on('mouseleave', root, 'mouseleave', resume);
    events.on('controls', root, 'click', (event) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>(
        '[data-action], [data-swiper-bullet]'
      );
      if (!control || !root.contains(control)) return;
      if (control.dataset.action === 'prev') swiper.prev();
      else if (control.dataset.action === 'next') swiper.next();
      else if (control.dataset.swiperBullet != null) {
        swiper.slideTo(Number(control.dataset.swiperBullet));
      }
    });
  };

  const syncAfterData = (): void => {
    if (!swiper.runtime.built) return;
    pause();
    clearImageCleanups();
    refreshSlides();
    const clamped = Math.min(state.index, Math.max(0, realCount() - 1));
    updateSize();
    setTrackIndex(trackIndexForRealIndex(clamped), false);
    if (props.lazyload) loadImages();
    if (props.autoplay && hasLayout()) resume();
  };
  const dataTask = createScheduledTask(syncAfterData);
  const queueLayoutSync = (): void => {
    if (mountFrame != null || typeof requestAnimationFrame !== 'function')
      return;
    mountFrame = requestAnimationFrame(() => {
      mountFrame = null;
      if (!swiper.runtime.destroyed && swiper.element?.isConnected)
        syncAfterData();
    });
  };
  const loadData = async (): Promise<void> => {
    if (typeof props.data !== 'function') return;
    const requestId = ++dataLoadId;
    flushSync(() => {
      state.loading = true;
    });
    try {
      const result = await Promise.resolve(props.data(swiper));
      if (swiper.runtime.destroyed || requestId !== dataLoadId) return;
      validateParam('data', result, { type: 'array' }, 'Swiper.data');
      const data = cloneData(result);
      normalizeData(data);
      flushSync(() => {
        state.data = data;
      });
    } finally {
      if (!swiper.runtime.destroyed && requestId === dataLoadId) {
        flushSync(() => {
          state.loading = false;
        });
      }
    }
  };
  const requestData = (): void => {
    void loadData().catch((error: unknown) => {
      if (!swiper.runtime.destroyed) console.error('Swiper.data error:', error);
    });
  };

  const slideView = (itemAccessor: () => TrackItem): HTMLElement => {
    const initial = itemAccessor();
    const tag = initial.item.url ? 'a' : 'div';
    return jsx(tag, {
      className: props.className.slide,
      href: () => itemAccessor().item.url || undefined,
      target: () =>
        itemAccessor().item.url
          ? itemAccessor().item.blank
            ? '_blank'
            : '_self'
          : undefined,
      'data-swiper-slide': () => String(itemAccessor().index),
      'data-swiper-index': () =>
        itemAccessor().clone ? null : String(itemAccessor().index),
      'data-clone': () => itemAccessor().clone,
      role: 'group',
      'aria-label': () => `Slide ${itemAccessor().index + 1}`,
      children: () => {
        const { item, index } = itemAccessor();
        const context = { swiper, item, index };
        if (item.children != null) {
          return typeof item.children === 'function'
            ? item.children(context)
            : item.children;
        }
        return [
          item.image
            ? jsx('img', {
                className: props.className.image,
                alt: item.title || '',
                loading: 'lazy',
                ...(props.lazyload
                  ? { 'data-lazy': item.image }
                  : { src: item.image }),
              })
            : null,
          item.title
            ? jsx('span', {
                className: props.className.title,
                children: item.title,
              })
            : null,
        ];
      },
    }) as HTMLElement;
  };

  swiper = defineComponent<
    ResolvedSwiperProps,
    SwiperState,
    HTMLElement,
    SwiperActions
  >({
    name: 'Swiper',
    props,
    state,
    actions: {
      slideTo(index) {
        swiper.slideToTrack(trackIndexForRealIndex(index));
      },
      slideToTrack(index) {
        if (!swiper.runtime.built) {
          throw new Error('Swiper.slideToTrack: call build() first.');
        }
        if (state.animating || !slides.length || !syncLayout()) return;
        const target = props.loop
          ? Math.max(0, Math.min(index, slides.length - 1))
          : Math.max(0, Math.min(index, realCount() - 1));
        setTrackIndex(target, true);
        if (props.lazyload) loadImages();
      },
      next() {
        if (!state.animating) swiper.slideToTrack(state.trackIndex + 1);
      },
      prev() {
        if (!state.animating) swiper.slideToTrack(state.trackIndex - 1);
      },
      play,
      pause,
      resume,
      restartAutoplay,
    },
    normalizeStatePatch(patch) {
      return {
        ...patch,
        ...(Object.hasOwn(patch, 'data') && Array.isArray(patch.data)
          ? { data: cloneData(patch.data) }
          : {}),
      };
    },
    validateStatePatch(patch) {
      validateParam('state', patch, { type: 'plainObject' }, 'Swiper.setState');
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
      if (Array.isArray(patch.data)) normalizeData(patch.data);
    },
    view: () => {
      normalizedItems = createMemo(() => normalizeData(state.data));
      trackItems = createMemo(() => createTrackItems(normalizedItems()));
      const loadingView = (): HTMLDivElement => {
        const view = createLoading();
        view.setAttribute('data-swiper-loading', '');
        return view;
      };
      wrapper = jsx('div', {
        className: props.className.wrapper,
        'data-swiper-wrapper': '',
        'aria-live': 'polite',
        children: () =>
          state.loading
            ? loadingView()
            : For({
                each: trackItems,
                key: (item: TrackItem) => item.key,
                children: slideView,
              }),
      }) as HTMLElement;
      const root = jsx('div', {
        id: props.id || randomId(),
        className: props.className.root,
        'data-swiper': 'root',
        'data-status': () => (state.loading ? 'loading' : 'loaded'),
        children: [
          wrapper,
          props.pagination
            ? jsx('div', {
                className: joinClasses(
                  props.className.pagination,
                  props.className.paginationHorizontal,
                  props.className.paginationClickable,
                  props.className.paginationBulletGroup
                ),
                'data-swiper-pagination': '',
                children: For({
                  each: normalizedItems,
                  key: (item: NormalizedSwiperDataItem) => item.key,
                  children: (
                    _itemAccessor: () => NormalizedSwiperDataItem,
                    indexAccessor: () => number
                  ) =>
                    jsx('button', {
                      type: 'button',
                      className: () =>
                        joinClasses(
                          props.className.indicator,
                          props.className.bullet,
                          state.index === indexAccessor()
                            ? props.className.active
                            : ''
                        ),
                      'data-swiper-bullet': () => String(indexAccessor()),
                      'aria-label': () => `Go to slide ${indexAccessor() + 1}`,
                      'aria-current': () =>
                        state.index === indexAccessor() ? 'true' : null,
                    }),
                }),
              })
            : null,
          props.navigation
            ? jsx('button', {
                type: 'button',
                className: () =>
                  joinClasses(
                    props.className.navigation,
                    props.className.prev,
                    !props.loop && state.index <= 0
                      ? props.className.disabled
                      : ''
                  ),
                'data-action': 'prev',
                'data-swiper-navigation': 'prev',
                'aria-label': 'Previous slide',
                disabled: () => !props.loop && state.index <= 0,
                children: icon('arrow-left'),
              })
            : null,
          props.navigation
            ? jsx('button', {
                type: 'button',
                className: () =>
                  joinClasses(
                    props.className.navigation,
                    props.className.next,
                    !props.loop && state.index >= realCount() - 1
                      ? props.className.disabled
                      : ''
                  ),
                'data-action': 'next',
                'data-swiper-navigation': 'next',
                'aria-label': 'Next slide',
                disabled: () => !props.loop && state.index >= realCount() - 1,
                children: icon('arrow-right'),
              })
            : null,
        ],
      }) as HTMLElement;
      createEffect(() => {
        wrapper?.style.setProperty(
          'transform',
          `translate3d(${state.transform}px, 0, 0)`
        );
        wrapper?.style.setProperty(
          'transition',
          state.animating
            ? `transform ${props.speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
            : 'none'
        );
        root.style.setProperty('--swiper-slide-width', `${state.width}px`);
      });
      createEffect(() => {
        const token = normalizedItems()
          .map((item) => `${item.key}:${item.sort ?? ''}:${Boolean(item.url)}`)
          .join('|');
        if (token || state.data.length === 0) dataTask.schedule();
      });
      return root;
    },
    onBuild(context) {
      const root = context.element;
      if (!root || !wrapper) return;
      wrapper.setAttribute('aria-live', 'polite');
      refreshSlides();
      bindEvents();
      updateSize();
      setTrackIndex(trackIndexForRealIndex(state.index), false);
      if (props.lazyload) loadImages();
      if (props.autoplay && hasLayout()) play();
      context.own(() => events.clear());
      requestData();
      queueLayoutSync();
    },
    onMount() {
      syncAfterData();
      queueLayoutSync();
    },
    onDestroy() {
      pause();
      dataTask.dispose();
      dataLoadId += 1;
      clearImageCleanups();
      if (mountFrame != null) cancelAnimationFrame(mountFrame);
      mountFrame = null;
      wrapper = null;
      slides = [];
    },
  }) as Swiper;

  Object.defineProperties(swiper, {
    realCount: { enumerable: true, get: realCount },
    realIndex: { enumerable: true, get: () => toRealIndex() },
  });

  return swiper;
}

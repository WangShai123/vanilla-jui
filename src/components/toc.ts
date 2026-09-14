import {
  For,
  createDeepStore,
  createEffect,
  createMemo,
  flushSync,
  jsx,
  untrack,
} from 'vanilla-signal';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
import { type DOMReference, all, requireContainer } from '../utilities/dom.ts';
import { createEventManager } from '../utilities/events.ts';
import { type ConfigSchema, resolveConfig } from '../utilities/config.ts';
import { translate } from '../utilities/locale.ts';

interface TocClassNames {
  toc: string;
  title: string;
  list: string;
  link: string;
  indicator: string;
}

type TocClassNameConfig = Partial<TocClassNames>;

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface TocCurrent {
  index: number;
  item: TocItem | null;
}

export interface TocIndicator {
  visible: boolean;
  top: number;
  height: number;
  duration: number;
  timingFunction: string;
}

interface TocProps extends Record<string, unknown> {
  target?: DOMReference;
  headings?: string;
  offset?: number;
  reactive?: boolean;
  title?: boolean;
  indicatorWidth?: string;
  indicatorHeightRatio?: number;
  className?: TocClassNameConfig;
  onChange?:
    | ((item: TocItem | null, index: number, toc: TocInstance) => void)
    | null;
}

interface ResolvedTocProps extends Record<string, unknown> {
  target: DOMReference;
  headings: string;
  offset: number;
  reactive: boolean;
  title: boolean;
  indicatorWidth: string;
  indicatorHeightRatio: number;
  className: TocClassNames;
  onChange:
    | ((item: TocItem | null, index: number, toc: TocInstance) => void)
    | null;
}

interface TocState extends Record<string, unknown> {
  items: TocItem[];
  current: TocCurrent;
  indicator: TocIndicator;
}

interface TocRuntimeExtras {
  ticking: boolean;
  frameId: number;
  refreshing: boolean;
  refreshFrameId: number;
  layoutFrameId: number;
  pendingScroll: TocPendingScroll | null;
}

interface TocScrollOptions {
  activeIndex?: number;
  updateHash?: boolean;
}

interface TocPendingScroll {
  index: number;
  top: number;
  deadline: number;
}

interface TocActions {
  activate(index: number): TocInstance;
}

type TocInstance = FunctionalComponent<
  ResolvedTocProps,
  TocState,
  HTMLElement,
  TocActions
>;

const DEFAULT_CLASS_NAMES: TocClassNames = {
  toc: 'j-toc',
  title: 'toc-title',
  list: 'toc-list',
  link: 'toc-link',
  indicator: 'toc-indicator',
};

const TOC_PROPS_SCHEMA = {
  target: { default: '.j-content' },
  headings: { default: 'h2, h3', type: 'string' },
  offset: {
    default: 80,
    type: 'number',
    min: 0,
  },
  reactive: { default: false, type: 'boolean' },
  title: { default: false, type: 'boolean' },
  indicatorWidth: { default: '2px', type: 'string' },
  indicatorHeightRatio: {
    default: 5,
    type: 'number',
    min: 1,
    max: 10,
  },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'plainObject',
    merge: 'shallow',
  },
  onChange: { default: null, types: ['function', 'null'] },
} satisfies ConfigSchema<TocProps>;

const ACTIVE_OFFSET_TOLERANCE = 1;
const INDICATOR_TRANSITION_MAX_MS = 1200;
const INDICATOR_TRANSITION_MIN_MS = 120;
const INDICATOR_TRANSITION_TIMING = 'ease-in-out';
const PROGRAMMATIC_SCROLL_TIMEOUT_MS = 2400;
const SCROLL_REACHED_TOLERANCE = 2;

function normalizeProps(input: TocProps): ResolvedTocProps {
  const props = resolveConfig(input, TOC_PROPS_SCHEMA, 'Toc.props');
  return {
    target: props.target as DOMReference,
    headings: props.headings as string,
    offset: props.offset as number,
    reactive: props.reactive as boolean,
    title: props.title as boolean,
    indicatorWidth: props.indicatorWidth as string,
    indicatorHeightRatio: props.indicatorHeightRatio as number,
    className: props.className as TocClassNames,
    onChange: props.onChange as ResolvedTocProps['onChange'],
  };
}

function resolveHeadingLevel(element: Element): number {
  const match = /^H([1-6])$/.exec(element.tagName);
  return match ? Number(match[1]) : 1;
}

function normalizeHeadingId(
  element: HTMLHeadingElement,
  index: number,
  usedIds: Set<string>
): string {
  const textId = (element.textContent || '').trim().replace(/\s+/g, '-');
  const base = element.id || textId || `heading-${index + 1}`;
  let id = base;
  let suffix = 1;
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  element.id = id;
  usedIds.add(id);
  return id;
}

function normalizeHeading(
  element: HTMLHeadingElement,
  index: number,
  usedIds: Set<string>
): TocItem {
  return {
    id: normalizeHeadingId(element, index, usedIds),
    text: element.textContent || '',
    level: resolveHeadingLevel(element),
  };
}

function normalizeHeadings(elements: HTMLHeadingElement[]): TocItem[] {
  const usedIds = new Set<string>();
  return elements.map((element, index) =>
    normalizeHeading(element, index, usedIds)
  );
}

export function createToc(props: TocProps = {}): TocInstance {
  const settings = normalizeProps(props);
  const state = createDeepStore({
    items: [],
    current: { index: -1, item: null },
    indicator: {
      visible: false,
      top: 0,
      height: 0,
      duration: 0,
      timingFunction: INDICATOR_TRANSITION_TIMING,
    },
  }) as TocState;
  const runtime: TocRuntimeExtras = {
    ticking: false,
    frameId: 0,
    refreshing: false,
    refreshFrameId: 0,
    layoutFrameId: 0,
    pendingScroll: null,
  };
  const events = createEventManager();
  let target: Element | null = null;
  let headings: HTMLHeadingElement[] = [];
  let observer: MutationObserver | null = null;
  let listElement: HTMLElement | null = null;
  let toc: TocInstance;
  let activeLinkId: string | null = null;
  let listHeight = 0;
  const linkRefs = new Map<string, HTMLElement>();
  const renderableItems = createMemo(() => state.items);

  const setIndicator = (indicator: TocIndicator): void => {
    if (
      state.indicator.visible === indicator.visible &&
      state.indicator.top === indicator.top &&
      state.indicator.height === indicator.height &&
      state.indicator.duration === indicator.duration &&
      state.indicator.timingFunction === indicator.timingFunction
    ) {
      return;
    }
    flushSync(() => {
      state.indicator = indicator;
    });
  };

  const hiddenIndicator = (): TocIndicator => ({
    visible: false,
    top: 0,
    height: 0,
    duration: 0,
    timingFunction: INDICATOR_TRANSITION_TIMING,
  });

  const pruneLinkRefs = (items: TocItem[]): void => {
    const ids = new Set(items.map((item) => item.id));
    for (const id of linkRefs.keys()) {
      if (!ids.has(id)) linkRefs.delete(id);
    }
  };

  const setLinkCurrent = (id: string, active: boolean): void => {
    const link = linkRefs.get(id);
    if (!link) return;
    if (active) {
      if (link.getAttribute('aria-current') !== 'location') {
        link.setAttribute('aria-current', 'location');
      }
      return;
    }
    if (link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
  };

  const syncActiveMarker = (nextId: string | null): void => {
    if (activeLinkId === nextId) return;
    const previousId = activeLinkId;
    activeLinkId = nextId;
    if (previousId) setLinkCurrent(previousId, false);
    if (nextId) setLinkCurrent(nextId, true);
  };

  const updateIndicatorForItem = (item: TocItem | null): number => {
    if (!toc.runtime.built || !listElement || !item) {
      setIndicator(hiddenIndicator());
      return 0;
    }
    const link = linkRefs.get(item.id);
    if (!link) {
      setIndicator(hiddenIndicator());
      return -1;
    }
    if (listHeight <= 0) {
      const listRect = listElement.getBoundingClientRect();
      listHeight = listElement.offsetHeight || listRect.height;
    }
    const linkRect = link.getBoundingClientRect();
    const linkHeight = link.offsetHeight || linkRect.height;
    const linkTop = link.offsetTop;
    const height = (linkHeight * settings.indicatorHeightRatio) / 10;
    const top = linkTop + (linkHeight - height) / 2;
    const distance = state.indicator.visible
      ? Math.abs(top - state.indicator.top)
      : 0;
    const duration =
      distance > 0 && listHeight > 0
        ? Math.min(
            INDICATOR_TRANSITION_MAX_MS,
            Math.max(
              INDICATOR_TRANSITION_MIN_MS,
              Math.round((distance / listHeight) * INDICATOR_TRANSITION_MAX_MS)
            )
          )
        : 0;
    setIndicator({
      visible: height > 0,
      top,
      height,
      duration,
      timingFunction: INDICATOR_TRANSITION_TIMING,
    });
    return duration;
  };

  const syncListLayout = (): void => {
    if (!toc.runtime.built || !listElement || state.items.length === 0) {
      listHeight = 0;
      setIndicator(hiddenIndicator());
      return;
    }
    pruneLinkRefs(state.items);
    const listRect = listElement.getBoundingClientRect();
    listHeight = listElement.offsetHeight || listRect.height;
    const current = state.items[state.current.index] || null;
    updateIndicatorForItem(current);
  };

  const scheduleListLayoutSync = (): void => {
    if (runtime.layoutFrameId) return;
    runtime.layoutFrameId = requestAnimationFrame(() => {
      runtime.layoutFrameId = 0;
      untrack(syncListLayout);
    });
  };

  const bindLinkRef = (item: TocItem, element: HTMLElement): void => {
    linkRefs.set(item.id, element);
    if (item.id === activeLinkId) {
      element.setAttribute('aria-current', 'location');
    } else {
      element.removeAttribute('aria-current');
    }
    scheduleListLayoutSync();
  };

  const getScrollY = (): number => window.scrollY || window.pageYOffset || 0;

  const getClockTime = (): number => window.performance?.now?.() ?? Date.now();

  const clearPendingScroll = (): void => {
    runtime.pendingScroll = null;
  };

  const beginPendingScroll = (
    index: number,
    top: number,
    duration: number
  ): void => {
    if (!Number.isInteger(index) || index < 0) return;
    runtime.pendingScroll = {
      index,
      top,
      deadline:
        getClockTime() + Math.max(PROGRAMMATIC_SCROLL_TIMEOUT_MS, duration),
    };
  };

  const shouldSkipScrollActivation = (): boolean => {
    const pending = runtime.pendingScroll;
    if (!pending) return false;
    if (Math.abs(getScrollY() - pending.top) <= SCROLL_REACHED_TOLERANCE) {
      clearPendingScroll();
      return true;
    }
    if (getClockTime() > pending.deadline) {
      clearPendingScroll();
      return false;
    }
    return true;
  };

  const setActive = (index: number): number => {
    if (index === state.current.index) {
      const current = state.items[index] || null;
      const duration = updateIndicatorForItem(current);
      if (duration < 0) scheduleListLayoutSync();
      return duration;
    }
    const current = state.items[index] || null;
    flushSync(() => {
      state.current = { index, item: current };
    });
    syncActiveMarker(current?.id ?? null);
    const duration = updateIndicatorForItem(current);
    if (duration < 0) scheduleListLayoutSync();
    settings.onChange?.(current, index, toc);
    return duration;
  };

  const updateActive = (): void => {
    if (!toc.runtime.built) return;
    if (shouldSkipScrollActivation()) return;
    let index = -1;
    const activeOffset = settings.offset + ACTIVE_OFFSET_TOLERANCE;
    for (let current = headings.length - 1; current >= 0; current--) {
      if (headings[current].getBoundingClientRect().top <= activeOffset) {
        index = current;
        break;
      }
    }
    setActive(index);
  };

  const onScroll = (): void => {
    if (runtime.ticking) return;
    runtime.ticking = true;
    runtime.frameId = requestAnimationFrame(() => {
      runtime.ticking = false;
      runtime.frameId = 0;
      updateActive();
    });
  };

  const scheduleRefresh = (): void => {
    if (runtime.refreshing) return;
    runtime.refreshing = true;
    runtime.refreshFrameId = requestAnimationFrame(() => {
      runtime.refreshing = false;
      runtime.refreshFrameId = 0;
      syncFromTarget();
    });
  };

  const scrollToItem = (
    item: TocItem,
    { activeIndex = -1, updateHash = false }: TocScrollOptions = {}
  ): void => {
    const heading = headings.find((element) => element.id === item.id);
    if (!heading) return;
    const scrollY = getScrollY();
    const top = Math.max(
      0,
      heading.getBoundingClientRect().top + scrollY - settings.offset
    );
    if (activeIndex >= 0) {
      const duration = setActive(activeIndex);
      beginPendingScroll(activeIndex, top, duration);
    }
    window.scrollTo({ top, behavior: 'smooth' });
    if (updateHash && window.history?.pushState) {
      window.history.pushState(null, '', `#${item.id}`);
    }
  };

  const syncFromTarget = (): void => {
    if (toc.runtime.destroyed || !toc.runtime.built || !target) return;
    headings = all<HTMLHeadingElement>(settings.headings, target);
    clearPendingScroll();
    const items = normalizeHeadings(headings);
    syncActiveMarker(null);
    flushSync(() => {
      state.items = items;
      state.current = { index: -1, item: null };
      state.indicator = hiddenIndicator();
    });
    updateActive();
  };

  const activate = (index: number): TocInstance => {
    if (
      toc.runtime.built &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < state.items.length
    ) {
      scrollToItem(state.items[index], { activeIndex: index });
    }
    return toc;
  };

  toc = defineComponent({
    name: 'Toc',
    props: settings,
    state,
    actions: { activate },
    view: () => {
      createEffect(() => {
        const items = state.items;
        void items.map((item) => item.id).join('\0');
        untrack(() => {
          pruneLinkRefs(items);
          scheduleListLayoutSync();
        });
      });
      const titleElement = settings.title
        ? jsx('div', {
            className: settings.className.title,
            'data-toc-title': '',
            children: translate('toc'),
          })
        : null;
      const listView = jsx('div', {
        ref: (element: HTMLElement) => {
          listElement = element;
          scheduleListLayoutSync();
        },
        className: settings.className.list,
        'data-toc-list': 'root',
        children: [
          For({
            each: renderableItems,
            key: (item: TocItem) => item.id,
            children: (
              itemAccessor: () => TocItem,
              indexAccessor: () => number
            ) =>
              jsx('a', {
                ref: (element: HTMLElement) =>
                  bindLinkRef(itemAccessor(), element),
                className: settings.className.link,
                href: () => `#${itemAccessor().id}`,
                'data-toc-link': () => String(indexAccessor()),
                'data-toc-target': () => itemAccessor().id,
                'data-toc-level': () => String(itemAccessor().level),
                onClick: (event: Event) => {
                  event.preventDefault();
                  const item = itemAccessor();
                  scrollToItem(item, {
                    activeIndex: state.items.findIndex(
                      (current) => current.id === item.id
                    ),
                    updateHash: true,
                  });
                },
                children: () => itemAccessor().text,
              }),
          }),
          For({
            each: () => (state.items.length > 0 ? [true] : []),
            key: () => 'toc-indicator',
            children: () =>
              jsx('div', {
                className: settings.className.indicator,
                'data-toc-indicator': '',
                hidden: () => !state.indicator.visible,
                style: () => ({
                  top: `${state.indicator.top}px`,
                  width: settings.indicatorWidth,
                  height: `${state.indicator.height}px`,
                  transitionDuration: `${state.indicator.duration}ms`,
                  transitionTimingFunction: state.indicator.timingFunction,
                }),
              }),
          }),
        ],
      });
      return jsx('nav', {
        className: settings.className.toc,
        'data-toc': 'root',
        children: settings.title ? [titleElement, listView] : listView,
      }) as HTMLElement;
    },
    onBuild(context) {
      target = requireContainer(settings.target, 'Toc.target');
      events.on('scroll', window, 'scroll', onScroll, { passive: true });
      context.own(() => events.clear());
      syncFromTarget();
      if (settings.reactive) {
        observer = new MutationObserver(scheduleRefresh);
        observer.observe(target, {
          childList: true,
          subtree: true,
          characterData: true,
        });
        context.own(() => {
          observer?.disconnect();
          observer = null;
        });
      }
    },
    onDestroy() {
      if (runtime.frameId) cancelAnimationFrame(runtime.frameId);
      if (runtime.refreshFrameId) cancelAnimationFrame(runtime.refreshFrameId);
      if (runtime.layoutFrameId) cancelAnimationFrame(runtime.layoutFrameId);
      runtime.frameId = 0;
      runtime.refreshFrameId = 0;
      runtime.layoutFrameId = 0;
      clearPendingScroll();
      runtime.ticking = false;
      runtime.refreshing = false;
      observer?.disconnect();
      observer = null;
      target = null;
      headings = [];
      listElement = null;
      listHeight = 0;
      linkRefs.clear();
    },
  });

  return toc;
}

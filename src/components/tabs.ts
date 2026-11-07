import {
  For,
  createDeepStore,
  createEffect,
  createMemo,
  createSignal,
  flushSync,
  jsx,
  onCleanup,
} from 'vanilla-signal';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
import { createTransition, type TransitionDefinition } from '../core/motion.ts';
import { createLoading } from '../primitives/loading.ts';
import {
  asRenderable,
  joinClasses,
  type RenderableContent,
} from '../utilities/dom.ts';
import { createEventManager } from '../utilities/events.ts';
import { randomId } from '../utilities/id.ts';
import { createElementRef, createKeyedElementRefs } from '../utilities/refs.ts';
import { createScheduledTask } from '../core/scheduler.ts';
import { type ConfigSchema, resolveConfig } from '../utilities/config.ts';
import { validateParam } from '../utilities/types.ts';

export type TabsDirection = 'top' | 'bottom' | 'left' | 'right';
export type TabsValue = number | string;
export type TabsDisabled = TabsValue | TabsValue[];

export interface TabsClassNames {
  root: string;
  wrap: string;
  list: string;
  tab: string;
  indicator: string;
  panelWrap: string;
  panel: string;
  dragging: string;
}

export type TabsClassNameConfig = Partial<TabsClassNames>;

export interface TabsPanelContext {
  tabs: Tabs;
  item: TabItem;
  index: number;
  name: string | number;
}

export type TabContent =
  | RenderableContent<TabsPanelContext>
  | ((context: TabsPanelContext) => RenderableContent<TabsPanelContext>)
  | ((
      context: TabsPanelContext
    ) => Promise<RenderableContent<TabsPanelContext>>);

export interface TabItem extends Record<string, unknown> {
  name?: string;
  title: RenderableContent<TabsPanelContext>;
  content: TabContent;
  cache?: boolean;
  ttl?: number;
}

export interface TabsProps extends Record<string, unknown> {
  id?: string | null;
  direction?: TabsDirection;
  active?: TabsValue;
  disabled?: TabsDisabled;
  onChange?:
    | ((
        index: number,
        name: string | number,
        tab: HTMLElement | undefined,
        panel: HTMLElement | undefined
      ) => void | Promise<void>)
    | null;
  data?: TabItem[];
  className?: TabsClassNameConfig;
}

interface ResolvedTabsProps extends Record<string, unknown> {
  id: string;
  direction: TabsDirection;
  active: TabsValue;
  disabled: TabsDisabled;
  onChange: NonNullable<TabsProps['onChange']> | null;
  data: TabItem[];
  className: TabsClassNames;
}

interface TabsState extends Record<string, unknown> {
  data: TabItem[];
  active: TabsValue;
  disabled: TabsDisabled;
  draggable: boolean;
  dragging: boolean;
  loading: boolean;
}

interface TabsCurrent {
  index: number;
  name: string | null;
}

interface TabsPanelCacheEntry {
  content: RenderableContent<TabsPanelContext>;
  updatedAt: number;
}

interface TabsActions {
  activate(value: TabsValue): Promise<void>;
}

type TabsBase = FunctionalComponent<
  ResolvedTabsProps,
  TabsState,
  HTMLElement,
  TabsActions
>;

export type Tabs = TabsBase & {
  readonly current: TabsCurrent;
};

type PointerDragEvent = MouseEvent | TouchEvent;

const DEFAULT_CLASS_NAMES: TabsClassNames = {
  root: 'j-tabs',
  wrap: 'tab-wrap',
  list: 'tab-nav',
  tab: 'tab-item',
  indicator: 'tab-indicator',
  panelWrap: 'tab-panel',
  panel: 'panel-item',
  dragging: 'dragging',
};

const TABS_PROPS_SCHEMA = {
  id: {
    default: null,
    types: ['string', 'null'],
    normalize: (value: unknown) => {
      if (typeof value === 'string') return value.trim() || randomId();
      return value == null ? randomId() : value;
    },
  },
  direction: {
    default: 'top',
    type: 'string',
    enum: ['top', 'bottom', 'left', 'right'],
  },
  active: { default: 0, types: ['number', 'string'] },
  disabled: { default: [], types: ['number', 'string', 'array'] },
  onChange: { default: null, types: ['function', 'null'] },
  data: { default: [], type: 'array' },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'plainObject',
    merge: 'shallow',
  },
} satisfies ConfigSchema<TabsProps>;

const TAB_CONFIG_RULE = {
  type: 'plainObject',
  shape: {
    name: ['string', 'null', 'undefined'],
    title: 'renderable',
    content: 'renderable',
    cache: ['boolean', 'undefined'],
    ttl: ['number', 'undefined'],
  },
};

const TABS_STATE_SCHEMA = {
  data: TABS_PROPS_SCHEMA.data,
  active: TABS_PROPS_SCHEMA.active,
  disabled: TABS_PROPS_SCHEMA.disabled,
};

function normalizeTabItem(
  item: TabItem,
  index: number,
  namespace = 'Tabs.data'
): TabItem {
  validateParam(String(index), item, TAB_CONFIG_RULE, namespace);
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const resolvedName = name || randomId();
  return { ...item, name: resolvedName };
}

function normalizeData(data: unknown, namespace = 'Tabs.data'): TabItem[] {
  validateParam('data', data, TABS_STATE_SCHEMA.data, namespace);
  const names = new Set<string>();
  return (data as TabItem[]).map((item, index) => {
    const next = normalizeTabItem(item, index, namespace);
    const resolvedName = next.name as string;
    if (names.has(resolvedName)) {
      throw new Error(
        `${namespace}: item name "${resolvedName}" must be unique.`
      );
    }
    names.add(resolvedName);
    return next;
  });
}

function normalizeDisabled(disabled: TabsDisabled): TabsDisabled {
  return Array.isArray(disabled) ? [...disabled] : disabled;
}

function normalizeProps(input: TabsProps): ResolvedTabsProps {
  const props = resolveConfig(input, TABS_PROPS_SCHEMA, 'Tabs.props');
  return {
    id: props.id as string,
    direction: props.direction as TabsDirection,
    active: props.active as TabsValue,
    disabled: normalizeDisabled(props.disabled as TabsDisabled),
    onChange: props.onChange as ResolvedTabsProps['onChange'],
    data: normalizeData(props.data, 'Tabs.props.data'),
    className: props.className as TabsClassNames,
  };
}

function normalizeTtl(ttl: unknown): number {
  return typeof ttl === 'number' && ttl > 0 ? ttl : 0;
}

export function createTabs(input: TabsProps = {}): Tabs {
  const props = normalizeProps(input);
  const state = createDeepStore({
    data: props.data,
    active: props.active,
    disabled: props.disabled,
    draggable: false,
    dragging: false,
    loading: false,
  }) as TabsState;
  const events = createEventManager();
  const wrapRef = createElementRef<HTMLElement>();
  const listRef = createElementRef<HTMLElement>();
  const indicatorRef = createElementRef<HTMLElement>();
  const tabs = createKeyedElementRefs<string, HTMLElement>();
  const panels = createKeyedElementRefs<string, HTMLElement>();
  const cache = new Map<string, TabsPanelCacheEntry>();
  const loaders = new Map<string, () => Promise<void>>();
  let instance!: Tabs;
  let loadId = 0;
  let pointerDragging = false;
  let inertiaFrame = 0;
  let resizeFrame = 0;
  let velocity = 0;
  let indicatorName: string | null = null;
  let resizeObserver: ResizeObserver | null = null;
  const observed = new Set<Element>();
  const indicatorTransition: TransitionDefinition = {
    keyframes: [],
    options: {
      duration: 240,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'none',
    },
  };
  const indicatorMotion = createTransition(
    () => indicatorRef.current,
    indicatorTransition
  );

  const getIndex = (value: TabsValue): number =>
    typeof value === 'number'
      ? value
      : state.data.findIndex((item) => item.name === value);
  const current = (): TabsCurrent => {
    const index = getIndex(state.active);
    const item = state.data[index];
    return item
      ? { index, name: item.name as string }
      : { index: -1, name: null };
  };
  const activeName = (): string | null => {
    if (typeof state.active === 'string') return state.active;
    const item = state.data[state.active];
    return item ? (item.name as string) : null;
  };
  const disabledNames = (): string[] => {
    const values = Array.isArray(state.disabled)
      ? state.disabled
      : [state.disabled];
    return Array.from(
      new Set(
        values
          .map((value) =>
            typeof value === 'number' ? state.data[value]?.name : value
          )
          .filter((name): name is string => typeof name === 'string')
      )
    );
  };
  const isDisabled = (name: string): boolean => disabledNames().includes(name);
  const isActive = (name: string): boolean => activeName() === name;
  const renderableData = createMemo(() => state.data);

  const refreshDrag = (): void => {
    const wrap = wrapRef.current;
    const list = listRef.current;
    if (!wrap || !list) return;
    const vertical = props.direction === 'left' || props.direction === 'right';
    const next = vertical
      ? list.scrollHeight > wrap.clientHeight + 5
      : list.scrollWidth > wrap.clientWidth + 5;
    if (state.draggable !== next) {
      flushSync(() => {
        state.draggable = next;
      });
    }
  };
  const refreshIndicator = (): void => {
    const indicator = indicatorRef.current;
    const list = listRef.current;
    const name = current().name;
    const tab = name ? tabs.get(name) : null;
    if (!indicator || !list) return;
    if (!tab || !list.isConnected) {
      indicatorMotion.cancel();
      indicator.style.display = 'none';
      indicatorName = null;
      return;
    }
    const target = tab.getBoundingClientRect();
    const origin = list.getBoundingClientRect();
    if (!target.width || !target.height) return;
    // Read the visible position before cancelling an interrupted animation.
    const previous = indicator.getBoundingClientRect();
    const animate =
      indicatorName !== null &&
      indicatorName !== name &&
      previous.width > 0 &&
      previous.height > 0;
    const x = target.left - origin.left + list.scrollLeft - list.clientLeft;
    const y = target.top - origin.top + list.scrollTop - list.clientTop;
    const transform = `translate3d(${x}px, ${y}px, 0)`;
    indicatorMotion.cancel();
    Object.assign(indicator.style, {
      display: 'block',
      width: `${target.width}px`,
      height: `${target.height}px`,
      transform,
    });
    indicatorName = name;
    if (animate) {
      indicatorTransition.keyframes = [
        {
          transform: `translate3d(${previous.left - origin.left + list.scrollLeft - list.clientLeft}px, ${previous.top - origin.top + list.scrollTop - list.clientTop}px, 0) scale(${previous.width / target.width}, ${previous.height / target.height})`,
        },
        { transform },
      ];
      void indicatorMotion.enter();
    }
  };
  const refreshTask = createScheduledTask(() => {
    refreshDrag();
    refreshIndicator();
    if (!resizeObserver) return;
    const targets = new Set<Element>([
      ...(listRef.current ? [listRef.current] : []),
      ...(wrapRef.current ? [wrapRef.current] : []),
      ...state.data.flatMap((item) => {
        const tab = tabs.get(item.name as string);
        return tab ? [tab] : [];
      }),
    ]);
    for (const target of observed) {
      if (!targets.has(target)) {
        resizeObserver.unobserve(target);
        observed.delete(target);
      }
    }
    for (const target of targets) {
      if (!observed.has(target)) resizeObserver.observe(target);
      observed.add(target);
    }
  });

  const startInertia = (): void => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let speed = velocity;
    let last = performance.now();
    const vertical = props.direction === 'left' || props.direction === 'right';
    const step = (now: number): void => {
      const elapsed = now - last;
      last = now;
      speed *= 0.92;
      if (Math.abs(speed) < 0.3) return;
      if (vertical) wrap.scrollTop += speed * elapsed * 0.05;
      else wrap.scrollLeft += speed * elapsed * 0.05;
      inertiaFrame = requestAnimationFrame(step);
    };
    inertiaFrame = requestAnimationFrame(step);
  };

  const bindDrag = (): void => {
    const wrap = wrapRef.current;
    const list = listRef.current;
    if (!wrap || !list) return;
    let start = 0;
    let scrollStart = 0;
    let last = 0;
    let pendingFrame = false;
    let distance = 0;
    const position = (event: PointerDragEvent): number => {
      const vertical =
        props.direction === 'left' || props.direction === 'right';
      if ('touches' in event) {
        const touch = event.touches[0] || event.changedTouches[0];
        return vertical ? touch.pageY : touch.pageX;
      }
      return vertical ? event.pageY : event.pageX;
    };
    const startDrag = (event: Event): void => {
      if (!state.draggable) return;
      if (!(event instanceof MouseEvent) && !(event instanceof TouchEvent))
        return;
      pointerDragging = true;
      flushSync(() => {
        state.dragging = true;
      });
      start = position(event);
      last = start;
      const vertical =
        props.direction === 'left' || props.direction === 'right';
      scrollStart = vertical ? wrap.scrollTop : wrap.scrollLeft;
      velocity = 0;
      cancelAnimationFrame(inertiaFrame);
    };
    const moveDrag = (event: Event): void => {
      if (!pointerDragging) return;
      if (!(event instanceof MouseEvent) && !(event instanceof TouchEvent))
        return;
      event.preventDefault();
      const next = position(event);
      distance = start - next;
      velocity = last - next;
      last = next;
      if (pendingFrame) return;
      pendingFrame = true;
      requestAnimationFrame(() => {
        pendingFrame = false;
        const vertical =
          props.direction === 'left' || props.direction === 'right';
        if (vertical) wrap.scrollTop = scrollStart + distance;
        else wrap.scrollLeft = scrollStart + distance;
      });
    };
    const endDrag = (): void => {
      if (!pointerDragging) return;
      pointerDragging = false;
      flushSync(() => {
        state.dragging = false;
      });
      startInertia();
    };
    events.on('drag:mousedown', list, 'mousedown', startDrag);
    events.on('drag:touchstart', list, 'touchstart', startDrag, {
      passive: true,
    });
    events.on('drag:mousemove', window, 'mousemove', moveDrag, {
      passive: false,
    });
    events.on('drag:touchmove', window, 'touchmove', moveDrag, {
      passive: false,
    });
    events.on('drag:mouseup', window, 'mouseup', endDrag);
    events.on('drag:touchend', window, 'touchend', endDrag);
  };

  const activate = async (value: TabsValue): Promise<void> => {
    if (!instance.runtime.built)
      throw new Error('Tabs.activate: call build() first.');
    const index = getIndex(value);
    const item = state.data[index];
    if (!item) return;
    const name = item.name as string;
    if (isDisabled(name) || isActive(name)) return;
    flushSync(() => {
      state.active = value;
    });
    await loaders.get(name)?.();
    await Promise.resolve(
      props.onChange?.(index, name, tabs.get(name), panels.get(name))
    );
  };

  const panelView = (item: () => TabItem, index: () => number): HTMLElement => {
    const name = item().name as string;
    const initial = item().content;
    const [content, setContent] = createSignal<
      RenderableContent<TabsPanelContext>
    >(typeof initial === 'function' ? null : initial);
    const [loading, setLoading] = createSignal(false);
    let source: TabContent = initial;
    let localLoadId = 0;
    let pending: Promise<void> | null = null;

    const context = (): TabsPanelContext => ({
      tabs: instance,
      item: item(),
      index: index(),
      name,
    });
    const load = async (): Promise<void> => {
      const current = item();
      const source = current.content;
      if (typeof source !== 'function') {
        setContent(source);
        return;
      }
      const cached = current.cache ? cache.get(name) : null;
      const ttlValue = normalizeTtl(current.ttl);
      if (cached && (!ttlValue || Date.now() - cached.updatedAt <= ttlValue)) {
        setContent(cached.content);
        return;
      }
      if (pending) return pending;
      const request = ++localLoadId;
      loadId += 1;
      const activeLoad = loadId;
      setLoading(true);
      flushSync(() => {
        state.loading = true;
      });
      const task = Promise.resolve()
        .then(() =>
          (source as (context: TabsPanelContext) => unknown)(context())
        )
        .then((result) => {
          if (request !== localLoadId || instance.runtime.destroyed) return;
          if (item().cache) {
            cache.set(name, {
              content: result as RenderableContent<TabsPanelContext>,
              updatedAt: Date.now(),
            });
          }
          setContent(result as RenderableContent<TabsPanelContext>);
        })
        .finally(() => {
          if (request === localLoadId) setLoading(false);
          if (activeLoad === loadId && !instance.runtime.destroyed) {
            flushSync(() => {
              state.loading = false;
            });
          }
          if (pending === task) pending = null;
        });
      pending = task;
      return task;
    };
    loaders.set(name, load);
    onCleanup(() => {
      cache.delete(name);
      loaders.delete(name);
    });

    createEffect(() => {
      const nextContent = item().content;
      if (nextContent !== source) {
        source = nextContent;
        localLoadId += 1;
        pending = null;
        cache.delete(name);
        setContent(typeof nextContent === 'function' ? null : nextContent);
      }
      if (isActive(name)) void load();
    });

    const panelContent = (): RenderableContent<TabsPanelContext> => {
      if (loading()) return createLoading('flex-start', 'flex-start');
      const value = content();
      if (typeof value === 'function') return value(context());
      return value;
    };

    return jsx('div', {
      className: props.className.panel,
      'data-tabs-panel': name,
      role: 'tabpanel',
      'aria-hidden': () => (isActive(name) ? 'false' : 'true'),
      'aria-live': () =>
        typeof item().content === 'function' ? 'polite' : null,
      'aria-busy': () => String(loading()),
      hidden: () => !isActive(name),
      ref: panels.bind(name),
      children: () => asRenderable(panelContent()),
    }) as HTMLElement;
  };

  const tabView = (item: () => TabItem, index: () => number): HTMLElement => {
    const name = item().name as string;
    const title = (): RenderableContent<TabsPanelContext> => {
      const value = item().title;
      const context: TabsPanelContext = {
        tabs: instance,
        item: item(),
        index: index(),
        name,
      };
      return typeof value === 'function' ? value(context) : value;
    };
    const text = jsx('span', {
      children: () => asRenderable(title()),
    });
    return jsx('div', {
      className: props.className.tab,
      'data-tabs-tab': name,
      role: 'tab',
      'aria-selected': () => (isActive(name) ? 'true' : 'false'),
      'aria-disabled': () => (isDisabled(name) ? 'true' : 'false'),
      ref: tabs.bind(name),
      children: text,
    }) as HTMLElement;
  };

  instance = defineComponent<
    ResolvedTabsProps,
    TabsState,
    HTMLElement,
    TabsActions
  >({
    name: 'Tabs',
    props,
    state,
    actions: {
      activate,
    },
    normalizeStatePatch(patch) {
      return {
        ...patch,
        ...(Object.hasOwn(patch, 'data')
          ? { data: normalizeData(patch.data, 'Tabs.setState.data') }
          : {}),
        ...(Object.hasOwn(patch, 'disabled') && Array.isArray(patch.disabled)
          ? { disabled: normalizeDisabled(patch.disabled) }
          : {}),
      };
    },
    validateStatePatch(patch) {
      validateParam('state', patch, { type: 'plainObject' }, 'Tabs.setState');
      for (const key of Object.keys(patch)) {
        if (!Object.hasOwn(TABS_STATE_SCHEMA, key)) {
          throw new Error(
            `Tabs.setState: "${key}" is not a supported state key.`
          );
        }
        const stateKey = key as keyof typeof TABS_STATE_SCHEMA;
        validateParam(
          key,
          patch[key as keyof TabsState],
          TABS_STATE_SCHEMA[stateKey],
          'Tabs.setState'
        );
      }
    },
    view: () => {
      const indicator = jsx('div', {
        className: props.className.indicator,
        'data-tabs-indicator': '',
        'aria-hidden': 'true',
        ref: indicatorRef.set,
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          pointerEvents: 'none',
          transformOrigin: '0 0',
          display: 'none',
        },
      });
      const tabList = For({
        each: renderableData,
        key: (item: TabItem) => item.name,
        children: (item: () => TabItem, index: () => number) =>
          tabView(item, index),
      });
      createEffect(() => {
        const names = state.data.map((item) => item.name);
        const active = state.active;
        refreshTask.schedule();
        return { names, active };
      });
      return jsx('div', {
        className: props.className.root,
        id: props.id,
        'data-tabs': 'root',
        'data-direction': props.direction,
        children: [
          jsx('div', {
            className: props.className.wrap,
            'data-tabs-wrap': '',
            ref: wrapRef.set,
            children: jsx('nav', {
              className: () =>
                joinClasses(
                  props.className.list,
                  state.dragging && props.className.dragging
                ),
              'data-tabs-nav': '',
              ref: listRef.set,
              children: () => [indicator, tabList],
            }),
          }),
          jsx('div', {
            className: props.className.panelWrap,
            'data-tabs-panels': '',
            children: For({
              each: renderableData,
              key: (item: TabItem) => item.name,
              children: (item: () => TabItem, index: () => number) =>
                panelView(item, index),
            }),
          }),
        ],
      }) as HTMLElement;
    },
    onBuild(context) {
      const root = context.element;
      if (!root) return;
      events.on('click', root, 'click', (event) => {
        if (!(event.target instanceof Element)) return;
        const tab = event.target.closest<HTMLElement>('[data-tabs-tab]');
        const name = tab?.dataset.tabsTab;
        if (name && !isDisabled(name)) void activate(name);
      });
      events.on('resize', window, 'resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => refreshTask.schedule());
      });
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => refreshTask.schedule());
        context.own(() => {
          resizeObserver?.disconnect();
          resizeObserver = null;
          observed.clear();
        });
      }
      bindDrag();
      context.own(() => events.clear());
      refreshTask.schedule();
      void loaders.get(current().name || '')?.();
    },
    onMount() {
      refreshTask.schedule();
    },
    onUnmount() {
      indicatorMotion.cancel();
      indicatorName = null;
    },
    onDestroy() {
      loadId += 1;
      indicatorMotion.cancel();
      refreshTask.dispose();
      cancelAnimationFrame(inertiaFrame);
      cancelAnimationFrame(resizeFrame);
      cache.clear();
      loaders.clear();
      tabs.clear();
      panels.clear();
    },
  }) as Tabs;

  Object.defineProperties(instance, {
    current: { enumerable: true, get: current },
  });

  return instance;
}

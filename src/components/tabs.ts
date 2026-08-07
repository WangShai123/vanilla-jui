import {
  For,
  createDeepStore,
  createEffect,
  createSignal,
  flushSync,
  jsx,
} from 'vanilla-signal';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
import { createLoading } from '../primitives/loading.ts';
import {
  type RenderableContent,
  normalizeContentNodes,
} from '../utilities/dom.ts';
import { createEventManager } from '../utilities/events.ts';
import { randomId } from '../utilities/id.ts';
import { createElementRef, createKeyedElementRefs } from '../utilities/refs.ts';
import { createScheduledTask } from '../utilities/scheduler.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';

export type TabsDirection = 'top' | 'bottom' | 'left' | 'right';
export type TabsValue = number | string;
export type TabsDisabled = TabsValue | TabsValue[];

export interface TabsClassNames {
  root: string;
  wrap: string;
  list: string;
  tab: string;
  panelWrap: string;
  panel: string;
  disabled: string;
  dragging: string;
}

export type TabsClassNameConfig = Partial<TabsClassNames>;

export interface TabsPanelContext {
  tabs: Tabs;
  item: TabItem;
  index: number;
  name: string | number;
}

export interface TabTitleContext {
  tabs: Tabs;
  item: TabItem;
}

export type TabPanel =
  | RenderableContent<TabsPanelContext>
  | ((context: TabsPanelContext) => RenderableContent<TabsPanelContext>)
  | ((
      context: TabsPanelContext
    ) => Promise<RenderableContent<TabsPanelContext>>);

export interface TabItem extends Record<string, unknown> {
  name?: string;
  title: RenderableContent<TabTitleContext>;
  panel: TabPanel;
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
  direction: TabsDirection;
  draggable: boolean;
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
  refresh(): Tabs;
}

type TabsBase = FunctionalComponent<
  ResolvedTabsProps,
  TabsState,
  HTMLElement,
  TabsActions
>;

export type Tabs = TabsBase & {
  readonly current: TabsCurrent;
  readonly activeIndex: number;
  readonly disabledNames: string[];
};

type PointerDragEvent = MouseEvent | TouchEvent;

const DEFAULT_CLASS_NAMES: TabsClassNames = {
  root: 'j-tabs',
  wrap: 'tab-wrap',
  list: 'tab-list',
  tab: 'tab-item',
  panelWrap: 'tab-panel',
  panel: 'panel-item',
  disabled: 'is-disabled',
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
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
} satisfies ResolveSchema<TabsProps>;

const TAB_CONFIG_RULE = {
  type: 'plainObject',
  shape: {
    name: ['string', 'null', 'undefined'],
    title: 'renderable',
    panel: 'renderable',
    cache: ['boolean', 'undefined'],
    ttl: ['number', 'undefined'],
  },
};

const TABS_STATE_SCHEMA = {
  data: TABS_PROPS_SCHEMA.data,
  active: TABS_PROPS_SCHEMA.active,
  disabled: TABS_PROPS_SCHEMA.disabled,
  direction: TABS_PROPS_SCHEMA.direction,
};

function normalizeData(data: unknown, namespace = 'Tabs.data'): TabItem[] {
  validateParam('data', data, TABS_STATE_SCHEMA.data, namespace);
  const names = new Set<string>();
  return (data as TabItem[]).map((item, index) => {
    validateParam(String(index), item, TAB_CONFIG_RULE, namespace);
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const resolvedName = name || randomId();
    if (names.has(resolvedName)) {
      throw new Error(
        `${namespace}: item name "${resolvedName}" must be unique.`
      );
    }
    names.add(resolvedName);
    return { ...item, name: resolvedName };
  });
}

function normalizeDisabled(disabled: TabsDisabled): TabsDisabled {
  return Array.isArray(disabled) ? [...disabled] : disabled;
}

function normalizeProps(input: TabsProps): ResolvedTabsProps {
  const props = resolveProps(input, TABS_PROPS_SCHEMA, 'Tabs.props');
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
    direction: props.direction,
    draggable: false,
    loading: false,
  }) as TabsState;
  const events = createEventManager();
  const wrapRef = createElementRef<HTMLElement>();
  const listRef = createElementRef<HTMLElement>();
  const tabs = createKeyedElementRefs<string, HTMLElement>();
  const panels = createKeyedElementRefs<string, HTMLElement>();
  const cache = new Map<string, TabsPanelCacheEntry>();
  const loaders = new Map<string, () => Promise<void>>();
  let instance!: Tabs;
  let loadId = 0;
  let dragging = false;
  let inertiaFrame = 0;
  let resizeFrame = 0;
  let velocity = 0;

  const itemName = (item: TabItem): string => item.name as string;
  const getIndex = (value: TabsValue): number =>
    typeof value === 'number'
      ? value
      : state.data.findIndex((item) => itemName(item) === value);
  const current = (): TabsCurrent => {
    const index = getIndex(state.active);
    const item = state.data[index];
    return item ? { index, name: itemName(item) } : { index: -1, name: null };
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
  const isActive = (name: string): boolean => current().name === name;

  const refreshDrag = (): void => {
    const wrap = wrapRef.current;
    const list = listRef.current;
    if (!wrap || !list) return;
    const vertical = state.direction === 'left' || state.direction === 'right';
    const next = vertical
      ? list.scrollHeight > wrap.clientHeight + 5
      : list.scrollWidth > wrap.clientWidth + 5;
    if (state.draggable !== next) {
      flushSync(() => {
        state.draggable = next;
      });
    }
  };
  const refreshTask = createScheduledTask(refreshDrag);

  const startInertia = (): void => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let speed = velocity;
    let last = performance.now();
    const vertical = state.direction === 'left' || state.direction === 'right';
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
        state.direction === 'left' || state.direction === 'right';
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
      dragging = true;
      list.classList.add(props.className.dragging);
      start = position(event);
      last = start;
      const vertical =
        state.direction === 'left' || state.direction === 'right';
      scrollStart = vertical ? wrap.scrollTop : wrap.scrollLeft;
      velocity = 0;
      cancelAnimationFrame(inertiaFrame);
    };
    const moveDrag = (event: Event): void => {
      if (!dragging) return;
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
          state.direction === 'left' || state.direction === 'right';
        if (vertical) wrap.scrollTop = scrollStart + distance;
        else wrap.scrollLeft = scrollStart + distance;
      });
    };
    const endDrag = (): void => {
      if (!dragging) return;
      dragging = false;
      list.classList.remove(props.className.dragging);
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
    const name = itemName(item);
    if (isDisabled(name) || isActive(name)) return;
    flushSync(() => {
      state.active = value;
    });
    await loaders.get(name)?.();
    await Promise.resolve(
      props.onChange?.(index, name, tabs.get(name), panels.get(name))
    );
  };

  const panelView = (
    itemAccessor: () => TabItem,
    indexAccessor: () => number,
    name: string
  ): HTMLElement => {
    const initial = itemAccessor().panel;
    const [content, setContent] = createSignal<
      RenderableContent<TabsPanelContext>
    >(typeof initial === 'function' ? null : initial);
    const [loading, setLoading] = createSignal(false);
    let source: TabPanel = initial;
    let localLoadId = 0;
    let pending: Promise<void> | null = null;

    const context = (): TabsPanelContext => ({
      tabs: instance,
      item: itemAccessor(),
      index: indexAccessor(),
      name,
    });
    const load = async (): Promise<void> => {
      const item = itemAccessor();
      if (typeof item.panel !== 'function') {
        setContent(item.panel);
        return;
      }
      const cached = item.cache ? cache.get(name) : null;
      const ttl = normalizeTtl(item.ttl);
      if (cached && (!ttl || Date.now() - cached.updatedAt <= ttl)) {
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
          (item.panel as (context: TabsPanelContext) => unknown)(context())
        )
        .then((result) => {
          if (request !== localLoadId || instance.runtime.destroyed) return;
          if (item.cache) {
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

    createEffect(() => {
      const panel = itemAccessor().panel;
      if (panel !== source) {
        source = panel;
        localLoadId += 1;
        pending = null;
        cache.delete(name);
        setContent(typeof panel === 'function' ? null : panel);
      }
      if (isActive(name)) void load();
    });

    return jsx('div', {
      className: props.className.panel,
      'data-tabs-panel': name,
      role: 'tabpanel',
      'aria-hidden': () => (isActive(name) ? 'false' : 'true'),
      'aria-live': () =>
        typeof itemAccessor().panel === 'function' ? 'polite' : null,
      'aria-busy': () => String(loading()),
      hidden: () => !isActive(name),
      ref: panels.bind(name),
      children: () =>
        loading()
          ? createLoading()
          : normalizeContentNodes(content(), context()),
    }) as HTMLElement;
  };

  const tabView = (
    itemAccessor: () => TabItem,
    _indexAccessor: () => number
  ): HTMLElement => {
    const name = itemName(itemAccessor());
    return jsx('div', {
      className: () =>
        [props.className.tab, isDisabled(name) ? props.className.disabled : '']
          .filter(Boolean)
          .join(' '),
      'data-tabs-tab': name,
      role: 'tab',
      'aria-selected': () => (isActive(name) ? 'true' : 'false'),
      'aria-disabled': () => (isDisabled(name) ? 'true' : 'false'),
      ref: tabs.bind(name),
      children: () =>
        normalizeContentNodes(itemAccessor().title, {
          tabs: instance,
          item: itemAccessor(),
        }),
    }) as HTMLElement;
  };

  instance = defineComponent({
    name: 'Tabs',
    props,
    state,
    actions: {
      activate,
      refresh() {
        refreshTask.flush();
        return instance;
      },
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
      createEffect(() => {
        const layoutKey = `${state.direction}:${state.data.length}`;
        if (layoutKey) refreshTask.schedule();
      });
      return jsx('div', {
        className: props.className.root,
        id: props.id,
        'data-tabs': 'root',
        'data-tabs-direction': () => state.direction,
        children: [
          jsx('div', {
            className: props.className.wrap,
            'data-tabs-wrap': '',
            ref: wrapRef.set,
            children: jsx('nav', {
              className: props.className.list,
              'data-tabs-list': '',
              ref: listRef.set,
              children: For({
                each: () => state.data,
                key: (item: TabItem) => itemName(item),
                children: tabView,
              }),
            }),
          }),
          jsx('div', {
            className: props.className.panelWrap,
            'data-tabs-panel-wrap': '',
            children: For({
              each: () => state.data,
              key: (item: TabItem) => itemName(item),
              children: (
                itemAccessor: () => TabItem,
                indexAccessor: () => number
              ) =>
                panelView(
                  itemAccessor,
                  indexAccessor,
                  itemName(itemAccessor())
                ),
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
        resizeFrame = requestAnimationFrame(refreshDrag);
      });
      bindDrag();
      context.own(() => events.clear());
      refreshTask.schedule();
      void loaders.get(current().name || '')?.();
    },
    onMount() {
      refreshTask.schedule();
    },
    onDestroy() {
      loadId += 1;
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
    activeIndex: { enumerable: true, get: () => current().index },
    disabledNames: { enumerable: true, get: disabledNames },
  });

  return instance;
}

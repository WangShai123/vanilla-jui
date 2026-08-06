import {
  bindAttr,
  createDeepStore,
  createEffect,
  createRoot,
  flushSync,
  jsx,
  untrack,
} from 'vanilla-signal';

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
} from '../core/Component.ts';
import { createLoading } from '../primitives/loading.ts';
import {
  type RenderableContent,
  normalizeContentNodes,
  q,
} from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
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
  current: {
    index: number;
    name: string | null;
  };
  isVertical: boolean;
  draggable: boolean;
  loading: boolean;
}

interface TabsDisabledState {
  names: string[];
  indexes: number[];
}

interface TabsDOM extends ComponentDOM {
  root: HTMLElement | null;
  tabs: HTMLElement[];
  panels: HTMLElement[];
}

interface TabsPanelCacheEntry {
  content: RenderableContent<TabsPanelContext>;
  updatedAt: number;
}

interface TabsRuntime extends ComponentRuntime {
  built: boolean;
  cache: {
    panels: Map<string, TabsPanelCacheEntry>;
  };
  panelLoadId: number;
}

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
      if (typeof value === 'string') {
        const id = value.trim();
        return id || randomId();
      }
      if (value == null) return randomId();
      return value;
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
    title: 'renderable',
    panel: 'renderable',
  },
};

function cloneTabItems(tabs: unknown): TabItem[] {
  return Array.isArray(tabs)
    ? tabs.map((item) => {
        const nextItem = { ...(item as TabItem) };
        nextItem.name = nextItem.name || randomId();
        return nextItem;
      })
    : [];
}

function cloneDisabled(disabled: TabsDisabled): TabsDisabled {
  return Array.isArray(disabled) ? disabled.slice() : disabled;
}

function resolveDisabledState(
  disabled: TabsDisabled,
  data: TabItem[]
): TabsDisabledState {
  const toName = (val: TabsValue): string | null => {
    if (typeof val === 'number') return data[val]?.name || null;
    if (typeof val === 'string') return val;
    return null;
  };
  const names = Array.isArray(disabled)
    ? disabled.map(toName).filter((name): name is string => !!name)
    : (() => {
        const name = toName(disabled);
        return name ? [name] : [];
      })();
  const uniqNames = Array.from(new Set(names));

  return {
    names: uniqNames,
    indexes: uniqNames
      .map((name) => data.findIndex((tab) => tab.name === name))
      .filter((index) => index >= 0),
  };
}

function normalizeTtl(ttl: unknown): number {
  return typeof ttl === 'number' && ttl > 0 ? ttl : 0;
}

function normalizeProps(input: TabsProps): ResolvedTabsProps {
  const props = resolveProps(input, TABS_PROPS_SCHEMA, 'Tabs');
  return {
    id: props.id as string,
    direction: props.direction as TabsDirection,
    active: props.active as TabsValue,
    disabled: props.disabled as TabsDisabled,
    onChange: props.onChange as ResolvedTabsProps['onChange'],
    data: cloneTabItems(props.data),
    className: props.className as TabsClassNames,
  };
}

const TABS_STATE_SCHEMA = {
  data: TABS_PROPS_SCHEMA.data,
  active: TABS_PROPS_SCHEMA.active,
  disabled: TABS_PROPS_SCHEMA.disabled,
  direction: TABS_PROPS_SCHEMA.direction,
};

/**
 * 标签页组件，继承 Component。
 *
 * DOM 创建一次，通过 createEffect 细粒度更新 class/ARIA。
 */
class TabsComponent extends Component<ResolvedTabsProps, TabsState, TabsDOM> {
  declare runtime: TabsRuntime;
  declare state: TabsState;
  private bindingsDispose: (() => void) | null;
  private stateDispose: (() => void) | null;
  private isDragging: boolean;
  private raf: number;
  private resizeRaf: number;
  private velocity: number;

  /**
   * @param {object} [input={}] 标签页配置。
   */
  constructor(input: TabsProps = {}) {
    const props = normalizeProps(input);
    super(props);

    this.dom.tabs = [];
    this.dom.panels = [];
    this.bindingsDispose = null;
    this.stateDispose = null;
    this.isDragging = false;
    this.raf = 0;
    this.resizeRaf = 0;
    this.velocity = 0;

    this.state = createDeepStore({
      data: cloneTabItems(props.data),
      active: props.active,
      disabled: cloneDisabled(props.disabled),
      direction: props.direction,
      current: {
        index: -1,
        name: null,
      },
      isVertical: props.direction === 'left' || props.direction === 'right',
      draggable: false,
      loading: false,
    }) as TabsState;

    this.runtime.cache = { panels: new Map() };
    this.runtime.built = false;
    this.runtime.panelLoadId = 0;
  }

  protected onInit(props: ResolvedTabsProps): void {
    this.dom.root = this.buildRoot(props);
    this.renderItems();
    void this.activateInternal(this.state.active, false);
    this.bindEvents();
    this.initDrag();
    this.bindState();
  }

  private buildRoot(props: ResolvedTabsProps): HTMLElement {
    const { id, className } = props;
    const nav = jsx('nav', {
      className: className.list,
      'data-tabs-list': '',
    }) as HTMLElement;
    const wrap = jsx('div', {
      className: className.wrap,
      'data-tabs-wrap': '',
      children: nav,
    }) as HTMLElement;
    const panelWrapper = jsx('div', {
      className: className.panelWrap,
      'data-tabs-panel-wrap': '',
    }) as HTMLElement;

    return jsx('div', {
      className: className.root,
      id,
      'data-tabs': 'root',
      'data-tabs-direction': this.state.direction,
      children: [wrap, panelWrapper],
    }) as HTMLElement;
  }

  private renderItems(): void {
    if (!this.dom.root) return;
    const tabList = q<HTMLElement>('[data-tabs-list]', this.dom.root);
    const panelWrapper = q<HTMLElement>(
      '[data-tabs-panel-wrap]',
      this.dom.root
    );
    if (!tabList || !panelWrapper) return;

    tabList.textContent = '';
    panelWrapper.textContent = '';

    this.dom.tabs = [];
    this.dom.panels = [];

    const tabFragment = document.createDocumentFragment();
    const panelFragment = document.createDocumentFragment();

    this.state.data.forEach((item, index) => {
      const name = item.name || randomId();

      const tab = jsx('div', {
        className: this.props.className.tab,
        'data-tabs-tab': name,
        role: 'tab',
        children: normalizeContentNodes(item.title, { tabs: this, item }),
      }) as HTMLElement;

      this.dom.tabs.push(tab);
      const panel = jsx('div', {
        className: this.props.className.panel,
        'data-tabs-panel': name,
        role: 'tabpanel',
      }) as HTMLElement;
      this.dom.panels.push(panel);

      if (typeof item.panel !== 'function') {
        panel.append(
          ...normalizeContentNodes(item.panel, {
            tabs: this,
            item,
            index,
            name,
          })
        );
      }
      tabFragment.append(tab);
      panelFragment.append(panel);
    });

    tabList.append(tabFragment);
    panelWrapper.append(panelFragment);

    this.bindingsDispose?.();
    this.bindingsDispose = createRoot((dispose) => {
      this.dom.tabs.forEach((tab, index) => {
        const name = tab.dataset.tabsTab || '';
        bindAttr(tab, 'aria-selected', () =>
          this.state.current.index === index ? 'true' : 'false'
        );
        bindAttr(tab, 'aria-disabled', () =>
          this.isDisabledName(name) ? 'true' : 'false'
        );
      });
      this.dom.panels.forEach((panel, index) => {
        bindAttr(panel, 'aria-hidden', () =>
          this.state.current.index !== index ? 'true' : 'false'
        );
      });
      return dispose;
    });
  }

  private bindState(): void {
    if (this.stateDispose) return;

    this.stateDispose = createRoot((dispose) => {
      let initialized = false;
      let previousData = this.state.data;
      let previousDirection = this.state.direction;
      let previousActive = this.state.active;
      createEffect(() => {
        const data = this.state.data;
        const direction = this.state.direction;
        const disabled = this.state.disabled;
        const active = this.state.active;
        if (!initialized) {
          initialized = true;
          return;
        }

        const dataChanged = data !== previousData;
        const directionChanged = direction !== previousDirection;
        const activeChanged = active !== previousActive;
        previousData = data;
        previousDirection = direction;
        previousActive = active;

        void untrack(() =>
          this.syncStateView({ dataChanged, directionChanged, activeChanged })
        );
        void disabled;
      });
      return dispose;
    });
  }

  private async syncStateView({
    dataChanged,
    directionChanged,
    activeChanged,
  }: {
    dataChanged: boolean;
    directionChanged: boolean;
    activeChanged: boolean;
  }): Promise<void> {
    if (!this.runtime.built || !this.dom.root) return;
    this.validateData(this.state.data);
    validateParam(
      'direction',
      this.state.direction,
      TABS_STATE_SCHEMA.direction,
      'Tabs.state'
    );
    validateParam(
      'disabled',
      this.state.disabled,
      TABS_STATE_SCHEMA.disabled,
      'Tabs.state'
    );
    validateParam(
      'active',
      this.state.active,
      TABS_STATE_SCHEMA.active,
      'Tabs.state'
    );

    if (directionChanged) {
      this.dom.root.setAttribute('data-tabs-direction', this.state.direction);
      flushSync(() => {
        this.state.isVertical =
          this.state.direction === 'left' || this.state.direction === 'right';
      });
    }

    if (dataChanged) {
      this.runtime.cache.panels.clear();
      this.renderItems();
      this.bindEvents();
      flushSync(() => {
        this.syncCurrent(-1);
      });
    }

    if (dataChanged || activeChanged) {
      await this.activateInternal(this.state.active, activeChanged);
    }

    this.refreshDrag();
  }

  private get disabledState(): TabsDisabledState {
    return resolveDisabledState(this.state.disabled, this.state.data);
  }

  private isDisabledName(name: string): boolean {
    return this.disabledState.names.includes(name);
  }

  private syncCurrent(index: number): void {
    this.state.current = {
      index,
      name:
        index >= 0 && index < this.dom.tabs.length
          ? this.dom.tabs[index]?.dataset.tabsTab || null
          : null,
    };
  }

  private getPanelKey(item: TabItem, index: number): string {
    return item.name || this.dom.tabs[index]?.dataset.tabsTab || String(index);
  }

  private getCachedPanel(
    item: TabItem,
    index: number
  ): TabsPanelCacheEntry | null {
    if (!item.cache) return null;

    const key = this.getPanelKey(item, index);
    const entry = this.runtime.cache.panels.get(key);
    if (!entry) return null;

    const ttl = normalizeTtl(item.ttl);
    if (ttl && Date.now() - entry.updatedAt > ttl) {
      this.runtime.cache.panels.delete(key);
      return null;
    }

    return entry;
  }

  private setCachedPanel(
    item: TabItem,
    index: number,
    content: RenderableContent<TabsPanelContext>
  ): void {
    if (!item.cache) return;

    this.runtime.cache.panels.set(this.getPanelKey(item, index), {
      content,
      updatedAt: Date.now(),
    });
  }

  private renderPanelContent(
    index: number,
    content: RenderableContent<TabsPanelContext>
  ): void {
    const panel = this.dom.panels[index];
    const item = this.state.data[index];
    if (!panel || !item) return;

    panel.textContent = '';
    panel.append(
      ...normalizeContentNodes(content, {
        tabs: this,
        item,
        index,
        name: this.dom.tabs[index]?.dataset.tabsTab || item.name || index,
      })
    );
  }

  private async loadPanel(index: number): Promise<void> {
    const item = this.state.data[index];
    const panel = this.dom.panels[index];
    if (!item || !panel || typeof item.panel !== 'function') {
      this.runtime.panelLoadId += 1;
      flushSync(() => {
        this.state.loading = false;
      });
      return;
    }

    const cached = this.getCachedPanel(item, index);
    if (cached) {
      this.runtime.panelLoadId += 1;
      flushSync(() => {
        this.state.loading = false;
      });
      this.renderPanelContent(index, cached.content);
      return;
    }

    const loadId = ++this.runtime.panelLoadId;
    flushSync(() => {
      this.state.loading = true;
    });
    panel.setAttribute('aria-live', 'polite');
    panel.setAttribute('aria-busy', 'true');
    panel.textContent = '';
    panel.appendChild(createLoading());

    try {
      const content = await Promise.resolve(
        item.panel({
          tabs: this,
          item,
          index,
          name: this.dom.tabs[index]?.dataset.tabsTab || item.name || index,
        })
      );

      if (this.runtime.destroyed || loadId !== this.runtime.panelLoadId) return;

      this.setCachedPanel(item, index, content);
      this.renderPanelContent(index, content);
    } finally {
      if (!this.runtime.destroyed && loadId === this.runtime.panelLoadId) {
        flushSync(() => {
          this.state.loading = false;
        });
        panel.setAttribute('aria-busy', 'false');
      }
    }
  }

  get activeIndex(): number {
    return this.state.current.index;
  }

  get disabledNames(): string[] {
    return this.disabledState.names;
  }

  private bindEvents(): void {
    this.unbindEvents();

    if (!this.dom.root) return;
    const tabList = q<HTMLElement>('[data-tabs-list]', this.dom.root);
    if (!tabList) return;

    this.cleanup.events.on('tabClick', tabList, 'click', (event) => {
      if (!(event.target instanceof Element)) return;
      const tab = event.target.closest<HTMLElement>('[data-tabs-tab]');
      if (!tab || !tabList.contains(tab)) return;
      const name = tab.dataset.tabsTab;
      if (name && !this.isDisabledName(name)) {
        void this.activate(name);
      }
    });
  }

  private unbindEvents(): void {
    this.cleanup.events.clear();
  }

  private assertActive(method: string): void {
    if (this.runtime.destroyed) {
      throw new Error(`Tabs.${method}: instance has been destroyed.`);
    }
    if (!this.runtime.built) {
      throw new Error(`Tabs.${method}: call build() first.`);
    }
  }

  private getIndex(val: TabsValue | undefined | null): number {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      return this.dom.tabs.findIndex((tab) => tab.dataset.tabsTab === val);
    }
    return -1;
  }

  private async activateInternal(
    val: TabsValue,
    fireEvent = true
  ): Promise<void> {
    const index = this.getIndex(val);
    const name = this.dom.tabs[index]?.dataset.tabsTab || '';
    if (
      index < 0 ||
      index >= this.dom.tabs.length ||
      this.isDisabledName(name) ||
      this.state.current.index === index
    ) {
      return;
    }

    flushSync(() => {
      this.syncCurrent(index);
    });

    await this.loadPanel(index);

    if (fireEvent && this.props.onChange) {
      const tabEl = this.dom.tabs[index];
      const panelEl = this.dom.panels[index];
      await Promise.resolve(
        this.props.onChange(
          index,
          tabEl?.dataset.tabsTab || index,
          tabEl,
          panelEl
        )
      );
    }
  }

  /**
   * 激活指定标签。
   * @param {number|string} val 标签索引或名称。
   */
  async activate(val: TabsValue): Promise<void> {
    this.assertActive('activate');
    this.state.active = val;
    await this.activateInternal(val, true);
  }

  /**
   * 构建 Tabs DOM。
   */
  build(): this {
    if (this.runtime.destroyed) {
      throw new Error('Tabs.build: instance has been destroyed.');
    }
    if (this.runtime.built) return this;
    try {
      this.runtime.built = true;
      this.onInit(this.props);
    } catch (error) {
      this.destroy();
      throw error;
    }
    this.emit('init', this.props);
    return this;
  }

  refresh(): this {
    this.assertActive('refresh');
    this.refreshDrag();
    return this;
  }

  private get dragContainer(): HTMLElement | null {
    return this.dom.root
      ? q<HTMLElement>('[data-tabs-wrap]', this.dom.root)
      : null;
  }

  private get dragInner(): HTMLElement | null {
    return this.dom.root
      ? q<HTMLElement>('[data-tabs-list]', this.dom.root)
      : null;
  }

  private initDrag(): void {
    const direction = this.state.direction;
    const container = this.dragContainer;
    const inner = this.dragInner;
    if (!container || !inner) return;

    const isVertical = direction === 'left' || direction === 'right';
    const draggable = isVertical
      ? inner.scrollHeight > container.clientHeight + 5
      : inner.scrollWidth > container.clientWidth + 5;

    flushSync(() => {
      this.state.isVertical = isVertical;
      this.state.draggable = draggable;
    });

    if (!draggable) {
      this.removeDragEvents();
      return;
    }

    this.bindDragEvents();

    this.cleanup.events.on('resize', window, 'resize', () => {
      cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = requestAnimationFrame(() => {
        this.refreshDrag();
      });
    });
  }

  private bindDragEvents(): void {
    this.removeDragEvents();

    const container = this.dragContainer;
    const inner = this.dragInner;
    if (!container || !inner) return;
    const isVertical = this.state.isVertical;

    let posStart = 0;
    let scrollStart = 0;
    let lastPos = 0;
    let frameRequested = false;

    const getPos = (event: PointerDragEvent): number => {
      if ('touches' in event) {
        const touch = event.touches[0] || event.changedTouches[0];
        return isVertical ? touch.pageY : touch.pageX;
      }
      return isVertical ? event.pageY : event.pageX;
    };

    const onDragStart = (event: Event): void => {
      if (!(event instanceof MouseEvent) && !(event instanceof TouchEvent)) {
        return;
      }
      this.isDragging = true;
      inner.classList.add(this.props.className.dragging);
      posStart = getPos(event);
      lastPos = posStart;
      scrollStart = isVertical ? container.scrollTop : container.scrollLeft;
      this.velocity = 0;
      cancelAnimationFrame(this.raf);
    };

    const onDragMove = (event: Event): void => {
      if (!this.isDragging) return;
      if (!(event instanceof MouseEvent) && !(event instanceof TouchEvent)) {
        return;
      }
      event.preventDefault();
      const current = getPos(event);
      const dist = posStart - current;
      this.velocity = lastPos - current;
      lastPos = current;

      if (!frameRequested) {
        frameRequested = true;
        requestAnimationFrame(() => {
          frameRequested = false;
          if (isVertical) container.scrollTop = scrollStart + dist;
          else container.scrollLeft = scrollStart + dist;
        });
      }
    };

    const onDragEnd = (): void => {
      if (!this.isDragging) return;
      this.isDragging = false;
      inner.classList.remove(this.props.className.dragging);
      this.startInertiaScroll();
    };

    this.cleanup.events.on('drag:mousedown', inner, 'mousedown', onDragStart);
    this.cleanup.events.on(
      'drag:touchstart',
      inner,
      'touchstart',
      onDragStart,
      {
        passive: true,
      }
    );
    this.cleanup.events.on('drag:mousemove', window, 'mousemove', onDragMove, {
      passive: false,
    });
    this.cleanup.events.on('drag:touchmove', window, 'touchmove', onDragMove, {
      passive: false,
    });
    this.cleanup.events.on('drag:mouseup', window, 'mouseup', onDragEnd);
    this.cleanup.events.on('drag:touchend', window, 'touchend', onDragEnd);
  }

  private startInertiaScroll(): void {
    const container = this.dragContainer;
    if (!container) return;
    let v = this.velocity;
    const isVertical = this.state.isVertical;
    let last = performance.now();

    const step = (now: number): void => {
      const dt = now - last;
      last = now;
      v *= 0.92;
      if (Math.abs(v) < 0.3) return;
      if (isVertical) container.scrollTop += v * dt * 0.05;
      else container.scrollLeft += v * dt * 0.05;
      this.raf = requestAnimationFrame(step);
    };

    this.raf = requestAnimationFrame(step);
  }

  private removeDragEvents(): void {
    this.cleanup.events.off('drag:mousedown');
    this.cleanup.events.off('drag:touchstart');
    this.cleanup.events.off('drag:mousemove');
    this.cleanup.events.off('drag:touchmove');
    this.cleanup.events.off('drag:mouseup');
    this.cleanup.events.off('drag:touchend');
  }

  private refreshDrag(): void {
    this.initDrag();
  }

  protected onDestroy(): void {
    this.unbindEvents();
    this.removeDragEvents();
    this.bindingsDispose?.();
    this.bindingsDispose = null;
    this.stateDispose?.();
    this.stateDispose = null;
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.resizeRaf);
    this.cleanup.events.off('resize');

    this.dom.root?.remove();
    this.runtime.built = false;
  }

  private validateData(data: TabItem[]): void {
    validateParam('data', data, TABS_STATE_SCHEMA.data, 'Tabs.state');
    data.forEach((item, index) => {
      validateParam(String(index), item, TAB_CONFIG_RULE, 'Tabs.state.data');
    });
  }

  protected override normalizeStatePatch(
    patch: Partial<TabsState>
  ): Partial<TabsState> {
    const nextPatch = { ...patch };
    if (Object.hasOwn(nextPatch, 'data') && Array.isArray(nextPatch.data)) {
      nextPatch.data = cloneTabItems(nextPatch.data);
    }
    if (
      Object.hasOwn(nextPatch, 'disabled') &&
      Array.isArray(nextPatch.disabled)
    ) {
      nextPatch.disabled = cloneDisabled(nextPatch.disabled);
    }
    return nextPatch;
  }

  protected override validateStatePatch(patch: Partial<TabsState>): void {
    validateParam(
      'state',
      patch,
      {
        type: 'plainObject',
      },
      'Tabs.setState'
    );

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

    if (Array.isArray(patch.data)) this.validateData(patch.data);
  }
}

export type Tabs = TabsComponent;

export function createTabs(input: TabsProps = {}): Tabs {
  return new TabsComponent(input);
}

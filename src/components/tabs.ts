import {
  bindAttr,
  createDeepStore,
  createRoot,
  flushSync,
  insert,
  jsx,
} from 'vanilla-signal';

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
} from '../core/Component.ts';
import {
  type ResolveSchema,
  randomId,
  resolveProps,
  validateParam,
} from '../utilities/core.ts';
import {
  type DOMReference,
  type RenderableContent,
  createLoading,
  isRenderableContent,
  normalizeContentNodes,
  q,
  requireContainer,
} from '../utilities/dom.ts';

export type TabsDirection = 'top' | 'bottom' | 'left' | 'right';
export type TabsValue = number | string;
export type TabsDisabled = TabsValue | TabsValue[];

export interface TabsClassNames {
  root: string;
  top: string;
  bottom: string;
  left: string;
  right: string;
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
  tabs?: TabItem[];
  className?: TabsClassNameConfig;
  onAdd?:
    | ((
        index: number,
        item: TabItem,
        tab: HTMLElement | undefined,
        panel: HTMLElement | undefined
      ) => void | Promise<void>)
    | null;
  onRemove?:
    | ((index: number, name: string | undefined) => void | Promise<void>)
    | null;
}

interface ResolvedTabsProps extends Record<string, unknown> {
  id: string;
  direction: TabsDirection;
  active: TabsValue;
  disabled: TabsDisabled;
  onChange: NonNullable<TabsProps['onChange']> | null;
  tabs: TabItem[];
  className: TabsClassNames;
  onAdd: NonNullable<TabsProps['onAdd']> | null;
  onRemove: NonNullable<TabsProps['onRemove']> | null;
}

interface TabsState extends Record<string, unknown> {
  current: {
    index: number;
    name: string | null;
  };
  disabled: {
    names: string[];
    indexes: number[];
  };
  isVertical: boolean;
  draggable: boolean;
  loading: boolean;
}

interface TabsDOM extends ComponentDOM {
  root: HTMLElement | null;
  container: Element;
  tabs: HTMLElement[];
  panels: HTMLElement[];
}

interface TabsPanelCacheEntry {
  content: RenderableContent<TabsPanelContext>;
  updatedAt: number;
}

interface TabsRuntime extends ComponentRuntime {
  cache: {
    panels: Map<string, TabsPanelCacheEntry>;
  };
  panelLoadId: number;
}

type PointerDragEvent = MouseEvent | TouchEvent;

const DEFAULT_CLASS_NAMES: TabsClassNames = {
  root: 'j-tabs',
  top: 'is-top',
  bottom: 'is-bottom',
  left: 'is-left',
  right: 'is-right',
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
  tabs: { default: [], type: 'array' },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
  onAdd: { default: null, types: ['function', 'null'] },
  onRemove: { default: null, types: ['function', 'null'] },
} satisfies ResolveSchema<TabsProps>;

const TAB_CONFIG_RULE = {
  type: 'object',
  validate: (value: unknown) => {
    const item = value as Partial<TabItem>;
    return (
      !!item &&
      typeof item === 'object' &&
      isRenderableContent(item.title) &&
      isRenderableContent(item.panel)
    );
  },
  message:
    'expects an object with renderable title and panel: string, Node, array, function or null.',
};

function cloneTabItems(tabs: unknown): TabItem[] {
  return Array.isArray(tabs)
    ? tabs.map((item) => ({ ...(item as TabItem) }))
    : [];
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
    tabs: cloneTabItems(props.tabs),
    className: props.className as TabsClassNames,
    onAdd: props.onAdd as ResolvedTabsProps['onAdd'],
    onRemove: props.onRemove as ResolvedTabsProps['onRemove'],
  };
}

function joinClasses(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 标签页组件，继承 Component。
 *
 * DOM 创建一次，通过 createEffect 细粒度更新 class/ARIA。
 */
export class Tabs extends Component<ResolvedTabsProps, TabsState, TabsDOM> {
  declare runtime: TabsRuntime;
  declare state: TabsState;
  private bindingsDispose: (() => void) | null;
  private isDragging: boolean;
  private raf: number;
  private resizeRaf: number;
  private velocity: number;

  /**
   * @param {Element|Node|string|Array} container 挂载容器（元素、选择器或 JSX/h 返回节点）。
   * @param {object} [input={}] 标签页配置。
   */
  constructor(container: DOMReference, input: TabsProps = {}) {
    const el = requireContainer(container, 'Tabs');
    const props = normalizeProps(input);
    super(props);

    this.dom.container = el;
    this.dom.tabs = [];
    this.dom.panels = [];
    this.bindingsDispose = null;
    this.isDragging = false;
    this.raf = 0;
    this.resizeRaf = 0;
    this.velocity = 0;

    this.state = createDeepStore({
      current: {
        index: -1,
        name: null,
      },
      disabled: this.parseDisabled(props.disabled),
      isVertical: props.direction === 'left' || props.direction === 'right',
      draggable: false,
      loading: false,
    }) as TabsState;

    this.runtime.cache = { panels: new Map() };
    this.runtime.panelLoadId = 0;

    try {
      this.onInit(props);
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  protected onInit(props: ResolvedTabsProps): void {
    this.root = this.buildRoot(props);
    this.rebuildItems();
    void this.activateInternal(props.active, false);
    this.bindEvents();
    this.initDrag();
  }

  private buildRoot(props: ResolvedTabsProps): HTMLElement {
    const { id, direction, className } = props;
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
      className: joinClasses(className.root, className[direction]),
      id,
      'data-tabs': 'root',
      'data-tabs-direction': direction,
      children: [wrap, panelWrapper],
    }) as HTMLElement;
  }

  private rebuildItems(): void {
    if (!this.root) return;
    const tabList = q<HTMLElement>('[data-tabs-list]', this.root);
    const panelWrapper = q<HTMLElement>('[data-tabs-panel-wrap]', this.root);
    if (!tabList || !panelWrapper) return;

    tabList.textContent = '';
    panelWrapper.textContent = '';

    this.dom.tabs = [];
    this.dom.panels = [];

    const tabFragment = document.createDocumentFragment();
    const panelFragment = document.createDocumentFragment();

    this.props.tabs.forEach((item, index) => {
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
          this.state.disabled.names.includes(name) ? 'true' : 'false'
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

  private parseDisabled(disabled: TabsDisabled): TabsState['disabled'] {
    if (disabled == null) return { names: [], indexes: [] };
    const toName = (val: TabsValue): string | null => {
      if (typeof val === 'number') return this.props.tabs[val]?.name || null;
      if (typeof val === 'string') return val;
      return null;
    };
    const names = Array.isArray(disabled)
      ? disabled.map(toName).filter((name): name is string => !!name)
      : (() => {
          const name = toName(disabled);
          return name ? [name] : [];
        })();

    return this.createDisabledState(names);
  }

  private createDisabledState(names: string[]): TabsState['disabled'] {
    const uniqNames = Array.from(new Set(names));
    return {
      names: uniqNames,
      indexes: uniqNames
        .map((name) => this.props.tabs.findIndex((tab) => tab.name === name))
        .filter((index) => index >= 0),
    };
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
    const item = this.props.tabs[index];
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
    const item = this.props.tabs[index];
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
    return this.state.disabled.names;
  }

  private bindEvents(): void {
    this.unbindEvents();

    if (!this.root) return;
    const tabList = q<HTMLElement>('[data-tabs-list]', this.root);
    if (!tabList) return;

    this.cleanup.events.on('tabClick', tabList, 'click', (event) => {
      if (!(event.target instanceof Element)) return;
      const tab = event.target.closest<HTMLElement>('[data-tabs-tab]');
      if (!tab || !tabList.contains(tab)) return;
      const name = tab.dataset.tabsTab;
      if (name && !this.state.disabled.names.includes(name)) {
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
      this.state.disabled.names.includes(name) ||
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
    await this.activateInternal(val, true);
  }

  /**
   * 将组件挂载到构造器指定的容器中。
   */
  build(): this {
    this.assertActive('build');
    insert(this.dom.container, () => this.root);
    return this;
  }

  render(): this {
    return this.build();
  }

  /**
   * 动态新增标签。
   * @param {object} tabConfig 标签配置。
   */
  async add(tabConfig: TabItem): Promise<void> {
    this.assertActive('add');
    validateParam('tabConfig', tabConfig, TAB_CONFIG_RULE, 'Tabs.add');

    tabConfig.name = tabConfig.name || randomId();
    this.props.tabs = [...cloneTabItems(this.props.tabs), tabConfig];
    this.runtime.cache.panels.clear();

    this.rebuildItems();
    this.syncActiveNames(this.resolveActiveIndex(this.props.active));
    this.bindEvents();
    this.refreshDrag();

    const { onAdd } = this.props;
    if (onAdd) {
      const index = this.props.tabs.length - 1;
      await Promise.resolve(
        onAdd(index, tabConfig, this.dom.tabs[index], this.dom.panels[index])
      );
    }
  }

  /**
   * 根据索引或名称删除标签。
   * @param {number|string} val 标签索引或名称。
   */
  async delete(val: TabsValue): Promise<void> {
    this.assertActive('delete');
    if (this.props.tabs.length <= 1) return;

    const index = this.getIndex(val);
    if (index < 0 || index >= this.props.tabs.length) return;

    const removedName = this.props.tabs[index].name;
    const { onRemove } = this.props;

    this.props.tabs = this.props.tabs.filter((_, i) => i !== index);
    if (removedName) this.runtime.cache.panels.delete(removedName);

    if (this.state.current.index >= this.props.tabs.length) {
      flushSync(() => {
        this.syncCurrent(this.props.tabs.length - 1);
      });
    } else if (this.state.current.index > index) {
      flushSync(() => {
        this.syncCurrent(this.state.current.index - 1);
      });
    }

    this.rebuildItems();
    this.bindEvents();
    await this.loadPanel(this.state.current.index);
    this.refreshDrag();

    if (onRemove) await Promise.resolve(onRemove(index, removedName));
  }

  /**
   * 根据索引或名称禁用标签。
   * @param {number|string} val 标签索引或名称。
   */
  disable(val: TabsValue): void {
    this.assertActive('disable');
    const name =
      typeof val === 'number' ? this.dom.tabs[val]?.dataset.tabsTab : val;
    if (name && !this.state.disabled.names.includes(name)) {
      flushSync(() => {
        this.state.disabled = this.createDisabledState([
          ...this.state.disabled.names,
          name,
        ]);
      });
    }
  }

  /**
   * 根据索引或名称启用标签。
   * @param {number|string} val 标签索引或名称。
   */
  enable(val: TabsValue): void {
    this.assertActive('enable');
    const name =
      typeof val === 'number' ? this.dom.tabs[val]?.dataset.tabsTab : val;
    if (name) {
      flushSync(() => {
        this.state.disabled = this.createDisabledState(
          this.state.disabled.names.filter((n) => n !== name)
        );
      });
    }
  }

  private resolveActiveIndex(active: TabsValue | null | undefined): number {
    if (active == null) return -1;
    if (typeof active === 'number') return active;
    if (typeof active === 'string') {
      return this.dom.tabs.findIndex((tab) => tab.dataset.tabsTab === active);
    }
    return 0;
  }

  private syncActiveNames(index: number): void {
    flushSync(() => {
      this.syncCurrent(index);
    });
  }

  /**
   * 使用新配置重新初始化状态。
   * @param {object} [patch={}] 需要覆盖的配置。
   */
  async reInit(patch: TabsProps = {}): Promise<void> {
    this.assertActive('reInit');
    Object.assign(
      this.props,
      normalizeProps({
        ...this.props,
        ...patch,
        className: {
          ...this.props.className,
          ...patch.className,
        },
      })
    );

    flushSync(() => {
      this.state.disabled = this.parseDisabled(this.props.disabled);
    });

    this.rebuildItems();
    this.syncActiveNames(this.resolveActiveIndex(this.props.active));
    this.bindEvents();
    await this.loadPanel(this.state.current.index);
    this.refreshDrag();
  }

  private get dragContainer(): HTMLElement | null {
    return this.root ? q<HTMLElement>('[data-tabs-wrap]', this.root) : null;
  }

  private get dragInner(): HTMLElement | null {
    return this.root ? q<HTMLElement>('[data-tabs-list]', this.root) : null;
  }

  private initDrag(): void {
    const { direction } = this.props;
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
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.resizeRaf);
    this.cleanup.events.off('resize');

    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
  }
}

export function createTabs(
  container: DOMReference,
  input: TabsProps = {}
): Tabs {
  return new Tabs(container, input);
}

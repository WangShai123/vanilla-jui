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
import { icon } from '../primitives/icons.ts';
import {
  type RenderableContent,
  normalizeContentNodes,
} from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';

type AccordionActive = number | string | Array<number | string> | null;

interface AccordionClassNames {
  root: string;
  header: string;
  title: string;
  arrow: string;
  panel: string;
  content: string;
}

type AccordionClassNameConfig = Partial<AccordionClassNames>;

interface AccordionItem extends Record<string, unknown> {
  name?: string;
  title: RenderableContent<AccordionContentContext>;
  content: RenderableContent<AccordionContentContext>;
}

interface AccordionProps extends Record<string, unknown> {
  id?: string | null;
  active?: AccordionActive;
  collapsible?: boolean;
  multiple?: boolean;
  className?: AccordionClassNameConfig;
  items: AccordionItem[];
  onChange?:
    | ((
        index: number,
        name: string,
        header: HTMLElement,
        panel: HTMLElement,
        accordion: AccordionInstance
      ) => void | Promise<void>)
    | null;
}

interface ResolvedAccordionProps extends Record<string, unknown> {
  id: string;
  active: AccordionActive;
  collapsible: boolean;
  multiple: boolean;
  className: AccordionClassNames;
  items: AccordionItem[];
  onChange: NonNullable<AccordionProps['onChange']> | null;
}

interface AccordionCurrent {
  index: number | null;
  name: string | null;
}

interface AccordionState extends Record<string, unknown> {
  items: AccordionItem[];
  activeNames: string[];
  current: AccordionCurrent;
}

interface AccordionDOM extends ComponentDOM {
  root: HTMLElement | null;
  headers: HTMLElement[];
  panels: HTMLElement[];
}

interface AccordionRuntime extends ComponentRuntime {
  built: boolean;
}

interface AccordionContentContext {
  accordion: AccordionInstance;
  item: AccordionItem;
  index: number;
  type: 'title' | 'content';
  active: boolean;
}

type AccordionInstance = Component<
  ResolvedAccordionProps,
  AccordionState,
  AccordionDOM
> & {
  runtime: AccordionRuntime;
  state: AccordionState;
  build(): AccordionInstance;
  isActive(name: string): boolean;
  getIndex(value: number | string | undefined | null): number;
  activate(value: number | string | undefined): Promise<void>;
};

const DEFAULT_CLASS_NAMES: AccordionClassNames = {
  root: 'j-accordion',
  header: 'accordion-header',
  title: 'header-title',
  arrow: 'header-arrow',
  panel: 'accordion-panel',
  content: 'panel-content',
};

const ACCORDION_ITEM_RULE = {
  type: 'plainObject',
  shape: {
    name: ['string', 'null', 'undefined'],
    title: 'renderable',
    content: 'renderable',
  },
};

const ACCORDION_ITEMS_RULE = {
  type: 'array',
  nonEmpty: true,
  items: ACCORDION_ITEM_RULE,
};

const ACCORDION_ACTIVE_RULE = {
  types: ['number', 'string', 'array', 'null'],
  validate: (value: unknown) => {
    if (value == null) return true;
    if (Array.isArray(value)) return value.every(isActiveValue);
    return isActiveValue(value);
  },
  message: 'expects a non-negative integer, non-empty string, array or null.',
};

const ACCORDION_PROPS_SCHEMA = {
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
  active: { default: 0, ...ACCORDION_ACTIVE_RULE },
  collapsible: { default: false, type: 'boolean' },
  multiple: { default: false, type: 'boolean' },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
  onChange: { default: null, types: ['function', 'null'] },
  items: { default: [], ...ACCORDION_ITEMS_RULE },
} satisfies ResolveSchema<AccordionProps>;

function isActiveValue(value: unknown): value is number | string {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0;
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeProps(props: AccordionProps): ResolvedAccordionProps {
  const resolved = resolveProps(
    props,
    ACCORDION_PROPS_SCHEMA,
    'Accordion.props'
  );
  return {
    id: resolved.id as string,
    active: resolved.active as AccordionActive,
    collapsible: resolved.collapsible as boolean,
    multiple: resolved.multiple as boolean,
    className: resolved.className as AccordionClassNames,
    items: normalizeItems(resolved.items, false),
    onChange: resolved.onChange as ResolvedAccordionProps['onChange'],
  };
}

function normalizeItems(items: unknown, validate = true): AccordionItem[] {
  if (validate) {
    validateParam('items', items, ACCORDION_ITEMS_RULE, 'Accordion');
  }

  const names = new Set<string>();

  return (items as unknown[]).map((item) => {
    const source = item as AccordionItem;
    const name = typeof source.name === 'string' ? source.name.trim() : '';
    if (name) {
      if (names.has(name)) {
        throw new Error(`Accordion: item name "${name}" must be unique.`);
      }
      names.add(name);
    }

    return {
      ...source,
      name: name || randomId(),
    };
  });
}

function needsItemsSync(
  source: AccordionItem[],
  normalized: AccordionItem[]
): boolean {
  return normalized.some((item, index) => source[index]?.name !== item.name);
}

function resolveActiveItemNames(
  active: AccordionActive,
  items: AccordionItem[],
  multiple: boolean
): string[] {
  if (active == null) return [];

  const values = Array.isArray(active) ? active : [active];
  const names: string[] = [];

  for (const value of values) {
    const index =
      typeof value === 'number'
        ? value
        : items.findIndex((item) => item.name === value);
    const name = items[index]?.name;

    if (!name) continue;

    names.push(name);
    if (!multiple) break;
  }

  return Array.from(new Set(names));
}

function reconcileActiveNames(
  activeNames: string[],
  items: AccordionItem[],
  multiple: boolean
): string[] {
  const names = new Set(items.map((item) => item.name).filter(Boolean));
  const nextNames = activeNames.filter((name) => names.has(name));
  return multiple ? nextNames : nextNames.slice(0, 1);
}

function createCurrentState(
  activeNames: string[],
  items: AccordionItem[]
): AccordionCurrent {
  const name = activeNames[0] || null;
  if (!name) return { index: null, name: null };

  const index = items.findIndex((item) => item.name === name);
  return index >= 0 ? { index, name } : { index: null, name: null };
}

/**
 * 轻量手风琴组件，继承 Component。
 *
 * 构造器只验证和保存初始配置；调用 build() 后才创建 DOM 和绑定交互。
 * items 属于响应式 state，变更后自动重建面板结构。
 */
class Accordion extends Component<
  ResolvedAccordionProps,
  AccordionState,
  AccordionDOM
> {
  declare runtime: AccordionRuntime;
  declare state: AccordionState;
  private bindingsDispose: (() => void) | null;
  private itemsDispose: (() => void) | null;

  constructor(props: AccordionProps) {
    const resolvedProps = normalizeProps(props);
    super(resolvedProps);

    const activeNames = resolveActiveItemNames(
      resolvedProps.active,
      resolvedProps.items,
      resolvedProps.multiple
    );

    this.dom.headers = [];
    this.dom.panels = [];
    this.bindingsDispose = null;
    this.itemsDispose = null;
    this.runtime.built = false;
    this.state = createDeepStore({
      items: resolvedProps.items,
      activeNames,
      current: createCurrentState(activeNames, resolvedProps.items),
    }) as AccordionState;
  }

  protected onInit(props: ResolvedAccordionProps): void {
    this.dom.root = this.buildRoot(props);
    this.bindItems();
    this.bindEvents();
  }

  private buildRoot(props: ResolvedAccordionProps): HTMLElement {
    return jsx('div', {
      className: props.className.root,
      id: props.id,
      'data-accordion': 'root',
    }) as HTMLElement;
  }

  private bindItems(): void {
    this.itemsDispose?.();
    this.itemsDispose = createRoot((dispose) => {
      createEffect(() => {
        const sourceItems = this.state.items;
        const items = normalizeItems(sourceItems);

        untrack(() => {
          if (needsItemsSync(sourceItems, items)) {
            this.state.items = items;
          }

          const activeNames = reconcileActiveNames(
            this.state.activeNames,
            items,
            this.props.multiple
          );
          this.buildItems(items, activeNames);
          this.syncActiveNames(activeNames, items);
        });
      });

      return dispose;
    });
  }

  private buildItems(items: AccordionItem[], activeNames: string[]): void {
    if (!this.dom.root) return;

    const fragment = document.createDocumentFragment();
    this.bindingsDispose?.();
    this.bindingsDispose = null;
    this.dom.root.textContent = '';
    this.dom.headers = [];
    this.dom.panels = [];

    items.forEach((item, index) => {
      const name = item.name || randomId();
      const active = activeNames.includes(name);
      const headerId = `${this.props.id}_header_${index}`;
      const panelId = `${this.props.id}_panel_${index}`;

      const header = jsx('div', {
        className: this.props.className.header,
        id: headerId,
        'data-accordion-header': name,
        role: 'button',
        tabindex: '0',
        'aria-controls': panelId,
        children: [
          jsx('span', {
            className: this.props.className.title,
            'data-accordion-title': name,
            role: 'heading',
            children: this.contentView(item, index, 'title', active),
          }),
          jsx('span', {
            className: this.props.className.arrow,
            'data-accordion-arrow': name,
            'aria-hidden': 'true',
            children: icon('arrow-down'),
          }),
        ],
      }) as HTMLElement;

      const panel = jsx('div', {
        className: this.props.className.panel,
        'data-accordion-panel': name,
        id: panelId,
        role: 'region',
        'aria-labelledby': headerId,
        children: jsx('div', {
          className: this.props.className.content,
          'data-accordion-content': name,
          children: this.contentView(item, index, 'content', active),
        }),
      }) as HTMLElement;

      this.dom.headers.push(header);
      this.dom.panels.push(panel);
      fragment.append(header, panel);
    });

    this.dom.root.append(fragment);
    this.bindItemState();
  }

  private bindItemState(): void {
    this.bindingsDispose = createRoot((dispose) => {
      this.dom.headers.forEach((header) => {
        const name = header.dataset.accordionHeader || '';
        bindAttr(header, 'aria-expanded', () =>
          this.state.activeNames.includes(name) ? 'true' : 'false'
        );
      });

      this.dom.panels.forEach((panel, index) => {
        const name = this.dom.headers[index]?.dataset.accordionHeader || '';
        bindAttr(panel, 'aria-hidden', () =>
          this.state.activeNames.includes(name) ? 'false' : 'true'
        );
        bindAttr(panel, 'hidden', () => !this.state.activeNames.includes(name));
      });

      return dispose;
    });
  }

  private contentView(
    item: AccordionItem,
    index: number,
    type: 'title' | 'content',
    active: boolean
  ): Node[] {
    return normalizeContentNodes(type === 'title' ? item.title : item.content, {
      accordion: this,
      item,
      index,
      type,
      active,
    });
  }

  private syncActiveNames(names: string[], items = this.state.items): void {
    flushSync(() => {
      this.state.activeNames = names;
      this.state.current = createCurrentState(names, items);
    });
  }

  private bindEvents(): void {
    this.unbindEvents();
    if (!this.dom.root) return;

    this.cleanup.events.on('click', this.dom.root, 'click', (event) => {
      if (!(event.target instanceof Element)) return;
      const header = event.target.closest<HTMLElement>(
        '[data-accordion-header]'
      );
      if (!header || !this.dom.root?.contains(header)) return;
      void this.activate(header.dataset.accordionHeader);
    });

    this.cleanup.events.on('keydown', this.dom.root, 'keydown', (event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (!(event.target instanceof Element)) return;
      const header = event.target.closest<HTMLElement>(
        '[data-accordion-header]'
      );
      if (!header || !this.dom.root?.contains(header)) return;
      event.preventDefault();
      void this.activate(header.dataset.accordionHeader);
    });
  }

  private unbindEvents(): void {
    this.cleanup.events.clear();
  }

  isActive(name: string): boolean {
    return this.state.activeNames.includes(name);
  }

  getIndex(val: number | string | undefined | null): number {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      return this.dom.headers.findIndex(
        (header) => header.dataset.accordionHeader === val
      );
    }
    return -1;
  }

  async activate(value: number | string | undefined): Promise<void> {
    this.assertActive('activate');
    this.assertBuilt('activate');

    const index = this.getIndex(value);
    if (index < 0 || index >= this.dom.headers.length) return;

    const headerEl = this.dom.headers[index];
    const panelEl = this.dom.panels[index];
    const name = headerEl.dataset.accordionHeader || String(index);
    const isActive = this.isActive(name);

    if (isActive && !this.props.multiple && !this.props.collapsible) return;

    let activeNames: string[];
    if (this.props.multiple) {
      if (isActive) {
        const nextNames = this.state.activeNames.filter(
          (item) => item !== name
        );
        activeNames =
          !this.props.collapsible && nextNames.length === 0
            ? this.state.activeNames
            : nextNames;
      } else {
        activeNames = [...this.state.activeNames, name];
      }
    } else if (isActive) {
      activeNames = this.props.collapsible ? [] : this.state.activeNames;
    } else {
      activeNames = [name];
    }

    this.syncActiveNames(activeNames);

    if (this.props.onChange) {
      await Promise.resolve(
        this.props.onChange(index, name, headerEl, panelEl, this)
      );
    }
  }

  build(): this {
    this.assertActive('build');
    if (this.runtime.built) return this;

    this.runtime.built = true;
    try {
      this.init(this.props);
    } catch (error) {
      this.runtime.built = false;
      this.destroy();
      throw error;
    }

    return this;
  }

  protected normalizeStatePatch(
    patch: Partial<AccordionState>
  ): Partial<AccordionState> {
    return {
      ...patch,
      ...(Object.hasOwn(patch, 'items')
        ? { items: normalizeItems(patch.items) }
        : {}),
    };
  }

  private assertActive(method: string): void {
    if (this.runtime.destroyed) {
      throw new Error(`Accordion.${method}: instance has been destroyed.`);
    }
  }

  private assertBuilt(method: string): void {
    if (!this.runtime.built) {
      throw new Error(`Accordion.${method}: call build() first.`);
    }
  }

  protected onDestroy(): void {
    this.unbindEvents();
    this.itemsDispose?.();
    this.bindingsDispose?.();
    this.itemsDispose = null;
    this.bindingsDispose = null;
    if (this.dom.root?.parentNode) {
      this.dom.root.parentNode.removeChild(this.dom.root);
    }
    this.runtime.built = false;
  }
}

export function createAccordion(props: AccordionProps): AccordionInstance {
  return new Accordion(props);
}

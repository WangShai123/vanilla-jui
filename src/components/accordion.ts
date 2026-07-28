import {
  bindAttr,
  bindClass,
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
  isRenderableContent,
  normalizeContentNodes,
  requireContainer,
} from '../utilities/dom.ts';
import { icon } from './icons.ts';

export type AccordionActive = number | string | Array<number | string> | null;

export interface AccordionClassNames {
  root: string;
  header: string;
  title: string;
  arrow: string;
  panel: string;
  content: string;
  active: string;
}

export type AccordionClassNameConfig = Partial<AccordionClassNames>;

export interface AccordionItem extends Record<string, unknown> {
  name?: string;
  title: RenderableContent<AccordionContentContext>;
  content: RenderableContent<AccordionContentContext>;
}

export interface AccordionProps extends Record<string, unknown> {
  id?: string | null;
  active?: AccordionActive;
  collapsible?: boolean;
  multiple?: boolean;
  className?: AccordionClassNameConfig;
  items?: AccordionItem[];
  onChange?:
    | ((
        index: number,
        name: string,
        header: HTMLElement,
        panel: HTMLElement,
        accordion: Accordion
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

interface AccordionState extends Record<string, unknown> {
  activeNames: string[];
  current: {
    index: number | null;
    name: string | null;
  };
}

interface AccordionDOM extends ComponentDOM {
  root: HTMLElement | null;
  container: Element;
  headers: HTMLElement[];
  panels: HTMLElement[];
}

interface AccordionRuntime extends ComponentRuntime {}

export interface AccordionContentContext {
  accordion: Accordion;
  item: AccordionItem;
  index: number;
  type: 'title' | 'content';
  active: boolean;
}

const DEFAULT_CLASS_NAMES: AccordionClassNames = {
  root: 'j-accordion',
  header: 'accordion-header',
  title: 'header-title',
  arrow: 'header-arrow',
  panel: 'accordion-panel',
  content: 'panel-content',
  active: 'is-active',
};

const ACCORDION_ITEMS_RULE = {
  type: 'array',
  validate: (value: unknown) => Array.isArray(value) && value.length > 0,
  message: 'expects a non-empty array.',
};

const ACCORDION_ACTIVE_RULE = {
  types: ['number', 'string', 'array', 'null'],
  validate: (value: unknown) => {
    if (value == null) return true;
    if (Array.isArray(value)) {
      return value.every(
        (item) => typeof item === 'number' || typeof item === 'string'
      );
    }
    if (typeof value === 'number') return Number.isInteger(value) && value >= 0;
    return typeof value === 'string' && value.trim().length > 0;
  },
  message: 'expects a positive number, string, array or null.',
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
  items: { default: [], type: 'array' },
} satisfies ResolveSchema<AccordionProps>;

function cloneItems(items: unknown): AccordionItem[] {
  return Array.isArray(items)
    ? items.map((item) => ({ ...(item as AccordionItem) }))
    : [];
}

function normalizeProps(input: AccordionProps): ResolvedAccordionProps {
  const props = resolveProps(input, ACCORDION_PROPS_SCHEMA, 'Accordion');
  return {
    id: props.id as string,
    active: props.active as AccordionActive,
    collapsible: props.collapsible as boolean,
    multiple: props.multiple as boolean,
    className: props.className as AccordionClassNames,
    items: cloneItems(props.items),
    onChange: props.onChange as ResolvedAccordionProps['onChange'],
  };
}

function normalizeItems(items: AccordionItem[]): AccordionItem[] {
  validateParam('items', items, ACCORDION_ITEMS_RULE, 'Accordion');

  return items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Accordion: item expects an object.');
    }
    if (item.name != null && typeof item.name !== 'string') {
      throw new Error('Accordion: item name expects a string.');
    }
    if (!isRenderableContent(item.title)) {
      throw new Error(
        'Accordion: item title expects string, Node, array, function or null.'
      );
    }
    if (!isRenderableContent(item.content)) {
      throw new Error(
        'Accordion: item content expects string, Node, array, function or null.'
      );
    }
    return { ...item, name: item.name || randomId() };
  });
}

/**
 * 轻量手风琴组件，继承 Component。
 *
 * DOM 创建一次，通过 createEffect 细粒度更新 class/ARIA。
 */
export class Accordion extends Component<
  ResolvedAccordionProps,
  AccordionState,
  AccordionDOM
> {
  declare runtime: AccordionRuntime;
  declare state: AccordionState;
  private bindingsDispose: (() => void) | null;

  /**
   * @param {Element|Node|string|Array} container 挂载容器（元素、选择器或 JSX/h 返回节点）。
   * @param {object} [input={}] 手风琴配置。
   */
  constructor(container: DOMReference, input: AccordionProps = {}) {
    const el = requireContainer(container, 'Accordion');
    const props = normalizeProps(input);
    super(props);

    this.dom.container = el;
    this.dom.headers = [];
    this.dom.panels = [];
    this.bindingsDispose = null;

    this.state = createDeepStore({
      activeNames: [],
      current: { index: null, name: null },
    }) as AccordionState;

    try {
      this.onInit(props);
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  protected onInit(props: ResolvedAccordionProps): void {
    this.root = this.buildRoot(props);
    this.buildItems(props);
    this.syncActiveNames(this.resolveActiveNames(props.active));
    this.bindEvents();
  }

  private buildRoot(props: ResolvedAccordionProps): HTMLElement {
    return jsx('div', {
      className: props.className.root,
      id: props.id,
      'data-accordion': 'root',
    }) as HTMLElement;
  }

  private buildItems(props: ResolvedAccordionProps): void {
    const items = normalizeItems(props.items);
    const fragment = document.createDocumentFragment();

    this.dom.headers = [];
    this.dom.panels = [];

    items.forEach((item, index) => {
      const name = item.name || randomId();
      const headerId = `${props.id}_header_${index}`;
      const panelId = `${props.id}_panel_${index}`;

      const header = jsx('div', {
        className: props.className.header,
        'data-accordion-header': name,
        id: headerId,
        role: 'button',
        tabindex: '0',
        'aria-controls': panelId,
        children: [
          jsx('span', {
            className: props.className.title,
            'data-accordion-title': name,
            children: this.contentView(item, index, 'title'),
          }),
          jsx('span', {
            className: props.className.arrow,
            'data-accordion-arrow': name,
            'aria-hidden': 'true',
            children: icon('arrow-down'),
          }),
        ],
      }) as HTMLElement;

      const panel = jsx('div', {
        className: props.className.panel,
        'data-accordion-panel': name,
        id: panelId,
        role: 'region',
        'aria-labelledby': headerId,
        children: jsx('div', {
          className: props.className.content,
          'data-accordion-content': name,
          children: this.contentView(item, index, 'content'),
        }),
      }) as HTMLElement;

      this.dom.headers.push(header);
      this.dom.panels.push(panel);
      fragment.append(header, panel);
    });

    this.root?.append(fragment);

    this.bindingsDispose?.();
    this.bindingsDispose = createRoot((dispose) => {
      this.dom.headers.forEach((header) => {
        const name = header.dataset.accordionHeader || '';
        bindClass(header, this.props.className.active, () =>
          this.state.activeNames.includes(name)
        );
        bindAttr(header, 'aria-expanded', () =>
          this.state.activeNames.includes(name)
        );
      });
      this.dom.panels.forEach((panel, i) => {
        const name = this.dom.headers[i]?.dataset.accordionHeader || '';
        bindClass(panel, this.props.className.active, () =>
          this.state.activeNames.includes(name)
        );
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
    type: 'title' | 'content'
  ): Node[] {
    return normalizeContentNodes(type === 'title' ? item.title : item.content, {
      accordion: this,
      item,
      index,
      type,
      active: false,
    });
  }

  private resolveActiveNames(active: AccordionActive): string[] {
    if (active == null) return [];
    const values = Array.isArray(active) ? active : [active];
    const names: string[] = [];
    for (const value of values) {
      const index = this.getIndex(value);
      if (index < 0 || index >= this.dom.headers.length) continue;
      names.push(
        this.dom.headers[index].dataset.accordionHeader || String(index)
      );
      if (!this.props.multiple) break;
    }
    return Array.from(new Set(names));
  }

  private syncActiveNames(names: string[]): void {
    const firstName = names[0] || null;
    const index = firstName ? this.getIndex(firstName) : null;
    flushSync(() => {
      this.state.activeNames = names;
      this.state.current = { index, name: firstName };
    });
  }

  private bindEvents(): void {
    this.unbindEvents();
    if (!this.root) return;

    this.cleanup.events.on('click', this.root, 'click', (event) => {
      if (!(event.target instanceof Element)) return;
      const header = event.target.closest<HTMLElement>(
        '[data-accordion-header]'
      );
      if (!header || !this.root?.contains(header)) return;
      void this.active(header.dataset.accordionHeader);
    });

    this.cleanup.events.on('keydown', this.root, 'keydown', (event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (!(event.target instanceof Element)) return;
      const header = event.target.closest<HTMLElement>(
        '[data-accordion-header]'
      );
      if (!header || !this.root?.contains(header)) return;
      event.preventDefault();
      void this.active(header.dataset.accordionHeader);
    });
  }

  private unbindEvents(): void {
    this.cleanup.events.clear();
  }

  isActive(name: string): boolean {
    return this.state.activeNames.includes(name);
  }

  private assertActive(method: string): void {
    if (this.runtime.destroyed) {
      throw new Error(`Accordion.${method}: instance has been destroyed.`);
    }
  }

  private async activateItem(
    val: number | string | undefined,
    fireEvent = true
  ): Promise<void> {
    const index = this.getIndex(val);
    if (index < 0 || index >= this.dom.headers.length) return;

    const headerEl = this.dom.headers[index];
    const panelEl = this.dom.panels[index];
    const name = headerEl.dataset.accordionHeader || String(index);
    const active = this.isActive(name);

    if (active && !this.props.multiple && !this.props.collapsible) return;

    let nextNames: string[];
    if (this.props.multiple) {
      nextNames = active
        ? this.state.activeNames.filter((n) => n !== name)
        : [...this.state.activeNames, name];
    } else if (active) {
      nextNames = this.props.collapsible ? [] : this.state.activeNames;
    } else {
      nextNames = [name];
    }

    this.syncActiveNames(nextNames);

    if (fireEvent && this.props.onChange) {
      await Promise.resolve(
        this.props.onChange(index, name, headerEl, panelEl, this)
      );
    }
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

  /**
   * 激活指定面板。
   * @param {number|string} val 面板索引或名称。
   */
  async active(val: number | string | undefined): Promise<void> {
    this.assertActive('active');
    await this.activateItem(val, true);
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
   * 动态替换全部面板条目。
   * @param {AccordionItem[]} items 新面板配置。
   * @param {number|string|Array<number|string>|null} [active=0] 替换后默认激活项。
   */
  setItems(items: AccordionItem[], active: AccordionActive = 0): this {
    this.assertActive('setItems');
    validateParam('items', items, ACCORDION_ITEMS_RULE, 'Accordion.setItems');
    validateParam(
      'active',
      active,
      ACCORDION_ACTIVE_RULE,
      'Accordion.setItems'
    );

    this.props.items = cloneItems(normalizeItems(items));
    this.props.active = active;

    if (this.root) this.root.textContent = '';
    this.buildItems(this.props);
    this.syncActiveNames(this.resolveActiveNames(active));
    this.bindEvents();
    return this;
  }

  protected onDestroy(): void {
    this.unbindEvents();
    this.bindingsDispose?.();
    this.bindingsDispose = null;
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
  }
}

export function createAccordion(
  container: DOMReference,
  input: AccordionProps = {}
): Accordion {
  return new Accordion(container, input);
}

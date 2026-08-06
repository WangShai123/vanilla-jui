import { createDeepStore, jsx } from 'vanilla-signal';

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
} from '../core/Component.ts';
import { joinClasses } from '../utilities/class-name.ts';
import { type DOMReference, all, requireContainer } from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import { type ResolveSchema, resolveProps } from '../utilities/types.ts';

interface TocClassNames {
  toc: string;
  list: string;
  link: string;
  active: string;
  levelPrefix: string;
}

type TocClassNameConfig = Partial<TocClassNames>;

interface TocItem {
  id: string;
  text: string;
  level: number;
  element: HTMLHeadingElement;
}

interface TocCurrent {
  index: number;
  item: TocItem | null;
}

interface TocProps extends Record<string, unknown> {
  target?: DOMReference;
  headings?: string;
  offset?: number;
  className?: TocClassNameConfig;
  onChange?:
    | ((item: TocItem | null, index: number, toc: TocInstance) => void)
    | null;
}

interface ResolvedTocProps extends Record<string, unknown> {
  target: DOMReference;
  headings: string;
  offset: number;
  className: TocClassNames;
  onChange:
    | ((item: TocItem | null, index: number, toc: TocInstance) => void)
    | null;
}

interface TocState extends Record<string, unknown> {
  items: TocItem[];
  current: TocCurrent;
}

interface TocDOM extends ComponentDOM {
  root: HTMLElement | null;
  target: Element | null;
  list: HTMLElement | null;
  headings: HTMLHeadingElement[];
  links: HTMLAnchorElement[];
}

interface TocRuntime extends ComponentRuntime {
  built: boolean;
  ticking: boolean;
}

interface TocScrollOptions {
  activeIndex?: number;
  updateHash?: boolean;
}

type TocInstance = Component<ResolvedTocProps, TocState, TocDOM> & {
  runtime: TocRuntime;
  build(): TocInstance;
  refresh(): TocInstance;
  activate(index: number): TocInstance;
};

const DEFAULT_CLASS_NAMES: TocClassNames = {
  toc: 'j-toc',
  list: 'toc-list',
  link: 'toc-link',
  active: 'is-active',
  levelPrefix: 'is-level-',
};

const TOC_PROPS_SCHEMA = {
  target: { default: '.j-content' },
  headings: { default: 'h2, h3', type: 'string' },
  offset: {
    default: 80,
    type: 'number',
    min: 0,
  },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
  onChange: { default: null, types: ['function', 'null'] },
} satisfies ResolveSchema<TocProps>;

const ACTIVE_OFFSET_TOLERANCE = 1;

function normalizeProps(input: TocProps): ResolvedTocProps {
  const props = resolveProps(input, TOC_PROPS_SCHEMA, 'Toc.props');
  return {
    target: props.target as DOMReference,
    headings: props.headings as string,
    offset: props.offset as number,
    className: props.className as TocClassNames,
    onChange: props.onChange as ResolvedTocProps['onChange'],
  };
}

function resolveHeadingLevel(element: Element): number {
  const match = /^H([1-6])$/.exec(element.tagName);
  return match ? Number(match[1]) : 1;
}

function normalizeHeading(element: HTMLHeadingElement, index: number): TocItem {
  if (!element.id) element.id = `toc-${randomId()}-${index}`;
  return {
    id: element.id,
    text: element.textContent || '',
    level: resolveHeadingLevel(element),
    element,
  };
}

/**
 * 页面目录组件。
 *
 * 扫描内容区域内的标题，生成锚点列表，并随页面滚动更新 active 状态。
 */
class Toc extends Component<ResolvedTocProps, TocState, TocDOM> {
  declare runtime: TocRuntime;

  /**
   * 创建 Toc 实例。
   * @param {object} [input={}] Toc 配置。
   */
  constructor(props: TocProps = {}) {
    const settings = normalizeProps(props);
    super(settings);

    this.dom.target = null;
    this.dom.list = null;
    this.dom.headings = [];
    this.dom.links = [];

    this.runtime.built = false;
    this.runtime.ticking = false;

    this.state = createDeepStore({
      items: [],
      current: {
        index: -1,
        item: null,
      },
    });
  }

  /**
   * 构建 Toc DOM 和滚动监听。
   * @returns {Toc} 当前实例。
   */
  build(): this {
    if (this.runtime.destroyed)
      throw new Error('Toc.build: instance destroyed');
    if (this.runtime.built) return this;

    this.init(this.props);
    this.dom.target = requireContainer(this.props.target, 'Toc.target');
    this.dom.list = jsx('div', {
      className: this.props.className.list,
      'data-toc-list': 'root',
    }) as HTMLElement;
    this.dom.root = jsx('nav', {
      className: this.props.className.toc,
      'data-toc': 'root',
      children: this.dom.list,
    }) as HTMLElement;

    this.runtime.built = true;
    this.refresh();
    return this;
  }

  private bindEvents(): void {
    if (!this.dom.list) return;
    this.cleanup.events.on('scroll', window, 'scroll', () => this.onScroll(), {
      passive: true,
    });
    this.cleanup.events.on('click', this.dom.list, 'click', (event) =>
      this.onClick(event)
    );
  }

  private onScroll(): void {
    if (this.runtime.ticking) return;

    requestAnimationFrame(() => {
      this.updateActive();
      this.runtime.ticking = false;
    });
    this.runtime.ticking = true;
  }

  private onClick(event: Event): void {
    if (!(event.target instanceof Element) || !this.dom.list) return;
    const link = event.target.closest<HTMLElement>('[data-toc-index]');
    if (!link || !this.dom.list.contains(link)) return;

    const index = Number(link.dataset.tocIndex);
    const item = this.state?.items[index];
    if (!item) return;

    event.preventDefault();
    this.scrollToItem(item, { activeIndex: index, updateHash: true });
  }

  private scrollToItem(
    item: TocItem,
    { activeIndex = -1, updateHash = false }: TocScrollOptions = {}
  ): void {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const top = Math.max(
      0,
      item.element.getBoundingClientRect().top + scrollY - this.props.offset
    );

    window.scrollTo({
      top,
      behavior: 'smooth',
    });

    if (activeIndex >= 0) this.setActive(activeIndex);

    if (updateHash && window.history?.pushState) {
      window.history.pushState(null, '', `#${item.id}`);
    }
  }

  private linkClassName(item: TocItem, active = false): string {
    const classes = [
      this.props.className.link,
      `${this.props.className.levelPrefix}${item.level}`,
    ];
    if (active) classes.push(this.props.className.active);
    return joinClasses(...classes);
  }

  private buildLink(item: TocItem, index: number): HTMLAnchorElement {
    return jsx('a', {
      className: this.linkClassName(item),
      href: `#${item.id}`,
      'data-toc-index': String(index),
      'data-toc-target': item.id,
      children: item.text,
    }) as HTMLAnchorElement;
  }

  private updateActive(): void {
    if (!this.runtime.built) return;

    let index = -1;
    const activeOffset = this.props.offset + ACTIVE_OFFSET_TOLERANCE;
    for (let i = this.dom.headings.length - 1; i >= 0; i--) {
      if (this.dom.headings[i].getBoundingClientRect().top <= activeOffset) {
        index = i;
        break;
      }
    }

    this.setActive(index);
  }

  private setActive(index: number): void {
    if (!this.state || index === this.state.current.index) return;

    const current = this.state.items[index] || null;
    this.setState({
      current: { index, item: current },
    });

    const items = this.state.items;
    this.dom.links.forEach((link, i) => {
      const active = i === index;
      link.dataset.active = active ? '1' : '0';
      link.className = this.linkClassName(items[i], active);
    });

    if (typeof this.props.onChange === 'function') {
      this.props.onChange(current, index, this);
    }
  }

  /**
   * 重新扫描标题并重建目录列表。
   * @returns {Toc} 当前实例。
   */
  refresh(): this {
    if (
      this.runtime.destroyed ||
      !this.runtime.built ||
      !this.dom.target ||
      !this.dom.list
    ) {
      return this;
    }

    this.cleanup.events.clear();

    this.dom.headings = all<HTMLHeadingElement>(
      this.props.headings,
      this.dom.target
    );
    const items = this.dom.headings.map(normalizeHeading);
    this.dom.links = items.map((item, index) => this.buildLink(item, index));

    this.dom.list.innerHTML = '';
    for (const link of this.dom.links) this.dom.list.appendChild(link);

    this.setState({
      items,
      current: { index: -1, item: null },
    });

    this.bindEvents();
    this.updateActive();
    return this;
  }

  /**
   * 激活并滚动到指定目录项。
   * @param {number} index 目录项索引。
   * @returns {Toc} 当前实例。
   */
  activate(index: number): this {
    if (!this.runtime.built || !this.state) return this;
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.dom.links.length
    ) {
      return this;
    }

    this.scrollToItem(this.state.items[index]);
    return this;
  }

  /**
   * 销毁实例并清空渲染内容。
   * @private
   */
  protected onDestroy(): void {
    this.cleanup.events.clear();
    this.dom.root?.remove();

    this.runtime.built = false;
    this.runtime.ticking = false;
    this.dom.target = null;
    this.dom.list = null;
    this.dom.headings = [];
    this.dom.links = [];
  }
}

export function createToc(props: TocProps = {}): TocInstance {
  return new Toc(props);
}

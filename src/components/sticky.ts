import { createDeepStore } from 'vanilla-signal';

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
} from '../core/Component.ts';
import { type ResolveSchema, resolveProps } from '../utilities/core.ts';
import {
  type DOMReference,
  all,
  requireContainer,
  requireRenderDOM,
} from '../utilities/dom.ts';

export type StickyOverflow = 'destroy' | 'ignore';

export interface StickyProps extends Record<string, unknown> {
  target?: DOMReference;
  parent?: DOMReference;
  max?: number;
  top?: number;
  gap?: number;
  overflow?: StickyOverflow;
  onUpdate?: ((sticky: Sticky) => void) | null;
}

interface ResolvedStickyProps extends Record<string, unknown> {
  target: DOMReference;
  parent: DOMReference;
  max: number;
  top: number;
  gap: number;
  overflow: StickyOverflow;
  onUpdate: ((sticky: Sticky) => void) | null;
}

export interface StickyStateItem {
  element: HTMLElement;
  top: number;
}

interface StickyState extends Record<string, unknown> {
  count: number;
  top: number;
  items: StickyStateItem[];
}

interface StickyDOM extends ComponentDOM {
  root: Element | null;
  parent: Element | null;
  targets: HTMLElement[];
}

interface StickyRuntimeItem {
  element: HTMLElement;
  top: number;
  originalPosition: string;
  originalTop: string;
  originalZIndex: string;
}

interface StickyRuntime extends ComponentRuntime {
  active: boolean;
  built: boolean;
  ignored: boolean;
  items: StickyRuntimeItem[];
}

const STICKY_PROPS_SCHEMA = {
  target: { default: null },
  parent: { default: null },
  max: {
    default: 10,
    type: 'number',
    validate: (value) =>
      typeof value === 'number' && Number.isInteger(value) && value > 0,
    message: 'expects a positive integer.',
  },
  top: {
    default: 16,
    type: 'number',
    validate: (value) => typeof value === 'number' && value >= 0,
    message: 'expects a positive number or 0.',
  },
  gap: {
    default: 16,
    type: 'number',
    validate: (value) => typeof value === 'number' && value >= 0,
    message: 'expects a positive number or 0.',
  },
  overflow: {
    default: 'destroy',
    type: 'string',
    enum: ['destroy', 'ignore'],
  },
  onUpdate: { default: null, types: ['function', 'null'] },
} satisfies ResolveSchema<StickyProps>;

function normalizeProps(input: StickyProps): ResolvedStickyProps {
  const props = resolveProps(input, STICKY_PROPS_SCHEMA, 'Sticky.props');
  return {
    target: props.target as DOMReference,
    parent: props.parent as DOMReference,
    max: props.max as number,
    top: props.top as number,
    gap: props.gap as number,
    overflow: props.overflow as StickyOverflow,
    onUpdate: props.onUpdate as ResolvedStickyProps['onUpdate'],
  };
}

function uniqueElements(elements: readonly Node[]): HTMLElement[] {
  const htmlElements = elements.filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  );
  return Array.from(new Set(htmlElements));
}

function resolveParent(parent: DOMReference): Element | null {
  if (parent === false || parent == null) return null;
  return requireContainer(parent, 'Sticky.parent', 'element');
}

function resolveTarget(
  target: DOMReference,
  parent: Element | null
): HTMLElement[] {
  if (target === false || target == null) return [];

  if (typeof target === 'string') {
    if (!parent) {
      return uniqueElements(requireContainer(target, 'Sticky.target', 'array'));
    }

    const elements = uniqueElements(all<HTMLElement>(target, parent));
    if (elements.length === 0) {
      throw new Error('Sticky.target: target not found.');
    }
    return elements;
  }

  const elements = uniqueElements(
    requireContainer(target, 'Sticky.target', 'array')
  );
  if (!parent) return elements;

  const scopedElements = elements.filter(
    (element) => element === parent || parent.contains(element)
  );
  if (scopedElements.length === 0) {
    throw new Error('Sticky.target: target not found in parent.');
  }
  return scopedElements;
}

/**
 * Sticky 吸附组件。
 *
 * 用于给一个或多个元素应用 `position: sticky`，并按顺序计算 `top`
 * 偏移，适合页面侧边栏中多个 widget 的堆叠吸附场景。
 */
export class Sticky extends Component<
  ResolvedStickyProps,
  StickyState,
  StickyDOM
> {
  declare runtime: StickyRuntime;

  /**
   * 创建 Sticky 实例。
   * @param {object} [input={}] Sticky 配置。
   */
  constructor(input: StickyProps = {}) {
    const props = normalizeProps(input);
    super(props);

    this.dom.parent = null;
    this.dom.targets = [];

    this.runtime.active = false;
    this.runtime.built = false;
    this.runtime.ignored = false;
    this.runtime.items = [];

    this.state = createDeepStore({
      count: 0,
      top: props.top,
      items: [],
    });
  }

  /**
   * 构建 Sticky 行为并应用样式。
   * @returns {Sticky} 当前实例。
   */
  build(): this {
    if (this.runtime.destroyed)
      throw new Error('Sticky.build: instance destroyed');
    if (this.runtime.built) return this;

    requireRenderDOM('Sticky');

    this.init(this.props);

    this.dom.parent = resolveParent(this.props.parent);
    this.dom.targets = resolveTarget(this.props.target, this.dom.parent);
    this.dom.targets = this.resolveOverflow(this.dom.targets);

    this.runtime.built = true;

    if (this.dom.targets.length === 0) return this;

    this.runtime.active = true;
    this.captureItems();
    this.apply();
    return this;
  }

  private captureItems(): void {
    this.runtime.items = this.dom.targets.map((element) => ({
      element,
      top: this.props.top,
      originalPosition: element.style.position,
      originalTop: element.style.top,
      originalZIndex: element.style.zIndex,
    }));
  }

  private resolveOverflow(targets: HTMLElement[]): HTMLElement[] {
    const { max, overflow } = this.props;
    if (targets.length <= max) return targets;

    this.runtime.ignored = overflow === 'ignore';
    return overflow === 'ignore' ? [] : targets.slice(-max);
  }

  private apply(startTop = this.props.top): number {
    let nextTop = startTop;
    const stateItems: StickyStateItem[] = [];

    for (const item of this.runtime.items) {
      item.top = nextTop;
      item.element.style.position = 'sticky';
      item.element.style.top = `${nextTop}px`;

      stateItems.push({ element: item.element, top: nextTop });
      nextTop += item.element.offsetHeight + this.props.gap;
    }

    this.setState({
      count: this.runtime.items.length,
      top: this.runtime.items[0]?.top ?? this.props.top,
      items: stateItems,
    });

    if (typeof this.props.onUpdate === 'function') {
      this.props.onUpdate(this);
    }

    return nextTop;
  }

  private restore(): void {
    for (const item of this.runtime.items) {
      item.element.style.position = item.originalPosition;
      item.element.style.top = item.originalTop;
      item.element.style.zIndex = item.originalZIndex;
    }
  }

  /**
   * 重新计算当前实例内所有 sticky 元素的 top。
   * @returns {Sticky} 当前实例。
   */
  refresh(): this {
    if (this.runtime.destroyed || !this.runtime.built || !this.runtime.active) {
      return this;
    }
    this.apply();
    return this;
  }

  destroy(): void {
    if (this.runtime.destroyed) return;
    this.restore();
    super.destroy();
  }

  /**
   * 销毁实例并恢复被管理元素的原始样式。
   * @private
   */
  protected onDestroy(): void {
    this.runtime.active = false;
    this.runtime.built = false;
    this.runtime.items = [];
    this.dom.targets = [];
  }
}

export function createSticky(props: StickyProps = {}): Sticky {
  return new Sticky(props);
}

import { createDeepStore } from 'vanilla-signal';

import Component, {
  type ComponentDOM,
  type ComponentRuntime,
} from '../core/Component.ts';
import { type DOMReference, all, requireContainer } from '../utilities/dom.ts';
import { type ResolveSchema, resolveProps } from '../utilities/types.ts';

type StickyOverflow = 'destroy' | 'ignore';

interface StickyProps extends Record<string, unknown> {
  target?: DOMReference;
  parent?: DOMReference;
  max?: number;
  top?: number;
  gap?: number;
  overflow?: StickyOverflow;
  onRefresh?: ((sticky: StickyInstance) => void) | null;
}

interface ResolvedStickyProps extends Record<string, unknown> {
  target: DOMReference;
  parent: DOMReference;
  max: number;
  top: number;
  gap: number;
  overflow: StickyOverflow;
  onRefresh: ((sticky: StickyInstance) => void) | null;
}

interface StickyStateItem {
  element: HTMLElement;
  top: number;
}

interface StickyState extends Record<string, unknown> {
  items: StickyStateItem[];
}

interface StickyDOM extends ComponentDOM {
  root: Element | null;
  parent: Element | null;
  targets: HTMLElement[];
}

interface StickyOriginalStyle {
  element: HTMLElement;
  originalPosition: string;
  originalTop: string;
  originalZIndex: string;
}

interface StickyRuntime extends ComponentRuntime {
  built: boolean;
}

interface StickyCache {
  originalStyles: StickyOriginalStyle[];
}

type StickyInstance = Component<
  ResolvedStickyProps,
  StickyState,
  StickyDOM,
  StickyCache
> & {
  runtime: StickyRuntime;
  build(): StickyInstance;
  refresh(): StickyInstance;
};

const STICKY_PROPS_SCHEMA = {
  target: { default: null },
  parent: { default: null },
  max: {
    default: 10,
    type: 'number',
    integer: true,
    greaterThan: 0,
  },
  top: {
    default: 16,
    type: 'number',
    min: 0,
  },
  gap: {
    default: 16,
    type: 'number',
    min: 0,
  },
  overflow: {
    default: 'destroy',
    type: 'string',
    enum: ['destroy', 'ignore'],
  },
  onRefresh: { default: null, types: ['function', 'null'] },
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
    onRefresh: props.onRefresh as ResolvedStickyProps['onRefresh'],
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
class Sticky extends Component<
  ResolvedStickyProps,
  StickyState,
  StickyDOM,
  StickyCache
> {
  declare runtime: StickyRuntime;
  declare cache: StickyCache;

  /**
   * 创建 Sticky 实例。
   * @param {object} [props={}] Sticky 配置。
   */
  constructor(props: StickyProps = {}) {
    const settings = normalizeProps(props);
    super(settings);

    this.dom.parent = null;
    this.dom.targets = [];
    this.cache.originalStyles = [];

    this.runtime.built = false;

    this.state = createDeepStore({
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

    this.init(this.props);

    this.dom.parent = resolveParent(this.props.parent);
    this.dom.targets = resolveTarget(this.props.target, this.dom.parent);
    this.dom.targets = this.resolveOverflow(this.dom.targets);

    this.runtime.built = true;

    if (this.dom.targets.length === 0) return this;

    this.captureOriginalStyles();
    this.apply();
    return this;
  }

  private captureOriginalStyles(): void {
    this.cache.originalStyles = this.dom.targets.map((element) => ({
      element,
      originalPosition: element.style.position,
      originalTop: element.style.top,
      originalZIndex: element.style.zIndex,
    }));
  }

  private resolveOverflow(targets: HTMLElement[]): HTMLElement[] {
    const { max, overflow } = this.props;
    if (targets.length <= max) return targets;

    return overflow === 'ignore' ? [] : targets.slice(-max);
  }

  private apply(startTop = this.props.top): number {
    let nextTop = startTop;
    const stateItems: StickyStateItem[] = [];

    for (const element of this.dom.targets) {
      element.style.position = 'sticky';
      element.style.top = `${nextTop}px`;

      stateItems.push({ element, top: nextTop });
      nextTop += element.offsetHeight + this.props.gap;
    }

    this.setState({
      items: stateItems,
    });

    if (typeof this.props.onRefresh === 'function') {
      this.props.onRefresh(this);
    }

    return nextTop;
  }

  private restore(): void {
    for (const item of this.cache.originalStyles) {
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
    if (
      this.runtime.destroyed ||
      !this.runtime.built ||
      this.dom.targets.length === 0
    ) {
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
    this.runtime.built = false;
    this.cache.originalStyles = [];
    this.dom.targets = [];
  }
}

export function createSticky(props: StickyProps = {}): StickyInstance {
  return new Sticky(props);
}

import { createDeepStore, flushSync } from 'vanilla-signal';
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
  key: string;
  index: number;
  top: number;
}

interface StickyState extends Record<string, unknown> {
  items: StickyStateItem[];
}

interface StickyOriginalStyle {
  element: HTMLElement;
  originalPosition: string;
  originalTop: string;
  originalZIndex: string;
}

interface StickyRuntime {
  built: boolean;
  destroyed: boolean;
}

interface StickyCache {
  originalStyles: StickyOriginalStyle[];
}

interface StickyInstance {
  readonly props: ResolvedStickyProps;
  readonly state: StickyState;
  readonly runtime: StickyRuntime;
  build(): StickyInstance;
  refresh(): StickyInstance;
  destroy(): void;
}

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

export function createSticky(props: StickyProps = {}): StickyInstance {
  const settings = normalizeProps(props);
  const state = createDeepStore({ items: [] }) as StickyState;
  const runtime: StickyRuntime = { built: false, destroyed: false };
  const cache: StickyCache = { originalStyles: [] };
  let parent: Element | null = null;
  let targets: HTMLElement[] = [];
  let sticky: StickyInstance;

  const resolveOverflow = (elements: HTMLElement[]): HTMLElement[] => {
    if (elements.length <= settings.max) return elements;
    return settings.overflow === 'ignore' ? [] : elements.slice(-settings.max);
  };

  const restore = (): void => {
    for (const item of cache.originalStyles) {
      item.element.style.position = item.originalPosition;
      item.element.style.top = item.originalTop;
      item.element.style.zIndex = item.originalZIndex;
    }
  };

  const apply = (startTop = settings.top): number => {
    let nextTop = startTop;
    const items: StickyStateItem[] = [];

    targets.forEach((element, index) => {
      element.style.position = 'sticky';
      element.style.top = `${nextTop}px`;
      items.push({ key: element.id || String(index), index, top: nextTop });
      nextTop += element.offsetHeight + settings.gap;
    });

    flushSync(() => {
      state.items = items;
    });
    settings.onRefresh?.(sticky);
    return nextTop;
  };

  const build = (): StickyInstance => {
    if (runtime.destroyed) throw new Error('Sticky.build: instance destroyed');
    if (runtime.built) return sticky;

    parent = resolveParent(settings.parent);
    targets = resolveOverflow(resolveTarget(settings.target, parent));
    runtime.built = true;
    if (targets.length === 0) return sticky;

    cache.originalStyles = targets.map((element) => ({
      element,
      originalPosition: element.style.position,
      originalTop: element.style.top,
      originalZIndex: element.style.zIndex,
    }));
    apply();
    return sticky;
  };

  const refresh = (): StickyInstance => {
    if (!runtime.destroyed && runtime.built && targets.length > 0) apply();
    return sticky;
  };

  const destroy = (): void => {
    if (runtime.destroyed) return;
    restore();
    runtime.destroyed = true;
    runtime.built = false;
    cache.originalStyles = [];
    targets = [];
    parent = null;
  };

  sticky = { props: settings, state, runtime, build, refresh, destroy };
  return sticky;
}

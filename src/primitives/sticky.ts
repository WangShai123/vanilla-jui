import { createDeepStore, flushSync } from 'vanilla-signal';
import { randomId } from '../utilities/id.ts';
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
  reactive?: boolean;
  onReBuild?: ((sticky: StickyInstance) => void) | null;
}

interface ResolvedStickyProps extends Record<string, unknown> {
  target: DOMReference;
  parent: DOMReference;
  max: number;
  top: number;
  gap: number;
  overflow: StickyOverflow;
  reactive: boolean;
  onReBuild: ((sticky: StickyInstance) => void) | null;
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
  reBuilding: boolean;
  reBuildFrameId: number;
}

interface StickyCache {
  originalStyles: Map<HTMLElement, StickyOriginalStyle>;
  keys: WeakMap<HTMLElement, string>;
}

interface StickyInstance {
  readonly props: ResolvedStickyProps;
  readonly state: StickyState;
  readonly runtime: StickyRuntime;
  build(): StickyInstance;
  reBuild(): StickyInstance;
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
  reactive: { default: false, type: 'boolean' },
  onReBuild: { default: null, types: ['function', 'null'] },
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
    reactive: props.reactive as boolean,
    onReBuild: props.onReBuild as ResolvedStickyProps['onReBuild'],
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
  const runtime: StickyRuntime = {
    built: false,
    destroyed: false,
    reBuilding: false,
    reBuildFrameId: 0,
  };
  const cache: StickyCache = {
    originalStyles: new Map(),
    keys: new WeakMap(),
  };
  let parent: Element | null = null;
  let targets: HTMLElement[] = [];
  let observer: MutationObserver | null = null;
  let sticky: StickyInstance;

  const resolveOverflow = (elements: HTMLElement[]): HTMLElement[] => {
    if (elements.length <= settings.max) return elements;
    return settings.overflow === 'ignore' ? [] : elements.slice(-settings.max);
  };

  const restore = (): void => {
    for (const item of cache.originalStyles.values()) restoreItem(item);
  };

  const restoreItem = (item: StickyOriginalStyle): void => {
    item.element.style.position = item.originalPosition;
    item.element.style.top = item.originalTop;
    item.element.style.zIndex = item.originalZIndex;
  };

  const itemKey = (element: HTMLElement, index: number): string => {
    if (element.id) return element.id;
    const cached = cache.keys.get(element);
    if (cached) return cached;
    const key = `sticky-${randomId()}-${index}`;
    cache.keys.set(element, key);
    return key;
  };

  const rememberOriginalStyle = (element: HTMLElement): void => {
    if (cache.originalStyles.has(element)) return;
    cache.originalStyles.set(element, {
      element,
      originalPosition: element.style.position,
      originalTop: element.style.top,
      originalZIndex: element.style.zIndex,
    });
  };

  const resolveTargets = (): HTMLElement[] => {
    return resolveOverflow(resolveTarget(settings.target, parent));
  };

  const apply = (startTop = settings.top): number => {
    let nextTop = startTop;
    const items: StickyStateItem[] = [];
    const activeTargets = new Set(targets);

    for (const [element, item] of cache.originalStyles) {
      if (!activeTargets.has(element)) {
        restoreItem(item);
        cache.originalStyles.delete(element);
      }
    }

    targets.forEach((element, index) => {
      rememberOriginalStyle(element);
      element.style.position = 'sticky';
      element.style.top = `${nextTop}px`;
      items.push({ key: itemKey(element, index), index, top: nextTop });
      nextTop += element.offsetHeight + settings.gap;
    });

    flushSync(() => {
      state.items = items;
    });
    settings.onReBuild?.(sticky);
    return nextTop;
  };

  const observeParent = (): void => {
    observer?.disconnect();
    observer = null;
    if (!settings.reactive) return;
    const root = parent || document.body;
    observer = new MutationObserver(() => {
      if (runtime.reBuilding || runtime.destroyed || !runtime.built) return;
      runtime.reBuilding = true;
      runtime.reBuildFrameId = requestAnimationFrame(() => {
        runtime.reBuilding = false;
        runtime.reBuildFrameId = 0;
        sticky.reBuild();
      });
    });
    observer.observe(root, { childList: true, subtree: true });
  };

  const build = (): StickyInstance => {
    if (runtime.destroyed) throw new Error('Sticky.build: instance destroyed');
    if (runtime.built) return sticky;

    parent = resolveParent(settings.parent);
    targets = resolveTargets();
    runtime.built = true;
    observeParent();
    if (targets.length === 0) {
      flushSync(() => {
        state.items = [];
      });
      return sticky;
    }
    apply();
    return sticky;
  };

  const reBuild = (): StickyInstance => {
    if (!runtime.destroyed && runtime.built) {
      targets = resolveTargets();
      apply();
    }
    return sticky;
  };

  const destroy = (): void => {
    if (runtime.destroyed) return;
    if (runtime.reBuildFrameId) cancelAnimationFrame(runtime.reBuildFrameId);
    observer?.disconnect();
    observer = null;
    restore();
    runtime.destroyed = true;
    runtime.built = false;
    runtime.reBuilding = false;
    runtime.reBuildFrameId = 0;
    cache.originalStyles.clear();
    targets = [];
    parent = null;
  };

  sticky = { props: settings, state, runtime, build, reBuild, destroy };
  return sticky;
}

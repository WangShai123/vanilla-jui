import { For, createDeepStore, flushSync, jsx } from 'vanilla-signal';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
import { joinClasses } from '../utilities/class-name.ts';
import { type DOMReference, all, requireContainer } from '../utilities/dom.ts';
import { createEventManager } from '../utilities/events.ts';
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

interface TocRuntimeExtras {
  ticking: boolean;
  frameId: number;
}

interface TocScrollOptions {
  activeIndex?: number;
  updateHash?: boolean;
}

interface TocActions {
  refresh(): TocInstance;
  activate(index: number): TocInstance;
}

type TocInstance = FunctionalComponent<
  ResolvedTocProps,
  TocState,
  HTMLElement,
  TocActions
>;

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
  };
}

export function createToc(props: TocProps = {}): TocInstance {
  const settings = normalizeProps(props);
  const state = createDeepStore({
    items: [],
    current: { index: -1, item: null },
  }) as TocState;
  const runtime: TocRuntimeExtras = { ticking: false, frameId: 0 };
  const events = createEventManager();
  let target: Element | null = null;
  let headings: HTMLHeadingElement[] = [];
  let toc: TocInstance;

  const setActive = (index: number): void => {
    if (index === state.current.index) return;
    const current = state.items[index] || null;
    flushSync(() => {
      state.current = { index, item: current };
    });
    settings.onChange?.(current, index, toc);
  };

  const updateActive = (): void => {
    if (!toc.runtime.built) return;
    let index = -1;
    const activeOffset = settings.offset + ACTIVE_OFFSET_TOLERANCE;
    for (let current = headings.length - 1; current >= 0; current--) {
      if (headings[current].getBoundingClientRect().top <= activeOffset) {
        index = current;
        break;
      }
    }
    setActive(index);
  };

  const onScroll = (): void => {
    if (runtime.ticking) return;
    runtime.ticking = true;
    runtime.frameId = requestAnimationFrame(() => {
      runtime.ticking = false;
      runtime.frameId = 0;
      updateActive();
    });
  };

  const scrollToItem = (
    item: TocItem,
    { activeIndex = -1, updateHash = false }: TocScrollOptions = {}
  ): void => {
    const heading = headings.find((element) => element.id === item.id);
    if (!heading) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const top = Math.max(
      0,
      heading.getBoundingClientRect().top + scrollY - settings.offset
    );
    window.scrollTo({ top, behavior: 'smooth' });
    if (activeIndex >= 0) setActive(activeIndex);
    if (updateHash && window.history?.pushState) {
      window.history.pushState(null, '', `#${item.id}`);
    }
  };

  const refresh = (): TocInstance => {
    if (toc.runtime.destroyed || !toc.runtime.built || !target) return toc;
    headings = all<HTMLHeadingElement>(settings.headings, target);
    const items = headings.map(normalizeHeading);
    flushSync(() => {
      state.items = items;
      state.current = { index: -1, item: null };
    });
    updateActive();
    return toc;
  };

  const activate = (index: number): TocInstance => {
    if (
      toc.runtime.built &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < state.items.length
    ) {
      scrollToItem(state.items[index]);
    }
    return toc;
  };

  toc = defineComponent({
    name: 'Toc',
    props: settings,
    state,
    actions: { refresh, activate },
    view: () =>
      jsx('nav', {
        className: settings.className.toc,
        'data-toc': 'root',
        children: jsx('div', {
          className: settings.className.list,
          'data-toc-list': 'root',
          children: For({
            each: () => state.items,
            key: (item: TocItem) => item.id,
            children: (
              itemAccessor: () => TocItem,
              indexAccessor: () => number
            ) =>
              jsx('a', {
                className: () => {
                  const item = itemAccessor();
                  return joinClasses(
                    settings.className.link,
                    `${settings.className.levelPrefix}${item.level}`,
                    state.current.index === indexAccessor()
                      ? settings.className.active
                      : ''
                  );
                },
                href: () => `#${itemAccessor().id}`,
                'data-toc-index': () => String(indexAccessor()),
                'data-toc-target': () => itemAccessor().id,
                'data-active': () =>
                  state.current.index === indexAccessor() ? '1' : '0',
                onClick: (event: Event) => {
                  event.preventDefault();
                  scrollToItem(itemAccessor(), {
                    activeIndex: indexAccessor(),
                    updateHash: true,
                  });
                },
                children: () => itemAccessor().text,
              }),
          }),
        }),
      }) as HTMLElement,
    onBuild(context) {
      target = requireContainer(settings.target, 'Toc.target');
      events.on('scroll', window, 'scroll', onScroll, { passive: true });
      context.own(() => events.clear());
      refresh();
    },
    onDestroy() {
      if (runtime.frameId) cancelAnimationFrame(runtime.frameId);
      runtime.frameId = 0;
      runtime.ticking = false;
      target = null;
      headings = [];
    },
  });

  return toc;
}

import {
  For,
  createDeepStore,
  createEffect,
  flushSync,
  jsx,
  onCleanup,
} from 'vanilla-signal';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
import { icon } from '../primitives/icons.ts';
import {
  type RenderableContent,
  normalizeContentNodes,
} from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import {
  type CollapseMotionController,
  createCollapseTransition,
} from '../utilities/motion.ts';
import { createKeyedElementRefs } from '../utilities/refs.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';

type AccordionActive = number | string | Array<number | string> | null;
type AccordionDirection = 'vertical' | 'horizontal';

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
  direction?: AccordionDirection;
  className?: AccordionClassNameConfig;
  data: AccordionItem[];
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
  direction: AccordionDirection;
  className: AccordionClassNames;
  data: AccordionItem[];
  onChange: NonNullable<AccordionProps['onChange']> | null;
}

interface AccordionCurrent {
  index: number | null;
  name: string | null;
}

interface AccordionState extends Record<string, unknown> {
  data: AccordionItem[];
  activeNames: string[];
}

interface AccordionContentContext {
  accordion: AccordionInstance;
  item: AccordionItem;
  index: number;
  type: 'title' | 'content';
  active: boolean;
}

type AccordionInstance = FunctionalComponent<
  ResolvedAccordionProps,
  AccordionState,
  HTMLElement,
  AccordionActions
> & {
  readonly current: AccordionCurrent;
};

interface AccordionActions {
  isActive(name: string): boolean;
  getIndex(value: number | string | undefined | null): number;
  activate(value: number | string | undefined): Promise<void>;
}

const DEFAULT_CLASS_NAMES: AccordionClassNames = {
  root: 'j-accordion',
  header: 'accordion-header',
  title: 'header-title',
  arrow: 'header-arrow j-button is-icon is-ghost is-sm',
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

const ACCORDION_DATA_RULE = {
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
  direction: {
    default: 'vertical',
    type: 'string',
    enum: ['vertical', 'horizontal'],
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
  data: { default: [], ...ACCORDION_DATA_RULE },
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
    direction: resolved.direction as AccordionDirection,
    className: resolved.className as AccordionClassNames,
    data: normalizeData(resolved.data, false),
    onChange: resolved.onChange as ResolvedAccordionProps['onChange'],
  };
}

function normalizeData(data: unknown, validate = true): AccordionItem[] {
  if (validate) {
    validateParam('data', data, ACCORDION_DATA_RULE, 'Accordion');
  }

  const names = new Set<string>();

  return (data as unknown[]).map((item) => {
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

function resolveActiveItemNames(
  active: AccordionActive,
  data: AccordionItem[],
  multiple: boolean
): string[] {
  if (active == null) return [];

  const values = Array.isArray(active) ? active : [active];
  const names: string[] = [];

  for (const value of values) {
    const index =
      typeof value === 'number'
        ? value
        : data.findIndex((item) => item.name === value);
    const name = data[index]?.name;

    if (!name) continue;

    names.push(name);
    if (!multiple) break;
  }

  return Array.from(new Set(names));
}

function reconcileActiveNames(
  activeNames: string[],
  data: AccordionItem[],
  multiple: boolean
): string[] {
  const names = new Set(data.map((item) => item.name).filter(Boolean));
  const nextNames = activeNames.filter((name) => names.has(name));
  return multiple ? nextNames : nextNames.slice(0, 1);
}

function createCurrentState(
  activeNames: string[],
  data: AccordionItem[]
): AccordionCurrent {
  const name = activeNames[0] || null;
  if (!name) return { index: null, name: null };

  const index = data.findIndex((item) => item.name === name);
  return index >= 0 ? { index, name } : { index: null, name: null };
}

export function createAccordion(props: AccordionProps): AccordionInstance {
  const resolvedProps = normalizeProps(props);
  const activeNames = resolveActiveItemNames(
    resolvedProps.active,
    resolvedProps.data,
    resolvedProps.multiple
  );
  const state = createDeepStore({
    data: resolvedProps.data,
    activeNames,
  }) as AccordionState;
  const generatedNames = new WeakMap<object, string>();
  const headers = createKeyedElementRefs<string, HTMLElement>();
  const panels = createKeyedElementRefs<string, HTMLElement>();
  const panelMotions = new Map<string, CollapseMotionController>();
  let motionActiveNames = new Set(activeNames);
  let motionPromise = Promise.resolve();
  let accordion: AccordionInstance;

  const itemName = (item: AccordionItem): string => {
    const explicit = typeof item.name === 'string' ? item.name.trim() : '';
    if (explicit) return explicit;
    if (!generatedNames.has(item)) generatedNames.set(item, randomId());
    return generatedNames.get(item) as string;
  };

  const current = (): AccordionCurrent => {
    const data = state.data.map((item) => ({
      ...item,
      name: itemName(item),
    }));
    return createCurrentState(
      reconcileActiveNames(state.activeNames, data, resolvedProps.multiple),
      data
    );
  };

  const isActive = (name: string): boolean => state.activeNames.includes(name);

  const getIndex = (value: number | string | undefined | null): number => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return -1;
    return state.data.findIndex((item) => itemName(item) === value);
  };

  const transitionPanels = (activeNames: readonly string[]): Promise<void> => {
    const nextActiveNames = new Set(activeNames);
    const names = new Set([...motionActiveNames, ...nextActiveNames]);
    const transitions: Promise<void>[] = [];

    for (const name of names) {
      const wasActive = motionActiveNames.has(name);
      const active = nextActiveNames.has(name);
      if (wasActive === active) continue;

      const panel = panels.get(name);
      if (panel) panel.inert = !active;
      const motion = panelMotions.get(name);
      if (motion) transitions.push(active ? motion.enter() : motion.leave());
    }

    motionActiveNames = nextActiveNames;
    if (transitions.length > 0) {
      motionPromise = Promise.all(transitions).then(() => undefined);
    }
    return motionPromise;
  };

  const bindPanel =
    (name: string) =>
    (panel: HTMLElement): void => {
      panels.bind(name)(panel);
      panelMotions.get(name)?.cancel();
      const motion = createCollapseTransition(() => panels.get(name), {
        axis: resolvedProps.direction,
        options: { duration: 250, easing: 'ease' },
      });
      panelMotions.set(name, motion);
      const active = isActive(name);
      panel.inert = !active;
      motion.setExpanded(active);
      onCleanup(() => {
        if (panelMotions.get(name) !== motion) return;
        motion.cancel();
        panelMotions.delete(name);
      });
    };

  const activate = async (
    value: number | string | undefined
  ): Promise<void> => {
    if (accordion.runtime.destroyed) {
      throw new Error('Accordion.activate: instance destroyed');
    }
    if (!accordion.runtime.built) {
      throw new Error('Accordion.activate: call build() first.');
    }

    const index = getIndex(value);
    const item = state.data[index];
    if (!item) return;
    const name = itemName(item);
    const active = isActive(name);
    if (active && !resolvedProps.multiple && !resolvedProps.collapsible) return;

    let next: string[];
    if (resolvedProps.multiple) {
      if (active) {
        const remaining = state.activeNames.filter(
          (itemName) => itemName !== name
        );
        next =
          !resolvedProps.collapsible && remaining.length === 0
            ? [...state.activeNames]
            : remaining;
      } else {
        next = [...state.activeNames, name];
      }
    } else if (active) {
      next = resolvedProps.collapsible ? [] : [...state.activeNames];
    } else {
      next = [name];
    }

    flushSync(() => {
      state.activeNames = next;
    });
    const transitioned = transitionPanels(next);

    const header = headers.get(name);
    const panel = panels.get(name);
    const changed =
      resolvedProps.onChange && header && panel
        ? Promise.resolve(
            resolvedProps.onChange(index, name, header, panel, accordion)
          )
        : Promise.resolve();
    await Promise.all([transitioned, changed]);
  };

  const contentView = (
    item: AccordionItem,
    index: number,
    type: 'title' | 'content'
  ): Node[] => {
    const name = itemName(item);
    return normalizeContentNodes(type === 'title' ? item.title : item.content, {
      accordion,
      item,
      index,
      type,
      active: isActive(name),
    });
  };

  const itemView = (
    itemAccessor: () => AccordionItem,
    indexAccessor: () => number
  ): Node[] => {
    const name = itemName(itemAccessor());
    const headerId = `${resolvedProps.id}_header_${name}`;
    const panelId = `${resolvedProps.id}_panel_${name}`;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      void activate(name);
    };

    return [
      jsx('div', {
        className: resolvedProps.className.header,
        id: headerId,
        'data-accordion-header': name,
        role: 'button',
        tabindex: '0',
        'aria-controls': panelId,
        'aria-expanded': () => (isActive(name) ? 'true' : 'false'),
        ref: headers.bind(name),
        onClick: () => void activate(name),
        onKeyDown: handleKeyDown,
        children: [
          jsx('span', {
            className: resolvedProps.className.title,
            'data-accordion-title': name,
            role: 'heading',
            children: () =>
              contentView(itemAccessor(), indexAccessor(), 'title'),
          }),
          jsx('span', {
            className: resolvedProps.className.arrow,
            'data-accordion-arrow': name,
            'aria-hidden': 'true',
            children: icon('arrow-down'),
          }),
        ],
      }),
      jsx('div', {
        className: resolvedProps.className.panel,
        'data-accordion-panel': name,
        id: panelId,
        role: 'region',
        'aria-labelledby': headerId,
        'aria-hidden': () => (isActive(name) ? 'false' : 'true'),
        'data-state': () => (isActive(name) ? 'open' : 'closed'),
        ref: bindPanel(name),
        children: jsx('div', {
          className: resolvedProps.className.content,
          'data-accordion-content': name,
          children: () =>
            contentView(itemAccessor(), indexAccessor(), 'content'),
        }),
      }),
    ];
  };

  accordion = defineComponent({
    name: 'Accordion',
    props: resolvedProps,
    state,
    actions: { isActive, getIndex, activate },
    normalizeStatePatch(patch) {
      return {
        ...patch,
        ...(Object.hasOwn(patch, 'data')
          ? { data: normalizeData(patch.data) }
          : {}),
      };
    },
    view: () => {
      const root = jsx('div', {
        className: resolvedProps.className.root,
        id: resolvedProps.id,
        'data-accordion': 'root',
        'data-direction': resolvedProps.direction,
        children: For({
          each: () => state.data,
          key: (item: AccordionItem) => itemName(item),
          children: (
            itemAccessor: () => AccordionItem,
            indexAccessor: () => number
          ) => itemView(itemAccessor, indexAccessor),
        }),
      }) as HTMLElement;
      motionActiveNames = new Set(state.activeNames);
      createEffect(() => {
        void transitionPanels([...state.activeNames]);
      });
      return root;
    },
    onDestroy() {
      for (const motion of panelMotions.values()) motion.cancel();
      panelMotions.clear();
      headers.clear();
      panels.clear();
    },
  }) as AccordionInstance;

  Object.defineProperty(accordion, 'current', {
    enumerable: true,
    get: current,
  });

  return accordion;
}

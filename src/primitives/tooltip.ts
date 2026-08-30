import { jsx } from 'vanilla-signal';

import { type DOMReference, joinClasses } from '../utilities/dom.ts';
import { type ResolveSchema, resolveProps } from '../utilities/types.ts';
import { createDrop } from './drop.ts';

type DropInstance = ReturnType<typeof createDrop>;
type DropMode = 'hover' | 'click';
type DropPosition =
  | 'auto'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'left'
  | 'right';

interface DropDelay {
  show?: number;
  hide?: number;
}

export interface TooltipInstance {
  readonly element: HTMLElement | null;
  readonly drop: DropInstance | null;
  show(useDelay?: boolean): void;
  hide(useDelay?: boolean): void;
  toggle(): void;
  destroy(): void;
}

interface TooltipClassNames {
  container: string;
  message: string;
  ui: TooltipThemeClassNames;
}

interface TooltipThemeClassNames {
  reverse: string;
  primary: string;
  success: string;
  warning: string;
  error: string;
}

type TooltipTheme =
  | false
  | 'reverse'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error';
type TooltipClassNameConfig = Partial<Omit<TooltipClassNames, 'ui'>> & {
  ui?: Partial<TooltipThemeClassNames>;
};

interface TooltipProps extends Record<string, unknown> {
  name?: string | null;
  mode?: DropMode;
  position?: DropPosition;
  offset?: number;
  message?: string;
  theme?: TooltipTheme;
  cache?: boolean;
  ttl?: number;
  className?: TooltipClassNameConfig;
  id?: string | null;
  delay?: number | DropDelay;
  hoverIntent?: boolean;
  onShown?: ((drop: DropInstance) => void | Promise<void>) | null;
  onHidden?: ((drop: DropInstance) => void | Promise<void>) | null;
}

interface ResolvedTooltipProps extends Record<string, unknown> {
  name: string | null;
  mode: DropMode;
  position: DropPosition;
  offset: number;
  message: string;
  theme: TooltipTheme;
  cache: boolean;
  ttl: number;
  className: TooltipClassNames;
  id: string | null;
  delay: number | DropDelay;
  hoverIntent: boolean;
  onShown: NonNullable<TooltipProps['onShown']> | null;
  onHidden: NonNullable<TooltipProps['onHidden']> | null;
}

const DEFAULT_CLASS_NAMES: TooltipClassNames = {
  container: 'j-tooltip',
  message: 'el-text',
  ui: {
    reverse: 'is-reverse',
    primary: 'is-primary',
    success: 'is-success',
    warning: 'is-warning',
    error: 'is-error',
  },
};

function normalizeClassNames(value: unknown): TooltipClassNames {
  const input = value && typeof value === 'object' ? value : {};
  const ui =
    'ui' in input && input.ui && typeof input.ui === 'object' ? input.ui : {};
  return {
    ...DEFAULT_CLASS_NAMES,
    ...input,
    ui: {
      ...DEFAULT_CLASS_NAMES.ui,
      ...ui,
    },
  };
}

const TOOLTIP_OPTIONS_SCHEMA = {
  name: { default: null, types: ['string', 'null'] },
  mode: { default: 'hover', type: 'string', enum: ['hover', 'click'] },
  position: {
    default: 'auto',
    type: 'string',
    enum: [
      'auto',
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'left',
      'right',
    ],
  },
  offset: { default: 0, type: 'number' },
  message: {
    default: '',
    type: 'string',
    normalize: (value: unknown) =>
      typeof value === 'string' ? value.trim() : value,
    nonEmpty: true,
  },
  theme: {
    default: false,
    types: ['string', 'boolean'],
    enum: [false, 'reverse', 'primary', 'success', 'warning', 'error'],
  },
  cache: { default: false, type: 'boolean' },
  ttl: {
    default: 0,
    type: 'number',
    min: 0,
  },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: normalizeClassNames,
  },
  id: { default: null, types: ['string', 'null'] },
  delay: { default: 100, types: ['number', 'object'] },
  hoverIntent: { default: true, type: 'boolean' },
  onShown: { default: null, types: ['function', 'null'] },
  onHidden: { default: null, types: ['function', 'null'] },
} satisfies ResolveSchema<TooltipProps>;

function normalizeProps(input: TooltipProps): ResolvedTooltipProps {
  const props = resolveProps(input, TOOLTIP_OPTIONS_SCHEMA, 'Tooltip.props');
  return {
    name: props.name as string | null,
    mode: props.mode as DropMode,
    position: props.position as DropPosition,
    offset: props.offset as number,
    message: props.message as string,
    theme: props.theme as TooltipTheme,
    cache: props.cache as boolean,
    ttl: props.ttl as number,
    className: props.className as TooltipClassNames,
    id: props.id as string | null,
    delay: props.delay as number | DropDelay,
    hoverIntent: props.hoverIntent as boolean,
    onShown: props.onShown as ResolvedTooltipProps['onShown'],
    onHidden: props.onHidden as ResolvedTooltipProps['onHidden'],
  };
}

/**
 * Tooltip 提示组件。
 *
 * 基于 Drop 实现，提供更轻量的文本提示封装。
 */
export function createTooltip(
  element: DOMReference,
  input: TooltipProps = {}
): TooltipInstance {
  const props = normalizeProps(input);
  const content = jsx('div', {
    className: joinClasses(
      props.className.container,
      props.theme && props.className.ui[props.theme]
    ),
    'data-tooltip': props.name || props.id || '',
    children: jsx('div', {
      className: props.className.message,
      'data-tooltip-message': '',
      children: props.message,
    }),
  }) as HTMLElement;
  let drop: DropInstance | null = createDrop(element, {
    name: props.name,
    mode: props.mode,
    position: props.position,
    offset: props.offset,
    cache: props.cache,
    ttl: props.ttl,
    id: props.id,
    delay: props.delay,
    hoverIntent: props.hoverIntent,
    onShown: props.onShown,
    onHidden: props.onHidden,
    content,
  });
  const tooltip: TooltipInstance = {
    get element() {
      return drop?.element || null;
    },
    get drop() {
      return drop;
    },
    show(useDelay = true) {
      drop?.show(useDelay);
    },
    hide(useDelay = true) {
      drop?.hide(useDelay);
    },
    toggle() {
      drop?.toggle();
    },
    destroy() {
      drop?.destroy();
      drop = null;
    },
  };
  return tooltip;
}

import { jsx } from 'vanilla-signal';

import { joinClasses } from '../utilities/class-name.ts';
import { type DOMReference } from '../utilities/dom.ts';
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

interface TooltipDom {
  root: HTMLElement | null;
}

interface TooltipInstance {
  dom: TooltipDom;
  drop: DropInstance | null;
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
  offset: { default: 8, type: 'number' },
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
class Tooltip implements TooltipInstance {
  dom: TooltipDom;
  drop: DropInstance | null;
  props: ResolvedTooltipProps | null;

  constructor(element: DOMReference, props: TooltipProps = {}) {
    const settings = normalizeProps(props);
    this.props = settings;
    this.drop = createDrop(element, {
      name: settings.name,
      mode: settings.mode,
      position: settings.position,
      offset: settings.offset,
      id: settings.id,
      delay: settings.delay,
      hoverIntent: settings.hoverIntent,
      onShown: settings.onShown,
      onHidden: settings.onHidden,
      content: this.buildContent(settings),
    });
    this.dom = this.drop.dom;
  }

  private buildContent(settings: ResolvedTooltipProps): HTMLElement {
    return jsx('div', {
      className: joinClasses(
        settings.className.container,
        settings.theme && settings.className.ui[settings.theme]
      ),
      'data-tooltip': settings.name || settings.id || '',
      children: jsx('div', {
        className: settings.className.message,
        'data-tooltip-message': '',
        children: settings.message,
      }),
    }) as HTMLElement;
  }

  show(useDelay = true): void {
    this.drop?.show(useDelay);
  }

  hide(useDelay = true): void {
    this.drop?.hide(useDelay);
  }

  toggle(): void {
    this.drop?.toggle();
  }

  destroy(): void {
    this.drop?.destroy();
    this.drop = null;
    this.props = null;
  }
}

export function createTooltip(
  element: DOMReference,
  props: TooltipProps = {}
): TooltipInstance {
  return new Tooltip(element, props);
}

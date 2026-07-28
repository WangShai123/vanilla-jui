import { jsx } from 'vanilla-signal';

import { type ResolveSchema, resolveProps } from '../utilities/core.ts';
import { type DOMReference } from '../utilities/dom.ts';
import {
  Drop,
  type DropClassNameConfig,
  type DropDelay,
  type DropMode,
  type DropPosition,
} from './drop.ts';

export interface TooltipClassNames {
  root: string;
  message: string;
}

export type TooltipClassNameConfig = Partial<TooltipClassNames>;

export interface TooltipProps extends Record<string, unknown> {
  name?: string | null;
  mode?: DropMode;
  position?: DropPosition;
  offset?: number;
  message?: string;
  className?: TooltipClassNameConfig;
  dropClassName?: DropClassNameConfig;
  id?: string | null;
  delay?: number | DropDelay;
  hoverIntent?: boolean;
  onShown?: ((drop: Drop) => void | Promise<void>) | null;
  onHidden?: ((drop: Drop) => void | Promise<void>) | null;
}

interface ResolvedTooltipProps extends Record<string, unknown> {
  name: string | null;
  mode: DropMode;
  position: DropPosition;
  offset: number;
  message: string;
  className: TooltipClassNames;
  dropClassName: DropClassNameConfig;
  id: string | null;
  delay: number | DropDelay;
  hoverIntent: boolean;
  onShown: NonNullable<TooltipProps['onShown']> | null;
  onHidden: NonNullable<TooltipProps['onHidden']> | null;
}

const DEFAULT_CLASS_NAMES: TooltipClassNames = {
  root: 'j-tooltip',
  message: 'tooltip-message',
};

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
    validate: (value: unknown) => typeof value === 'string' && value.length > 0,
    message: 'expects a non-empty string.',
  },
  className: {
    default: DEFAULT_CLASS_NAMES,
    type: 'object',
    normalize: (value: unknown) => ({
      ...DEFAULT_CLASS_NAMES,
      ...(value && typeof value === 'object' ? value : {}),
    }),
  },
  dropClassName: { default: {}, type: 'object' },
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
    className: props.className as TooltipClassNames,
    dropClassName: props.dropClassName as DropClassNameConfig,
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
export class Tooltip {
  drop: Drop | null;
  props: ResolvedTooltipProps | null;

  constructor(element: DOMReference, props: TooltipProps = {}) {
    const settings = normalizeProps(props);
    this.props = settings;
    this.drop = new Drop(element, {
      name: settings.name,
      mode: settings.mode,
      position: settings.position,
      offset: settings.offset,
      id: settings.id,
      delay: settings.delay,
      hoverIntent: settings.hoverIntent,
      onShown: settings.onShown,
      onHidden: settings.onHidden,
      className: settings.dropClassName,
      content: this.buildContent(settings),
    });
  }

  private buildContent(settings: ResolvedTooltipProps): HTMLElement {
    return jsx('div', {
      className: settings.className.root,
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
): Tooltip {
  return new Tooltip(element, props);
}

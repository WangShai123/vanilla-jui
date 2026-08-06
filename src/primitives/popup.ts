import { jsx } from 'vanilla-signal';

import { type RenderableContent } from '../utilities/dom.ts';
import { type ResolveSchema, resolveProps } from '../utilities/types.ts';

export interface PopupProps extends Record<string, unknown> {
  className?: string;
  position?: string;
  component?: string;
  labelledby?: string;
  content?: RenderableContent;
}

interface ResolvedPopupProps extends Record<string, unknown> {
  className?: string;
  position: string;
  component: string;
  labelledby: string;
  content: RenderableContent;
}

const POPUP_PROPS_SCHEMA = {
  className: { default: 'j-popup-layout', type: 'string' },
  position: { default: 'center', type: 'string' },
  component: { default: '', type: 'string' },
  labelledby: { default: '', type: 'string' },
  content: {
    default: '',
    type: 'renderable',
  },
} satisfies ResolveSchema<PopupProps>;

function normalizeProps(input: PopupProps): ResolvedPopupProps {
  const props = resolveProps(input, POPUP_PROPS_SCHEMA, 'Popup');

  return {
    className: props.className as string,
    position: props.position as string,
    component: props.component as string,
    labelledby: props.labelledby as string,
    content: props.content as RenderableContent,
  };
}

export function createPopup(props: PopupProps = {}): HTMLElement {
  const { className, position, component, labelledby, content } =
    normalizeProps(props);
  const attrs: Record<string, unknown> = {
    className: `${className} is-${position}`,
    role: 'dialog',
    children: content,
  };

  if (component) {
    attrs[`data-${component}`] = 'root';
    attrs[`aria-${component}`] = 'true';
  }
  if (labelledby) attrs['aria-labelledby'] = labelledby;

  return jsx('div', attrs) as HTMLElement;
}

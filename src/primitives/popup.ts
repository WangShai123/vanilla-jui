import { type ElementProps, jsx } from 'vanilla-signal';

import { asRenderable, type RenderableContent } from '../utilities/dom.ts';
import { type ConfigSchema, resolveConfig } from '../utilities/config.ts';

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
} satisfies ConfigSchema<PopupProps>;

function normalizeProps(input: PopupProps): ResolvedPopupProps {
  const props = resolveConfig(input, POPUP_PROPS_SCHEMA, 'Popup');

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
  const attrs: ElementProps<HTMLDivElement> = {
    className: `${className} is-${position}`,
    role: 'dialog',
    children: asRenderable(content),
  };

  if (component) {
    attrs[`data-${component}`] = 'root';
    attrs[`aria-${component}`] = 'true';
  }
  if (labelledby) attrs['aria-labelledby'] = labelledby;

  return jsx('div', attrs) as HTMLElement;
}

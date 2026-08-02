// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { Tooltip, createTooltip } from '../src/components/tooltip.ts';

let tooltip: Tooltip | null = null;

function target(id = 'target'): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = id;
  button.textContent = 'Target';
  document.body.appendChild(button);
  return button;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  tooltip?.destroy();
  tooltip = null;
  document.body.innerHTML = '';
});

describe('Tooltip', () => {
  it('builds tooltip content through Drop with stable data markers', () => {
    const button = target();
    tooltip = new Tooltip(button, {
      id: 'tip',
      name: 'help',
      message: 'Helpful message',
    });

    expect(tooltip.drop?.root?.getAttribute('data-drop')).toBe('help');
    expect(
      tooltip.drop?.root?.querySelector('[data-tooltip="help"]')
    ).toBeTruthy();
    expect(
      tooltip.drop?.root?.querySelector('[data-tooltip-message]')?.textContent
    ).toBe('Helpful message');
  });

  it('allows className overrides for tooltip container and message', () => {
    const button = target();
    tooltip = createTooltip(button, {
      message: 'Custom message',
      className: {
        container: 'qa-tooltip',
        message: 'qa-tooltip-message',
      },
    });

    expect(tooltip.drop?.root?.classList.contains('j-drop')).toBe(true);
    expect(
      tooltip.drop?.root
        ?.querySelector('[data-tooltip]')
        ?.classList.contains('qa-tooltip')
    ).toBe(true);
    expect(
      tooltip.drop?.root
        ?.querySelector('[data-tooltip-message]')
        ?.classList.contains('qa-tooltip-message')
    ).toBe(true);

    tooltip.show(false);
    expect(tooltip.drop?.root?.getAttribute('aria-expanded')).toBe('true');
  });

  it('proxies show, hide and toggle to Drop', () => {
    const button = target();
    tooltip = new Tooltip(button, {
      message: 'Proxy message',
      mode: 'click',
      delay: 0,
    });

    tooltip.show(false);
    expect(tooltip.drop?.isVisible).toBe(true);
    tooltip.hide(false);
    expect(tooltip.drop?.isVisible).toBe(false);
    tooltip.toggle();
    expect(tooltip.drop?.isVisible).toBe(true);
  });

  it('validates message and clears drop on destroy', () => {
    const button = target();
    expect(() => new Tooltip(button, { message: '   ' })).toThrow(
      /Tooltip\.props\.message/
    );

    const onShown = vi.fn();
    tooltip = new Tooltip(button, {
      message: 'Destroy message',
      onShown,
    });
    tooltip.show(false);
    const root = tooltip.drop?.root;
    expect(onShown).toHaveBeenCalled();

    tooltip.destroy();
    expect(tooltip.drop).toBeNull();
    expect(root ? document.body.contains(root) : false).toBe(false);
  });
});

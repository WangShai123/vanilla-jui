// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { createTooltip } from '../src/primitives/tooltip.ts';

let tooltip: ReturnType<typeof createTooltip> | null = null;

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
    tooltip = createTooltip(button, {
      id: 'tip',
      name: 'help',
      message: 'Helpful message',
    });

    expect(tooltip.element?.getAttribute('data-drop')).toBe('help');
    expect(
      tooltip.element?.querySelector('[data-tooltip="help"]')
    ).toBeTruthy();
    expect(
      tooltip.element?.querySelector('[data-tooltip-message]')?.textContent
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

    expect(tooltip.element?.classList.contains('j-drop')).toBe(true);
    expect(
      tooltip.element
        ?.querySelector('[data-tooltip]')
        ?.classList.contains('qa-tooltip')
    ).toBe(true);
    expect(
      tooltip.element
        ?.querySelector('[data-tooltip-message]')
        ?.classList.contains('qa-tooltip-message')
    ).toBe(true);

    tooltip.show(false);
    expect(tooltip.element?.getAttribute('aria-expanded')).toBe('true');
  });

  it('sets theme class only when theme is configured', () => {
    const defaultButton = target('default-theme');
    tooltip = createTooltip(defaultButton, {
      message: 'Default theme',
    });

    expect(
      tooltip.element
        ?.querySelector('[data-tooltip]')
        ?.classList.contains('is-primary')
    ).toBe(false);

    tooltip.destroy();

    const themedButton = target('primary-theme');
    tooltip = createTooltip(themedButton, {
      message: 'Primary theme',
      theme: 'primary',
    });

    expect(
      tooltip.element
        ?.querySelector('[data-tooltip]')
        ?.classList.contains('is-primary')
    ).toBe(true);
  });

  it('allows ui theme className overrides', () => {
    const button = target('theme-class');
    tooltip = createTooltip(button, {
      message: 'Theme class',
      theme: 'error',
      className: {
        ui: {
          error: 'qa-error-theme',
        },
      },
    });

    const container = tooltip.element?.querySelector('[data-tooltip]');

    expect(container?.classList.contains('j-tooltip')).toBe(true);
    expect(container?.classList.contains('qa-error-theme')).toBe(true);
    expect(container?.classList.contains('ui-error')).toBe(false);
  });

  it('proxies show, hide and toggle to Drop', () => {
    const button = target();
    tooltip = createTooltip(button, {
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
    expect(() => createTooltip(button, { message: '   ' })).toThrow(
      /Tooltip\.props\.message/
    );
    expect(() =>
      createTooltip(button, { message: 'Invalid', theme: true as never })
    ).toThrow(/Tooltip\.props\.theme/);
    expect(() =>
      createTooltip(button, {
        message: 'Invalid',
        theme: 'secondary' as never,
      })
    ).toThrow(/Tooltip\.props\.theme/);

    const onShown = vi.fn();
    tooltip = createTooltip(button, {
      message: 'Destroy message',
      onShown,
    });
    tooltip.show(false);
    const root = tooltip.element;
    expect(onShown).toHaveBeenCalled();

    tooltip.destroy();
    expect(tooltip.drop).toBeNull();
    expect(root ? document.body.contains(root) : false).toBe(false);
  });
});

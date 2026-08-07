// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { createDrop } from '../src/primitives/drop.ts';

let drop: ReturnType<typeof createDrop> | null = null;

function target(id = 'target'): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = id;
  button.textContent = 'Target';
  document.body.appendChild(button);
  return button;
}

beforeEach(() => {
  document.body.innerHTML = '';
  vi.useFakeTimers();
});

afterEach(() => {
  drop?.destroy();
  drop = null;
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('Drop', () => {
  it('builds default classes and stable data markers', () => {
    const button = target();
    drop = createDrop(button, {
      id: 'default-drop',
      name: 'menu',
      content: '<b>Drop content</b>',
    });

    expect(drop.element?.classList.contains('j-drop')).toBe(true);
    expect(drop.element?.getAttribute('data-drop')).toBe('menu');
    expect(
      drop.element?.querySelector('[data-drop-container="menu"]')
    ).toBeTruthy();

    drop.show(false);
    expect(document.body.contains(drop.element)).toBe(true);
    expect(drop.element?.getAttribute('aria-expanded')).toBe('true');
    expect(drop.element?.querySelector('b')?.textContent).toBe('Drop content');
  });

  it('allows className overrides without changing data selectors', () => {
    const button = target();
    drop = createDrop(button, {
      id: 'custom-drop',
      name: 'custom',
      content: 'Custom content',
      className: {
        root: 'qa-drop',
        container: 'qa-drop-container',
      },
    });

    expect(drop.element?.classList.contains('qa-drop')).toBe(true);
    expect(drop.element?.classList.contains('j-drop')).toBe(false);
    expect(
      drop.element?.querySelector('[data-drop-container="custom"]')
    ).toBeTruthy();
  });

  it('supports click mode document closing and callbacks', () => {
    const button = target();
    const onShown = vi.fn();
    const onHidden = vi.fn();
    drop = createDrop(button, {
      content: 'Click content',
      onShown,
      onHidden,
    });

    button.click();
    expect(drop.isVisible).toBe(true);
    expect(onShown).toHaveBeenCalledWith(drop);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(drop.isVisible).toBe(false);
    expect(onHidden).toHaveBeenCalledWith(drop);
  });

  it('supports hover mode and delay', () => {
    const button = target();
    drop = createDrop(button, {
      mode: 'hover',
      hoverIntent: false,
      delay: { show: 20, hide: 30 },
      content: 'Hover content',
    });

    button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(drop.isVisible).toBe(false);
    vi.advanceTimersByTime(20);
    expect(drop.isVisible).toBe(true);

    button.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(drop.isVisible).toBe(true);
    vi.advanceTimersByTime(30);
    expect(drop.isVisible).toBe(false);
  });

  it('uses element content directly as wrapper', () => {
    const button = target();
    const section = document.createElement('section');
    section.dataset.customWrapper = 'true';
    section.textContent = 'Node content';

    drop = createDrop(button, { content: section });

    expect(drop.element?.firstElementChild).toBe(section);
    expect(drop.element?.querySelector('[data-custom-wrapper]')).toBe(section);
  });
});

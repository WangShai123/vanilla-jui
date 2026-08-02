// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { Drop, createDrop } from '../src/components/drop.ts';

let drop: Drop | null = null;

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
    drop = new Drop(button, {
      id: 'default-drop',
      name: 'menu',
      content: '<b>Drop content</b>',
    });

    expect(drop.root?.classList.contains('j-drop')).toBe(true);
    expect(drop.root?.getAttribute('data-drop')).toBe('menu');
    expect(
      drop.root?.querySelector('[data-drop-container="menu"]')
    ).toBeTruthy();

    drop.show(false);
    expect(document.body.contains(drop.root)).toBe(true);
    expect(drop.root?.getAttribute('aria-expanded')).toBe('true');
    expect(drop.root?.querySelector('b')?.textContent).toBe('Drop content');
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

    expect(drop.root?.classList.contains('qa-drop')).toBe(true);
    expect(drop.root?.classList.contains('j-drop')).toBe(false);
    expect(
      drop.root?.querySelector('[data-drop-container="custom"]')
    ).toBeTruthy();
  });

  it('supports click mode document closing and callbacks', () => {
    const button = target();
    const onShown = vi.fn();
    const onHidden = vi.fn();
    drop = new Drop(button, {
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
    drop = new Drop(button, {
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

    drop = new Drop(button, { content: section });

    expect(drop.root?.firstElementChild).toBe(section);
    expect(drop.root?.querySelector('[data-custom-wrapper]')).toBe(section);
  });
});

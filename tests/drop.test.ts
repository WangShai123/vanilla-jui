// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { insert, jsx } from 'vanilla-signal';

import { createDrop, type DropInstance } from '../src/primitives/drop.ts';
import { q } from '../src/utilities/dom.ts';

let drop: ReturnType<typeof createDrop> | null = null;

function target(id = 'target'): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = id;
  button.textContent = 'Target';
  insert(document.body, button);
  return button;
}

function find<TElement extends Element = Element>(
  selector: string,
  context: Element | null | undefined
): TElement | null {
  return context ? q<TElement>(selector, context) : null;
}

async function flushMicrotasks(count = 4): Promise<void> {
  for (let i = 0; i < count; i += 1) await Promise.resolve();
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
      content: jsx('b', {
        children: 'Drop content',
      }),
    });

    expect(drop.element?.classList.contains('j-drop')).toBe(true);
    expect(drop.element?.getAttribute('data-drop')).toBe('menu');
    expect(find('[data-drop-container="menu"]', drop.element)).toBeTruthy();

    drop.show(false);
    expect(document.body.contains(drop.element)).toBe(true);
    expect(drop.element?.getAttribute('aria-expanded')).toBe('true');
    expect(find('b', drop.element)?.textContent).toBe('Drop content');
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
    expect(find('[data-drop-container="custom"]', drop.element)).toBeTruthy();
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

  it('keeps element content inside the stable container', () => {
    const button = target();
    const section = document.createElement('section');
    section.dataset.customWrapper = 'true';
    section.textContent = 'Node content';

    drop = createDrop(button, { content: section });

    expect(
      drop.element?.firstElementChild?.getAttribute('data-drop-container')
    ).toBeTruthy();
    expect(find('[data-custom-wrapper]', drop.element)).toBe(section);
  });

  it('does not set aria-hidden when custom content may contain focusable nodes', () => {
    const button = target();
    drop = createDrop(button, {
      content: jsx('button', {
        type: 'button',
        children: 'Focusable content',
      }),
    });

    expect(drop.element?.hasAttribute('aria-hidden')).toBe(false);
    drop.show(false);
    expect(drop.element?.hasAttribute('aria-hidden')).toBe(false);
    drop.hide(false);
    expect(drop.element?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('renders async content with loading and reuses cached content within ttl', async () => {
    const button = target();
    let resolveContent!: (content: ReturnType<typeof jsx>) => void;
    const loader = vi.fn(
      () =>
        new Promise<ReturnType<typeof jsx>>((resolve) => {
          resolveContent = resolve;
        })
    );
    drop = createDrop(button, {
      content: (_instance: DropInstance) => loader(),
      cache: true,
      ttl: 50,
    });

    drop.show(false);
    await flushMicrotasks();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(find('[aria-busy="true"]', drop.element)).toBeTruthy();

    resolveContent(jsx('strong', { children: 'Async content' }));
    await flushMicrotasks();

    expect(find('[aria-busy="false"]', drop.element)).toBeTruthy();
    expect(find('strong', drop.element)?.textContent).toBe('Async content');

    drop.hide(false);
    drop.show(false);
    await flushMicrotasks();
    expect(loader).toHaveBeenCalledTimes(1);

    drop.hide(false);
    vi.setSystemTime(Date.now() + 51);
    drop.show(false);
    await flushMicrotasks();
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

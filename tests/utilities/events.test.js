import { describe, expect, it, vi } from 'vitest';

import { createEventManager, listen } from '../../src/utilities/events.js';

describe('events utilities', () => {
  it('binds and unbinds EventTarget listeners', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    const dispose = listen(target, 'ping', handler);

    target.dispatchEvent(new Event('ping'));
    expect(handler).toHaveBeenCalledTimes(1);

    dispose();
    dispose();
    target.dispatchEvent(new Event('ping'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('resolves selector, node, array, document and body targets', () => {
    const originalDocument = global.document;
    const button = new EventTarget();
    const text = new EventTarget();
    const body = new EventTarget();
    const documentTarget = Object.assign(new EventTarget(), {
      body,
      querySelector: vi.fn((selector) =>
        selector === '#event-target' ? button : null
      ),
      createTextNode: vi.fn(() => text),
    });
    const handler = vi.fn();

    global.document = documentTarget;

    try {
      const offSelector = listen('#event-target', 'click', handler);
      button.dispatchEvent(new Event('click'));
      offSelector();

      const offText = listen(text, 'custom', handler);
      text.dispatchEvent(new Event('custom'));
      offText();

      const offArray = listen([null, button], 'click', handler);
      button.dispatchEvent(new Event('click'));
      offArray();

      const offDocument = listen(documentTarget, 'custom', handler);
      documentTarget.dispatchEvent(new Event('custom'));
      offDocument();

      const offBody = listen(body, 'click', handler);
      body.dispatchEvent(new Event('click'));
      offBody();
    } finally {
      global.document = originalDocument;
    }

    expect(handler).toHaveBeenCalledTimes(5);
  });

  it('rejects invalid arguments early', () => {
    expect(() => listen(null, 'ping', () => {})).toThrow('EventTarget');
    expect(() => listen(new EventTarget(), '', () => {})).toThrow(
      'non-empty string'
    );
    expect(() => listen(new EventTarget(), 'ping', null)).toThrow(
      'handler expects'
    );
  });

  it('deduplicates by key and clears all listeners', () => {
    const target = new EventTarget();
    const events = createEventManager();
    const first = vi.fn();
    const second = vi.fn();
    const third = vi.fn();

    events.on('same', target, 'ping', first);
    events.on('same', target, 'ping', second);
    events.on('other', target, 'pong', third);

    target.dispatchEvent(new Event('ping'));
    target.dispatchEvent(new Event('pong'));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(third).toHaveBeenCalledTimes(1);
    expect(events.size()).toBe(2);

    events.clear();
    target.dispatchEvent(new Event('ping'));
    target.dispatchEvent(new Event('pong'));

    expect(second).toHaveBeenCalledTimes(1);
    expect(third).toHaveBeenCalledTimes(1);
    expect(events.size()).toBe(0);
  });

  it('allows optional null targets in manager for conditional binding', () => {
    const events = createEventManager();
    const dispose = events.on('optional', null, 'ping', () => {});

    expect(typeof dispose).toBe('function');
    expect(events.size()).toBe(0);
    expect(events.off('optional')).toBe(false);
  });
});

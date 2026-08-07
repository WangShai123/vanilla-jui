// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vite-plus/test';
import { createSignal, jsx } from 'vanilla-signal';

import { createPresence, waitForMotion } from '../src/utilities/presence.ts';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function animation(finished: Promise<void>): Animation {
  return {
    effect: { getComputedTiming: () => ({ endTime: 300 }) },
    finished,
  } as unknown as Animation;
}

describe('createPresence', () => {
  it('commits mounted styles before activating the element', async () => {
    const element = document.createElement('div');
    const order: string[] = [];
    element.getBoundingClientRect = () => {
      order.push(`commit:${element.dataset.active || 'false'}`);
      return {} as DOMRect;
    };

    const presence = createPresence({
      elements: () => [element],
      mount: () => {
        document.body.appendChild(element);
        order.push('mount');
      },
      activate: () => {
        element.dataset.active = 'true';
        order.push('activate');
      },
      deactivate: () => {
        element.dataset.active = 'false';
      },
      unmount: () => element.remove(),
    });

    await presence.enter();

    expect(order).toEqual(['mount', 'commit:false', 'activate']);
    expect(presence.phase).toBe('visible');
  });

  it('retains DOM until every finite root animation settles', async () => {
    const element = document.createElement('div');
    const motion = deferred();
    let animations: Animation[] = [];
    Object.defineProperty(element, 'getAnimations', {
      configurable: true,
      value: () => animations,
    });

    const presence = createPresence({
      elements: () => [element],
      mount: () => document.body.appendChild(element),
      activate: () => element.setAttribute('data-visible', 'true'),
      deactivate: () => element.setAttribute('data-visible', 'false'),
      unmount: () => element.remove(),
    });

    await presence.enter();
    animations = [animation(motion.promise)];
    const leaving = presence.leave();
    await Promise.resolve();

    expect(element.isConnected).toBe(true);
    expect(presence.phase).toBe('leaving');

    motion.resolve();
    await leaving;
    expect(element.isConnected).toBe(false);
    expect(presence.phase).toBe('hidden');
  });

  it('commits reactive deactivation before detecting leave motion', async () => {
    const [visible, setVisible] = createSignal(false);
    const element = jsx('div', {
      'data-visible': () => String(visible()),
    }) as HTMLElement;
    const motion = deferred();
    const observed: (string | null)[] = [];
    Object.defineProperty(element, 'getAnimations', {
      configurable: true,
      value: () => {
        const value = element.getAttribute('data-visible');
        observed.push(value);
        return value === 'false' ? [animation(motion.promise)] : [];
      },
    });

    const presence = createPresence({
      elements: () => [element],
      mount: () => document.body.appendChild(element),
      activate: () => setVisible(true),
      deactivate: () => setVisible(false),
      unmount: () => element.remove(),
    });

    await presence.enter();
    const leaving = presence.leave();
    await Promise.resolve();

    expect(observed.at(-1)).toBe('false');
    expect(element.isConnected).toBe(true);

    motion.resolve();
    await leaving;
    expect(element.isConnected).toBe(false);
  });

  it('does not unmount when enter supersedes a pending leave', async () => {
    const element = document.createElement('div');
    const motion = deferred();
    let animations: Animation[] = [];
    Object.defineProperty(element, 'getAnimations', {
      configurable: true,
      value: () => animations,
    });

    const presence = createPresence({
      elements: () => [element],
      mount: () => document.body.appendChild(element),
      activate: () => element.setAttribute('data-visible', 'true'),
      deactivate: () => element.setAttribute('data-visible', 'false'),
      unmount: () => element.remove(),
    });

    await presence.enter();
    animations = [animation(motion.promise)];
    const leaving = presence.leave();
    await Promise.resolve();

    animations = [];
    await presence.enter();
    expect(await leaving).toBe(false);
    motion.resolve();

    expect(element.isConnected).toBe(true);
    expect(element.getAttribute('data-visible')).toBe('true');
    expect(presence.phase).toBe('visible');
  });

  it('falls back to the computed CSS timeline without hardcoded duration', async () => {
    vi.useFakeTimers();
    const element = document.createElement('div');
    element.style.transitionProperty = 'transform';
    element.style.transitionDuration = '120ms';
    element.style.transitionDelay = '30ms';
    document.body.appendChild(element);

    const waiting = waitForMotion([element]);
    let settled = false;
    void waiting.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(149);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    expect(settled).toBe(true);
    vi.useRealTimers();
  });
});

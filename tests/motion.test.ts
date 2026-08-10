// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vite-plus/test';

import {
  createCollapseTransition,
  createMotionGroup,
  createTransition,
} from '../src/core/motion.ts';

function controlledAnimation(finished?: Promise<void>): {
  animation: Animation;
  resolve: () => void;
  cancel: ReturnType<typeof vi.fn>;
} {
  let resolve!: () => void;
  const promise = finished || new Promise<void>((done) => {
    resolve = done;
  });
  if (finished) resolve = () => {};
  const cancel = vi.fn();
  return {
    animation: {
      effect: { getComputedTiming: () => ({ endTime: 300 }) },
      finished: promise,
      currentTime: null,
      playbackRate: 1,
      pause: vi.fn(),
      play: vi.fn(),
      cancel,
    } as unknown as Animation,
    resolve,
    cancel,
  };
}

function cancellableAnimation(): {
  animation: Animation;
  resolve: () => void;
  cancel: ReturnType<typeof vi.fn>;
} {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const finished = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  const cancel = vi.fn(() => reject(new Error('cancelled')));
  return {
    animation: { finished, cancel } as unknown as Animation,
    resolve,
    cancel,
  };
}

describe('createTransition', () => {
  it('coordinates grouped Motion controllers', async () => {
    const firstEnter = vi.fn(async () => {});
    const secondEnter = vi.fn(async () => {});
    const firstLeave = vi.fn(async () => {});
    const secondLeave = vi.fn(async () => {});
    const firstCancel = vi.fn();
    const secondCancel = vi.fn();
    const group = createMotionGroup(
      { enter: firstEnter, leave: firstLeave, cancel: firstCancel },
      { enter: secondEnter, leave: secondLeave, cancel: secondCancel }
    );

    await group.enter();
    await group.leave();
    group.cancel();

    expect(firstEnter).toHaveBeenCalledOnce();
    expect(secondEnter).toHaveBeenCalledOnce();
    expect(firstLeave).toHaveBeenCalledOnce();
    expect(secondLeave).toHaveBeenCalledOnce();
    expect(firstCancel).toHaveBeenCalledOnce();
    expect(secondCancel).toHaveBeenCalledOnce();
  });

  it('creates direction-specific Web Animations for enter and leave motion', async () => {
    const element = document.createElement('div');
    const enterControl = controlledAnimation();
    const leaveControl = controlledAnimation();
    const animate = vi
      .fn()
      .mockReturnValueOnce(enterControl.animation)
      .mockReturnValueOnce(leaveControl.animation);
    Object.defineProperty(element, 'animate', {
      configurable: true,
      value: animate,
    });
    const transition = createTransition(() => element, {
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      options: { duration: 300, easing: 'ease' },
    });
    const operation = new AbortController();

    const entering = transition.enter(operation.signal);
    expect(animate).toHaveBeenCalledOnce();
    expect(animate).toHaveBeenLastCalledWith(
      [{ opacity: 0 }, { opacity: 1 }],
      expect.objectContaining({ duration: 300, easing: 'ease' })
    );

    operation.abort();
    await entering;
    const leaving = transition.leave();
    expect(enterControl.cancel).toHaveBeenCalledOnce();
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate).toHaveBeenLastCalledWith(
      [{ opacity: 1 }, { opacity: 0 }],
      expect.objectContaining({ duration: 300, easing: 'ease' })
    );

    leaveControl.resolve();
    await leaving;
    transition.cancel();
    expect(leaveControl.cancel).toHaveBeenCalledOnce();
  });

  it('completes immediately when Web Animations are unavailable', async () => {
    const transition = createTransition(() => document.createElement('div'), {
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
    });

    await expect(transition.enter()).resolves.toBeUndefined();
    await expect(transition.leave()).resolves.toBeUndefined();
  });
});

describe('createCollapseTransition', () => {
  it('applies expanded and collapsed boundaries without Web Animations', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollHeight', {
      configurable: true,
      value: 120,
    });
    const collapse = createCollapseTransition(() => element);

    collapse.setExpanded(false);
    expect(element.style.height).toBe('0px');
    expect(element.style.opacity).toBe('0');
    expect(element.style.overflow).toBe('hidden');
    expect(element.style.visibility).toBe('hidden');

    await collapse.enter();
    expect(element.style.height).toBe('');
    expect(element.style.opacity).toBe('');
    expect(element.style.overflow).toBe('');
    expect(element.style.visibility).toBe('');

    await collapse.leave();
    expect(element.style.height).toBe('0px');
    expect(element.style.visibility).toBe('hidden');

    collapse.cancel();
    expect(element.style.height).toBe('');
    expect(element.style.visibility).toBe('');
  });

  it('measures content height and restores auto layout after entering', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollHeight', {
      configurable: true,
      value: 120,
    });
    const controlled = controlledAnimation();
    const animate = vi.fn(() => controlled.animation);
    Object.defineProperty(element, 'animate', {
      configurable: true,
      value: animate,
    });
    const collapse = createCollapseTransition(() => element, {
      options: { duration: 180, easing: 'linear' },
    });

    collapse.setExpanded(false);
    const entering = collapse.enter();

    expect(animate).toHaveBeenCalledWith(
      [
        { height: '0px', opacity: '0' },
        { height: '120px', opacity: '1' },
      ],
      expect.objectContaining({
        duration: 180,
        easing: 'linear',
        fill: 'both',
      })
    );

    controlled.resolve();
    await entering;
    expect(element.style.height).toBe('');
    expect(element.style.overflow).toBe('');
    expect(controlled.cancel).toHaveBeenCalledOnce();
  });

  it('collapses horizontally using the measured content width', async () => {
    const element = document.createElement('div');
    element.style.width = 'auto';
    element.style.height = '40px';
    Object.defineProperty(element, 'scrollWidth', {
      configurable: true,
      value: 240,
    });
    const controlled = controlledAnimation();
    const animate = vi.fn(() => controlled.animation);
    Object.defineProperty(element, 'animate', {
      configurable: true,
      value: animate,
    });
    const collapse = createCollapseTransition(() => element, {
      axis: 'horizontal',
      fade: false,
    });

    collapse.setExpanded(false);
    expect(element.style.width).toBe('0px');
    expect(element.style.height).toBe('40px');

    const entering = collapse.enter();
    expect(animate).toHaveBeenCalledWith(
      [{ width: '0px' }, { width: '240px' }],
      expect.objectContaining({ fill: 'both' })
    );

    controlled.resolve();
    await entering;
    expect(element.style.width).toBe('auto');
    expect(element.style.height).toBe('40px');
  });

  it('restarts from the rendered size when direction changes', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollHeight', {
      configurable: true,
      value: 120,
    });
    const bounds = vi
      .spyOn(element, 'getBoundingClientRect')
      .mockReturnValueOnce({ height: 0 } as DOMRect)
      .mockReturnValueOnce({ height: 120 } as DOMRect)
      .mockReturnValueOnce({ height: 45 } as DOMRect);
    const enteringAnimation = cancellableAnimation();
    const leavingAnimation = cancellableAnimation();
    const animate = vi
      .fn()
      .mockReturnValueOnce(enteringAnimation.animation)
      .mockReturnValueOnce(leavingAnimation.animation);
    Object.defineProperty(element, 'animate', {
      configurable: true,
      value: animate,
    });
    const collapse = createCollapseTransition(() => element);

    collapse.setExpanded(false);
    const entering = collapse.enter();
    const leaving = collapse.leave();

    expect(enteringAnimation.cancel).toHaveBeenCalledOnce();
    expect(animate).toHaveBeenLastCalledWith(
      [
        { height: '45px', opacity: '1' },
        { height: '0px', opacity: '0' },
      ],
      expect.objectContaining({ fill: 'both' })
    );

    leavingAnimation.resolve();
    await Promise.all([entering, leaving]);
    expect(element.style.height).toBe('0px');
    expect(element.style.visibility).toBe('hidden');
    expect(bounds).toHaveBeenCalledTimes(3);
  });
});

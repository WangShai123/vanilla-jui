// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { Toast } from '../src/primitives/toast.ts';

async function flushMotion(): Promise<void> {
  for (let index = 0; index < 6; index += 1) await Promise.resolve();
}

function installControlledAnimations(): {
  controls: Map<
    HTMLElement,
    { animation: Animation; setFinished: (value: Promise<void>) => void }
  >;
  restore: () => void;
} {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'animate'
  );
  const controls = new Map<
    HTMLElement,
    { animation: Animation; setFinished: (value: Promise<void>) => void }
  >();
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: function (this: HTMLElement): Animation {
      let finished = Promise.resolve();
      const animation = {
        effect: { getComputedTiming: () => ({ endTime: 300 }) },
        get finished() {
          return finished;
        },
        currentTime: null,
        playbackRate: 1,
        pause: vi.fn(),
        play: vi.fn(),
        cancel: vi.fn(),
      } as unknown as Animation;
      controls.set(this, {
        animation,
        setFinished(value) {
          finished = value;
        },
      });
      return animation;
    },
  });
  return {
    controls,
    restore() {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, 'animate', descriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'animate');
      }
    },
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  vi.useFakeTimers();
});

afterEach(() => {
  Toast.clearAll();
  Toast.configure();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('Toast', () => {
  it('shows default toast with stable data markers', () => {
    const toast = Toast.success('Saved', 0);
    vi.advanceTimersByTime(11);

    expect(document.querySelector('[data-toast-container]')).toBeTruthy();
    expect(toast.classList.contains('j-toast')).toBe(true);
    expect(toast.classList.contains('is-success')).toBe(true);
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.querySelector('[data-toast-message]')?.textContent).toBe(
      'Saved'
    );
  });

  it('allows className overrides without using class selectors internally', async () => {
    const toast = Toast.success('Saved', 0, {
      className: {
        container: 'qa-toast-container',
        toast: 'qa-toast',
        success: 'qa-success',
        message: 'qa-message',
      },
    });

    vi.advanceTimersByTime(11);

    expect(document.querySelector('[data-toast-container]')).toBeTruthy();
    expect(document.querySelector('.j-toast-container')).toBeNull();
    expect(toast.classList.contains('qa-toast')).toBe(true);
    expect(toast.classList.contains('qa-success')).toBe(true);
    expect(toast.getAttribute('aria-live')).toBe('polite');

    Toast.hide(toast);
    expect(toast.getAttribute('aria-live')).toBe(null);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.body.contains(toast)).toBe(false);
  });

  it('keeps a toast mounted until its leave Motion finishes', async () => {
    const animations = installControlledAnimations();
    try {
      const toast = Toast.success('Animated', 0, {
        className: { toast: 'qa-motion-toast' },
      });
      const control = animations.controls.get(toast);
      if (!control) throw new Error('Expected Toast animation.');
      expect(toast.classList.contains('qa-motion-toast')).toBe(true);
      let finish!: () => void;
      control.setFinished(
        new Promise<void>((resolve) => {
          finish = resolve;
        })
      );

      Toast.hide(toast);
      await Promise.resolve();

      expect(toast.getAttribute('aria-hidden')).toBe('true');
      expect(control.animation.playbackRate).toBe(-1);
      expect(document.body.contains(toast)).toBe(true);

      finish();
      await flushMotion();
      expect(document.body.contains(toast)).toBe(false);
    } finally {
      animations.restore();
    }
  });

  it('keeps lite toast as a singleton through data markers', () => {
    Toast.lite('One', 1000);
    Toast.lite('Two', 1000);

    expect(document.querySelectorAll('[data-toast-lite]')).toHaveLength(1);
    expect(document.querySelector('[data-toast-lite]')?.textContent).toBe(
      'Two'
    );
  });

  it('supports action toast callbacks and clearAll', async () => {
    const onAction = vi.fn<() => Promise<void>>(async () => {});
    const toast = Toast.action('Confirm?', {
      text: { close: 'No', action: 'Yes' },
      onAction,
    });

    vi.advanceTimersByTime(11);
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.querySelector('[data-action="close"]')?.textContent).toBe(
      'No'
    );

    const action = toast.querySelector<HTMLButtonElement>(
      '[data-action="toast-action"]'
    );
    action?.click();
    await Promise.resolve();

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(toast.getAttribute('aria-hidden')).toBe('true');

    Toast.warning('Warning', 1000);
    Toast.lite('Lite', 1000);
    expect(Toast.timers.size).toBeGreaterThan(0);
    Toast.clearAll();
    expect(Toast.timers.size).toBe(0);
    expect(document.querySelector('[data-toast-container]')).toBeNull();
    expect(document.querySelector('[data-toast-lite]')).toBeNull();
  });
});

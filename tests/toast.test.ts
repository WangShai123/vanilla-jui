// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { createSignal } from 'vanilla-signal';

import { Toast } from '../src/primitives/toast.ts';

async function flushAnimation(): Promise<void> {
  for (let index = 0; index < 6; index += 1) await Promise.resolve();
}

function installControlledAnimations(): {
  controls: Map<
    HTMLElement,
    {
      animation: Animation;
      keyframes: Keyframe[] | PropertyIndexedKeyframes;
      options: KeyframeAnimationOptions | number | undefined;
      finish: () => void;
    }
  >;
  restore: () => void;
} {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'animate'
  );
  const controls = new Map<
    HTMLElement,
    {
      animation: Animation;
      keyframes: Keyframe[] | PropertyIndexedKeyframes;
      options: KeyframeAnimationOptions | number | undefined;
      finish: () => void;
    }
  >();
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: function (
      this: HTMLElement,
      keyframes: Keyframe[] | PropertyIndexedKeyframes,
      options?: KeyframeAnimationOptions | number
    ): Animation {
      let finish!: () => void;
      const finished = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const animation = {
        effect: { getComputedTiming: () => ({ endTime: 300 }) },
        finished,
        currentTime: null,
        playbackRate: 1,
        pause: vi.fn(),
        play: vi.fn(),
        cancel: vi.fn(),
      } as unknown as Animation;
      controls.set(this, {
        animation,
        keyframes,
        options,
        finish,
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
    const toast = Toast.success('Saved', { duration: 0 });
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
    const toast = Toast.success('Saved', {
      duration: 0,
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

  it('keeps a toast mounted until its leave animation finishes', async () => {
    const animations = installControlledAnimations();
    try {
      const toast = Toast.success('Animated', {
        duration: 0,
        className: { toast: 'qa-motion-toast' },
      });
      const enterControl = animations.controls.get(toast);
      if (!enterControl) throw new Error('Expected Toast animation.');
      expect(toast.classList.contains('qa-motion-toast')).toBe(true);

      Toast.hide(toast);
      await Promise.resolve();
      const leaveControl = animations.controls.get(toast);
      if (!leaveControl) throw new Error('Expected Toast leave animation.');

      expect(toast.hasAttribute('aria-hidden')).toBe(false);
      expect(toast.getAttribute('data-mount')).toBe('false');
      expect(leaveControl.animation.playbackRate).toBe(1);
      expect(leaveControl.keyframes).toEqual([
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        { opacity: 0, transform: 'translate3d(0, -16px, 0)' },
      ]);
      expect(document.body.contains(toast)).toBe(true);

      leaveControl.finish();
      await flushAnimation();
      expect(document.body.contains(toast)).toBe(false);
    } finally {
      animations.restore();
    }
  });

  it('keeps lite toast as a singleton through data markers', () => {
    Toast.lite('One', 1000);
    Toast.lite('Two', 1000, { lite: 'qa-lite' });

    expect(document.querySelectorAll('[data-toast-lite]')).toHaveLength(1);
    expect(document.querySelector('[data-toast-lite]')?.className).toBe(
      'qa-lite'
    );
    expect(document.querySelector('[data-toast-lite]')?.textContent).toBe(
      'Two'
    );
  });

  it('keeps show calls separate by default and locks when once is true', async () => {
    const first = Toast.info('First', { duration: 0 });
    const second = Toast.info('Second', { duration: 0 });

    expect(second).not.toBe(first);
    expect(document.querySelectorAll('[data-toast]')).toHaveLength(2);

    Toast.clearAll();

    const onceFirst = Toast.info('Once', { duration: 0, once: true });
    const onceSecond = Toast.info('Ignored', { duration: 0, once: true });

    expect(onceSecond).toBe(onceFirst);
    expect(document.querySelectorAll('[data-toast]')).toHaveLength(1);

    Toast.hide(onceFirst);
    await flushAnimation();

    const onceThird = Toast.info('Again', { duration: 0, once: true });
    expect(onceThird).not.toBe(onceFirst);
    expect(document.querySelectorAll('[data-toast]')).toHaveLength(1);
  });

  it('supports confirm toast callbacks and clearAll', async () => {
    const onConfirm = vi.fn<() => Promise<void>>(async () => {});
    const toast = Toast.confirm('Confirm?', {
      theme: 'warning',
      text: { close: 'No', confirm: 'Yes' },
      onConfirm,
    });

    vi.advanceTimersByTime(11);
    const duplicate = Toast.confirm('Ignored duplicate?', { theme: 'error' });
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.classList.contains('is-warning')).toBe(true);
    expect(toast.classList.contains('is-confirm')).toBe(true);
    expect(duplicate).toBe(toast);
    expect(document.querySelectorAll('[data-toast-confirm]')).toHaveLength(1);
    expect(
      toast.querySelector('[data-toast-button="close"]')?.textContent
    ).toBe('No');
    expect(toast.querySelector('[data-toast-buttons]')).toBeTruthy();

    const confirm = toast.querySelector<HTMLButtonElement>(
      '[data-toast-button="confirm"]'
    );
    confirm?.click();
    await Promise.resolve();
    await flushAnimation();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(toast.hasAttribute('aria-hidden')).toBe(false);
    expect(document.body.contains(toast)).toBe(false);

    const fresh = Toast.confirm('Confirm again?', {
      theme: 'primary',
      onConfirm: vi.fn(),
    });
    expect(fresh).not.toBe(toast);
    expect(document.querySelectorAll('[data-toast-confirm]')).toHaveLength(1);

    Toast.warning('Warning', { duration: 1000 });
    Toast.lite('Lite', 1000);
    expect(Toast.timers.size).toBeGreaterThan(0);
    Toast.clearAll();
    expect(Toast.timers.size).toBe(0);
    expect(document.querySelector('[data-toast-container]')).toBeNull();
    expect(document.querySelector('[data-toast-lite]')).toBeNull();
  });

  it('shows loading content and waits to auto close until loading is false', async () => {
    const [loading, setLoading] = createSignal(true);
    const toast = Toast.info('Saved', {
      duration: 1000,
      loading,
      text: { loading: 'Submitting...' },
    });

    expect(toast.querySelector('[data-toast-message]')?.textContent).toBe(
      'Submitting...'
    );
    expect(toast.querySelector('[data-toast-icon] svg')).toBeTruthy();
    expect(Toast.timers.size).toBe(0);

    vi.advanceTimersByTime(3000);
    expect(toast.getAttribute('data-mount')).not.toBe('false');

    setLoading(false);
    await Promise.resolve();
    expect(toast.querySelector('[data-toast-message]')?.textContent).toBe(
      'Saved'
    );
    expect(Toast.timers.size).toBe(1);

    vi.advanceTimersByTime(999);
    expect(toast.getAttribute('data-mount')).not.toBe('false');

    vi.advanceTimersByTime(1);
    expect(toast.getAttribute('data-mount')).toBe('false');
  });

  it('closes before onCancel when a loading toast is clicked', async () => {
    const [loading, setLoading] = createSignal(true);
    let mountDuringCancel: string | null | undefined;
    let messageDuringCancel: string | null | undefined;
    const onCancel = vi.fn<() => Promise<void>>(async () => {
      setLoading(false);
      await Promise.resolve();
      mountDuringCancel = toast.getAttribute('data-mount');
      messageDuringCancel = toast.querySelector(
        '[data-toast-message]'
      )?.textContent;
    });
    const onClose = vi.fn<() => Promise<void>>(async () => {});
    const toast = Toast.info('Queued', {
      duration: 1000,
      loading,
      text: { loading: 'Cancelling...' },
      onCancel,
      onClose,
    });

    toast.click();
    await flushAnimation();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(toast.getAttribute('data-mount')).toBe('false');
    expect(mountDuringCancel).toBe('false');
    expect(messageDuringCancel).toBe('Cancelling...');
    expect(Toast.timers.size).toBe(0);
  });

  it('does not call onCancel when a non-loading toast is clicked', async () => {
    const onCancel = vi.fn<() => Promise<void>>(async () => {});
    const onClose = vi.fn<() => Promise<void>>(async () => {});
    const toast = Toast.info('Done', {
      duration: 1000,
      onCancel,
      onClose,
    });

    toast.click();
    await flushAnimation();

    expect(onCancel).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(toast.getAttribute('data-mount')).toBe('false');
  });
});

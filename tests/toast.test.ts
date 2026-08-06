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

  it('allows className overrides without using class selectors internally', () => {
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
    vi.advanceTimersByTime(300);
    expect(document.body.contains(toast)).toBe(false);
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

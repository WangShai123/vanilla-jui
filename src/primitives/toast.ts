import {
  type MaybeAccessor,
  access,
  createEffect,
  createRoot,
  insert,
  jsx,
} from 'vanilla-signal';
import { t } from 'vanilla-signal-i18n';

import locales from '../locales/index.ts';
import { icon } from '../primitives/icons.ts';
import { createLoading } from '../primitives/loading.ts';
import { joinClasses } from '../utilities/class-name.ts';
import { q } from '../utilities/dom.ts';
import { listen } from '../utilities/events.ts';
import { randomId } from '../utilities/id.ts';
import { timer } from '../utilities/timer.ts';
import { validateParam } from '../utilities/types.ts';

const s = (k: string) => t(k, locales);

export type ToastTheme = 'info' | 'success' | 'warning' | 'error' | 'primary';

export interface ToastClassNames {
  container: string;
  toast: string;
  icon: string;
  message: string;
  lite: string;
  confirm: string;
  buttons: string;
  button: string;
  closeBtn: string;
  confirmBtn: string;
  info: string;
  success: string;
  warning: string;
  error: string;
  primary: string;
}

export type ToastClassNameConfig = Partial<ToastClassNames>;

export interface ToastClassNameOptions {
  className?: ToastClassNameConfig;
}

export interface ToastThemeOptions extends ToastClassNameOptions {
  theme?: ToastTheme;
}

export interface ToastOptions extends ToastThemeOptions {
  duration?: number;
  loading?: MaybeAccessor<boolean>;
  text?: {
    loading?: string;
  };
  onClose?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}

export interface ToastConfirmProps extends ToastThemeOptions {
  text?: {
    close?: string;
    confirm?: string;
  };
  onConfirm?: () => void | Promise<void>;
  onClose?: () => void | Promise<void>;
}

const DEFAULT_CLASS_NAMES: ToastClassNames = {
  container: 'j-toast-container',
  toast: 'j-toast',
  icon: 'el-icon',
  message: 'el-text',
  lite: 'j-toast-lite',
  confirm: 'j-toast is-confirm',
  buttons: 'toast-buttons',
  button: 'j-button is-sm',
  closeBtn: 'is-ghost',
  confirmBtn: 'is-outline',
  info: 'is-info',
  primary: 'is-primary',
  success: 'is-success',
  warning: 'is-warning',
  error: 'is-error',
};

const TOAST_THEME_RULE = {
  type: 'string',
  enum: ['info', 'success', 'warning', 'error', 'primary'],
};
const TOAST_DURATION_RULE = { type: 'number', min: 0 };
const LITE_DURATION_RULE = { type: 'number', greaterThan: 0 };

const timers = new Set<string>();
const disposers = new Map<HTMLElement, () => void>();
const animations = new Map<HTMLElement, Animation>();
const operations = new Map<HTMLElement, number>();
let classNames = DEFAULT_CLASS_NAMES;

function mergeClassNames(value?: ToastClassNameConfig): ToastClassNames {
  return { ...DEFAULT_CLASS_NAMES, ...value };
}

function resolveClassNames(options?: ToastClassNameOptions): ToastClassNames {
  return mergeClassNames({ ...classNames, ...options?.className });
}

function addToastDisposer(element: HTMLElement, dispose: () => void): void {
  const current = disposers.get(element);
  disposers.set(element, () => {
    current?.();
    dispose();
  });
}

function isToastLoading(options: ToastOptions): boolean {
  return !!access(options.loading ?? false);
}

function toastIconName(theme: ToastTheme): ToastTheme {
  return theme === 'primary' ? 'info' : theme;
}

function toastIconStyle(options: ToastOptions): Record<string, string> {
  return isToastLoading(options)
    ? {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'var(--toast-icon-size, 1em)',
        height: 'var(--toast-icon-size, 1em)',
        flex: '0 0 auto',
      }
    : {};
}

function toastIconContent(
  theme: ToastTheme,
  options: ToastOptions
): HTMLElement | SVGElement {
  if (isToastLoading(options)) return createLoading();
  return icon(toastIconName(theme));
}

function toastMessage(message: string, options: ToastOptions): string {
  return isToastLoading(options)
    ? options.text?.loading || s('Loading...')
    : message;
}

async function closeByUser(
  toast: HTMLElement,
  options: ToastOptions
): Promise<void> {
  const shouldCancel = isToastLoading(options);
  hide(toast);
  if (shouldCancel) await options.onCancel?.();
  await options.onClose?.();
}

function bindToastStatus(
  element: HTMLElement,
  iconElement: HTMLElement,
  messageElement: HTMLElement,
  message: string,
  theme: ToastTheme,
  options: ToastOptions,
  duration = 0
): void {
  const id = element.dataset.toast || randomId();
  const dispose = createRoot((dispose) => {
    insert(iconElement, () => toastIconContent(theme, options));
    insert(messageElement, () => toastMessage(message, options));
    createEffect(() => {
      cancelToastTimers(id);
      if (duration > 0 && !isToastLoading(options)) {
        setToastTimer(id, 'hide', () => hide(element), duration);
      }
    });
    return dispose;
  });
  addToastDisposer(element, dispose);
}

function getOrCreateContainer(names: ToastClassNames): HTMLElement {
  let container = q<HTMLElement>('[data-toast-container]');
  if (!container) {
    container = jsx('div', {
      className: names.container,
      'data-toast-container': '',
    }) as HTMLElement;
    insert(document.body, container);
  } else {
    container.className = names.container;
  }
  return container;
}

function setToastTimer(
  id: string,
  action: string,
  callback: () => void,
  delay: number
): string {
  const key = `${id}-${action}`;
  timers.add(key);
  timer.start(key, delay, () => {
    timers.delete(key);
    callback();
  });
  return key;
}

function cancelToastTimers(id: string): void {
  for (const key of Array.from(timers)) {
    if (!key.startsWith(`${id}-`)) continue;
    timer.cancel(key);
    timers.delete(key);
  }
}

function removeToastElement(element: HTMLElement): void {
  animations.get(element)?.cancel();
  animations.delete(element);
  operations.delete(element);
  element.remove();
  disposers.get(element)?.();
  disposers.delete(element);
  const container = q<HTMLElement>('[data-toast-container]');
  if (container && container.children.length === 0) container.remove();
}

function toastAnimationOptions(
  element: HTMLElement,
  duration: number,
  easing: string
): KeyframeAnimationOptions {
  const reducedMotion =
    element.ownerDocument.defaultView?.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches || false;
  return {
    duration: reducedMotion ? 0 : duration,
    easing,
    fill: 'both',
  };
}

function waitForAnimation(animation: Animation): Promise<void> {
  const finished = animation.finished.then(
    () => undefined,
    () => undefined
  );
  return finished;
}

function toastKeyframes(
  element: HTMLElement,
  phase: 'enter' | 'leave'
): Keyframe[] {
  const lite = element.hasAttribute('data-toast-lite');
  if (lite && phase === 'enter') {
    return [{ opacity: 0 }, { opacity: 1 }];
  }
  if (lite) {
    return [
      { opacity: 1, transform: 'translate(-50%, -50%)' },
      {
        opacity: 0,
        transform: 'translate(-50%, calc(-50% - 8px))',
      },
    ];
  }
  return phase === 'enter'
    ? [
        { opacity: 0, transform: 'translate3d(0, -16px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ]
    : [
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        { opacity: 0, transform: 'translate3d(0, -16px, 0)' },
      ];
}

async function playToastAnimation(
  element: HTMLElement,
  phase: 'enter' | 'leave'
): Promise<void> {
  const operation = (operations.get(element) || 0) + 1;
  operations.set(element, operation);
  animations.get(element)?.cancel();
  animations.delete(element);
  if (typeof element.animate !== 'function') return;
  const lite = element.hasAttribute('data-toast-lite');
  const animation = element.animate(
    toastKeyframes(element, phase),
    toastAnimationOptions(
      element,
      phase === 'enter' ? (lite ? 150 : 240) : lite ? 120 : 180,
      phase === 'enter'
        ? 'cubic-bezier(0.16, 1, 0.3, 1)'
        : 'cubic-bezier(0.4, 0, 1, 1)'
    )
  );
  animations.set(element, animation);
  await waitForAnimation(animation);
  if (operations.get(element) !== operation) return;
  if (animations.get(element) === animation) animations.delete(element);
}

function mountToast(
  element: HTMLElement,
  mount: () => void,
  live: 'assertive' | 'polite',
  onEntered?: () => void
): void {
  element.removeAttribute('data-mount');
  element.setAttribute('aria-live', live);
  mount();
  element.getBoundingClientRect();
  void playToastAnimation(element, 'enter').then(() => {
    if (!element.isConnected || element.dataset.mount === 'false') return;
    onEntered?.();
  });
}

function hide(toast: HTMLElement | null | undefined): void {
  if (!toast) return;
  if (toast.getAttribute('data-mount') === 'false') return;
  disposers.get(toast)?.();
  disposers.delete(toast);
  const id = toast.dataset.toast || randomId();
  cancelToastTimers(id);
  toast.removeAttribute('aria-live');
  toast.setAttribute('data-mount', 'false');
  void playToastAnimation(toast, 'leave').then(() => {
    if (toast.dataset.mount === 'false') removeToastElement(toast);
  });
}

function show(message = '', options: ToastOptions = {}): HTMLElement {
  validateParam('message', message, 'string', 'Toast.show');
  const duration = options.duration ?? 3000;
  const theme = options.theme || 'info';
  validateParam('duration', duration, TOAST_DURATION_RULE, 'Toast.show');
  validateParam('theme', theme, TOAST_THEME_RULE, 'Toast.show');

  const names = resolveClassNames(options);
  const id = randomId();
  const iconElement = jsx('span', {
    className: names.icon,
    'data-toast-icon': id,
    style: () => toastIconStyle(options),
  }) as HTMLElement;
  const messageElement = jsx('span', {
    className: names.message,
    'data-toast-message': id,
  }) as HTMLElement;
  const toast = jsx('div', {
    className: joinClasses(names.toast, names[theme]),
    'data-toast': id,
    role: 'alert',
    'aria-atomic': 'true',
    children: [iconElement, messageElement],
  }) as HTMLElement;
  bindToastStatus(
    toast,
    iconElement,
    messageElement,
    message,
    theme,
    options,
    duration
  );
  mountToast(
    toast,
    () => insert(getOrCreateContainer(names), toast),
    theme === 'error' ? 'assertive' : 'polite'
  );
  addToastDisposer(
    toast,
    listen(toast, 'click', () => void closeByUser(toast, options))
  );
  return toast;
}

function lite(
  message = '',
  duration = 2000,
  className?: ToastClassNameConfig
): HTMLElement {
  validateParam('message', message, 'string', 'Toast.lite');
  validateParam('duration', duration, LITE_DURATION_RULE, 'Toast.lite');

  const names = mergeClassNames({ ...classNames, ...className });
  const previous = q<HTMLElement>('[data-toast-lite]');
  if (previous) {
    cancelToastTimers(previous.dataset.toast || '');
    animations.get(previous)?.cancel();
    removeToastElement(previous);
  }
  const id = randomId();
  const element = jsx('div', {
    className: names.lite,
    'data-toast': id,
    'data-toast-lite': '',
    children: message,
  }) as HTMLElement;
  mountToast(element, () => insert(document.body, element), 'polite');
  setToastTimer(id, 'hide', () => hide(element), duration);
  return element;
}

function confirm(message = '', props: ToastConfirmProps = {}): HTMLElement {
  validateParam('message', message, 'string', 'Toast.confirm');
  const closeText = props.text?.close || s('Close');
  const confirmText = props.text?.confirm || s('Confirm');
  const theme = props.theme || 'info';
  validateParam('theme', theme, TOAST_THEME_RULE, 'Toast.confirm');
  const names = resolveClassNames(props);
  const id = randomId();
  const element = jsx('div', {
    className: joinClasses(names.confirm, names[theme]),
    'data-toast': id,
    'data-toast-confirm': '',
    children: [
      jsx('div', {
        className: names.message,
        'data-toast-message': id,
        children: message,
      }),
      jsx('div', {
        className: names.buttons,
        'data-toast-buttons': id,
        children: [
          jsx('button', {
            className: joinClasses(names.button, names.closeBtn),
            children: closeText,
            'data-toast-button': 'close',
            'aria-label': closeText,
            onClick: async () => {
              await props.onClose?.();
              hide(element);
            },
          }),
          jsx('button', {
            className: joinClasses(names.button, names.confirmBtn),
            children: confirmText,
            'data-toast-button': 'confirm',
            'aria-label': confirmText,
            onClick: async () => {
              await props.onConfirm?.();
              hide(element);
            },
          }),
        ],
      }),
    ],
  }) as HTMLElement;
  mountToast(
    element,
    () => insert(getOrCreateContainer(names), element),
    'polite',
    () => {
      q<HTMLButtonElement>('[data-toast-button="confirm"]', element)?.focus();
    }
  );
  return element;
}

function clearAll(): void {
  for (const key of timers) timer.cancel(key);
  timers.clear();
  for (const dispose of disposers.values()) dispose();
  disposers.clear();
  for (const animation of animations.values()) animation.cancel();
  animations.clear();
  operations.clear();
  q<HTMLElement>('[data-toast-container]')?.remove();
  q<HTMLElement>('[data-toast-lite]')?.remove();
}

export const Toast = {
  timers,
  disposers,
  configure(options: ToastClassNameOptions = {}): ToastClassNameOptions {
    classNames = mergeClassNames(options.className);
    return { className: classNames };
  },
  show,
  success: (message = '', options: ToastOptions = {}) =>
    show(message, { ...options, theme: 'success' }),
  info: (message = '', options: ToastOptions = {}) =>
    show(message, { ...options, theme: 'info' }),
  primary: (message = '', options: ToastOptions = {}) =>
    show(message, { ...options, theme: 'primary' }),
  warning: (message = '', options: ToastOptions = {}) =>
    show(message, { ...options, theme: 'warning' }),
  error: (message = '', options: ToastOptions = {}) =>
    show(message, { ...options, theme: 'error' }),
  hide,
  lite,
  confirm,
  clearAll,
  destroyAll: clearAll,
};

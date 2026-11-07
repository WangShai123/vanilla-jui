import {
  type MaybeAccessor,
  access,
  createEffect,
  createRoot,
  createSignal,
  insert,
  jsx,
} from 'vanilla-signal';
import { translate } from '../utilities/locale.ts';
import { icon } from '../primitives/icons.ts';
import { createLoading } from '../primitives/loading.ts';
import { joinClasses, q } from '../utilities/dom.ts';
import { listen } from '../utilities/events.ts';
import { randomId } from '../utilities/id.ts';
import { mergeShallowConfig } from '../utilities/merge.ts';
import { timer } from '../utilities/timer.ts';
import { validateParam } from '../utilities/types.ts';

export type ToastTheme = '' | 'info' | 'success' | 'warning' | 'error';

export interface ToastClassNames {
  container: string;
  toast: string;
  icon: string;
  message: string;
  description: string;
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
}

export type ToastClassNameConfig = Partial<ToastClassNames>;

export interface ToastClassNameOptions {
  className?: ToastClassNameConfig;
}

export interface ToastThemeOptions extends ToastClassNameOptions {
  theme?: ToastTheme;
}

export interface ToastOptions extends ToastThemeOptions {
  description?: string;
  duration?: number;
  once?: boolean;
  onClose?: () => void | Promise<void>;
}

export interface LoadingToastOptions extends ToastOptions {
  loading?: MaybeAccessor<boolean>;
  text?: {
    loading?: string;
  };
  onCancel?: () => void | Promise<void>;
}

export interface ConfirmToastOptions extends ToastOptions {
  text?: {
    close?: string;
    confirm?: string;
  };
  onConfirm?: () => void | Promise<void>;
}

export type ToastConfirmProps = ConfirmToastOptions;

export interface PromiseToastOptions extends ToastClassNameOptions {
  duration?: number;
  text?: { loading?: string; success?: string; error?: string };
  onCancel?: () => void | Promise<void>;
  onClose?: () => void | Promise<void>;
  onSuccess?: () => void | Promise<void>;
  onError?: () => void | Promise<void>;
}

interface ToastStatus {
  message: string;
  theme: ToastTheme;
  loading: boolean;
}

const DEFAULT_CLASS_NAMES: ToastClassNames = {
  container: 'j-toast-container',
  toast: 'j-toast',
  icon: 'el-icon',
  message: 'toast-title',
  description: 'toast-description',
  lite: 'j-toast-lite',
  confirm: 'j-toast is-confirm',
  buttons: 'toast-btns',
  button: 'j-btn is-sm',
  closeBtn: 'is-ghost',
  confirmBtn: 'is-reverse',
  info: 'is-info',
  success: 'is-success',
  warning: 'is-warning',
  error: 'is-error',
};

const TOAST_THEME_RULE = {
  type: 'string',
  enum: ['', 'info', 'success', 'warning', 'error'],
};
const TOAST_DURATION_RULE = { type: 'number', min: 0 };
const LITE_DURATION_RULE = { type: 'number', greaterThan: 0 };

const timers = new Set<string>();
const disposers = new Map<HTMLElement, () => void>();
const animations = new Map<HTMLElement, Animation>();
const operations = new Map<HTMLElement, number>();
type ToastKind = 'show' | 'confirm' | 'loading';
const singletonToasts = new Map<ToastKind, HTMLElement>();
let classNames = DEFAULT_CLASS_NAMES;

function addToastDisposer(element: HTMLElement, dispose: () => void): void {
  const current = disposers.get(element);
  disposers.set(element, () => {
    current?.();
    dispose();
  });
}

function getSingletonToast(kind: ToastKind): HTMLElement | null {
  const toast = singletonToasts.get(kind);
  if (!toast) return null;
  if (!toast.isConnected || toast.getAttribute('data-mount') === 'false') {
    singletonToasts.delete(kind);
    return null;
  }
  return toast;
}

function setSingletonToast(
  kind: ToastKind,
  toast: HTMLElement,
  once: boolean
): void {
  if (once) singletonToasts.set(kind, toast);
}

function clearSingletonToast(toast: HTMLElement): void {
  for (const [kind, current] of singletonToasts) {
    if (current === toast) singletonToasts.delete(kind);
  }
}

function toastIconStyle(loading: boolean): Record<string, string> {
  return loading
    ? {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1.25rem',
        height: '1.25rem',
        flex: '0 0 auto',
      }
    : {};
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
  clearSingletonToast(element);
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

function createToast(
  message: string,
  options: ToastOptions,
  status: () => ToastStatus,
  kind: ToastKind = 'show',
  onCancel?: () => void | Promise<void>
): HTMLElement {
  const once = options.once ?? false;
  if (once) {
    const toast = getSingletonToast(kind);
    if (toast) return toast;
  }
  validateParam('message', message, 'string', 'Toast.show');
  const duration = options.duration ?? 3000;
  const theme = options.theme ?? '';
  validateParam('once', once, 'boolean', 'Toast.show');
  validateParam('duration', duration, TOAST_DURATION_RULE, 'Toast.show');
  validateParam('theme', theme, TOAST_THEME_RULE, 'Toast.show');

  const names = mergeShallowConfig(
    classNames,
    options.className ?? {}
  ) as ToastClassNames;
  return createRoot((dispose) => {
    const id = randomId();
    const iconElement = jsx('span', {
      className: names.icon,
      'data-toast-icon': id,
      style: () => toastIconStyle(status().loading),
      children: () =>
        status().loading
          ? createLoading()
          : status().theme
            ? icon(status().theme)
            : null,
    }) as HTMLElement;
    const messageElement = jsx('span', {
      className: names.message,
      'data-toast-message': id,
      children: () => status().message,
    }) as HTMLElement;
    const description = options.description ?? '';
    const descriptionElement = description
      ? jsx('span', {
          className: names.description,
          'data-toast-description': id,
          children: description,
        })
      : null;
    const toast = jsx('div', {
      className: () =>
        joinClasses(
          names.toast,
          status().theme ? names[status().theme as Exclude<ToastTheme, ''>] : ''
        ),
      'data-toast': id,
      role: 'alert',
      'aria-atomic': 'true',
      'aria-live': () => (status().theme === 'error' ? 'assertive' : 'polite'),
      children: [messageElement, descriptionElement],
    }) as HTMLElement;
    insert(
      toast,
      () => (status().theme || status().loading ? iconElement : null),
      messageElement
    );
    createEffect(() => {
      cancelToastTimers(id);
      if (duration > 0 && !status().loading)
        setToastTimer(id, 'hide', () => hide(toast), duration);
    });
    addToastDisposer(toast, dispose);
    mountToast(
      toast,
      () => insert(getOrCreateContainer(names), toast),
      status().theme === 'error' ? 'assertive' : 'polite'
    );
    setSingletonToast(kind, toast, once);
    addToastDisposer(
      toast,
      listen(toast, 'click', () => {
        const pending = status().loading;
        hide(toast);
        void (async () => {
          if (pending) await onCancel?.();
          await options.onClose?.();
        })();
      })
    );
    return toast;
  });
}

function show(message = '', options: ToastOptions = {}): HTMLElement {
  return createToast(message, options, () => ({
    message,
    theme: options.theme ?? '',
    loading: false,
  }));
}

const LOADING_MESSAGE = translate('Loading') + '...';

function loading(message = '', options: LoadingToastOptions = {}): HTMLElement {
  return createToast(
    message,
    options,
    () => {
      const pending = !!access(options.loading ?? false);
      return {
        message: pending ? (options.text?.loading ?? LOADING_MESSAGE) : message,
        theme: pending ? '' : 'success',
        loading: pending,
      };
    },
    'loading',
    options.onCancel
  );
}

function promise<T>(
  task: Promise<T>,
  options: PromiseToastOptions = {}
): HTMLElement {
  const [status, setStatus] = createSignal<ToastStatus>({
    message: options.text?.loading ?? LOADING_MESSAGE,
    theme: '',
    loading: true,
  });
  const toast = createToast('', options, status, 'show', options.onCancel);
  let disposed = false;
  addToastDisposer(toast, () => {
    disposed = true;
  });
  // Observe both outcomes even after dismissal so a late rejection is consumed.
  void task
    .then(
      async () => {
        if (disposed) return;
        setStatus({
          message: options.text?.success ?? translate('Success'),
          theme: 'success',
          loading: false,
        });
        await options.onSuccess?.();
      },
      async () => {
        if (disposed) return;
        setStatus({
          message: options.text?.error ?? translate('Error'),
          theme: 'error',
          loading: false,
        });
        await options.onError?.();
      }
    )
    .catch(console.error);
  return toast;
}

function lite(
  message = '',
  duration = 2000,
  className?: ToastClassNameConfig
): HTMLElement {
  validateParam('message', message, 'string', 'Toast.lite');
  validateParam('duration', duration, LITE_DURATION_RULE, 'Toast.lite');

  const names = mergeShallowConfig(
    classNames,
    className ?? {}
  ) as ToastClassNames;
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

function confirm(message = '', props: ConfirmToastOptions = {}): HTMLElement {
  const once = props.once ?? true;
  if (once) {
    const toast = getSingletonToast('confirm');
    if (toast) return toast;
  }
  validateParam('message', message, 'string', 'Toast.confirm');
  const closeText = props.text?.close || translate('Close');
  const confirmText = props.text?.confirm || translate('Confirm');
  validateParam('once', once, 'boolean', 'Toast.confirm');
  const duration = props.duration ?? 3000;
  const theme = props.theme ?? '';
  validateParam('duration', duration, TOAST_DURATION_RULE, 'Toast.confirm');
  validateParam('theme', theme, TOAST_THEME_RULE, 'Toast.confirm');
  const description = props.description ?? '';
  const names = mergeShallowConfig(
    classNames,
    props.className ?? {}
  ) as ToastClassNames;
  const id = randomId();
  const element = jsx('div', {
    className: joinClasses(names.confirm, theme ? names[theme] : ''),
    'data-toast': id,
    'data-toast-confirm': '',
    children: [
      jsx('div', {
        className: names.message,
        'data-toast-message': id,
        children: message,
      }),
      description
        ? jsx('div', {
            className: names.description,
            children: description,
          })
        : null,
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
  setSingletonToast('confirm', element, once);
  if (duration > 0) setToastTimer(id, 'hide', () => hide(element), duration);
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
  singletonToasts.clear();
  q<HTMLElement>('[data-toast-container]')?.remove();
  q<HTMLElement>('[data-toast-lite]')?.remove();
}

export const Toast = {
  timers,
  disposers,
  configure(options: ToastClassNameOptions = {}): ToastClassNameOptions {
    classNames = mergeShallowConfig(
      DEFAULT_CLASS_NAMES,
      options.className ?? {}
    ) as ToastClassNames;
    return { className: classNames };
  },
  show,
  loading,
  promise,
  info: (message = '', options: ToastOptions = {}) =>
    show(message, { ...options, theme: 'info' }),
  success: (message = '', options: ToastOptions = {}) =>
    show(message, { ...options, theme: 'success' }),
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

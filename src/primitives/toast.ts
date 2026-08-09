import { jsx } from 'vanilla-signal';
import { t } from 'vanilla-signal-i18n';

import locales from '../locales/index.ts';
import { icon } from '../primitives/icons.ts';
import { joinClasses } from '../utilities/class-name.ts';
import { q } from '../utilities/dom.ts';
import { listen } from '../utilities/events.ts';
import { randomId } from '../utilities/id.ts';
import { createTransition } from '../core/motion.ts';
import { createPresence, type PresenceController } from '../core/presence.ts';
import { timer } from '../utilities/timer.ts';
import { validateParam } from '../utilities/types.ts';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'primary';

export interface ToastClassNames {
  container: string;
  toast: string;
  icon: string;
  message: string;
  lite: string;
  action: string;
  actions: string;
  button: string;
  closeBtn: string;
  actionBtn: string;
  info: string;
  success: string;
  warning: string;
  error: string;
  primary: string;
}

export type ToastClassNameConfig = Partial<ToastClassNames>;

export interface ToastOptions {
  className?: ToastClassNameConfig;
}

export interface ToastActionProps extends ToastOptions {
  type?: ToastType;
  text?: {
    close?: string;
    action?: string;
  };
  onAction?: () => void | Promise<void>;
  onClose?: () => void | Promise<void>;
}

const DEFAULT_CLASS_NAMES: ToastClassNames = {
  container: 'j-toast-container',
  toast: 'j-toast',
  icon: 'el-icon',
  message: 'el-text',
  lite: 'j-toast-lite',
  action: 'j-toast is-action',
  actions: 'toast-actions',
  button: 'j-button is-sm',
  closeBtn: 'is-ghost',
  actionBtn: 'is-outline',
  info: 'is-info',
  primary: 'is-primary',
  success: 'is-success',
  warning: 'is-warning',
  error: 'is-error',
};

const TOAST_TYPE_RULE = {
  type: 'string',
  enum: ['info', 'success', 'warning', 'error', 'primary'],
};
const TOAST_DURATION_RULE = { type: 'number', min: 0 };
const LITE_DURATION_RULE = { type: 'number', greaterThan: 0 };

const timers = new Set<string>();
const disposers = new Map<HTMLElement, () => void>();
const presences = new Map<HTMLElement, PresenceController>();
let classNames = DEFAULT_CLASS_NAMES;

function mergeClassNames(value?: ToastClassNameConfig): ToastClassNames {
  return { ...DEFAULT_CLASS_NAMES, ...value };
}

function resolveClassNames(options?: ToastOptions): ToastClassNames {
  return mergeClassNames({ ...classNames, ...options?.className });
}

function getOrCreateContainer(names: ToastClassNames): HTMLElement {
  let container = q<HTMLElement>('[data-toast-container]');
  if (!container) {
    container = jsx('div', {
      className: names.container,
      'data-toast-container': '',
    }) as HTMLElement;
    document.body.appendChild(container);
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
  element.remove();
  presences.delete(element);
  disposers.get(element)?.();
  disposers.delete(element);
  const container = q<HTMLElement>('[data-toast-container]');
  if (container && container.children.length === 0) container.remove();
}

function mountToast(
  element: HTMLElement,
  mount: () => void,
  live: 'assertive' | 'polite',
  onEntered?: () => void
): void {
  const lite = element.hasAttribute('data-toast-lite');
  const motion = createTransition(() => element, {
    keyframes: lite
      ? [
          {
            opacity: 0,
            transform: 'translate(-50%, -50%) scale(0.9)',
          },
          {
            opacity: 1,
            transform: 'translate(-50%, -50%) scale(1)',
          },
        ]
      : [
          { opacity: 0, transform: 'translateY(-100%)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
    options: {
      duration: lite ? 150 : 300,
      easing: 'ease-in-out',
    },
  });
  const presence = createPresence({
    elements: () => [element],
    mount,
    activate: () => {
      element.removeAttribute('data-unmount');
      element.setAttribute('aria-live', live);
    },
    deactivate: () => {
      element.removeAttribute('aria-live');
      element.setAttribute('data-unmount', 'true');
    },
    motion,
    unmount: () => removeToastElement(element),
  });
  presences.set(element, presence);
  void presence.enter().then((completed) => {
    if (completed && element.isConnected) onEntered?.();
  });
}

function hide(toast: HTMLElement | null | undefined): void {
  if (!toast) return;
  if (toast.getAttribute('data-unmount') === 'true') return;
  disposers.get(toast)?.();
  disposers.delete(toast);
  const id = toast.dataset.toast || randomId();
  cancelToastTimers(id);
  const presence = presences.get(toast);
  if (!presence) {
    removeToastElement(toast);
    return;
  }
  void presence.leave();
}

function show(
  message = '',
  duration = 3000,
  type: ToastType = 'info',
  options: ToastOptions = {}
): HTMLElement {
  validateParam('message', message, 'string', 'Toast.show');
  validateParam('duration', duration, TOAST_DURATION_RULE, 'Toast.show');
  validateParam('type', type, TOAST_TYPE_RULE, 'Toast.show');

  const names = resolveClassNames(options);
  const id = randomId();
  const toast = jsx('div', {
    className: joinClasses(names.toast, names[type]),
    'data-toast': id,
    role: 'alert',
    'aria-atomic': 'true',
    children: [
      jsx('span', {
        className: names.icon,
        'data-toast-icon': id,
        children: icon(type === 'primary' ? 'info' : type),
      }),
      jsx('span', {
        className: names.message,
        'data-toast-message': id,
        children: message,
      }),
    ],
  }) as HTMLElement;
  mountToast(
    toast,
    () => getOrCreateContainer(names).appendChild(toast),
    type === 'error' ? 'assertive' : 'polite'
  );
  if (duration > 0) setToastTimer(id, 'hide', () => hide(toast), duration);
  disposers.set(
    toast,
    listen(toast, 'click', () => hide(toast))
  );
  return toast;
}

function lite(
  message = '',
  duration = 2000,
  options: ToastOptions = {}
): HTMLElement {
  validateParam('message', message, 'string', 'Toast.lite');
  validateParam('duration', duration, LITE_DURATION_RULE, 'Toast.lite');

  const names = resolveClassNames(options);
  const previous = q<HTMLElement>('[data-toast-lite]');
  if (previous) {
    cancelToastTimers(previous.dataset.toast || '');
    presences.get(previous)?.cancel();
    removeToastElement(previous);
  }
  const id = randomId();
  const element = jsx('div', {
    className: names.lite,
    'data-toast': id,
    'data-toast-lite': '',
    children: message,
  }) as HTMLElement;
  mountToast(element, () => document.body.appendChild(element), 'polite');
  setToastTimer(id, 'hide', () => hide(element), duration);
  return element;
}

function action(message = '', props: ToastActionProps = {}): HTMLElement {
  validateParam('message', message, 'string', 'Toast.action');
  const closeText = props.text?.close || t('Close', locales);
  const actionText = props.text?.action || t('Confirm', locales);
  const names = resolveClassNames(props);
  const id = randomId();
  const element = jsx('div', {
    className: joinClasses(names.action, names[props.type || 'info']),
    'data-toast': id,
    'data-toast-action': '',
    children: [
      jsx('div', {
        className: names.message,
        'data-toast-message': id,
        children: message,
      }),
      jsx('div', {
        className: names.actions,
        'data-toast-actions': id,
        children: [
          jsx('button', {
            className: joinClasses(names.button, names.closeBtn),
            children: closeText,
            'data-action': 'close',
            'aria-label': closeText,
            onClick: async () => {
              await props.onClose?.();
              hide(element);
            },
          }),
          jsx('button', {
            className: joinClasses(names.button, names.actionBtn),
            children: actionText,
            'data-action': 'toast-action',
            'aria-label': actionText,
            onClick: async () => {
              await props.onAction?.();
              hide(element);
            },
          }),
        ],
      }),
    ],
  }) as HTMLElement;
  mountToast(
    element,
    () => getOrCreateContainer(names).appendChild(element),
    'polite',
    () => {
      q<HTMLButtonElement>('[data-action="toast-action"]', element)?.focus();
    }
  );
  return element;
}

function clearAll(): void {
  for (const key of timers) timer.cancel(key);
  timers.clear();
  for (const dispose of disposers.values()) dispose();
  disposers.clear();
  for (const presence of presences.values()) presence.cancel();
  presences.clear();
  q<HTMLElement>('[data-toast-container]')?.remove();
  q<HTMLElement>('[data-toast-lite]')?.remove();
}

export const Toast = {
  timers,
  disposers,
  configure(options: ToastOptions = {}): ToastOptions {
    classNames = mergeClassNames(options.className);
    return { className: classNames };
  },
  show,
  success: (message = '', duration = 3000, options: ToastOptions = {}) =>
    show(message, duration, 'success', options),
  info: (message = '', duration = 3000, options: ToastOptions = {}) =>
    show(message, duration, 'info', options),
  primary: (message = '', duration = 3000, options: ToastOptions = {}) =>
    show(message, duration, 'primary', options),
  warning: (message = '', duration = 3000, options: ToastOptions = {}) =>
    show(message, duration, 'warning', options),
  error: (message = '', duration = 3000, options: ToastOptions = {}) =>
    show(message, duration, 'error', options),
  hide,
  lite,
  action,
  clearAll,
  destroyAll: clearAll,
};

import { jsx } from 'vanilla-signal';

import { randomId, timer, validateParam } from '../utilities/core.ts';
import { q } from '../utilities/dom.ts';
import { listen } from '../utilities/events.ts';
import { icon } from './icons.ts';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'primary';

export interface ToastClassNames {
  container: string;
  toast: string;
  icon: string;
  message: string;
  shown: string;
  hidden: string;
  lite: string;
  action: string;
  actions: string;
  button: string;
  cancelButton: string;
  actionButton: string;
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
  text?: {
    cancel?: string;
    action?: string;
  };
  onAction?: () => void | Promise<void>;
}

interface ResolvedToastOptions {
  className: ToastClassNames;
}

const DEFAULT_CLASS_NAMES: ToastClassNames = {
  container: 'j-toast-container',
  toast: 'j-toast',
  icon: 'toast-icon',
  message: 'toast-message',
  shown: 'is-shown',
  hidden: 'is-hidden',
  lite: 'j-toast-lite',
  action: 'is-action',
  actions: 'toast-actions',
  button: 'j-button is-sm',
  cancelButton: 'is-ghost',
  actionButton: 'is-outline',
  info: 'is-info',
  success: 'is-success',
  warning: 'is-warning',
  error: 'is-error',
  primary: 'is-primary',
};

const TOAST_TYPE_RULE = {
  type: 'string',
  enum: ['info', 'success', 'warning', 'error', 'primary'],
};

const TOAST_DURATION_RULE = {
  type: 'number',
  validate: (value: unknown) => typeof value === 'number' && value >= 0,
  message: 'expects a positive number or 0.',
};

const LITE_DURATION_RULE = {
  type: 'number',
  validate: (value: unknown) => typeof value === 'number' && value > 0,
  message: 'expects a number greater than 0.',
};

function mergeClassNames(className?: ToastClassNameConfig): ToastClassNames {
  return { ...DEFAULT_CLASS_NAMES, ...className };
}

function joinClasses(
  ...classes: Array<string | null | undefined | false>
): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Toast 消息提示工具。
 *
 * 以静态方法方式使用，支持多类型堆叠消息和单实例轻提示。
 */
export class Toast {
  static timers = new Set<string>();
  static disposers = new Map<HTMLElement, () => void>();
  private static classNames = new WeakMap<HTMLElement, ToastClassNames>();
  private static options: ResolvedToastOptions = {
    className: DEFAULT_CLASS_NAMES,
  };

  static configure(options: ToastOptions = {}): ToastOptions {
    Toast.options = {
      className: mergeClassNames(options.className),
    };
    return Toast.options;
  }

  private static resolveClassNames(options?: ToastOptions): ToastClassNames {
    return mergeClassNames({
      ...Toast.options.className,
      ...options?.className,
    });
  }

  static show(
    message = '',
    duration = 3000,
    type: ToastType = 'info',
    options: ToastOptions = {}
  ): HTMLElement {
    validateParam('message', message, 'string', 'Toast.show');
    validateParam('duration', duration, TOAST_DURATION_RULE, 'Toast.show');
    validateParam('type', type, TOAST_TYPE_RULE, 'Toast.show');

    const className = Toast.resolveClassNames(options);
    const toastContainer = Toast.getOrCreateContainer(className);
    const id = randomId();
    const toast = jsx('div', {
      className: joinClasses(className.toast, className[type]),
      'data-toast': id,
      children: [
        jsx('span', {
          className: className.icon,
          'data-toast-icon': id,
          children: icon(type === 'primary' ? 'info' : type),
        }),
        jsx('span', {
          className: className.message,
          'data-toast-message': id,
          children: message,
        }),
      ],
    }) as HTMLElement;

    Toast.classNames.set(toast, className);
    toastContainer.appendChild(toast);

    Toast.setTimer(id, 'show', () => toast.classList.add(className.shown), 10);

    if (duration > 0) {
      Toast.setTimer(id, 'hide', () => Toast.hide(toast), duration);
    }

    const disposeClick = listen(toast, 'click', () => Toast.hide(toast));
    Toast.disposers.set(toast, disposeClick);

    return toast;
  }

  static success(
    message = '',
    duration = 3000,
    options: ToastOptions = {}
  ): HTMLElement {
    return Toast.show(message, duration, 'success', options);
  }

  static info(
    message = '',
    duration = 3000,
    options: ToastOptions = {}
  ): HTMLElement {
    return Toast.show(message, duration, 'info', options);
  }

  static primary(
    message = '',
    duration = 3000,
    options: ToastOptions = {}
  ): HTMLElement {
    return Toast.show(message, duration, 'primary', options);
  }

  static warning(
    message = '',
    duration = 3000,
    options: ToastOptions = {}
  ): HTMLElement {
    return Toast.show(message, duration, 'warning', options);
  }

  static error(
    message = '',
    duration = 3000,
    options: ToastOptions = {}
  ): HTMLElement {
    return Toast.show(message, duration, 'error', options);
  }

  static hide(toast: HTMLElement | null | undefined): void {
    if (!toast) return;

    const className = Toast.classNames.get(toast) || Toast.options.className;
    Toast.disposers.get(toast)?.();
    Toast.disposers.delete(toast);

    toast.classList.remove(className.shown);
    toast.classList.add(className.hidden);

    const id = toast.dataset.toast || randomId();
    Toast.setTimer(
      id,
      'remove',
      () => {
        toast.remove();

        const container = q<HTMLElement>('[data-toast-container]');
        if (container && container.children.length === 0) {
          container.remove();
        }
      },
      300
    );
  }

  static lite(
    message = '',
    duration = 2000,
    options: ToastOptions = {}
  ): HTMLElement {
    validateParam('message', message, 'string', 'Toast.lite');
    validateParam('duration', duration, LITE_DURATION_RULE, 'Toast.lite');

    const className = Toast.resolveClassNames(options);
    q<HTMLElement>('[data-toast-lite]')?.remove();

    const id = randomId();
    const lite = jsx('div', {
      className: className.lite,
      'data-toast': id,
      'data-toast-lite': '',
      children: message,
    }) as HTMLElement;

    Toast.classNames.set(lite, className);
    document.body.appendChild(lite);

    Toast.setTimer(id, 'show', () => lite.classList.add(className.shown), 10);
    Toast.setTimer(
      id,
      'hide',
      () => {
        lite.classList.remove(className.shown);
        lite.classList.add(className.hidden);
        Toast.setTimer(id, 'remove', () => lite.remove(), 300);
      },
      duration
    );

    return lite;
  }

  static action(message = '', props: ToastActionProps = {}): HTMLElement {
    validateParam('message', message, 'string', 'Toast.action');

    const className = Toast.resolveClassNames(props);
    const toastContainer = Toast.getOrCreateContainer(className);
    const id = randomId();
    const action = jsx('div', {
      className: joinClasses(className.toast, className.action),
      'data-toast': id,
      'data-toast-action': '',
      children: [
        jsx('div', {
          className: className.message,
          'data-toast-message': id,
          children: message,
        }),
        jsx('div', {
          className: className.actions,
          'data-toast-actions': id,
          children: [
            jsx('button', {
              className: joinClasses(className.button, className.cancelButton),
              children: props.text?.cancel || 'cancel',
              'data-action': 'cancel',
              onClick: () => Toast.hide(action),
            }),
            jsx('button', {
              className: joinClasses(className.button, className.actionButton),
              children: props.text?.action || 'action',
              'data-action': 'toast-action',
              onClick: async () => {
                await props.onAction?.();
                Toast.hide(action);
              },
            }),
          ],
        }),
      ],
    }) as HTMLElement;

    Toast.classNames.set(action, className);
    toastContainer.appendChild(action);

    Toast.setTimer(
      id,
      'show',
      () => {
        action.classList.add(className.shown);
        q<HTMLButtonElement>('[data-action="toast-action"]', action)?.focus();
      },
      10
    );

    return action;
  }

  private static getOrCreateContainer(className: ToastClassNames): HTMLElement {
    let toastContainer = q<HTMLElement>('[data-toast-container]');
    if (!toastContainer) {
      toastContainer = jsx('div', {
        className: className.container,
        'data-toast-container': '',
      }) as HTMLElement;
      document.body.appendChild(toastContainer);
    } else {
      toastContainer.className = className.container;
    }
    return toastContainer;
  }

  private static setTimer(
    id: string,
    action: string,
    callback: () => void,
    delay: number
  ): string {
    const key = `${id}-${action}`;
    Toast.timers.add(key);
    timer.start(key, delay, () => {
      Toast.timers.delete(key);
      callback();
    });
    return key;
  }

  static clearAll(): void {
    for (const key of Toast.timers) {
      timer.cancel(key);
    }
    Toast.timers.clear();

    for (const dispose of Toast.disposers.values()) dispose();
    Toast.disposers.clear();

    q<HTMLElement>('[data-toast-container]')?.remove();
    q<HTMLElement>('[data-toast-lite]')?.remove();
  }

  static destroyAll(): void {
    Toast.clearAll();
  }
}

import { jsx } from 'vanilla-signal';

import { randomId, timer, validateParam } from '../utilities/core.js';
import { q, requireRenderDOM } from '../utilities/dom.js';
import { listen } from '../utilities/events.js';
import { icon } from './icons.js';

const TOAST_TYPE_RULE = {
  type: 'string',
  enum: ['info', 'success', 'warning', 'error', 'primary'],
};

const TOAST_DURATION_RULE = {
  type: 'number',
  validate: (value) => value >= 0,
  message: 'expects a positive number or 0.',
};

const LITE_DURATION_RULE = {
  type: 'number',
  validate: (value) => value > 0,
  message: 'expects a number greater than 0.',
};

/**
 * Toast 消息提示工具。
 *
 * 以静态方法方式使用，支持多类型堆叠消息和单实例轻提示。
 */
export class Toast {
  /**
   * 当前 Toast 使用的 timer key 集合，用于统一清理。
   * @type {Set<string>}
   */
  static timers = new Set();

  static disposers = new Map();
  /**
   * 展示一条 Toast 消息。
   * @param {string} [message=""] 消息内容。
   * @param {number} [duration=3000] 展示时长，单位毫秒；传 0 时不自动关闭。
   * @param {"info"|"success"|"warning"|"error"|"primary"} [type="info"] 消息类型。
   * @returns {HTMLElement} Toast 节点。
   */
  static show(message = '', duration = 3000, type = 'info') {
    requireRenderDOM('Toast');

    validateParam('message', message, 'string', 'Toast.show');
    validateParam('duration', duration, TOAST_DURATION_RULE, 'Toast.show');
    validateParam('type', type, TOAST_TYPE_RULE, 'Toast.show');

    let toastContainer = q('.j-toast-container');
    if (!toastContainer) {
      toastContainer = jsx('div', { className: 'j-toast-container' });
      document.body.appendChild(toastContainer);
    }

    const id = randomId();
    const toast = jsx('div', {
      className: `j-toast is-${type}`,
      'data-toast': id,
      children: [
        jsx('span', {
          className: 'toast-icon',
          children: icon(type === 'primary' ? 'info' : type),
        }),
        jsx('span', { className: 'toast-message', children: message }),
      ],
    });

    toastContainer.appendChild(toast);

    Toast._setTimer(
      id,
      'show',
      () => {
        toast.classList.add('is-shown');
      },
      10
    );

    if (duration > 0) {
      Toast._setTimer(
        id,
        'hide',
        () => {
          Toast.hide(toast);
        },
        duration
      );
    }

    const disposeClick = listen(toast, 'click', () => {
      Toast.hide(toast);
    });
    Toast.disposers.set(toast, disposeClick);

    return toast;
  }

  /**
   * 展示成功消息。
   * @param {string} [message=""] 消息内容。
   * @param {number} [duration=3000] 展示时长，单位毫秒。
   * @returns {HTMLElement}
   */
  static success(message = '', duration = 3000) {
    return Toast.show(message, duration, 'success');
  }

  /**
   * 展示信息消息。
   * @param {string} [message=""] 消息内容。
   * @param {number} [duration=3000] 展示时长，单位毫秒。
   * @returns {HTMLElement}
   */
  static info(message = '', duration = 3000) {
    return Toast.show(message, duration, 'info');
  }

  /**
   * 展示主色消息。
   * @param {string} [message=""] 消息内容。
   * @param {number} [duration=3000] 展示时长，单位毫秒。
   * @returns {HTMLElement}
   */
  static primary(message = '', duration = 3000) {
    return Toast.show(message, duration, 'primary');
  }

  /**
   * 展示警告消息。
   * @param {string} [message=""] 消息内容。
   * @param {number} [duration=3000] 展示时长，单位毫秒。
   * @returns {HTMLElement}
   */
  static warning(message = '', duration = 3000) {
    return Toast.show(message, duration, 'warning');
  }

  /**
   * 展示错误消息。
   * @param {string} [message=""] 消息内容。
   * @param {number} [duration=3000] 展示时长，单位毫秒。
   * @returns {HTMLElement}
   */
  static error(message = '', duration = 3000) {
    return Toast.show(message, duration, 'error');
  }

  /**
   * 隐藏指定 Toast。
   * @param {HTMLElement} toast 需要隐藏的 Toast 节点。
   * @returns {void}
   */
  static hide(toast) {
    if (toast) {
      Toast.disposers.get(toast)?.();
      Toast.disposers.delete(toast);

      toast.classList.remove('is-shown');
      toast.classList.add('is-hidden');

      const id = toast.dataset.toast;
      Toast._setTimer(
        id,
        'remove',
        () => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }

          const container = q('.j-toast-container');
          if (container && container.children.length === 0) {
            container.parentNode.removeChild(container);
          }
        },
        300
      );
    }
  }

  /**
   * 展示轻量单例提示。
   *
   * 页面上同一时间只保留一个 lite toast。
   * @param {string} [message=""] 消息内容。
   * @param {number} [duration=2000] 展示时长，单位毫秒。
   * @returns {HTMLElement} 轻提示节点。
   */
  static lite(message = '', duration = 2000) {
    requireRenderDOM('Toast');

    validateParam('message', message, 'string', 'Toast.lite');
    validateParam('duration', duration, LITE_DURATION_RULE, 'Toast.lite');

    const existing = q('.j-toast-lite');
    if (existing) existing.remove();

    const id = randomId();
    const lite = jsx('div', {
      className: 'j-toast-lite',
      'data-toast': id,
      children: message,
    });
    document.body.appendChild(lite);

    Toast._setTimer(id, 'show', () => lite.classList.add('is-shown'), 10);

    Toast._setTimer(
      id,
      'hide',
      () => {
        lite.classList.remove('is-shown');
        lite.classList.add('is-hidden');
        Toast._setTimer(id, 'remove', () => lite.remove(), 300);
      },
      duration
    );

    return lite;
  }

  // action 模式不支持自动关闭，必须通过按钮点击触发关闭。
  static action(message = '', props = {}) {
    // DOM 结构如下：
    //  <div class="j-toast-container">
    //     <div class="j-toast is-action is-shown">
    //       <div class="toast-message">这是一条成功提示消息。</div>
    //       <div class="toast-action">
    //           <button class="j-button is-sm is-ghost">cancel</button>
    //           <button class="j-button is-sm is-outline">action</button>
    //       </div>
    //     </div>
    //   </div>

    // const existing = q('.j-toast.is-action');
    // if (existing) existing.remove();

    let toastContainer = q('.j-toast-container');
    if (!toastContainer) {
      toastContainer = jsx('div', { className: 'j-toast-container' });
      document.body.appendChild(toastContainer);
    }

    const id = randomId();
    const action = jsx('div', {
      className: 'j-toast is-action',
      'data-toast': id,
      children: [
        jsx('div', { className: 'toast-message', children: message }),
        jsx('div', {
          className: 'toast-action',
          children: [
            jsx('button', {
              className: 'j-button is-sm is-ghost',
              children: props.text.cancel || 'cancel',
              onClick: () => {
                action.classList.remove('is-shown');
                action.classList.add('is-hidden');
                Toast.hide(action);
              },
            }),
            jsx('button', {
              className: 'j-button is-sm is-outline',
              children: props.text.action || 'action',
              onClick: async () => {
                await props.onAction?.();
                Toast.hide(action);
              },
            }),
          ],
        }),
      ],
    });
    action.classList.add('is-shown');
    toastContainer.appendChild(action);
    return action;
  }

  /**
   * 创建可统一清理的定时器。
   * @private
   * @param {Function} callback 定时回调。
   * @param {number} delay 延迟毫秒。
   * @returns {string} timer key。
   */
  static _setTimer(id, action, callback, delay) {
    const key = `${id}-${action}`;
    Toast.timers.add(key);
    timer.start(key, delay, () => {
      Toast.timers.delete(key);
      callback();
    });
    return key;
  }

  /**
   * 清理所有 Toast 节点和定时器。
   * @returns {void}
   */
  static clearAll() {
    for (const key of Toast.timers) {
      timer.cancel(key);
    }
    Toast.timers.clear();
    for (const dispose of Toast.disposers.values()) dispose();
    Toast.disposers.clear();
    q('.j-toast-container')?.remove();
    q('.j-toast-lite')?.remove();
  }
}

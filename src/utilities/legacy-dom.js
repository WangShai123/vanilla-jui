import { q } from './dom.js';
import { listen } from './events.js';

/**
 * 创建 DOM 元素。
 *
 * 这是历史工具函数，新组件优先使用 signal.js/vanilla-signal 的 jsx 渲染。
 * @param {string} tagName 标签名。
 * @param {object} [options={}] 元素配置。
 * @param {string} [options.is] 自定义内建元素扩展名。
 * @param {string} [options.className] className。
 * @param {string} [options.id] id。
 * @param {Record<string, any>} [options.attrs] attribute 集合。
 * @param {Record<string, any>} [options.style] 行内样式集合。
 * @param {Record<string, Function>} [options.events] 事件处理集合。
 * @param {string} [options.text] textContent。
 * @param {string} [options.html] innerHTML，调用方需自行处理 XSS 风险。
 * @param {Node|Node[]|string} [options.children] 子节点或 HTML 字符串。
 * @param {boolean|Function} [options.dependency] 依赖条件，false 时返回空字符串。
 * @returns {HTMLElement|string}
 * @legacy 废弃，请使用 h() 或 jsx() 替代。
 */
export function el(tagName, options = {}) {
  if (typeof document === 'undefined') {
    throw new Error('el() can only be used in browser environment.');
  }

  if (
    options.dependency === false ||
    (typeof options.dependency === 'function' && !options.dependency())
  ) {
    return '';
  }

  const { is, className, id, attrs, style, events, text, html, children } =
    options;
  const element = is
    ? document.createElement(tagName, { is })
    : document.createElement(tagName);

  if (className) element.className = className;
  if (id) element.id = id;

  if (attrs && typeof attrs === 'object') {
    for (const [key, value] of Object.entries(attrs)) {
      if (value != null) element.setAttribute(key, String(value));
    }
  }

  if (style && typeof style === 'object') {
    for (const [key, value] of Object.entries(style)) {
      if (value != null) element.style[key] = value;
    }
  }

  if (events && typeof events === 'object') {
    for (const [type, handler] of Object.entries(events)) {
      if (typeof handler === 'function') {
        listen(element, type, handler);
      }
    }
  }

  if (children !== undefined) {
    if (Array.isArray(children)) {
      element.append(...children);
    } else if (typeof children === 'string') {
      element.innerHTML = children;
    } else if (children instanceof Node) {
      element.appendChild(children);
    }
  } else if (html !== undefined) {
    element.innerHTML = html;
  } else if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

/**
 * 当目标元素进入可视区域时执行渲染回调，仅执行一次后自动清理。
 * 支持传入选择器字符串或 Element 对象，即使元素尚未挂载到 DOM 也能工作。
 *
 * @param {string|Element} target CSS 选择器或 DOM 元素。
 * @param {Function} renderCallback 渲染回调函数，仅执行一次。
 * @param {Object} [options] 配置项。
 * @param {number|number[]} [options.threshold=0.1] 触发阈值。
 * @param {string} [options.rootMargin="0px"] 根边距。
 * @param {Element|null} [options.root=null] 根容器。
 * @param {boolean} [options.waitForDOM=true] 是否等待元素出现在 DOM 中。
 * @returns {Function} 停止观察的清理函数。
 */
export function lazyRender(target, renderCallback, options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    root = null,
    waitForDOM = true,
  } = options;
  const observerOptions = { threshold, rootMargin, root };

  let cleanup = () => {};
  let element = null;

  if (typeof target === 'string') {
    element = q(target);
  } else if (typeof Element !== 'undefined' && target instanceof Element) {
    element = target;
  } else {
    console.warn('lazyRender: target 必须是 CSS 选择器字符串或 DOM 元素');
    return cleanup;
  }

  if (element && document.body.contains(element)) {
    cleanup = observeAndRender(element, renderCallback, observerOptions);
    return cleanup;
  }

  if (!waitForDOM) {
    renderCallback();
    return cleanup;
  }

  const observer = new MutationObserver(() => {
    let found = false;

    if (typeof target === 'string') {
      const current = q(target);
      if (current && document.body.contains(current)) {
        found = true;
        element = current;
      }
    } else if (document.body.contains(target)) {
      found = true;
      element = target;
    }

    if (found) {
      observer.disconnect();
      cleanup = observeAndRender(element, renderCallback, observerOptions);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
    cleanup();
  };
}

function observeAndRender(element, renderCallback, observerOptions) {
  if (!window.IntersectionObserver) {
    renderCallback();
    return () => {};
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        io.unobserve(element);
        io.disconnect();
        renderCallback();
        break;
      }
    }
  }, observerOptions);

  io.observe(element);

  return () => {
    io.unobserve(element);
    io.disconnect();
  };
}

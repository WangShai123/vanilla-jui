import { html } from 'vanilla-signal';

/**
 * 判断当前环境是否可访问 DOM。
 * @returns {boolean}
 */
export function canUseDOM() {
  return typeof document !== 'undefined';
}

/**
 * 判断当前环境是否可执行 DOM 渲染。
 * @returns {boolean}
 */
export function canRenderDOM() {
  if (!canUseDOM() || typeof document.createElement !== 'function') {
    return false;
  }

  const element = document.createElement('div');
  return typeof element.insertBefore === 'function';
}

/**
 * 判断是否为 DOM Node。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
export function isNode(value) {
  return canUseDOM() && typeof Node !== 'undefined' && value instanceof Node;
}

/**
 * 判断是否为 DOM Element。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
export function isElement(value) {
  return typeof Element !== 'undefined' && value instanceof Element;
}

/**
 * 解析并验证容器元素
 * @param {HTMLElement|string} container - CSS 选择器字符串或 DOM 元素
 * @param {string} namespace - 组件名称，用于错误提示
 * @returns {HTMLElement} 有效的 DOM 元素
 * @throws {Error} 当容器无效时抛出错误
 */
export const resolveContainer = (container, namespace = 'Component') => {
  let el;

  el = typeof container === 'string' ? q(container) : container;

  if (!el || typeof el.appendChild !== 'function') {
    throw new Error(`${namespace}: container expects a valid Element.`);
  }

  return el;
};

/**
 * 判断是否为组件可渲染内容。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
export function isRenderableContent(value) {
  return (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'function' ||
    Array.isArray(value) ||
    isNode(value)
  );
}

/**
 * 将常见内容值转换为 DOM 节点数组。
 *
 * 字符串会按 HTML 片段解析；函数会以 context 调用后继续归一化。
 * @param {*} content 组件内容。
 * @param {*} [context] 传给函数内容的上下文。
 * @returns {Node[]}
 */
export function normalizeContentNodes(content, context) {
  const value = typeof content === 'function' ? content(context) : content;

  if (value == null || value === false || value === true) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeContentNodes(item, context));
  }

  if (isNode(value)) return [value];

  if (typeof value === 'string') {
    return Array.from(html(value).childNodes);
  }

  return [document.createTextNode(String(value))];
}

/**
 * @deprecated 请使用 utilities/events.js 的 listen。
 */
// export { listen as on, unlisten as off } from './events.js';

/**
 * 根据 CSS 选择器获取第一个匹配的元素。
 * @param {string} selector CSS 选择器。
 * @param {Document|Element} [context=document] 查询范围。
 * @returns {Element|null}
 */
export function q(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * 根据 CSS 选择器获取所有匹配的元素。
 * @param {string} selector CSS 选择器。
 * @param {Document|Element} [context=document] 查询范围。
 * @returns {Element[]}
 */
export function all(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/**
 * 将 Element 或 CSS 选择器解析为 DOM 元素。
 * @param {Element|string|false|null|undefined} ref 元素引用、选择器或空值。
 * @param {string} [namespace="getEl"] 错误命名空间。
 * @returns {Element|null}
 */
export function getEl(ref, namespace = 'getEl') {
  if (typeof Element !== 'undefined' && ref instanceof Element) return ref;
  if (typeof ref === 'string') return q(ref);
  if (ref === false || ref == null) return null;
  throw new Error(`${namespace}: expects Element or string.`);
}

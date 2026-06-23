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

function nodeFromArray(value) {
  const nodes = value.flatMap((item) => normalizeContentNodes(item));
  return nodes.find(isElement) || nodes.find(isNode) || null;
}

/**
 * 解析并验证容器元素
 * @param {Element|Node|string|Array|false|null|undefined} container - CSS 选择器、DOM/JSX 节点或节点数组
 * @param {string} namespace - 组件名称，用于错误提示
 * @returns {Element} 有效的 DOM 元素
 * @throws {Error} 当容器无效时抛出错误
 */
export const resolveContainer = (container, namespace = 'Component') => {
  return resolveElement(container, `${namespace}.container`);
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

function parseContentString(value) {
  const template = document.createElement('template');
  template.innerHTML = value;
  return Array.from(template.content.childNodes);
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
    return parseContentString(value);
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
 * 将 DOM 引用解析为节点。
 * @param {Element|Node|string|Array|false|null|undefined} ref 元素引用、选择器、JSX/h 返回值或空值。
 * @param {string} [namespace="getEl"] 错误命名空间。
 * @returns {Node|null}
 */
export function getEl(ref, namespace = 'getEl') {
  if (isElement(ref) || isNode(ref)) return ref;
  if (typeof ref === 'string') return q(ref);
  if (Array.isArray(ref)) return nodeFromArray(ref);
  if (ref === false || ref == null) return null;
  throw new Error(`${namespace}: expects Element, Node, selector or JSX node.`);
}

/**
 * 将 DOM 引用解析为元素。
 * @param {Element|Node|string|Array|false|null|undefined} ref 元素引用、选择器、JSX/h 返回值或空值。
 * @param {string} [namespace="resolveElement"] 错误命名空间。
 * @returns {Element}
 */
export function resolveElement(ref, namespace = 'resolveElement') {
  const element = getEl(ref, namespace);
  if (!isElement(element)) {
    throw new Error(`${namespace}: expects a valid Element.`);
  }
  return element;
}

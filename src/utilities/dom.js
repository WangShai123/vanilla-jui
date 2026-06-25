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
  return (
    canUseDOM() && typeof Element !== 'undefined' && value instanceof Element
  );
}

/**
 * 判断值是否为可接受的容器输入。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
function isContainerLike(value) {
  return (
    typeof value === 'string' ||
    isElement(value) ||
    isNode(value) ||
    Array.isArray(value)
  );
}

function firstElement(nodes) {
  return nodes.find(isElement) || null;
}

function flattenNodeArray(value, out = []) {
  for (const item of value) {
    if (Array.isArray(item)) {
      if (!flattenNodeArray(item, out)) return null;
      continue;
    }

    if (isNode(item)) {
      out.push(item);
      continue;
    }

    return null;
  }

  return out;
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
    const template = document.createElement('template');
    template.innerHTML = value;
    return Array.from(template.content.childNodes);
  }

  return [document.createTextNode(String(value))];
}

/**
 * 将 DOM 引用解析为节点列表。
 *
 * @param {Element|Node|string|Array|false|null|undefined} ref 元素引用、选择器、节点或空值。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @returns {Node[]|null}
 */
export function resolveNodeList(ref, _namespace = 'Component') {
  if (ref === false || ref == null) return null;

  if (typeof ref === 'string') {
    if (!canUseDOM()) return null;
    const nodes = Array.from(document.querySelectorAll(ref));
    return nodes.length > 0 ? nodes : null;
  }

  if (Array.isArray(ref)) {
    const nodes = flattenNodeArray(ref, []);
    return nodes && nodes.length > 0 ? nodes : null;
  }

  if (isNode(ref)) return [ref];

  return null;
}

/**
 * 将 DOM 引用解析为节点。
 *
 * @param {Element|Node|string|Array|false|null|undefined} ref 元素引用、选择器、节点或空值。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @returns {Node|null}
 */
export function resolveNode(ref, namespace = 'Component') {
  if (isElement(ref) || isNode(ref)) return ref;

  if (typeof ref === 'string') {
    if (!canUseDOM()) return null;
    return document.querySelector(ref);
  }

  if (Array.isArray(ref)) {
    const nodes = resolveNodeList(ref, namespace) || [];
    return nodes[0] || null;
  }

  return null;
}

/**
 * 将 DOM 引用解析为元素。
 *
 * @param {Element|Node|string|Array|false|null|undefined} ref 元素引用、选择器、节点或空值。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @returns {Element|null}
 */
export function resolveElement(ref, namespace = 'Component') {
  if (!isContainerLike(ref) || ref === false || ref == null) return null;

  if (typeof ref === 'string') {
    if (!canUseDOM()) return null;
    const element = document.querySelector(ref);
    return isElement(element) ? element : null;
  }

  if (Array.isArray(ref)) {
    const nodes = resolveNodeList(ref, namespace);
    return Array.isArray(nodes) ? firstElement(nodes) : null;
  }

  return isElement(ref) ? ref : null;
}

/**
 * 统一解析容器引用。
 *
 * @param {Element|Node|string|Array|false|null|undefined} container 容器引用、选择器、节点或数组。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @param {'node'|'element'|'array'} [expect='element'] 期望返回类型。
 * @returns {Node|Element|Node[]|null}
 */
export function resolveContainer(
  container,
  namespace = 'Component',
  expect = 'element'
) {
  if (!['node', 'element', 'array'].includes(expect)) {
    throw new Error(
      `${namespace}: expect must be one of 'node', 'element', 'array'.`
    );
  }

  if (!isContainerLike(container)) return null;

  if (expect === 'array') {
    return resolveNodeList(container, namespace);
  }

  if (expect === 'node') {
    return resolveNode(container, namespace);
  }

  return resolveElement(container, namespace);
}

/**
 * 强制解析容器并要求返回值存在。
 *
 * @param {Element|Node|string|Array|false|null|undefined} container 容器引用、选择器、节点或数组。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @param {'node'|'element'|'array'} [expect='element'] 期望返回类型。
 * @returns {Node|Element|Node[]}
 */
export function requireContainer(
  container,
  namespace = 'Component',
  expect = 'element'
) {
  const resolved = resolveContainer(container, namespace, expect);
  if (resolved == null) {
    throw new Error(`${namespace}: container not found.`);
  }
  return resolved;
}

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

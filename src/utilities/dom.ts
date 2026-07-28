import { jsx } from 'vanilla-signal';

export type ContainerExpect = 'node' | 'element' | 'array';
export type ResolveContainerResult<
  TExpect extends ContainerExpect = 'element',
> = TExpect extends 'array' ? Node[] : TExpect extends 'node' ? Node : Element;
export type RequireContainerResult<
  TExpect extends ContainerExpect = 'element',
> = NonNullable<ResolveContainerResult<TExpect>>;
export type DOMReference =
  | Node
  | string
  | readonly DOMReference[]
  | false
  | null
  | undefined;
export type QueryContext = Document | DocumentFragment | Element;
export type CleanupFunction = () => void;
export type LazyRenderTarget = string | Element;
export type LazyRenderCallback = () => void;
export type RenderableContent<TContext = unknown> =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly RenderableContent<TContext>[]
  | ((context: TContext) => RenderableContent<TContext>);

export interface LazyRenderOptions {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | Document | null;
  waitForDOM?: boolean;
}

const CONTAINER_EXPECTS = ['node', 'element', 'array'] as const;

function isContainerExpect(value: unknown): value is ContainerExpect {
  return CONTAINER_EXPECTS.includes(value as ContainerExpect);
}

/**
 * 判断当前环境是否可访问 DOM。
 * @returns {boolean}
 */
export function canUseDOM(): boolean {
  return typeof document !== 'undefined';
}

/**
 * 判断当前环境是否可执行 DOM 渲染。
 * @returns {boolean}
 */
export function canRenderDOM(): boolean {
  if (!canUseDOM() || typeof document.createElement !== 'function') {
    return false;
  }
  const element = document.createElement('div');
  return typeof element.insertBefore === 'function';
}

/**
 * 强制要求当前环境可执行 DOM 渲染。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @returns {true}
 * @throws {Error} 当前环境不可渲染 DOM 时抛出。
 */
export function requireRenderDOM(namespace: string = 'Component'): true {
  if (!canRenderDOM()) {
    throw new Error(`${namespace}: DOM render environment is required.`);
  }
  return true;
}

/**
 * 判断是否为 DOM Node。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
export function isNode(value: unknown): value is Node {
  return canUseDOM() && typeof Node !== 'undefined' && value instanceof Node;
}

/**
 * 判断是否为 DOM Element。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
export function isElement(value: unknown): value is Element {
  return (
    canUseDOM() && typeof Element !== 'undefined' && value instanceof Element
  );
}

/**
 * 判断值是否为可接受的容器输入。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
function isContainerLike(
  value: unknown
): value is string | Node | readonly DOMReference[] {
  return (
    typeof value === 'string' ||
    isElement(value) ||
    isNode(value) ||
    Array.isArray(value)
  );
}

function firstElement(nodes: readonly Node[]): Element | null {
  return nodes.find(isElement) || null;
}

function flattenNodeArray(
  value: readonly DOMReference[],
  out: Node[] = []
): Node[] | null {
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
export function normalizeContentNodes<TContext = unknown>(
  content: RenderableContent<TContext>,
  context?: TContext
): Node[] {
  if (typeof content === 'function') {
    return normalizeContentNodes(content(context as TContext), context);
  }

  const value = content;

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

  return [
    document.createTextNode(
      String(value as string | number | boolean | bigint | symbol)
    ),
  ];
}

/**
 * 将 DOM 引用解析为节点列表。
 *
 * 支持的输入类型：
 * - **Node**: 包装为单元素数组，如 `document.body`
 * - **Element**: 包装为单元素数组，如 `div`
 * - **string**: CSS 选择器，如 `'div'`, `'.class'`, `'#id'`
 * - **Array**: 扁平化为节点数组，如 `[el1, [el2, el3]]`
 * - **false/null/undefined**: 返回 null
 *
 * @param {Element|Node|string|Array|false|null|undefined} ref 元素引用、选择器、节点或空值。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @returns {Node[]|null}
 */
export function resolveNodeList(
  ref: DOMReference,
  _namespace = 'Component'
): Node[] | null {
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
 * 支持的输入类型：
 * - **Node/Element**: 直接返回，如 `document.body`, `div`
 * - **string**: CSS 选择器，如 `'div'`, `'.class'`, `'#id'`
 * - **Array**: 返回第一个节点，如 `[el1, el2]`
 * - **false/null/undefined**: 返回 null
 *
 * @param {Element|Node|string|Array|false|null|undefined} ref 元素引用、选择器、节点或空值。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @returns {Node|null}
 */
export function resolveNode(
  ref: DOMReference,
  namespace: string = 'Component'
): Node | null {
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
 * 支持的输入类型：
 * - **Element**: 直接返回，如 `document.querySelector('#app')`
 * - **string**: CSS 选择器，如 `'div'`, `'.class'`, `'#id'`
 * - **Array**: 返回第一个 Element，如 `[el1, el2]`
 * - **false/null/undefined**: 返回 null
 *
 * @param {Element|Node|string|Array|false|null|undefined} ref 元素引用、选择器、节点或空值。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @returns {Element|null}
 */
export function resolveElement(
  ref: DOMReference,
  namespace: string = 'Component'
): Element | null {
  if (!isContainerLike(ref)) return null;

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
export function resolveContainer<TExpect extends ContainerExpect = 'element'>(
  container: DOMReference,
  namespace: string = 'Component',
  expect: TExpect = 'element' as TExpect
): ResolveContainerResult<TExpect> | null {
  if (!isContainerExpect(expect)) {
    throw new Error(
      `${namespace}: expect must be one of 'node', 'element', 'array'.`
    );
  }

  if (!isContainerLike(container)) return null;

  if (expect === 'array') {
    return resolveNodeList(
      container,
      namespace
    ) as ResolveContainerResult<TExpect> | null;
  }

  if (expect === 'node') {
    return resolveNode(
      container,
      namespace
    ) as ResolveContainerResult<TExpect> | null;
  }

  return resolveElement(
    container,
    namespace
  ) as ResolveContainerResult<TExpect> | null;
}

/**
 * 强制解析容器并要求返回值存在。
 *
 * @param {Element|Node|string|Array|false|null|undefined} container 容器引用、选择器、节点或数组。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @param {'node'|'element'|'array'} [expect='element'] 期望返回类型。
 * @returns {Node|Element|Node[]}
 */
export function requireContainer<TExpect extends ContainerExpect = 'element'>(
  container: DOMReference,
  namespace: string = 'Component',
  expect: TExpect = 'element' as TExpect
): RequireContainerResult<TExpect> {
  const resolved = resolveContainer(container, namespace, expect);
  if (resolved == null) {
    throw new Error(`${namespace}: container not found.`);
  }
  return resolved as RequireContainerResult<TExpect>;
}

/**
 * 判断是否为组件可渲染内容。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
export function isRenderableContent(
  value: unknown
): value is RenderableContent {
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
 * 创建通用加载状态节点。
 * @param {string} [className='j-loading is-active'] 容器类名。
 * @returns {HTMLElement}
 */
export function createLoading(
  className: string = 'j-loading is-active'
): HTMLDivElement {
  return jsx('div', {
    className,
    'aria-live': 'polite',
    children: jsx`<div className="loading-spinner"></div>`,
  });
}

/**
 * 根据 CSS 选择器获取第一个匹配的元素。
 * @param {string} selector CSS 选择器。
 * @param {Document|Element} [context=document] 查询范围。
 * @returns {Element|null}
 */
export function q<TElement extends Element = Element>(
  selector: string,
  context: QueryContext = document
): TElement | null {
  return context.querySelector<TElement>(selector);
}

/**
 * 根据 CSS 选择器获取所有匹配的元素。
 * @param {string} selector CSS 选择器。
 * @param {Document|Element} [context=document] 查询范围。
 * @returns {Element[]}
 */
export function all<TElement extends Element = Element>(
  selector: string,
  context: QueryContext = document
): TElement[] {
  return Array.from(context.querySelectorAll<TElement>(selector));
}

/**
 * 当目标元素进入可视区域时执行渲染回调，仅执行一次后自动清理。
 *
 * 支持选择器字符串或 Element。目标尚未挂载时默认等待 DOM 变化；不支持
 * IntersectionObserver 时会立即执行回调，保证降级环境也能渲染。
 * @param {string|Element} target CSS 选择器或 DOM 元素。
 * @param {Function} renderCallback 渲染回调函数，仅执行一次。
 * @param {Object} [options] 配置项。
 * @returns {Function} 停止观察的清理函数。
 */
export function lazyRender(
  target: LazyRenderTarget,
  renderCallback: LazyRenderCallback,
  options?: LazyRenderOptions
): CleanupFunction;
export function lazyRender(
  target: unknown,
  renderCallback: LazyRenderCallback,
  options: LazyRenderOptions = {}
): CleanupFunction {
  if (!canUseDOM()) return noop;

  if (typeof renderCallback !== 'function') {
    throw new TypeError('lazyRender: renderCallback expects function.');
  }

  const {
    threshold = 0.1,
    rootMargin = '0px',
    root = null,
    waitForDOM = true,
  } = options;
  const observerOptions: IntersectionObserverInit = {
    threshold,
    rootMargin,
    root,
  };

  if (!isLazyRenderTarget(target)) {
    console.warn('lazyRender: target 必须是 CSS 选择器字符串或 DOM 元素');
    return noop;
  }

  let cleanup: CleanupFunction = noop;
  let element = resolveLazyRenderTarget(target);

  if (element && document.body.contains(element)) {
    cleanup = observeAndRender(element, renderCallback, observerOptions);
    return cleanup;
  }

  if (!waitForDOM || typeof MutationObserver === 'undefined') {
    renderCallback();
    return cleanup;
  }

  const observer = new MutationObserver(() => {
    const current = resolveLazyRenderTarget(target);
    if (!current || !document.body.contains(current)) return;

    element = current;
    observer.disconnect();
    cleanup = observeAndRender(element, renderCallback, observerOptions);
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

function noop(): void {}

function isLazyRenderTarget(value: unknown): value is LazyRenderTarget {
  return typeof value === 'string' || isElement(value);
}

function resolveLazyRenderTarget(target: LazyRenderTarget): Element | null {
  return typeof target === 'string' ? q(target) : target;
}

function observeAndRender(
  element: Element,
  renderCallback: LazyRenderCallback,
  observerOptions: IntersectionObserverInit
): CleanupFunction {
  if (
    typeof window === 'undefined' ||
    typeof window.IntersectionObserver === 'undefined'
  ) {
    renderCallback();
    return noop;
  }

  const observer = new window.IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      observer.unobserve(element);
      observer.disconnect();
      renderCallback();
      break;
    }
  }, observerOptions);

  observer.observe(element);

  return () => {
    observer.unobserve(element);
    observer.disconnect();
  };
}

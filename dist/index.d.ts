import { A as createOffcanvas, C as Drop, D as Validator, E as createPagination, M as createAccordion, O as createValidator, S as createTooltip, T as Pagination, _ as Form, a as Swiper, b as createFlow, c as createToc, d as Parabola, f as createParabola, g as createMenu, h as Menu, i as createTabs, j as Accordion, k as Offcanvas, l as Sticky, m as createModal, n as Theme, o as createSwiper, p as Modal, r as Tabs, s as Toc, t as Toast, u as createSticky, v as createForm, w as createDrop, x as Tooltip, y as Flow } from "./toast-CCpA3PRo.js";
//#region src/utilities/browser.d.ts
declare global {
  interface Navigator {
    userAgentData?: {
      mobile: boolean;
      brands: Array<{
        brand: string;
        version: string;
      }>;
      platform: string;
      getHighEntropyValues: (hints: string[]) => Promise<any>;
    };
  }
  interface Window {
    opera?: string;
  }
}
/**
 * 判断当前环境是否为移动设备。
 * @returns {boolean}
 */
declare function isMobile(): boolean;
/**
 * 复制文本到剪贴板。
 *
 * 优先使用 Clipboard API，不可用时降级到 textarea + execCommand。
 * @param {unknown} text 需要复制的文本（接受任意类型，内部会安全转换为字符串）。
 * @returns {Promise<boolean>} 是否复制成功。
 */
declare function copy(text: unknown): Promise<boolean>;
//#endregion
//#region src/utilities/cache.d.ts
/**
 * 定义可销毁服务的接口契约
 */
interface Destroyable {
  destroy?: () => void;
}
/**
 * 简易服务缓存容器。
 * 用于按 key 缓存工厂创建的服务实例，并提供销毁能力。
 */
declare const service: {
  /**
   * 获取服务实例。如果不存在，则通过工厂函数创建并缓存。
   * @template T - 期望返回的服务类型（需继承自 Destroyable）
   * @param {string} key - 服务的唯一标识
   * @param {() => T} factory - 创建服务实例的工厂函数
   * @returns {T} 服务实例
   */
  get<T extends Destroyable>(key: string, factory: () => T): T;
  /**
   * 销毁指定 key 的服务实例并从缓存中移除。
   * @param {string} key - 服务的唯一标识
   */
  destroy(key: string): void;
  /**
   * 销毁所有缓存的服务实例并清空容器。
   */
  destroyAll(): void;
};
//#endregion
//#region src/utilities/core.d.ts
type LooseRecord = Record<string, unknown>;
type ValueTypeName = string;
type TypeRule = ValueTypeName | readonly ValueTypeName[];
type AnyFunction = (this: unknown, ...args: never[]) => unknown;
type ValidateCondition = ((value: unknown) => boolean) | {
  test: (value: unknown) => boolean;
  message?: string;
};
interface NormalizeContext<TInput extends LooseRecord = LooseRecord> {
  key: string;
  input: TInput;
  options: LooseRecord;
  schema: ResolveSchema<TInput>;
}
interface ParamRule<TInput extends LooseRecord = LooseRecord> {
  type?: TypeRule;
  types?: TypeRule;
  required?: boolean;
  enum?: readonly unknown[];
  conditions?: ValidateCondition | readonly ValidateCondition[];
  validate?: (value: unknown) => boolean;
  message?: string;
  normalize?: (value: unknown, context: NormalizeContext<TInput>) => unknown;
  default?: unknown;
  factory?: boolean;
  [key: string]: unknown;
}
type ParamRuleInput<TInput extends LooseRecord = LooseRecord> = TypeRule | ParamRule<TInput>;
type ResolveSchema<TInput extends LooseRecord = LooseRecord> = Record<string, ParamRuleInput<TInput>>;
type ResolvedProps<TSchema extends object> = LooseRecord & { [Key in keyof TSchema]: unknown; };
/**
 * 判断对象是否包含指定属性。
 * @param {object} obj - 待检查的对象。
 * @param {string} key - 属性名。
 * @returns {boolean} - 如果对象包含指定属性，则返回 true；否则返回 false。
 */
declare const hasOwn: <T extends object>(obj: T, key: PropertyKey) => key is keyof T;
/**
 * 创建一个去重后的数组，并移除“假值”（如 null、undefined、false、0、NaN、空字符串）。
 * @param {Array} list - 待去重的数组。
 * @returns {Array} - 去重后的数组。
 */
declare const uniq: <T>(list: readonly T[]) => T[];
/**
 * 定时器管理器
 */
declare const timer: {
  timers: Record<string, ReturnType<typeof setTimeout>>;
  /**
   * 注册并开始一个定时器
   * @param {string} key - 定时器的唯一标识
   * @param {number} duration - 延迟执行的时间（毫秒）
   * @param {function} callback - 延迟执行的回调函数
   */
  start(key: string, duration: number, callback: () => void): void;
  /**
   * 明确注销一个定时器
   * @param {string} key - 需要取消的定时器唯一标识
   */
  cancel(key: string): void;
};
/**
 * 获取值的增强类型名称。
 * @param {*} val 需要判断类型的值。
 * @returns {string} 类型名称，如 array、null、HTMLElement、Node、string 等。
 */
declare const getType: (val: unknown) => string;
/**
 * 判断是否为普通可构造函数。
 * @param {*} fn 需要判断的值。
 * @returns {boolean}
 */
declare const isFunction: (fn: unknown) => fn is (...args: never[]) => unknown;
/**
 * 判断是否为类。
 * @param {Function} fn 函数。
 * @returns {boolean}
 */
declare const isClass: (fn: unknown) => fn is abstract new (...args: never[]) => unknown;
/**
 * 判断是否为普通对象。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
declare function isPlainObject(value: unknown): value is Record<string, unknown>;
/**
 * 按规则校验参数。
 *
 * rule 可包含 type/types、required、enum、conditions、validate、message 等字段。
 * @param {string} name 参数名。
 * @param {*} value 参数值。
 * @param {NormalizedRule} rule 校验规则。
 * @param {string} [namespace=""] 错误命名空间。
 * @returns {*} 校验通过后的原值。
 * @throws {Error} 校验失败时抛出。
 */
declare function validateParam<TInput extends LooseRecord = LooseRecord>(name: string, value: unknown, rule?: ParamRuleInput<TInput>, namespace?: string): unknown;
/**
 * 合并默认值、执行 normalize 并校验配置。
 *
 * schema 的每一项可同时定义 default、factory、normalize 和校验规则。
 * @param {object} [input={}] 用户传入配置。
 * @param {Record<string, object|string|string[]>} [schema={}] 配置 schema。
 * @param {string} [namespace="Options"] 错误命名空间。
 * @returns {object} 合并并校验后的配置。
 */
declare function resolveProps(input: null | undefined, schema?: ResolveSchema, namespace?: string): ResolvedProps<ResolveSchema>;
declare function resolveProps<TInput extends LooseRecord, TSchema extends ResolveSchema<TInput>>(input?: TInput | null, schema?: TSchema, namespace?: string): TInput & ResolvedProps<TSchema>;
/**
 * 生成标准 UUID。
 * @returns {string}
 */
declare function uuid(): string;
/**
 * 生成适合 DOM id 的随机字符串。
 * @param {number} [length=8] 字符串长度，范围 1 到 32。
 * @returns {string}
 */
declare function randomId(length?: number): string;
interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}
type DebouncedFunction<T extends AnyFunction> = {
  (this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T> | undefined;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
};
declare function debounce<T extends AnyFunction>(func: T, wait?: number, options?: DebounceOptions): DebouncedFunction<T>;
/**
 * 创建节流函数，确保在指定时间间隔内只执行一次。
 * 该函数基于防抖函数实现，适用于需要限制函数调用频率的场景。
 * @param {Function} func
 * @param {number} wait
 * @param {Object} options
 * @returns {Function}
 */
declare function throttle<T extends AnyFunction>(func: T, wait?: number, options?: DebounceOptions): DebouncedFunction<T>;
//#endregion
//#region src/utilities/dom.d.ts
type ContainerExpect = 'node' | 'element' | 'array';
type DOMReference = Node | string | readonly DOMReference[] | false | null | undefined;
type QueryContext = Document | DocumentFragment | Element;
type CleanupFunction = () => void;
type LazyRenderTarget = string | Element;
type LazyRenderCallback = () => void;
type RenderableContent<TContext = unknown> = Node | string | number | boolean | null | undefined | readonly RenderableContent<TContext>[] | ((context: TContext) => RenderableContent<TContext>);
interface LazyRenderOptions {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | Document | null;
  waitForDOM?: boolean;
}
/**
 * 判断当前环境是否可访问 DOM。
 * @returns {boolean}
 */
declare function canUseDOM(): boolean;
/**
 * 判断当前环境是否可执行 DOM 渲染。
 * @returns {boolean}
 */
declare function canRenderDOM(): boolean;
/**
 * 强制要求当前环境可执行 DOM 渲染。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @returns {true}
 * @throws {Error} 当前环境不可渲染 DOM 时抛出。
 */
declare function requireRenderDOM(namespace?: string): true;
/**
 * 判断是否为 DOM Node。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
declare function isNode(value: unknown): value is Node;
/**
 * 判断是否为 DOM Element。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
declare function isElement(value: unknown): value is Element;
/**
 * 将常见内容值转换为 DOM 节点数组。
 *
 * 字符串会按 HTML 片段解析；函数会以 context 调用后继续归一化。
 * @param {*} content 组件内容。
 * @param {*} [context] 传给函数内容的上下文。
 * @returns {Node[]}
 */
declare function normalizeContentNodes<TContext = unknown>(content: RenderableContent<TContext>, context?: TContext): Node[];
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
declare function resolveNodeList(ref: DOMReference, _namespace?: string): Node[] | null;
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
declare function resolveNode(ref: DOMReference, namespace?: string): Node | null;
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
declare function resolveElement(ref: DOMReference, namespace?: string): Element | null;
/**
 * 统一解析容器引用。
 *
 * @param {Element|Node|string|Array|false|null|undefined} container 容器引用、选择器、节点或数组。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @param {'node'|'element'|'array'} [expect='element'] 期望返回类型。
 * @returns {Node|Element|Node[]|null}
 */
declare function resolveContainer(container: DOMReference, namespace: string | undefined, expect: 'array'): Node[] | null;
declare function resolveContainer(container: DOMReference, namespace: string | undefined, expect: 'node'): Node | null;
declare function resolveContainer(container: DOMReference, namespace?: string, expect?: 'element'): Element | null;
/**
 * 强制解析容器并要求返回值存在。
 *
 * @param {Element|Node|string|Array|false|null|undefined} container 容器引用、选择器、节点或数组。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @param {'node'|'element'|'array'} [expect='element'] 期望返回类型。
 * @returns {Node|Element|Node[]}
 */
declare function requireContainer(container: DOMReference, namespace: string | undefined, expect: 'array'): Node[];
declare function requireContainer(container: DOMReference, namespace: string | undefined, expect: 'node'): Node;
declare function requireContainer(container: DOMReference, namespace?: string, expect?: 'element'): Element;
/**
 * 判断是否为组件可渲染内容。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
declare function isRenderableContent(value: unknown): value is RenderableContent;
/**
 * 创建通用加载状态节点。
 * @param {string} [className='j-loading is-active'] 容器类名。
 * @returns {HTMLElement}
 */
declare function createLoading(className?: string): HTMLDivElement;
/**
 * 根据 CSS 选择器获取第一个匹配的元素。
 * @param {string} selector CSS 选择器。
 * @param {Document|Element} [context=document] 查询范围。
 * @returns {Element|null}
 */
declare function q<TElement extends Element = Element>(selector: string, context?: QueryContext): TElement | null;
/**
 * 根据 CSS 选择器获取所有匹配的元素。
 * @param {string} selector CSS 选择器。
 * @param {Document|Element} [context=document] 查询范围。
 * @returns {Element[]}
 */
declare function all<TElement extends Element = Element>(selector: string, context?: QueryContext): TElement[];
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
declare function lazyRender(target: LazyRenderTarget, renderCallback: LazyRenderCallback, options?: LazyRenderOptions): CleanupFunction;
//#endregion
//#region src/utilities/events.d.ts
/**
 * 绑定 DOM 事件并返回一次性解绑函数。
 *
 * @template T - 事件目标类型（如 HTMLElement, Window 等）
 * @template K - 事件类型字符串（如 'click', 'scroll'）
 * @param {T} target - 事件目标。
 * @param {K} type - 事件类型。
 * @param {(this: T, ev: HTMLElementEventMap[K extends keyof HTMLElementEventMap ? K : never]) => any} handler - 事件处理器。
 * @param {boolean | AddEventListenerOptions} [options] - 事件选项。
 * @returns {() => void} 解绑函数，可重复调用。
 */
declare function listen<T extends EventTarget, K extends string>(target: T, type: K, handler: (this: T, ev: Event) => any, options?: boolean | AddEventListenerOptions): () => void;
/**
 * 事件管理器实例的接口定义
 */
interface IEventManager {
  /**
   * 绑定事件并自动记录解绑函数。
   * 同一个 key 重复绑定时会先解绑旧事件，避免组件重渲染时重复监听。
   */
  on<T extends EventTarget, K extends string>(key: string, target: T, type: K, handler: (this: T, ev: Event) => any, options?: boolean | AddEventListenerOptions): () => void;
  /** 根据 key 解绑特定事件 */
  off(key: string): boolean;
  /** 清除所有已绑定的事件 */
  clear(): void;
  /** 获取当前绑定的事件数量 */
  size(): number;
}
/**
 * 创建实例级事件管理器。
 *
 * - `on()` 绑定事件并自动记录解绑函数。
 * - 同一个 key 重复绑定时会先解绑旧事件，避免组件重渲染时重复监听。
 * - `off(key)` 和 `clear()` 用于跨作用域精确释放。
 */
declare function createEventManager(): IEventManager;
//#endregion
//#region src/utilities/http.d.ts
/**
 * 发送 JSON POST 请求并解析 JSON 响应。
 * @template T - 期望返回的 JSON 数据类型
 * @param {string} url - 请求地址
 * @param {unknown} body - 请求体，会被 JSON.stringify
 * @param {RequestInit} [options] - 透传给 fetch 的请求配置（排除 method 和 body）
 * @returns {Promise<T>} 解析后的 JSON 响应体
 */
declare function postJson<T = unknown>(url: string, body: unknown, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T>;
/**
 * 当前站点 WordPress REST API 根地址。
 * @type {string}
 */
declare const restUrl: string;
//#endregion
//#region src/utilities/storage.d.ts
declare function getCookie(name: string): string | null;
declare function setCookie(name: string, value: string, seconds?: number): boolean;
declare function removeCookie(name: string): boolean;
//#endregion
//#region src/components/icons.d.ts
type IconPathMap = Record<string, string>;
type IconName = string;
type IconAttributeValue = string | number | boolean | null | undefined;
interface IconProps {
  className?: IconAttributeValue;
  [attribute: string]: IconAttributeValue;
}
/**
 * 获取内置 SVG 图标节点。
 *
 * 返回值是 SVGElement，可直接作为 vanilla-signal jsx/html/render 的 children 使用。
 * @param {string} name 图标名称。
 * @param {object} [props={}] SVG 属性。
 * @returns {SVGElement}
 * @throws {Error} 图标不存在或非 DOM 环境时抛出。
 */
declare function icon(name: IconName, props?: IconProps): SVGElement;
/**
 * 获取完整 SVG 字符串。
 *
 * 仅在必须拼接字符串或写入 innerHTML 时使用；响应式渲染优先使用 icon(name)。
 * @param {string} name 图标名称。
 * @returns {string}
 */
declare function iconHtml(name: IconName): string;
declare const iconMarkup: typeof iconHtml;
/**
 * 获取当前已注册图标的 path 片段浅拷贝。
 * @returns {Record<string, string>}
 */
declare function getRegistedIconPath(): IconPathMap;
/**
 * 批量注册自定义图标。
 *
 * 传入值应为 SVG path 片段，不需要包含外层 svg。
 * @param {Record<string, string>} svgPathObjects 图标名称到 SVG path 的映射。
 * @returns {void}
 */
declare function addIcons(svgPathObjects: IconPathMap): void;
//#endregion
//#region src/core/Component.d.ts
type ComponentProps = Record<string, unknown>;
type ComponentState = Record<string, unknown>;
interface ComponentDOM {
  root: Element | null;
  [key: string]: unknown;
}
interface ComponentRuntime {
  destroyed: boolean;
}
interface ComponentUpdateOptions {
  force?: boolean;
}
type ComponentLifecycleEvent = 'init' | 'beforeUpdate' | 'afterUpdate' | 'destroy';
type ComponentEventName = string;
type ComponentListener = (...args: unknown[]) => void;
type ComponentListeners = Record<ComponentLifecycleEvent, ComponentListener[]> & Record<string, ComponentListener[] | undefined>;
type ComponentCleanup = void | (() => void) | {
  destroy: () => void;
};
type ComponentPluginOptions = Record<string, unknown> | undefined;
type ComponentPlugin<TComponent = Component> = ((instance: TComponent, options?: ComponentPluginOptions) => ComponentCleanup) | {
  install: (instance: TComponent, options?: ComponentPluginOptions) => ComponentCleanup;
};
interface ComponentCleanupRegistry {
  events: ReturnType<typeof createEventManager>;
  plugins: Map<ComponentPlugin<unknown>, ComponentCleanup>;
  [key: string]: unknown;
}
/**
 * 轻量级组件基类，集成 vanilla-signal 响应式状态和插件系统
 * 为所有 UI 组件提供统一的状态管理、生命周期钩子和插件支持
 */
declare class Component<TProps extends ComponentProps = ComponentProps, TState extends ComponentState = ComponentState, TDOM extends ComponentDOM = ComponentDOM> {
  /** 全局插件注册表，所有新创建的组件实例会自动安装这些插件 */
  static globalPlugins: Map<string, ComponentPlugin<Component<ComponentProps, ComponentState, ComponentDOM>>>;
  /** 组件属性配置对象 */
  props: TProps;
  /** DOM 引用容器，存储根元素及其他 DOM 节点引用 */
  dom: TDOM;
  /** 已安装的插件映射表 */
  plugins: Map<ComponentPlugin<unknown>, ComponentCleanup>;
  /** 资源清理管理器，包含事件监听器和插件的清理函数 */
  cleanup: ComponentCleanupRegistry;
  /** 内部事件监听器注册表，用于生命周期和自定义事件 */
  protected _listeners: ComponentListeners;
  /** 响应式状态存储，使用 vanilla-signal 的深层响应式 store */
  state: TState | null;
  /** 运行时状态标记 */
  runtime: ComponentRuntime;
  /**
   * @param {Object} props - 组件初始属性配置
   */
  constructor(props?: TProps);
  /**
   * 获取组件的根 DOM 元素
   * @returns {HTMLElement|null} 根 DOM 元素或 null
   */
  get root(): Element | null;
  /**
   * 设置组件的根 DOM 元素
   * @param {HTMLElement} value - 要设置的根 DOM 元素
   */
  set root(value: Element | null);
  /**
   * 安装实例插件
   * 插件可以是函数形式 plugin(instance, options) 或对象形式 { install(instance, options) }
   * 插件应返回清理函数或清理对象，在组件销毁时自动执行
   * @param {Function|Object} plugin - 插件函数或包含 install 方法的插件对象
   * @param {Object} [options] - 插件配置选项
   * @returns {Component} 返回当前实例，支持链式调用
   */
  use(plugin: ComponentPlugin<this> | null | undefined, options?: ComponentPluginOptions): this;
  /**
   * 注册事件监听器
   * 用于监听组件生命周期事件（init、beforeUpdate、afterUpdate、destroy）或自定义事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 事件回调函数
   * @returns {Component} 返回当前实例，支持链式调用
   */
  on(event: ComponentEventName, callback: ComponentListener): this;
  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 要移除的回调函数引用
   * @returns {Component} 返回当前实例，支持链式调用
   */
  off(event: ComponentEventName, callback: ComponentListener): this;
  /**
   * 安装全局插件到当前实例
   * 遍历全局插件注册表并依次安装
   * @private
   */
  installGlobalPlugins(): void;
  /**
   * 注册全局插件
   * 所有之后创建的组件实例都会自动安装此插件
   * @static
   * @param {string} name - 插件名称标识
   * @param {Function|Object} plugin - 插件函数或插件对象
   */
  static useGlobal(name: string | null | undefined, plugin: ComponentPlugin<Component> | null | undefined): void;
  /**
   * 触发指定事件，执行所有注册的监听器
   * @param {string} event - 事件名称
   * @param {...*} args - 传递给监听器的参数
   * @returns {Component} 返回当前实例，支持链式调用
   */
  emit(event: ComponentEventName, ...args: unknown[]): this;
  /**
   * 初始化组件
   * 合并传入的属性，调用 onInit 钩子（如果存在），并触发 init 事件
   * @param {Object} [props={}] - 初始化属性配置
   * @returns {Component} 返回当前实例，支持链式调用
   * @throws {Error} 如果组件已被销毁则抛出异常
   */
  init(props?: Partial<TProps> | null | undefined): this;
  /**
   * 批量更新响应式状态
   * 支持两种调用方式：setState(key, value) 或 setState({ key1: value1, key2: value2 })
   * 使用 flushSync 确保状态更新的同步性和批量处理
   * @param {string|Object} keyOrPatch - 状态键名或包含多个键值对的补丁对象
   * @param {*} [value] - 当第一个参数为字符串时的状态值
   * @returns {Component} 返回当前实例，支持链式调用
   * @throws {Error} 如果组件已被销毁或参数格式不正确则抛出异常
   */
  setState(patch?: Partial<TState> | null): this;
  setState<TKey extends keyof TState>(key: TKey, value: TState[TKey]): this;
  /**
   * 更新组件属性和触发更新生命周期
   * 合并新的属性配置，触发 beforeUpdate 和 afterUpdate 事件
   * 子类可以重写 onUpdate 方法实现自定义更新逻辑
   * @param {Object} [propsPatch={}] - 要合并的属性补丁对象
   * @param {Object} [options] - 更新选项
   * @param {boolean} [options.force=false] - 是否强制更新（由子类处理）
   * @returns {Component} 返回当前实例，支持链式调用
   * @throws {Error} 如果组件已被销毁则抛出异常
   */
  update(propsPatch?: Partial<TProps> | null | undefined, { force }?: ComponentUpdateOptions): this;
  /**
   * 销毁组件实例
   * 执行 onDestroy 钩子，触发 destroy 事件，清理所有插件和资源
   * 这是组件生命周期的最后一步，销毁后实例不可再使用
   */
  destroy(): void;
  protected onInit?(props: TProps): void;
  protected onUpdate?(propsPatch: Partial<TProps> | null | undefined, options: Required<ComponentUpdateOptions>): void;
  protected onDestroy?(): void;
}
//#endregion
export { Accordion, CleanupFunction, Component, ContainerExpect, DOMReference, DebounceOptions, DebouncedFunction, Destroyable, Drop, Flow, Form, IEventManager, IconAttributeValue, IconName, IconPathMap, IconProps, LazyRenderCallback, LazyRenderOptions, LazyRenderTarget, Menu, Modal, NormalizeContext, Offcanvas, Pagination, Parabola, ParamRule, ParamRuleInput, QueryContext, RenderableContent, ResolveSchema, ResolvedProps, Sticky, Swiper, Tabs, Theme, Toast, Toc, Tooltip, ValidateCondition, Validator, addIcons, all, canRenderDOM, canUseDOM, copy, createAccordion, createDrop, createEventManager, createFlow, createForm, createLoading, createMenu, createModal, createOffcanvas, createPagination, createParabola, createSticky, createSwiper, createTabs, createToc, createTooltip, createValidator, debounce, getCookie, getRegistedIconPath, getType, hasOwn, icon, iconHtml, iconMarkup, isClass, isElement, isFunction, isMobile, isNode, isPlainObject, isRenderableContent, lazyRender, listen, normalizeContentNodes, postJson, q, randomId, removeCookie, requireContainer, requireRenderDOM, resolveContainer, resolveElement, resolveNode, resolveNodeList, resolveProps, restUrl, service, setCookie, throttle, timer, uniq, uuid, validateParam };
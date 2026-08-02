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
 * 判断对象是否包含指定的自有属性。
 * @template T - 对象类型
 * @param obj - 待检查的对象
 * @param key - 属性名
 * @returns 如果对象包含指定自有属性则返回 true，否则返回 false
 */
declare const hasOwn: <T extends object>(obj: T, key: PropertyKey) => key is keyof T;
/**
 * 创建去重后的数组，并移除假值（null、undefined、false、0、NaN、空字符串）。
 * @template T - 数组元素类型
 * @param list - 待去重的数组
 * @returns 去重后的新数组
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
 * 支持识别 null、array、HTMLElement、Node 等特殊类型。
 * @param val - 需要判断类型的值
 * @returns 类型名称（如 array、null、HTMLElement、Node、string）
 */
declare const getType: (val: unknown) => string;
/**
 * 判断是否为普通可构造函数（排除箭头函数和类）。
 * @param fn - 需要判断的值
 * @returns 如果是普通函数则返回 true，否则返回 false
 */
declare const isFunction: (fn: unknown) => fn is (...args: never[]) => unknown;
/**
 * 判断是否为类（使用 class 语法定义）。
 * @param fn - 需要判断的值
 * @returns 如果是类则返回 true，否则返回 false
 */
declare const isClass: (fn: unknown) => fn is abstract new (...args: never[]) => unknown;
/**
 * 判断是否为普通对象（纯对象字面量或通过 Object.create(null) 创建）。
 * @param value - 需要判断的值
 * @returns 如果是普通对象则返回 true，否则返回 false
 */
declare function isPlainObject(value: unknown): value is Record<string, unknown>;
/**
 * 校验单个参数。
 *
 * 支持的校验规则包括：type/types（类型）、required（必填）、enum（枚举）、
 * conditions（条件）、validate（自定义校验函数）、message（错误消息）。
 *
 * @template TInput - 输入对象类型
 * @param name - 参数名
 * @param value - 参数值
 * @param [rule] - 校验规则
 * @param [namespace] - 错误命名空间，用于错误消息前缀
 * @returns 校验通过后的原值
 * @throws {Error} 校验失败时抛出错误
 */
declare function validateParam<TInput extends LooseRecord = LooseRecord>(name: string, value: unknown, rule?: ParamRuleInput<TInput>, namespace?: string): unknown;
/**
 * 合并默认值、执行 normalize 并校验配置对象。
 *
 * schema 的每一项可同时定义：default（默认值）、factory（是否为工厂函数）、
 * normalize（标准化函数）和校验规则（type、required、enum 等）。
 *
 * @template TInput - 输入对象类型
 * @template TSchema - 配置 schema 类型
 * @param [input={}] - 用户传入的配置对象
 * @param [schema={}] - 配置 schema 定义
 * @param [namespace="Options"] - 错误命名空间，用于错误消息前缀
 * @returns 合并并校验后的配置对象
 */
declare function resolveProps<TInput extends LooseRecord, TSchema extends ResolveSchema<TInput>>(input?: TInput | null | undefined, schema?: TSchema, namespace?: string): TInput & ResolvedProps<TSchema>;
/**
 * 生成标准 UUID v4 字符串。
 *
 * 优先使用浏览器原生的 crypto.randomUUID()，
 * 不支持时使用 polyfill 实现。
 *
 * @returns UUID v4 字符串（如 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）
 */
declare function uuid(): string;
/**
 * 生成适合 DOM id 的随机字符串。
 *
 * 使用安全的随机数生成器，生成的字符串适合作为 HTML 元素的 id 属性。
 *
 * @param [length=8] - 字符串长度，范围 1 到 87381
 * @returns 随机字符串
 * @throws {Error} 长度不在有效范围内时抛出错误
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
/**
 * 创建防抖函数，延迟调用 `func` 直到自上次调用以来已经过了 `wait` 毫秒。
 *
 * @template T - 要防抖的函数类型
 * @param func - 要防抖的函数
 * @param [wait=0] - 延迟时间（毫秒）
 * @param [options] - 防抖配置选项
 * @param [options.leading=false] - 是否在超时开始时调用（前沿触发）
 * @param [options.trailing=true] - 是否在超时结束时调用（后沿触发）
 * @param [options.maxWait] - 函数被延迟调用的最大时间
 * @returns 新的防抖函数，包含 cancel 和 flush 方法
 */
declare function debounce<T extends AnyFunction>(func: T, wait?: number, options?: DebounceOptions): DebouncedFunction<T>;
/**
 * 创建节流函数，确保在指定时间间隔内函数只执行一次。
 *
 * 节流原理：在连续触发事件时，函数在指定时间间隔内只会执行一次。
 * 适用于滚动事件、鼠标移动事件等需要限制调用频率的场景。
 *
 * @template T - 要节流的函数类型
 * @param func - 要节流的函数
 * @param [wait=0] - 时间间隔（毫秒），在此期间函数只会执行一次
 * @param [options] - 节流配置选项
 * @param [options.leading=true] - 是否在时间间隔开始时调用（前沿触发）
 * @param [options.trailing=true] - 是否在时间间隔结束时调用（后沿触发）
 * @returns 新的节流函数，包含 cancel 和 flush 方法
 */
declare function throttle<T extends AnyFunction>(func: T, wait?: number, options?: DebounceOptions): DebouncedFunction<T>;
//#endregion
//#region src/utilities/dom.d.ts
type ContainerExpect = 'node' | 'element' | 'array';
type ResolveContainerResult<TExpect extends ContainerExpect = 'element'> = TExpect extends 'array' ? Node[] : TExpect extends 'node' ? Node : Element;
type RequireContainerResult<TExpect extends ContainerExpect = 'element'> = NonNullable<ResolveContainerResult<TExpect>>;
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
 * 将可渲染内容归一化为 DOM 节点数组。
 *
 * 支持的输入类型：
 * - **Node/Element**: 包装为单元素数组
 * - **string**: 按 HTML 片段解析为节点数组
 * - **number/boolean**: 转换为文本节点
 * - **Array**: 递归扁平化处理
 * - **Function**: 调用后递归处理返回值
 * - **null/undefined/false/true**: 返回空数组
 *
 * @param {RenderableContent<TContext>} content 可渲染内容。
 * @param {TContext} [context] 传递给函数类型内容的上下文。
 * @returns {Node[]} 归一化后的节点数组。
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
 * @returns {Node[]|null}
 */
declare function resolveNodeList(ref: DOMReference): Node[] | null;
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
 * @returns {Node|null}
 */
declare function resolveNode(ref: DOMReference): Node | null;
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
 * @returns {Element|null}
 */
declare function resolveElement(ref: DOMReference): Element | null;
/**
 * 统一解析容器引用。
 *
 * @param {Element|Node|string|Array|false|null|undefined} container 容器引用、选择器、节点或数组。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @param {'node'|'element'|'array'} [expect='element'] 期望返回类型。
 * @returns {Node|Element|Node[]|null}
 */
declare function resolveContainer<TExpect extends ContainerExpect = 'element'>(container: DOMReference, namespace?: string, expect?: TExpect): ResolveContainerResult<TExpect> | null;
/**
 * 强制解析容器并要求返回值存在。
 *
 * @param {Element|Node|string|Array|false|null|undefined} container 容器引用、选择器、节点或数组。
 * @param {string} [namespace='Component'] 错误命名空间。
 * @param {'node'|'element'|'array'} [expect='element'] 期望返回类型。
 * @returns {Node|Element|Node[]}
 */
declare function requireContainer<TExpect extends ContainerExpect = 'element'>(container: DOMReference, namespace?: string, expect?: TExpect): RequireContainerResult<TExpect>;
/**
 * 判断是否为组件可渲染内容。
 * @param {*} value 需要判断的值。
 * @returns {boolean}
 */
declare function isRenderableContent(value: unknown): value is RenderableContent;
/**
 * 创建通用加载状态节点。
 * @returns {HTMLElement}
 */
declare function createLoading(): HTMLDivElement;
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
//#region src/locales/index.d.ts
declare const _default: {
  en: {
    b: string;
    t: string;
    sm: string;
    md: string;
    lg: string;
  };
  zh: {
    b: string;
    t: string;
    Primary: string;
    Radius: string;
    Shadow: string;
    Font: string;
    Mode: string;
    Gray: string;
    Olive: string;
    Tomato: string;
    Ruby: string;
    Pink: string;
    Violet: string;
    Indigo: string;
    Blue: string;
    Teal: string;
    Grass: string;
    Mint: string;
    Lime: string;
    Yellow: string;
    Orange: string;
    Gold: string;
    None: string;
    sm: string;
    md: string;
    lg: string;
    XL: string;
    Round: string;
    Light: string;
    Dark: string;
    Auto: string;
    Close: string;
    Confirm: string;
  };
};
//#endregion
//#region src/components/theme.d.ts
type ThemeConfigKey = 'mode' | 'theme' | 'radius' | 'shadow' | 'font';
interface ThemeClassNames {
  panel: string;
  closeWrap: string;
  closeButton: string;
  title: string;
  description: string;
  container: string;
  item: string;
  itemTitle: string;
  items: string;
  button: string;
  active: string;
  prefix: string;
  swatch: string;
  buttonText: string;
}
type ThemeClassNameConfig = Partial<ThemeClassNames>;
interface ThemeOptions extends Record<string, unknown> {
  mode?: string;
  theme?: string;
  radius?: string;
  shadow?: string;
  font?: string;
  key?: string;
  className?: ThemeClassNameConfig;
}
interface ThemePanelGroup {
  title: string;
  type: ThemeConfigKey;
  buttons: Array<[string, string]>;
}
interface ResolvedThemeOptions {
  mode: string;
  theme: string;
  radius: string;
  shadow: string;
  font: string;
  key: string;
  className: ThemeClassNames;
}
interface ThemeCleanup {
  bindings: Set<() => void>;
  events: IEventManager;
}
/**
 * 主题管理组件。
 *
 * 负责主题配置的实例化、主题面板交互和 Cookie 读写。实例初始化不修改 html
 * 类名，仅在面板点击交互时同步当前点击项对应的 html class。
 */
declare class Theme {
  props: ResolvedThemeOptions;
  languages: typeof _default;
  cleanup: ThemeCleanup | null;
  runtime: {
    destroyed: boolean;
  };
  constructor(options?: ThemeOptions);
  private init;
  private translate;
  private loadConfig;
  private saveConfig;
  private scheme;
  private bindActiveButtons;
  private bindEvent;
  private unbindEvent;
  createPanel(containerClass?: string | null, panelConfig?: ThemePanelGroup[] | null): HTMLElement;
  setConfig(newConfig: ThemeOptions): void;
  destroy(): void;
  private defaultPanelConfig;
}
//#endregion
//#region src/components/toast.d.ts
type ToastType = 'info' | 'success' | 'warning' | 'error' | 'primary';
interface ToastClassNames {
  container: string;
  toast: string;
  icon: string;
  message: string;
  hidden: string;
  lite: string;
  action: string;
  actions: string;
  button: string;
  closeButton: string;
  actionButton: string;
  info: string;
  success: string;
  warning: string;
  error: string;
  primary: string;
}
type ToastClassNameConfig = Partial<ToastClassNames>;
interface ToastOptions {
  className?: ToastClassNameConfig;
}
interface ToastActionProps extends ToastOptions {
  text?: {
    close?: string;
    action?: string;
  };
  onAction?: () => void | Promise<void>;
  onClose?: () => void | Promise<void>;
}
/**
 * Toast 消息提示工具。
 *
 * 以静态方法方式使用，支持多类型堆叠消息和单实例轻提示。
 */
declare class Toast {
  static timers: Set<string>;
  static disposers: Map<HTMLElement, () => void>;
  private static classNames;
  private static options;
  static configure(options?: ToastOptions): ToastOptions;
  private static resolveClassNames;
  static show(message?: string, duration?: number, type?: ToastType, options?: ToastOptions): HTMLElement;
  static success(message?: string, duration?: number, options?: ToastOptions): HTMLElement;
  static info(message?: string, duration?: number, options?: ToastOptions): HTMLElement;
  static primary(message?: string, duration?: number, options?: ToastOptions): HTMLElement;
  static warning(message?: string, duration?: number, options?: ToastOptions): HTMLElement;
  static error(message?: string, duration?: number, options?: ToastOptions): HTMLElement;
  static hide(toast: HTMLElement | null | undefined): void;
  static lite(message?: string, duration?: number, options?: ToastOptions): HTMLElement;
  static action(message?: string, props?: ToastActionProps): HTMLElement;
  private static getOrCreateContainer;
  private static setTimer;
  static clearAll(): void;
  static destroyAll(): void;
}
//#endregion
//#region src/components/form.d.ts
type FormValue = string | number | boolean;
type FormOptionInput = FormValue | FormOption;
type FormControlElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type FormStyle = string | Partial<CSSStyleDeclaration> | null;
type FormDataValue = FormDataEntryValue | FormDataEntryValue[];
type FormDataRecord = Record<string, FormDataValue>;
type FormContainer = Element | DocumentFragment | false | null;
type FormControlType = 'checkbox' | 'custom' | 'radio' | 'select' | 'switch' | 'textarea' | (string & {});
interface FormClassNames {
  form: string;
  vertical: string;
  horizontal: string;
  itemVertical: string;
  itemHorizontal: string;
  item: string;
  label: string;
  required: string;
  control: string;
  helpInvalid: string;
  buttons: string;
  button: string;
  input: string;
  textarea: string;
  select: string;
  radio: string;
  checkbox: string;
  choiceVertical: string;
  choiceHorizontal: string;
  choiceGroup: string;
  radioLabel: string;
  radioText: string;
  switch: string;
  switchDefault: string;
  switchSizeMd: string;
  switchSlider: string;
}
type FormClassNameConfig = Partial<FormClassNames>;
interface FormOption {
  value?: FormValue | FormDataEntryValue | null;
  text?: RenderableContent<Form>;
  label?: RenderableContent<Form>;
  checked?: boolean;
  disabled?: boolean;
}
interface FormField {
  id?: string;
  label?: RenderableContent<Form> | false;
  name?: string;
  type?: FormControlType;
  options?: readonly FormOptionInput[];
  value?: FormDataEntryValue | boolean | readonly FormDataEntryValue[];
  checked?: boolean;
  required?: boolean;
  placeholder?: string;
  help?: RenderableContent<Form>;
  disabled?: boolean;
  readonly?: boolean;
  autocomplete?: string;
  multiple?: boolean;
  vertical?: boolean;
  group?: boolean;
  size?: string;
  variant?: string;
  className?: string;
  content?: RenderableContent<FormControlContext>;
}
interface FormButton {
  type?: string;
  text?: RenderableContent<Form>;
  label?: RenderableContent<Form>;
  theme?: string;
  action?: string;
  disabled?: boolean;
  className?: string;
}
interface FormValidatorConfig {
  rules?: Record<string, Record<string, unknown>>;
  messages?: Record<string, Record<string, string>>;
  onSubmit?: (() => void) | null;
  [key: string]: unknown;
}
interface FormProps extends Record<string, unknown> {
  id?: string | null;
  vertical?: boolean;
  itemVertical?: boolean;
  style?: FormStyle;
  fields?: readonly FormField[];
  buttons?: boolean | readonly FormButton[];
  className?: FormClassNameConfig;
  validator?: FormValidatorConfig;
  onSubmit?: ((data: FormDataRecord, form: Form) => void | Promise<void>) | null;
  onReset?: ((event: Event, form: Form) => void) | null;
}
interface ResolvedFormProps extends Record<string, unknown> {
  id: string;
  vertical: boolean;
  itemVertical: boolean;
  style: FormStyle;
  fields: FormField[];
  buttons: FormButton[];
  className: FormClassNames;
  validator: FormValidatorConfig;
  onSubmit: ((data: FormDataRecord, form: Form) => void | Promise<void>) | null;
  onReset: ((event: Event, form: Form) => void) | null;
}
interface FormState extends ResolvedFormProps {
  submitting: boolean;
  data: FormDataRecord | null;
}
interface FormDOM extends ComponentDOM {
  root: HTMLFormElement | null;
  container: DOMReference | DocumentFragment;
  fields: Map<string, FormControlElement>;
}
interface FormCache {
  initial: ResolvedFormProps;
  fieldIds: Map<string | number, string>;
}
interface ValidatorInstance {
  root: Element | null;
  options: FormValidatorConfig & {
    onSubmit: null;
  };
  validate: () => boolean;
  reset: () => void;
  destroy: () => void;
}
interface FormControlContext {
  form: Form;
  field: FormField;
  index: number;
}
declare class Form extends Component<ResolvedFormProps, FormState, FormDOM> {
  state: FormState;
  validator: ValidatorInstance | null;
  cache: FormCache;
  constructor(input?: FormProps, container?: DOMReference);
  get root(): HTMLFormElement | null;
  set root(value: HTMLFormElement | null);
  protected onInit(): void;
  build(container?: DOMReference): this;
  mount(container?: FormContainer): this;
  view(): HTMLFormElement;
  fieldView(field: FormField, index: number): HTMLElement;
  labelView(field: FormField, id: string): HTMLLabelElement | null;
  controlView(field: FormField, id: string, index: number): FormControlElement | HTMLElement | Node[] | null;
  inputView(field: FormField, id: string): HTMLInputElement;
  textareaView(field: FormField, id: string): HTMLTextAreaElement;
  selectView(field: FormField, id: string): HTMLSelectElement;
  choiceGroupView(field: FormField, id: string, type: 'checkbox' | 'radio'): HTMLElement;
  switchView(field: FormField, id: string): HTMLLabelElement;
  buttonsView(): HTMLElement | null;
  controlProps<TExtra extends Record<string, unknown>>(field: FormField, id: string, extra: TExtra): TExtra & {
    name: string | undefined;
    id: string;
    placeholder: string;
    required: boolean;
    disabled: boolean;
    readonly: boolean;
    'data-form-field': string;
    ref: (element: FormControlElement) => void;
  };
  resolveFieldId(field: FormField, index: number): string;
  syncValidator(): void;
  validate(): boolean;
  reset(): this;
  handleSubmit(event: Event): Promise<void>;
  handleReset(event: Event): void;
  resetValidationState(): void;
  collectData(): FormDataRecord;
  collectFormData(form: HTMLFormElement): FormDataRecord;
  requestSubmit(): this;
  update(patch?: Partial<FormProps> | null | undefined, _options?: {}): this;
  setFields(fields: readonly FormField[]): this;
  resetFields(): this;
  cloneProps(props: ResolvedFormProps): ResolvedFormProps;
  autoComplete(type: string): string;
  isSelected(value: FormField['value'] | undefined, optionValue: FormOption['value']): boolean;
  isChecked(value: FormField['value'] | undefined, optionValue: FormOption['value'], checked: boolean | undefined): boolean;
  protected onDestroy(): void;
}
declare function createForm(props?: FormProps, container?: DOMReference): Form;
//#endregion
//#region src/components/validator.d.ts
type ValidatorElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type ValidatorRuleName = keyof ValidatorRule | string;
type ValidatorMessageMap = Record<string, Partial<Record<ValidatorRuleName, string>>>;
type ValidatorCustomResult = boolean | string;
type ValidatorCustomRule = (element: ValidatorElement, validator: Validator) => ValidatorCustomResult;
interface ValidatorRule extends Record<string, unknown> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  equalTo?: string;
  email?: boolean;
  checked?: boolean;
  selected?: boolean;
  multiple?: boolean;
  min?: number;
  max?: number;
  noSpace?: boolean;
  noChinese?: boolean;
  noSpecial?: boolean;
  pattern?: string | RegExp;
  file?: boolean;
  minSize?: number;
  maxSize?: number;
  accept?: string;
  validate?: ValidatorCustomRule;
}
interface ValidatorOptions extends Record<string, unknown> {
  rules?: Record<string, ValidatorRule>;
  messages?: ValidatorMessageMap;
  onSubmit?: ((validator: Validator) => void) | null;
}
interface ResolvedValidatorOptions extends Record<string, unknown> {
  rules: Record<string, ValidatorRule>;
  messages: ValidatorMessageMap;
  onSubmit: ((validator: Validator) => void) | null;
}
interface ValidatorRuntime {
  valid: boolean;
  message: string;
  destroyed: boolean;
}
interface ValidatorCleanup {
  events: IEventManager;
}
interface ResetOptions {
  native?: boolean;
}
/**
 * 表单校验组件。
 *
 * 支持绑定表单 submit/reset 事件，也可以手动调用 validate/reset。
 */
declare class Validator {
  root: HTMLFormElement | null;
  options: ResolvedValidatorOptions | null;
  runtime: ValidatorRuntime;
  cleanup: ValidatorCleanup | null;
  constructor(element: DOMReference, options?: ValidatorOptions, bindEvents?: boolean);
  private resolveRoot;
  private validateOptions;
  private bindEvents;
  private unbindEvents;
  /**
   * 执行表单校验。
   */
  validate(): boolean;
  private validateRule;
  private hasNativeValidationRule;
  private validateRequired;
  private validateMinLength;
  private validateMaxLength;
  private validateEmail;
  private validateEqualTo;
  private validateCheck;
  private validateSelected;
  private validateMultiple;
  private validateSelectMin;
  private validateSelectMax;
  private validateNoSpace;
  private validatePattern;
  private validateFile;
  private validateMinSize;
  private validateMaxSize;
  private validateAccept;
  private validateCustom;
  private showError;
  private showSuccess;
  /**
   * 重置表单与校验状态。
   */
  reset({ native }?: ResetOptions): void;
  /**
   * 销毁当前校验实例。
   */
  destroy(): void;
}
declare function createValidator(element: DOMReference, options?: ValidatorOptions, bindEvents?: boolean): Validator;
//#endregion
//#region src/components/toc.d.ts
interface TocClassNames {
  toc: string;
  list: string;
  link: string;
  active: string;
  levelPrefix: string;
}
type TocClassNameConfig = Partial<TocClassNames>;
interface TocItem {
  id: string;
  text: string;
  level: number;
  element: HTMLHeadingElement;
}
interface TocCurrent {
  index: number;
  item: TocItem | null;
}
interface TocProps extends Record<string, unknown> {
  container?: DOMReference;
  target?: DOMReference;
  headings?: string;
  offset?: number;
  className?: TocClassNameConfig;
  onUpdate?: ((item: TocItem | null, index: number, toc: Toc) => void) | null;
}
interface ResolvedTocProps extends Record<string, unknown> {
  container: DOMReference;
  target: DOMReference;
  headings: string;
  offset: number;
  className: TocClassNames;
  onUpdate: ((item: TocItem | null, index: number, toc: Toc) => void) | null;
}
interface TocState extends Record<string, unknown> {
  items: TocItem[];
  current: TocCurrent;
}
interface TocDOM extends ComponentDOM {
  root: HTMLElement | null;
  container: Element | null;
  target: Element | null;
  list: HTMLElement | null;
  headings: HTMLHeadingElement[];
  links: HTMLAnchorElement[];
}
interface TocRuntime extends ComponentRuntime {
  built: boolean;
  ticking: boolean;
}
/**
 * 页面目录组件。
 *
 * 扫描内容区域内的标题，生成锚点列表，并随页面滚动更新 active 状态。
 */
declare class Toc extends Component<ResolvedTocProps, TocState, TocDOM> {
  runtime: TocRuntime;
  /**
   * 创建 Toc 实例。
   * @param {object} [input={}] Toc 配置。
   */
  constructor(input?: TocProps);
  /**
   * 构建 Toc DOM 和滚动监听。
   * @returns {Toc} 当前实例。
   */
  build(): this;
  private bindEvents;
  private onScroll;
  private onClick;
  private scrollToItem;
  private linkClassName;
  private buildLink;
  private updateActive;
  private setActive;
  /**
   * 重新扫描标题并重建目录列表。
   * @returns {Toc} 当前实例。
   */
  refresh(): this;
  /**
   * 激活并滚动到指定目录项。
   * @param {number} index 目录项索引。
   * @returns {Toc} 当前实例。
   */
  activate(index: number): this;
  /**
   * 销毁实例并清空渲染内容。
   * @private
   */
  protected onDestroy(): void;
}
declare function createToc(props?: TocProps): Toc;
//#endregion
//#region src/components/sticky.d.ts
type StickyOverflow = 'destroy' | 'ignore';
interface StickyProps extends Record<string, unknown> {
  target?: DOMReference;
  parent?: DOMReference;
  max?: number;
  top?: number;
  gap?: number;
  overflow?: StickyOverflow;
  onUpdate?: ((sticky: Sticky) => void) | null;
}
interface ResolvedStickyProps extends Record<string, unknown> {
  target: DOMReference;
  parent: DOMReference;
  max: number;
  top: number;
  gap: number;
  overflow: StickyOverflow;
  onUpdate: ((sticky: Sticky) => void) | null;
}
interface StickyStateItem {
  element: HTMLElement;
  top: number;
}
interface StickyState extends Record<string, unknown> {
  count: number;
  top: number;
  items: StickyStateItem[];
}
interface StickyDOM extends ComponentDOM {
  root: Element | null;
  parent: Element | null;
  targets: HTMLElement[];
}
interface StickyRuntimeItem {
  element: HTMLElement;
  top: number;
  originalPosition: string;
  originalTop: string;
  originalZIndex: string;
}
interface StickyRuntime extends ComponentRuntime {
  active: boolean;
  built: boolean;
  ignored: boolean;
  items: StickyRuntimeItem[];
}
/**
 * Sticky 吸附组件。
 *
 * 用于给一个或多个元素应用 `position: sticky`，并按顺序计算 `top`
 * 偏移，适合页面侧边栏中多个 widget 的堆叠吸附场景。
 */
declare class Sticky extends Component<ResolvedStickyProps, StickyState, StickyDOM> {
  runtime: StickyRuntime;
  /**
   * 创建 Sticky 实例。
   * @param {object} [input={}] Sticky 配置。
   */
  constructor(input?: StickyProps);
  /**
   * 构建 Sticky 行为并应用样式。
   * @returns {Sticky} 当前实例。
   */
  build(): this;
  private captureItems;
  private resolveOverflow;
  private apply;
  private restore;
  /**
   * 重新计算当前实例内所有 sticky 元素的 top。
   * @returns {Sticky} 当前实例。
   */
  refresh(): this;
  destroy(): void;
  /**
   * 销毁实例并恢复被管理元素的原始样式。
   * @private
   */
  protected onDestroy(): void;
}
declare function createSticky(props?: StickyProps): Sticky;
//#endregion
//#region src/components/flow.d.ts
type FlowData = Record<string, unknown>;
type FlowPayload = FlowData | null;
type FlowAction = 'next' | 'back' | 'goTo' | 'finish';
type FlowBusyStrategy = 'ignore' | 'throw';
type FlowDirection = string;
type FlowSlotName = 'renderHeader' | 'renderSteps' | 'renderBody' | 'renderFooter';
type FlowCleanup = () => void;
type FlowStepResult = string | {
  id: string;
  data?: FlowPayload;
};
interface FlowClassNames {
  root: string;
  header: string;
  title: string;
  description: string;
  steps: string;
  step: string;
  active: string;
  complete: string;
  stepButton: string;
  stepIndex: string;
  stepTitle: string;
  body: string;
  footer: string;
  button: string;
  buttonGhost: string;
  buttonPrimary: string;
  reset: string;
  back: string;
  next: string;
}
type FlowClassNameConfig = Partial<FlowClassNames>;
interface FlowStep {
  id: string;
  title?: string;
  description?: string;
  content?: RenderableContent<FlowContext>;
  data?: FlowData;
  modal?: FlowData | ((context: FlowContext) => FlowData | null) | null;
  view?: FlowData;
  onEnter?: FlowLifecycleHook;
  onLeave?: FlowLifecycleHook;
  onNext?: FlowMoveHook;
  onBack?: FlowMoveHook;
  canEnter?: FlowGuardHook;
  canLeave?: FlowGuardHook;
  [key: string]: unknown;
}
type PublicFlowStep = Omit<FlowStep, 'onEnter' | 'onLeave' | 'onNext' | 'onBack' | 'canEnter' | 'canLeave'>;
interface FlowSnapshot {
  id: string;
  currentId: string;
  currentIndex: number;
  previousId: string | null;
  previousIndex: number | null;
  direction: FlowDirection | null;
  history: string[];
  data: FlowData;
  stepData: Record<string, FlowData>;
  currentData: FlowData;
  currentStep: PublicFlowStep | null;
  canBack: boolean;
  canNext: boolean;
  isLast: boolean;
  loading: boolean;
  busyAction: FlowAction | null;
  error: unknown;
}
interface FlowContext {
  flow: Flow;
  step: FlowStep;
  state: FlowState;
  signal: AbortSignal | null;
  snapshot: FlowSnapshot;
  data: FlowData;
  currentData: FlowData;
  payload?: FlowPayload;
  direction?: FlowDirection;
  fromId?: string | null;
  targetId?: string | null;
  setData: (data: FlowPayload) => Flow;
  setStepData: (stepId: string, data: FlowPayload) => Flow;
  getStepData: (stepId: string) => FlowData;
  next: (payload?: FlowPayload) => Promise<FlowSnapshot | null>;
  back: (payload?: FlowPayload) => Promise<FlowSnapshot | null>;
  goTo: (target: FlowTarget, payload?: FlowPayload, options?: FlowGoToOptions) => Promise<FlowSnapshot | null>;
  addCleanup: (cleanup: FlowCleanup) => FlowCleanup;
}
interface FlowRenderContext {
  flow: Flow;
  snapshot: FlowSnapshot;
  state: FlowState;
  steps: (PublicFlowStep | null)[];
  currentStep: PublicFlowStep | null;
  currentData: FlowData;
  data: FlowData;
  fallback: () => RenderableContent<FlowRenderContext>;
  next: (payload?: FlowPayload) => Promise<FlowSnapshot | null>;
  back: (payload?: FlowPayload) => Promise<FlowSnapshot | null>;
  goTo: (target: FlowTarget, payload?: FlowPayload, options?: FlowGoToOptions) => Promise<FlowSnapshot | null>;
  reset: () => Flow;
}
type FlowLifecycleHook = (context: FlowContext) => void | Promise<void>;
type FlowGuardHook = (context: FlowContext) => boolean | void | Promise<boolean | void>;
type FlowMoveHook = (context: FlowContext) => FlowStepResult | FlowPayload | void | Promise<FlowStepResult | FlowPayload | void>;
type FlowFinishHook = (snapshot: FlowSnapshot, flow: Flow) => void | Promise<void>;
type FlowChangeHook = (snapshot: FlowSnapshot, flow: Flow, previous: FlowSnapshot | null) => void;
type FlowErrorHook = (error: unknown, snapshot: FlowSnapshot, flow: Flow, previous: FlowSnapshot | null) => void;
type FlowBusyHook = (action: FlowAction, snapshot: FlowSnapshot, flow: Flow) => void;
type FlowSlot = false | null | ((context: FlowRenderContext) => RenderableContent<FlowRenderContext>);
type FlowSubscriber = (snapshot: FlowSnapshot, flow: Flow, previous: FlowSnapshot | null) => void;
type FlowTarget = string | number;
interface FlowText {
  back: string;
  next: string;
  finish: string;
  reset: string;
  [key: string]: string;
}
interface FlowOptions extends Record<string, unknown> {
  id?: string | null;
  steps?: FlowStep[];
  initial?: string | number | null;
  cache?: boolean;
  linear?: boolean;
  render?: boolean;
  rollbackOnError?: boolean;
  busyStrategy?: FlowBusyStrategy;
  showHeader?: boolean;
  showFooter?: boolean;
  showSteps?: boolean;
  showBack?: boolean;
  showNext?: boolean;
  showReset?: boolean;
  text?: Partial<FlowText>;
  className?: FlowClassNameConfig | string;
  renderHeader?: FlowSlot;
  renderSteps?: FlowSlot;
  renderBody?: FlowSlot;
  renderFooter?: FlowSlot;
  onChange?: FlowChangeHook | null;
  onNext?: FlowMoveHook | null;
  onBack?: FlowMoveHook | null;
  onFinish?: FlowFinishHook | null;
  onError?: FlowErrorHook | null;
  onBusy?: FlowBusyHook | null;
}
interface ResolvedFlowOptions extends Record<string, unknown> {
  id: string;
  steps: FlowStep[];
  initial: string | number | null;
  cache: boolean;
  linear: boolean;
  render: boolean;
  rollbackOnError: boolean;
  busyStrategy: FlowBusyStrategy;
  showHeader: boolean;
  showFooter: boolean;
  showSteps: boolean;
  showBack: boolean;
  showNext: boolean;
  showReset: boolean;
  text: FlowText;
  className: FlowClassNames;
  renderHeader: FlowSlot;
  renderSteps: FlowSlot;
  renderBody: FlowSlot;
  renderFooter: FlowSlot;
  onChange: FlowChangeHook | null;
  onNext: FlowMoveHook | null;
  onBack: FlowMoveHook | null;
  onFinish: FlowFinishHook | null;
  onError: FlowErrorHook | null;
  onBusy: FlowBusyHook | null;
}
interface FlowState extends Record<string, unknown> {
  id: string;
  currentId: string;
  currentIndex: number;
  previousId: string | null;
  previousIndex: number | null;
  direction: FlowDirection | null;
  history: string[];
  data: FlowData;
  stepData: Record<string, FlowData>;
  loading: boolean;
  error: unknown;
  busyAction: FlowAction | null;
  version: number;
}
interface FlowGoToOptions {
  direction?: FlowDirection;
  internal?: boolean;
}
interface FlowRunActionOptions {
  internal?: boolean;
}
/**
 * Headless 流程控制器，带可选默认 UI。
 *
 * 适合在 Modal、Offcanvas、页面表单或任意业务组件中复用 next/back/goTo、步骤缓存和生命周期。
 */
declare class Flow {
  options: ResolvedFlowOptions;
  steps: FlowStep[];
  state: FlowState;
  root: HTMLElement | null;
  private stepMap;
  private initialStepId;
  private initialData;
  private subscribers;
  private renderDispose;
  private cleanupTasks;
  private nodes;
  private destroyed;
  private activeAction;
  private actionController;
  /**
   * 创建 Flow 实例。
   * @param {FlowOptions} [options={}] Flow 配置。
   */
  constructor(options?: FlowOptions);
  /**
   * 当前步骤。
   * @returns {FlowStep}
   */
  get currentStep(): FlowStep;
  /**
   * 当前步骤数据。
   * @returns {object}
   */
  get currentData(): FlowData;
  /**
   * 是否可以返回上一步。
   * @returns {boolean}
   */
  get canBack(): boolean;
  /**
   * 是否可以前进。
   * @returns {boolean}
   */
  get canNext(): boolean;
  /**
   * 是否处于最后一步。
   * @returns {boolean}
   */
  get isLast(): boolean;
  /**
   * 订阅状态变化。
   * @param {Function} handler 订阅函数。
   * @returns {Function} 取消订阅函数。
   */
  subscribe(handler: FlowSubscriber): FlowCleanup;
  /**
   * 获取不可变快照。
   * @returns {object}
   */
  snapshot(): FlowSnapshot;
  /**
   * 挂载默认 Flow UI。
   * @param {Element|Node|string|Array} container DOM 容器、选择器或 JSX/h 返回节点。
   * @returns {Flow}
   */
  mount(container: DOMReference): this;
  /**
   * 卸载默认 UI。
   * @returns {Flow}
   */
  unmount(): this;
  /**
   * 前进一步。
   * @param {object|null} [payload=null] 当前步骤需要缓存的数据。
   * @returns {Promise<object>} 切换后的快照。
   */
  next(payload?: FlowPayload): Promise<FlowSnapshot | null>;
  /**
   * 返回上一步。
   * @param {object|null} [payload=null] 当前步骤需要缓存的数据。
   * @returns {Promise<object>} 切换后的快照。
   */
  back(payload?: FlowPayload): Promise<FlowSnapshot | null>;
  /**
   * 跳转到指定步骤。
   * @param {string|number} target 目标步骤 id 或索引。
   * @param {object|null} [payload=null] 当前步骤需要缓存的数据。
   * @param {{direction?:string, internal?:boolean}} [options={}] 跳转选项。
   * @returns {Promise<object>} 切换后的快照。
   */
  goTo(target: FlowTarget, payload?: FlowPayload, options?: FlowGoToOptions): Promise<FlowSnapshot | null>;
  /**
   * 合并全局数据。
   * @param {object} data 数据补丁。
   * @returns {Flow}
   */
  setData(data: FlowPayload): this;
  /**
   * 合并指定步骤缓存数据。
   * @param {string} stepId 步骤 id。
   * @param {object|null} data 数据补丁。
   * @returns {Flow}
   */
  setStepData(stepId: string, data: FlowPayload, options?: {
    silent?: boolean;
  }): this;
  /**
   * 获取指定步骤缓存数据。
   * @param {string} stepId 步骤 id。
   * @returns {object}
   */
  getStepData(stepId: string): FlowData;
  /**
   * 重置流程。
   * @returns {Flow}
   */
  reset(): this;
  /**
   * 完成流程。
   * @param {object|null} [payload=null] 最后一步需要缓存的数据。
   * @returns {Promise<object>} 当前快照。
   */
  finish(payload?: FlowPayload, options?: FlowRunActionOptions): Promise<FlowSnapshot | null>;
  /**
   * 销毁 Flow 实例。
   * @returns {void}
   */
  destroy(): void;
  private resolveInitialStepId;
  private validateSteps;
  private resolveStepIndex;
  private createInitialStepData;
  private runMoveHook;
  private transitionTo;
  private assertCanLeave;
  private assertCanEnter;
  private createContext;
  private runAction;
  private handleBusy;
  private abortActiveAction;
  private callHook;
  private createAbortError;
  private setLoading;
  private handleError;
  private emitChange;
  private replaceObject;
  private captureState;
  private restoreState;
  private addCleanup;
  private assertActive;
  private publicStep;
  private buildRoot;
  private mountView;
  private view;
  private renderSlot;
  private createRenderContext;
  private headerView;
  private stepsView;
  private bodyView;
  private footerView;
  private contentView;
  private stepClass;
}
/**
 * 创建 Flow 实例。
 * @param {FlowOptions} options Flow 配置。
 * @returns {Flow}
 */
declare function createFlow(options?: FlowOptions): Flow;
//#endregion
//#region src/components/parabola.d.ts
type ParabolaDirection = 'center' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
interface ParabolaBallOptions {
  color: string;
  size: string;
}
interface ParabolaClassNames {
  ball: string;
}
type ParabolaClassNameConfig = Partial<ParabolaClassNames>;
interface ParabolaOptions extends Record<string, unknown> {
  ball?: ParabolaBallOptions;
  className?: ParabolaClassNameConfig;
  from?: DOMReference;
  to?: DOMReference;
  direction?: ParabolaDirection;
  showDelay?: number;
  hideDelay?: number;
  onShow?: ((parabola: Parabola) => void) | null;
  onHidden?: ((parabola: Parabola) => void) | null;
}
interface ResolvedParabolaOptions extends Record<string, unknown> {
  ball: ParabolaBallOptions;
  className: ParabolaClassNames;
  from: DOMReference;
  to: DOMReference;
  direction: ParabolaDirection;
  showDelay: number;
  hideDelay: number;
  onShow: ((parabola: Parabola) => void) | null;
  onHidden: ((parabola: Parabola) => void) | null;
}
/**
 * 抛物线动画组件。
 *
 * 用于实现“加入购物车”等从一个元素飞向另一个元素的小球动画。
 */
declare class Parabola {
  options: ResolvedParabolaOptions;
  hidden: boolean;
  _ball: HTMLElement | null;
  _animationId: number | null;
  _fromEl: Element | null;
  _toEl: Element | null;
  private showTimerId;
  /**
   * 创建抛物线动画实例。
   * @param {ParabolaOptions} options 动画配置。
   */
  constructor(options?: ParabolaOptions);
  private createBall;
  private calculatePath;
  private easeOutCubic;
  private animate;
  /**
   * 开始播放动画。
   * @returns {Promise<boolean>} 成功开始动画时返回 true；元素缺失或已销毁时返回 false。
   */
  show(): Promise<boolean>;
  /**
   * 销毁动画实例并清理 DOM、定时器和动画帧。
   * @returns {void}
   */
  destroy(): void;
  /**
   * show 的语义化别名。
   * @returns {Promise<boolean>}
   */
  start(): Promise<boolean>;
}
declare function createParabola(options?: ParabolaOptions): Parabola;
//#endregion
//#region src/components/tabs.d.ts
type TabsDirection = 'top' | 'bottom' | 'left' | 'right';
type TabsValue = number | string;
type TabsDisabled = TabsValue | TabsValue[];
interface TabsClassNames {
  root: string;
  top: string;
  bottom: string;
  left: string;
  right: string;
  wrap: string;
  list: string;
  tab: string;
  panelWrap: string;
  panel: string;
  disabled: string;
  dragging: string;
}
type TabsClassNameConfig = Partial<TabsClassNames>;
interface TabsPanelContext {
  tabs: Tabs;
  item: TabItem;
  index: number;
  name: string | number;
}
interface TabTitleContext {
  tabs: Tabs;
  item: TabItem;
}
type TabPanel = RenderableContent<TabsPanelContext> | ((context: TabsPanelContext) => RenderableContent<TabsPanelContext>) | ((context: TabsPanelContext) => Promise<RenderableContent<TabsPanelContext>>);
interface TabItem extends Record<string, unknown> {
  name?: string;
  title: RenderableContent<TabTitleContext>;
  panel: TabPanel;
  cache?: boolean;
  ttl?: number;
}
interface TabsProps extends Record<string, unknown> {
  id?: string | null;
  direction?: TabsDirection;
  active?: TabsValue;
  disabled?: TabsDisabled;
  onChange?: ((index: number, name: string | number, tab: HTMLElement | undefined, panel: HTMLElement | undefined) => void | Promise<void>) | null;
  tabs?: TabItem[];
  className?: TabsClassNameConfig;
  onAdd?: ((index: number, item: TabItem, tab: HTMLElement | undefined, panel: HTMLElement | undefined) => void | Promise<void>) | null;
  onRemove?: ((index: number, name: string | undefined) => void | Promise<void>) | null;
}
interface ResolvedTabsProps extends Record<string, unknown> {
  id: string;
  direction: TabsDirection;
  active: TabsValue;
  disabled: TabsDisabled;
  onChange: NonNullable<TabsProps['onChange']> | null;
  tabs: TabItem[];
  className: TabsClassNames;
  onAdd: NonNullable<TabsProps['onAdd']> | null;
  onRemove: NonNullable<TabsProps['onRemove']> | null;
}
interface TabsState extends Record<string, unknown> {
  current: {
    index: number;
    name: string | null;
  };
  disabled: {
    names: string[];
    indexes: number[];
  };
  isVertical: boolean;
  draggable: boolean;
  loading: boolean;
}
interface TabsDOM extends ComponentDOM {
  root: HTMLElement | null;
  container: Element;
  tabs: HTMLElement[];
  panels: HTMLElement[];
}
interface TabsPanelCacheEntry {
  content: RenderableContent<TabsPanelContext>;
  updatedAt: number;
}
interface TabsRuntime extends ComponentRuntime {
  cache: {
    panels: Map<string, TabsPanelCacheEntry>;
  };
  panelLoadId: number;
}
/**
 * 标签页组件，继承 Component。
 *
 * DOM 创建一次，通过 createEffect 细粒度更新 class/ARIA。
 */
declare class Tabs extends Component<ResolvedTabsProps, TabsState, TabsDOM> {
  runtime: TabsRuntime;
  state: TabsState;
  private bindingsDispose;
  private isDragging;
  private raf;
  private resizeRaf;
  private velocity;
  /**
   * @param {Element|Node|string|Array} container 挂载容器（元素、选择器或 JSX/h 返回节点）。
   * @param {object} [input={}] 标签页配置。
   */
  constructor(container: DOMReference, input?: TabsProps);
  protected onInit(props: ResolvedTabsProps): void;
  private buildRoot;
  private rebuildItems;
  private parseDisabled;
  private createDisabledState;
  private syncCurrent;
  private getPanelKey;
  private getCachedPanel;
  private setCachedPanel;
  private renderPanelContent;
  private loadPanel;
  get activeIndex(): number;
  get disabledNames(): string[];
  private bindEvents;
  private unbindEvents;
  private assertActive;
  private getIndex;
  private activateInternal;
  /**
   * 激活指定标签。
   * @param {number|string} val 标签索引或名称。
   */
  activate(val: TabsValue): Promise<void>;
  /**
   * 将组件挂载到构造器指定的容器中。
   */
  build(): this;
  render(): this;
  /**
   * 动态新增标签。
   * @param {object} tabConfig 标签配置。
   */
  add(tabConfig: TabItem): Promise<void>;
  /**
   * 根据索引或名称删除标签。
   * @param {number|string} val 标签索引或名称。
   */
  delete(val: TabsValue): Promise<void>;
  /**
   * 根据索引或名称禁用标签。
   * @param {number|string} val 标签索引或名称。
   */
  disable(val: TabsValue): void;
  /**
   * 根据索引或名称启用标签。
   * @param {number|string} val 标签索引或名称。
   */
  enable(val: TabsValue): void;
  private resolveActiveIndex;
  private syncActiveNames;
  /**
   * 使用新配置重新初始化状态。
   * @param {object} [patch={}] 需要覆盖的配置。
   */
  reInit(patch?: TabsProps): Promise<void>;
  private get dragContainer();
  private get dragInner();
  private initDrag;
  private bindDragEvents;
  private startInertiaScroll;
  private removeDragEvents;
  private refreshDrag;
  protected onDestroy(): void;
}
declare function createTabs(container: DOMReference, input?: TabsProps): Tabs;
//#endregion
//#region src/components/accordion.d.ts
type AccordionActive = number | string | Array<number | string> | null;
interface AccordionClassNames {
  root: string;
  header: string;
  title: string;
  arrow: string;
  panel: string;
  content: string;
}
type AccordionClassNameConfig = Partial<AccordionClassNames>;
interface AccordionItem extends Record<string, unknown> {
  name?: string;
  title: RenderableContent<AccordionContentContext>;
  content: RenderableContent<AccordionContentContext>;
}
interface AccordionProps extends Record<string, unknown> {
  id?: string | null;
  active?: AccordionActive;
  collapsible?: boolean;
  multiple?: boolean;
  className?: AccordionClassNameConfig;
  items?: AccordionItem[];
  onChange?: ((index: number, name: string, header: HTMLElement, panel: HTMLElement, accordion: Accordion) => void | Promise<void>) | null;
}
interface ResolvedAccordionProps extends Record<string, unknown> {
  id: string;
  active: AccordionActive;
  collapsible: boolean;
  multiple: boolean;
  className: AccordionClassNames;
  items: AccordionItem[];
  onChange: NonNullable<AccordionProps['onChange']> | null;
}
interface AccordionState extends Record<string, unknown> {
  activeNames: string[];
  current: {
    index: number | null;
    name: string | null;
  };
}
interface AccordionDOM extends ComponentDOM {
  root: HTMLElement | null;
  container: Element;
  headers: HTMLElement[];
  panels: HTMLElement[];
}
interface AccordionRuntime extends ComponentRuntime {}
interface AccordionContentContext {
  accordion: Accordion;
  item: AccordionItem;
  index: number;
  type: 'title' | 'content';
  active: boolean;
}
/**
 * 轻量手风琴组件，继承 Component。
 *
 * DOM 创建一次，通过 createEffect 细粒度更新 class/ARIA。
 */
declare class Accordion extends Component<ResolvedAccordionProps, AccordionState, AccordionDOM> {
  runtime: AccordionRuntime;
  state: AccordionState;
  private bindingsDispose;
  /**
   * @param {Element|Node|string|Array} container 挂载容器（元素、选择器或 JSX/h 返回节点）。
   * @param {object} [input={}] 手风琴配置。
   */
  constructor(container: DOMReference, input?: AccordionProps);
  protected onInit(props: ResolvedAccordionProps): void;
  private buildRoot;
  private buildItems;
  private contentView;
  private resolveActiveNames;
  private syncActiveNames;
  private bindEvents;
  private unbindEvents;
  isActive(name: string): boolean;
  private assertActive;
  private activateItem;
  getIndex(val: number | string | undefined | null): number;
  /**
   * 激活指定面板。
   * @param {number|string} val 面板索引或名称。
   */
  active(val: number | string | undefined): Promise<void>;
  /**
   * 将组件挂载到构造器指定的容器中。
   */
  build(): this;
  render(): this;
  /**
   * 动态替换全部面板条目。
   * @param {AccordionItem[]} items 新面板配置。
   * @param {number|string|Array<number|string>|null} [active=0] 替换后默认激活项。
   */
  setItems(items: AccordionItem[], active?: AccordionActive): this;
  protected onDestroy(): void;
}
declare function createAccordion(container: DOMReference, input?: AccordionProps): Accordion;
//#endregion
//#region src/components/drop.d.ts
type DropMode = 'hover' | 'click';
type DropPosition = 'auto' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'left' | 'right';
interface DropClassNames {
  root: string;
  container: string;
}
type DropClassNameConfig = Partial<DropClassNames>;
interface DropDelay {
  show?: number;
  hide?: number;
}
interface DropProps extends Record<string, unknown> {
  name?: string | null;
  mode?: DropMode;
  position?: DropPosition;
  offset?: number;
  content?: RenderableContent<Drop>;
  className?: DropClassNameConfig;
  id?: string | null;
  delay?: number | DropDelay;
  hoverIntent?: boolean;
  onShown?: ((drop: Drop) => void | Promise<void>) | null;
  onHidden?: ((drop: Drop) => void | Promise<void>) | null;
}
interface ResolvedDropProps extends Record<string, unknown> {
  name: string | null;
  mode: DropMode;
  position: DropPosition;
  offset: number;
  content: RenderableContent<Drop>;
  className: DropClassNames;
  id: string;
  delay: number | DropDelay;
  hoverIntent: boolean;
  onShown: NonNullable<DropProps['onShown']> | null;
  onHidden: NonNullable<DropProps['onHidden']> | null;
}
interface DropCleanup {
  events: IEventManager;
}
/**
 * 通用浮层组件。
 *
 * 可用于菜单、提示、下拉面板等场景，支持点击或 hover 触发，并自动计算视口内位置。
 */
declare class Drop {
  target: Element | null;
  props: ResolvedDropProps | null;
  root: HTMLElement | null;
  isVisible: boolean;
  cleanup: DropCleanup | null;
  delayShow: number;
  delayHide: number;
  private timer;
  private hoverIntentData;
  private lastX;
  private lastY;
  constructor(element: DOMReference, options?: DropProps);
  private init;
  private buildDrop;
  private bindEvents;
  private bindRootEvents;
  private unbindRootEvents;
  private unbindEvents;
  private startHoverIntent;
  private cancelHoverIntent;
  private onMouseMove;
  private setPosition;
  private docClick;
  private exec;
  show(useDelay?: boolean): void;
  hide(useDelay?: boolean): void;
  toggle(): void;
  destroy(): void;
}
declare function createDrop(container: DOMReference, input?: DropProps): Drop;
//#endregion
//#region src/components/tooltip.d.ts
interface TooltipClassNames {
  container: string;
  message: string;
}
type TooltipClassNameConfig = Partial<TooltipClassNames>;
interface TooltipProps extends Record<string, unknown> {
  name?: string | null;
  mode?: DropMode;
  position?: DropPosition;
  offset?: number;
  message?: string;
  className?: TooltipClassNameConfig;
  id?: string | null;
  delay?: number | DropDelay;
  hoverIntent?: boolean;
  onShown?: ((drop: Drop) => void | Promise<void>) | null;
  onHidden?: ((drop: Drop) => void | Promise<void>) | null;
}
interface ResolvedTooltipProps extends Record<string, unknown> {
  name: string | null;
  mode: DropMode;
  position: DropPosition;
  offset: number;
  message: string;
  className: TooltipClassNames;
  id: string | null;
  delay: number | DropDelay;
  hoverIntent: boolean;
  onShown: NonNullable<TooltipProps['onShown']> | null;
  onHidden: NonNullable<TooltipProps['onHidden']> | null;
}
/**
 * Tooltip 提示组件。
 *
 * 基于 Drop 实现，提供更轻量的文本提示封装。
 */
declare class Tooltip {
  drop: Drop | null;
  props: ResolvedTooltipProps | null;
  constructor(element: DOMReference, props?: TooltipProps);
  private buildContent;
  show(useDelay?: boolean): void;
  hide(useDelay?: boolean): void;
  toggle(): void;
  destroy(): void;
}
declare function createTooltip(element: DOMReference, props?: TooltipProps): Tooltip;
//#endregion
//#region src/components/offcanvas.d.ts
type OffcanvasDirection = 'top' | 'right' | 'bottom' | 'left';
type OffcanvasAnimation = 'slide' | 'none';
interface OffcanvasClassNames {
  root: string;
  overlay: string;
  content: string;
  active: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
  slide: string;
  none: string;
}
type OffcanvasClassNameConfig = Partial<OffcanvasClassNames>;
type OffcanvasContent = RenderableContent<Offcanvas> | ((offcanvas: Offcanvas) => Promise<RenderableContent<Offcanvas>>);
interface OffcanvasProps extends Record<string, unknown> {
  content?: OffcanvasContent;
  overlay?: boolean;
  filter?: boolean;
  cache?: boolean;
  ttl?: number;
  direction?: OffcanvasDirection;
  animation?: OffcanvasAnimation;
  bgClose?: boolean;
  escClose?: boolean;
  id?: string | null;
  className?: OffcanvasClassNameConfig;
  onShow?: ((offcanvas: Offcanvas) => void | Promise<void>) | null;
  onShown?: ((offcanvas: Offcanvas) => void | Promise<void>) | null;
  onHide?: ((offcanvas: Offcanvas) => void | Promise<void>) | null;
  onHidden?: ((offcanvas: Offcanvas) => void | Promise<void>) | null;
}
interface ResolvedOffcanvasProps extends Record<string, unknown> {
  content: OffcanvasContent;
  overlay: boolean;
  filter: boolean;
  cache: boolean;
  ttl: number;
  direction: OffcanvasDirection;
  animation: OffcanvasAnimation;
  bgClose: boolean;
  escClose: boolean;
  id: string;
  className: OffcanvasClassNames;
  onShow: NonNullable<OffcanvasProps['onShow']> | null;
  onShown: NonNullable<OffcanvasProps['onShown']> | null;
  onHide: NonNullable<OffcanvasProps['onHide']> | null;
  onHidden: NonNullable<OffcanvasProps['onHidden']> | null;
}
interface OffcanvasState extends Record<string, unknown> {
  visible: boolean;
  loading: boolean;
}
interface OffcanvasDOM extends ComponentDOM {
  root: HTMLElement | null;
  content: HTMLElement | null;
}
interface OffcanvasCache {
  content: RenderableContent<Offcanvas>;
  hasContent: boolean;
  updatedAt: number;
}
interface OffcanvasRuntime extends ComponentRuntime {
  cache: OffcanvasCache;
  contentLoadId: number;
}
/**
 * 侧滑面板组件，继承 Component。
 *
 * 适用于侧边菜单、筛选面板、移动端抽屉等场景。
 */
declare class Offcanvas extends Component<ResolvedOffcanvasProps, OffcanvasState, OffcanvasDOM> {
  runtime: OffcanvasRuntime;
  state: OffcanvasState;
  _overlay: HTMLElement | null;
  constructor(input?: OffcanvasProps);
  protected onInit(props: ResolvedOffcanvasProps): void;
  private buildOverlay;
  private buildRoot;
  private isCacheValid;
  private renderContent;
  private loadContent;
  private bindEvents;
  unbindEvents(): void;
  private renderPanel;
  private removePanel;
  show(): Promise<void>;
  hide(): Promise<void>;
  onDestroy(): void;
}
declare function createOffcanvas(options?: OffcanvasProps): Offcanvas;
//#endregion
//#region src/components/modal.d.ts
type ModalStyle = string | Record<string, string | number | null | undefined> | null;
type ModalTextInput = Partial<ModalText> & Record<string, unknown>;
type ModalContent = RenderableContent<Modal>;
type FlowDirection$1 = 'next' | 'back';
interface ModalClassNames {
  layout: string;
  modal: string;
  fullscreen: string;
  header: string;
  body: string;
  footer: string;
  title: string;
  close: string;
  cancel: string;
  confirm: string;
  button: string;
  buttonIcon: string;
  buttonGhost: string;
  buttonPrimary: string;
  buttonSmall: string;
  formContainer: string;
}
type ModalClassNameConfig = Partial<ModalClassNames>;
interface ModalText {
  title: string;
  confirm: string;
  cancel: string;
}
interface FlowStep$1 {
  id?: string;
  title?: RenderableContent<Modal>;
  content?: ModalContent;
  modal?: ModalFlowView | ModalFlowViewFactory;
  view?: ModalFlowView | ModalFlowViewFactory;
  [key: string]: unknown;
}
interface FlowSnapshot$1 {
  data?: Record<string, unknown> | null;
  currentData?: Record<string, unknown> | null;
  currentStep?: FlowStep$1;
  [key: string]: unknown;
}
interface FlowLike {
  currentStep?: FlowStep$1;
  next: (payload: FormDataRecord | null) => Promise<FlowSnapshot$1> | FlowSnapshot$1;
  back: (payload: FormDataRecord | null) => Promise<FlowSnapshot$1> | FlowSnapshot$1;
  snapshot: () => FlowSnapshot$1;
  reset?: () => void;
  destroy?: () => void;
}
interface ModalFlowView extends Partial<ModalProps> {
  [key: string]: unknown;
}
type ModalFlowViewFactory = (context: {
  flow: FlowLike;
  snapshot: FlowSnapshot$1 | null;
  step: FlowStep$1 | undefined;
  modal: Modal;
  data: Record<string, unknown> | null;
  currentData: Record<string, unknown> | null;
}) => unknown;
interface ModalProps extends Record<string, unknown> {
  content?: ModalContent;
  position?: string;
  showCancel?: boolean;
  showClose?: boolean;
  fullscreen?: boolean;
  flow?: FlowLike | null;
  text?: ModalTextInput;
  onShow?: ((modal: Modal) => void | Promise<void>) | null;
  onShown?: ((modal: Modal) => void | Promise<void>) | null;
  onHide?: ((modal: Modal) => void | Promise<void>) | null;
  onHidden?: ((modal: Modal) => void | Promise<void>) | null;
  onConfirm?: ((modal: Modal) => void | Promise<void>) | null;
  onSubmit?: ((data: FormDataRecord, modal: Modal) => void | Promise<void>) | null;
  onCancel?: ((modal: Modal) => void | Promise<void>) | null;
  fields?: readonly FormField[] | null;
  header?: boolean;
  footer?: boolean;
  style?: ModalStyle;
  id?: string | null;
  escClose?: boolean;
  bgClose?: boolean;
  lazy?: boolean;
  className?: ModalClassNameConfig;
}
interface ResolvedModalProps extends Record<string, unknown> {
  content: ModalContent;
  position: string;
  showCancel: boolean;
  showClose: boolean;
  fullscreen: boolean;
  flow: FlowLike | null;
  text: ModalText;
  onShow: NonNullable<ModalProps['onShow']> | null;
  onShown: NonNullable<ModalProps['onShown']> | null;
  onHide: NonNullable<ModalProps['onHide']> | null;
  onHidden: NonNullable<ModalProps['onHidden']> | null;
  onConfirm: NonNullable<ModalProps['onConfirm']> | null;
  onSubmit: NonNullable<ModalProps['onSubmit']> | null;
  onCancel: NonNullable<ModalProps['onCancel']> | null;
  fields: FormField[] | null;
  header: boolean;
  footer: boolean;
  style: ModalStyle;
  id: string;
  escClose: boolean;
  bgClose: boolean;
  lazy: boolean;
  className: ModalClassNames;
}
interface ModalState extends ResolvedModalProps {
  loading: boolean;
  submitting: boolean;
  visible: boolean;
  data: FormDataRecord | null;
  extraData: FormDataRecord | null;
}
interface ModalDOM extends ComponentDOM {
  root: HTMLElement | null;
  modal: HTMLElement | null;
  header: HTMLElement | null;
  body: HTMLElement | null;
  footer: HTMLElement | null;
  form: Form | null;
  formContainer: HTMLElement | null;
}
interface ModalRuntime extends ComponentRuntime {
  scrollLocked: boolean;
  visibleApplied: boolean;
}
interface ModalCache {
  initial: ResolvedModalProps | null;
  fieldIds: Map<string, string> | null;
  baseStyle: string;
  previousActiveElement: HTMLElement | null;
  formId: string;
}
interface ModalCleanupExtras {
  visibility?: (() => void) | null;
  view?: (() => void) | null;
  hideTimer?: ReturnType<typeof setTimeout> | null;
}
type ModalPatch = Partial<ModalProps>;
type ModalStatePatch = Partial<ModalState>;
declare class Modal extends Component<ResolvedModalProps, ModalState, ModalDOM> {
  runtime: ModalRuntime;
  state: ModalState;
  cleanup: Component['cleanup'] & ModalCleanupExtras;
  cache: ModalCache;
  constructor(input?: ModalProps);
  protected onInit(): void;
  buildRoot(): HTMLElement;
  mountView(): void;
  headerView(): () => (Node | null)[] | null;
  footerView(): () => (Node | null)[] | null;
  bodyView(): RenderableContent<Modal>;
  formView(): HTMLElement;
  mountForm(container: HTMLElement | null): void;
  createFormProps(): FormProps;
  destroyForm(): void;
  contentView(content: ModalContent): Node[];
  bindReactiveLoading(): void;
  bindReactiveStyle(): void;
  isFormMode(): boolean;
  isBusy(): boolean;
  validatePropsPatch(patch: ModalPatch, namespace?: string): void;
  applyProps(patch: ModalPatch, { validate, force }?: {
    validate?: boolean;
    force?: boolean;
  }): this;
  applyStyle(element: HTMLElement, style: ModalStyle): void;
  bindReactiveVisibility(): void;
  applyVisibility(visible: boolean): void;
  showFromState(): void;
  hideFromState(): void;
  bindEvents(root: Element | null): void;
  bindOverlayCloseEvent(root: Element | null): void;
  bindDocumentKeyEvent(): void;
  bindInsideEvent(): void;
  clearEvents(): void;
  requestSubmit(): void;
  handleFormSubmit(formData: FormDataRecord): Promise<void>;
  handleNext(): Promise<void>;
  handleBack(): Promise<void>;
  hasFlow(): this is this & {
    state: ModalState & {
      flow: FlowLike;
    };
  };
  moveFlow(direction: FlowDirection$1): Promise<void>;
  createFlowPayload(): FormDataRecord | null | false;
  resolveFlowModalView(flow: FlowLike, snapshot: FlowSnapshot$1 | null, step?: FlowStep$1): ModalFlowView;
  syncFlowView(flow: FlowLike | null, snapshot?: FlowSnapshot$1 | null): void;
  handleConfirm(): Promise<void>;
  handleCancel(): Promise<void>;
  handleSubmit(data: FormDataRecord): Promise<void>;
  trapFocus(event: KeyboardEvent): void;
  focusFirst(): void;
  lockScroll(): void;
  unlockScroll(): void;
  cancelHideTimer(): void;
  resetAnimationStyles(): void;
  finishHide(onHidden: ResolvedModalProps['onHidden']): void;
  restoreFocus(): void;
  assertActive(method: string): void;
  validateStatePatch(patch: ModalStatePatch): void;
  setState(patch?: ModalStatePatch): this;
  show(): this;
  hide(): this;
  setFields(data: readonly FormField[] | null, force?: boolean): this;
  addFields(data: FormDataRecord): this;
  setContent(content: ModalContent, force?: boolean): this;
  update(patch?: Partial<ResolvedModalProps> | null, options?: ComponentUpdateOptions): this;
  update(patch?: ModalPatch | null, force?: boolean): this;
  reset(): this;
  resetContent(): this;
  resetFields(): this;
  protected onDestroy(): void;
  destroy(): this;
}
declare function createModal(input?: ModalProps): Modal;
//#endregion
//#region src/components/pagination.d.ts
interface PaginationPage {
  size: number;
  current: number;
}
interface PaginationCount {
  sibling: number;
  boundary: number;
}
interface PaginationClassNames {
  root: string;
  list: string;
  item: string;
  more: string;
  button: string;
  buttonIcon: string;
  buttonGhost: string;
  active: string;
  loading: string;
}
type PaginationClassNameConfig = Partial<PaginationClassNames>;
interface PaginationProps extends Record<string, unknown> {
  total?: number;
  page?: Partial<PaginationPage>;
  count?: Partial<PaginationCount>;
  lock?: boolean;
  onChange?: ((page: number, instance: Pagination) => void | Promise<unknown>) | null;
  className?: PaginationClassNameConfig;
}
interface ResolvedPaginationProps extends Record<string, unknown> {
  total: number;
  page: PaginationPage;
  count: PaginationCount;
  lock: boolean;
  onChange: NonNullable<PaginationProps['onChange']> | null;
  className: PaginationClassNames;
}
interface PaginationState extends Record<string, unknown> {
  total: number;
  page: PaginationPage;
  count: PaginationCount;
  pageCount: number;
  locked: boolean;
}
interface PageItem {
  type: 'page';
  key: string;
  page: number;
}
interface MoreItem {
  type: 'more';
  key: string;
}
type PaginationItem = PageItem | MoreItem;
type PageAction = 'prev' | 'next';
type Dispose = () => void;
type EffectDispose = {
  dispose: () => void;
};
interface PaginationDOM extends ComponentDOM {
  root: HTMLElement | null;
  container: Element | null;
  list: HTMLElement | null;
  prev: HTMLElement | null;
  next: HTMLElement | null;
  pageNodes: HTMLElement[];
  items: PaginationItem[];
}
interface PaginationRuntime extends ComponentRuntime {
  built: boolean;
  itemsKey: string;
  changeId: number;
}
interface PaginationCleanupExtras {
  controls?: Dispose | null;
  itemsEffect?: EffectDispose | null;
}
/**
 * 分页组件。
 *
 * 构造器只验证和保存配置；调用 build() 后才挂载 DOM 和绑定交互。
 */
declare class Pagination extends Component {
  props: ResolvedPaginationProps;
  state: PaginationState;
  dom: PaginationDOM;
  runtime: PaginationRuntime;
  cleanup: Component['cleanup'] & PaginationCleanupExtras;
  /**
   * @param {Element|Node|string|Array} container 挂载容器。
   * @param {object} [input={}] 分页配置。
   */
  constructor(container: DOMReference, input?: PaginationProps);
  /**
   * 构建分页 DOM 并绑定事件。
   * @returns {Pagination} 当前实例。
   */
  build(): this;
  /**
   * 跳转到指定页码。
   * @param {number} page 新页码。
   * @returns {Pagination} 当前实例。
   */
  go(page: number): this;
  /**
   * 更新分页配置。
   * @param {object} [newProps={}] 新配置，会与当前 props 合并。
   * @returns {Pagination} 当前实例。
   */
  update(newProps?: PaginationProps): this;
  _getPageCount(total: number, size: number): number;
  _getPageItems(): PaginationItem[];
  _getItemsKey(): string;
  _isLocked(): boolean;
  _isPrevDisabled(): boolean;
  _isNextDisabled(): boolean;
  _buttonClass(...extra: string[]): string;
  _buildControlItem(type: PageAction): HTMLElement;
  _buildPageItem(item: PaginationItem): HTMLElement;
  _bindControlState(): void;
  _bindPageItems(): void;
  _renderPageItems(): void;
  _bindEvents(): void;
  _assertActive(method: string): void;
  protected onDestroy(): void;
}
declare function createPagination(container: DOMReference, props?: PaginationProps): Pagination;
//#endregion
//#region src/components/swiper.d.ts
interface SwiperClassNames {
  root: string;
  wrapper: string;
  slide: string;
  image: string;
  title: string;
  pagination: string;
  paginationHorizontal: string;
  paginationClickable: string;
  paginationBulletGroup: string;
  indicator: string;
  bullet: string;
  navigation: string;
  prev: string;
  next: string;
  active: string;
  disabled: string;
  loading: string;
  loaded: string;
  error: string;
}
type SwiperClassNameConfig = Partial<SwiperClassNames>;
interface SwiperDataItem extends Record<string, unknown> {
  image?: string | null;
  url?: string | null;
  title?: string | null;
  sort?: number | null;
  blank?: boolean | null;
  children?: RenderableContent<SwiperSlideContext> | null;
}
interface NormalizedSwiperDataItem extends SwiperDataItem {
  blank: boolean;
  index: number;
}
interface SwiperSlideContext {
  swiper: Swiper;
  item: NormalizedSwiperDataItem;
  index: number;
}
interface SwiperOptions extends Record<string, unknown> {
  data?: SwiperDataItem[] | null;
  loop?: boolean;
  autoplay?: boolean;
  delay?: number;
  lazyload?: boolean;
  pagination?: boolean;
  navigation?: boolean;
  speed?: number;
  touchRatio?: number;
  touchAngle?: number;
  longSwipesMs?: number;
  longSwipesRatio?: number;
  preventClick?: boolean;
  className?: SwiperClassNameConfig;
}
interface ResolvedSwiperOptions extends Record<string, unknown> {
  data: SwiperDataItem[] | null;
  loop: boolean;
  autoplay: boolean;
  delay: number;
  lazyload: boolean;
  pagination: boolean;
  navigation: boolean;
  speed: number;
  touchRatio: number;
  touchAngle: number;
  longSwipesMs: number;
  longSwipesRatio: number;
  preventClick: boolean;
  className: SwiperClassNames;
}
interface SwiperState extends Record<string, unknown> {
  index: number;
  trackIndex: number;
  transform: number;
  animating: boolean;
  width: number;
}
interface SwiperDOM extends ComponentDOM {
  root: HTMLElement | null;
  container: DOMReference;
  mountTarget: Element | null;
  createdRoot: boolean;
  createdSlides: boolean;
  wrapper: HTMLElement | null;
  slides: HTMLElement[];
  pagination: HTMLElement | null;
  prevButton: HTMLButtonElement | null;
  nextButton: HTMLButtonElement | null;
  bullets: HTMLButtonElement[];
  createdPagination: boolean;
  createdPrevButton: boolean;
  createdNextButton: boolean;
}
interface SwipeLog {
  x: number;
  y: number;
  time: number;
}
interface SwipePoint {
  pageX?: number;
  pageY?: number;
  clientX?: number;
  clientY?: number;
}
interface SwiperRuntime extends ComponentRuntime {
  logs: SwipeLog[];
  startTarget: EventTarget | null;
  touching: boolean;
  scrolling: boolean;
  swiping: boolean;
  clickPrevented: boolean;
  timer: ReturnType<typeof setInterval> | null;
  imageCleanups: Set<() => void>;
  realCount: number;
}
interface SwiperCleanupExtras {
  bindings?: (() => void) | null;
  navBindings?: (() => void) | null;
}
type SwiperUpdateOptions = Partial<ComponentUpdateOptions>;
type SwiperDirection = 'prev' | 'next';
/**
 * 轻量轮播组件，继承 Component。
 *
 * 支持链接 slide、图片 lazyload、分页、导航、loop 和桌面/移动端拖拽滑动。
 * 使用 vanilla-signal 响应式管理 pagination 和 navigation 状态。
 */
declare class Swiper extends Component<ResolvedSwiperOptions, SwiperState, SwiperDOM> {
  props: ResolvedSwiperOptions;
  state: SwiperState;
  dom: SwiperDOM;
  runtime: SwiperRuntime;
  cleanup: Component['cleanup'] & SwiperCleanupExtras;
  private _built;
  /**
   * 创建轮播实例。
   * @param {Element|Node|string|Array} container 挂载容器、选择器或 JSX/h 返回节点。
   * @param {object} [options={}] Swiper 配置。
   */
  constructor(container: DOMReference, options?: SwiperOptions);
  /**
   * 构建或绑定 Swiper DOM。
   * @returns {Swiper} 当前实例。
   */
  build(): this;
  set index(v: unknown);
  set trackIndex(v: unknown);
  set transform(v: unknown);
  set animating(v: unknown);
  set width(v: unknown);
  get realCount(): number;
  get realIndex(): number;
  assertBuilt(method: string): void;
  createDataView(root: HTMLElement, data: SwiperDataItem[] | null): HTMLElement;
  normalizeData(data: SwiperDataItem[] | null): NormalizedSwiperDataItem[];
  createDataSlide(item: NormalizedSwiperDataItem, index: number): HTMLElement;
  protected onInit(): void;
  protected onDestroy(): void;
  updateSize(): void;
  refreshSlides(): void;
  initLoop(): void;
  setupStyles(): void;
  reInitView(): void;
  clearPagination(): void;
  clearNavigation(): void;
  bindEvents(): void;
  onStart(point: SwipePoint, target?: EventTarget | null): void;
  onMove(point: SwipePoint, event: Event): void;
  onEnd(): void;
  resetDrag(animate?: boolean): void;
  onTransitionEnd(event?: Event): void;
  pushLog(point: SwipePoint): void;
  getDuration(): number;
  getOffset(): {
    x: number;
    y: number;
  };
  toRealIndex(index?: number): number;
  trackIndexForRealIndex(index: number): number;
  setTrackIndex(trackIndex: number, animate?: boolean | null): void;
  slideTo(index: number): void;
  slideToTrack(idx: number): void;
  next(): void;
  prev(): void;
  render(animate: boolean): void;
  loadImages(): void;
  clearImageCleanups(): void;
  initPagination(): void;
  initNavigation(): void;
  ensureNavigation(direction: SwiperDirection, iconName: 'arrow-left' | 'arrow-right'): HTMLButtonElement;
  play(): void;
  pause(): void;
  resume(): void;
  restartAutoplay(): void;
  update(propsPatch?: SwiperOptions | null | undefined, { force }?: SwiperUpdateOptions): this;
  protected onUpdate(propsPatch?: Partial<ResolvedSwiperOptions> | null | undefined, _options?: Required<ComponentUpdateOptions>): void;
  updateData(data?: SwiperDataItem[] | null): this;
}
declare function createSwiper(container: DOMReference, input?: SwiperOptions): Swiper;
//#endregion
//#region src/components/menu.d.ts
type MenuType = string;
type MenuItemId = string | number;
interface MenuClassNames {
  root: string;
  list: string;
  item: string;
  hasChildren: string;
  link: string;
  subMenu: string;
  back: string;
  active: string;
  icon: string;
  iconPrefix: string;
  text: string;
}
type MenuClassNameConfig = Partial<MenuClassNames>;
interface MenuItem extends Record<string, unknown> {
  id?: MenuItemId;
  title: string | number;
  url?: string;
  target?: string;
  classes?: string | string[];
  children?: MenuItem[];
}
interface MenuOptions extends Record<string, unknown> {
  type?: MenuType;
  id?: string;
  items?: MenuItem[];
  backText?: string;
  className?: MenuClassNameConfig;
}
interface ResolvedMenuOptions extends Record<string, unknown> {
  type: MenuType;
  id: string;
  items: MenuItem[];
  backText: string;
  className: MenuClassNames;
}
interface MenuDOM {
  root: HTMLElement | null;
}
interface MenuCleanup {
  events: IEventManager;
  items?: (() => void) | null;
}
/**
 * 菜单组件。
 *
 * 支持绑定已有菜单 DOM，也支持通过配置动态创建移动菜单或底部菜单。
 */
declare class Menu {
  options: ResolvedMenuOptions | null;
  dom: MenuDOM;
  cleanup: MenuCleanup | null;
  private _element;
  private _bound;
  private _destroyed;
  /**
   * 创建菜单实例。
   * @param {MenuOptions} [options={}] 菜单配置。
   * @param {Element|Node|string|Array|false} [element=false] 已有菜单节点、选择器或 JSX/h 返回节点；默认 `false` 按 items 动态创建。
   */
  constructor(options?: MenuOptions, element?: DOMReference);
  get root(): HTMLElement | null;
  /**
   * 校验菜单数据。
   * @private
   * @param {MenuItem[]} items 菜单数据。
   * @returns {void}
   */
  _verifyItems(items: MenuItem[]): void;
  /**
   * 构建菜单。
   *
   * element 为 false 时动态创建 DOM；否则绑定已有节点。
   * @returns {Menu}
   */
  build(): this;
  /**
   * 根据 items 创建菜单根节点。
   * @private
   * @returns {HTMLElement}
   */
  _buildRoot(): HTMLElement;
  /**
   * 递归创建菜单项。
   * @private
   * @param {MenuItem} item 菜单项配置。
   * @returns {HTMLElement}
   */
  _buildItem(item: MenuItem): HTMLElement;
  /**
   * 根据菜单类型绑定交互事件。
   * @private
   * @returns {void}
   */
  _bindEvents(): void;
  /**
   * 解绑当前菜单实例绑定的事件。
   * @private
   * @returns {void}
   */
  _unbindEvents(): void;
  /**
   * 清理当前构建出的 DOM 与事件，可选择保留实例引用用于重建。
   * @private
   * @param {object} [options={}] 清理选项。
   * @param {boolean} [options.keepElement=false] 是否保留初始 element 引用。
   * @returns {void}
   */
  _teardown({ keepElement }?: {
    keepElement?: boolean;
  }): void;
  /**
   * 处理移动端有子菜单项的进入操作。
   * @private
   * @param {HTMLElement} menuItem 菜单项节点。
   * @returns {void}
   */
  _handleMenuClick(menuItem: HTMLElement): void;
  /**
   * 处理移动端子菜单返回操作。
   * @private
   * @param {Element} target 点击目标。
   * @returns {void}
   */
  _handleBack(target: Element): void;
  /**
   * 切换底部菜单激活状态。
   * @private
   * @param {HTMLElement} menuItem 菜单项节点。
   * @returns {void}
   */
  _toggleActive(menuItem: HTMLElement): void;
  _clearActive(): void;
  /**
   * 替换菜单数据；动态创建的菜单会在已构建时重建 DOM。
   * @param {MenuItem[]} items 新菜单数据。
   * @returns {Menu}
   */
  setItems(items: MenuItem[]): this;
  /**
   * 根据 id 移除菜单项。
   * @param {string|number} id 菜单项 id。
   * @returns {Menu}
   */
  removeItem(id: MenuItemId): this;
  /**
   * 销毁当前菜单实例并解绑事件。
   * @returns {void}
   */
  destroy(): void;
}
declare function createMenu(options?: MenuOptions, element?: DOMReference): Menu;
//#endregion
export { Accordion, AccordionActive, AccordionClassNameConfig, AccordionClassNames, AccordionContentContext, AccordionItem, AccordionProps, CleanupFunction, Component, ContainerExpect, DOMReference, DebounceOptions, DebouncedFunction, Destroyable, Drop, DropClassNameConfig, DropClassNames, DropDelay, DropMode, DropPosition, DropProps, Flow, FlowAction, FlowBusyHook, FlowBusyStrategy, FlowChangeHook, FlowClassNameConfig, FlowClassNames, FlowCleanup, FlowContext, FlowData, FlowDirection, FlowErrorHook, FlowFinishHook, FlowGuardHook, FlowLifecycleHook, FlowMoveHook, FlowOptions, FlowPayload, FlowRenderContext, FlowSlot, FlowSlotName, FlowSnapshot, FlowState, FlowStep, FlowStepResult, FlowSubscriber, FlowTarget, FlowText, Form, FormButton, FormClassNameConfig, FormClassNames, FormDataRecord, FormDataValue, FormField, FormOption, FormProps, FormValidatorConfig, IEventManager, IconAttributeValue, IconName, IconPathMap, IconProps, LazyRenderCallback, LazyRenderOptions, LazyRenderTarget, Menu, MenuClassNameConfig, MenuClassNames, MenuItem, MenuItemId, MenuOptions, MenuType, Modal, ModalClassNameConfig, ModalClassNames, ModalProps, ModalText, NormalizeContext, Offcanvas, OffcanvasAnimation, OffcanvasClassNameConfig, OffcanvasClassNames, OffcanvasContent, OffcanvasDirection, OffcanvasProps, Pagination, PaginationClassNameConfig, PaginationClassNames, PaginationCount, PaginationPage, PaginationProps, Parabola, ParabolaBallOptions, ParabolaClassNameConfig, ParabolaClassNames, ParabolaDirection, ParabolaOptions, ParamRule, ParamRuleInput, PublicFlowStep, QueryContext, RenderableContent, RequireContainerResult, ResolveContainerResult, ResolveSchema, ResolvedProps, Sticky, StickyOverflow, StickyProps, StickyStateItem, Swiper, SwiperClassNameConfig, SwiperClassNames, SwiperDataItem, SwiperOptions, SwiperSlideContext, TabItem, TabPanel, TabTitleContext, Tabs, TabsClassNameConfig, TabsClassNames, TabsDirection, TabsDisabled, TabsPanelContext, TabsProps, TabsValue, Theme, ThemeClassNameConfig, ThemeClassNames, ThemeConfigKey, ThemeOptions, ThemePanelGroup, Toast, ToastActionProps, ToastClassNameConfig, ToastClassNames, ToastOptions, ToastType, Toc, TocClassNameConfig, TocClassNames, TocCurrent, TocItem, TocProps, Tooltip, TooltipClassNameConfig, TooltipClassNames, TooltipProps, ValidateCondition, Validator, ValidatorOptions, ValidatorRule, addIcons, all, copy, createAccordion, createDrop, createEventManager, createFlow, createForm, createLoading, createMenu, createModal, createOffcanvas, createPagination, createParabola, createSticky, createSwiper, createTabs, createToc, createTooltip, createValidator, debounce, getCookie, getRegistedIconPath, getType, hasOwn, icon, iconHtml, iconMarkup, isClass, isElement, isFunction, isMobile, isNode, isPlainObject, isRenderableContent, lazyRender, listen, normalizeContentNodes, postJson, q, randomId, removeCookie, requireContainer, resolveContainer, resolveElement, resolveNode, resolveNodeList, resolveProps, restUrl, service, setCookie, throttle, timer, uniq, uuid, validateParam };
import { MaybeAccessor, Renderable } from "vanilla-signal";
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
      getHighEntropyValues: (hints: string[]) => Promise<Record<string, unknown>>;
    };
    msMaxTouchPoints?: number;
  }
  interface Window {
    opera?: string;
  }
}
/**
 * 采用 MDN 推荐的组合策略：特性检测优先，UA 嗅探兜底
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
type SupportES2022 = boolean;
declare function isModernBrowser(): SupportES2022;
declare function checkModernBrowser(): SupportES2022;
//#endregion
//#region src/utilities/id.d.ts
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
declare function asRenderable<TContext>(value: RenderableContent<TContext>): Renderable;
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
 * 当前站点 WordPress REST API 根地址。
 * @type {string}
 */
declare const restUrl: string;
/**
 * 发送 JSON POST 请求并解析 JSON 响应。
 * @template T - 期望返回的 JSON 数据类型
 * @param {string} url - 请求地址
 * @param {unknown} body - 请求体，会被 JSON.stringify
 * @param {RequestInit} [options] - 透传给 fetch 的请求配置（排除 method 和 body）
 * @returns {Promise<T>} 解析后的 JSON 响应体
 */
declare function postJson<T = unknown>(url: string, body: unknown, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T>;
//#endregion
//#region src/core/motion.d.ts
type TransitionTarget = () => Element | null | undefined;
interface TransitionDefinition {
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  options?: KeyframeAnimationOptions;
  respectReducedMotion?: boolean;
}
interface MotionController {
  enter: (signal?: AbortSignal) => Promise<void>;
  leave: (signal?: AbortSignal) => Promise<void>;
  cancel: () => void;
}
interface CollapseTransitionDefinition {
  axis?: 'vertical' | 'horizontal';
  options?: KeyframeAnimationOptions;
  fade?: boolean;
  respectReducedMotion?: boolean;
}
interface CollapseMotionController extends MotionController {
  setExpanded: (expanded: boolean) => void;
}
declare function createMotionGroup(...motions: readonly MotionController[]): MotionController;
declare function createTransition(target: TransitionTarget, definition: TransitionDefinition): MotionController;
declare function createCollapseTransition(target: () => HTMLElement | null | undefined, definition?: CollapseTransitionDefinition): CollapseMotionController;
//#endregion
//#region src/utilities/object.d.ts
declare function isPlainObject(value: unknown): boolean;
//#endregion
//#region src/utilities/timer.d.ts
declare const timer: {
  timers: Record<string, number>;
  start(key: string, duration: number, callback: () => void): void;
  cancel(key: string): void;
};
//#endregion
//#region src/utilities/types.d.ts
type LooseRecord = Record<string, unknown>;
type ValueTypeName = string;
type TypeRule = ValueTypeName | readonly ValueTypeName[];
declare function isNilValue(value: unknown): value is null | undefined;
declare function isDomNodeValue(value: unknown): value is Node;
declare function isDomElementValue(value: unknown): value is Element;
declare function isHtmlElementValue(value: unknown): value is HTMLElement;
declare function isRenderablePrimitive(value: unknown): value is string | number | boolean;
declare function isRenderableValue(value: unknown): boolean;
declare const getType: (val: unknown) => string;
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
  nonEmpty?: boolean;
  minLength?: number;
  maxLength?: number;
  finite?: boolean;
  integer?: boolean;
  min?: number;
  max?: number;
  greaterThan?: number;
  lessThan?: number;
  plain?: boolean;
  items?: ParamRuleInput;
  shape?: ResolveSchema;
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
declare function validateParam<TInput extends LooseRecord = LooseRecord>(name: string, value: unknown, rule?: ParamRuleInput<TInput>, namespace?: string): unknown;
declare function resolveProps<TInput extends LooseRecord, TSchema extends ResolveSchema<TInput>>(input?: TInput | null | undefined, schema?: TSchema, namespace?: string): TInput & ResolvedProps<TSchema>;
//#endregion
//#region src/core/scheduler.d.ts
interface ScheduledTask {
  schedule: () => void;
  flush: () => void;
  cancel: () => void;
  dispose: () => void;
}
declare function createScheduledTask(run: () => void): ScheduledTask;
//#endregion
//#region src/utilities/state.d.ts
interface StateSyncOptions {
  deferInitial?: boolean;
  flushInitial?: boolean;
  flush?: 'microtask' | 'sync';
}
declare function getStoreVersion(value: unknown): number;
declare function trackStoreVersion<T>(value: T): T;
declare function stateSnapshot<T>(value: T): T;
/**
 * Bridges reactive state to an expensive imperative effect. Declarative view
 * bindings should depend on state directly instead of using this helper.
 */
declare function createStateSync<TSnapshot>(read: () => TSnapshot, sync: (snapshot: TSnapshot) => void | Promise<void>, { deferInitial, flushInitial, flush }?: StateSyncOptions): () => void;
//#endregion
//#region src/utilities/refs.d.ts
interface ElementRef<TElement extends Element> {
  readonly current: TElement | null;
  set: (element: TElement) => void;
  clear: () => void;
}
declare function createElementRef<TElement extends Element>(): ElementRef<TElement>;
interface KeyedElementRefs<TKey, TElement extends Element> {
  readonly elements: ReadonlyMap<TKey, TElement>;
  get: (key: TKey) => TElement | undefined;
  bind: (key: TKey) => (element: TElement) => void;
  delete: (key: TKey) => void;
  clear: () => void;
}
declare function createKeyedElementRefs<TKey, TElement extends Element>(): KeyedElementRefs<TKey, TElement>;
//#endregion
//#region src/core/view.d.ts
interface OwnedView<TElement extends Element> {
  element: TElement;
  dispose: () => void;
}
interface OwnedViewOptions {
  removeOnDispose?: boolean;
}
/**
 * Creates one stable view inside a vanilla-signal owner.
 * Reactive accessors declared by the factory retain the owner, while the
 * factory itself is not turned into a replaceable dynamic region.
 */
declare function createOwnedView<TElement extends Element>(factory: () => TElement, options?: OwnedViewOptions): OwnedView<TElement>;
//#endregion
//#region src/core/presence.d.ts
type PresencePhase = 'hidden' | 'entering' | 'visible' | 'leaving';
interface PresenceOptions {
  elements: () => readonly (Element | null | undefined)[];
  mount: () => void;
  activate: () => void;
  deactivate: () => void;
  unmount: () => void;
  motion?: MotionController;
}
interface PresenceController {
  readonly phase: PresencePhase;
  enter: () => Promise<boolean>;
  leave: () => Promise<boolean>;
  cancel: () => void;
}
declare function waitForMotion(elements: readonly Element[], signal?: AbortSignal): Promise<void>;
declare function createPresence(options: PresenceOptions): PresenceController;
//#endregion
//#region src/primitives/icons.d.ts
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
//#region src/primitives/loading.d.ts
type flexPosition = 'center' | 'flex-start' | 'flex-end';
/**
 * 创建通用加载状态节点
 * 定位 absolute 撑满父元素 居中 背景模糊滤镜
 * @returns {HTMLElement}
 */
declare function createLoading(xDirection?: flexPosition, yDirection?: flexPosition): HTMLDivElement;
//#endregion
//#region src/primitives/popup.d.ts
interface PopupProps extends Record<string, unknown> {
  className?: string;
  position?: string;
  component?: string;
  labelledby?: string;
  content?: RenderableContent;
}
declare function createPopup(props?: PopupProps): HTMLElement;
//#endregion
//#region src/primitives/drop.d.ts
type DropMode$1 = 'hover' | 'click';
type DropPosition$1 = 'auto' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'left' | 'right';
interface DropClassNames {
  root: string;
  container: string;
}
type DropClassNameConfig = Partial<DropClassNames>;
interface DropDelay$1 {
  show?: number;
  hide?: number;
}
type DropContent = RenderableContent<DropInstance> | ((drop: DropInstance) => RenderableContent<DropInstance> | Promise<RenderableContent<DropInstance>>);
interface DropProps extends Record<string, unknown> {
  name?: string | null;
  mode?: DropMode$1;
  position?: DropPosition$1;
  offset?: number;
  content?: DropContent;
  cache?: boolean;
  ttl?: number;
  className?: DropClassNameConfig;
  id?: string | null;
  delay?: number | DropDelay$1;
  hoverIntent?: boolean;
  onShown?: ((drop: DropInstance) => void | Promise<void>) | null;
  onHidden?: ((drop: DropInstance) => void | Promise<void>) | null;
}
interface ResolvedDropProps extends Record<string, unknown> {
  name: string | null;
  mode: DropMode$1;
  position: DropPosition$1;
  offset: number;
  content: DropContent;
  cache: boolean;
  ttl: number;
  className: DropClassNames;
  id: string;
  delay: number | DropDelay$1;
  hoverIntent: boolean;
  onShown: NonNullable<DropProps['onShown']> | null;
  onHidden: NonNullable<DropProps['onHidden']> | null;
}
interface DropInstance {
  readonly target: Element | null;
  readonly props: ResolvedDropProps;
  readonly element: HTMLElement | null;
  readonly isVisible: boolean;
  readonly delayShow: number;
  readonly delayHide: number;
  show(useDelay?: boolean): void;
  hide(useDelay?: boolean): void;
  toggle(): void;
  destroy(): void;
}
/**
 * 通用浮层组件。
 *
 * 可用于菜单、提示、下拉面板等场景，支持点击或 hover 触发，并自动计算视口内位置。
 */
declare function createDrop(reference: DOMReference, input?: DropProps): DropInstance;
//#endregion
//#region src/primitives/tooltip.d.ts
type DropInstance$1 = ReturnType<typeof createDrop>;
type DropMode = 'hover' | 'click';
type DropPosition = 'auto' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'left' | 'right';
interface DropDelay {
  show?: number;
  hide?: number;
}
interface TooltipInstance {
  readonly element: HTMLElement | null;
  readonly drop: DropInstance$1 | null;
  show(useDelay?: boolean): void;
  hide(useDelay?: boolean): void;
  toggle(): void;
  destroy(): void;
}
interface TooltipClassNames {
  container: string;
  message: string;
  ui: TooltipThemeClassNames;
}
interface TooltipThemeClassNames {
  reverse: string;
  primary: string;
  success: string;
  warning: string;
  error: string;
}
type TooltipTheme = false | 'reverse' | 'primary' | 'success' | 'warning' | 'error';
type TooltipClassNameConfig = Partial<Omit<TooltipClassNames, 'ui'>> & {
  ui?: Partial<TooltipThemeClassNames>;
};
interface TooltipProps extends Record<string, unknown> {
  name?: string | null;
  mode?: DropMode;
  position?: DropPosition;
  offset?: number;
  message?: string;
  theme?: TooltipTheme;
  cache?: boolean;
  ttl?: number;
  className?: TooltipClassNameConfig;
  id?: string | null;
  delay?: number | DropDelay;
  hoverIntent?: boolean;
  onShown?: ((drop: DropInstance$1) => void | Promise<void>) | null;
  onHidden?: ((drop: DropInstance$1) => void | Promise<void>) | null;
}
/**
 * Tooltip 提示组件。
 *
 * 基于 Drop 实现，提供更轻量的文本提示封装。
 */
declare function createTooltip(element: DOMReference, input?: TooltipProps): TooltipInstance;
//#endregion
//#region src/primitives/toast.d.ts
type ToastTheme = 'info' | 'success' | 'warning' | 'error' | 'primary';
interface ToastClassNames {
  container: string;
  toast: string;
  icon: string;
  message: string;
  lite: string;
  confirm: string;
  buttons: string;
  button: string;
  closeBtn: string;
  confirmBtn: string;
  info: string;
  success: string;
  warning: string;
  error: string;
  primary: string;
}
type ToastClassNameConfig = Partial<ToastClassNames>;
interface ToastClassNameOptions {
  className?: ToastClassNameConfig;
}
interface ToastThemeOptions extends ToastClassNameOptions {
  theme?: ToastTheme;
}
interface ToastOptions extends ToastThemeOptions {
  duration?: number;
  loading?: MaybeAccessor<boolean>;
  text?: {
    loading?: string;
  };
  onClose?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}
interface ToastConfirmProps extends ToastThemeOptions {
  text?: {
    close?: string;
    confirm?: string;
  };
  onConfirm?: () => void | Promise<void>;
  onClose?: () => void | Promise<void>;
}
declare function hide(toast: HTMLElement | null | undefined): void;
declare function show(message?: string, options?: ToastOptions): HTMLElement;
declare function lite(message?: string, duration?: number, className?: ToastClassNameConfig): HTMLElement;
declare function confirm(message?: string, props?: ToastConfirmProps): HTMLElement;
declare function clearAll(): void;
declare const Toast: {
  timers: Set<string>;
  disposers: Map<HTMLElement, () => void>;
  configure(options?: ToastClassNameOptions): ToastClassNameOptions;
  show: typeof show;
  success: (message?: string, options?: ToastOptions) => HTMLElement;
  info: (message?: string, options?: ToastOptions) => HTMLElement;
  primary: (message?: string, options?: ToastOptions) => HTMLElement;
  warning: (message?: string, options?: ToastOptions) => HTMLElement;
  error: (message?: string, options?: ToastOptions) => HTMLElement;
  hide: typeof hide;
  lite: typeof lite;
  confirm: typeof confirm;
  clearAll: typeof clearAll;
  destroyAll: typeof clearAll;
};
//#endregion
//#region src/primitives/theme.d.ts
type ThemeConfigKey = 'mode' | 'theme' | 'radius' | 'shadow' | 'font';
interface ThemeClassNames {
  panel: string;
  title: string;
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
interface ThemeResolvedOptions {
  mode: string;
  theme: string;
  radius: string;
  shadow: string;
  font: string;
  key: string;
  className: ThemeClassNames;
}
interface ThemeInstance {
  props: ThemeResolvedOptions;
  createPanel(containerClass?: string | null, panelConfig?: ThemePanelGroup[] | null): HTMLElement;
  setConfig(newConfig: ThemeOptions): void;
  destroy(): void;
}
declare function createTheme(options?: ThemeOptions): ThemeInstance;
//#endregion
//#region src/primitives/parabola.d.ts
type ParabolaDirection = 'center' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
interface ParabolaBallProps {
  color: string;
  size: string;
}
interface ParabolaClassNames {
  ball: string;
}
type ParabolaClassNameConfig = Partial<ParabolaClassNames>;
interface ParabolaProps extends Record<string, unknown> {
  ball?: ParabolaBallProps;
  className?: ParabolaClassNameConfig;
  from?: DOMReference;
  to?: DOMReference;
  direction?: ParabolaDirection;
  showDelay?: number;
  onShow?: ((parabola: ParabolaInstance) => void) | null;
  onHidden?: ((parabola: ParabolaInstance) => void) | null;
}
interface ResolvedParabolaProps extends Record<string, unknown> {
  ball: ParabolaBallProps;
  className: ParabolaClassNames;
  from: DOMReference;
  to: DOMReference;
  direction: ParabolaDirection;
  showDelay: number;
  onShow: ((parabola: ParabolaInstance) => void) | null;
  onHidden: ((parabola: ParabolaInstance) => void) | null;
}
interface ParabolaRuntime {
  destroyed: boolean;
}
interface ParabolaInstance {
  readonly props: ResolvedParabolaProps;
  readonly element: HTMLElement | null;
  readonly runtime: ParabolaRuntime;
  show(): Promise<boolean>;
  destroy(): void;
}
declare function createParabola(input?: ParabolaProps): ParabolaInstance;
//#endregion
//#region src/primitives/sticky.d.ts
type StickyOverflow = 'destroy' | 'ignore';
interface StickyProps extends Record<string, unknown> {
  target?: DOMReference;
  parent?: DOMReference;
  max?: number;
  top?: number;
  gap?: number;
  overflow?: StickyOverflow;
  reactive?: boolean;
  onReBuild?: ((sticky: StickyInstance) => void) | null;
}
interface ResolvedStickyProps extends Record<string, unknown> {
  target: DOMReference;
  parent: DOMReference;
  max: number;
  top: number;
  gap: number;
  overflow: StickyOverflow;
  reactive: boolean;
  onReBuild: ((sticky: StickyInstance) => void) | null;
}
interface StickyStateItem {
  key: string;
  index: number;
  top: number;
}
interface StickyState extends Record<string, unknown> {
  items: StickyStateItem[];
}
interface StickyRuntime {
  built: boolean;
  destroyed: boolean;
  reBuilding: boolean;
  reBuildFrameId: number;
}
interface StickyInstance {
  readonly props: ResolvedStickyProps;
  readonly state: StickyState;
  readonly runtime: StickyRuntime;
  build(): StickyInstance;
  reBuild(): StickyInstance;
  destroy(): void;
}
declare function createSticky(props?: StickyProps): StickyInstance;
//#endregion
//#region src/validation/validator.d.ts
type ValidatorElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type ValidatorMessageMap = Record<string, Partial<Record<string, string>>>;
type ValidatorCustomResult = boolean | string;
type ValidatorCustomRule = (element: ValidatorElement, validator: ValidatorInstance) => ValidatorCustomResult;
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
interface ValidatorProps extends Record<string, unknown> {
  rules?: Record<string, ValidatorRule>;
  messages?: ValidatorMessageMap;
  onSubmit?: ((validator: ValidatorInstance) => void) | null;
}
interface ResolvedValidatorProps extends Record<string, unknown> {
  rules: Record<string, ValidatorRule>;
  messages: ValidatorMessageMap;
  onSubmit: ((validator: ValidatorInstance) => void) | null;
}
interface ValidatorRuntime {
  valid: boolean;
  message: string;
  destroyed: boolean;
}
interface ResetOptions {
  native?: boolean;
}
interface ValidatorInstance {
  readonly element: HTMLFormElement | null;
  props: ResolvedValidatorProps | null;
  runtime: ValidatorRuntime;
  validate(): boolean;
  reset(options?: ResetOptions): void;
  destroy(): void;
}
declare function createValidator(element: DOMReference, props?: ValidatorProps, bindEvents?: boolean): ValidatorInstance;
//#endregion
//#region src/core/component.d.ts
type ComponentProps = Record<string, unknown>;
type ComponentState = Record<string, unknown>;
type ComponentCleanup = void | (() => void) | {
  destroy: () => void;
};
type ComponentPluginOptions = Record<string, unknown> | undefined;
interface ComponentRuntime {
  built: boolean;
  mounted: boolean;
  destroyed: boolean;
}
type ComponentLifecycleEvent = 'build' | 'mount' | 'unmount' | 'destroy';
type ComponentListener = (...args: unknown[]) => void;
interface ComponentController<TProps extends ComponentProps = ComponentProps, TState extends ComponentState = ComponentState, TElement extends Element = HTMLElement> {
  readonly props: TProps;
  readonly state: TState;
  readonly runtime: ComponentRuntime;
  readonly element: TElement | null;
  build(): this;
  mount(container: Element | DocumentFragment): this;
  unmount(): this;
  setState(patch?: Partial<TState> | null): this;
  setState<TKey extends keyof TState>(key: TKey, value: TState[TKey]): this;
  own(cleanup: ComponentCleanup): this;
  use(plugin: ComponentPlugin<this> | null | undefined, options?: ComponentPluginOptions): this;
  on(event: string, listener: ComponentListener): this;
  off(event: string, listener: ComponentListener): this;
  emit(event: string, ...args: unknown[]): this;
  destroy(): void;
}
type ComponentPlugin<TComponent = ComponentController> = ((component: TComponent, options?: ComponentPluginOptions) => ComponentCleanup) | {
  install: (component: TComponent, options?: ComponentPluginOptions) => ComponentCleanup;
};
interface ComponentContext<TProps extends ComponentProps, TState extends ComponentState, TElement extends Element> {
  readonly props: TProps;
  readonly state: TState;
  readonly runtime: ComponentRuntime;
  readonly element: TElement | null;
  own: (cleanup: ComponentCleanup) => void;
  assertActive: (operation: string) => void;
  emit: (event: string, ...args: unknown[]) => void;
}
interface ComponentDefinition<TProps extends ComponentProps, TState extends ComponentState, TElement extends Element, TActions extends object> {
  name: string;
  ownsElement?: boolean;
  props: TProps;
  state: TState;
  view: (context: ComponentContext<TProps, TState, TElement>) => TElement;
  actions?: TActions;
  normalizeStatePatch?: (patch: Partial<TState>) => Partial<TState>;
  validateStatePatch?: (patch: Partial<TState>, state: TState) => void;
  onBuild?: (context: ComponentContext<TProps, TState, TElement>) => void;
  onMount?: (context: ComponentContext<TProps, TState, TElement>) => void;
  onUnmount?: (context: ComponentContext<TProps, TState, TElement>) => void;
  onDestroy?: (context: ComponentContext<TProps, TState, TElement>) => void;
}
type FunctionalComponent<TProps extends ComponentProps, TState extends ComponentState, TElement extends Element, TActions extends object = object> = ComponentController<TProps, TState, TElement> & TActions;
declare function useComponentPlugin(name: string, plugin: ComponentPlugin | null | undefined): void;
declare function removeComponentPlugin(name: string): void;
declare function defineComponent<TProps extends ComponentProps, TState extends ComponentState, TElement extends Element, TActions extends object = object>(definition: ComponentDefinition<TProps, TState, TElement, TActions>): FunctionalComponent<TProps, TState, TElement, TActions>;
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
}
interface TocCurrent {
  index: number;
  item: TocItem | null;
}
interface TocProps extends Record<string, unknown> {
  target?: DOMReference;
  headings?: string;
  offset?: number;
  reactive?: boolean;
  className?: TocClassNameConfig;
  onChange?: ((item: TocItem | null, index: number, toc: TocInstance) => void) | null;
}
interface ResolvedTocProps extends Record<string, unknown> {
  target: DOMReference;
  headings: string;
  offset: number;
  reactive: boolean;
  className: TocClassNames;
  onChange: ((item: TocItem | null, index: number, toc: TocInstance) => void) | null;
}
interface TocState extends Record<string, unknown> {
  items: TocItem[];
  current: TocCurrent;
}
interface TocActions {
  activate(index: number): TocInstance;
}
type TocInstance = FunctionalComponent<ResolvedTocProps, TocState, HTMLElement, TocActions>;
declare function createToc(props?: TocProps): TocInstance;
//#endregion
//#region src/components/accordion.d.ts
type AccordionActive = number | string | Array<number | string> | null;
type AccordionDirection = 'vertical' | 'horizontal';
type AccordionContent = RenderableContent<AccordionContentContext> | ((context: AccordionContentContext) => Promise<RenderableContent<AccordionContentContext>>);
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
  content: AccordionContent;
  cache?: boolean;
  ttl?: number;
}
interface AccordionProps extends Record<string, unknown> {
  id?: string | null;
  active?: AccordionActive;
  collapsible?: boolean;
  multiple?: boolean;
  direction?: AccordionDirection;
  className?: AccordionClassNameConfig;
  data: AccordionItem[];
  onChange?: ((index: number, name: string, header: HTMLElement, panel: HTMLElement, accordion: AccordionInstance) => void | Promise<void>) | null;
}
interface ResolvedAccordionProps extends Record<string, unknown> {
  id: string;
  active: AccordionActive;
  collapsible: boolean;
  multiple: boolean;
  direction: AccordionDirection;
  className: AccordionClassNames;
  data: AccordionItem[];
  onChange: NonNullable<AccordionProps['onChange']> | null;
}
interface AccordionCurrent {
  index: number | null;
  name: string | null;
}
interface AccordionState extends Record<string, unknown> {
  data: AccordionItem[];
  activeNames: string[];
  loading: boolean;
}
interface AccordionContentContext {
  accordion: AccordionInstance;
  item: AccordionItem;
  index: number;
  type: 'title' | 'content';
  active: boolean;
}
type AccordionInstance = FunctionalComponent<ResolvedAccordionProps, AccordionState, HTMLElement, AccordionActions> & {
  readonly current: AccordionCurrent;
};
interface AccordionActions {
  isActive(name: string): boolean;
  getIndex(value: number | string | undefined | null): number;
  activate(value: number | string | undefined): Promise<void>;
}
declare function createAccordion(props: AccordionProps): AccordionInstance;
//#endregion
//#region src/components/form.d.ts
type FormValue = string | number | boolean;
type FieldOption = FormValue | FormOption;
type FormStyle = string | Partial<CSSStyleDeclaration> | null;
type FormDataValue = FormDataEntryValue | FormDataEntryValue[];
type FormDataRecord = Record<string, FormDataValue>;
type FormItemType = FormControlType;
type FormControlType = 'checkbox' | 'custom' | 'email' | 'password' | 'radio' | 'select' | 'switch' | 'text' | 'textarea' | (string & {});
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
type FormItemNext = (current: FormItem, acients: FormItem[]) => FormItem | null;
interface FormItem<TPayload = FormField> {
  id?: string;
  type: FormItemType;
  payload: TPayload;
  next?: FormItemNext | null;
}
interface FormField {
  [key: string]: unknown;
  id?: string;
  label?: RenderableContent<Form> | false;
  name?: string;
  options?: readonly FieldOption[];
  value?: FormDataEntryValue | FormValue | readonly (FormDataEntryValue | FormValue)[];
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
type ButtonsPosition = 'start' | 'center' | 'end';
interface FormProps extends Record<string, unknown> {
  id?: string | null;
  vertical?: boolean;
  itemVertical?: boolean;
  style?: FormStyle;
  fields?: readonly FormItem<FormField>[];
  buttons?: boolean | readonly FormButton[];
  buttonsPosition?: ButtonsPosition;
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
  fields: FormItem<FormField>[];
  buttons: FormButton[];
  buttonsPosition: ButtonsPosition;
  className: FormClassNames;
  validator: FormValidatorConfig;
  onSubmit: ((data: FormDataRecord, form: Form) => void | Promise<void>) | null;
  onReset: ((event: Event, form: Form) => void) | null;
}
interface FormState extends Record<string, unknown> {
  id: string;
  vertical: boolean;
  itemVertical: boolean;
  style: FormStyle;
  fields: FormItem<FormField>[];
  buttons: FormButton[];
  className: FormClassNames;
  validator: FormValidatorConfig;
  onSubmit: ((data: FormDataRecord, form: Form) => void | Promise<void>) | null;
  onReset: ((event: Event, form: Form) => void) | null;
  submitting: boolean;
  data: FormDataRecord | null;
}
interface FormControlContext {
  form: Form;
  field: FormField;
  index: number;
  item: FormItem<FormField>;
}
interface FormActions {
  validate(): boolean;
  reset(): Form;
  collectData(): FormDataRecord;
  requestSubmit(): Form;
  setFields(fields: readonly FormItem<FormField>[]): Form;
  resetFields(): Form;
}
type Form = FunctionalComponent<ResolvedFormProps, FormState, HTMLFormElement, FormActions>;
declare function createForm(input?: FormProps): Form;
//#endregion
//#region src/components/flow.d.ts
type FlowData = Record<string, unknown>;
type FlowPayload = FlowData | null;
type FlowAction = 'next' | 'back' | 'goTo' | 'finish';
type FlowBusyStrategy = 'ignore' | 'throw';
type FlowDirection = string;
type FlowSlotName = 'renderHeader' | 'renderBody' | 'renderFooter';
type FlowCleanup = () => void;
type FlowTarget = string | number;
type FlowStepResult = string | {
  id: string;
  data?: FlowPayload;
};
interface FlowClassNames {
  root: string;
  header: string;
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
  reset: string;
  back: string;
  next: string;
}
type FlowClassNameConfig = Partial<FlowClassNames>;
interface FlowStep {
  id: string;
  title?: string;
  content?: RenderableContent<FlowContext>;
  data?: FlowData;
  modal?: FlowData | ((context: FlowContext) => FlowData | null) | null;
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
interface FlowText {
  back: string;
  next: string;
  finish: string;
  reset: string;
  [key: string]: string;
}
interface FlowProps extends Record<string, unknown> {
  id?: string | null;
  steps?: FlowStep[];
  initial?: string | number | null;
  cache?: boolean;
  linear?: boolean;
  render?: boolean;
  rollbackOnError?: boolean;
  busyStrategy?: FlowBusyStrategy;
  showBack?: boolean;
  showNext?: boolean;
  showReset?: boolean;
  text?: Partial<FlowText>;
  className?: FlowClassNameConfig | string;
  renderHeader?: FlowSlot;
  renderBody?: FlowSlot;
  renderFooter?: FlowSlot;
  onChange?: FlowChangeHook | null;
  onNext?: FlowMoveHook | null;
  onBack?: FlowMoveHook | null;
  onFinish?: FlowFinishHook | null;
  onError?: FlowErrorHook | null;
  onBusy?: FlowBusyHook | null;
}
interface ResolvedFlowProps extends Record<string, unknown> {
  id: string;
  steps: FlowStep[];
  initial: string | number | null;
  cache: boolean;
  linear: boolean;
  render: boolean;
  rollbackOnError: boolean;
  busyStrategy: FlowBusyStrategy;
  showBack: boolean;
  showNext: boolean;
  showReset: boolean;
  text: FlowText;
  className: FlowClassNames;
  renderHeader: FlowSlot;
  renderBody: FlowSlot;
  renderFooter: FlowSlot;
  onChange: FlowChangeHook | null;
  onNext: FlowMoveHook | null;
  onBack: FlowMoveHook | null;
  onFinish: FlowFinishHook | null;
  onError: FlowErrorHook | null;
  onBusy: FlowBusyHook | null;
}
interface FlowRuntime {
  built: boolean;
  mounted: boolean;
  destroyed: boolean;
  activeAction: FlowAction | null;
  actionController: AbortController | null;
}
interface FlowActions {
  subscribe(handler: FlowSubscriber): FlowCleanup;
  snapshot(): FlowSnapshot;
  next(payload?: FlowPayload): Promise<FlowSnapshot | null>;
  back(payload?: FlowPayload): Promise<FlowSnapshot | null>;
  goTo(target: FlowTarget, payload?: FlowPayload, options?: FlowGoToOptions): Promise<FlowSnapshot | null>;
  setData(data: FlowPayload): Flow;
  setStepData(stepId: string, data: FlowPayload, options?: {
    silent?: boolean;
  }): Flow;
  getStepData(stepId: string): FlowData;
  reset(): Flow;
  finish(payload?: FlowPayload): Promise<FlowSnapshot | null>;
}
interface Flow extends FlowActions {
  readonly props: ResolvedFlowProps;
  readonly steps: FlowStep[];
  readonly state: FlowState;
  readonly runtime: FlowRuntime;
  readonly element: HTMLElement | null;
  readonly currentStep: FlowStep;
  readonly currentData: FlowData;
  readonly canBack: boolean;
  readonly canNext: boolean;
  readonly isLast: boolean;
  build(): this;
  mount(container: Element | DocumentFragment): this;
  unmount(): this;
  destroy(): void;
}
declare function createFlow(input?: FlowProps): Flow;
//#endregion
//#region src/components/modal.d.ts
type ModalTextInput = Partial<ModalText> & Record<string, unknown>;
type ModalContentResult = RenderableContent<Modal>;
type ModalContent = ModalContentResult | ((modal: Modal) => ModalContentResult | Promise<ModalContentResult>);
interface ModalClassNames {
  layout: string;
  modal: string;
  header: string;
  body: string;
  footer: string;
  title: string;
  closeBtn: string;
  cancelBtn: string;
  confirmBtn: string;
  button: string;
}
type ModalClassNameConfig = Partial<ModalClassNames>;
interface ModalText {
  title: string;
  confirm: string;
  cancel: string;
}
type ModalStyle = string | Partial<CSSStyleDeclaration> | null;
interface ModalProps extends Record<string, unknown> {
  content?: ModalContent;
  cache?: boolean;
  ttl?: number;
  position?: string;
  showCancel?: boolean;
  showClose?: boolean;
  fullscreen?: boolean;
  text?: ModalTextInput;
  onShow?: ((modal: Modal) => void | Promise<void>) | null;
  onShown?: ((modal: Modal) => void | Promise<void>) | null;
  onHide?: ((modal: Modal) => void | Promise<void>) | null;
  onHidden?: ((modal: Modal) => void | Promise<void>) | null;
  onConfirm?: ((modal: Modal) => void | Promise<void>) | null;
  onCancel?: ((modal: Modal) => void | Promise<void>) | null;
  header?: boolean;
  footer?: boolean;
  style?: ModalStyle;
  id?: string | null;
  escClose?: boolean;
  bgClose?: boolean;
  className?: ModalClassNameConfig;
}
interface ResolvedModalProps extends Record<string, unknown> {
  content: ModalContent;
  cache: boolean;
  ttl: number;
  position: string;
  showCancel: boolean;
  showClose: boolean;
  fullscreen: boolean;
  style: ModalStyle;
  text: ModalText;
  onShow: NonNullable<ModalProps['onShow']> | null;
  onShown: NonNullable<ModalProps['onShown']> | null;
  onHide: NonNullable<ModalProps['onHide']> | null;
  onHidden: NonNullable<ModalProps['onHidden']> | null;
  onConfirm: NonNullable<ModalProps['onConfirm']> | null;
  onCancel: NonNullable<ModalProps['onCancel']> | null;
  header: boolean;
  footer: boolean;
  id: string;
  escClose: boolean;
  bgClose: boolean;
  className: ModalClassNames;
}
interface ModalState extends Record<string, unknown> {
  content: ModalContent;
  loading: boolean;
  processing: boolean;
  visible: boolean;
}
interface ModalActions {
  show(): Modal;
  hide(): Modal;
  reset(): Modal;
}
type Modal = FunctionalComponent<ResolvedModalProps, ModalState, HTMLElement, ModalActions>;
declare function createModal(input?: ModalProps): Modal;
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
  key: string;
}
interface SwiperSlideContext {
  swiper: Swiper;
  item: NormalizedSwiperDataItem;
  index: number;
}
type SwiperDataLoader = (swiper: Swiper) => SwiperDataItem[] | Promise<SwiperDataItem[]>;
type SwiperDataSource = SwiperDataItem[] | SwiperDataLoader;
interface SwiperProps extends Record<string, unknown> {
  id?: string | null;
  data?: SwiperDataSource;
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
interface ResolvedSwiperProps extends Record<string, unknown> {
  id: string | null;
  data: SwiperDataSource;
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
  data: SwiperDataItem[];
  loading: boolean;
  index: number;
  trackIndex: number;
  transform: number;
  animating: boolean;
  width: number;
}
interface SwiperActions {
  slideTo(index: number): void;
  slideToTrack(index: number): void;
  next(): void;
  prev(): void;
  play(): void;
  pause(): void;
  resume(): void;
  restartAutoplay(): void;
}
type SwiperBase = FunctionalComponent<ResolvedSwiperProps, SwiperState, HTMLElement, SwiperActions>;
type Swiper = SwiperBase & {
  readonly realCount: number;
  readonly realIndex: number;
};
declare function createSwiper(input?: SwiperProps): Swiper;
//#endregion
//#region src/components/tabs.d.ts
type TabsDirection = 'top' | 'bottom' | 'left' | 'right';
type TabsValue = number | string;
type TabsDisabled = TabsValue | TabsValue[];
interface TabsClassNames {
  root: string;
  wrap: string;
  list: string;
  tab: string;
  panelWrap: string;
  panel: string;
  dragging: string;
}
type TabsClassNameConfig = Partial<TabsClassNames>;
interface TabsPanelContext {
  tabs: Tabs;
  item: TabItem;
  index: number;
  name: string | number;
}
type TabContent = RenderableContent<TabsPanelContext> | ((context: TabsPanelContext) => RenderableContent<TabsPanelContext>) | ((context: TabsPanelContext) => Promise<RenderableContent<TabsPanelContext>>);
interface TabItem extends Record<string, unknown> {
  name?: string;
  title: Exclude<RenderableContent, (...args: never[]) => unknown>;
  content: TabContent;
  cache?: boolean;
  ttl?: number;
}
interface TabsProps extends Record<string, unknown> {
  id?: string | null;
  direction?: TabsDirection;
  active?: TabsValue;
  disabled?: TabsDisabled;
  onChange?: ((index: number, name: string | number, tab: HTMLElement | undefined, panel: HTMLElement | undefined) => void | Promise<void>) | null;
  data?: TabItem[];
  className?: TabsClassNameConfig;
}
interface ResolvedTabsProps extends Record<string, unknown> {
  id: string;
  direction: TabsDirection;
  active: TabsValue;
  disabled: TabsDisabled;
  onChange: NonNullable<TabsProps['onChange']> | null;
  data: TabItem[];
  className: TabsClassNames;
}
interface TabsState extends Record<string, unknown> {
  data: TabItem[];
  active: TabsValue;
  disabled: TabsDisabled;
  draggable: boolean;
  dragging: boolean;
  loading: boolean;
}
interface TabsCurrent {
  index: number;
  name: string | null;
}
interface TabsActions {
  activate(value: TabsValue): Promise<void>;
}
type TabsBase = FunctionalComponent<ResolvedTabsProps, TabsState, HTMLElement, TabsActions>;
type Tabs = TabsBase & {
  readonly current: TabsCurrent;
  readonly activeIndex: number;
  readonly disabledNames: string[];
};
declare function createTabs(input?: TabsProps): Tabs;
//#endregion
//#region src/components/offcanvas.d.ts
type OffcanvasDirection = 'top' | 'right' | 'bottom' | 'left';
type OffcanvasAnimate = string;
interface OffcanvasClassNames {
  root: string;
  overlay: string;
  content: string;
}
type OffcanvasClassNameConfig = Partial<OffcanvasClassNames>;
type OffcanvasContent = RenderableContent<Offcanvas> | ((offcanvas: Offcanvas) => Promise<RenderableContent<Offcanvas>>);
interface OffcanvasProps extends Record<string, unknown> {
  content?: OffcanvasContent;
  overlay?: boolean;
  filter?: boolean;
  bodyOverflow?: boolean;
  cache?: boolean;
  ttl?: number;
  direction?: OffcanvasDirection;
  animate?: OffcanvasAnimate;
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
  bodyOverflow: boolean;
  cache: boolean;
  ttl: number;
  direction: OffcanvasDirection;
  animate: OffcanvasAnimate;
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
  content: OffcanvasContent;
  resolvedContent: RenderableContent<Offcanvas>;
  visible: boolean;
  loading: boolean;
}
interface OffcanvasActions {
  show(): Promise<void>;
  hide(): Promise<void>;
}
type Offcanvas = FunctionalComponent<ResolvedOffcanvasProps, OffcanvasState, HTMLElement, OffcanvasActions>;
declare function createOffcanvas(input?: OffcanvasProps): Offcanvas;
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
  current: string;
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
  locked: boolean;
}
interface PaginationActions {
  go(page: number): Pagination;
}
type Pagination = FunctionalComponent<ResolvedPaginationProps, PaginationState, HTMLElement, PaginationActions> & {
  readonly pageCount: number;
};
declare function createPagination(input?: PaginationProps): Pagination;
//#endregion
//#region src/components/menu.d.ts
type MenuType = string | undefined;
type MenuItemId = string | number;
type MenuItemRenderType = 0 | 1 | 2;
interface MenuClassNames {
  root: string;
  list: string;
  item: string;
  hasChildren: string;
  link: string;
  subMenu: string;
  backItem: string;
  active: string;
  backIcon: string;
  text: string;
}
type MenuClassNameConfig = Partial<MenuClassNames>;
interface MenuItem extends Record<string, unknown> {
  id?: MenuItemId;
  title: string | number;
  type?: MenuItemRenderType;
  url?: string;
  target?: string;
  classes?: string | string[];
  children?: MenuItem[];
}
interface MenuProps extends Record<string, unknown> {
  type?: MenuType;
  id?: string | null;
  user?: MaybeAccessor<number>;
  data?: MaybeAccessor<MenuItem[]>;
  backText?: string;
  className?: MenuClassNameConfig;
}
interface ResolvedMenuProps extends Record<string, unknown> {
  type?: MenuType;
  id: string;
  user: MaybeAccessor<number>;
  data: MaybeAccessor<MenuItem[]>;
  backText: string;
  className: MenuClassNames;
}
interface MenuState extends Record<string, unknown> {
  user: number;
  data: MenuItem[];
  activeKeys: string[];
}
type Menu = FunctionalComponent<ResolvedMenuProps, MenuState, HTMLElement>;
declare function createMenu(input?: MenuProps): Menu;
//#endregion
export { ButtonsPosition, CleanupFunction, CollapseMotionController, CollapseTransitionDefinition, ComponentCleanup, ComponentContext, ComponentController, ComponentDefinition, ComponentLifecycleEvent, ComponentListener, ComponentPlugin, ComponentPluginOptions, ComponentProps, ComponentRuntime, ComponentState, ContainerExpect, DOMReference, DropInstance, ElementRef, FieldOption, Flow, FlowAction, FlowBusyHook, FlowBusyStrategy, FlowChangeHook, FlowClassNameConfig, FlowClassNames, FlowCleanup, FlowContext, FlowData, FlowDirection, FlowErrorHook, FlowFinishHook, FlowGoToOptions, FlowGuardHook, FlowLifecycleHook, FlowMoveHook, FlowPayload, FlowProps, FlowRenderContext, FlowSlot, FlowSlotName, FlowSnapshot, FlowState, FlowStep, FlowStepResult, FlowSubscriber, FlowTarget, FlowText, Form, FormButton, FormClassNameConfig, FormClassNames, FormDataRecord, FormDataValue, FormField, FormItem, FormItemNext, FormItemType, FormOption, FormProps, FormValidatorConfig, FunctionalComponent, IEventManager, IconAttributeValue, IconName, IconPathMap, IconProps, KeyedElementRefs, LazyRenderCallback, LazyRenderOptions, LazyRenderTarget, Menu, MenuClassNameConfig, MenuClassNames, MenuItem, MenuItemId, MenuItemRenderType, MenuProps, MenuType, Modal, ModalClassNameConfig, ModalClassNames, ModalProps, ModalText, MotionController, NormalizeContext, Offcanvas, OffcanvasAnimate, OffcanvasClassNameConfig, OffcanvasClassNames, OffcanvasContent, OffcanvasDirection, OffcanvasProps, OwnedView, OwnedViewOptions, Pagination, PaginationClassNameConfig, PaginationClassNames, PaginationCount, PaginationPage, PaginationProps, ParabolaInstance, ParamRule, ParamRuleInput, PopupProps, PresenceController, PresenceOptions, PresencePhase, PublicFlowStep, QueryContext, RenderableContent, RequireContainerResult, ResolveContainerResult, ResolveSchema, ResolvedProps, StateSyncOptions, SupportES2022, Swiper, SwiperClassNameConfig, SwiperClassNames, SwiperDataItem, SwiperDataLoader, SwiperDataSource, SwiperProps, SwiperSlideContext, TabContent, TabItem, Tabs, TabsClassNameConfig, TabsClassNames, TabsDirection, TabsDisabled, TabsPanelContext, TabsProps, TabsValue, ThemeClassNameConfig, ThemeClassNames, ThemeConfigKey, ThemeInstance, ThemeOptions, ThemePanelGroup, ThemeResolvedOptions, Toast, ToastClassNameConfig, ToastClassNameOptions, ToastClassNames, ToastConfirmProps, ToastOptions, ToastTheme, ToastThemeOptions, TocCurrent, TocItem, TooltipInstance, TransitionDefinition, TransitionTarget, ValidateCondition, ValidatorInstance, addIcons, all, asRenderable, checkModernBrowser, copy, createAccordion, createCollapseTransition, createDrop, createElementRef, createEventManager, createFlow, createForm, createKeyedElementRefs, createLoading, createMenu, createModal, createMotionGroup, createOffcanvas, createOwnedView, createPagination, createParabola, createPopup, createPresence, createScheduledTask, createStateSync, createSticky, createSwiper, createTabs, createTheme, createToc, createTooltip, createTransition, createValidator, defineComponent, flexPosition, getRegistedIconPath, getStoreVersion, getType, icon, iconHtml, iconMarkup, isDomElementValue, isDomNodeValue, isElement, isHtmlElementValue, isMobile, isModernBrowser, isNilValue, isNode, isPlainObject, isRenderableContent, isRenderablePrimitive, isRenderableValue, lazyRender, listen, postJson, q, randomId, removeComponentPlugin, requireContainer, resolveContainer, resolveElement, resolveNode, resolveNodeList, resolveProps, restUrl, stateSnapshot, timer, trackStoreVersion, useComponentPlugin, uuid, validateParam, waitForMotion };
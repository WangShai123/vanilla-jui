import debounce, { DebounceSettings, DebouncedFunc } from "lodash-es/debounce.js";
import throttle, { ThrottleSettings } from "lodash-es/throttle.js";
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
declare function normalizeRenderableContentNodes<TContext>(content: unknown, context: TContext): Node[] | null;
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
//#region src/utilities/object.d.ts
declare function isPlainObject(obj: unknown): boolean;
//#endregion
//#region src/utilities/timer.d.ts
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
/**
 * 创建通用加载状态节点
 * 定位 absolute 撑满父元素 居中 背景模糊滤镜
 * @returns {HTMLElement}
 */
declare function createLoading(): HTMLDivElement;
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
interface DropProps extends Record<string, unknown> {
  name?: string | null;
  mode?: DropMode$1;
  position?: DropPosition$1;
  offset?: number;
  content?: RenderableContent<DropInstance$1>;
  className?: DropClassNameConfig;
  id?: string | null;
  delay?: number | DropDelay$1;
  hoverIntent?: boolean;
  onShown?: ((drop: DropInstance$1) => void | Promise<void>) | null;
  onHidden?: ((drop: DropInstance$1) => void | Promise<void>) | null;
}
interface DropDom {
  root: HTMLElement | null;
}
interface DropInstance$1 {
  target: Element | null;
  props: Record<string, unknown> | null;
  dom: DropDom;
  isVisible: boolean;
  delayShow: number;
  delayHide: number;
  show(useDelay?: boolean): void;
  hide(useDelay?: boolean): void;
  toggle(): void;
  destroy(): void;
}
declare function createDrop(element: DOMReference, props?: DropProps): DropInstance$1;
//#endregion
//#region src/primitives/tooltip.d.ts
type DropInstance = ReturnType<typeof createDrop>;
type DropMode = 'hover' | 'click';
type DropPosition = 'auto' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'left' | 'right';
interface DropDelay {
  show?: number;
  hide?: number;
}
interface TooltipDom {
  root: HTMLElement | null;
}
interface TooltipInstance {
  dom: TooltipDom;
  drop: DropInstance | null;
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
  className?: TooltipClassNameConfig;
  id?: string | null;
  delay?: number | DropDelay;
  hoverIntent?: boolean;
  onShown?: ((drop: DropInstance) => void | Promise<void>) | null;
  onHidden?: ((drop: DropInstance) => void | Promise<void>) | null;
}
declare function createTooltip(element: DOMReference, props?: TooltipProps): TooltipInstance;
//#endregion
//#region src/primitives/toast.d.ts
type ToastType = 'info' | 'success' | 'warning' | 'error' | 'primary';
interface ToastClassNames {
  container: string;
  toast: string;
  icon: string;
  message: string;
  lite: string;
  action: string;
  actions: string;
  button: string;
  closeBtn: string;
  actionBtn: string;
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
interface ParabolaDOM {
  root: HTMLElement | null;
  from: Element | null;
  to: Element | null;
  balls: Set<HTMLElement>;
}
interface ParabolaRuntime {
  destroyed: boolean;
}
interface ParabolaInstance {
  props: ResolvedParabolaProps;
  dom: ParabolaDOM;
  runtime: ParabolaRuntime;
  show(): Promise<boolean>;
  destroy(): void;
}
declare function createParabola(props?: ParabolaProps): ParabolaInstance;
//#endregion
//#region src/validation/validator.d.ts
type ValidatorElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type ValidatorMessageMap = Record<string, Partial<Record<string, string>>>;
type ValidatorCustomResult = boolean | string;
type ValidatorCustomRule = (element: ValidatorElement, validator: ValidatorInstance$1) => ValidatorCustomResult;
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
  onSubmit?: ((validator: ValidatorInstance$1) => void) | null;
}
interface ResolvedValidatorProps extends Record<string, unknown> {
  rules: Record<string, ValidatorRule>;
  messages: ValidatorMessageMap;
  onSubmit: ((validator: ValidatorInstance$1) => void) | null;
}
interface ValidatorDOM {
  root: HTMLFormElement | null;
}
interface ValidatorRuntime {
  valid: boolean;
  message: string;
  destroyed: boolean;
}
interface ResetOptions {
  native?: boolean;
}
interface ValidatorInstance$1 {
  dom: ValidatorDOM;
  props: ResolvedValidatorProps | null;
  runtime: ValidatorRuntime;
  validate(): boolean;
  reset(options?: ResetOptions): void;
  destroy(): void;
}
declare function createValidator(element: DOMReference, props?: ValidatorProps, bindEvents?: boolean): ValidatorInstance$1;
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
type ComponentCache = unknown;
interface ComponentReCreateOptions {
  force?: boolean;
}
type ComponentLifecycleEvent = 'init' | 'beforeReCreate' | 'afterReCreate' | 'destroy';
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
declare class Component<TProps extends ComponentProps = ComponentProps, TState extends ComponentState = ComponentState, TDOM extends ComponentDOM = ComponentDOM, TCache = ComponentCache> {
  /** 全局插件注册表，所有新创建的组件实例会自动安装这些插件 */
  static globalPlugins: Map<string, ComponentPlugin<Component<ComponentProps, ComponentState, ComponentDOM, unknown>>>;
  /** 组件属性配置对象 */
  props: TProps;
  /** DOM 引用容器，存储根元素及其他 DOM 节点引用 */
  dom: TDOM;
  /** 实例缓存容器，存储组件运行时派生数据 */
  cache: TCache;
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
   * 用于监听组件生命周期事件（init、beforeReCreate、afterReCreate、destroy）或自定义事件
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
   * 根据新的 props 重新创建组件实例并触发生命周期
   * 合并新的属性配置，触发 beforeReCreate 和 afterReCreate 事件
   * 子类可以重写 onReCreate 方法实现自定义重建前逻辑
   * @param {Object} [propsPatch={}] - 要合并的属性补丁对象
   * @param {Object} [options] - 更新选项
   * @param {boolean} [options.force=false] - 是否强制更新（由子类处理）
   * @returns {Component} 返回新创建的实例
   * @throws {Error} 如果组件已被销毁则抛出异常
   */
  reCreate(propsPatch?: Partial<TProps> | null | undefined, { force }?: ComponentReCreateOptions): this;
  protected createInstance(props: TProps): this;
  /**
   * 销毁组件实例
   * 执行 onDestroy 钩子，触发 destroy 事件，清理所有插件和资源
   * 这是组件生命周期的最后一步，销毁后实例不可再使用
   */
  destroy(): void;
  protected onInit?(props: TProps): void;
  protected onReCreate?(propsPatch: Partial<TProps> | null | undefined, options: Required<ComponentReCreateOptions>): void;
  protected normalizeStatePatch(patch: Partial<TState>): Partial<TState>;
  protected validateStatePatch(patch: Partial<TState>): void;
  protected afterSetState(_patch: Partial<TState>): void;
  protected onDestroy?(): void;
}
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
  target?: DOMReference;
  headings?: string;
  offset?: number;
  className?: TocClassNameConfig;
  onChange?: ((item: TocItem | null, index: number, toc: TocInstance) => void) | null;
}
interface ResolvedTocProps extends Record<string, unknown> {
  target: DOMReference;
  headings: string;
  offset: number;
  className: TocClassNames;
  onChange: ((item: TocItem | null, index: number, toc: TocInstance) => void) | null;
}
interface TocState extends Record<string, unknown> {
  items: TocItem[];
  current: TocCurrent;
}
interface TocDOM extends ComponentDOM {
  root: HTMLElement | null;
  target: Element | null;
  list: HTMLElement | null;
  headings: HTMLHeadingElement[];
  links: HTMLAnchorElement[];
}
interface TocRuntime extends ComponentRuntime {
  built: boolean;
  ticking: boolean;
}
type TocInstance = Component<ResolvedTocProps, TocState, TocDOM> & {
  runtime: TocRuntime;
  build(): TocInstance;
  refresh(): TocInstance;
  activate(index: number): TocInstance;
};
declare function createToc(props?: TocProps): TocInstance;
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
  onRefresh?: ((sticky: StickyInstance) => void) | null;
}
interface ResolvedStickyProps extends Record<string, unknown> {
  target: DOMReference;
  parent: DOMReference;
  max: number;
  top: number;
  gap: number;
  overflow: StickyOverflow;
  onRefresh: ((sticky: StickyInstance) => void) | null;
}
interface StickyStateItem {
  element: HTMLElement;
  top: number;
}
interface StickyState extends Record<string, unknown> {
  items: StickyStateItem[];
}
interface StickyDOM extends ComponentDOM {
  root: Element | null;
  parent: Element | null;
  targets: HTMLElement[];
}
interface StickyOriginalStyle {
  element: HTMLElement;
  originalPosition: string;
  originalTop: string;
  originalZIndex: string;
}
interface StickyRuntime extends ComponentRuntime {
  built: boolean;
}
interface StickyCache {
  originalStyles: StickyOriginalStyle[];
}
type StickyInstance = Component<ResolvedStickyProps, StickyState, StickyDOM, StickyCache> & {
  runtime: StickyRuntime;
  build(): StickyInstance;
  refresh(): StickyInstance;
};
declare function createSticky(props?: StickyProps): StickyInstance;
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
  items: AccordionItem[];
  onChange?: ((index: number, name: string, header: HTMLElement, panel: HTMLElement, accordion: AccordionInstance) => void | Promise<void>) | null;
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
interface AccordionCurrent {
  index: number | null;
  name: string | null;
}
interface AccordionState extends Record<string, unknown> {
  items: AccordionItem[];
  activeNames: string[];
  current: AccordionCurrent;
}
interface AccordionDOM extends ComponentDOM {
  root: HTMLElement | null;
  headers: HTMLElement[];
  panels: HTMLElement[];
}
interface AccordionRuntime extends ComponentRuntime {
  built: boolean;
}
interface AccordionContentContext {
  accordion: AccordionInstance;
  item: AccordionItem;
  index: number;
  type: 'title' | 'content';
  active: boolean;
}
type AccordionInstance = Component<ResolvedAccordionProps, AccordionState, AccordionDOM> & {
  runtime: AccordionRuntime;
  state: AccordionState;
  build(): AccordionInstance;
  isActive(name: string): boolean;
  getIndex(value: number | string | undefined | null): number;
  activate(value: number | string | undefined): Promise<void>;
};
declare function createAccordion(props: AccordionProps): AccordionInstance;
//#endregion
//#region src/components/form.d.ts
type FormValue = string | number | boolean;
type FormOptionInput = FormValue | FormOption;
type FormControlElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type FormStyle = string | Partial<CSSStyleDeclaration> | null;
type FormDataValue = FormDataEntryValue | FormDataEntryValue[];
type FormDataRecord = Record<string, FormDataValue>;
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
  fields: Map<string, FormControlElement>;
}
interface FormCache {
  initial: ResolvedFormProps;
  fieldIds: Map<string | number, string>;
}
interface ValidatorInstance {
  dom: {
    root: Element | null;
  };
  props: (FormValidatorConfig & {
    onSubmit: null;
  }) | null;
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
  constructor(input?: FormProps);
  get root(): HTMLFormElement | null;
  set root(value: HTMLFormElement | null);
  build(): this;
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
  setFields(fields: readonly FormField[]): this;
  resetFields(): this;
  cloneProps(props: ResolvedFormProps): ResolvedFormProps;
  autoComplete(type: string): string;
  isSelected(value: FormField['value'] | undefined, optionValue: FormOption['value']): boolean;
  isChecked(value: FormField['value'] | undefined, optionValue: FormOption['value'], checked: boolean | undefined): boolean;
  protected onDestroy(): void;
}
declare function createForm(props?: FormProps): Form;
//#endregion
//#region src/components/flow.d.ts
type FlowData = Record<string, unknown>;
type FlowPayload = FlowData | null;
type FlowAction = 'next' | 'back' | 'goTo' | 'finish';
type FlowBusyStrategy = 'ignore' | 'throw';
type FlowDirection = string;
type FlowSlotName = 'renderHeader' | 'renderBody' | 'renderFooter';
type FlowCleanup = () => void;
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
interface FlowDOM {
  root: HTMLElement | null;
  header: HTMLElement | null;
  body: HTMLElement | null;
  footer: HTMLElement | null;
}
interface FlowRuntime {
  built: boolean;
  destroyed: boolean;
  activeAction: FlowAction | null;
  actionController: AbortController | null;
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
  props: ResolvedFlowProps;
  steps: FlowStep[];
  state: FlowState;
  dom: FlowDOM;
  runtime: FlowRuntime;
  private stepMap;
  private initialStepId;
  private initialData;
  private subscribers;
  private renderDispose;
  private cleanupTasks;
  /**
   * 创建 Flow 实例。
   * @param {FlowProps} [props={}] Flow 配置。
   */
  constructor(props?: FlowProps);
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
   * 构建默认 Flow UI。
   * @returns {Flow}
   */
  build(): this;
  private teardownView;
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
 * @param {FlowProps} props Flow 配置。
 * @returns {Flow}
 */
declare function createFlow(props?: FlowProps): Flow;
//#endregion
//#region src/components/modal.d.ts
type ModalTextInput = Partial<ModalText> & Record<string, unknown>;
type ModalContent = RenderableContent<Modal>;
type FormInstance = ReturnType<typeof createForm>;
type ModalMode = 'content' | 'form';
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
interface ModalProps extends Record<string, unknown> {
  mode?: ModalMode | null;
  content?: ModalContent;
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
  onSubmit?: ((data: FormDataRecord, modal: Modal) => void | Promise<void>) | null;
  onCancel?: ((modal: Modal) => void | Promise<void>) | null;
  fields?: readonly FormField[] | null;
  header?: boolean;
  footer?: boolean;
  id?: string | null;
  escClose?: boolean;
  bgClose?: boolean;
  className?: ModalClassNameConfig;
}
interface ResolvedModalProps extends Record<string, unknown> {
  mode: ModalMode;
  content: ModalContent;
  position: string;
  showCancel: boolean;
  showClose: boolean;
  fullscreen: boolean;
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
  id: string;
  escClose: boolean;
  bgClose: boolean;
  className: ModalClassNames;
}
interface ModalState extends Record<string, unknown> {
  mode: ModalMode;
  content: ModalContent;
  fields: FormField[] | null;
  loading: boolean;
  processing: boolean;
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
  form: FormInstance | null;
  formContainer: HTMLElement | null;
}
interface ModalRuntime extends ComponentRuntime {
  scrollLocked: boolean;
  visibleApplied: boolean;
}
interface ModalCache {
  initial: ResolvedModalProps | null;
  fieldIds: Map<string, string> | null;
  previousActiveElement: HTMLElement | null;
  formId: string;
}
interface ModalCleanupExtras {
  visibility?: (() => void) | null;
  view?: (() => void) | null;
  hideTimer?: ReturnType<typeof setTimeout> | null;
}
type ModalStatePatch = Partial<ModalState>;
declare class ModalComponent extends Component<ResolvedModalProps, ModalState, ModalDOM, ModalCache> {
  runtime: ModalRuntime;
  state: ModalState;
  cleanup: Component['cleanup'] & ModalCleanupExtras;
  constructor(input?: ModalProps);
  protected onInit(): void;
  build(): this;
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
  isBusy(): boolean;
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
  protected normalizeStatePatch(patch: ModalStatePatch): ModalStatePatch;
  protected validateStatePatch(patch: ModalStatePatch): void;
  protected afterSetState(patch: ModalStatePatch): void;
  show(): this;
  hide(): this;
  reset(): this;
  protected onDestroy(): void;
  destroy(): this;
}
type Modal = ModalComponent;
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
interface SwiperProps extends Record<string, unknown> {
  id?: string | null;
  data?: SwiperDataItem[];
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
  data: SwiperDataItem[];
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
  index: number;
  trackIndex: number;
  transform: number;
  animating: boolean;
  width: number;
}
interface SwiperDOM extends ComponentDOM {
  root: HTMLElement | null;
  createdRoot: boolean;
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
interface SwiperRuntime extends ComponentRuntime {
  built: boolean;
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
  data?: (() => void) | null;
}
/**
 * 轻量轮播组件，继承 Component。
 *
 * 支持链接 slide、图片 lazyload、分页、导航、loop 和桌面/移动端拖拽滑动。
 * 使用 vanilla-signal 响应式管理 pagination 和 navigation 状态。
 */
declare class SwiperComponent extends Component<ResolvedSwiperProps, SwiperState, SwiperDOM> {
  props: ResolvedSwiperProps;
  state: SwiperState;
  dom: SwiperDOM;
  runtime: SwiperRuntime;
  cleanup: Component['cleanup'] & SwiperCleanupExtras;
  /**
   * 创建轮播实例。
   * @param {object} [props={}] Swiper 配置。
   */
  constructor(props?: SwiperProps);
  /**
   * 构建 Swiper DOM。
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
  private assertBuilt;
  private createDataView;
  private bindStateData;
  private syncStateData;
  private normalizeData;
  private createDataSlide;
  protected onInit(): void;
  protected onDestroy(): void;
  private updateSize;
  refresh(): this;
  private refreshSlides;
  private initLoop;
  private setupStyles;
  private reInitView;
  private clearPagination;
  private clearNavigation;
  private bindEvents;
  private onStart;
  private onMove;
  private onEnd;
  private resetDrag;
  private onTransitionEnd;
  private pushLog;
  private getDuration;
  private getOffset;
  toRealIndex(index?: number): number;
  trackIndexForRealIndex(index: number): number;
  private setTrackIndex;
  slideTo(index: number): void;
  slideToTrack(idx: number): void;
  next(): void;
  prev(): void;
  private render;
  private loadImages;
  private clearImageCleanups;
  private initPagination;
  private initNavigation;
  private ensureNavigation;
  play(): void;
  pause(): void;
  resume(): void;
  restartAutoplay(): void;
  protected normalizeStatePatch(patch: Partial<SwiperState>): Partial<SwiperState>;
  protected validateStatePatch(patch: Partial<SwiperState>): void;
}
type Swiper = SwiperComponent;
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
  direction: TabsDirection;
  current: {
    index: number;
    name: string | null;
  };
  isVertical: boolean;
  draggable: boolean;
  loading: boolean;
}
interface TabsDOM extends ComponentDOM {
  root: HTMLElement | null;
  tabs: HTMLElement[];
  panels: HTMLElement[];
}
interface TabsPanelCacheEntry {
  content: RenderableContent<TabsPanelContext>;
  updatedAt: number;
}
interface TabsRuntime extends ComponentRuntime {
  built: boolean;
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
declare class TabsComponent extends Component<ResolvedTabsProps, TabsState, TabsDOM> {
  runtime: TabsRuntime;
  state: TabsState;
  private bindingsDispose;
  private stateDispose;
  private isDragging;
  private raf;
  private resizeRaf;
  private velocity;
  /**
   * @param {object} [input={}] 标签页配置。
   */
  constructor(input?: TabsProps);
  protected onInit(props: ResolvedTabsProps): void;
  private buildRoot;
  private renderItems;
  private bindState;
  private syncStateView;
  private get disabledState();
  private isDisabledName;
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
   * 构建 Tabs DOM。
   */
  build(): this;
  refresh(): this;
  private get dragContainer();
  private get dragInner();
  private initDrag;
  private bindDragEvents;
  private startInertiaScroll;
  private removeDragEvents;
  private refreshDrag;
  protected onDestroy(): void;
  private validateData;
  protected normalizeStatePatch(patch: Partial<TabsState>): Partial<TabsState>;
  protected validateStatePatch(patch: Partial<TabsState>): void;
}
type Tabs = TabsComponent;
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
  visible: boolean;
  loading: boolean;
}
interface OffcanvasDOM extends ComponentDOM {
  root: HTMLElement | null;
  overlay: HTMLElement | null;
  content: HTMLElement | null;
}
interface OffcanvasCache {
  content: RenderableContent<Offcanvas>;
  hasContent: boolean;
  updatedAt: number;
}
interface OffcanvasRuntime extends ComponentRuntime {
  built: boolean;
  cache: OffcanvasCache;
  contentLoadId: number;
}
interface OffcanvasCleanupExtras {
  state?: (() => void) | null;
}
declare class OffcanvasComponent extends Component<ResolvedOffcanvasProps, OffcanvasState, OffcanvasDOM> {
  runtime: OffcanvasRuntime;
  state: OffcanvasState;
  cleanup: Component['cleanup'] & OffcanvasCleanupExtras;
  constructor(input?: OffcanvasProps);
  build(): this;
  private assertBuilt;
  private buildRoot;
  private buildOverlay;
  private buildPanel;
  private bindState;
  private syncContent;
  private isCacheValid;
  private clearContent;
  private renderContent;
  private loadContent;
  private bindEvents;
  private unbindEvents;
  private showPanel;
  private hidePanel;
  show(): Promise<void>;
  hide(): Promise<void>;
  protected onDestroy(): void;
  protected validateStatePatch(patch: Partial<OffcanvasState>): void;
}
type Offcanvas = OffcanvasComponent;
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
  pageCount: number;
  locked: boolean;
}
interface PaginationDOM extends ComponentDOM {
  root: HTMLElement | null;
  list: HTMLElement | null;
}
interface PaginationRuntime extends ComponentRuntime {
  built: boolean;
  itemsKey: string;
  changeId: number;
}
interface PaginationCleanupExtras {
  state?: (() => void) | null;
}
declare class PaginationComponent extends Component<ResolvedPaginationProps, PaginationState, PaginationDOM> {
  runtime: PaginationRuntime;
  state: PaginationState;
  cleanup: Component['cleanup'] & PaginationCleanupExtras;
  constructor(input?: PaginationProps);
  build(): this;
  go(page: number): this;
  private bindState;
  private syncState;
  private renderItems;
  private getPageItems;
  private isLocked;
  private isPrevDisabled;
  private isNextDisabled;
  private buildControlItem;
  private buildPageItem;
  private bindEvents;
  private unbindEvents;
  private unlock;
  private assertActive;
  protected normalizeStatePatch(patch: Partial<PaginationState>): Partial<PaginationState>;
  protected validateStatePatch(patch: Partial<PaginationState>): void;
  protected onDestroy(): void;
}
type Pagination = PaginationComponent;
declare function createPagination(input?: PaginationProps): Pagination;
//#endregion
//#region src/components/menu.d.ts
type MenuType = string | undefined;
type MenuItemId = string | number;
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
  url?: string;
  target?: string;
  classes?: string | string[];
  children?: MenuItem[];
}
interface MenuProps extends Record<string, unknown> {
  type?: MenuType;
  id?: string | null;
  data?: MenuItem[];
  backText?: string;
  className?: MenuClassNameConfig;
}
interface ResolvedMenuProps extends Record<string, unknown> {
  type?: MenuType;
  id: string;
  data: MenuItem[];
  backText: string;
  className: MenuClassNames;
}
interface MenuState extends Record<string, unknown> {
  data: MenuItem[];
}
interface MenuDOM extends ComponentDOM {
  root: HTMLElement | null;
  list: HTMLElement | null;
}
interface MenuRuntime extends ComponentRuntime {
  built: boolean;
}
interface MenuCleanupExtras {
  state?: (() => void) | null;
}
declare class MenuComponent extends Component<ResolvedMenuProps, MenuState, MenuDOM> {
  runtime: MenuRuntime;
  state: MenuState;
  cleanup: Component['cleanup'] & MenuCleanupExtras;
  constructor(input?: MenuProps);
  build(): this;
  private bindState;
  private renderSnapshot;
  private buildItem;
  private bindEvents;
  private unbindEvents;
  private handleMenuClick;
  private handleBack;
  private toggleActive;
  private clearActive;
  private validateData;
  private assertStatePatchKey;
  protected normalizeStatePatch(patch: Partial<MenuState>): Partial<MenuState>;
  protected validateStatePatch(patch: Partial<MenuState>): void;
  protected onDestroy(): void;
}
type Menu = MenuComponent;
declare function createMenu(input?: MenuProps): Menu;
//#endregion
export { CleanupFunction, Component, ContainerExpect, DOMReference, type DebounceSettings, type DebouncedFunc, FlowAction, FlowBusyHook, FlowBusyStrategy, FlowChangeHook, FlowClassNameConfig, FlowClassNames, FlowCleanup, FlowContext, FlowData, FlowDirection, FlowErrorHook, FlowFinishHook, FlowGuardHook, FlowLifecycleHook, FlowMoveHook, FlowPayload, FlowProps, FlowRenderContext, FlowSlot, FlowSlotName, FlowSnapshot, FlowState, FlowStep, FlowStepResult, FlowSubscriber, FlowTarget, FlowText, FormButton, FormClassNameConfig, FormClassNames, FormDataRecord, FormDataValue, FormField, FormOption, FormProps, FormValidatorConfig, IEventManager, IconAttributeValue, IconName, IconPathMap, IconProps, LazyRenderCallback, LazyRenderOptions, LazyRenderTarget, Menu, MenuClassNameConfig, MenuClassNames, MenuItem, MenuItemId, MenuProps, MenuType, Modal, ModalClassNameConfig, ModalClassNames, ModalMode, ModalProps, ModalText, NormalizeContext, Offcanvas, OffcanvasAnimate, OffcanvasClassNameConfig, OffcanvasClassNames, OffcanvasContent, OffcanvasDirection, OffcanvasProps, Pagination, PaginationClassNameConfig, PaginationClassNames, PaginationCount, PaginationPage, PaginationProps, ParamRule, ParamRuleInput, PopupProps, PublicFlowStep, QueryContext, RenderableContent, RequireContainerResult, ResolveContainerResult, ResolveSchema, ResolvedProps, Swiper, SwiperClassNameConfig, SwiperClassNames, SwiperDataItem, SwiperProps, SwiperSlideContext, TabItem, TabPanel, TabTitleContext, Tabs, TabsClassNameConfig, TabsClassNames, TabsDirection, TabsDisabled, TabsPanelContext, TabsProps, TabsValue, ThemeClassNameConfig, ThemeClassNames, ThemeConfigKey, ThemeInstance, ThemeOptions, ThemePanelGroup, ThemeResolvedOptions, type ThrottleSettings, Toast, ToastActionProps, ToastClassNameConfig, ToastClassNames, ToastOptions, ToastType, ValidateCondition, addIcons, all, copy, createAccordion, createDrop, createEventManager, createFlow, createForm, createLoading, createMenu, createModal, createOffcanvas, createPagination, createParabola, createPopup, createSticky, createSwiper, createTabs, createTheme, createToc, createTooltip, createValidator, debounce, getRegistedIconPath, getType, icon, iconHtml, iconMarkup, isDomElementValue, isDomNodeValue, isElement, isHtmlElementValue, isMobile, isNilValue, isNode, isPlainObject, isRenderableContent, isRenderablePrimitive, isRenderableValue, lazyRender, listen, normalizeContentNodes, normalizeRenderableContentNodes, postJson, q, randomId, requireContainer, resolveContainer, resolveElement, resolveNode, resolveNodeList, resolveProps, restUrl, throttle, timer, uuid, validateParam };
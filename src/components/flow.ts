import {
  createDeepStore,
  createRoot,
  flushSync,
  jsx,
  onCleanup,
  render,
} from 'vanilla-signal';

import { type RenderableContent } from '../utilities/dom.ts';
import { randomId } from '../utilities/id.ts';
import { isPlainObject } from '../utilities/object.ts';
import {
  type ResolveSchema,
  resolveProps,
  validateParam,
} from '../utilities/types.ts';

export type FlowData = Record<string, unknown>;
export type FlowPayload = FlowData | null;
export type FlowAction = 'next' | 'back' | 'goTo' | 'finish';
export type FlowBusyStrategy = 'ignore' | 'throw';
export type FlowDirection = string;
export type FlowSlotName = 'renderHeader' | 'renderBody' | 'renderFooter';
export type FlowCleanup = () => void;
export type FlowStepResult =
  | string
  | {
      id: string;
      data?: FlowPayload;
    };

export interface FlowClassNames {
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

export type FlowClassNameConfig = Partial<FlowClassNames>;

export interface FlowStep {
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

export type PublicFlowStep = Omit<
  FlowStep,
  'onEnter' | 'onLeave' | 'onNext' | 'onBack' | 'canEnter' | 'canLeave'
>;

export interface FlowSnapshot {
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

export interface FlowContext {
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
  goTo: (
    target: FlowTarget,
    payload?: FlowPayload,
    options?: FlowGoToOptions
  ) => Promise<FlowSnapshot | null>;
  addCleanup: (cleanup: FlowCleanup) => FlowCleanup;
}

export interface FlowRenderContext {
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
  goTo: (
    target: FlowTarget,
    payload?: FlowPayload,
    options?: FlowGoToOptions
  ) => Promise<FlowSnapshot | null>;
  reset: () => Flow;
}

export type FlowLifecycleHook = (context: FlowContext) => void | Promise<void>;
export type FlowGuardHook = (
  context: FlowContext
) => boolean | void | Promise<boolean | void>;
export type FlowMoveHook = (
  context: FlowContext
) =>
  | FlowStepResult
  | FlowPayload
  | void
  | Promise<FlowStepResult | FlowPayload | void>;
export type FlowFinishHook = (
  snapshot: FlowSnapshot,
  flow: Flow
) => void | Promise<void>;
export type FlowChangeHook = (
  snapshot: FlowSnapshot,
  flow: Flow,
  previous: FlowSnapshot | null
) => void;
export type FlowErrorHook = (
  error: unknown,
  snapshot: FlowSnapshot,
  flow: Flow,
  previous: FlowSnapshot | null
) => void;
export type FlowBusyHook = (
  action: FlowAction,
  snapshot: FlowSnapshot,
  flow: Flow
) => void;
export type FlowSlot =
  | false
  | null
  | ((context: FlowRenderContext) => RenderableContent<FlowRenderContext>);
export type FlowSubscriber = (
  snapshot: FlowSnapshot,
  flow: Flow,
  previous: FlowSnapshot | null
) => void;
export type FlowTarget = string | number;

export interface FlowText {
  back: string;
  next: string;
  finish: string;
  reset: string;
  [key: string]: string;
}

export interface FlowProps extends Record<string, unknown> {
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

export interface FlowState extends Record<string, unknown> {
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

interface InitialFlowData {
  stepData: Record<string, FlowData>;
  global: FlowData;
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

interface FlowTransitionOptions {
  direction: FlowDirection;
  payload: FlowPayload;
  fromStep: FlowStep;
}

interface FlowContextExtra {
  step?: FlowStep;
  payload?: FlowPayload;
  direction?: FlowDirection;
  fromId?: string | null;
  targetId?: string | null;
}

interface CapturedFlowState {
  currentId: string;
  currentIndex: number;
  previousId: string | null;
  previousIndex: number | null;
  direction: FlowDirection | null;
  history: string[];
  data: FlowData;
  stepData: Record<string, FlowData>;
  loading: boolean;
  busyAction: FlowAction | null;
  error: unknown;
  version: number;
}

interface FlowError extends Error {
  code?: string;
}

const DEFAULT_CLASS_NAMES: FlowClassNames = {
  root: 'j-flow',
  header: 'flow-header',
  steps: 'flow-steps',
  step: 'flow-step',
  active: 'is-active',
  complete: 'is-complete',
  stepButton: 'flow-step-button',
  stepIndex: 'flow-step-index',
  stepTitle: 'flow-step-title',
  body: 'flow-body',
  footer: 'flow-footer',
  button: 'j-button',
  reset: 'is-ghost flow-reset',
  back: 'is-ghost flow-back',
  next: 'is-primary flow-next',
};

function isFlowRenderSlot(slot: unknown): slot is FlowSlot {
  return slot == null || slot === false || typeof slot === 'function';
}

function clonePlainObject(value: unknown): FlowData {
  return isPlainObject(value) ? { ...(value as FlowData) } : {};
}

function cloneArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? [...value] : [];
}

function cloneSteps(steps: unknown): FlowStep[] {
  if (!Array.isArray(steps)) return [];
  return steps.map((step) => {
    const source = { ...(step as FlowStep & Record<string, unknown>) };
    delete source.description;
    delete source.view;

    return {
      ...source,
      data: clonePlainObject(source.data),
      modal:
        typeof source.modal === 'function' || source.modal == null
          ? source.modal
          : clonePlainObject(source.modal),
    };
  });
}

function normalizeStepResult(
  result: FlowStepResult | FlowPayload | void,
  fallbackId: string
): { id: string; data?: FlowPayload } {
  if (typeof result === 'string') return { id: result };
  if (isPlainObject(result)) {
    const source = result as { id?: unknown; data?: unknown };
    if (typeof source.id !== 'string') return { id: fallbackId };
    const data: FlowPayload | undefined = isPlainObject(source.data)
      ? (source.data as FlowData)
      : source.data == null
        ? source.data
        : undefined;
    return {
      id: source.id,
      data,
    };
  }
  return { id: fallbackId };
}

function normalizeClassNames(value: unknown): FlowClassNames {
  if (typeof value === 'string') {
    const extra = value.trim();
    return {
      ...DEFAULT_CLASS_NAMES,
      root: extra
        ? `${DEFAULT_CLASS_NAMES.root} ${extra}`
        : DEFAULT_CLASS_NAMES.root,
    };
  }

  return {
    ...DEFAULT_CLASS_NAMES,
    ...(isPlainObject(value) ? (value as Partial<FlowClassNames>) : {}),
  };
}

function joinClasses(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ');
}

const FLOW_STEP_RULE = {
  type: 'plainObject',
  shape: {
    id: { type: 'string', nonEmpty: true },
  },
};

const FLOW_CONTENT_RULE = {
  type: 'renderable',
};

const FLOW_STEPS_RULE = {
  type: 'array',
  nonEmpty: true,
};

const FLOW_PAYLOAD_RULE = {
  types: ['plainObject', 'null', 'undefined'],
};

const FLOW_RENDER_SLOT_RULE = {
  validate: isFlowRenderSlot,
  message: 'expects function, false or null.',
};

const FLOW_TEXT_RULE = {
  default: {},
  type: 'plainObject',
  normalize: (value: unknown): FlowText => {
    const text = (isPlainObject(value) ? value : {}) as Partial<FlowText> &
      Record<string, unknown>;
    return {
      ...Object.fromEntries(
        Object.entries(text).filter(([, item]) => typeof item === 'string')
      ),
      back: typeof text.back === 'string' ? text.back : 'Back',
      next: typeof text.next === 'string' ? text.next : 'Next',
      finish: typeof text.finish === 'string' ? text.finish : 'Finish',
      reset: typeof text.reset === 'string' ? text.reset : 'Reset',
    };
  },
};

const FLOW_PROPS_SCHEMA = {
  id: {
    default: null,
    types: ['string', 'null'],
    normalize: (value: unknown) => {
      if (typeof value === 'string') {
        const id = value.trim();
        return id || randomId();
      }
      if (value == null) return randomId();
      return value;
    },
  },
  steps: { default: [], ...FLOW_STEPS_RULE },
  initial: { default: null, types: ['string', 'number', 'null'] },
  cache: { default: true, type: 'boolean' },
  linear: { default: true, type: 'boolean' },
  render: { default: true, type: 'boolean' },
  rollbackOnError: { default: true, type: 'boolean' },
  busyStrategy: {
    default: 'ignore',
    type: 'string',
    enum: ['ignore', 'throw'],
  },
  showBack: { default: true, type: 'boolean' },
  showNext: { default: true, type: 'boolean' },
  showReset: { default: false, type: 'boolean' },
  text: FLOW_TEXT_RULE,
  className: {
    default: DEFAULT_CLASS_NAMES,
    types: ['object', 'string'],
    normalize: normalizeClassNames,
  },
  renderHeader: { default: null, ...FLOW_RENDER_SLOT_RULE },
  renderBody: { default: null, ...FLOW_RENDER_SLOT_RULE },
  renderFooter: { default: null, ...FLOW_RENDER_SLOT_RULE },
  onChange: { default: null, types: ['function', 'null'] },
  onNext: { default: null, types: ['function', 'null'] },
  onBack: { default: null, types: ['function', 'null'] },
  onFinish: { default: null, types: ['function', 'null'] },
  onError: { default: null, types: ['function', 'null'] },
  onBusy: { default: null, types: ['function', 'null'] },
} satisfies ResolveSchema<FlowProps>;

function normalizeProps(input: FlowProps): ResolvedFlowProps {
  const props = resolveProps(input, FLOW_PROPS_SCHEMA, 'Flow.props');
  return {
    id: props.id as string,
    steps: cloneSteps(props.steps),
    initial: props.initial as ResolvedFlowProps['initial'],
    cache: props.cache as boolean,
    linear: props.linear as boolean,
    render: props.render as boolean,
    rollbackOnError: props.rollbackOnError as boolean,
    busyStrategy: props.busyStrategy as FlowBusyStrategy,
    showBack: props.showBack as boolean,
    showNext: props.showNext as boolean,
    showReset: props.showReset as boolean,
    text: props.text as FlowText,
    className: props.className as FlowClassNames,
    renderHeader: props.renderHeader as FlowSlot,
    renderBody: props.renderBody as FlowSlot,
    renderFooter: props.renderFooter as FlowSlot,
    onChange: props.onChange as FlowChangeHook | null,
    onNext: props.onNext as FlowMoveHook | null,
    onBack: props.onBack as FlowMoveHook | null,
    onFinish: props.onFinish as FlowFinishHook | null,
    onError: props.onError as FlowErrorHook | null,
    onBusy: props.onBusy as FlowBusyHook | null,
  };
}

/**
 * Headless 流程控制器，带可选默认 UI。
 *
 * 适合在 Modal、Offcanvas、页面表单或任意业务组件中复用 next/back/goTo、步骤缓存和生命周期。
 */
class Flow {
  props: ResolvedFlowProps;
  steps: FlowStep[];
  state: FlowState;
  dom: FlowDOM;
  runtime: FlowRuntime;
  private stepMap: Map<string, number>;
  private initialStepId: string;
  private initialData: InitialFlowData;
  private subscribers: Set<FlowSubscriber>;
  private renderDispose: FlowCleanup | null;
  private cleanupTasks: Set<FlowCleanup>;

  /**
   * 创建 Flow 实例。
   * @param {FlowProps} [props={}] Flow 配置。
   */
  constructor(props: FlowProps = {}) {
    this.props = normalizeProps(props);
    this.steps = this.props.steps;
    this.validateSteps(this.steps);
    this.stepMap = new Map(this.steps.map((step, index) => [step.id, index]));
    this.initialStepId = this.resolveInitialStepId(this.props.initial);
    this.initialData = this.createInitialStepData();
    this.subscribers = new Set();
    this.renderDispose = null;
    this.cleanupTasks = new Set();
    this.dom = {
      root: null,
      header: null,
      body: null,
      footer: null,
    };
    this.runtime = {
      built: false,
      destroyed: false,
      activeAction: null,
      actionController: null,
    };

    this.state = createDeepStore({
      id: this.props.id,
      currentId: this.initialStepId,
      currentIndex: this.stepMap.get(this.initialStepId) ?? 0,
      previousId: null,
      previousIndex: null,
      direction: null,
      history: [this.initialStepId],
      data: clonePlainObject(this.initialData.global),
      stepData: clonePlainObject(this.initialData.stepData) as Record<
        string,
        FlowData
      >,
      loading: false,
      error: null,
      busyAction: null,
      version: 0,
    }) as FlowState;
  }

  /**
   * 当前步骤。
   * @returns {FlowStep}
   */
  get currentStep(): FlowStep {
    return this.steps[this.state.currentIndex];
  }

  /**
   * 当前步骤数据。
   * @returns {object}
   */
  get currentData(): FlowData {
    return this.getStepData(this.state.currentId);
  }

  /**
   * 是否可以返回上一步。
   * @returns {boolean}
   */
  get canBack(): boolean {
    return this.state.currentIndex > 0 && !this.state.loading;
  }

  /**
   * 是否可以前进。
   * @returns {boolean}
   */
  get canNext(): boolean {
    return (
      this.state.currentIndex < this.steps.length - 1 && !this.state.loading
    );
  }

  /**
   * 是否处于最后一步。
   * @returns {boolean}
   */
  get isLast(): boolean {
    return this.state.currentIndex === this.steps.length - 1;
  }

  /**
   * 订阅状态变化。
   * @param {Function} handler 订阅函数。
   * @returns {Function} 取消订阅函数。
   */
  subscribe(handler: FlowSubscriber): FlowCleanup {
    this.assertActive('subscribe');
    if (typeof handler !== 'function') {
      throw new Error('Flow.subscribe: handler expects a function.');
    }
    this.subscribers.add(handler);
    handler(this.snapshot(), this, null);
    return () => this.subscribers.delete(handler);
  }

  /**
   * 获取不可变快照。
   * @returns {object}
   */
  snapshot(): FlowSnapshot {
    const currentStep = this.currentStep;
    return {
      id: this.state.id,
      currentId: this.state.currentId,
      currentIndex: this.state.currentIndex,
      previousId: this.state.previousId,
      previousIndex: this.state.previousIndex,
      direction: this.state.direction,
      history: [...this.state.history],
      data: clonePlainObject(this.state.data),
      stepData: clonePlainObject(this.state.stepData) as Record<
        string,
        FlowData
      >,
      currentData: this.currentData,
      currentStep: this.publicStep(currentStep),
      canBack: this.canBack,
      canNext: this.canNext,
      isLast: this.isLast,
      loading: this.state.loading,
      busyAction: this.state.busyAction,
      error: this.state.error,
    };
  }

  /**
   * 构建默认 Flow UI。
   * @returns {Flow}
   */
  build(): this {
    this.assertActive('build');
    if (this.runtime.built) return this;

    this.runtime.built = true;
    if (!this.props.render) return this;

    this.dom.root = this.buildRoot();
    this.mountView();
    return this;
  }

  private teardownView(): void {
    this.renderDispose?.();
    this.renderDispose = null;
    this.dom.root?.remove();
    this.dom.root = null;
    this.dom.header = null;
    this.dom.body = null;
    this.dom.footer = null;
    this.runtime.built = false;
  }

  /**
   * 前进一步。
   * @param {object|null} [payload=null] 当前步骤需要缓存的数据。
   * @returns {Promise<object>} 切换后的快照。
   */
  async next(payload: FlowPayload = null): Promise<FlowSnapshot | null> {
    this.assertActive('next');
    validateParam('payload', payload, FLOW_PAYLOAD_RULE, 'Flow.next');
    const busySnapshot = this.handleBusy('next');
    if (busySnapshot) return busySnapshot;

    return this.runAction('next', async () => {
      if (this.isLast) return this.finish(payload, { internal: true });

      const fromStep = this.currentStep;
      const fallbackId = this.steps[this.state.currentIndex + 1]?.id;
      const result = await this.runMoveHook(
        'next',
        fromStep,
        payload,
        fallbackId
      );
      const { id, data } = normalizeStepResult(result, fallbackId);
      return this.goTo(id, data ?? payload, {
        direction: 'next',
        internal: true,
      });
    });
  }

  /**
   * 返回上一步。
   * @param {object|null} [payload=null] 当前步骤需要缓存的数据。
   * @returns {Promise<object>} 切换后的快照。
   */
  async back(payload: FlowPayload = null): Promise<FlowSnapshot | null> {
    this.assertActive('back');
    validateParam('payload', payload, FLOW_PAYLOAD_RULE, 'Flow.back');
    const busySnapshot = this.handleBusy('back');
    if (busySnapshot) return busySnapshot;

    if (!this.canBack) return this.snapshot();

    return this.runAction('back', async () => {
      const fromStep = this.currentStep;
      const fallbackId = this.steps[this.state.currentIndex - 1]?.id;
      const result = await this.runMoveHook(
        'back',
        fromStep,
        payload,
        fallbackId
      );
      const { id, data } = normalizeStepResult(result, fallbackId);
      return this.goTo(id, data ?? payload, {
        direction: 'back',
        internal: true,
      });
    });
  }

  /**
   * 跳转到指定步骤。
   * @param {string|number} target 目标步骤 id 或索引。
   * @param {object|null} [payload=null] 当前步骤需要缓存的数据。
   * @param {{direction?:string, internal?:boolean}} [options={}] 跳转选项。
   * @returns {Promise<object>} 切换后的快照。
   */
  async goTo(
    target: FlowTarget,
    payload: FlowPayload = null,
    options: FlowGoToOptions = {}
  ): Promise<FlowSnapshot | null> {
    this.assertActive('goTo');
    validateParam('payload', payload, FLOW_PAYLOAD_RULE, 'Flow.goTo');
    const busySnapshot = options.internal ? null : this.handleBusy('goTo');
    if (busySnapshot) return busySnapshot;

    return this.runAction(
      'goTo',
      async () => {
        const toIndex = this.resolveStepIndex(target);
        const toStep = this.steps[toIndex];
        const fromStep = this.currentStep;

        if (!toStep || toStep.id === this.state.currentId) {
          if (payload) this.setStepData(this.state.currentId, payload);
          return this.snapshot();
        }

        await this.transitionTo(toStep, {
          direction: options.direction || 'go',
          payload,
          fromStep,
        });

        return this.snapshot();
      },
      { internal: options.internal }
    );
  }

  /**
   * 合并全局数据。
   * @param {object} data 数据补丁。
   * @returns {Flow}
   */
  setData(data: FlowPayload): this {
    this.assertActive('setData');
    validateParam('data', data, FLOW_PAYLOAD_RULE, 'Flow.setData');
    if (!data) return this;

    flushSync(() => {
      Object.assign(this.state.data, data);
      this.state.version += 1;
    });
    this.emitChange();
    return this;
  }

  /**
   * 合并指定步骤缓存数据。
   * @param {string} stepId 步骤 id。
   * @param {object|null} data 数据补丁。
   * @returns {Flow}
   */
  setStepData(
    stepId: string,
    data: FlowPayload,
    options: { silent?: boolean } = {}
  ): this {
    this.assertActive('setStepData');
    validateParam('stepId', stepId, { type: 'string' }, 'Flow.setStepData');
    validateParam('data', data, FLOW_PAYLOAD_RULE, 'Flow.setStepData');
    if (!data || !this.stepMap.has(stepId)) return this;

    flushSync(() => {
      this.state.stepData[stepId] = {
        ...clonePlainObject(this.state.stepData[stepId]),
        ...data,
      };
      if (this.props.cache) Object.assign(this.state.data, data);
      this.state.version += 1;
    });
    if (!options.silent) this.emitChange();
    return this;
  }

  /**
   * 获取指定步骤缓存数据。
   * @param {string} stepId 步骤 id。
   * @returns {object}
   */
  getStepData(stepId: string): FlowData {
    return clonePlainObject(this.state.stepData[stepId]);
  }

  /**
   * 重置流程。
   * @returns {Flow}
   */
  reset(): this {
    this.assertActive('reset');
    flushSync(() => {
      this.state.currentId = this.initialStepId;
      this.state.currentIndex = this.stepMap.get(this.initialStepId) ?? 0;
      this.state.previousId = null;
      this.state.previousIndex = null;
      this.state.direction = null;
      this.state.history.splice(
        0,
        this.state.history.length,
        this.initialStepId
      );
      this.replaceObject(
        this.state.data,
        clonePlainObject(this.initialData.global)
      );
      this.replaceObject(
        this.state.stepData,
        clonePlainObject(this.initialData.stepData)
      );
      this.state.loading = false;
      this.state.busyAction = null;
      this.state.error = null;
      this.state.version += 1;
    });
    this.emitChange();
    return this;
  }

  /**
   * 完成流程。
   * @param {object|null} [payload=null] 最后一步需要缓存的数据。
   * @returns {Promise<object>} 当前快照。
   */
  async finish(
    payload: FlowPayload = null,
    options: FlowRunActionOptions = {}
  ): Promise<FlowSnapshot | null> {
    this.assertActive('finish');
    validateParam('payload', payload, FLOW_PAYLOAD_RULE, 'Flow.finish');
    const busySnapshot = options.internal ? null : this.handleBusy('finish');
    if (busySnapshot) return busySnapshot;

    return this.runAction(
      'finish',
      async () => {
        if (payload) this.setStepData(this.state.currentId, payload);
        await this.callHook(this.props.onFinish, [this.snapshot(), this]);
        return this.snapshot();
      },
      { internal: options.internal }
    );
  }

  /**
   * 销毁 Flow 实例。
   * @returns {void}
   */
  destroy(): void {
    if (this.runtime.destroyed) return;
    this.runtime.destroyed = true;
    this.abortActiveAction();
    this.teardownView();
    for (const cleanup of Array.from(this.cleanupTasks)) {
      cleanup();
    }
    this.cleanupTasks.clear();
    this.subscribers.clear();
    this.steps = [];
    this.stepMap.clear();
    this.runtime.activeAction = null;
    this.runtime.actionController = null;
  }

  private resolveInitialStepId(initial: string | number | null): string {
    if (typeof initial === 'number') {
      const step = this.steps[initial];
      if (!step) throw new Error('Flow.props.initial index is out of range.');
      return step.id;
    }
    if (typeof initial === 'string') {
      if (!this.stepMap.has(initial)) {
        throw new Error(`Flow.props.initial step "${initial}" does not exist.`);
      }
      return initial;
    }
    return this.steps[0].id;
  }

  private validateSteps(steps: FlowStep[]): void {
    const ids = new Set<string>();
    for (const [index, step] of steps.entries()) {
      validateParam(String(index), step, FLOW_STEP_RULE, 'Flow.props.steps');
      validateParam(
        'content',
        step.content ?? null,
        FLOW_CONTENT_RULE,
        `Flow.props.steps.${index}`
      );
      if (ids.has(step.id)) {
        throw new Error(`Flow.props.steps: duplicated step id "${step.id}".`);
      }
      ids.add(step.id);
    }
  }

  private resolveStepIndex(target: FlowTarget): number {
    if (typeof target === 'number') {
      if (!this.steps[target])
        throw new Error('Flow.goTo target is out of range.');
      return target;
    }
    if (typeof target === 'string') {
      const index = this.stepMap.get(target);
      if (index == null) {
        throw new Error(`Flow.goTo target "${target}" does not exist.`);
      }
      return index;
    }
    throw new Error('Flow.goTo target expects string or number.');
  }

  private createInitialStepData(): InitialFlowData {
    const stepData: Record<string, FlowData> = {};
    const global: FlowData = {};
    for (const step of this.steps) {
      stepData[step.id] = clonePlainObject(step.data);
      Object.assign(global, stepData[step.id]);
    }
    return { stepData, global };
  }

  private async runMoveHook(
    type: 'next' | 'back',
    step: FlowStep,
    payload: FlowPayload,
    fallbackId: string
  ): Promise<FlowStepResult | FlowPayload | void> {
    const globalHook = type === 'back' ? this.props.onBack : this.props.onNext;
    const stepHook = type === 'back' ? step.onBack : step.onNext;
    const context = this.createContext({ payload, targetId: fallbackId });

    if (typeof stepHook === 'function') {
      const result = await this.callHook(stepHook, [context]);
      if (result != null) return result;
    }

    if (typeof globalHook === 'function') {
      const result = await this.callHook(globalHook, [context]);
      if (result != null) return result;
    }

    return fallbackId;
  }

  private async transitionTo(
    toStep: FlowStep,
    { direction, payload, fromStep }: FlowTransitionOptions
  ): Promise<void> {
    const fromSnapshot = this.snapshot();
    const rollbackState = this.captureState();

    try {
      if (payload) this.setStepData(fromStep.id, payload, { silent: true });

      await this.assertCanLeave(fromStep, toStep, direction);
      await this.assertCanEnter(toStep, fromStep, direction);

      if (typeof fromStep.onLeave === 'function') {
        await this.callHook(fromStep.onLeave, [
          this.createContext({
            direction,
            step: fromStep,
            targetId: toStep.id,
          }),
        ]);
      }

      const previousId = this.state.currentId;
      const previousIndex = this.state.currentIndex;
      const currentIndex = this.stepMap.get(toStep.id) ?? 0;

      flushSync(() => {
        this.state.previousId = previousId;
        this.state.previousIndex = previousIndex;
        this.state.currentId = toStep.id;
        this.state.currentIndex = currentIndex;
        this.state.direction = direction;
        if (direction === 'back') this.state.history.pop();
        else this.state.history.push(toStep.id);
        this.state.error = null;
        this.state.version += 1;
      });

      if (typeof toStep.onEnter === 'function') {
        await this.callHook(toStep.onEnter, [
          this.createContext({
            direction,
            fromId: previousId,
            step: toStep,
          }),
        ]);
      }

      this.emitChange(fromSnapshot);
    } catch (error) {
      if (this.runtime.destroyed) throw error;
      if (this.props.rollbackOnError) {
        this.restoreState(rollbackState, { keepLoading: true });
      }
      this.handleError(error, fromSnapshot);
      throw error;
    }
  }

  private async assertCanLeave(
    fromStep: FlowStep,
    toStep: FlowStep,
    direction: FlowDirection
  ): Promise<void> {
    if (typeof fromStep.canLeave !== 'function') return;
    const result = await this.callHook(fromStep.canLeave, [
      this.createContext({ direction, targetId: toStep.id }),
    ]);
    if (result === false) {
      throw new Error(`Flow: step "${fromStep.id}" blocked leaving.`);
    }
  }

  private async assertCanEnter(
    toStep: FlowStep,
    fromStep: FlowStep,
    direction: FlowDirection
  ): Promise<void> {
    if (typeof toStep.canEnter !== 'function') return;
    const result = await this.callHook(toStep.canEnter, [
      this.createContext({ direction, fromId: fromStep.id }),
    ]);
    if (result === false) {
      throw new Error(`Flow: step "${toStep.id}" blocked entering.`);
    }
  }

  private createContext(extra: FlowContextExtra = {}): FlowContext {
    const step = extra.step || this.currentStep;
    const snapshot = this.snapshot();
    return {
      ...extra,
      flow: this,
      step,
      state: this.state,
      signal: this.runtime.actionController?.signal || null,
      snapshot,
      data: clonePlainObject(this.state.data),
      currentData: this.getStepData(step.id),
      setData: (data) => this.setData(data),
      setStepData: (stepId, data) => this.setStepData(stepId, data),
      getStepData: (stepId) => this.getStepData(stepId),
      next: (payload) => this.next(payload),
      back: (payload) => this.back(payload),
      goTo: (target, payload, options) => this.goTo(target, payload, options),
      addCleanup: (cleanup) => this.addCleanup(cleanup),
    };
  }

  private async runAction(
    action: FlowAction,
    task: () => Promise<FlowSnapshot | null>,
    options: FlowRunActionOptions = {}
  ): Promise<FlowSnapshot | null> {
    const isOuterAction = !options.internal && !this.state.loading;
    if (isOuterAction) {
      this.runtime.actionController =
        typeof AbortController !== 'undefined' ? new AbortController() : null;
      this.runtime.activeAction = action;
      this.setLoading(true, action);
    }

    try {
      return await task();
    } catch (error) {
      if (this.runtime.destroyed) return null;
      if (this.state.error !== error) this.handleError(error);
      throw error;
    } finally {
      if (isOuterAction && !this.runtime.destroyed) {
        this.setLoading(false, null);
        this.runtime.activeAction = null;
        this.runtime.actionController = null;
      }
    }
  }

  private handleBusy(action: FlowAction): FlowSnapshot | null {
    if (!this.state.loading) return null;

    const error = new Error(
      `Flow: action "${action}" ignored while loading.`
    ) as FlowError;
    error.code = 'FLOW_BUSY';

    if (typeof this.props.onBusy === 'function') {
      this.props.onBusy(action, this.snapshot(), this);
    }

    if (this.props.busyStrategy === 'throw') throw error;

    return this.snapshot();
  }

  private abortActiveAction(): void {
    this.runtime.actionController?.abort();
    this.runtime.actionController = null;
    this.runtime.activeAction = null;
  }

  private async callHook<TResult>(
    hook: ((...args: never[]) => TResult | Promise<TResult>) | null | undefined,
    args: unknown[]
  ): Promise<TResult | undefined> {
    if (typeof hook !== 'function') return undefined;
    const result = await (
      hook as (...args: unknown[]) => TResult | Promise<TResult>
    )(...args);
    if (this.runtime.destroyed) throw this.createAbortError();
    return result;
  }

  private createAbortError(): FlowError {
    const error = new Error('Flow: active action was aborted.') as FlowError;
    error.code = 'FLOW_ABORTED';
    return error;
  }

  private setLoading(
    value: boolean,
    action: FlowAction | null = this.state.busyAction
  ): void {
    const previous = this.snapshot();
    const busyAction = value ? action : null;
    if (this.state.loading === value && this.state.busyAction === busyAction)
      return;

    flushSync(() => {
      this.state.loading = value;
      this.state.busyAction = busyAction;
      this.state.version += 1;
    });
    this.emitChange(previous);
  }

  private handleError(
    error: unknown,
    previous: FlowSnapshot | null = null
  ): void {
    flushSync(() => {
      this.state.error = error;
      this.state.version += 1;
    });
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, this.snapshot(), this, previous);
    }
  }

  private emitChange(previous: FlowSnapshot | null = null): void {
    const next = this.snapshot();
    for (const handler of Array.from(this.subscribers)) {
      handler(next, this, previous);
    }
    if (typeof this.props.onChange === 'function') {
      this.props.onChange(next, this, previous);
    }
  }

  private replaceObject(target: FlowData, source: FlowData): void {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, source);
  }

  private captureState(): CapturedFlowState {
    return {
      currentId: this.state.currentId,
      currentIndex: this.state.currentIndex,
      previousId: this.state.previousId,
      previousIndex: this.state.previousIndex,
      direction: this.state.direction,
      history: cloneArray<string>(this.state.history),
      data: clonePlainObject(this.state.data),
      stepData: clonePlainObject(this.state.stepData) as Record<
        string,
        FlowData
      >,
      loading: this.state.loading,
      busyAction: this.state.busyAction,
      error: this.state.error,
      version: this.state.version,
    };
  }

  private restoreState(
    snapshot: CapturedFlowState,
    options: { keepLoading?: boolean } = {}
  ): void {
    flushSync(() => {
      this.state.currentId = snapshot.currentId;
      this.state.currentIndex = snapshot.currentIndex;
      this.state.previousId = snapshot.previousId;
      this.state.previousIndex = snapshot.previousIndex;
      this.state.direction = snapshot.direction;
      this.state.history.splice(
        0,
        this.state.history.length,
        ...snapshot.history
      );
      this.replaceObject(this.state.data, snapshot.data);
      this.replaceObject(this.state.stepData, snapshot.stepData);
      this.state.loading = options.keepLoading ? true : snapshot.loading;
      this.state.busyAction = snapshot.busyAction;
      this.state.error = snapshot.error;
      this.state.version = snapshot.version + 1;
    });
  }

  private addCleanup(cleanup: FlowCleanup): FlowCleanup {
    if (typeof cleanup !== 'function') {
      throw new Error('Flow.addCleanup: cleanup expects a function.');
    }
    if (this.runtime.destroyed) {
      cleanup();
      return () => {};
    }
    this.cleanupTasks.add(cleanup);
    return () => this.cleanupTasks.delete(cleanup);
  }

  private assertActive(method: string): void {
    if (this.runtime.destroyed) {
      throw new Error(`Flow.${method}: instance has been destroyed.`);
    }
  }

  private publicStep(step: FlowStep | null | undefined): PublicFlowStep | null {
    if (!step) return null;
    const {
      onEnter: _onEnter,
      onLeave: _onLeave,
      onNext: _onNext,
      onBack: _onBack,
      canEnter: _canEnter,
      canLeave: _canLeave,
      ...publicStep
    } = step;
    return publicStep;
  }

  private buildRoot(): HTMLElement {
    return jsx('div', {
      className: this.props.className.root,
      id: this.props.id,
      role: 'group',
      'data-flow': 'root',
      'aria-busy': () => (this.state.loading ? 'true' : 'false'),
    }) as HTMLElement;
  }

  private mountView(): void {
    if (this.renderDispose || !this.dom.root) return;
    this.renderDispose = createRoot((dispose: FlowCleanup) => {
      const viewDispose = render(
        () => this.view(),
        this.dom.root as HTMLElement
      );
      onCleanup(viewDispose);
      return dispose;
    });
  }

  private view(): RenderableContent<FlowRenderContext> {
    const snapshot = this.snapshot();
    return [
      this.headerView(snapshot),
      this.bodyView(snapshot),
      this.footerView(snapshot),
    ];
  }

  private renderSlot(
    name: FlowSlotName,
    snapshot: FlowSnapshot,
    fallback: () => RenderableContent<FlowRenderContext>
  ): RenderableContent<FlowRenderContext> {
    const slot = this.props[name];
    if (slot === false) return null;
    if (typeof slot === 'function') {
      return slot(this.createRenderContext(snapshot, fallback));
    }
    return fallback();
  }

  private createRenderContext(
    snapshot: FlowSnapshot,
    fallback: () => RenderableContent<FlowRenderContext>
  ): FlowRenderContext {
    return {
      flow: this,
      snapshot,
      state: this.state,
      steps: this.steps.map((step) => this.publicStep(step)),
      currentStep: snapshot.currentStep,
      currentData: snapshot.currentData,
      data: snapshot.data,
      fallback,
      next: (payload) => this.next(payload),
      back: (payload) => this.back(payload),
      goTo: (target, payload, options) => this.goTo(target, payload, options),
      reset: () => this.reset(),
    };
  }

  private headerView(snapshot: FlowSnapshot): HTMLElement {
    return jsx('div', {
      className: this.props.className.header,
      'data-flow-header': '',
      ref: (element: HTMLElement) => {
        this.dom.header = element;
      },
      children: this.renderSlot('renderHeader', snapshot, () =>
        this.stepsView(snapshot)
      ),
    }) as HTMLElement;
  }

  private stepsView(snapshot: FlowSnapshot): HTMLOListElement {
    return jsx('ol', {
      className: this.props.className.steps,
      'data-flow-steps': '',
      role: 'list',
      'aria-label': 'Flow steps',
      children: this.steps.map((step, index) =>
        jsx('li', {
          className: this.stepClass(index, snapshot.currentIndex),
          'data-flow-step': step.id,
          'data-flow-step-index': String(index),
          'aria-current': index === snapshot.currentIndex ? 'step' : undefined,
          children: [
            jsx('button', {
              type: 'button',
              className: this.props.className.stepButton,
              disabled: this.props.linear && index > snapshot.currentIndex,
              'aria-current':
                index === snapshot.currentIndex ? 'step' : undefined,
              'aria-disabled':
                this.props.linear && index > snapshot.currentIndex
                  ? 'true'
                  : 'false',
              'aria-label': `${index + 1}. ${step.title || step.id}`,
              'data-flow-step-action': 'goTo',
              onClick: () => {
                if (index === snapshot.currentIndex) return;
                void this.goTo(index);
              },
              children: [
                jsx('span', {
                  className: this.props.className.stepIndex,
                  'data-flow-step-number': '',
                  children: index + 1,
                }),
                jsx('span', {
                  className: this.props.className.stepTitle,
                  'data-flow-step-title': '',
                  children: step.title || step.id,
                }),
              ],
            }),
          ],
        })
      ),
    }) as HTMLOListElement;
  }

  private bodyView(snapshot: FlowSnapshot): HTMLElement {
    return jsx('div', {
      className: this.props.className.body,
      'data-flow-body': '',
      role: 'region',
      'aria-live': 'polite',
      'aria-busy': snapshot.loading ? 'true' : 'false',
      ref: (element: HTMLElement) => {
        this.dom.body = element;
      },
      children: this.renderSlot('renderBody', snapshot, () =>
        this.contentView(this.currentStep.content)
      ),
    }) as HTMLElement;
  }

  private footerView(snapshot: FlowSnapshot): HTMLElement {
    return jsx('div', {
      className: this.props.className.footer,
      'data-flow-footer': '',
      ref: (element: HTMLElement) => {
        this.dom.footer = element;
      },
      children: this.renderSlot('renderFooter', snapshot, () => [
        this.props.showReset
          ? jsx('button', {
              type: 'button',
              className: joinClasses(
                this.props.className.button,
                this.props.className.reset
              ),
              'data-action': 'reset',
              onClick: () => this.reset(),
              disabled: snapshot.loading,
              'aria-disabled': snapshot.loading ? 'true' : 'false',
              children: this.props.text.reset,
            })
          : null,
        this.props.showBack
          ? jsx('button', {
              type: 'button',
              className: joinClasses(
                this.props.className.button,
                this.props.className.back
              ),
              'data-action': 'back',
              onClick: () => void this.back(),
              disabled: !snapshot.canBack,
              'aria-disabled': !snapshot.canBack ? 'true' : 'false',
              children: this.props.text.back,
            })
          : null,
        this.props.showNext
          ? jsx('button', {
              type: 'button',
              className: joinClasses(
                this.props.className.button,
                this.props.className.next
              ),
              'data-action': 'next',
              onClick: () => void this.next(),
              disabled: snapshot.loading,
              'aria-disabled': snapshot.loading ? 'true' : 'false',
              children: snapshot.isLast
                ? this.props.text.finish
                : this.props.text.next,
            })
          : null,
      ]),
    }) as HTMLElement;
  }

  private contentView(
    content: FlowStep['content']
  ): RenderableContent<FlowRenderContext> {
    if (typeof content === 'function') {
      return content(
        this.createContext()
      ) as RenderableContent<FlowRenderContext>;
    }
    return (content ?? '') as RenderableContent<FlowRenderContext>;
  }

  private stepClass(
    index: number,
    currentIndex = this.state.currentIndex
  ): string {
    return joinClasses(
      this.props.className.step,
      index === currentIndex && this.props.className.active,
      index < currentIndex && this.props.className.complete
    );
  }
}

/**
 * 创建 Flow 实例。
 * @param {FlowProps} props Flow 配置。
 * @returns {Flow}
 */
export function createFlow(props: FlowProps = {}): Flow {
  return new Flow(props);
}

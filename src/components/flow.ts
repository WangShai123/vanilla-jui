import { createDeepStore, flushSync, jsx } from 'vanilla-signal';

import {
  type FunctionalComponent,
  defineComponent,
} from '../core/component.ts';
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
export type FlowTarget = string | number;
export type FlowStepResult = string | { id: string; data?: FlowPayload };

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

export interface FlowGoToOptions {
  direction?: FlowDirection;
  internal?: boolean;
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
  goTo(
    target: FlowTarget,
    payload?: FlowPayload,
    options?: FlowGoToOptions
  ): Promise<FlowSnapshot | null>;
  setData(data: FlowPayload): Flow;
  setStepData(
    stepId: string,
    data: FlowPayload,
    options?: { silent?: boolean }
  ): Flow;
  getStepData(stepId: string): FlowData;
  reset(): Flow;
  finish(payload?: FlowPayload): Promise<FlowSnapshot | null>;
}

export interface Flow extends FlowActions {
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

const FLOW_STEP_RULE = {
  type: 'plainObject',
  shape: { id: { type: 'string', nonEmpty: true } },
};
const FLOW_CONTENT_RULE = { type: 'renderable' };
const FLOW_PAYLOAD_RULE = { types: ['plainObject', 'null', 'undefined'] };

function clonePlainObject(value: unknown): FlowData {
  return isPlainObject(value) ? { ...(value as FlowData) } : {};
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

function normalizeClassNames(value: unknown): FlowClassNames {
  if (typeof value === 'string') {
    return {
      ...DEFAULT_CLASS_NAMES,
      root: [DEFAULT_CLASS_NAMES.root, value.trim()].filter(Boolean).join(' '),
    };
  }
  return {
    ...DEFAULT_CLASS_NAMES,
    ...(isPlainObject(value) ? (value as FlowClassNameConfig) : {}),
  };
}

function normalizeStepResult(
  result: FlowStepResult | FlowPayload | void,
  fallbackId: string
): { id: string; data?: FlowPayload } {
  if (typeof result === 'string') return { id: result };
  if (!isPlainObject(result)) return { id: fallbackId };
  const source = result as { id?: unknown; data?: unknown };
  if (typeof source.id !== 'string') return { id: fallbackId };
  return {
    id: source.id,
    data:
      isPlainObject(source.data) || source.data == null
        ? (source.data as FlowPayload)
        : undefined,
  };
}

const FLOW_PROPS_SCHEMA = {
  id: {
    default: null,
    types: ['string', 'null'],
    normalize: (value: unknown) =>
      typeof value === 'string' ? value.trim() || randomId() : randomId(),
  },
  steps: { default: [], type: 'array', nonEmpty: true },
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
  text: {
    default: {},
    type: 'plainObject',
    normalize: (value: unknown) => {
      const text = isPlainObject(value) ? (value as Partial<FlowText>) : {};
      return {
        back: typeof text.back === 'string' ? text.back : 'Back',
        next: typeof text.next === 'string' ? text.next : 'Next',
        finish: typeof text.finish === 'string' ? text.finish : 'Finish',
        reset: typeof text.reset === 'string' ? text.reset : 'Reset',
      };
    },
  },
  className: {
    default: DEFAULT_CLASS_NAMES,
    types: ['object', 'string'],
    normalize: normalizeClassNames,
  },
  renderHeader: {
    default: null,
    validate: (value: unknown) =>
      value == null || value === false || typeof value === 'function',
  },
  renderBody: {
    default: null,
    validate: (value: unknown) =>
      value == null || value === false || typeof value === 'function',
  },
  renderFooter: {
    default: null,
    validate: (value: unknown) =>
      value == null || value === false || typeof value === 'function',
  },
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
    initial: props.initial as string | number | null,
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

export function createFlow(input: FlowProps = {}): Flow {
  const props = normalizeProps(input);
  const steps = props.steps;
  const stepMap = new Map<string, number>();
  for (const [index, step] of steps.entries()) {
    validateParam(String(index), step, FLOW_STEP_RULE, 'Flow.props.steps');
    validateParam(
      'content',
      step.content ?? null,
      FLOW_CONTENT_RULE,
      `Flow.props.steps.${index}`
    );
    if (stepMap.has(step.id)) {
      throw new Error(`Flow.props.steps: duplicated step id "${step.id}".`);
    }
    stepMap.set(step.id, index);
  }
  const initialStepId = (() => {
    if (typeof props.initial === 'number') {
      const step = steps[props.initial];
      if (!step) throw new Error('Flow.props.initial index is out of range.');
      return step.id;
    }
    if (typeof props.initial === 'string') {
      if (!stepMap.has(props.initial)) {
        throw new Error(
          `Flow.props.initial step "${props.initial}" does not exist.`
        );
      }
      return props.initial;
    }
    return steps[0].id;
  })();
  const initialStepData: Record<string, FlowData> = {};
  const initialGlobal: FlowData = {};
  for (const step of steps) {
    initialStepData[step.id] = clonePlainObject(step.data);
    Object.assign(initialGlobal, initialStepData[step.id]);
  }
  const state = createDeepStore({
    id: props.id,
    currentId: initialStepId,
    currentIndex: stepMap.get(initialStepId) ?? 0,
    previousId: null,
    previousIndex: null,
    direction: null,
    history: [initialStepId],
    data: clonePlainObject(initialGlobal),
    stepData: clonePlainObject(initialStepData) as Record<string, FlowData>,
    loading: false,
    error: null,
    busyAction: null,
    version: 0,
  }) as FlowState;
  const runtime: FlowRuntime = {
    built: false,
    mounted: false,
    destroyed: false,
    activeAction: null,
    actionController: null,
  };
  const subscribers = new Set<FlowSubscriber>();
  const cleanupTasks = new Set<FlowCleanup>();
  let ui: FunctionalComponent<
    Record<string, unknown>,
    FlowState,
    HTMLElement,
    object
  > | null = null;
  let flow!: Flow;

  const assertActive = (method: string): void => {
    if (runtime.destroyed) {
      throw new Error(`Flow.${method}: instance has been destroyed.`);
    }
  };
  const currentStep = (): FlowStep => steps[state.currentIndex];
  const getStepData = (stepId: string): FlowData =>
    clonePlainObject(state.stepData[stepId]);
  const publicStep = (
    step: FlowStep | null | undefined
  ): PublicFlowStep | null => {
    if (!step) return null;
    const {
      onEnter: _onEnter,
      onLeave: _onLeave,
      onNext: _onNext,
      onBack: _onBack,
      canEnter: _canEnter,
      canLeave: _canLeave,
      ...result
    } = step;
    return result;
  };
  const snapshot = (): FlowSnapshot => ({
    id: state.id,
    currentId: state.currentId,
    currentIndex: state.currentIndex,
    previousId: state.previousId,
    previousIndex: state.previousIndex,
    direction: state.direction,
    history: [...state.history],
    data: clonePlainObject(state.data),
    stepData: clonePlainObject(state.stepData) as Record<string, FlowData>,
    currentData: getStepData(state.currentId),
    currentStep: publicStep(currentStep()),
    canBack: state.currentIndex > 0 && !state.loading,
    canNext: state.currentIndex < steps.length - 1 && !state.loading,
    isLast: state.currentIndex === steps.length - 1,
    loading: state.loading,
    busyAction: state.busyAction,
    error: state.error,
  });
  const emitChange = (previous: FlowSnapshot | null = null): void => {
    const next = snapshot();
    for (const subscriber of subscribers) subscriber(next, flow, previous);
    props.onChange?.(next, flow, previous);
  };
  const replaceObject = (target: FlowData, source: FlowData): void => {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, source);
  };
  const setStepData = (
    stepId: string,
    data: FlowPayload,
    options: { silent?: boolean } = {}
  ): Flow => {
    assertActive('setStepData');
    validateParam('stepId', stepId, { type: 'string' }, 'Flow.setStepData');
    validateParam('data', data, FLOW_PAYLOAD_RULE, 'Flow.setStepData');
    if (!data || !stepMap.has(stepId)) return flow;
    flushSync(() => {
      state.stepData[stepId] = {
        ...clonePlainObject(state.stepData[stepId]),
        ...data,
      };
      if (props.cache) Object.assign(state.data, data);
      state.version += 1;
    });
    if (!options.silent) emitChange();
    return flow;
  };
  const setData = (data: FlowPayload): Flow => {
    assertActive('setData');
    validateParam('data', data, FLOW_PAYLOAD_RULE, 'Flow.setData');
    if (!data) return flow;
    flushSync(() => {
      Object.assign(state.data, data);
      state.version += 1;
    });
    emitChange();
    return flow;
  };
  const addCleanup = (cleanup: FlowCleanup): FlowCleanup => {
    if (typeof cleanup !== 'function') {
      throw new Error('Flow.addCleanup: cleanup expects a function.');
    }
    if (runtime.destroyed) {
      cleanup();
      return () => {};
    }
    cleanupTasks.add(cleanup);
    return () => cleanupTasks.delete(cleanup);
  };
  const createAbortError = (): FlowError => {
    const error = new Error('Flow: active action was aborted.') as FlowError;
    error.code = 'FLOW_ABORTED';
    return error;
  };
  const callHook = async <TResult>(
    hook: ((...args: never[]) => TResult | Promise<TResult>) | null | undefined,
    args: unknown[]
  ): Promise<TResult | undefined> => {
    if (typeof hook !== 'function') return undefined;
    const result = await (
      hook as (...values: unknown[]) => TResult | Promise<TResult>
    )(...args);
    if (runtime.destroyed) throw createAbortError();
    return result;
  };
  const createContext = (
    extra: Partial<
      Pick<
        FlowContext,
        'step' | 'payload' | 'direction' | 'fromId' | 'targetId'
      >
    > = {}
  ): FlowContext => {
    const step = extra.step || currentStep();
    return {
      ...extra,
      flow,
      step,
      state,
      signal: runtime.actionController?.signal || null,
      snapshot: snapshot(),
      data: clonePlainObject(state.data),
      currentData: getStepData(step.id),
      setData,
      setStepData: (id, data) => setStepData(id, data),
      getStepData,
      next: (payload) => flow.next(payload),
      back: (payload) => flow.back(payload),
      goTo: (target, payload, options) => flow.goTo(target, payload, options),
      addCleanup,
    };
  };
  const handleError = (
    error: unknown,
    previous: FlowSnapshot | null = null
  ): void => {
    flushSync(() => {
      state.error = error;
      state.version += 1;
    });
    props.onError?.(error, snapshot(), flow, previous);
  };
  const setLoading = (value: boolean, action: FlowAction | null): void => {
    const previous = snapshot();
    if (state.loading === value && state.busyAction === action) return;
    flushSync(() => {
      state.loading = value;
      state.busyAction = value ? action : null;
      state.version += 1;
    });
    emitChange(previous);
  };
  const handleBusy = (action: FlowAction): FlowSnapshot | null => {
    if (!state.loading) return null;
    const error = new Error(
      `Flow: action "${action}" ignored while loading.`
    ) as FlowError;
    error.code = 'FLOW_BUSY';
    props.onBusy?.(action, snapshot(), flow);
    if (props.busyStrategy === 'throw') throw error;
    return snapshot();
  };
  const runAction = async (
    action: FlowAction,
    task: () => Promise<FlowSnapshot | null>,
    internal = false
  ): Promise<FlowSnapshot | null> => {
    const outer = !internal && !state.loading;
    if (outer) {
      runtime.actionController = new AbortController();
      runtime.activeAction = action;
      setLoading(true, action);
    }
    try {
      return await task();
    } catch (error) {
      if (runtime.destroyed) return null;
      if (state.error !== error) handleError(error);
      throw error;
    } finally {
      if (outer && !runtime.destroyed) {
        setLoading(false, null);
        runtime.activeAction = null;
        runtime.actionController = null;
      }
    }
  };
  const captureState = (): CapturedFlowState => ({
    currentId: state.currentId,
    currentIndex: state.currentIndex,
    previousId: state.previousId,
    previousIndex: state.previousIndex,
    direction: state.direction,
    history: [...state.history],
    data: clonePlainObject(state.data),
    stepData: clonePlainObject(state.stepData) as Record<string, FlowData>,
    loading: state.loading,
    busyAction: state.busyAction,
    error: state.error,
    version: state.version,
  });
  const restoreState = (captured: CapturedFlowState): void => {
    flushSync(() => {
      state.currentId = captured.currentId;
      state.currentIndex = captured.currentIndex;
      state.previousId = captured.previousId;
      state.previousIndex = captured.previousIndex;
      state.direction = captured.direction;
      state.history.splice(0, state.history.length, ...captured.history);
      replaceObject(state.data, captured.data);
      replaceObject(state.stepData, captured.stepData);
      state.loading = true;
      state.busyAction = captured.busyAction;
      state.error = captured.error;
      state.version = captured.version + 1;
    });
  };
  const resolveStepIndex = (target: FlowTarget): number => {
    if (typeof target === 'number') {
      if (!steps[target]) throw new Error('Flow.goTo target is out of range.');
      return target;
    }
    const index = stepMap.get(target);
    if (index == null)
      throw new Error(`Flow.goTo target "${target}" does not exist.`);
    return index;
  };
  const transitionTo = async (
    toStep: FlowStep,
    direction: FlowDirection,
    payload: FlowPayload,
    fromStep: FlowStep
  ): Promise<void> => {
    const previous = snapshot();
    const rollback = captureState();
    try {
      if (payload) setStepData(fromStep.id, payload, { silent: true });
      if (fromStep.canLeave) {
        const allowed = await callHook(fromStep.canLeave, [
          createContext({ direction, targetId: toStep.id }),
        ]);
        if (allowed === false) {
          throw new Error(`Flow: step "${fromStep.id}" blocked leaving.`);
        }
      }
      if (toStep.canEnter) {
        const allowed = await callHook(toStep.canEnter, [
          createContext({ direction, fromId: fromStep.id, step: toStep }),
        ]);
        if (allowed === false) {
          throw new Error(`Flow: step "${toStep.id}" blocked entering.`);
        }
      }
      await callHook(fromStep.onLeave, [
        createContext({ direction, step: fromStep, targetId: toStep.id }),
      ]);
      const previousId = state.currentId;
      const previousIndex = state.currentIndex;
      flushSync(() => {
        state.previousId = previousId;
        state.previousIndex = previousIndex;
        state.currentId = toStep.id;
        state.currentIndex = stepMap.get(toStep.id) ?? 0;
        state.direction = direction;
        if (direction === 'back') state.history.pop();
        else state.history.push(toStep.id);
        state.error = null;
        state.version += 1;
      });
      await callHook(toStep.onEnter, [
        createContext({ direction, fromId: previousId, step: toStep }),
      ]);
      emitChange(previous);
    } catch (error) {
      if (runtime.destroyed) throw error;
      if (props.rollbackOnError) restoreState(rollback);
      handleError(error, previous);
      throw error;
    }
  };
  const runMoveHook = async (
    type: 'next' | 'back',
    step: FlowStep,
    payload: FlowPayload,
    fallbackId: string
  ): Promise<FlowStepResult | FlowPayload | void> => {
    const stepHook = type === 'back' ? step.onBack : step.onNext;
    const globalHook = type === 'back' ? props.onBack : props.onNext;
    const context = createContext({ payload, targetId: fallbackId });
    const stepResult = await callHook(stepHook, [context]);
    if (stepResult != null) return stepResult;
    const globalResult = await callHook(globalHook, [context]);
    return globalResult ?? fallbackId;
  };

  const createRenderContext = (
    fallback: () => RenderableContent<FlowRenderContext>
  ): FlowRenderContext => {
    const current = snapshot();
    return {
      flow,
      snapshot: current,
      state,
      steps: steps.map(publicStep),
      currentStep: current.currentStep,
      currentData: current.currentData,
      data: current.data,
      fallback,
      next: (payload) => flow.next(payload),
      back: (payload) => flow.back(payload),
      goTo: (target, payload, options) => flow.goTo(target, payload, options),
      reset: () => flow.reset(),
    };
  };
  const renderSlot = (
    name: FlowSlotName,
    fallback: () => RenderableContent<FlowRenderContext>
  ): RenderableContent<FlowRenderContext> => {
    const slot = props[name];
    if (slot === false) return null;
    if (typeof slot !== 'function') return fallback();
    return () => {
      const version = state.version;
      return version >= 0 ? slot(createRenderContext(fallback)) : null;
    };
  };
  const contentView = (): RenderableContent<FlowRenderContext> => {
    const content = currentStep().content;
    return typeof content === 'function'
      ? (content(createContext()) as RenderableContent<FlowRenderContext>)
      : ((content ?? '') as RenderableContent<FlowRenderContext>);
  };
  const buildUi = (): FunctionalComponent<
    Record<string, unknown>,
    FlowState,
    HTMLElement,
    object
  > =>
    defineComponent({
      name: 'FlowView',
      props: {},
      state,
      view: () =>
        jsx('div', {
          className: props.className.root,
          id: props.id,
          role: 'group',
          'data-flow': 'root',
          'aria-busy': () => (state.loading ? 'true' : 'false'),
          children: [
            jsx('div', {
              className: props.className.header,
              'data-flow-header': '',
              children: renderSlot('renderHeader', () =>
                jsx('ol', {
                  className: props.className.steps,
                  'data-flow-steps': '',
                  role: 'list',
                  'aria-label': 'Flow steps',
                  children: steps.map((step, index) =>
                    jsx('li', {
                      className: () =>
                        [
                          props.className.step,
                          index === state.currentIndex
                            ? props.className.active
                            : '',
                          index < state.currentIndex
                            ? props.className.complete
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' '),
                      'data-flow-step': step.id,
                      'data-flow-step-index': String(index),
                      'aria-current': () =>
                        index === state.currentIndex ? 'step' : null,
                      children: jsx('button', {
                        type: 'button',
                        className: props.className.stepButton,
                        disabled: () =>
                          props.linear && index > state.currentIndex,
                        'aria-current': () =>
                          index === state.currentIndex ? 'step' : null,
                        onClick: () => {
                          if (index !== state.currentIndex)
                            void flow.goTo(index);
                        },
                        children: [
                          jsx('span', {
                            className: props.className.stepIndex,
                            'data-flow-step-number': '',
                            children: index + 1,
                          }),
                          jsx('span', {
                            className: props.className.stepTitle,
                            'data-flow-step-title': '',
                            children: step.title || step.id,
                          }),
                        ],
                      }),
                    })
                  ),
                })
              ),
            }),
            jsx('div', {
              className: props.className.body,
              'data-flow-body': '',
              role: 'region',
              'aria-live': 'polite',
              'aria-busy': () => (state.loading ? 'true' : 'false'),
              children: renderSlot('renderBody', () => () => {
                const version = state.version;
                return version >= 0 ? contentView() : null;
              }),
            }),
            jsx('div', {
              className: props.className.footer,
              'data-flow-footer': '',
              children: renderSlot('renderFooter', () => [
                props.showReset
                  ? jsx('button', {
                      type: 'button',
                      className: [props.className.button, props.className.reset]
                        .filter(Boolean)
                        .join(' '),
                      'data-action': 'reset',
                      onClick: () => flow.reset(),
                      disabled: () => state.loading,
                      children: props.text.reset,
                    })
                  : null,
                props.showBack
                  ? jsx('button', {
                      type: 'button',
                      className: [props.className.button, props.className.back]
                        .filter(Boolean)
                        .join(' '),
                      'data-action': 'back',
                      onClick: () => void flow.back(),
                      disabled: () => !flow.canBack,
                      children: props.text.back,
                    })
                  : null,
                props.showNext
                  ? jsx('button', {
                      type: 'button',
                      className: [props.className.button, props.className.next]
                        .filter(Boolean)
                        .join(' '),
                      'data-action': 'next',
                      onClick: () => void flow.next(),
                      disabled: () => state.loading,
                      children: () =>
                        flow.isLast ? props.text.finish : props.text.next,
                    })
                  : null,
              ]),
            }),
          ],
        }) as HTMLElement,
    });

  flow = {
    props,
    steps,
    state,
    runtime,
    get element() {
      return ui?.element || null;
    },
    get currentStep() {
      return currentStep();
    },
    get currentData() {
      return getStepData(state.currentId);
    },
    get canBack() {
      return state.currentIndex > 0 && !state.loading;
    },
    get canNext() {
      return state.currentIndex < steps.length - 1 && !state.loading;
    },
    get isLast() {
      return state.currentIndex === steps.length - 1;
    },
    build() {
      assertActive('build');
      if (runtime.built) return flow;
      if (props.render) {
        ui ||= buildUi();
        ui.build();
      }
      runtime.built = true;
      return flow;
    },
    mount(container) {
      assertActive('mount');
      flow.build();
      if (ui) ui.mount(container);
      runtime.mounted = !!ui;
      return flow;
    },
    unmount() {
      assertActive('unmount');
      ui?.unmount();
      runtime.mounted = false;
      return flow;
    },
    subscribe(handler) {
      assertActive('subscribe');
      if (typeof handler !== 'function') {
        throw new Error('Flow.subscribe: handler expects a function.');
      }
      subscribers.add(handler);
      handler(snapshot(), flow, null);
      return () => subscribers.delete(handler);
    },
    snapshot,
    async next(payload = null) {
      assertActive('next');
      validateParam('payload', payload, FLOW_PAYLOAD_RULE, 'Flow.next');
      const busy = handleBusy('next');
      if (busy) return busy;
      return runAction('next', async () => {
        if (flow.isLast) {
          if (payload) setStepData(state.currentId, payload);
          await callHook(props.onFinish, [snapshot(), flow]);
          return snapshot();
        }
        const from = currentStep();
        const fallback = steps[state.currentIndex + 1]?.id;
        const result = await runMoveHook('next', from, payload, fallback);
        const target = normalizeStepResult(result, fallback);
        return flow.goTo(target.id, target.data ?? payload, {
          direction: 'next',
          internal: true,
        });
      });
    },
    async back(payload = null) {
      assertActive('back');
      validateParam('payload', payload, FLOW_PAYLOAD_RULE, 'Flow.back');
      const busy = handleBusy('back');
      if (busy) return busy;
      if (!flow.canBack) return snapshot();
      return runAction('back', async () => {
        const from = currentStep();
        const fallback = steps[state.currentIndex - 1]?.id;
        const result = await runMoveHook('back', from, payload, fallback);
        const target = normalizeStepResult(result, fallback);
        return flow.goTo(target.id, target.data ?? payload, {
          direction: 'back',
          internal: true,
        });
      });
    },
    async goTo(target, payload = null, options = {}) {
      assertActive('goTo');
      validateParam('payload', payload, FLOW_PAYLOAD_RULE, 'Flow.goTo');
      const busy = options.internal ? null : handleBusy('goTo');
      if (busy) return busy;
      return runAction(
        'goTo',
        async () => {
          const index = resolveStepIndex(target);
          const to = steps[index];
          const from = currentStep();
          if (to.id === state.currentId) {
            if (payload) setStepData(state.currentId, payload);
            return snapshot();
          }
          await transitionTo(to, options.direction || 'go', payload, from);
          return snapshot();
        },
        !!options.internal
      );
    },
    setData,
    setStepData,
    getStepData,
    reset() {
      assertActive('reset');
      flushSync(() => {
        state.currentId = initialStepId;
        state.currentIndex = stepMap.get(initialStepId) ?? 0;
        state.previousId = null;
        state.previousIndex = null;
        state.direction = null;
        state.history.splice(0, state.history.length, initialStepId);
        replaceObject(state.data, clonePlainObject(initialGlobal));
        replaceObject(
          state.stepData,
          clonePlainObject(initialStepData) as Record<string, FlowData>
        );
        state.loading = false;
        state.busyAction = null;
        state.error = null;
        state.version += 1;
      });
      emitChange();
      return flow;
    },
    async finish(payload = null) {
      assertActive('finish');
      validateParam('payload', payload, FLOW_PAYLOAD_RULE, 'Flow.finish');
      const busy = handleBusy('finish');
      if (busy) return busy;
      return runAction('finish', async () => {
        if (payload) setStepData(state.currentId, payload);
        await callHook(props.onFinish, [snapshot(), flow]);
        return snapshot();
      });
    },
    destroy() {
      if (runtime.destroyed) return;
      runtime.destroyed = true;
      runtime.actionController?.abort();
      runtime.actionController = null;
      runtime.activeAction = null;
      ui?.destroy();
      ui = null;
      for (const cleanup of cleanupTasks) cleanup();
      cleanupTasks.clear();
      subscribers.clear();
      runtime.built = false;
      runtime.mounted = false;
      stepMap.clear();
    },
  };

  return flow;
}

import {
  createDeepStore,
  createRoot,
  flushSync,
  jsx,
  onCleanup,
  render,
} from 'vanilla-signal';

import {
  isPlainObject,
  randomId,
  resolveProps,
  validateParam,
} from '../utilities/core.js';
import { requireRenderDOM, resolveElement } from '../utilities/dom.js';

function isFlowRenderContent(content) {
  return (
    content == null ||
    typeof content === 'string' ||
    typeof content === 'function' ||
    Array.isArray(content) ||
    (typeof Node !== 'undefined' && content instanceof Node)
  );
}

function isFlowStep(step) {
  return !!step && typeof step === 'object' && typeof step.id === 'string';
}

function isFlowRenderSlot(slot) {
  return slot == null || slot === false || typeof slot === 'function';
}

function clonePlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...value }
    : {};
}

function cloneArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

function cloneSteps(steps) {
  if (!Array.isArray(steps)) return [];
  return steps.map((step) => ({
    ...step,
    data: clonePlainObject(step.data),
    modal: clonePlainObject(step.modal),
    view: clonePlainObject(step.view),
  }));
}

function normalizeStepResult(result, fallbackId) {
  if (typeof result === 'string') return { id: result };
  if (result && typeof result === 'object') return result;
  return { id: fallbackId };
}

const FLOW_STEP_RULE = {
  validate: isFlowStep,
  message: 'expects a step object with a string id.',
};

const FLOW_CONTENT_RULE = {
  validate: isFlowRenderContent,
  message: 'expects string, Node, array, function or null.',
};

const FLOW_STEPS_RULE = {
  validate: (value) => Array.isArray(value) && value.length > 0,
  message: 'expects a non-empty steps array.',
};

const FLOW_PAYLOAD_RULE = {
  validate: (value) =>
    value == null || (typeof value === 'object' && !Array.isArray(value)),
  message: 'expects an object or null.',
};

const FLOW_RENDER_SLOT_RULE = {
  validate: isFlowRenderSlot,
  message: 'expects function, false or null.',
};

const FLOW_TEXT_RULE = {
  default: {},
  validate: (value) => isPlainObject(value),
  message: 'expects an object with text fields.',
  normalize: (value) => {
    const text = isPlainObject(value) ? value : {};
    return {
      ...text,
      back: typeof text.back === 'string' ? text.back : 'Back',
      next: typeof text.next === 'string' ? text.next : 'Next',
      finish: typeof text.finish === 'string' ? text.finish : 'Finish',
      reset: typeof text.reset === 'string' ? text.reset : 'Reset',
    };
  },
};

const FLOW_OPTIONS_SCHEMA = {
  id: {
    default: null,
    types: ['string', 'null'],
    normalize: (value) => {
      if (typeof value === 'string')
        return value.trim() ? value.trim() : randomId();
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
  showHeader: { default: true, type: 'boolean' },
  showFooter: { default: true, type: 'boolean' },
  showSteps: { default: true, type: 'boolean' },
  showBack: { default: true, type: 'boolean' },
  showNext: { default: true, type: 'boolean' },
  showReset: { default: false, type: 'boolean' },
  text: FLOW_TEXT_RULE,
  className: { default: '', type: 'string' },
  renderHeader: { default: null, ...FLOW_RENDER_SLOT_RULE },
  renderSteps: { default: null, ...FLOW_RENDER_SLOT_RULE },
  renderBody: { default: null, ...FLOW_RENDER_SLOT_RULE },
  renderFooter: { default: null, ...FLOW_RENDER_SLOT_RULE },
  onChange: { default: null, types: ['function', 'null'] },
  onNext: { default: null, types: ['function', 'null'] },
  onBack: { default: null, types: ['function', 'null'] },
  onFinish: { default: null, types: ['function', 'null'] },
  onError: { default: null, types: ['function', 'null'] },
  onBusy: { default: null, types: ['function', 'null'] },
};

/**
 * @typedef {object} FlowStep
 * @property {string} id 步骤 id。
 * @property {string} [title] 步骤标题。
 * @property {string} [description] 步骤描述。
 * @property {string|Node|Node[]|Function|null} [content] 默认 UI 内容。
 * @property {object} [data] 步骤初始缓存数据。
 * @property {object|Function|null} [modal] 供 Modal 消费的显式 UI 配置；可返回 Partial<ModalOptions>。
 * @property {object} [view] 供外部组件消费的视图配置，如 modal 配置。
 * @property {Function|null} [onEnter] 进入步骤时触发。
 * @property {Function|null} [onLeave] 离开步骤前触发。
 * @property {Function|null} [onNext] 当前步骤 next 时触发。
 * @property {Function|null} [onBack] 当前步骤 back 时触发。
 * @property {Function|null} [canEnter] 是否允许进入步骤。
 * @property {Function|null} [canLeave] 是否允许离开步骤。
 */

/**
 * @typedef {object} FlowOptions
 * @property {string|null} [id] Flow 根 id。
 * @property {FlowStep[]} steps 步骤列表。
 * @property {string|number|null} [initial] 初始步骤 id 或索引。
 * @property {boolean} [cache=true] 是否缓存每一步的数据。
 * @property {boolean} [linear=true] 是否按步骤顺序限制 next/back。
 * @property {boolean} [render=true] 是否启用默认 UI 渲染。
 * @property {boolean} [rollbackOnError=true] transition 失败时是否回滚状态。
 * @property {"ignore"|"throw"} [busyStrategy="ignore"] loading 中重复触发动作时的处理策略。
 * @property {boolean} [showHeader=true] 是否显示头部。
 * @property {boolean} [showFooter=true] 是否显示底部。
 * @property {boolean} [showSteps=true] 是否显示步骤条。
 * @property {boolean} [showBack=true] 是否显示返回按钮。
 * @property {boolean} [showNext=true] 是否显示下一步按钮。
 * @property {boolean} [showReset=false] 是否显示重置按钮。
 * @property {object} [text={}] 文案配置，支持 `back`、`next`、`finish`、`reset`。
 * @property {string} [className=""] 根节点附加类名。
 * @property {Function|null|false} [renderHeader] 自定义头部渲染。
 * @property {Function|null|false} [renderSteps] 自定义步骤条渲染。
 * @property {Function|null|false} [renderBody] 自定义内容区渲染。
 * @property {Function|null|false} [renderFooter] 自定义底部渲染。
 * @property {Function|null} [onChange] 步骤切换后触发。
 * @property {Function|null} [onNext] 全局 next 时触发。
 * @property {Function|null} [onBack] 全局 back 时触发。
 * @property {Function|null} [onFinish] 完成时触发。
 * @property {Function|null} [onError] 生命周期错误时触发。
 * @property {Function|null} [onBusy] 重复触发动作时触发。
 */

/**
 * Headless 流程控制器，带可选默认 UI。
 *
 * 适合在 Modal、Offcanvas、页面表单或任意业务组件中复用 next/back/goTo、步骤缓存和生命周期。
 */
export class Flow {
  /**
   * 创建 Flow 实例。
   * @param {FlowOptions} [options={}] Flow 配置。
   */
  constructor(options = {}) {
    this.options = resolveProps(options, FLOW_OPTIONS_SCHEMA, 'Flow.options');
    this._init(this.options);
  }

  _init(options) {
    this.steps = cloneSteps(options.steps);
    this._validateSteps(this.steps);
    this._stepMap = new Map(this.steps.map((step, index) => [step.id, index]));
    this._initialStepId = this._resolveInitialStepId(options.initial);
    this._initialData = this._createInitialStepData();
    this._subscribers = new Set();
    this._renderDispose = null;
    this._cleanupTasks = new Set();
    this._nodes = {};
    this._destroyed = false;
    this._activeAction = null;
    this._actionController = null;
    this.root = null;

    this.state = createDeepStore({
      id: options.id,
      currentId: this._initialStepId,
      currentIndex: this._stepMap.get(this._initialStepId),
      previousId: null,
      previousIndex: null,
      direction: null,
      history: [this._initialStepId],
      data: clonePlainObject(this._initialData.global),
      stepData: clonePlainObject(this._initialData.stepData),
      loading: false,
      error: null,
      busyAction: null,
      version: 0,
    });
  }

  /**
   * 当前步骤。
   * @returns {FlowStep}
   */
  get currentStep() {
    return this.steps[this.state.currentIndex];
  }

  /**
   * 当前步骤数据。
   * @returns {object}
   */
  get currentData() {
    return this.getStepData(this.state.currentId);
  }

  /**
   * 是否可以返回上一步。
   * @returns {boolean}
   */
  get canBack() {
    return this.state.currentIndex > 0 && !this.state.loading;
  }

  /**
   * 是否可以前进。
   * @returns {boolean}
   */
  get canNext() {
    return (
      this.state.currentIndex < this.steps.length - 1 && !this.state.loading
    );
  }

  /**
   * 是否处于最后一步。
   * @returns {boolean}
   */
  get isLast() {
    return this.state.currentIndex === this.steps.length - 1;
  }

  /**
   * 订阅状态变化。
   * @param {Function} handler 订阅函数。
   * @returns {Function} 取消订阅函数。
   */
  subscribe(handler) {
    this._assertActive('subscribe');
    if (typeof handler !== 'function') {
      throw new Error('Flow.subscribe: handler expects a function.');
    }
    this._subscribers.add(handler);
    handler(this.snapshot(), this);
    return () => this._subscribers.delete(handler);
  }

  /**
   * 获取不可变快照。
   * @returns {object}
   */
  snapshot() {
    if (!this.state) return null;
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
      stepData: clonePlainObject(this.state.stepData),
      currentData: this.currentData,
      currentStep: this._publicStep(currentStep),
      canBack: this.canBack,
      canNext: this.canNext,
      isLast: this.isLast,
      loading: this.state.loading,
      busyAction: this.state.busyAction,
      error: this.state.error,
    };
  }

  /**
   * 挂载默认 Flow UI。
   * @param {Element|Node|string|Array} container DOM 容器、选择器或 JSX/h 返回节点。
   * @returns {Flow}
   */
  mount(container) {
    this._assertActive('mount');
    if (!this.options.render) return this;
    requireRenderDOM('Flow.mount');

    const target = resolveElement(container, 'Flow.mount.container');

    this.unmount();
    this.root = this._buildRoot();
    target.appendChild(this.root);
    this._mountView();
    return this;
  }

  /**
   * 卸载默认 UI。
   * @returns {Flow}
   */
  unmount() {
    this._renderDispose?.();
    this._renderDispose = null;
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
    this._nodes = {};
    return this;
  }

  /**
   * 前进一步。
   * @param {object|null} [payload=null] 当前步骤需要缓存的数据。
   * @returns {Promise<object>} 切换后的快照。
   */
  async next(payload = null) {
    this._assertActive('next');
    validateParam('payload', payload, FLOW_PAYLOAD_RULE, 'Flow.next');
    const busySnapshot = this._handleBusy('next');
    if (busySnapshot) return busySnapshot;

    return this._runAction('next', async () => {
      if (this.isLast) return this.finish(payload, { internal: true });

      const fromStep = this.currentStep;
      const fallbackId = this.steps[this.state.currentIndex + 1]?.id;
      const result = await this._runMoveHook(
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
  async back(payload = null) {
    this._assertActive('back');
    validateParam('payload', payload, FLOW_PAYLOAD_RULE, 'Flow.back');
    const busySnapshot = this._handleBusy('back');
    if (busySnapshot) return busySnapshot;

    if (!this.canBack) return this.snapshot();

    return this._runAction('back', async () => {
      const fromStep = this.currentStep;
      const fallbackId = this.steps[this.state.currentIndex - 1]?.id;
      const result = await this._runMoveHook(
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
  async goTo(target, payload = null, options = {}) {
    this._assertActive('goTo');
    validateParam('payload', payload, FLOW_PAYLOAD_RULE, 'Flow.goTo');
    const busySnapshot = options.internal ? null : this._handleBusy('goTo');
    if (busySnapshot) return busySnapshot;

    return this._runAction(
      'goTo',
      async () => {
        const toIndex = this._resolveStepIndex(target);
        const toStep = this.steps[toIndex];
        const fromStep = this.currentStep;

        if (!toStep || toStep.id === this.state.currentId) {
          if (payload) this.setStepData(this.state.currentId, payload);
          return this.snapshot();
        }

        await this._transitionTo(toStep, {
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
  setData(data) {
    this._assertActive('setData');
    validateParam('data', data, FLOW_PAYLOAD_RULE, 'Flow.setData');
    if (!data) return this;

    flushSync(() => {
      Object.assign(this.state.data, data);
      this.state.version += 1;
    });
    this._emitChange();
    return this;
  }

  /**
   * 合并指定步骤缓存数据。
   * @param {string} stepId 步骤 id。
   * @param {object|null} data 数据补丁。
   * @returns {Flow}
   */
  setStepData(stepId, data, options = {}) {
    this._assertActive('setStepData');
    validateParam('stepId', stepId, { type: 'string' }, 'Flow.setStepData');
    validateParam('data', data, FLOW_PAYLOAD_RULE, 'Flow.setStepData');
    if (!data || !this._stepMap.has(stepId)) return this;

    flushSync(() => {
      this.state.stepData[stepId] = {
        ...clonePlainObject(this.state.stepData[stepId]),
        ...data,
      };
      if (this.options.cache) Object.assign(this.state.data, data);
      this.state.version += 1;
    });
    if (!options.silent) this._emitChange();
    return this;
  }

  /**
   * 获取指定步骤缓存数据。
   * @param {string} stepId 步骤 id。
   * @returns {object}
   */
  getStepData(stepId) {
    return clonePlainObject(this.state.stepData[stepId]);
  }

  /**
   * 重置流程。
   * @returns {Flow}
   */
  reset() {
    this._assertActive('reset');
    flushSync(() => {
      this.state.currentId = this._initialStepId;
      this.state.currentIndex = this._stepMap.get(this._initialStepId);
      this.state.previousId = null;
      this.state.previousIndex = null;
      this.state.direction = null;
      this.state.history.splice(
        0,
        this.state.history.length,
        this._initialStepId
      );
      this._replaceObject(
        this.state.data,
        clonePlainObject(this._initialData.global)
      );
      this._replaceObject(
        this.state.stepData,
        clonePlainObject(this._initialData.stepData)
      );
      this.state.loading = false;
      this.state.busyAction = null;
      this.state.error = null;
      this.state.version += 1;
    });
    this._emitChange();
    return this;
  }

  /**
   * 完成流程。
   * @param {object|null} [payload=null] 最后一步需要缓存的数据。
   * @returns {Promise<object>} 当前快照。
   */
  async finish(payload = null, options = {}) {
    this._assertActive('finish');
    validateParam('payload', payload, FLOW_PAYLOAD_RULE, 'Flow.finish');
    const busySnapshot = options.internal ? null : this._handleBusy('finish');
    if (busySnapshot) return busySnapshot;

    return this._runAction(
      'finish',
      async () => {
        if (payload) this.setStepData(this.state.currentId, payload);
        await this._callHook(this.options.onFinish, [this.snapshot(), this]);
        return this.snapshot();
      },
      { internal: options.internal }
    );
  }

  /**
   * 销毁 Flow 实例。
   * @returns {void}
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._abortActiveAction();
    this.unmount();
    for (const cleanup of Array.from(this._cleanupTasks)) {
      cleanup();
    }
    this._cleanupTasks.clear();
    this._subscribers.clear();
    this.steps = null;
    this.options = null;
    this.state = null;
    this._stepMap = null;
    this._initialData = null;
    this._activeAction = null;
    this._actionController = null;
  }

  _resolveInitialStepId(initial) {
    if (typeof initial === 'number') {
      const step = this.steps[initial];
      if (!step) throw new Error('Flow.options.initial index is out of range.');
      return step.id;
    }
    if (typeof initial === 'string') {
      if (!this._stepMap.has(initial)) {
        throw new Error(
          `Flow.options.initial step "${initial}" does not exist.`
        );
      }
      return initial;
    }
    return this.steps[0].id;
  }

  _validateSteps(steps) {
    const ids = new Set();
    for (const [index, step] of steps.entries()) {
      validateParam(String(index), step, FLOW_STEP_RULE, 'Flow.options.steps');
      validateParam(
        'content',
        step.content ?? null,
        FLOW_CONTENT_RULE,
        `Flow.options.steps.${index}`
      );
      if (ids.has(step.id)) {
        throw new Error(`Flow.options.steps: duplicated step id "${step.id}".`);
      }
      ids.add(step.id);
    }
  }

  _resolveStepIndex(target) {
    if (typeof target === 'number') {
      if (!this.steps[target])
        throw new Error('Flow.goTo target is out of range.');
      return target;
    }
    if (typeof target === 'string') {
      if (!this._stepMap.has(target)) {
        throw new Error(`Flow.goTo target "${target}" does not exist.`);
      }
      return this._stepMap.get(target);
    }
    throw new Error('Flow.goTo target expects string or number.');
  }

  _createInitialStepData() {
    const stepData = {};
    const global = {};
    for (const step of this.steps) {
      stepData[step.id] = clonePlainObject(step.data);
      Object.assign(global, stepData[step.id]);
    }
    return { stepData, global };
  }

  async _runMoveHook(type, step, payload, fallbackId) {
    const globalHook =
      type === 'back' ? this.options.onBack : this.options.onNext;
    const stepHook = type === 'back' ? step.onBack : step.onNext;
    const context = this._createContext({ payload, targetId: fallbackId });

    if (typeof stepHook === 'function') {
      const result = await this._callHook(stepHook, [context]);
      if (result != null) return result;
    }

    if (typeof globalHook === 'function') {
      const result = await this._callHook(globalHook, [context]);
      if (result != null) return result;
    }

    return fallbackId;
  }

  async _transitionTo(toStep, { direction, payload, fromStep }) {
    const fromSnapshot = this.snapshot();
    const rollbackState = this._captureState();

    try {
      if (payload) this.setStepData(fromStep.id, payload, { silent: true });

      await this._assertCanLeave(fromStep, toStep, direction);
      await this._assertCanEnter(toStep, fromStep, direction);

      if (typeof fromStep.onLeave === 'function') {
        await this._callHook(fromStep.onLeave, [
          this._createContext({
            direction,
            step: fromStep,
            targetId: toStep.id,
          }),
        ]);
      }

      const previousId = this.state.currentId;
      const previousIndex = this.state.currentIndex;
      const currentIndex = this._stepMap.get(toStep.id);

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
        await this._callHook(toStep.onEnter, [
          this._createContext({
            direction,
            fromId: previousId,
            step: toStep,
          }),
        ]);
      }

      this._emitChange(fromSnapshot);
    } catch (error) {
      if (this._destroyed || !this.state || !this.options) {
        throw error;
      }
      if (this.options.rollbackOnError) {
        this._restoreState(rollbackState, { keepLoading: true });
      }
      this._handleError(error, fromSnapshot);
      throw error;
    }
  }

  async _assertCanLeave(fromStep, toStep, direction) {
    if (typeof fromStep.canLeave !== 'function') return;
    const result = await this._callHook(fromStep.canLeave, [
      this._createContext({ direction, targetId: toStep.id }),
    ]);
    if (result === false) {
      throw new Error(`Flow: step "${fromStep.id}" blocked leaving.`);
    }
  }

  async _assertCanEnter(toStep, fromStep, direction) {
    if (typeof toStep.canEnter !== 'function') return;
    const result = await this._callHook(toStep.canEnter, [
      this._createContext({ direction, fromId: fromStep.id }),
    ]);
    if (result === false) {
      throw new Error(`Flow: step "${toStep.id}" blocked entering.`);
    }
  }

  _createContext(extra = {}) {
    const step = extra.step || this.currentStep;
    const snapshot = this.snapshot();
    return {
      ...extra,
      flow: this,
      step,
      state: this.state,
      signal: this._actionController?.signal || null,
      snapshot,
      data: clonePlainObject(this.state.data),
      currentData: this.getStepData(step.id),
      setData: (data) => this.setData(data),
      setStepData: (stepId, data) => this.setStepData(stepId, data),
      getStepData: (stepId) => this.getStepData(stepId),
      next: (payload) => this.next(payload),
      back: (payload) => this.back(payload),
      goTo: (target, payload, options) => this.goTo(target, payload, options),
      addCleanup: (cleanup) => this._addCleanup(cleanup),
    };
  }

  async _runAction(action, task, options = {}) {
    const isOuterAction = !options.internal && !this.state.loading;
    if (isOuterAction) {
      this._actionController =
        typeof AbortController !== 'undefined' ? new AbortController() : null;
      this._activeAction = action;
      this._setLoading(true, action);
    }

    try {
      return await task();
    } catch (error) {
      if (this._destroyed || !this.state) {
        return null;
      }
      if (!this._destroyed && this.state?.error !== error) {
        this._handleError(error);
      }
      throw error;
    } finally {
      if (isOuterAction && !this._destroyed) {
        this._setLoading(false, null);
        this._activeAction = null;
        this._actionController = null;
      }
    }
  }

  _handleBusy(action) {
    if (!this.state.loading) return null;

    const error = new Error(`Flow: action "${action}" ignored while loading.`);
    error.code = 'FLOW_BUSY';

    if (typeof this.options.onBusy === 'function') {
      this.options.onBusy(action, this.snapshot(), this);
    }

    if (this.options.busyStrategy === 'throw') {
      throw error;
    }

    return this.snapshot();
  }

  _abortActiveAction() {
    this._actionController?.abort?.();
    this._actionController = null;
    this._activeAction = null;
  }

  async _callHook(hook, args) {
    if (typeof hook !== 'function') return undefined;
    const result = await hook(...args);
    if (this._destroyed || !this.state) {
      throw this._createAbortError();
    }
    return result;
  }

  _createAbortError() {
    const error = new Error('Flow: active action was aborted.');
    error.code = 'FLOW_ABORTED';
    return error;
  }

  _setLoading(value, action = this.state?.busyAction || null) {
    if (!this.state) return;
    flushSync(() => {
      this.state.loading = value;
      this.state.busyAction = value ? action : null;
    });
  }

  _handleError(error, previous = null) {
    if (!this.state) return;
    flushSync(() => {
      this.state.error = error;
      this.state.version += 1;
    });
    if (typeof this.options.onError === 'function') {
      this.options.onError(error, this.snapshot(), this, previous);
    }
  }

  _emitChange(previous = null) {
    const next = this.snapshot();
    for (const handler of Array.from(this._subscribers)) {
      handler(next, this, previous);
    }
    if (typeof this.options.onChange === 'function') {
      this.options.onChange(next, this, previous);
    }
  }

  _replaceObject(target, source) {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, source);
  }

  _captureState() {
    return {
      currentId: this.state.currentId,
      currentIndex: this.state.currentIndex,
      previousId: this.state.previousId,
      previousIndex: this.state.previousIndex,
      direction: this.state.direction,
      history: cloneArray(this.state.history),
      data: clonePlainObject(this.state.data),
      stepData: clonePlainObject(this.state.stepData),
      loading: this.state.loading,
      busyAction: this.state.busyAction,
      error: this.state.error,
      version: this.state.version,
    };
  }

  _restoreState(snapshot, options = {}) {
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
      this._replaceObject(this.state.data, snapshot.data);
      this._replaceObject(this.state.stepData, snapshot.stepData);
      this.state.loading = options.keepLoading ? true : snapshot.loading;
      this.state.busyAction = snapshot.busyAction;
      this.state.error = snapshot.error;
      this.state.version = snapshot.version + 1;
    });
  }

  _addCleanup(cleanup) {
    if (typeof cleanup !== 'function') {
      throw new Error('Flow.addCleanup: cleanup expects a function.');
    }
    if (this._destroyed) {
      cleanup();
      return () => {};
    }
    this._cleanupTasks.add(cleanup);
    return () => this._cleanupTasks.delete(cleanup);
  }

  _assertActive(method) {
    if (this._destroyed || !this.state) {
      throw new Error(`Flow.${method}: instance has been destroyed.`);
    }
  }

  _publicStep(step) {
    if (!step) return null;
    const publicStep = { ...step };
    delete publicStep.onEnter;
    delete publicStep.onLeave;
    delete publicStep.onNext;
    delete publicStep.onBack;
    delete publicStep.canEnter;
    delete publicStep.canLeave;
    return publicStep;
  }

  _buildRoot() {
    return jsx('div', {
      className: `j-flow ${this.options.className || ''}`.trim(),
      id: this.options.id,
      role: 'group',
      'aria-busy': () => (this.state.loading ? 'true' : 'false'),
      'aria-labelledby': `${this.options.id}-title`,
      ref: (element) => {
        this._nodes.root = element;
      },
    });
  }

  _mountView() {
    if (this._renderDispose || !this.root) return;
    this._renderDispose = createRoot((dispose) => {
      const viewDispose = render(() => this._view(), this.root);
      onCleanup(viewDispose);
      return dispose;
    });
  }

  _view() {
    const snapshot = this.snapshot();
    return [
      this._renderSlot('renderHeader', snapshot, () =>
        this.options.showHeader ? this._headerView(snapshot) : null
      ),
      this._renderSlot('renderSteps', snapshot, () =>
        this.options.showSteps ? this._stepsView(snapshot) : null
      ),
      this._renderSlot('renderBody', snapshot, () => this._bodyView(snapshot)),
      this._renderSlot('renderFooter', snapshot, () =>
        this.options.showFooter ? this._footerView(snapshot) : null
      ),
    ];
  }

  _renderSlot(name, snapshot, fallback) {
    const slot = this.options[name];
    if (slot === false) return null;
    if (typeof slot === 'function') {
      return slot(this._createRenderContext(snapshot, fallback));
    }
    return fallback();
  }

  _createRenderContext(snapshot, fallback) {
    return {
      flow: this,
      snapshot,
      state: this.state,
      steps: this.steps.map((step) => this._publicStep(step)),
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

  _headerView(snapshot) {
    return jsx('div', {
      className: 'flow-header',
      children: [
        jsx('div', {
          id: `${this.options.id}-title`,
          className: 'flow-title',
          children:
            snapshot.currentStep?.title || snapshot.currentStep?.id || '',
        }),
        snapshot.currentStep?.description
          ? jsx('div', {
              className: 'flow-description',
              children: snapshot.currentStep.description,
            })
          : null,
      ],
    });
  }

  _stepsView(snapshot) {
    return jsx('ol', {
      className: 'flow-steps',
      role: 'list',
      'aria-label': 'Flow steps',
      children: this.steps.map((step, index) =>
        jsx('li', {
          className: this._stepClass(index, snapshot.currentIndex),
          'aria-current': index === snapshot.currentIndex ? 'step' : undefined,
          children: [
            jsx('button', {
              type: 'button',
              className: 'flow-step-button',
              disabled: this.options.linear && index > snapshot.currentIndex,
              'aria-current':
                index === snapshot.currentIndex ? 'step' : undefined,
              'aria-disabled':
                this.options.linear && index > snapshot.currentIndex
                  ? 'true'
                  : 'false',
              'aria-label': `${index + 1}. ${step.title || step.id}`,
              onClick: () => {
                if (index === snapshot.currentIndex) return;
                void this.goTo(index);
              },
              children: [
                jsx('span', {
                  className: 'flow-step-index',
                  children: index + 1,
                }),
                jsx('span', {
                  className: 'flow-step-title',
                  children: step.title || step.id,
                }),
              ],
            }),
          ],
        })
      ),
    });
  }

  _bodyView(snapshot) {
    return jsx('div', {
      className: 'flow-body',
      role: 'region',
      'aria-live': 'polite',
      'aria-busy': snapshot.loading ? 'true' : 'false',
      children: this._contentView(snapshot.currentStep?.content),
    });
  }

  _footerView(snapshot) {
    return jsx('div', {
      className: 'flow-footer',
      children: [
        this.options.showReset
          ? jsx('button', {
              type: 'button',
              className: 'j-button is-ghost flow-reset',
              onClick: () => this.reset(),
              disabled: snapshot.loading,
              'aria-disabled': snapshot.loading ? 'true' : 'false',
              children: this.options.text.reset,
            })
          : null,
        this.options.showBack
          ? jsx('button', {
              type: 'button',
              className: 'j-button is-ghost flow-back',
              'data-action': 'back',
              onClick: () => void this.back(),
              disabled: !snapshot.canBack,
              'aria-disabled': !snapshot.canBack ? 'true' : 'false',
              children: this.options.text.back,
            })
          : null,
        this.options.showNext
          ? jsx('button', {
              type: 'button',
              className: 'j-button is-primary flow-next',
              'data-action': 'next',
              onClick: () => void this.next(),
              disabled: snapshot.loading,
              'aria-disabled': snapshot.loading ? 'true' : 'false',
              children: snapshot.isLast
                ? this.options.text.finish
                : this.options.text.next,
            })
          : null,
      ],
    });
  }

  _contentView(content) {
    if (typeof content === 'function') return content(this._createContext());
    if (Array.isArray(content)) return content;
    if (typeof Node !== 'undefined' && content instanceof Node) return content;
    if (content == null) return '';
    if (typeof content !== 'string') return '';
    return content;
  }

  _stepClass(index, currentIndex = this.state.currentIndex) {
    const classes = ['flow-step'];
    if (index === currentIndex) classes.push('is-active');
    if (index < currentIndex) classes.push('is-complete');
    return classes.join(' ');
  }
}

/**
 * 创建 Flow 实例。
 * @param {FlowOptions} options Flow 配置。
 * @returns {Flow}
 */
export function createFlow(options) {
  return new Flow(options);
}

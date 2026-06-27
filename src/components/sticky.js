import { createDeepStore } from 'vanilla-signal';

import Component from '../core/Component.js';
import { resolveProps } from '../utilities/core.js';
import {
  isElement,
  requireContainer,
  requireRenderDOM,
} from '../utilities/dom.js';

const STICKY_PROPS_SCHEMA = {
  target: { default: null },
  parent: { default: null },
  max: {
    default: 10,
    type: 'number',
    validate: (value) => Number.isInteger(value) && value > 0,
    message: 'expects a positive integer.',
  },
  top: {
    default: 16,
    type: 'number',
    validate: (value) => value >= 0,
    message: 'expects a positive number or 0.',
  },
  gap: {
    default: 16,
    type: 'number',
    validate: (value) => value >= 0,
    message: 'expects a positive number or 0.',
  },
  overflow: {
    default: 'destroy',
    type: 'string',
    enum: ['destroy', 'ignore'],
  },
  onUpdate: { default: null, types: ['function', 'null'] },
};

/**
 * 对元素数组去重，并保持原始顺序。
 * @param {Element[]} elements 元素数组。
 * @returns {Element[]}
 */
function uniqueElements(elements) {
  return Array.from(new Set(elements.filter(isElement)));
}

/**
 * 判断元素是否在指定父级中。
 * @param {Element} element 目标元素。
 * @param {Element|null} parent 父级。
 * @returns {boolean}
 */
function isWithinParent(element, parent) {
  return !parent || element === parent || parent.contains(element);
}

/**
 * 归一化 parent 输入。
 * @param {Element|Node|string|null|false} parent 父级输入。
 * @returns {Element|null}
 */
function resolveParent(parent) {
  if (parent === false || parent == null) return null;
  return requireContainer(parent, 'Sticky.parent', 'element');
}

/**
 * 在 parent 作用域内解析 sticky 目标。
 * @param {Element|Node|string|Array|null|false} target 目标输入。
 * @param {Element|null} parent 父级。
 * @returns {Element[]}
 */
function resolveTarget(target, parent) {
  if (target === false || target == null) return [];

  if (typeof target === 'string') {
    if (!parent) {
      return uniqueElements(requireContainer(target, 'Sticky.target', 'array'));
    }

    const elements = uniqueElements(
      Array.from(parent.querySelectorAll(target))
    );
    if (elements.length === 0) {
      throw new Error('Sticky.target: target not found.');
    }
    return elements;
  }

  const nodes = requireContainer(target, 'Sticky.target', 'array');
  const elements = uniqueElements(nodes);

  if (!parent) return elements;
  const scopedElements = elements.filter((element) =>
    isWithinParent(element, parent)
  );
  if (scopedElements.length === 0) {
    throw new Error('Sticky.target: target not found in parent.');
  }
  return scopedElements;
}

/**
 * 读取元素 offsetHeight。
 * @param {Element} element 目标元素。
 * @returns {number}
 */
function getElementHeight(element) {
  const height = element.offsetHeight;
  return Number.isFinite(height) ? height : 0;
}

/**
 * Sticky 吸附组件。
 *
 * 用于给一个或多个元素应用 `position: sticky`，并按顺序计算 `top`
 * 偏移，适合页面侧边栏中多个 widget 的堆叠吸附场景。
 */
class Sticky extends Component {
  /**
   * 创建 Sticky 实例。
   * @param {object} [input={}] Sticky 配置。
   */
  constructor(input = {}) {
    const props = resolveProps(input, STICKY_PROPS_SCHEMA, 'Sticky.props');
    super(props);

    this.dom.parent = null;
    this.dom.targets = [];

    this.runtime.active = false;
    this.runtime.built = false;
    this.runtime.ignored = false;
    this.runtime.items = [];

    this.state = createDeepStore({
      count: 0,
      top: props.top,
      items: [],
    });
  }

  /**
   * 构建 Sticky 行为并应用样式。
   * @returns {Sticky} 当前实例。
   */
  build() {
    if (this.runtime.destroyed)
      throw new Error('Sticky.build: instance destroyed');
    if (this.runtime.built) return this;

    requireRenderDOM('Sticky');

    this.init(this.props);

    this.dom.parent = resolveParent(this.props.parent);
    this.dom.targets = resolveTarget(this.props.target, this.dom.parent);
    this.dom.targets = this._resolveOverflow(this.dom.targets);

    this.runtime.built = true;

    if (this.dom.targets.length === 0) return this;

    this.runtime.active = true;
    this._captureItems();
    this._apply();
    return this;
  }

  /**
   * 按当前实例的 targets 创建运行时条目。
   * @private
   */
  _captureItems() {
    this.runtime.items = this.dom.targets.map((element) => ({
      element,
      top: this.props.top,
      originalPosition: element.style.position,
      originalTop: element.style.top,
      originalZIndex: element.style.zIndex,
    }));
  }

  /**
   * 按 max/overflow 处理当前实例的目标集合。
   * @param {Element[]} targets 目标元素集合。
   * @returns {Element[]}
   * @private
   */
  _resolveOverflow(targets) {
    const { max, overflow } = this.props;
    if (targets.length <= max) return targets;

    this.runtime.ignored = overflow === 'ignore';
    return overflow === 'ignore' ? [] : targets.slice(-max);
  }

  /**
   * 对本实例重新计算 sticky 偏移。
   * @param {number} [startTop=this.props.top] 起始 top。
   * @returns {number} 当前实例处理后的下一个 top。
   * @private
   */
  _apply(startTop = this.props.top) {
    let nextTop = startTop;
    const stateItems = [];

    for (const item of this.runtime.items) {
      item.top = nextTop;
      item.element.style.position = 'sticky';
      item.element.style.top = `${nextTop}px`;

      stateItems.push({ element: item.element, top: nextTop });
      nextTop += getElementHeight(item.element) + this.props.gap;
    }

    this.setState({
      count: this.runtime.items.length,
      top: this.runtime.items[0]?.top ?? this.props.top,
      items: stateItems,
    });

    if (typeof this.props.onUpdate === 'function') {
      this.props.onUpdate(this);
    }

    return nextTop;
  }

  /**
   * 恢复本实例管理元素的原始内联样式。
   * @private
   */
  _restore() {
    for (const item of this.runtime.items) {
      item.element.style.position = item.originalPosition;
      item.element.style.top = item.originalTop;
      item.element.style.zIndex = item.originalZIndex;
    }
  }

  /**
   * 重新计算当前实例内所有 sticky 元素的 top。
   * @returns {Sticky} 当前实例。
   */
  refresh() {
    if (this.runtime.destroyed || !this.runtime.built || !this.runtime.active) {
      return this;
    }
    this._apply();
    return this;
  }

  /**
   * 销毁实例并恢复被管理元素的原始样式。
   * @private
   */
  onDestroy() {
    this._restore();
    this.runtime.active = false;
    this.runtime.built = false;
    this.runtime.items = [];
    this.dom.targets = [];
  }
}

/**
 * 创建 Sticky 实例。
 * @param {object} [props={}] Sticky 配置。
 * @returns {Sticky}
 */
export function createSticky(props = {}) {
  return new Sticky(props);
}

export default Sticky;

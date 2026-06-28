import { jsx } from 'vanilla-signal';

import { resolveProps, timer } from '../utilities/core.js';
import { isNode, requireRenderDOM, resolveElement } from '../utilities/dom.js';

const ELEMENT_REF_RULE = {
  validate: (value) =>
    value == null ||
    typeof value === 'string' ||
    Array.isArray(value) ||
    isNode(value),
  message: 'expects Element, Node, selector or JSX node.',
};

const PARABOLA_OPTIONS_SCHEMA = {
  ball: {
    default: {
      color: 'var(--primary, #3e63dd)',
      size: '10px',
    },
    type: 'object',
    validate: (value) =>
      value &&
      Object.keys(value).length === 2 &&
      typeof value.color === 'string' &&
      typeof value.size === 'string',
    message:
      'expects an object with two string properties: "color" and "size".',
  },
  from: { default: null, ...ELEMENT_REF_RULE },
  to: { default: null, ...ELEMENT_REF_RULE },
  direction: {
    default: 'center',
    type: 'string',
    enum: ['center', 'top-right', 'top-left', 'bottom-right', 'bottom-left'],
  },
  showDelay: { default: 0, type: 'number' },
  hideDelay: { default: 0, type: 'number' },
  onShow: { default: null, types: ['function', 'null'] },
  onHidden: { default: null, types: ['function', 'null'] },
};

/**
 * @typedef {object} ParabolaBallOptions
 * @property {string} color 小球颜色。
 * @property {string} size 小球尺寸，例如 `10px`。
 */

/**
 * @typedef {object} ParabolaOptions
 * @property {ParabolaBallOptions} [ball] 小球样式配置。
 * @property {Element|Node|string|Array} from 起点元素、选择器或 JSX/h 返回节点。
 * @property {Element|Node|string|Array} to 终点元素、选择器或 JSX/h 返回节点。
 * @property {"center"|"top-right"|"top-left"|"bottom-right"|"bottom-left"} [direction="center"] 起点取样位置。
 * @property {number} [showDelay=0] 开始动画前的延迟，单位毫秒。
 * @property {number} [hideDelay=0] 预留隐藏延迟配置。
 * @property {Function|null} [onShow] 动画开始前回调。
 * @property {Function|null} [onHidden] 动画结束或销毁后回调。
 */

/**
 * 抛物线动画组件。
 *
 * 用于实现“加入购物车”等从一个元素飞向另一个元素的小球动画。
 */
class Parabola {
  /**
   * 创建抛物线动画实例。
   * @param {ParabolaOptions} options 动画配置。
   */
  constructor(options) {
    requireRenderDOM('Parabola');

    this.options = resolveProps(
      options,
      PARABOLA_OPTIONS_SCHEMA,
      'Parabola.options'
    );
    this._init(this.options);
  }

  /**
   * 初始化动画状态并创建小球。
   * @private
   * @param {ParabolaOptions} options 已归一化配置。
   * @returns {void}
   */
  _init(options) {
    this.hidden = false;

    this._ball = null;
    this._animationId = null;

    const fromEl = resolveElement(options.from, 'Parabola.from');
    const toEl = resolveElement(options.to, 'Parabola.to');

    this._fromEl = fromEl;
    this._toEl = toEl;

    this._createBall(options);
  }

  /**
   * 创建动画小球节点。
   * @private
   * @param {ParabolaOptions} options 已归一化配置。
   * @returns {void}
   */
  _createBall(options) {
    if (this.hidden || this._ball) return;

    const { color, size } = options.ball;

    this._ball = jsx('div', {
      className: 'parabola-ball',
      style: {
        backgroundColor: color,
        width: size,
        height: size,
        position: 'fixed',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: '9999',
        opacity: '1',
      },
    });
    document.body.appendChild(this._ball);
  }

  /**
   * 计算动画起点和终点坐标。
   * @private
   * @param {ParabolaOptions} options 已归一化配置。
   * @returns {{startX:number,startY:number,endX:number,endY:number}|null}
   */
  _calculatePath(options) {
    const fromRect = this._fromEl?.getBoundingClientRect();
    const toRect = this._toEl?.getBoundingClientRect();

    if (!fromRect || !toRect) return null;

    const { left: fL, top: fT, width: fW, height: fH } = fromRect;
    const { left: tL, top: tT, width: tW, height: tH } = toRect;

    let startX, startY;
    switch (options.direction) {
      case 'top-left':
        startX = fL + fW * 0.2;
        startY = fT + fH * 0.2;
        break;
      case 'top-right':
        startX = fL + fW * 0.8;
        startY = fT + fH * 0.2;
        break;
      case 'bottom-left':
        startX = fL + fW * 0.2;
        startY = fT + fH * 0.8;
        break;
      case 'bottom-right':
        startX = fL + fW * 0.8;
        startY = fT + fH * 0.8;
        break;
      default: // 'center'
        startX = fL + fW / 2;
        startY = fT + fH / 2;
    }

    const endX = tL + tW / 2;
    const endY = tT + tH / 2;

    return { startX, startY, endX, endY };
  }

  /**
   * 三次缓出曲线。
   * @private
   * @param {number} t 动画进度，范围 0 到 1。
   * @returns {number}
   */
  _easeOutCubic(t) {
    return 1 - (1 - t) ** 3;
  }

  /**
   * 执行抛物线动画。
   * @private
   * @param {number} startX 起点 x 坐标。
   * @param {number} startY 起点 y 坐标。
   * @param {number} endX 终点 x 坐标。
   * @param {number} endY 终点 y 坐标。
   * @param {number} [duration=800] 动画时长，单位毫秒。
   * @returns {void}
   */
  _animate(startX, startY, endX, endY, duration = 800) {
    if (this.hidden) return;

    const startTime = performance.now();
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const peakOffset = -100;

    const step = (currentTime) => {
      if (this.hidden) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this._easeOutCubic(progress);

      const currentX = startX + deltaX * eased;
      const currentY =
        startY + peakOffset * Math.sin(Math.PI * eased) + deltaY * eased;

      const opacity = 1 - progress;

      this._ball.style.left = `${currentX}px`;
      this._ball.style.top = `${currentY}px`;
      this._ball.style.opacity = `${opacity}`;
      this._ball.style.transform = `translate(-50%, -50%) scale(${1 - eased * 0.3})`;

      if (progress < 1) {
        this._animationId = requestAnimationFrame(step);
      } else {
        this.destroy(); // 动画结束，直接销毁
      }
    };

    this._animationId = requestAnimationFrame(step);
  }

  /**
   * 开始播放动画。
   * @returns {Promise<boolean>} 成功开始动画时返回 true；元素缺失或已销毁时返回 false。
   */
  async show() {
    if (this.hidden) return false;

    return new Promise((resolve) => {
      timer.start('show', this.options.showDelay, () => {
        if (this.hidden) {
          resolve(false);
          return;
        }

        const path = this._calculatePath(this.options);
        if (!path) {
          this.destroy();
          resolve(false);
          return;
        }

        this._ball.style.left = `${path.startX}px`;
        this._ball.style.top = `${path.startY}px`;

        if (this.options.onShow) this.options.onShow();

        this._animate(path.startX, path.startY, path.endX, path.endY);
        resolve(true);
      });
    });
  }

  /**
   * 销毁动画实例并清理 DOM、定时器和动画帧。
   * @returns {void}
   */
  destroy() {
    if (this.hidden) return;

    this._ball?.remove();

    timer.cancel('show');
    if (this._animationId) cancelAnimationFrame(this._animationId);

    this._ball = null;
    this._fromEl = null;
    this._toEl = null;

    this.hidden = true;

    if (this.options.onHidden) this.options.onHidden();
  }

  /**
   * show 的语义化别名。
   * @returns {Promise<boolean>}
   */
  start() {
    return this.show();
  }
}
export default Parabola;

export function createParabola(options = {}) {
  return new Parabola(options);
}

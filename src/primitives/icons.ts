import iconPath from '../icons/index.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

export type IconPathMap = Record<string, string>;
export type IconName = string;
export type IconAttributeValue = string | number | boolean | null | undefined;
export interface IconProps {
  className?: IconAttributeValue;
  [attribute: string]: IconAttributeValue;
}

const defaultSvgObjects: IconPathMap = iconPath;

function assertIconName(name: IconName): void {
  if (!(name in defaultSvgObjects)) {
    throw new Error(`Icon "${name}" not found.`);
  }
}

function svgMarkup(name: IconName): string {
  assertIconName(name);
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" fill="currentColor">${defaultSvgObjects[name]}</svg>`;
}

function isSVGElement(value: Element | null): value is SVGElement {
  return value !== null && value.namespaceURI === SVG_NS;
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
export function icon(name: IconName, props: IconProps = {}): SVGElement {
  const template = document.createElement('template');
  template.innerHTML = svgMarkup(name);
  const svg = template.content.firstElementChild;

  if (!isSVGElement(svg)) {
    throw new Error(`Icon "${name}" cannot be rendered.`);
  }

  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    const attr = key === 'className' ? 'class' : key;
    svg.setAttribute(attr, value === true ? '' : String(value));
  }

  return svg;
}

/**
 * 获取完整 SVG 字符串。
 *
 * 仅在必须拼接字符串或写入 innerHTML 时使用；响应式渲染优先使用 icon(name)。
 * @param {string} name 图标名称。
 * @returns {string}
 */
export function iconHtml(name: IconName): string {
  return svgMarkup(name);
}

export const iconMarkup = iconHtml;

/**
 * 获取当前已注册图标的 path 片段浅拷贝。
 * @returns {Record<string, string>}
 */
export function getRegistedIconPath(): IconPathMap {
  return { ...defaultSvgObjects };
}

/**
 * 批量注册自定义图标。
 *
 * 传入值应为 SVG path 片段，不需要包含外层 svg。
 * @param {Record<string, string>} svgPathObjects 图标名称到 SVG path 的映射。
 * @returns {void}
 */
export function addIcons(svgPathObjects: IconPathMap): void {
  if (typeof svgPathObjects !== 'object' || svgPathObjects === null) {
    throw new Error('Icons must be a valid object.');
  }

  for (const [name, path] of Object.entries(svgPathObjects)) {
    if (typeof path !== 'string' || !path.trim().startsWith('<')) {
      throw new Error(`Invalid SVG path for icon "${name}".`);
    }
    defaultSvgObjects[name] = path;
  }
}

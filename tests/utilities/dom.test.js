import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const originalDocument = global.document;
const originalNode = global.Node;
const originalHTMLElement = global.HTMLElement;

class MockNode {
  constructor(tagName = '') {
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.parentNode = null;
    this.children = [];
    this.classList = { contains: () => false };
    this.getAttributeNames = () => [];
  }

  insertBefore(child, before = null) {
    child.parentNode = this;
    if (!before) {
      this.children.push(child);
      return child;
    }

    const index = this.children.indexOf(before);
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    return child;
  }
}

class MockText extends MockNode {
  constructor(text) {
    super('#text');
    this.nodeType = 3;
    this.data = text;
  }
}

class MockHTMLElement extends MockNode {}

const target = new MockHTMLElement('div');
const child = new MockHTMLElement('section');
const text = new MockText('hello');

beforeEach(() => {
  global.Node = MockNode;
  global.HTMLElement = MockHTMLElement;
  global.Element = MockHTMLElement;
  global.document = {
    querySelector: vi.fn((selector) =>
      selector === '#target' ? target : null
    ),
    querySelectorAll: vi.fn((selector) =>
      selector === '#target'
        ? [target]
        : selector === '.item'
          ? [target, child]
          : []
    ),
    createElement: vi.fn((tag) => new MockHTMLElement(tag)),
    createTextNode: vi.fn((value) => new MockText(String(value))),
  };
});

afterEach(() => {
  global.document = originalDocument;
  global.Node = originalNode;
  global.HTMLElement = originalHTMLElement;
  delete global.Element;
});

describe('dom utilities', () => {
  it('resolves containers and nodes', async () => {
    const {
      resolveContainer,
      requireContainer,
      resolveNode,
      resolveNodeList,
      resolveElement,
    } = await import('../../src/utilities/dom.js');

    expect(resolveContainer('#target')).toBe(target);
    expect(resolveContainer('.item', 'Test', 'array')).toEqual([target, child]);
    expect(resolveContainer(target)).toBe(target);
    expect(resolveContainer(text, 'Test', 'node')).toBe(text);
    expect(resolveContainer([text, child], 'Test', 'array')).toEqual([
      text,
      child,
    ]);
    expect(resolveNode(text)).toBe(text);
    expect(resolveElement([text, target])).toBe(target);
    expect(resolveNodeList([text, child])).toEqual([text, child]);
    expect(requireContainer(target)).toBe(target);
  });

  it('returns null for invalid inputs', async () => {
    const { resolveContainer, resolveElement, resolveNodeList, resolveNode } =
      await import('../../src/utilities/dom.js');

    expect(resolveContainer(123)).toBeNull();
    expect(resolveElement(123)).toBeNull();
    expect(resolveNodeList(123)).toBeNull();
    expect(resolveNode(123)).toBeNull();
  });

  it('throws on invalid expect', async () => {
    const { resolveContainer } = await import('../../src/utilities/dom.js');

    expect(() => resolveContainer(target, 'Test', 'bad')).toThrow(
      "Test: expect must be one of 'node', 'element', 'array'."
    );
  });

  it('requires a DOM render environment', async () => {
    const { requireRenderDOM } = await import('../../src/utilities/dom.js');

    expect(requireRenderDOM('Test')).toBe(true);

    const originalCreateElement = global.document.createElement;
    global.document.createElement = undefined;

    expect(() => requireRenderDOM('Test')).toThrow(
      'Test: DOM render environment is required.'
    );

    global.document.createElement = originalCreateElement;
  });
});

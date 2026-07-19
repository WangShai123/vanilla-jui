import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalDocument = global.document;
const originalNode = global.Node;
const originalElement = global.Element;
const originalHTMLElement = global.HTMLElement;

class MockNode {}

class MockElement extends MockNode {
  constructor(tagName = 'div', { height = 0, matches = [] } = {}) {
    super();
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = { position: '', top: '', zIndex: '' };
    this.offsetHeight = height;
    this.matches = matches;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
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

  contains(node) {
    if (node === this) return true;
    return this.children.some((child) => child.contains?.(node));
  }

  querySelectorAll(selector) {
    const result = [];

    const visit = (node) => {
      if (node.matches?.includes(selector)) result.push(node);
      for (const child of node.children || []) visit(child);
    };

    for (const child of this.children) visit(child);
    return result;
  }
}

function createDocument(root) {
  return {
    querySelector(selector) {
      return root.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      return root.querySelectorAll(selector);
    },
    createElement(tag) {
      return new MockElement(tag);
    },
  };
}

describe('Sticky', () => {
  let root;
  let Sticky;

  beforeEach(async () => {
    vi.resetModules();

    root = new MockElement('main');
    global.Node = MockNode;
    global.Element = MockElement;
    global.HTMLElement = MockElement;
    global.document = createDocument(root);

    Sticky = (await import('../../src/components/sticky.js')).default;
  });

  afterEach(() => {
    global.document = originalDocument;
    global.Node = originalNode;
    global.Element = originalElement;
    global.HTMLElement = originalHTMLElement;
  });

  it('applies sticky offsets to multiple targets in order', () => {
    const first = new MockElement('aside', { height: 40 });
    const second = new MockElement('aside', { height: 20 });
    root.appendChild(first);
    root.appendChild(second);

    const sticky = new Sticky({
      target: [first, second],
      top: 12,
      gap: 8,
    }).build();

    expect(sticky.state.top).toBe(12);
    expect(first.style.position).toBe('sticky');
    expect(first.style.top).toBe('12px');
    expect(second.style.top).toBe('60px');
    expect(sticky.dom.targets).toEqual([first, second]);
    expect(sticky.state.items).toEqual([
      { element: first, top: 12 },
      { element: second, top: 60 },
    ]);
  });

  it('scopes selector targets by parent', () => {
    const left = new MockElement('section');
    const right = new MockElement('section');
    const leftWidget = new MockElement('aside', {
      height: 30,
      matches: ['.widget'],
    });
    const rightWidget = new MockElement('aside', {
      height: 30,
      matches: ['.widget'],
    });

    root.appendChild(left);
    root.appendChild(right);
    left.appendChild(leftWidget);
    right.appendChild(rightWidget);

    const sticky = new Sticky({
      parent: left,
      target: '.widget',
    }).build();

    expect(sticky.dom.targets).toEqual([leftWidget]);
    expect(leftWidget.style.position).toBe('sticky');
    expect(rightWidget.style.position).toBe('');
  });

  it('throws when direct targets are outside parent', () => {
    const parent = new MockElement('section');
    const outside = new MockElement('aside', { height: 20 });
    root.appendChild(parent);
    root.appendChild(outside);

    expect(() => new Sticky({ parent, target: outside }).build()).toThrow(
      'Sticky.target: target not found in parent.'
    );
  });

  it('keeps the last max targets when overflow is destroy', () => {
    const first = new MockElement('aside', { height: 20 });
    const second = new MockElement('aside', { height: 20 });
    const third = new MockElement('aside', { height: 20 });
    root.appendChild(first);
    root.appendChild(second);
    root.appendChild(third);

    const sticky = new Sticky({
      target: [first, second, third],
      max: 2,
      overflow: 'destroy',
    }).build();

    expect(first.style.position).toBe('');
    expect(second.style.position).toBe('sticky');
    expect(third.style.position).toBe('sticky');
    expect(sticky.dom.targets).toEqual([second, third]);
  });

  it('ignores all targets when overflow is ignore and max overflows', () => {
    const first = new MockElement('aside', { height: 20 });
    const second = new MockElement('aside', { height: 20 });
    root.appendChild(first);
    root.appendChild(second);

    const ignoredSticky = new Sticky({
      target: [first, second],
      max: 1,
      overflow: 'ignore',
    }).build();

    expect(ignoredSticky.runtime.ignored).toBe(true);
    expect(first.style.position).toBe('');
    expect(second.style.position).toBe('');
    expect(ignoredSticky.dom.targets).toEqual([]);
  });

  it('restores original inline styles on destroy', () => {
    const widget = new MockElement('aside', { height: 20 });
    widget.style.position = 'relative';
    widget.style.top = '4px';
    root.appendChild(widget);

    const sticky = new Sticky({ target: widget }).build();
    sticky.destroy();

    expect(widget.style.position).toBe('relative');
    expect(widget.style.top).toBe('4px');
    expect(sticky.runtime.destroyed).toBe(true);
  });

  it('does not touch DOM before build', () => {
    const widget = new MockElement('aside', { height: 20 });
    root.appendChild(widget);

    const sticky = new Sticky({ target: widget });

    expect(sticky.runtime.built).toBe(false);
    expect(sticky.dom.targets).toEqual([]);
    expect(widget.style.position).toBe('');
  });
});

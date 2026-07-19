import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalDocument = global.document;
const originalNode = global.Node;
const originalElement = global.Element;
const originalHTMLElement = global.HTMLElement;
const originalWindow = global.window;
const originalRequestAnimationFrame = global.requestAnimationFrame;

class MockNode {}

class MockElement extends MockNode {
  constructor(tagName = 'div', { matches = [], text = '', top = 0 } = {}) {
    super();
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = { cssText: '', color: '', borderLeftColor: '' };
    this.dataset = {};
    this.id = '';
    this.href = '';
    this.textContent = text;
    this.matches = matches;
    this._top = top;
    this._listeners = new Map();
    this.scrolled = false;
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

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(',').map((item) => item.trim());
    const result = [];

    const visit = (node) => {
      const tagName = node.tagName.toLowerCase();
      if (
        selectors.includes(tagName) ||
        selectors.some((item) => node.matches.includes(item))
      ) {
        result.push(node);
      }
      for (const child of node.children || []) visit(child);
    };

    for (const child of this.children) visit(child);
    return result;
  }

  addEventListener(type, handler) {
    this._listeners.set(type, handler);
  }

  removeEventListener(type) {
    this._listeners.delete(type);
  }

  getBoundingClientRect() {
    return { top: this._top };
  }

  scrollIntoView() {
    this.scrolled = true;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML || '';
  }
}

function createWindow() {
  return {
    listeners: new Map(),
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    },
    removeEventListener(type) {
      this.listeners.delete(type);
    },
  };
}

function createDocument(root) {
  return {
    querySelector(selector) {
      return root.querySelector(selector);
    },
    querySelectorAll(selector) {
      return root.querySelectorAll(selector);
    },
    createElement(tag) {
      return new MockElement(tag);
    },
  };
}

describe('Toc', () => {
  let root;
  let win;
  let Toc;

  beforeEach(async () => {
    vi.resetModules();

    root = new MockElement('main');
    win = createWindow();
    global.Node = MockNode;
    global.Element = MockElement;
    global.HTMLElement = MockElement;
    global.window = win;
    global.document = createDocument(root);
    global.requestAnimationFrame = (callback) => callback();

    Toc = (await import('../../src/components/toc.js')).default;
  });

  afterEach(() => {
    global.document = originalDocument;
    global.Node = originalNode;
    global.Element = originalElement;
    global.HTMLElement = originalHTMLElement;
    global.window = originalWindow;
    global.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it('does not touch DOM before build', () => {
    const container = new MockElement('aside');
    const content = new MockElement('article');
    root.appendChild(container);
    root.appendChild(content);

    const toc = new Toc({ container, target: content });

    expect(toc.runtime.built).toBe(false);
    expect(toc.root).toBeNull();
    expect(toc.dom.container).toBeNull();
    expect(toc.dom.target).toBeNull();
    expect(container.children.length).toBe(0);
  });

  it('builds heading links and state items', () => {
    const container = new MockElement('aside');
    const content = new MockElement('article');
    const h2 = new MockElement('h2', { text: 'Intro', top: 20 });
    const h3 = new MockElement('h3', { text: 'Details', top: 120 });
    root.appendChild(container);
    root.appendChild(content);
    content.appendChild(h2);
    content.appendChild(h3);

    const toc = new Toc({ container, target: content, offset: 80 }).build();

    expect(toc.runtime.built).toBe(true);
    expect(toc.dom.container).toBe(container);
    expect(toc.dom.target).toBe(content);
    expect(toc.root.tagName).toBe('NAV');
    expect(toc.root.className).toBe('j-toc');
    expect(container.children).toEqual([toc.root]);
    expect(toc.root.children).toEqual([toc.dom.list]);
    expect(toc.dom.links.length).toBe(2);
    expect(toc.state.items.map((item) => item.text)).toEqual([
      'Intro',
      'Details',
    ]);
    expect(toc.state.current.index).toBe(0);
    expect(toc.dom.links[0].dataset.active).toBe('1');
    expect(toc.dom.links[0].className).toBe('toc-link is-level-2 is-active');
    expect(toc.dom.links[1].className).toBe('toc-link is-level-3');
    expect(win.listeners.has('scroll')).toBe(true);
  });

  it('refreshes heading data', () => {
    const container = new MockElement('aside');
    const content = new MockElement('article');
    const h2 = new MockElement('h2', { text: 'Intro', top: 20 });
    root.appendChild(container);
    root.appendChild(content);
    content.appendChild(h2);

    const toc = new Toc({ container, target: content }).build();
    const h3 = new MockElement('h3', { text: 'More', top: 30 });
    content.appendChild(h3);
    toc.refresh();

    expect(toc.dom.links.length).toBe(2);
    expect(toc.state.items[1].text).toBe('More');
  });

  it('activates a toc link by index', () => {
    const container = new MockElement('aside');
    const content = new MockElement('article');
    const h2 = new MockElement('h2', { text: 'Intro', top: 20 });
    root.appendChild(container);
    root.appendChild(content);
    content.appendChild(h2);

    const toc = new Toc({ container, target: content }).build();
    toc.activate(0);

    expect(toc.dom.links[0].scrolled).toBe(true);
  });

  it('clears container on destroy', () => {
    const container = new MockElement('aside');
    const content = new MockElement('article');
    const h2 = new MockElement('h2', { text: 'Intro', top: 20 });
    root.appendChild(container);
    root.appendChild(content);
    content.appendChild(h2);

    const toc = new Toc({ container, target: content }).build();
    toc.destroy();

    expect(container.children).toEqual([]);
    expect(win.listeners.has('scroll')).toBe(false);
    expect(toc.runtime.destroyed).toBe(true);
  });
});

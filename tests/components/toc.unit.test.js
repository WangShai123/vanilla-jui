import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalDocument = global.document;
const originalNode = global.Node;
const originalElement = global.Element;
const originalHTMLElement = global.HTMLElement;
const originalWindow = global.window;
const originalRequestAnimationFrame = global.requestAnimationFrame;

class MockNode {}

class MockTextNode extends MockNode {
  constructor(text = '') {
    super();
    this.nodeType = 3;
    this.data = String(text);
    this.textContent = String(text);
    this.parentNode = null;
  }

  contains(node) {
    return node === this;
  }
}

class MockElement extends MockNode {
  constructor(tagName = 'div', { matches = [], text = '', top = 0 } = {}) {
    super();
    this.nodeType = 1;
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
    this._attributes = new Map();
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

  setAttribute(name, value) {
    this._attributes.set(name, String(value));
    if (name === 'class') this.className = String(value);
    if (name === 'href') this.href = String(value);
    if (name.startsWith('data-')) {
      const key = name
        .slice(5)
        .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      this.dataset[key] = String(value);
    }
  }

  getAttribute(name) {
    return this._attributes.get(name) || null;
  }

  removeAttribute(name) {
    this._attributes.delete(name);
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (node._matchesSelector(selector)) return node;
      node = node.parentNode;
    }
    return null;
  }

  _matchesSelector(selector) {
    if (selector.startsWith('.')) {
      return this.className?.split(/\s+/).includes(selector.slice(1));
    }
    if (selector.startsWith('[data-') && selector.endsWith(']')) {
      return this.getAttribute(selector.slice(1, -1)) != null;
    }
    return this.tagName.toLowerCase() === selector.toLowerCase();
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
    scrollY: 0,
    lastScrollTo: null,
    history: {
      lastUrl: null,
      pushState(_state, _title, url) {
        this.lastUrl = url;
      },
    },
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    },
    removeEventListener(type) {
      this.listeners.delete(type);
    },
    scrollTo(options) {
      this.lastScrollTo = options;
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
    createTextNode(text) {
      return new MockTextNode(text);
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

    Toc = (await import('../../src/components/toc.js')).Toc;
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

  it('delegates link clicks and scrolls to the heading with offset', () => {
    const container = new MockElement('aside');
    const content = new MockElement('article');
    const h2 = new MockElement('h2', { text: 'Intro', top: 180 });
    root.appendChild(container);
    root.appendChild(content);
    content.appendChild(h2);

    const toc = new Toc({ container, target: content, offset: 80 }).build();
    const child = new MockElement('span');
    toc.dom.links[0].appendChild(child);
    win.scrollY = 300;
    const event = {
      target: child,
      preventDefault: vi.fn(),
    };
    toc.dom.list._listeners.get('click')(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(win.lastScrollTo).toEqual({ top: 400, behavior: 'smooth' });
    expect(win.history.lastUrl).toBe(`#${h2.id}`);
  });

  it('sets the clicked link active immediately', () => {
    const container = new MockElement('aside');
    const content = new MockElement('article');
    const h2 = new MockElement('h2', { text: 'Intro', top: 20 });
    const h3 = new MockElement('h3', { text: 'Usage', top: 60 });
    const h4 = new MockElement('h3', { text: 'API', top: 180 });
    root.appendChild(container);
    root.appendChild(content);
    content.appendChild(h2);
    content.appendChild(h3);
    content.appendChild(h4);

    const toc = new Toc({ container, target: content, offset: 80 }).build();
    const event = {
      target: toc.dom.links[2],
      preventDefault: vi.fn(),
    };
    toc.dom.list._listeners.get('click')(event);

    expect(toc.state.current.index).toBe(2);
    expect(toc.dom.links[1].className).toBe('toc-link is-level-3');
    expect(toc.dom.links[2].className).toBe('toc-link is-level-3 is-active');
  });

  it('allows a small offset tolerance when updating active link', () => {
    const container = new MockElement('aside');
    const content = new MockElement('article');
    const h2 = new MockElement('h2', { text: 'Intro', top: 20 });
    const h3 = new MockElement('h3', { text: 'Usage', top: 80.5 });
    root.appendChild(container);
    root.appendChild(content);
    content.appendChild(h2);
    content.appendChild(h3);

    const toc = new Toc({ container, target: content, offset: 80 }).build();

    expect(toc.state.current.index).toBe(1);
    expect(toc.dom.links[1].className).toBe('toc-link is-level-3 is-active');
  });

  it('keeps active link clicks aligned to the heading offset', () => {
    const container = new MockElement('aside');
    const content = new MockElement('article');
    const h2 = new MockElement('h2', { text: 'Intro', top: 80 });
    root.appendChild(container);
    root.appendChild(content);
    content.appendChild(h2);

    const toc = new Toc({ container, target: content, offset: 80 }).build();
    win.scrollY = 240;
    const event = {
      target: toc.dom.links[0],
      preventDefault: vi.fn(),
    };
    toc.dom.list._listeners.get('click')(event);

    expect(toc.state.current.index).toBe(0);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(win.lastScrollTo).toEqual({ top: 240, behavior: 'smooth' });
    expect(win.history.lastUrl).toBe(`#${h2.id}`);
  });

  it('activates a heading by index', () => {
    const container = new MockElement('aside');
    const content = new MockElement('article');
    const h2 = new MockElement('h2', { text: 'Intro', top: 120 });
    root.appendChild(container);
    root.appendChild(content);
    content.appendChild(h2);

    const toc = new Toc({ container, target: content, offset: 80 }).build();
    win.scrollY = 100;
    toc.activate(0);

    expect(win.lastScrollTo).toEqual({ top: 140, behavior: 'smooth' });
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

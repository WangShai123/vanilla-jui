// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { Sticky } from '../../src/components/sticky.ts';

let sticky: Sticky | null = null;

function mount(): HTMLElement {
  document.body.innerHTML = `
    <main id="layout">
      <aside id="left">
        <section id="a" class="widget"></section>
        <section id="b" class="widget"></section>
        <section id="c" class="widget"></section>
      </aside>
      <aside id="right">
        <section id="d" class="widget"></section>
      </aside>
    </main>
  `;
  const parent = document.querySelector<HTMLElement>('#left');
  if (!parent) throw new Error('Missing Sticky fixture.');
  return parent;
}

function element(id: string): HTMLElement {
  const target = document.querySelector<HTMLElement>(id);
  if (!target) throw new Error(`Missing element "${id}".`);
  return target;
}

function mockHeight(target: HTMLElement, height: number): void {
  Object.defineProperty(target, 'offsetHeight', {
    value: height,
    configurable: true,
  });
}

afterEach(() => {
  sticky?.destroy();
  sticky = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Sticky', () => {
  it('applies sticky styles with accumulated top values', () => {
    const parent = mount();
    mockHeight(element('#a'), 20);
    mockHeight(element('#b'), 30);

    sticky = new Sticky({
      parent,
      target: '.widget',
      max: 2,
      top: 10,
      gap: 5,
    }).build();

    expect(sticky.dom.targets.map((item) => item.id)).toEqual(['b', 'c']);
    expect(element('#b').style.position).toBe('sticky');
    expect(element('#b').style.top).toBe('10px');
    expect(element('#c').style.top).toBe('45px');
    expect(sticky.state?.count).toBe(2);
  });

  it('scopes selector targets to parent with public dom all helper path', () => {
    const parent = mount();

    sticky = new Sticky({
      parent,
      target: '.widget',
      top: 0,
      gap: 0,
    }).build();

    expect(sticky.dom.targets.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(element('#d').style.position).toBe('');
  });

  it('ignores overflow when configured', () => {
    const parent = mount();
    const onUpdate = vi.fn<(sticky: Sticky) => void>();

    sticky = new Sticky({
      parent,
      target: '.widget',
      max: 1,
      overflow: 'ignore',
      onUpdate,
    }).build();

    expect(sticky.runtime.ignored).toBe(true);
    expect(sticky.dom.targets).toHaveLength(0);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('restores original inline styles on destroy', () => {
    mount();
    const target = element('#a');
    target.style.position = 'relative';
    target.style.top = '3px';
    target.style.zIndex = '2';

    sticky = new Sticky({ target, top: 12 }).build();
    expect(target.style.position).toBe('sticky');

    sticky.destroy();
    sticky = null;

    expect(target.style.position).toBe('relative');
    expect(target.style.top).toBe('3px');
    expect(target.style.zIndex).toBe('2');
  });
});

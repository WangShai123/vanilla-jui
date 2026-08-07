// @vitest-environment jsdom

import { createDeepStore, jsx } from 'vanilla-signal';
import { describe, expect, it, vi } from 'vite-plus/test';

import { defineComponent } from '../src/core/component.ts';

describe('defineComponent', () => {
  it('owns one stable view through build, mount, state updates and destroy', () => {
    const state = createDeepStore({ count: 0 });
    const onDestroy = vi.fn();
    const component = defineComponent({
      name: 'Probe',
      props: { id: 'probe' },
      state,
      view: () =>
        jsx('div', {
          id: 'probe',
          children: () => String(state.count),
        }) as HTMLElement,
      onDestroy,
    });

    expect(component.element).toBeNull();
    component.build();
    const root = component.element;
    expect(root?.textContent).toBe('0');

    component.mount(document.body);
    component.setState('count', 1);
    expect(component.element).toBe(root);
    expect(root?.parentNode).toBe(document.body);
    expect(root?.textContent).toBe('1');

    component.unmount();
    expect(root?.isConnected).toBe(false);
    component.destroy();
    expect(component.runtime.destroyed).toBe(true);
    expect(component.element).toBeNull();
    expect(onDestroy).toHaveBeenCalledTimes(1);
  });

  it('does not remove a bound element the component does not own', () => {
    const root = document.createElement('section');
    document.body.appendChild(root);
    const component = defineComponent({
      name: 'BoundProbe',
      ownsElement: false,
      props: {},
      state: createDeepStore({ active: false }),
      view: () => root,
    }).build();

    component.destroy();
    expect(document.body.contains(root)).toBe(true);
    root.remove();
  });
});

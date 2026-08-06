// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { createFlow } from '../src/components/flow.ts';

type FlowInstance = ReturnType<typeof createFlow>;

let flow: FlowInstance | null = null;

function steps() {
  return [
    {
      id: 'account',
      title: 'Account',
      data: { initial: 'yes' },
      content: 'Account content',
    },
    {
      id: 'profile',
      title: 'Profile',
      content: ({ data }: { data: Record<string, unknown> }) => {
        const email = typeof data.email === 'string' ? data.email : '';
        return `Email: ${email}`;
      },
    },
    {
      id: 'confirm',
      title: 'Confirm',
      content: 'Confirm content',
    },
  ];
}

function app(): HTMLElement {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('Missing Flow fixture.');
  return root;
}

function mount(instance: FlowInstance): FlowInstance {
  instance.build();
  if (!instance.dom.root) throw new Error('Flow did not build a root.');
  app().appendChild(instance.dom.root);
  return instance;
}

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  flow?.destroy();
  flow = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Flow', () => {
  it('builds default UI without mounting automatically', () => {
    const instance = createFlow({
      id: 'flow-default',
      steps: steps(),
      showReset: true,
    });
    flow = instance;

    expect(instance.dom.root).toBeNull();

    instance.build();
    expect(document.body.contains(instance.dom.root)).toBe(false);
    if (!instance.dom.root) throw new Error('Expected Flow root.');
    app().appendChild(instance.dom.root);

    expect(instance.dom.root.classList.contains('j-flow')).toBe(true);
    expect(instance.dom.root.getAttribute('data-flow')).toBe('root');
    expect(
      Array.from(instance.dom.root.children).map((child) => child.className)
    ).toEqual(['flow-header', 'flow-body', 'flow-footer']);
    expect(
      instance.dom.root.querySelector(':scope > .flow-header > .flow-steps')
    ).toBeTruthy();
    expect(instance.dom.root.querySelector('.flow-title')).toBeNull();
    expect(instance.dom.root.querySelector('.flow-description')).toBeNull();
    expect(instance.dom.root.querySelectorAll('[data-flow-step]')).toHaveLength(
      3
    );
    expect(
      instance.dom.root
        .querySelector('[data-flow-step="account"]')
        ?.classList.contains('is-active')
    ).toBe(true);
    expect(
      instance.dom.root.querySelector('[data-action="back"]')
    ).toBeTruthy();
    expect(
      instance.dom.root.querySelector('[data-action="next"]')
    ).toBeTruthy();
    expect(
      instance.dom.root.querySelector('[data-action="reset"]')
    ).toBeTruthy();
    expect(instance.dom.root.textContent).toContain('Account content');
  });

  it('runs headless transitions and caches step payloads', async () => {
    const onChange = vi.fn();
    const instance = createFlow({
      id: 'checkout',
      render: false,
      steps: steps(),
      onChange,
    }).build();
    flow = instance;

    expect(instance.dom.root).toBeNull();
    expect(instance.snapshot().currentId).toBe('account');

    await instance.next({ email: 'demo@example.com' });

    expect(instance.state.currentId).toBe('profile');
    expect(instance.state.data.email).toBe('demo@example.com');
    expect(instance.getStepData('account').email).toBe('demo@example.com');

    await instance.back({ name: 'Alice' });
    expect(instance.state.currentId).toBe('account');
    expect(instance.getStepData('profile').name).toBe('Alice');
    expect(onChange).toHaveBeenCalled();
  });

  it('preserves functional modal step config while cloning steps', () => {
    const modal = vi.fn(() => ({ content: 'Modal content' }));
    const instance = createFlow({
      id: 'modal-flow',
      render: false,
      steps: [
        {
          id: 'one',
          description: 'Legacy description',
          modal,
          view: { content: 'Legacy view' },
        },
      ],
    });
    flow = instance;

    expect(typeof instance.currentStep.modal).toBe('function');
    expect(instance.currentStep.modal).toBe(modal);
    expect(instance.snapshot().currentStep?.modal).toBe(modal);
    expect(Object.hasOwn(instance.currentStep, 'view')).toBe(false);
    expect(Object.hasOwn(instance.currentStep, 'description')).toBe(false);
  });

  it('allows className overrides while keeping data-action behavior', async () => {
    const instance = mount(
      createFlow({
        id: 'flow-custom',
        steps: steps(),
        className: {
          root: 'wizard',
          header: 'wizard-head',
          steps: 'wizard-steps',
          step: 'wizard-step',
          active: 'wizard-active',
          body: 'wizard-body',
          footer: 'wizard-footer',
          button: 'wizard-button',
          next: 'wizard-next',
        },
      })
    );
    flow = instance;

    const next = instance.dom.root?.querySelector<HTMLButtonElement>(
      '[data-action="next"]'
    );
    expect(instance.dom.root?.classList.contains('wizard')).toBe(true);
    expect(instance.dom.root?.classList.contains('j-flow')).toBe(false);
    expect(next?.classList.contains('wizard-next')).toBe(true);
    expect(next?.classList.contains('is-primary')).toBe(false);

    next?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(instance.state.currentId).toBe('profile');
  });

  it('rolls back failed transitions and stores the error', async () => {
    const instance = createFlow({
      id: 'guarded',
      render: false,
      steps: [
        { id: 'one', title: 'One' },
        {
          id: 'two',
          title: 'Two',
          canEnter: () => false,
        },
      ],
    });
    flow = instance;

    await expect(instance.next()).rejects.toThrow('blocked entering');
    expect(instance.state.currentId).toBe('one');
    expect(instance.state.error).toBeInstanceOf(Error);
    expect(instance.state.loading).toBe(false);
  });

  it('notifies subscribers for async loading and handles repeated actions', async () => {
    let release = () => {};
    const onBusy = vi.fn();
    const changes: Array<{ id: string; loading: boolean }> = [];
    const instance = createFlow({
      id: 'busy',
      render: false,
      steps: [
        {
          id: 'one',
          onLeave: () =>
            new Promise<void>((resolve) => {
              release = resolve;
            }),
        },
        { id: 'two' },
      ],
      onBusy,
    });
    flow = instance;
    instance.subscribe((snapshot) => {
      changes.push({
        id: snapshot.currentId,
        loading: snapshot.loading,
      });
    });

    const first = instance.next();
    await tick();
    expect(instance.state.loading).toBe(true);

    const second = await instance.next();
    expect(second?.currentId).toBe('one');
    expect(onBusy).toHaveBeenCalledWith('next', expect.any(Object), instance);

    release();
    await first;

    expect(instance.state.currentId).toBe('two');
    expect(instance.state.loading).toBe(false);
    expect(changes).toEqual(
      expect.arrayContaining([
        { id: 'one', loading: true },
        { id: 'two', loading: false },
      ])
    );
  });
});

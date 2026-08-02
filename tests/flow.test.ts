// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { Flow, createFlow } from '../src/components/flow.ts';

let flow: Flow | null = null;

function steps() {
  return [
    {
      id: 'account',
      title: 'Account',
      description: 'Basic info',
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

function mountRoot(): HTMLElement {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('Missing Flow fixture.');
  return root;
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
  it('runs headless transitions and caches step payloads', async () => {
    const onChange = vi.fn();
    flow = createFlow({
      id: 'checkout',
      render: false,
      steps: steps(),
      onChange,
    });

    expect(flow.snapshot().currentId).toBe('account');
    await flow.next({ email: 'demo@example.com' });

    expect(flow.state.currentId).toBe('profile');
    expect(flow.state.data.email).toBe('demo@example.com');
    expect(flow.getStepData('account').email).toBe('demo@example.com');

    await flow.back({ name: 'Alice' });
    expect(flow.state.currentId).toBe('account');
    expect(flow.getStepData('profile').name).toBe('Alice');
    expect(onChange).toHaveBeenCalled();
  });

  it('preserves functional modal step config while cloning steps', () => {
    const modal = vi.fn(() => ({ size: 'sm' }));
    flow = new Flow({
      id: 'modal-flow',
      steps: [{ id: 'one', modal }],
    });

    expect(typeof flow.currentStep.modal).toBe('function');
    expect(flow.currentStep.modal).toBe(modal);
  });

  it('mounts default UI with data markers and default classes', () => {
    const root = mountRoot();
    flow = new Flow({
      id: 'flow-default',
      steps: steps(),
      showReset: true,
    }).mount(root);

    expect(
      root.querySelector('[data-flow="root"]')?.classList.contains('j-flow')
    ).toBe(true);
    expect(
      root
        .querySelector('[data-flow-header]')
        ?.classList.contains('flow-header')
    ).toBe(true);
    expect(root.querySelectorAll('[data-flow-step]')).toHaveLength(3);
    expect(
      root
        .querySelector('[data-flow-step="account"]')
        ?.classList.contains('is-active')
    ).toBe(true);
    expect(root.querySelector('[data-action="back"]')).toBeTruthy();
    expect(root.querySelector('[data-action="next"]')).toBeTruthy();
    expect(root.querySelector('[data-action="reset"]')).toBeTruthy();
  });

  it('allows className overrides while keeping data-action behavior', async () => {
    const root = mountRoot();
    flow = new Flow({
      id: 'flow-custom',
      steps: steps(),
      className: {
        root: 'wizard',
        header: 'wizard-head',
        title: 'wizard-title',
        steps: 'wizard-steps',
        step: 'wizard-step',
        active: 'wizard-active',
        body: 'wizard-body',
        footer: 'wizard-footer',
        button: 'wizard-button',
        buttonPrimary: 'wizard-primary',
        next: 'wizard-next',
      },
    }).mount(root);

    const next = root.querySelector<HTMLButtonElement>('[data-action="next"]');
    expect(
      root.querySelector('[data-flow="root"]')?.classList.contains('wizard')
    ).toBe(true);
    expect(
      root.querySelector('[data-flow="root"]')?.classList.contains('j-flow')
    ).toBe(false);
    expect(next?.classList.contains('wizard-next')).toBe(true);

    next?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(flow.state.currentId).toBe('profile');
  });

  it('rolls back failed transitions and stores the error', async () => {
    flow = new Flow({
      id: 'guarded',
      steps: [
        { id: 'one', title: 'One' },
        {
          id: 'two',
          title: 'Two',
          canEnter: () => false,
        },
      ],
    });

    await expect(flow.next()).rejects.toThrow('blocked entering');
    expect(flow.state.currentId).toBe('one');
    expect(flow.state.error).toBeInstanceOf(Error);
    expect(flow.state.loading).toBe(false);
  });

  it('handles repeated actions while loading', async () => {
    let release = () => {};
    const onBusy = vi.fn();
    flow = new Flow({
      id: 'busy',
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

    const first = flow.next();
    await tick();
    const second = await flow.next();
    expect(second?.currentId).toBe('one');
    expect(onBusy).toHaveBeenCalledWith('next', expect.any(Object), flow);

    release();
    await first;
    expect(flow.state.currentId).toBe('two');
  });
});

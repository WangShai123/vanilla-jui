import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import Flow, { createFlow } from '../../src/components/flow.js';

describe('Flow Component', () => {
  let flow;

  const steps = [
    { id: 'account', title: 'Account', data: { email: 'a@test.com' } },
    { id: 'profile', title: 'Profile' },
    { id: 'confirm', title: 'Confirm' },
  ];

  beforeEach(() => {
    flow = null;
  });

  afterEach(() => {
    if (flow) flow.destroy();
    flow = null;
  });

  it('should create flow with class and factory APIs', () => {
    flow = new Flow({ steps });
    const factoryFlow = createFlow({ steps });

    expect(flow).toBeDefined();
    expect(factoryFlow).toBeInstanceOf(Flow);
    expect(flow.state.currentId).toBe('account');
    expect(flow.currentStep.title).toBe('Account');
    expect(flow.snapshot().currentId).toBe('account');

    factoryFlow.destroy();
  });

  it('should accept initial step by id or index', () => {
    flow = new Flow({ steps, initial: 'profile' });
    expect(flow.state.currentId).toBe('profile');
    expect(flow.state.currentIndex).toBe(1);

    flow.destroy();
    flow = new Flow({ steps, initial: 2 });
    expect(flow.state.currentId).toBe('confirm');
    expect(flow.state.currentIndex).toBe(2);
  });

  it('should move next and back with cached step data', async () => {
    flow = new Flow({ steps });

    await flow.next({ email: 'next@test.com' });
    expect(flow.state.currentId).toBe('profile');
    expect(flow.state.direction).toBe('next');
    expect(flow.getStepData('account')).toEqual({ email: 'next@test.com' });
    expect(flow.state.data.email).toBe('next@test.com');

    await flow.back({ name: 'Alice' });
    expect(flow.state.currentId).toBe('account');
    expect(flow.state.direction).toBe('back');
    expect(flow.getStepData('profile')).toEqual({ name: 'Alice' });
  });

  it('should go to target step and expose snapshot state', async () => {
    flow = new Flow({ steps, linear: false });

    await flow.goTo('confirm', { email: 'go@test.com' });
    const snapshot = flow.snapshot();

    expect(snapshot.currentId).toBe('confirm');
    expect(snapshot.previousId).toBe('account');
    expect(snapshot.canBack).toBe(true);
    expect(snapshot.isLast).toBe(true);
    expect(snapshot.data.email).toBe('go@test.com');
  });

  it('should support step and global lifecycle hooks', async () => {
    const events = [];
    flow = new Flow({
      steps: [
        {
          id: 'first',
          onNext: ({ payload }) => {
            events.push(`step:${payload.value}`);
          },
          onLeave: ({ step }) => {
            events.push(`leave:${step.id}`);
          },
        },
        {
          id: 'second',
          onEnter: ({ step }) => {
            events.push(`enter:${step.id}`);
          },
        },
      ],
      onChange: ({ currentId }) => {
        events.push(`change:${currentId}`);
      },
    });

    await flow.next({ value: 'ok' });

    expect(events).toEqual([
      'step:ok',
      'leave:first',
      'enter:second',
      'change:second',
    ]);
  });

  it('should allow hook to choose next step', async () => {
    flow = new Flow({
      steps: [
        {
          id: 'start',
          onNext: () => 'done',
        },
        { id: 'skipped' },
        { id: 'done' },
      ],
    });

    await flow.next();

    expect(flow.state.currentId).toBe('done');
    expect(flow.state.currentIndex).toBe(2);
  });

  it('should expose explicit modal config on public step snapshots', () => {
    flow = new Flow({
      steps: [
        {
          id: 'account',
          title: 'Account',
          modal: {
            fields: [{ name: 'email', label: 'Email', type: 'email' }],
            showCancel: false,
          },
        },
      ],
    });

    expect(flow.currentStep.modal).toEqual({
      fields: [{ name: 'email', label: 'Email', type: 'email' }],
      showCancel: false,
    });
    expect(flow.snapshot().currentStep.modal).toEqual({
      fields: [{ name: 'email', label: 'Email', type: 'email' }],
      showCancel: false,
    });
  });

  it('should block transition when canLeave returns false', async () => {
    flow = new Flow({
      steps: [{ id: 'locked', canLeave: () => false }, { id: 'next' }],
    });

    await expect(flow.next()).rejects.toThrow('blocked leaving');
    expect(flow.state.currentId).toBe('locked');
    expect(flow.state.error).toBeInstanceOf(Error);
  });

  it('should rollback when onEnter throws after the current step has changed', async () => {
    const error = new Error('enter failed');
    let handled = null;
    flow = new Flow({
      steps: [
        { id: 'start', data: { keep: true } },
        {
          id: 'next',
          onEnter: () => {
            throw error;
          },
        },
      ],
      onError: (err, snapshot, instance, previous) => {
        handled = { err, snapshot, previous };
      },
    });

    await expect(flow.next({ draft: 'value' })).rejects.toThrow('enter failed');

    expect(flow.state.currentId).toBe('start');
    expect(flow.state.currentIndex).toBe(0);
    expect(flow.state.history).toEqual(['start']);
    expect(flow.getStepData('start')).toEqual({ keep: true });
    expect(flow.state.data.draft).toBeUndefined();
    expect(flow.state.error).toBe(error);
    expect(flow.state.loading).toBe(false);
    expect(handled.snapshot.currentId).toBe('start');
    expect(handled.previous.currentId).toBe('start');
  });

  it('should keep the failed target when rollbackOnError is disabled', async () => {
    flow = new Flow({
      rollbackOnError: false,
      steps: [
        { id: 'start' },
        {
          id: 'next',
          onEnter: () => {
            throw new Error('enter failed');
          },
        },
      ],
    });

    await expect(flow.next()).rejects.toThrow('enter failed');

    expect(flow.state.currentId).toBe('next');
    expect(flow.state.history).toEqual(['start', 'next']);
    expect(flow.state.error).toBeInstanceOf(Error);
  });

  it('should ignore duplicate async actions while loading by default', async () => {
    let release;
    const onBusy = vi.fn();
    flow = new Flow({
      onBusy,
      steps: [
        {
          id: 'start',
          onNext: () =>
            new Promise((resolve) => {
              release = resolve;
            }),
        },
        { id: 'next' },
      ],
    });

    const first = flow.next({ first: true });
    expect(flow.state.loading).toBe(true);

    const secondSnapshot = await flow.next({ second: true });
    expect(secondSnapshot.currentId).toBe('start');
    expect(onBusy).toHaveBeenCalledWith('next', expect.any(Object), flow);

    release();
    await first;

    expect(flow.state.currentId).toBe('next');
    expect(flow.getStepData('start')).toEqual({ first: true });
  });

  it('should throw a FLOW_BUSY error when busyStrategy is throw', async () => {
    let release;
    flow = new Flow({
      busyStrategy: 'throw',
      steps: [
        {
          id: 'start',
          onNext: () =>
            new Promise((resolve) => {
              release = resolve;
            }),
        },
        { id: 'next' },
      ],
    });

    const first = flow.next();
    await expect(flow.next()).rejects.toMatchObject({ code: 'FLOW_BUSY' });

    release();
    await first;
  });

  it('should run registered cleanup tasks on destroy', () => {
    const cleanup = vi.fn();
    flow = new Flow({
      steps: [
        {
          id: 'start',
          content: ({ addCleanup }) => {
            addCleanup(cleanup);
            return 'content';
          },
        },
      ],
    });

    expect(flow._contentView(flow.currentStep.content)).toBe('content');
    flow.destroy();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('should expose render slots with fallback and a11y defaults', () => {
    const originalDocument = globalThis.document;
    const originalNode = globalThis.Node;
    const originalElement = globalThis.Element;

    class MockNode {}

    class MockElement extends MockNode {
      constructor(tagName = 'div') {
        super();
        this.tagName = tagName.toUpperCase();
        this.attributes = {};
        this.children = [];
        this.className = '';
        this.parentNode = null;
        this.style = {};
      }

      setAttribute(name, value) {
        this.attributes[name] = String(value);
      }

      getAttribute(name) {
        return this.attributes[name] ?? null;
      }

      removeAttribute(name) {
        delete this.attributes[name];
      }

      insertBefore(node) {
        node.parentNode = this;
        this.children.push(node);
        return node;
      }

      removeChild(node) {
        this.children = this.children.filter((child) => child !== node);
        node.parentNode = null;
        return node;
      }

      addEventListener() {}

      removeEventListener() {}
    }

    globalThis.Node = MockNode;
    globalThis.Element = MockElement;
    globalThis.document = {
      createElement: (tagName) => new MockElement(tagName),
      createElementNS: (_namespace, tagName) => new MockElement(tagName),
      createTextNode: (text) => {
        const node = new MockNode();
        node.nodeType = 3;
        node.data = String(text);
        node.parentNode = null;
        return node;
      },
    };

    try {
      flow = new Flow({
        steps,
        renderHeader: ({ fallback, snapshot }) => [
          fallback(),
          `custom:${snapshot.currentId}`,
        ],
      });

      const snapshot = flow.snapshot();
      const header = flow._renderSlot('renderHeader', snapshot, () =>
        flow._headerView(snapshot)
      );
      const body = flow._bodyView(snapshot);
      const stepsView = flow._stepsView(snapshot);
      const root = flow._buildRoot();

      expect(Array.isArray(header)).toBe(true);
      expect(header[1]).toBe('custom:account');
      expect(body.getAttribute('role')).toBe('region');
      expect(body.getAttribute('aria-live')).toBe('polite');
      expect(stepsView.getAttribute('role')).toBe('list');
      expect(stepsView.getAttribute('aria-label')).toBe('Flow steps');
      expect(root.getAttribute('role')).toBe('group');
      expect(root.getAttribute('aria-labelledby')).toBe(
        `${flow.options.id}-title`
      );
    } finally {
      globalThis.document = originalDocument;
      globalThis.Node = originalNode;
      globalThis.Element = originalElement;
    }
  });

  it('should reset to initial state and clear runtime data', async () => {
    flow = new Flow({ steps });

    await flow.next({ email: 'runtime@test.com' });
    await flow.next({ name: 'Runtime' });
    flow.reset();

    expect(flow.state.currentId).toBe('account');
    expect(flow.state.history).toEqual(['account']);
    expect(flow.getStepData('account')).toEqual({ email: 'a@test.com' });
    expect(flow.state.data.name).toBeUndefined();
  });

  it('should call onFinish when next is triggered on last step', async () => {
    let finished = null;
    flow = new Flow({
      steps: [{ id: 'first' }],
      onFinish: (snapshot) => {
        finished = snapshot.currentId;
      },
    });

    await flow.next({ done: true });

    expect(finished).toBe('first');
    expect(flow.getStepData('first')).toEqual({ done: true });
  });

  it('should destroy instances independently', () => {
    const flow1 = new Flow({ steps });
    const flow2 = new Flow({ steps });

    expect(flow1.state).toBeDefined();
    expect(flow2.state).toBeDefined();
    flow1.destroy();
    expect(flow1.state).toBeNull();
    expect(flow2.state).toBeDefined();

    flow2.destroy();
    expect(flow2.state).toBeNull();
  });
});

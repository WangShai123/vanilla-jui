// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { jsx } from 'vanilla-signal';

import { createModal, type Modal } from '../src/components/modal.ts';
import {
  createForm,
  type FormDataRecord,
} from '../src/components/form.ts';

let modal: Modal | null = null;

async function flushPresence(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function setInvalidState(patch: Record<string, unknown>): void {
  modal?.setState(patch as never);
}

function dialog(instance: Modal): HTMLElement | null {
  return (
    instance.element?.querySelector<HTMLElement>('[data-modal-dialog]') || null
  );
}

function body(instance: Modal): HTMLElement | null {
  return (
    instance.element?.querySelector<HTMLElement>('[data-modal-body]') || null
  );
}

function header(instance: Modal): HTMLElement | null {
  return instance.element?.querySelector<HTMLElement>('.modal-header') || null;
}

function footer(instance: Modal): HTMLElement | null {
  return instance.element?.querySelector<HTMLElement>('.modal-footer') || null;
}

function deferred<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function pendingAnimation(): {
  animation: Animation;
  resolve: () => void;
} {
  let resolve!: () => void;
  const finished = new Promise<void>((done) => {
    resolve = done;
  });
  return {
    animation: {
      effect: { getComputedTiming: () => ({ endTime: 350 }) },
      finished,
      currentTime: null,
      playbackRate: 1,
      pause: vi.fn(),
      play: vi.fn(),
      cancel: vi.fn(),
    } as unknown as Animation,
    resolve,
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  vi.useFakeTimers();
});

afterEach(() => {
  modal?.destroy();
  modal = null;
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

describe('Modal', () => {
  it('builds default classes, data markers and renderable content', () => {
    modal = createModal({
      id: 'default-modal',
      content: ['Count: ', 1, false, null],
    }).build();

    expect(modal.element?.classList.contains('j-popup-layout')).toBe(true);
    expect(dialog(modal)?.classList.contains('j-modal')).toBe(true);
    expect(modal.element?.getAttribute('data-modal')).toBe('root');
    expect(modal.element?.getAttribute('aria-modal')).toBe('true');
    expect(modal.element?.getAttribute('aria-labelledby')).toBe(
      'default-modal_title'
    );
    expect(
      modal.element?.querySelector('[data-modal-dialog="default-modal"]')
    ).toBe(dialog(modal));

    modal.show();
    expect(document.body.contains(modal.element)).toBe(true);
    expect(modal.state.visible).toBe(true);
    expect(body(modal)?.textContent).toBe('Count: 1');
  });

  it('allows className overrides without changing data selectors', () => {
    modal = createModal({
      id: 'custom-modal',
      content: 'Custom content',
      className: {
        layout: 'qa-modal-layout',
        modal: 'qa-modal',
        body: 'qa-modal-body',
        confirmBtn: 'qa-confirm',
        closeBtn: 'qa-close',
      },
    }).build();

    expect(modal.element?.classList.contains('qa-modal-layout')).toBe(true);
    expect(modal.element?.classList.contains('j-popup-layout')).toBe(false);
    expect(dialog(modal)?.classList.contains('qa-modal')).toBe(true);
    expect(
      modal.element?.querySelector('[data-modal-dialog="custom-modal"]')
    ).toBe(dialog(modal));

    modal.show();
    const confirm = dialog(modal)?.querySelector<HTMLElement>(
      '[data-action="confirm"]'
    );
    expect(confirm?.classList.contains('qa-confirm')).toBe(true);
  });

  it('reacts to direct visible state changes', async () => {
    modal = createModal({
      id: 'reactive-modal',
      text: { title: 'Reactive title' },
      content: 'Reactive content',
      position: 'top',
    }).build();

    modal.state.visible = true;
    await Promise.resolve();

    expect(document.body.contains(modal.element)).toBe(true);
    expect(modal.element?.classList.contains('is-top')).toBe(true);

    modal.state.visible = false;
    await Promise.resolve();

    expect(modal.state.visible).toBe(false);
    await flushPresence();
    expect(document.body.contains(modal.element)).toBe(false);
  });

  it('keeps the dialog mounted until its leave transition finishes', async () => {
    modal = createModal({ content: 'Animated content' }).build();
    const panel = dialog(modal);
    if (!panel) throw new Error('Expected modal dialog.');
    const rootMotion = pendingAnimation();
    const panelMotion = pendingAnimation();
    Object.defineProperty(modal.element, 'animate', {
      configurable: true,
      value: () => rootMotion.animation,
    });
    Object.defineProperty(panel, 'animate', {
      configurable: true,
      value: () => panelMotion.animation,
    });

    modal.show();
    modal.hide();

    expect(panel?.getAttribute('data-mount')).toBe('false');
    expect(modal.element?.getAttribute('data-mount')).toBe('false');
    expect(document.body.contains(modal.element)).toBe(true);

    rootMotion.resolve();
    panelMotion.resolve();
    await flushPresence();
    expect(document.body.contains(modal.element)).toBe(false);
  });

  it('keeps body content stable while leaving', async () => {
    modal = createModal({ content: 'Closing body' }).build();
    const panel = dialog(modal);
    if (!panel) throw new Error('Expected modal dialog.');
    const rootMotion = pendingAnimation();
    const panelMotion = pendingAnimation();
    Object.defineProperty(modal.element, 'animate', {
      configurable: true,
      value: () => rootMotion.animation,
    });
    Object.defineProperty(panel, 'animate', {
      configurable: true,
      value: () => panelMotion.animation,
    });

    modal.show();
    await Promise.resolve();
    expect(body(modal)?.textContent).toBe('Closing body');

    modal.hide();
    await Promise.resolve();

    expect(document.body.contains(modal.element)).toBe(true);
    expect(body(modal)?.textContent).toBe('Closing body');

    rootMotion.resolve();
    panelMotion.resolve();
    await flushPresence();

    expect(document.body.contains(modal.element)).toBe(false);
  });

  it('handles confirm, cancel, Escape and background close by data actions', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    modal = createModal({
      content: jsx('button', {
        'data-action': 'close',
        children: jsx('span', {
          'data-testid': 'inner',
          children: 'x',
        }),
      }),
      escClose: true,
      bgClose: true,
      onConfirm,
      onCancel,
    }).build();

    modal.show();
    dialog(modal)
      ?.querySelector<HTMLElement>('[data-action="confirm"]')
      ?.click();
    await Promise.resolve();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(modal.state.visible).toBe(true);
    expect(modal.state.processing).toBe(false);
    expect(dialog(modal)?.querySelector('[aria-live="polite"]')).toBeNull();

    modal.hide();
    await flushPresence();
    modal.show();
    dialog(modal)?.querySelector<HTMLElement>('[data-testid="inner"]')?.click();
    await Promise.resolve();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(modal.state.visible).toBe(false);

    await flushPresence();
    modal.show();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.state.visible).toBe(false);

    await flushPresence();
    modal.show();
    modal.element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modal.state.visible).toBe(false);
  });

  it('uses loading only for async content resolution', async () => {
    const pending = deferred<string>();
    const content = vi.fn(() => pending.promise);
    modal = createModal({
      id: 'async-content',
      text: { title: 'Async content' },
      content,
    }).build();

    await Promise.resolve();
    expect(content).not.toHaveBeenCalled();
    expect(body(modal)?.textContent).toBe('');

    modal.show();
    await Promise.resolve();

    expect(content).toHaveBeenCalledTimes(1);
    expect(modal.state.loading).toBe(true);
    expect(modal.state.processing).toBe(false);
    expect(header(modal)?.hidden).toBe(true);
    expect(footer(modal)?.hidden).toBe(true);
    expect(body(modal)?.querySelector('[aria-live="polite"]')).toBeNull();
    expect(dialog(modal)?.querySelector('[aria-live="polite"]')).toBeTruthy();

    pending.resolve('Loaded content');
    await flushPresence();

    expect(modal.state.loading).toBe(false);
    expect(header(modal)?.hidden).toBe(false);
    expect(footer(modal)?.hidden).toBe(false);
    expect(body(modal)?.textContent).toBe('Loaded content');
  });

  it('caches async content until ttl expires', async () => {
    vi.setSystemTime(1000);
    let loadCount = 0;
    const content = vi.fn(async () => `Loaded ${++loadCount}`);
    modal = createModal({
      id: 'cached-content',
      content,
      cache: true,
      ttl: 1000,
    }).build();

    expect(content).not.toHaveBeenCalled();
    modal.show();
    await flushPresence();
    expect(content).toHaveBeenCalledTimes(1);
    expect(body(modal)?.textContent).toBe('Loaded 1');

    modal.hide();
    await flushPresence();
    modal.show();
    await flushPresence();

    expect(content).toHaveBeenCalledTimes(1);
    expect(body(modal)?.textContent).toBe('Loaded 1');

    vi.setSystemTime(2001);
    modal.hide();
    await flushPresence();
    modal.show();
    await flushPresence();

    expect(content).toHaveBeenCalledTimes(2);
    expect(body(modal)?.textContent).toBe('Loaded 2');
  });

  it('uses processing for async confirm and cancel handlers', async () => {
    const confirm = deferred();
    const cancel = deferred();
    const onConfirm = vi.fn(() => confirm.promise);
    const onCancel = vi.fn(() => cancel.promise);
    modal = createModal({
      id: 'processing-modal',
      content: 'Processing body',
      escClose: true,
      bgClose: true,
      onConfirm,
      onCancel,
    }).build();

    modal.show();
    dialog(modal)
      ?.querySelector<HTMLElement>('[data-action="confirm"]')
      ?.click();
    await Promise.resolve();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(modal.state.loading).toBe(false);
    expect(modal.state.processing).toBe(true);
    expect(dialog(modal)?.querySelector('[aria-live="polite"]')).toBeTruthy();
    expect(
      dialog(modal)?.querySelector<HTMLButtonElement>('[data-action="close"]')
        ?.disabled
    ).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    modal.element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modal.state.visible).toBe(true);

    confirm.resolve(undefined);
    await flushPresence();

    expect(modal.state.processing).toBe(false);

    dialog(modal)
      ?.querySelector<HTMLElement>('[data-action="cancel"]')
      ?.click();
    await Promise.resolve();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(modal.state.processing).toBe(true);
    expect(modal.state.visible).toBe(true);

    cancel.resolve(undefined);
    await flushPresence();

    expect(modal.state.processing).toBe(false);
    expect(modal.state.visible).toBe(false);
  });

  it('keeps processing state stable until async confirm hide finishes leaving', async () => {
    const confirm = deferred();
    modal = createModal({
      id: 'processing-hide-modal',
      content: 'Processing body',
      onConfirm: async (instance) => {
        await confirm.promise;
        instance.hide();
      },
    }).build();
    const panel = dialog(modal);
    if (!panel) throw new Error('Expected modal dialog.');
    const rootMotion = pendingAnimation();
    const panelMotion = pendingAnimation();
    Object.defineProperty(modal.element, 'animate', {
      configurable: true,
      value: () => rootMotion.animation,
    });
    Object.defineProperty(panel, 'animate', {
      configurable: true,
      value: () => panelMotion.animation,
    });

    modal.show();
    dialog(modal)
      ?.querySelector<HTMLElement>('[data-action="confirm"]')
      ?.click();
    await Promise.resolve();
    expect(modal.state.processing).toBe(true);

    confirm.resolve(undefined);
    await flushPresence();

    expect(modal.state.visible).toBe(false);
    expect(modal.state.processing).toBe(true);
    expect(document.body.contains(modal.element)).toBe(true);
    expect(dialog(modal)?.querySelector('[aria-live="polite"]')).toBeTruthy();

    rootMotion.resolve();
    panelMotion.resolve();
    await flushPresence();

    expect(modal.state.processing).toBe(false);
    expect(document.body.contains(modal.element)).toBe(false);
  });

  it('uses an external Form instance as modal content', async () => {
    const onSubmit =
      vi.fn<(data: FormDataRecord) => void>();
    const form = createForm({
      fields: [
        {
          type: 'text',
          payload: { label: 'Name', name: 'name', required: true },
        },
      ],
      buttons: false,
      onSubmit,
    }).build();
    modal = createModal({
      id: 'external-form-modal',
      content: () => form.element,
      onConfirm: () => {
        form.requestSubmit();
      },
    }).build();

    modal.show();
    await Promise.resolve();

    const input = modal.element
      ?.querySelector<HTMLFormElement>('form')
      ?.elements.namedItem('name');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected name input.');
    }
    input.value = 'alice';
    dialog(modal)
      ?.querySelector<HTMLElement>('[data-action="confirm"]')
      ?.click();
    await Promise.resolve();

    expect(onSubmit).toHaveBeenCalledWith({ name: 'alice' }, form);
  });

  it('updates and resets reactive state while rejecting static props', () => {
    modal = createModal({
      id: 'stable-modal',
      content: 'Initial',
      text: { title: 'Initial title', confirm: 'OK', cancel: 'Cancel' },
    }).build();

    modal.setState({ content: 'Updated', processing: true });
    expect(modal.state.content).toBe('Updated');
    expect(modal.state.processing).toBe(true);

    expect(() => setInvalidState({ id: 'next-modal' })).toThrow(
      /not a supported state key/
    );
    expect(() => setInvalidState({ text: { confirm: 'Save' } })).toThrow(
      /not a supported state key/
    );
    expect(() =>
      setInvalidState({ className: { modal: 'next-modal-class' } })
    ).toThrow(/not a supported state key/);
    expect(() => setInvalidState({ position: 'bottom' })).toThrow(
      /not a supported state key/
    );
    expect(() => setInvalidState({ mode: 'auto' })).toThrow(
      /not a supported state key/
    );

    modal.reset();
    expect(modal.state.content).toBe('Initial');
    expect(modal.state.loading).toBe(false);
    expect(modal.state.processing).toBe(false);
  });

  it('requires build before show', () => {
    modal = createModal({
      content: 'Manual build',
    });

    expect(modal.element).toBeNull();
    expect(() => modal?.show()).toThrow(/build\(\) must be called/);

    modal.build().show();
    expect(document.body.contains(modal.element)).toBe(true);
  });
});

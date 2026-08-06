// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { createModal, type Modal } from '../src/components/modal.ts';

let modal: Modal | null = null;

function flushHide(): void {
  vi.advanceTimersByTime(310);
}

function setInvalidState(patch: Record<string, unknown>): void {
  modal?.setState(patch as never);
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

    expect(modal.dom.root?.classList.contains('j-popup-layout')).toBe(true);
    expect(modal.dom.modal?.classList.contains('j-modal')).toBe(true);
    expect(modal.dom.root?.getAttribute('data-modal')).toBe('root');
    expect(modal.dom.root?.getAttribute('aria-modal')).toBe('true');
    expect(modal.dom.root?.getAttribute('aria-labelledby')).toBe(
      'default-modal_title'
    );
    expect(
      modal.dom.root?.querySelector('[data-modal-dialog="default-modal"]')
    ).toBe(modal.dom.modal);

    modal.show();
    expect(document.body.contains(modal.dom.root)).toBe(true);
    expect(modal.state.visible).toBe(true);
    expect(modal.dom.body?.textContent).toBe('Count: 1');
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

    expect(modal.dom.root?.classList.contains('qa-modal-layout')).toBe(true);
    expect(modal.dom.root?.classList.contains('j-popup-layout')).toBe(false);
    expect(modal.dom.modal?.classList.contains('qa-modal')).toBe(true);
    expect(
      modal.dom.root?.querySelector('[data-modal-dialog="custom-modal"]')
    ).toBe(modal.dom.modal);

    modal.show();
    const confirm = modal.dom.modal?.querySelector<HTMLElement>(
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

    expect(document.body.contains(modal.dom.root)).toBe(true);
    expect(modal.dom.root?.classList.contains('is-top')).toBe(true);

    modal.state.visible = false;
    await Promise.resolve();

    expect(modal.state.visible).toBe(false);
    flushHide();
    expect(document.body.contains(modal.dom.root)).toBe(false);
  });

  it('handles confirm, cancel, Escape and background close by data actions', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    modal = createModal({
      content:
        '<button data-action="close"><span data-testid="inner">x</span></button>',
      escClose: true,
      bgClose: true,
      onConfirm,
      onCancel,
    }).build();

    modal.show();
    modal.dom.modal
      ?.querySelector<HTMLElement>('[data-action="confirm"]')
      ?.click();
    await Promise.resolve();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(modal.state.visible).toBe(true);

    modal.hide();
    flushHide();
    modal.show();
    modal.dom.modal
      ?.querySelector<HTMLElement>('[data-testid="inner"]')
      ?.click();
    await Promise.resolve();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(modal.state.visible).toBe(false);

    flushHide();
    modal.show();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.state.visible).toBe(false);

    flushHide();
    modal.show();
    modal.dom.root?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modal.state.visible).toBe(false);
  });

  it('submits Form data and merges extra fields', async () => {
    const onSubmit = vi.fn();
    modal = createModal({
      id: 'form-modal',
      fields: [{ label: 'Name', name: 'name', type: 'text', required: true }],
      onSubmit,
    }).build();

    expect(modal.state.mode).toBe('form');
    modal.show();

    const input = modal.dom.form?.root?.elements.namedItem('name');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected name input.');
    }
    input.value = 'alice';
    modal.state.extraData = { source: 'test' };
    modal.requestSubmit();
    await Promise.resolve();

    expect(onSubmit).toHaveBeenCalledWith(
      { name: 'alice', source: 'test' },
      modal
    );
    expect(modal.state.data).toEqual({ name: 'alice', source: 'test' });
  });

  it('uses explicit mode instead of fields shape to choose body rendering', async () => {
    const onConfirm = vi.fn();
    const onSubmit = vi.fn();
    modal = createModal({
      id: 'content-with-fields',
      mode: 'content',
      content: 'Plain body',
      fields: [{ label: 'Hidden field', name: 'hidden' }],
      onConfirm,
      onSubmit,
    }).build();

    expect(modal.state.mode).toBe('content');
    expect(modal.state.fields).toHaveLength(1);

    modal.show();
    expect(modal.dom.form).toBeNull();
    expect(modal.dom.body?.textContent).toBe('Plain body');

    modal.dom.modal
      ?.querySelector<HTMLElement>('[data-action="confirm"]')
      ?.click();
    await Promise.resolve();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('switches body rendering only when mode changes', async () => {
    modal = createModal({
      id: 'mode-switch',
      mode: 'form',
      content: 'Stored content',
      fields: [{ label: 'Name', name: 'name', type: 'text' }],
    }).build();

    modal.show();
    expect(modal.dom.form).toBeTruthy();

    modal.setState({ content: 'Next content' });
    await Promise.resolve();
    expect(modal.state.mode).toBe('form');
    expect(modal.dom.form).toBeTruthy();
    expect(modal.dom.body?.textContent).not.toContain('Next content');

    modal.setState({ mode: 'content' });
    await Promise.resolve();
    expect(modal.dom.form).toBeNull();
    expect(modal.dom.body?.textContent).toBe('Next content');

    modal.state.mode = 'form';
    await Promise.resolve();
    expect(modal.dom.form).toBeTruthy();
  });

  it('updates and resets reactive state while rejecting static props', () => {
    modal = createModal({
      id: 'stable-modal',
      content: 'Initial',
      text: { title: 'Initial title', confirm: 'OK', cancel: 'Cancel' },
    }).build();

    modal.setState({ content: 'Updated', loading: true });
    expect(modal.state.content).toBe('Updated');
    expect(modal.state.loading).toBe(true);

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
      /expects one of content, form/
    );

    modal.reset();
    expect(modal.state.mode).toBe('content');
    expect(modal.state.content).toBe('Initial');
    expect(modal.state.loading).toBe(false);
  });

  it('requires build before show', () => {
    modal = createModal({
      content: 'Manual build',
    });

    expect(modal.dom.root).toBeNull();
    expect(() => modal?.show()).toThrow(/build\(\) must be called/);

    modal.build().show();
    expect(document.body.contains(modal.dom.root)).toBe(true);
  });
});

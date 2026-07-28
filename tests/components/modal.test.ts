// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { Modal, createModal } from '../../src/components/modal.ts';

let modal: Modal | null = null;

function flushHide(): void {
  vi.advanceTimersByTime(310);
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
    modal = new Modal({
      id: 'default-modal',
      content: ['Count: ', 1, false, null],
    });

    expect(modal.root?.classList.contains('j-popup-layout')).toBe(true);
    expect(modal.dom.modal?.classList.contains('j-modal')).toBe(true);
    expect(modal.root?.getAttribute('data-modal')).toBe('root');
    expect(
      modal.root?.querySelector('[data-modal-body="default-modal"]')
    ).toBeTruthy();

    modal.show();
    expect(document.body.contains(modal.root)).toBe(true);
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
        confirm: 'qa-confirm',
        close: 'qa-close',
      },
    });

    expect(modal.root?.classList.contains('qa-modal-layout')).toBe(true);
    expect(modal.root?.classList.contains('j-popup-layout')).toBe(false);
    expect(modal.dom.modal?.classList.contains('qa-modal')).toBe(true);
    expect(
      modal.root?.querySelector('[data-modal-body="custom-modal"]')
    ).toBeTruthy();

    modal.show();
    const confirm = modal.dom.modal?.querySelector<HTMLElement>(
      '[data-action="confirm"]'
    );
    expect(confirm?.classList.contains('qa-confirm')).toBe(true);
  });

  it('handles confirm, cancel, Escape and background close by data actions', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    modal = new Modal({
      content:
        '<button data-action="close"><span data-testid="inner">x</span></button>',
      escClose: true,
      bgClose: true,
      onConfirm,
      onCancel,
    });

    modal.show();
    modal.dom.modal
      ?.querySelector<HTMLElement>('[data-action="confirm"]')
      ?.click();
    await Promise.resolve();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(modal.state.visible).toBe(false);

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
    modal.root?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modal.state.visible).toBe(false);
  });

  it('submits Form data and merges extra fields', async () => {
    const onSubmit = vi.fn();
    modal = new Modal({
      id: 'form-modal',
      fields: [{ label: 'Name', name: 'name', type: 'text', required: true }],
      onSubmit,
    });

    modal.show();

    const input = modal.dom.form?.root?.elements.namedItem('name');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected name input.');
    }
    input.value = 'alice';
    modal.addFields({ source: 'test' });
    modal.requestSubmit();
    await Promise.resolve();

    expect(onSubmit).toHaveBeenCalledWith(
      { name: 'alice', source: 'test' },
      modal
    );
    expect(modal.state.data).toEqual({ name: 'alice', source: 'test' });
  });

  it('updates and resets state while protecting init-only props', () => {
    modal = new Modal({
      id: 'stable-modal',
      content: 'Initial',
      text: { title: 'Initial title', confirm: 'OK', cancel: 'Cancel' },
    });

    modal.update({ text: { confirm: 'Save' }, content: 'Updated' });
    expect(modal.state.text.title).toBe('Initial title');
    expect(modal.state.text.confirm).toBe('Save');
    expect(modal.state.content).toBe('Updated');

    expect(() => modal?.update({ id: 'next-modal' })).toThrow(
      /cannot be updated/
    );

    modal.reset();
    expect(modal.state.content).toBe('Initial');
    expect(modal.state.text.confirm).toBe('OK');
  });
});

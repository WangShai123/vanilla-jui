// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { createForm, type FormDataRecord } from '../src/components/form.ts';

type FormInstance = ReturnType<typeof createForm>;

let form: FormInstance | null = null;

function app(): HTMLElement {
  const element = document.querySelector<HTMLElement>('#app');
  if (!element) throw new Error('Missing #app fixture.');
  return element;
}

function submit(root: HTMLFormElement): void {
  root.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function mountForm(): void {
  if (!form?.element) throw new Error('Form root was not built.');
  app().appendChild(form.element);
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  form?.destroy();
  form = null;
  document.body.innerHTML = '';
});

describe('Form', () => {
  it('builds default form classes and stable data markers', () => {
    form = createForm({
      id: 'default-form',
      fields: [
        { label: 'Email', name: 'email', type: 'email', required: true },
        { label: 'Bio', name: 'bio', type: 'textarea', help: 'Short bio' },
      ],
    });

    expect(form.element).toBeNull();
    form.build();
    expect(app().contains(form.element)).toBe(false);
    mountForm();

    expect(form.element).toBeInstanceOf(HTMLFormElement);
    expect(app().contains(form.element)).toBe(true);
    expect(form.element?.classList.contains('j-form')).toBe(true);
    expect(form.element?.classList.contains('is-vertical')).toBe(true);
    expect(form.element?.dataset.form).toBe('root');
    expect(form.element?.querySelectorAll('[data-form-item]')).toHaveLength(2);
    expect(
      form.element?.querySelector('[data-form-control="email"]')
    ).toBeTruthy();
    expect(form.element?.querySelector('[data-form-help="bio"]')).toBeTruthy();
    expect(
      form.element?.querySelectorAll('[data-form-buttons] button')
    ).toHaveLength(2);
  });

  it('allows className overrides without changing data selectors', () => {
    form = createForm({
      id: 'custom-form',
      fields: [{ label: 'Name', name: 'name', help: 'Static help' }],
      className: {
        form: 'profile-form',
        vertical: 'profile-stack',
        item: 'profile-field',
        control: 'profile-control',
        help: 'profile-help',
        buttons: 'profile-actions',
      } as Record<string, string>,
    }).build();
    mountForm();

    expect(form.element?.classList.contains('profile-form')).toBe(true);
    expect(form.element?.classList.contains('profile-stack')).toBe(true);
    expect(form.element?.classList.contains('j-form')).toBe(false);
    expect(form.element?.querySelector('.profile-field')).toBeTruthy();
    expect(form.element?.querySelector('[data-form-item="name"]')).toBeTruthy();
    expect(
      form.element?.querySelector('[data-form-control="name"]')
    ).toBeTruthy();
    expect(form.element?.querySelector('.help-block')).toBeTruthy();
    expect(form.element?.querySelector('.profile-help')).toBeNull();
    expect(form.element?.querySelector('[data-form-buttons]')).toBeTruthy();
  });

  it('reactively updates fields and preserves stable data selectors', () => {
    form = createForm({
      id: 'update-form',
      fields: [{ label: 'Name', name: 'name' }],
      buttons: false,
    }).build();
    mountForm();

    form.setFields([
      { label: 'Name', name: 'name' },
      { label: 'Bio', name: 'bio', type: 'textarea' },
    ]);

    expect(form.element?.querySelectorAll('[data-form-item]')).toHaveLength(2);
    expect(
      form.element?.querySelector('[data-form-field="bio"]')
    ).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('collects submitted form data', async () => {
    const onSubmit =
      vi.fn<(data: FormDataRecord, form: FormInstance) => void>();

    form = createForm({
      id: 'submit-form',
      fields: [
        { label: 'Email', name: 'email', type: 'email' },
        {
          label: 'Tags',
          name: 'tags',
          type: 'checkbox',
          options: [
            { value: 'ui', text: 'UI', checked: true },
            { value: 'dx', text: 'DX', checked: true },
          ],
        },
      ],
      buttons: false,
      onSubmit,
    }).build();
    mountForm();

    const email = form.element?.elements.namedItem('email');
    if (!(email instanceof HTMLInputElement) || !form.element) {
      throw new Error('Email input was not rendered.');
    }

    email.value = 'demo@example.com';
    submit(form.element);
    await Promise.resolve();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      email: 'demo@example.com',
      tags: ['ui', 'dx'],
    });
  });
});

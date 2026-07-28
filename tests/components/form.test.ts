// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import {
  Form,
  createForm,
  type FormDataRecord,
} from '../../src/components/form.ts';

let form: Form | null = null;

function app(): HTMLElement {
  const element = document.querySelector<HTMLElement>('#app');
  if (!element) throw new Error('Missing #app fixture.');
  return element;
}

function submit(root: HTMLFormElement): void {
  root.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
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
    form = new Form(
      {
        id: 'default-form',
        fields: [
          { label: 'Email', name: 'email', type: 'email', required: true },
          { label: 'Bio', name: 'bio', type: 'textarea', help: 'Short bio' },
        ],
      },
      app()
    );

    expect(form.root).toBeNull();
    form.build();

    expect(form.root).toBeInstanceOf(HTMLFormElement);
    expect(form.root?.classList.contains('j-form')).toBe(true);
    expect(form.root?.classList.contains('is-vertical')).toBe(true);
    expect(form.root?.dataset.form).toBe('root');
    expect(form.root?.querySelectorAll('[data-form-item]')).toHaveLength(2);
    expect(
      form.root?.querySelector('[data-form-control="email"]')
    ).toBeTruthy();
    expect(form.root?.querySelector('[data-form-help="bio"]')).toBeTruthy();
    expect(
      form.root?.querySelectorAll('[data-form-buttons] button')
    ).toHaveLength(2);
  });

  it('allows className overrides without changing data selectors', () => {
    form = createForm(
      {
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
      },
      app()
    ).build();

    expect(form.root?.classList.contains('profile-form')).toBe(true);
    expect(form.root?.classList.contains('profile-stack')).toBe(true);
    expect(form.root?.classList.contains('j-form')).toBe(false);
    expect(form.root?.querySelector('.profile-field')).toBeTruthy();
    expect(form.root?.querySelector('[data-form-item="name"]')).toBeTruthy();
    expect(form.root?.querySelector('[data-form-control="name"]')).toBeTruthy();
    expect(form.root?.querySelector('.help-block')).toBeTruthy();
    expect(form.root?.querySelector('.profile-help')).toBeNull();
    expect(form.root?.querySelector('[data-form-buttons]')).toBeTruthy();
  });

  it('updates fields and preserves stable data selectors', () => {
    form = createForm(
      {
        id: 'update-form',
        fields: [{ label: 'Name', name: 'name' }],
        buttons: false,
      },
      app()
    ).build();

    form.update({
      fields: [
        { label: 'Name', name: 'name' },
        { label: 'Bio', name: 'bio', type: 'textarea' },
      ],
    });

    expect(form.root?.querySelectorAll('[data-form-item]')).toHaveLength(2);
    expect(form.root?.querySelector('[data-form-field="bio"]')).toBeInstanceOf(
      HTMLTextAreaElement
    );
  });

  it('collects submitted form data', async () => {
    const onSubmit = vi.fn<(data: FormDataRecord, form: Form) => void>();

    form = createForm(
      {
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
      },
      app()
    ).build();

    const email = form.root?.elements.namedItem('email');
    if (!(email instanceof HTMLInputElement) || !form.root) {
      throw new Error('Email input was not rendered.');
    }

    email.value = 'demo@example.com';
    submit(form.root);
    await Promise.resolve();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      email: 'demo@example.com',
      tags: ['ui', 'dx'],
    });
  });
});

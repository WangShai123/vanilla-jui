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
  createForm,
  type FormDataRecord,
  type FormItem,
} from '../src/components/form.ts';

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

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
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
        {
          type: 'email',
          payload: { label: 'Email', name: 'email', required: true },
        },
        {
          type: 'textarea',
          payload: { label: 'Bio', name: 'bio', help: 'Short bio' },
        },
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
      fields: [
        {
          type: 'text',
          payload: { label: 'Name', name: 'name', help: 'Static help' },
        },
      ],
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

  it('resolves button position from props into inline style', () => {
    form = createForm({ buttonsPosition: 'center' }).build();
    mountForm();

    const buttons = form.element?.querySelector<HTMLElement>(
      '[data-form-buttons]'
    );
    expect(buttons?.style.justifyContent).toBe('center');

    form.destroy();
    form = createForm({ buttonsPosition: 'start' }).build();
    mountForm();

    const nextButtons = form.element?.querySelector<HTMLElement>(
      '[data-form-buttons]'
    );
    expect(nextButtons?.style.justifyContent).toBe('flex-start');
  });

  it('reactively updates fields and preserves stable data selectors', () => {
    form = createForm({
      id: 'update-form',
      fields: [{ type: 'text', payload: { label: 'Name', name: 'name' } }],
      buttons: false,
    }).build();
    mountForm();

    form.setFields([
      { type: 'text', payload: { label: 'Name', name: 'name' } },
      { type: 'textarea', payload: { label: 'Bio', name: 'bio' } },
    ]);

    expect(form.element?.querySelectorAll('[data-form-item]')).toHaveLength(2);
    expect(
      form.element?.querySelector('[data-form-field="bio"]')
    ).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('updates reused field control values from setFields payloads', () => {
    form = createForm({
      id: 'edit-form',
      fields: [
        { type: 'text', payload: { label: 'Name', name: 'name' } },
        { type: 'text', payload: { label: 'Slug', name: 'slug' } },
        { type: 'number', payload: { label: 'Start', name: 'start' } },
        { type: 'number', payload: { label: 'End', name: 'end' } },
      ],
      buttons: false,
    }).build();
    mountForm();

    const nameInput = form.element?.elements.namedItem(
      'name'
    ) as HTMLInputElement | null;

    form.setFields([
      {
        type: 'text',
        payload: { label: 'Name', name: 'name', required: true, value: 'Demo' },
      },
      {
        type: 'text',
        payload: { label: 'Slug', name: 'slug', value: 'demo', readonly: true },
      },
      {
        type: 'number',
        payload: { label: 'Start', name: 'start', value: 10, readonly: true },
      },
      {
        type: 'number',
        payload: { label: 'End', name: 'end', value: 20, readonly: true },
      },
    ]);

    expect(form.element?.elements.namedItem('name')).toBe(nameInput);
    expect(nameInput?.value).toBe('Demo');
    expect(nameInput?.required).toBe(true);

    const slugInput = form.element?.elements.namedItem(
      'slug'
    ) as HTMLInputElement | null;
    const startInput = form.element?.elements.namedItem(
      'start'
    ) as HTMLInputElement | null;
    const endInput = form.element?.elements.namedItem(
      'end'
    ) as HTMLInputElement | null;

    expect(slugInput?.value).toBe('demo');
    expect(slugInput?.readOnly).toBe(true);
    expect(startInput?.value).toBe('10');
    expect(startInput?.readOnly).toBe(true);
    expect(endInput?.value).toBe('20');
    expect(endInput?.readOnly).toBe(true);
  });

  it('updates control value when nested field state changes', async () => {
    form = createForm({
      id: 'nested-field-form',
      fields: [
        {
          type: 'text',
          payload: { label: 'Name', name: 'name', value: 'Initial' },
        },
      ],
      buttons: false,
    }).build();
    mountForm();

    const nameInput = form.element?.elements.namedItem(
      'name'
    ) as HTMLInputElement | null;
    expect(nameInput?.value).toBe('Initial');

    form.state.fields[0]!.payload.value = 'Updated';
    await Promise.resolve();

    expect(form.element?.elements.namedItem('name')).toBe(nameInput);
    expect(nameInput?.value).toBe('Updated');
  });

  it('collects submitted form data', async () => {
    const onSubmit =
      vi.fn<(data: FormDataRecord, form: FormInstance) => void>();

    form = createForm({
      id: 'submit-form',
      fields: [
        {
          type: 'email',
          payload: { label: 'Email', name: 'email' },
        },
        {
          type: 'checkbox',
          payload: {
            label: 'Tags',
            name: 'tags',
            options: [
              { value: 'ui', text: 'UI', checked: true },
              { value: 'dx', text: 'DX', checked: true },
            ],
          },
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

  it('disables buttons and fields while inserting loading before submit text', async () => {
    const pending = deferred();
    form = createForm({
      id: 'submitting-form',
      fields: [
        {
          type: 'text',
          payload: { label: 'Name', name: 'name', value: 'alice' },
        },
        {
          type: 'textarea',
          payload: { label: 'Bio', name: 'bio' },
        },
        {
          type: 'select',
          payload: {
            label: 'Role',
            name: 'role',
            value: 'admin',
            options: [{ value: 'admin', text: 'Admin' }],
          },
        },
        {
          type: 'radio',
          payload: {
            label: 'Mode',
            name: 'mode',
            value: 'basic',
            options: [{ value: 'basic', text: 'Basic' }],
          },
        },
        {
          type: 'checkbox',
          payload: {
            label: 'Tags',
            name: 'tags',
            options: [{ value: 'ui', text: 'UI', checked: true }],
          },
        },
        {
          type: 'switch',
          payload: {
            label: 'Publish',
            name: 'publish',
            value: '1',
            checked: true,
          },
        },
      ],
      buttons: [
        { type: 'submit', text: 'Save', theme: 'primary', action: 'submit' },
        { type: 'reset', text: 'Reset', theme: 'ghost', action: 'reset' },
      ],
      onSubmit: () => pending.promise,
    }).build();
    mountForm();

    if (!form.element) throw new Error('Form root was not rendered.');
    submit(form.element);
    await Promise.resolve();

    const submitButton = form.element.querySelector<HTMLButtonElement>(
      '[data-action="submit"]'
    );
    const resetButton = form.element.querySelector<HTMLButtonElement>(
      '[data-action="reset"]'
    );
    const fieldControls = Array.from(form.element.elements).filter(
      (
        element
      ): element is
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement =>
        (element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement) &&
        !(element instanceof HTMLButtonElement)
    );

    expect(form.state.submitting).toBe(true);
    expect(submitButton?.disabled).toBe(true);
    expect(resetButton?.disabled).toBe(true);
    expect(submitButton?.textContent).toContain('Save');
    expect(submitButton?.querySelector('[aria-live="polite"]')).toBeTruthy();
    expect(fieldControls.every((control) => control.disabled)).toBe(true);

    pending.resolve(undefined);
    await tick();

    expect(form.state.submitting).toBe(false);
    expect(submitButton?.querySelector('[aria-live="polite"]')).toBeNull();
    expect(submitButton?.textContent).toBe('Save');
    expect(submitButton?.disabled).toBe(false);
    expect(resetButton?.disabled).toBe(false);
    expect(fieldControls.every((control) => control.disabled)).toBe(false);
  });

  it('renders dynamic next items with local keyed reuse', async () => {
    const email: FormItem = {
      type: 'email',
      payload: {
        label: 'Email',
        name: 'email',
      },
      next: null,
    };
    const name: FormItem = {
      type: 'text',
      payload: {
        label: 'Name',
        name: 'name',
        showEmail: false,
      },
      next: null,
    };
    name.next = (current) =>
      (current.payload as { showEmail: boolean }).showEmail ? email : null;

    form = createForm({
      id: 'dynamic-next-form',
      fields: [name],
      buttons: false,
    }).build();
    mountForm();

    const root = form.element;
    const nameItem = form.element?.querySelector('[data-form-item="name"]');

    (form.state.fields[0].payload as { showEmail: boolean }).showEmail = true;
    await tick();

    expect(form.element).toBe(root);
    expect(form.element?.parentNode).toBe(app());
    expect(form.element?.querySelectorAll('[data-form-item]')).toHaveLength(2);
    expect(form.element?.querySelector('[data-form-item="name"]')).toBe(
      nameItem
    );
    expect(
      form.element?.querySelector('[data-form-field="email"]')
    ).toBeInstanceOf(HTMLInputElement);
  });

  it('updates conditional next items and validates the current form controls', async () => {
    const details: FormItem = {
      type: 'text',
      payload: {
        label: 'Details',
        name: 'details',
      },
      next: null,
    };
    const mode: FormItem = {
      type: 'text',
      payload: {
        label: 'Mode',
        name: 'mode',
        value: 'basic',
      },
      next: null,
    };
    mode.next = (current, acients) => {
      expect(acients[0]).toBe(current);
      return (current.payload as { value: string }).value === 'advanced'
        ? details
        : null;
    };

    form = createForm({
      id: 'dynamic-validator-form',
      fields: [mode],
      buttons: false,
      validator: {
        rules: {
          details: { required: true },
        },
        messages: {
          details: { required: 'Details are required.' },
        },
      },
    }).build();
    mountForm();

    expect(
      form.element?.querySelector('[data-form-item="details"]')
    ).toBeNull();
    expect(form.validate()).toBe(true);

    (form.state.fields[0].payload as { value: string }).value = 'advanced';
    await tick();

    expect(
      form.element?.querySelector('[data-form-item="details"]')
    ).toBeTruthy();
    expect(form.validate()).toBe(false);
    expect(
      form.element?.querySelector('[data-validator-help="details"]')
        ?.textContent
    ).toBe('Details are required.');
  });

  it('uses select changes to choose the next dynamic form item', async () => {
    const input: FormItem = {
      type: 'text',
      payload: {
        label: 'Dynamic Input',
        name: 'dynamicValue',
      },
      next: null,
    };
    const textarea: FormItem = {
      type: 'textarea',
      payload: {
        label: 'Dynamic Textarea',
        name: 'dynamicValue',
      },
      next: null,
    };
    const selector: FormItem = {
      type: 'select',
      payload: {
        label: 'Field Type',
        name: 'fieldType',
        value: 'input',
        options: [
          { value: 'input', text: 'Input' },
          { value: 'textarea', text: 'Textarea' },
        ],
      },
      next: null,
    };
    selector.next = (current) =>
      (current.payload as { value: string }).value === 'textarea'
        ? textarea
        : input;

    form = createForm({
      id: 'select-dynamic-form',
      fields: [selector],
      buttons: false,
    }).build();
    mountForm();

    expect(
      form.element?.querySelector('[data-form-field="dynamicValue"]')
    ).toBeInstanceOf(HTMLInputElement);

    const select = form.element?.elements.namedItem('fieldType');
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('Field type select was not rendered.');
    }

    select.value = 'textarea';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();

    expect(
      form.element?.querySelector('[data-form-field="dynamicValue"]')
    ).toBeInstanceOf(HTMLTextAreaElement);
    expect((form.state.fields[0].payload as { value: string }).value).toBe(
      'textarea'
    );
  });

  it('uses radio changes to choose the next dynamic form item', async () => {
    const input: FormItem = {
      type: 'text',
      payload: {
        label: 'Dynamic Input',
        name: 'dynamicValue',
        placeholder: 'Radio chose an input.',
      },
      next: null,
    };
    const textarea: FormItem = {
      type: 'textarea',
      payload: {
        label: 'Dynamic Textarea',
        name: 'dynamicValue',
        placeholder: 'Radio chose a textarea.',
      },
      next: null,
    };
    const selector: FormItem = {
      type: 'radio',
      payload: {
        label: 'Field Type',
        name: 'fieldType',
        value: 'input',
        options: [
          { value: 'input', text: 'Input' },
          { value: 'textarea', text: 'Textarea' },
        ],
      },
      next: null,
    };
    selector.next = (current) =>
      (current.payload as { value: string }).value === 'textarea'
        ? textarea
        : input;

    form = createForm({
      id: 'radio-dynamic-form',
      fields: [selector],
      buttons: false,
    }).build();
    mountForm();

    expect(
      form.element?.querySelector('[data-form-field="dynamicValue"]')
    ).toBeInstanceOf(HTMLInputElement);

    const radio = form.element?.querySelector<HTMLInputElement>(
      'input[name="fieldType"][value="textarea"]'
    );
    if (!radio) throw new Error('Textarea radio was not rendered.');

    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();

    expect(
      form.element?.querySelector('[data-form-field="dynamicValue"]')
    ).toBeInstanceOf(HTMLTextAreaElement);
    expect((form.state.fields[0].payload as { value: string }).value).toBe(
      'textarea'
    );
  });
});

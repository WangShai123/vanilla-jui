// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { createValidator } from '../src/utilities/validator.ts';

let validator: ReturnType<typeof createValidator> | null = null;

function mount(
  html: string,
  { noValidate = true }: { noValidate?: boolean } = {}
): HTMLFormElement {
  document.body.innerHTML = html;
  const form = document.querySelector('form');
  if (!(form instanceof HTMLFormElement)) {
    throw new Error('Missing form fixture.');
  }
  form.noValidate = noValidate;
  return form;
}

function input(form: HTMLFormElement, name: string): HTMLInputElement {
  const element = form.elements.namedItem(name);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input "${name}".`);
  }
  return element;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  validator?.destroy();
  validator = null;
  document.body.innerHTML = '';
});

describe('Validator', () => {
  it('uses data-field-control for error help and preserves static help', () => {
    const form = mount(`
      <form>
        <div data-field-control="email">
          <input name="email" type="text" value="">
          <div class="help-block" data-field-help="email">Static help</div>
        </div>
      </form>
    `);

    validator = createValidator(form, {
      rules: { email: { required: true } },
      messages: { email: { required: 'Email required' } },
    });

    expect(validator.validate()).toBe(false);
    expect(input(form, 'email').dataset.valid).toBe('false');
    expect(
      form
        .querySelector('[data-validator-help="email"]')
        ?.getAttribute('data-valid')
    ).toBe('false');
    expect(
      form
        .querySelector('[data-validator-help="email"]')
        ?.classList.contains('help-block')
    ).toBe(true);
    expect(
      form.querySelector('[data-validator-help="email"]')?.textContent
    ).toBe('Email required');
    expect(form.querySelector('[data-field-help="email"]')?.textContent).toBe(
      'Static help'
    );

    input(form, 'email').value = 'demo@example.com';
    expect(validator.validate()).toBe(true);
    expect(input(form, 'email').classList.contains('is-valid')).toBe(false);
    expect(input(form, 'email').classList.contains('is-invalid')).toBe(false);
    expect(input(form, 'email').hasAttribute('data-valid')).toBe(false);
    expect(form.querySelector('[data-validator-help="email"]')).toBeNull();
    expect(form.querySelector('[data-field-help="email"]')?.textContent).toBe(
      'Static help'
    );
  });

  it('does not add is-valid when validation passes', () => {
    const form = mount(`
      <form>
        <div data-field-control="email">
          <input name="email" type="text" value="demo@example.com">
        </div>
      </form>
    `);

    validator = createValidator(form, {
      rules: { email: { required: true, email: true } },
    });

    expect(validator.validate()).toBe(true);
    expect(input(form, 'email').classList.contains('is-valid')).toBe(false);
    expect(input(form, 'email').classList.contains('is-invalid')).toBe(false);
    expect(input(form, 'email').hasAttribute('data-valid')).toBe(false);
  });

  it('allows validator help className override', () => {
    const form = mount(`
      <form>
        <div data-field-control="email">
          <input name="email" type="text" value="">
        </div>
      </form>
    `);

    validator = createValidator(form, {
      className: { help: 'profile-help' },
      rules: { email: { required: true } },
      messages: { email: { required: 'Email required' } },
    });

    expect(validator.validate()).toBe(false);
    const help = form.querySelector('[data-validator-help="email"]');
    expect(help?.classList.contains('profile-help')).toBe(true);
    expect(help?.classList.contains('help-block')).toBe(false);

    validator.props = {
      ...validator.props!,
      className: { help: 'updated-help' },
    };
    expect(validator.validate()).toBe(false);
    expect(help?.classList.contains('updated-help')).toBe(true);
    expect(help?.classList.contains('profile-help')).toBe(false);
  });

  it('disables native form validation by default', () => {
    const form = mount(
      `
      <form>
        <div data-field-control="email">
          <input name="email" type="text" required value="">
        </div>
      </form>
    `,
      { noValidate: false }
    );

    validator = createValidator(form, {
      rules: { email: { required: true } },
    });

    expect(form.noValidate).toBe(true);
    expect(validator.validate()).toBe(false);

    validator.destroy();
    validator = null;

    expect(form.noValidate).toBe(false);
  });

  it('enables native form validation when vanilla is true', () => {
    const form = mount(
      `
      <form>
        <input name="email" type="text" required value="">
      </form>
    `,
      { noValidate: false }
    );

    validator = createValidator(form, {
      vanilla: true,
      rules: { email: { required: true } },
    });

    expect(form.noValidate).toBe(false);
  });

  it('does not use legacy form-control as an interaction selector', () => {
    const form = mount(`
      <form>
        <div class="form-control">
          <section>
            <input name="email" type="text" value="bad-email">
          </section>
        </div>
      </form>
    `);

    validator = createValidator(form, {
      rules: { email: { email: true } },
      messages: { email: { email: 'Invalid email' } },
    });

    expect(validator.validate()).toBe(false);
    const help = form.querySelector('[data-validator-help="email"]');
    expect(help?.textContent).toBe('Invalid email');
    expect(help?.parentElement?.tagName).toBe('SECTION');

    validator.reset({ native: false });
    expect(form.querySelector('[data-validator-help="email"]')).toBeNull();
  });

  it('applies configured rules when a control also has native validation attributes', () => {
    const form = mount(`
      <form>
        <div data-field-control="message">
          <input name="message" type="text" required value="1">
        </div>
      </form>
    `);

    validator = createValidator(form, {
      rules: { message: { required: true, minLength: 5 } },
      messages: {
        message: {
          required: 'Message required',
          minLength: 'Message must contain at least 5 characters',
        },
      },
    });

    expect(validator.validate()).toBe(false);
    expect(
      form.querySelector('[data-validator-help="message"]')?.textContent
    ).toBe('Message must contain at least 5 characters');

    input(form, 'message').value = '12345';
    expect(validator.validate()).toBe(true);
  });

  it('automatically revalidates an invalid text field after user input', () => {
    const form = mount(`
      <form>
        <div data-field-control="message">
          <input name="message" type="text" value="1">
        </div>
      </form>
    `);
    const message = input(form, 'message');

    validator = createValidator(form, {
      rules: { message: { minLength: 5 } },
      messages: {
        message: {
          minLength: 'Message must contain at least 5 characters',
        },
      },
    });

    expect(validator.validate()).toBe(false);
    expect(validator.runtime.error).toBe(true);
    expect(message.dataset.valid).toBe('false');

    message.value = '12345';
    message.dispatchEvent(new Event('input', { bubbles: true }));

    expect(validator.runtime.error).toBe(false);
    expect(validator.runtime.valid).toBe(true);
    expect(message.classList.contains('is-invalid')).toBe(false);
    expect(message.hasAttribute('data-valid')).toBe(false);
    expect(form.querySelector('[data-validator-help="message"]')).toBeNull();
  });

  it('does not automatically validate fields before an error has been reported', () => {
    const form = mount(`
      <form>
        <div data-field-control="message">
          <input name="message" type="text" value="1">
        </div>
      </form>
    `);
    const message = input(form, 'message');

    validator = createValidator(form, {
      rules: { message: { minLength: 5 } },
      messages: {
        message: {
          minLength: 'Message must contain at least 5 characters',
        },
      },
    });

    message.dispatchEvent(new Event('input', { bubbles: true }));

    expect(validator.runtime.error).toBe(false);
    expect(message.classList.contains('is-invalid')).toBe(false);
    expect(message.hasAttribute('data-valid')).toBe(false);
    expect(form.querySelector('[data-validator-help="message"]')).toBeNull();
  });

  it('stops automatic revalidation after reset clears the error state', () => {
    const form = mount(`
      <form>
        <div data-field-control="message">
          <input name="message" type="text" value="1">
        </div>
      </form>
    `);
    const message = input(form, 'message');

    validator = createValidator(form, {
      rules: { message: { minLength: 5 } },
      messages: {
        message: {
          minLength: 'Message must contain at least 5 characters',
        },
      },
    });

    expect(validator.validate()).toBe(false);
    validator.reset({ native: false });
    message.dispatchEvent(new Event('input', { bubbles: true }));

    expect(validator.runtime.error).toBe(false);
    expect(message.classList.contains('is-invalid')).toBe(false);
    expect(message.hasAttribute('data-valid')).toBe(false);
    expect(form.querySelector('[data-validator-help="message"]')).toBeNull();
  });

  it('validates checkbox group min and max checked counts', () => {
    const form = mount(`
      <form>
        <div data-field-control="features">
          <label><input name="features" type="checkbox" value="audit" checked>Audit</label>
          <label><input name="features" type="checkbox" value="export">Export</label>
          <label><input name="features" type="checkbox" value="report">Report</label>
          <label><input name="features" type="checkbox" value="alert">Alert</label>
        </div>
      </form>
    `);
    const boxes = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="features"]')
    );

    validator = createValidator(form, {
      rules: { features: { min: 2, max: 3 } },
      messages: {
        features: {
          min: 'Select at least 2 features',
          max: 'Select at most 3 features',
        },
      },
    });

    expect(validator.validate()).toBe(false);
    expect(
      form.querySelector('[data-validator-help="features"]')?.textContent
    ).toBe('Select at least 2 features');

    boxes[1]!.checked = true;
    boxes[1]!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(validator.runtime.error).toBe(false);
    expect(form.querySelector('[data-validator-help="features"]')).toBeNull();

    boxes[2]!.checked = true;
    boxes[3]!.checked = true;
    expect(validator.validate()).toBe(false);
    expect(
      form.querySelector('[data-validator-help="features"]')?.textContent
    ).toBe('Select at most 3 features');
  });

  it('does not treat a switch checkbox as a checkbox group for min and max', () => {
    const form = mount(`
      <form>
        <div data-field-control="enabled">
          <label data-field-switch="enabled">
            <input name="enabled" type="checkbox" value="1">
            <span data-field-switch-slider></span>
          </label>
        </div>
      </form>
    `);

    validator = createValidator(form, {
      rules: { enabled: { min: 1, max: 1 } },
    });

    expect(validator.validate()).toBe(true);
  });

  it('binds submit and reset without recursively resetting', () => {
    const form = mount(`
      <form>
        <div data-field-control="email">
          <input name="email" type="text" value="">
          <div class="help-block" data-field-help="email">Static help</div>
        </div>
      </form>
    `);

    validator = createValidator(
      form,
      {
        rules: { email: { required: true } },
        messages: { email: { required: 'Email required' } },
      },
      true
    );

    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    expect(form.querySelector('[data-validator-help="email"]')).toBeTruthy();

    form.dispatchEvent(new Event('reset', { bubbles: true }));
    expect(form.querySelector('[data-validator-help="email"]')).toBeNull();
    expect(form.querySelector('[data-field-help="email"]')).toBeTruthy();
  });

  it('uses custom validator string as the error message', () => {
    const onSubmit =
      vi.fn<(validator: ReturnType<typeof createValidator>) => void>();
    const form = mount(`
      <form>
        <div data-field-control="username">
          <input name="username" type="text" value="admin-user">
        </div>
      </form>
    `);

    validator = createValidator(form, {
      rules: {
        username: {
          validate: (element) =>
            element.value.includes('admin') ? 'Cannot contain admin' : true,
        },
      },
      onSubmit,
    });

    expect(validator.validate()).toBe(false);
    expect(
      form.querySelector('[data-validator-help="username"]')?.textContent
    ).toBe('Cannot contain admin');

    input(form, 'username').value = 'editor';
    expect(validator.validate()).toBe(true);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

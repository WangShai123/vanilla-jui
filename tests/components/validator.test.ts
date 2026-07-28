// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { Validator } from '../../src/components/validator.ts';

let validator: Validator | null = null;

function mount(html: string): HTMLFormElement {
  document.body.innerHTML = html;
  const form = document.querySelector('form');
  if (!(form instanceof HTMLFormElement)) {
    throw new Error('Missing form fixture.');
  }
  form.noValidate = true;
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
  it('uses data-form-control for error help and preserves static help', () => {
    const form = mount(`
      <form>
        <div data-form-control="email">
          <input name="email" type="text" value="">
          <div class="help-block" data-form-help="email">Static help</div>
        </div>
      </form>
    `);

    validator = new Validator(form, {
      rules: { email: { required: true } },
      messages: { email: { required: 'Email required' } },
    });

    expect(validator.validate()).toBe(false);
    expect(input(form, 'email').classList.contains('is-invalid')).toBe(true);
    expect(
      form.querySelector('[data-validator-help="email"]')?.textContent
    ).toBe('Email required');
    expect(form.querySelector('[data-form-help="email"]')?.textContent).toBe(
      'Static help'
    );

    input(form, 'email').value = 'demo@example.com';
    expect(validator.validate()).toBe(true);
    expect(form.querySelector('[data-validator-help="email"]')).toBeNull();
    expect(form.querySelector('[data-form-help="email"]')?.textContent).toBe(
      'Static help'
    );
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

    validator = new Validator(form, {
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

  it('binds submit and reset without recursively resetting', () => {
    const form = mount(`
      <form>
        <div data-form-control="email">
          <input name="email" type="text" value="">
          <div class="help-block" data-form-help="email">Static help</div>
        </div>
      </form>
    `);

    validator = new Validator(
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
    expect(form.querySelector('[data-form-help="email"]')).toBeTruthy();
  });

  it('uses custom validator string as the error message', () => {
    const onSubmit = vi.fn<(validator: Validator) => void>();
    const form = mount(`
      <form>
        <div data-form-control="username">
          <input name="username" type="text" value="admin-user">
        </div>
      </form>
    `);

    validator = new Validator(form, {
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

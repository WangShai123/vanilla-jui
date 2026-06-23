import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Validator, Toast } from '../dist/index.js?v=1';
import { equal, hasClass, truthy, textOf, dateTime } from './helpers.js';

// ========== 手动测试 UI ==========

let demoForm = null;
let demoValidator = null;

const ui = createDeepStore({ created: false });

const VALIDATOR_RULES = {
  onSubmit: null,
  rules: {
    email: { required: true, email: true },
    password: { required: true, minLength: 6, maxLength: 12 },
    confirmPassword: { equalTo: 'password' },
    username: {
      required: true,
      noSpace: true,
      noChinese: true,
      noSpecial: true,
    },
    code: { pattern: '^[A-Z]{3}\\d{2}$' },
    bio: { minLength: 5, maxLength: 60 },
    plan: { selected: true },
    agree: { checked: true },
  },
  messages: {
    email: { required: 'Email required', email: 'Invalid email' },
    password: {
      required: 'Password required',
      minLength: 'Password too short',
      maxLength: 'Password too long',
    },
    confirmPassword: { equalTo: 'Passwords do not match' },
    username: {
      required: 'Username required',
      noSpace: 'Username cannot contain spaces',
      noChinese: 'Username cannot contain Chinese characters',
      noSpecial: 'Username cannot contain special characters',
    },
    code: { pattern: 'Invite code must be ABC12 style' },
    bio: { minLength: 'Bio too short', maxLength: 'Bio too long' },
    plan: { selected: 'Plan required' },
    agree: { checked: 'Terms must be accepted' },
  },
};

function createFormHTML() {
  return `
    <form id="validator-demo-form" class="j-form is-vertical is-item-vertical" novalidate>
      <div class="form-item">
        <label class="item-label" for="v-email">Email</label>
        <div class="form-control">
          <input class="j-input" id="v-email" name="email" type="text" value="" autocomplete="on" />
        </div>
      </div>
      <div class="form-item">
        <label class="item-label" for="v-password">Password</label>
        <div class="form-control">
          <input class="j-input" id="v-password" name="password" type="password" value="" autocomplete="on" />
        </div>
      </div>
      <div class="form-item">
        <label class="item-label" for="v-confirmPassword">Confirm Password</label>
        <div class="form-control">
          <input class="j-input" id="v-confirmPassword" name="confirmPassword" type="password" value="" autocomplete="on" />
        </div>
      </div>
      <div class="form-item">
        <label class="item-label" for="v-username">Username</label>
        <div class="form-control">
          <input class="j-input" id="v-username" name="username" type="text" value="" autocomplete="on" />
        </div>
      </div>
      <div class="form-item">
        <label class="item-label" for="v-code">Invite Code</label>
        <div class="form-control">
          <input class="j-input" id="v-code" name="code" type="text" value="" autocomplete="off" />
        </div>
      </div>
      <div class="form-item">
        <label class="item-label" for="v-bio">Bio</label>
        <div class="form-control">
          <textarea class="j-input" id="v-bio" name="bio"></textarea>
        </div>
      </div>
      <div class="form-item">
        <label class="item-label" for="v-plan">Plan</label>
        <div class="form-control">
          <select class="j-select" id="v-plan" name="plan">
            <option value="">请选择套餐</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
          </select>
        </div>
      </div>
      <div class="form-item">
        <div class="form-control">
          <div class="j-checkbox">
          <label>
            <input id="v-agree" name="agree" type="checkbox" />
            <span>Agree terms</span>
          </label>
          </div>
        </div>
      </div>
      <div class="form-item">
        <div class="demo-buttons" style="margin-top: 10px">
          <button type="submit" class="j-button is-primary">提交</button>
          <button type="reset" class="j-button is-outline">重置</button>
        </div>
      </div>
    </form>
  `;
}

function mountForm() {
  const container = document.getElementById('manual-demo');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => ui.created,
        children: () =>
          jsx('div', {
            ref: (el) => {
              if (el && demoForm && !el.contains(demoForm)) {
                el.appendChild(demoForm);
              }
            },
          }),
      }),
    container
  );
}

function mountButtons() {
  const container = document.getElementById('manual-buttons');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => !ui.created,
        children: () =>
          jsx('button', {
            id: 'btn-vd-create',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: '创建表单',
          }),
        fallback: () =>
          jsx('div', {
            className: 'demo-buttons',
            children: [
              jsx('button', {
                id: 'btn-vd-destroy',
                type: 'button',
                className: 'j-button is-error is-sm',
                children: '销毁实例',
              }),
            ],
          }),
      }),
    container
  );
}

function bindEvents(runner) {
  const container = document.getElementById('manual-buttons');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const id = e.target.id;

    if (id === 'btn-vd-create') {
      if (demoValidator) {
        runner.log(`${dateTime()} 实例已存在`);
        return;
      }

      demoForm = document.createElement('div');
      demoForm.innerHTML = createFormHTML();
      demoForm = demoForm.firstElementChild;

      demoValidator = new Validator(
        demoForm,
        {
          ...VALIDATOR_RULES,
          onSubmit: () => {
            const data = {};
            const formData = new FormData(demoForm);
            for (const [key, value] of formData.entries()) {
              data[key] = value;
            }
            Toast.lite('提交成功，请在下方运行日志查看提交的数据');
            runner.log(`${dateTime()} 校验通过, 数据: ${JSON.stringify(data)}`);
          },
        },
        true
      );

      flushSync(() => {
        ui.created = true;
      });
      mountButtons(runner);
      mountForm(runner);
      runner.log(`${dateTime()} 表单已创建并绑定 Validator`);
    }

    if (id === 'btn-vd-destroy' && demoValidator) {
      demoValidator.destroy();
      demoValidator = null;
      demoForm = null;
      flushSync(() => {
        ui.created = false;
      });
      mountButtons(runner);
      mountForm(runner);
      runner.log(`${dateTime()} Validator 已销毁`);
    }
  });
}

// ========== 自动化测试 ==========

function validateInvalidCase(runner, name, formValues, fieldName, message) {
  const form = document.createElement('form');
  form.noValidate = true;
  const data = {
    email: 'a@test.com',
    password: '123456',
    confirmPassword: '123456',
    username: 'user_01',
    code: 'ABC12',
    bio: 'Hello validator',
    plan: 'pro',
    agree: true,
    ...formValues,
  };
  const fields = [
    { tag: 'input', name: 'email', type: 'email', value: data.email },
    { tag: 'input', name: 'password', type: 'password', value: data.password },
    {
      tag: 'input',
      name: 'confirmPassword',
      type: 'password',
      value: data.confirmPassword,
    },
    { tag: 'input', name: 'username', type: 'text', value: data.username },
    { tag: 'input', name: 'code', type: 'text', value: data.code },
    { tag: 'textarea', name: 'bio', value: data.bio },
    {
      tag: 'select',
      name: 'plan',
      options: [
        { v: '', t: '请选择' },
        { v: 'basic', t: 'Basic' },
        { v: 'pro', t: 'Pro', selected: data.plan === 'pro' },
      ],
    },
    { tag: 'input', name: 'agree', type: 'checkbox', checked: data.agree },
  ];
  for (const f of fields) {
    const wrap = document.createElement('div');
    wrap.className = 'form-control';
    let el;
    if (f.tag === 'select') {
      el = document.createElement('select');
      el.name = f.name;
      for (const o of f.options) {
        const opt = document.createElement('option');
        opt.value = o.v;
        opt.textContent = o.t;
        if (o.selected) opt.selected = true;
        el.appendChild(opt);
      }
    } else if (f.tag === 'textarea') {
      el = document.createElement('textarea');
      el.name = f.name;
      el.textContent = f.value;
    } else {
      el = document.createElement('input');
      el.name = f.name;
      el.type = f.type;
      el.value = f.value ?? '';
      if (f.checked) el.checked = true;
    }
    wrap.appendChild(el);
    form.appendChild(wrap);
  }
  document.body.appendChild(form);

  const validator = new Validator(form, VALIDATOR_RULES);
  equal(validator.validate(), false, `${name} validate false`);
  if (fieldName) {
    truthy(
      hasClass(form.elements[fieldName], 'is-invalid'),
      `${fieldName} invalid`
    );
    const help = form.elements[fieldName]
      .closest('.form-control')
      ?.querySelector('.help-block');
    equal(textOf(help), message, `${name} help text`);
  }
  validator.destroy();
  form.remove();
}

export function validatorApp(runner) {
  runner.add('必填和邮箱', '验证 required 与 email', () => {
    validateInvalidCase(
      runner,
      'required',
      { email: '' },
      'email',
      'Email required'
    );
    validateInvalidCase(
      runner,
      'email',
      { email: 'bad-email' },
      'email',
      'Invalid email'
    );
  });

  runner.add('长度和相等', '验证 minLength、maxLength、equalTo', () => {
    validateInvalidCase(
      runner,
      'minLength',
      { password: '123' },
      'password',
      'Password too short'
    );
    validateInvalidCase(
      runner,
      'maxLength',
      { password: '1234567890123' },
      'password',
      'Password too long'
    );
    validateInvalidCase(
      runner,
      'equalTo',
      { confirmPassword: '654321' },
      'confirmPassword',
      'Passwords do not match'
    );
  });

  runner.add('字符规则', '验证 noSpace、noChinese、noSpecial、pattern', () => {
    validateInvalidCase(
      runner,
      'noSpace',
      { username: 'user 01' },
      'username',
      'Username cannot contain spaces'
    );
    validateInvalidCase(
      runner,
      'noChinese',
      { username: '用户01' },
      'username',
      'Username cannot contain Chinese characters'
    );
    validateInvalidCase(
      runner,
      'noSpecial',
      { username: 'user@01' },
      'username',
      'Username cannot contain special characters'
    );
    validateInvalidCase(
      runner,
      'pattern',
      { code: 'ab123' },
      'code',
      'Invite code must be ABC12 style'
    );
  });

  runner.add('选择和勾选', '验证 selected 与 checked', () => {
    validateInvalidCase(
      runner,
      'selected',
      { plan: '' },
      'plan',
      'Plan required'
    );
    const form = document.createElement('form');
    form.noValidate = true;
    const wrap = document.createElement('div');
    wrap.className = 'form-control';
    const el = document.createElement('input');
    el.name = 'agree';
    el.type = 'checkbox';
    wrap.appendChild(el);
    form.appendChild(wrap);
    document.body.appendChild(form);
    const validator = new Validator(form, {
      rules: { agree: { checked: true } },
      messages: { agree: { checked: 'Terms must be accepted' } },
    });
    equal(validator.validate(), false, 'checked validate false');
    equal(
      textOf(form.querySelector('.help-block')),
      'Terms must be accepted',
      'checked help text'
    );
    validator.destroy();
    form.remove();
  });

  runner.add('校验成功', '验证成功类和 onSubmit', () => {
    const form = document.createElement('form');
    form.noValidate = true;
    const fields = [
      { tag: 'input', name: 'email', type: 'email', value: 'a@test.com' },
      {
        tag: 'select',
        name: 'plan',
        options: [{ v: 'pro', t: 'Pro', selected: true }],
      },
      { tag: 'input', name: 'agree', type: 'checkbox', checked: true },
    ];
    for (const f of fields) {
      const wrap = document.createElement('div');
      wrap.className = 'form-control';
      let el;
      if (f.tag === 'select') {
        el = document.createElement('select');
        el.name = f.name;
        const opt = document.createElement('option');
        opt.value = f.options[0].v;
        opt.textContent = f.options[0].t;
        if (f.options[0].selected) opt.selected = true;
        el.appendChild(opt);
      } else {
        el = document.createElement('input');
        el.name = f.name;
        el.type = f.type;
        el.value = f.value ?? '';
        if (f.checked) el.checked = true;
      }
      wrap.appendChild(el);
      form.appendChild(wrap);
    }
    document.body.appendChild(form);

    let submitted = false;
    const validator = new Validator(form, {
      rules: {
        email: { required: true, email: true },
        plan: { selected: true },
        agree: { checked: true },
      },
      onSubmit: () => {
        submitted = true;
      },
    });

    equal(validator.validate(), true, 'validate true');
    truthy(hasClass(form.elements.email, 'is-valid'), 'email valid');
    equal(submitted, true, 'onSubmit called');

    validator.destroy();
    form.remove();
  });

  runner.add('绑定 submit/reset', '验证自动事件绑定', () => {
    const form = document.createElement('form');
    form.noValidate = true;
    const wrap = document.createElement('div');
    wrap.className = 'form-control';
    const el = document.createElement('input');
    el.name = 'email';
    el.type = 'text';
    el.value = '';
    wrap.appendChild(el);
    form.appendChild(wrap);
    document.body.appendChild(form);
    const validator = new Validator(form, VALIDATOR_RULES, true);

    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    truthy(form.querySelector('.help-block'), 'submit validates');
    form.dispatchEvent(new Event('reset', { bubbles: true }));
    equal(form.querySelector('.help-block'), null, 'reset clears help');

    validator.destroy();
    form.remove();
  });

  runner.add('销毁清理', '验证状态清理', () => {
    const form = document.createElement('form');
    const wrap = document.createElement('div');
    wrap.className = 'form-control';
    const el = document.createElement('input');
    el.name = 'email';
    el.type = 'text';
    wrap.appendChild(el);
    form.appendChild(wrap);
    document.body.appendChild(form);
    const validator = new Validator(form, VALIDATOR_RULES);

    validator.destroy();
    equal(validator.root, null, 'root cleared');
    equal(validator.options, null, 'options cleared');
    form.remove();
  });

  runner.add('JSX 表单入口', '验证 jsx 返回节点可作为 element', () => {
    const form = jsx('form', {
      children: jsx('div', {
        className: 'form-control',
        children: jsx('input', {
          className: 'j-input',
          name: 'email',
          type: 'text',
        }),
      }),
    });
    document.body.appendChild(form);

    const validator = new Validator(form, VALIDATOR_RULES);

    truthy(validator.root === form, 'jsx form resolved');
    validator.destroy();
    form.remove();
  });

  runner.log('Validator 组件测试已加载。');
}

export function validatorSetup(runner) {
  mountButtons(runner);
  mountForm(runner);
  bindEvents(runner);
}

export function validatorReset() {
  demoValidator?.destroy();
  demoValidator = null;
  demoForm = null;
  flushSync(() => {
    ui.created = false;
  });
  mountButtons();
  mountForm();
}

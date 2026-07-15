import { Form, Toast } from '../dist/index.js?v=form-build-api';
import { equal, truthy, hasClass, dateTime } from './helpers.js';

let formInstance = null;
let submittedData = null;

const FORM_FIELDS = [
  {
    label: 'Email address',
    name: 'email',
    type: 'email',
    placeholder: 'Enter email',
    required: true,
  },
  {
    label: 'Password',
    name: 'password',
    type: 'password',
    placeholder: 'Password',
    required: true,
  },
  {
    label: 'Password Confirm',
    name: 'password_repeat',
    type: 'password',
    placeholder: 'Password',
    required: true,
  },
  {
    label: 'Country',
    name: 'country',
    type: 'select',
    options: [
      { value: '', text: 'Please select' },
      { value: '1', text: 'China' },
      { value: '2', text: 'United States' },
      { value: '3', text: 'United Kingdom' },
    ],
  },
  {
    label: 'Plan',
    name: 'plan',
    type: 'radio',
    value: 'pro',
    options: [
      { value: 'basic', text: 'Basic' },
      { value: 'pro', text: 'Pro' },
    ],
  },
  {
    label: false,
    name: 'agreement',
    type: 'checkbox',
    options: [{ value: 'yes', text: 'Agree to terms...' }],
  },
];

const FORM_VALIDATOR = {
  rules: {
    email: { required: true, email: true },
    password: { required: true, minLength: 6 },
    password_repeat: { equalTo: 'password' },
    country: { selected: true },
    agreement: { checked: true },
  },
  messages: {
    email: { required: 'Email required', email: 'Invalid email' },
    password: {
      required: 'Password required',
      minLength: 'Password too short',
    },
    password_repeat: { equalTo: 'Passwords do not match' },
    country: { selected: 'Country required' },
    agreement: { checked: 'Terms must be accepted' },
  },
};

function mountDemoShell() {
  const demo = document.getElementById('manual-demo');
  if (!demo) return null;
  demo.textContent = '';
  const holder = document.createElement('div');
  holder.style.width = 'min(100%, 320px)';
  demo.appendChild(holder);
  return holder;
}

function createDemoForm(runner) {
  const holder = mountDemoShell();
  if (!holder) return null;

  submittedData = null;
  formInstance = new Form(
    {
      style: 'width: 100%',
      fields: FORM_FIELDS,
      validator: FORM_VALIDATOR,
      onSubmit: (data) => {
        submittedData = data;
        Toast.lite('Form submitted');
        runner.log(`${dateTime()} 提交数据: ${JSON.stringify(data)}`);
      },
    },
    holder
  ).build();
  return formInstance;
}

function cleanup() {
  formInstance?.destroy();
  formInstance = null;
  submittedData = null;
  const demo = document.getElementById('manual-demo');
  if (demo) demo.textContent = '';
}

function bindManualEvents(runner) {
  const container = document.getElementById('manual-buttons');
  if (!container) return;

  container.innerHTML = `
    <button id="btn-form-create" type="button" class="j-button is-primary is-sm">创建表单</button>
    <button id="btn-form-fill" type="button" class="j-button is-outline is-sm">填充数据</button>
    <button id="btn-form-horizontal" type="button" class="j-button is-outline is-sm">切换横向</button>
    <button id="btn-form-destroy" type="button" class="j-button is-error is-sm">销毁实例</button>
  `;

  container.addEventListener('click', (event) => {
    const id = event.target.id;

    if (id === 'btn-form-create') {
      cleanup();
      createDemoForm(runner);
      runner.log(`${dateTime()} Form 实例已创建`);
    }

    if (id === 'btn-form-fill' && formInstance?.root) {
      formInstance.root.elements.email.value = 'demo@example.com';
      formInstance.root.elements.password.value = 'secret1';
      formInstance.root.elements.password_repeat.value = 'secret1';
      formInstance.root.elements.country.value = '2';
      formInstance.root.elements.agreement.checked = true;
      runner.log(`${dateTime()} 已填充可提交数据`);
    }

    if (id === 'btn-form-horizontal' && formInstance) {
      formInstance.update({ vertical: false, itemVertical: false });
      runner.log(`${dateTime()} 已切换为横向布局`);
    }

    if (id === 'btn-form-destroy') {
      cleanup();
      runner.log(`${dateTime()} Form 实例已销毁`);
    }
  });
}

export function formApp(runner) {
  runner.add('创建 Form 实例', '渲染 j-form 根节点、字段和默认按钮', () => {
    cleanup();
    const holder = mountDemoShell();
    const form = new Form({ fields: FORM_FIELDS }, holder).build();

    truthy(form.root, 'form root should exist');
    truthy(hasClass(form.root, 'j-form'), 'root should have j-form class');
    truthy(hasClass(form.root, 'is-vertical'), 'root should be vertical');
    equal(form.root.querySelectorAll('.form-item').length, FORM_FIELDS.length);
    equal(form.root.querySelectorAll('.form-buttons button').length, 2);
    cleanup();
  });

  runner.add('提交表单数据', '内置 Validator 通过后收集 FormData', async () => {
    cleanup();
    const form = createDemoForm(runner);

    form.root.elements.email.value = 'demo@example.com';
    form.root.elements.password.value = 'secret1';
    form.root.elements.password_repeat.value = 'secret1';
    form.root.elements.country.value = '2';
    form.root.elements.agreement.checked = true;

    form.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    truthy(submittedData, 'submitted data should exist');
    equal(submittedData.email, 'demo@example.com');
    equal(submittedData.country, '2');
    equal(submittedData.agreement, 'yes');
    cleanup();
  });

  runner.add('动态更新字段', 'update(fields) 后重新渲染字段集合', () => {
    cleanup();
    const holder = mountDemoShell();
    const form = new Form(
      {
        fields: [{ label: 'Name', name: 'name' }],
        buttons: false,
      },
      holder
    ).build();

    form.update({
      fields: [
        { label: 'Name', name: 'name' },
        { label: 'Bio', name: 'bio', type: 'textarea' },
      ],
    });

    equal(form.root.querySelectorAll('.form-item').length, 2);
    truthy(form.root.querySelector('textarea[name="bio"]'));
    cleanup();
  });

  runner.add(
    '延迟构建与手动挂载',
    'constructor 不创建 DOM，build(false) 后手动挂载 root',
    () => {
      cleanup();
      const holder = mountDemoShell();
      const form = new Form({
        fields: [{ label: 'Name', name: 'name' }],
        buttons: false,
      });

      equal(form.root, null, 'constructor should not create root');
      form.build(false);
      truthy(form.root, 'build(false) should create root');
      equal(holder.contains(form.root), false, 'root should not be mounted');

      holder.appendChild(form.root);
      truthy(holder.contains(form.root), 'root can be mounted manually');
      form.destroy();
      cleanup();
    }
  );
}

export function formSetup(runner) {
  bindManualEvents(runner);
  createDemoForm(runner);
}

export function formReset() {
  cleanup();
}

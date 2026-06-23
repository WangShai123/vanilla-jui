import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Flow, Toast } from '../dist/index.js?v=1';
import { equal, truthy, dateTime } from './helpers.js';

// ========== 手动测试 UI ==========

let defaultFlow = null;
let customFlow = null;

const defaultUI = createDeepStore({ created: false });
const customUI = createDeepStore({ created: false });

// ---------- 默认 UI ----------

function mountDefaultButtons() {
  const container = document.getElementById('manual-buttons');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => !defaultUI.created,
        children: () =>
          jsx('button', {
            id: 'btn-flow-create',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: '创建默认UI实例',
          }),
        fallback: () =>
          jsx('div', {
            className: 'demo-buttons',
            children: [
              jsx('button', {
                id: 'btn-flow-next',
                type: 'button',
                className: 'j-button is-primary is-sm',
                children: 'Next',
              }),
              jsx('button', {
                id: 'btn-flow-back',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: 'Back',
              }),
              jsx('button', {
                id: 'btn-flow-reset',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: 'Reset',
              }),
              jsx('button', {
                id: 'btn-flow-destroy',
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

function mountDefaultDemo() {
  const container = document.getElementById('manual-demo');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => defaultUI.created,
        children: () =>
          jsx('div', {
            ref: (el) => {
              if (el && defaultFlow && !el.contains(defaultFlow.root)) {
                el.appendChild(defaultFlow.root);
              }
            },
          }),
      }),
    container
  );
}

function bindDefaultEvents(runner) {
  const container = document.getElementById('manual-buttons');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const id = e.target.id;

    if (id === 'btn-flow-create') {
      if (defaultFlow) {
        runner.log(`${dateTime()} 实例已存在`);
        return;
      }

      flushSync(() => {
        defaultUI.created = true;
      });
      mountDefaultButtons(runner);
      mountDefaultDemo();

      setTimeout(() => {
        defaultFlow = new Flow({
          showReset: true,
          steps: [
            {
              id: 'account',
              title: 'Account',
              content: 'Account step',
              modal: {
                fields: [{ name: 'email', label: 'Email', type: 'email' }],
              },
            },
            {
              id: 'profile',
              title: 'Profile',
              content: ({ data }) => `Email: ${data.email || ''}`,
            },
            {
              id: 'confirm',
              title: 'Confirm',
              content: ({ data }) => `Confirm ${data.email || ''}`,
            },
          ],
          onShown: () => {
            runner.log(`${dateTime()} Flow 已显示`);
          },
        });

        defaultFlow.mount('#manual-demo');
        runner.log(`${dateTime()} 已创建默认 Flow 实例`);
      });
    }

    if (id === 'btn-flow-next' && defaultFlow) {
      void defaultFlow.next({ step: 'next' });
      runner.log(`${dateTime()} Next → ${defaultFlow.state.currentId}`);
    }

    if (id === 'btn-flow-back' && defaultFlow) {
      void defaultFlow.back({ step: 'back' });
      runner.log(`${dateTime()} Back → ${defaultFlow.state.currentId}`);
    }

    if (id === 'btn-flow-reset' && defaultFlow) {
      defaultFlow.reset();
      runner.log(`${dateTime()} Reset → ${defaultFlow.state.currentId}`);
    }

    if (id === 'btn-flow-destroy' && defaultFlow) {
      defaultFlow.destroy();
      defaultFlow = null;
      flushSync(() => {
        defaultUI.created = false;
      });
      runner.log(`${dateTime()} 已销毁默认 Flow 实例`);
      mountDefaultButtons();
      mountDefaultDemo();
    }
  });
}

// ---------- 自定义 UI ----------

function mountCustomButtons() {
  const container = document.getElementById('custom-buttons');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => !customUI.created,
        children: () =>
          jsx('button', {
            id: 'btn-flow-custom-create',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: '创建自定义UI的实例',
          }),
        fallback: () =>
          jsx('div', {
            className: 'demo-buttons',
            children: [
              jsx('button', {
                id: 'btn-flow-custom-next',
                type: 'button',
                className: 'j-button is-primary is-sm',
                children: 'Next',
              }),
              jsx('button', {
                id: 'btn-flow-custom-back',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: 'Back',
              }),
              jsx('button', {
                id: 'btn-flow-custom-destroy',
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

function mountCustomDemo() {
  const container = document.getElementById('custom-demo');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => customUI.created,
        children: () =>
          jsx('div', {
            ref: (el) => {
              if (el && customFlow && !el.contains(customFlow.root)) {
                el.appendChild(customFlow.root);
              }
            },
          }),
      }),
    container
  );
}

let usernameInput = '';
let emailInput = '';

function bindCustomEvents(runner) {
  const container = document.getElementById('custom-buttons');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const id = e.target.id;

    if (id === 'btn-flow-custom-create') {
      if (customFlow) {
        runner.log(`${dateTime()} 实例已存在`);
        return;
      }

      usernameInput = '';
      emailInput = '';

      flushSync(() => {
        customUI.created = true;
      });
      mountCustomButtons();
      mountCustomDemo();

      setTimeout(() => {
        customFlow = new Flow({
          linear: true,
          steps: [
            {
              id: 'welcome',
              title: 'Welcome',
              content: ({ next }) =>
                jsx('div', {
                  style: 'padding: 16px;',
                  children: [
                    jsx('h3', { children: 'Welcome' }),
                    jsx('p', { children: 'This is a 3-step custom flow.' }),
                    jsx('button', {
                      type: 'button',
                      className: 'j-button is-primary is-sm',
                      onClick: () => void next(),
                      children: 'Start',
                    }),
                  ],
                }),
            },
            {
              id: 'username',
              title: 'Username',
              content: ({ next }) => {
                const input = jsx('input', {
                  type: 'text',
                  className: 'j-input',
                  placeholder: 'Enter username',
                  value: usernameInput,
                  onInput: (e) => {
                    usernameInput = e.target.value;
                  },
                });
                return jsx('div', {
                  style: 'padding: 16px;',
                  children: [
                    jsx('h3', { children: 'Username' }),
                    input,
                    jsx('button', {
                      type: 'button',
                      className: 'j-button is-primary is-sm',
                      style: 'margin-top: 8px;',
                      onClick: () => {
                        if (!usernameInput.trim()) {
                          runner.log(`${dateTime()} 用户名不能为空`);
                          return;
                        }
                        runner.log(`${dateTime()} username: ${usernameInput}`);
                        void next({ username: usernameInput });
                      },
                      children: 'Next',
                    }),
                  ],
                });
              },
              canLeave: ({ data }) => {
                if (!data?.username?.trim()) {
                  runner.log(`${dateTime()} 无法离开: 用户名未填写`);
                  return false;
                }
                return true;
              },
            },
            {
              id: 'email',
              title: 'Email',
              content: ({ next, data }) => {
                const input = jsx('input', {
                  type: 'email',
                  className: 'j-input',
                  placeholder: 'Enter email',
                  value: emailInput,
                  onInput: (e) => {
                    emailInput = e.target.value;
                  },
                });
                return jsx('div', {
                  style: 'padding: 16px;',
                  children: [
                    jsx('h3', { children: 'Email' }),
                    jsx('p', { children: `Username: ${data?.username || ''}` }),
                    input,
                    jsx('button', {
                      type: 'button',
                      className: 'j-button is-primary is-sm',
                      style: 'margin-top: 8px;',
                      onClick: () => {
                        if (!emailInput.trim()) {
                          runner.log(`${dateTime()} 邮箱不能为空`);
                          return;
                        }
                        Toast.lite(
                          `${dateTime()} 提交成功，请在下方日志中查看数据`
                        );
                        runner.log(
                          `${dateTime()} submit: ${JSON.stringify({
                            username: data?.username,
                            email: emailInput,
                          })}`
                        );
                        void next({ email: emailInput });
                      },
                      children: 'Submit',
                    }),
                  ],
                });
              },
            },
          ],
          showReset: false,
          onShown: () => {
            runner.log(`${dateTime()} 自定义 Flow 已显示`);
          },
          showHeader: false,
          showSteps: false,
          showFooter: false,
        });

        customFlow.mount('#custom-demo');
        runner.log(`${dateTime()} 已创建自定义 Flow 实例`);
      });
    }

    if (id === 'btn-flow-custom-next' && customFlow) {
      void customFlow.next({ manual: 'next' });
      runner.log(`${dateTime()} Next → ${customFlow.state.currentId}`);
    }

    if (id === 'btn-flow-custom-back' && customFlow) {
      void customFlow.back({ manual: 'back' });
      runner.log(`${dateTime()} Back → ${customFlow.state.currentId}`);
    }

    if (id === 'btn-flow-custom-destroy' && customFlow) {
      customFlow.destroy();
      customFlow = null;
      usernameInput = '';
      emailInput = '';
      flushSync(() => {
        customUI.created = false;
      });
      runner.log(`${dateTime()} 已销毁自定义 Flow 实例`);
      mountCustomButtons();
      mountCustomDemo();
    }
  });
}

// ========== 自动化测试 ==========

export function flowApp(runner) {
  runner.add('默认 UI 挂载', '验证默认 Flow DOM 与 a11y 属性', () => {
    const flow = new Flow({
      steps: [
        { id: 'a', title: 'Step A', content: 'A' },
        { id: 'b', title: 'Step B', content: 'B' },
      ],
    });
    flow.mount(document.body);

    truthy(document.querySelector('.j-flow'), 'Flow root should exist');
    equal(document.querySelector('.flow-title').textContent, 'Step A', 'title');
    equal(document.querySelectorAll('.flow-step').length, 2, 'step count');

    flow.destroy();
  });

  runner.add('JSX 容器挂载', '验证 mount 支持 jsx 返回节点', () => {
    const container = jsx('div');
    document.body.appendChild(container);
    const flow = new Flow({
      steps: [
        { id: 'a', title: 'Step A', content: 'A' },
        { id: 'b', title: 'Step B', content: 'B' },
      ],
    });

    flow.mount(container);
    truthy(container.querySelector('.j-flow'), 'flow mounted in jsx node');

    flow.destroy();
    container.remove();
  });

  runner.add(
    'next 前进并缓存数据',
    '验证 next 后当前步骤和全局缓存',
    async () => {
      const flow = new Flow({
        render: false,
        steps: [
          { id: 'one', title: 'One' },
          { id: 'two', title: 'Two' },
        ],
      });

      await flow.next({ email: 'test@test.com' });
      equal(flow.state.currentId, 'two', 'current step');
      equal(flow.state.data.email, 'test@test.com', 'global cache');

      flow.destroy();
    }
  );

  runner.add('back 返回', '验证 back 返回上一步', async () => {
    const flow = new Flow({
      render: false,
      steps: [
        { id: 'one', title: 'One' },
        { id: 'two', title: 'Two' },
      ],
    });

    await flow.next();
    await flow.back({ name: 'Alice' });
    equal(flow.state.currentId, 'one', 'current step');
    equal(flow.getStepData('two').name, 'Alice', 'step cache');

    flow.destroy();
  });

  runner.add('goTo 跳转', '验证指定步骤跳转', async () => {
    const flow = new Flow({
      render: false,
      steps: [
        { id: 'one', title: 'One' },
        { id: 'two', title: 'Two' },
        { id: 'three', title: 'Three' },
      ],
    });

    await flow.goTo('three');
    equal(flow.state.currentId, 'three', 'current step');

    flow.destroy();
  });

  runner.add('reset 重置', '验证 reset 后回到初始步骤', async () => {
    const flow = new Flow({
      render: false,
      steps: [
        { id: 'one', title: 'One' },
        { id: 'two', title: 'Two' },
      ],
    });

    await flow.next();
    flow.reset();
    equal(flow.state.currentId, 'one', 'current step');
    equal(flow.state.history.length, 1, 'history length');

    flow.destroy();
  });

  runner.add(
    'onEnter 失败时回滚',
    '验证 transition 失败后的回滚状态',
    async () => {
      const flow = new Flow({
        render: false,
        steps: [
          { id: 'start', title: 'Start' },
          {
            id: 'broken',
            title: 'Broken',
            onEnter: () => {
              throw new Error('broken enter');
            },
          },
        ],
      });

      try {
        await flow.next();
      } catch (error) {
        equal(error.message, 'broken enter', 'error message');
      }

      equal(flow.state.currentId, 'start', 'rolled back step');
      truthy(flow.state.error, 'error should be stored');

      flow.destroy();
    }
  );

  runner.log('Flow 组件测试已加载。');
}

export function flowSetup(runner) {
  mountDefaultButtons(runner);
  mountDefaultDemo();
  bindDefaultEvents(runner);

  const testWrap = document.querySelector('.test-wrap');
  if (testWrap) {
    const secondBox = document.createElement('div');
    secondBox.className = 'test-box';
    secondBox.innerHTML = `
      <div id="custom-buttons" class="demo-buttons"></div>
      <div id="custom-demo" class="fixture-box"></div>
    `;
    testWrap.appendChild(secondBox);
  }

  mountCustomButtons(runner);
  mountCustomDemo();
  bindCustomEvents(runner);
}

export function flowReset() {
  if (defaultFlow) {
    defaultFlow.destroy();
    defaultFlow = null;
  }
  if (customFlow) {
    customFlow.destroy();
    customFlow = null;
  }
  usernameInput = '';
  emailInput = '';
  flushSync(() => {
    defaultUI.created = false;
    customUI.created = false;
  });
  mountDefaultButtons();
  mountDefaultDemo();
  mountCustomButtons();
  mountCustomDemo();
}

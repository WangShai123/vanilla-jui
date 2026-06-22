import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Modal, Toast, Flow, icon, timer } from '../dist/index.js?v=1';
import { equal, truthy, dateTime, wait } from './helpers.js';

// ========== 手动测试 UI ==========

let regularModal = null;
let formModal = null;
let flowModal = null;

const ui = createDeepStore({ regular: false, form: false, flow: false });

function syncState() {
  flushSync(() => {
    ui.regular = !!regularModal;
    ui.form = !!formModal;
    ui.flow = !!flowModal;
  });
}

function mountBox(containerId) {
  const wrap = document.querySelector('.test-wrap');
  if (!wrap) return;

  const box = document.createElement('div');
  box.className = 'test-box';

  const buttonsDiv = document.createElement('div');
  buttonsDiv.id = `${containerId}-buttons`;
  buttonsDiv.className = 'demo-buttons';

  const demoDiv = document.createElement('div');
  demoDiv.id = `${containerId}-demo`;
  demoDiv.className = 'fixture-box';

  box.appendChild(buttonsDiv);
  box.appendChild(demoDiv);
  wrap.appendChild(box);
}

function mountButtons(containerId, created, createLabel) {
  const container = document.getElementById(`${containerId}-buttons`);
  if (!container) return;

  render(
    () =>
      Show({
        when: () => !created(),
        children: () =>
          jsx('button', {
            id: `btn-md-${containerId}-create`,
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: createLabel,
          }),
        fallback: () =>
          jsx('div', {
            className: 'demo-buttons',
            children: [
              jsx('button', {
                id: `btn-md-${containerId}-open`,
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: '打开',
              }),
              jsx('button', {
                id: `btn-md-${containerId}-destroy`,
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

function mountDemo(containerId, created, text) {
  const container = document.getElementById(`${containerId}-demo`);
  if (!container) return;

  render(
    () =>
      Show({
        when: () => created(),
        children: () =>
          jsx('div', {
            style: 'color:var(--muted);font-size:12px',
            children: text,
          }),
      }),
    container
  );
}

// ========== 事件绑定 ==========

function bindEvents(runner) {
  const container = document.querySelector('.test-wrap');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const id = e.target.id;

    // 常规 Modal
    if (id === 'btn-md-regular-create') {
      if (regularModal) {
        runner.log(`${dateTime()} 常规实例已存在`);
        return;
      }
      regularModal = new Modal({
        text: { title: '常规弹窗', confirm: '确定', cancel: '取消' },
        content: '<p>这是一条常规 Modal 消息。</p>',
      });
      runner.log(`${dateTime()} 常规 Modal 已创建`);
      syncState();
      mountButtons('regular', () => ui.regular, '创建常规 Modal 实例');
      mountDemo(
        'regular',
        () => ui.regular,
        'Modal 已创建，请点击"打开"查看效果'
      );
    }

    if (id === 'btn-md-regular-open' && regularModal) {
      regularModal.show();
    }

    if (id === 'btn-md-regular-destroy' && regularModal) {
      regularModal.destroy();
      regularModal = null;
      runner.log(`${dateTime()} 常规 Modal 已销毁`);
      syncState();
      mountButtons('regular', () => ui.regular, '创建常规 Modal 实例');
      mountDemo('regular', () => ui.regular, '');
    }

    // 表单 Modal
    if (id === 'btn-md-form-create') {
      if (formModal) {
        runner.log(`${dateTime()} 表单实例已存在`);
        return;
      }
      formModal = new Modal({
        text: { title: '用户注册', confirm: '提交', cancel: '取消' },
        fields: [
          {
            label: '用户名',
            name: 'username',
            type: 'text',
            placeholder: '请输入用户名',
            required: true,
          },
          {
            label: '密码',
            name: 'password',
            type: 'password',
            placeholder: '请输入密码',
            required: true,
          },
          {
            label: '确认密码',
            name: 'confirmPassword',
            type: 'password',
            placeholder: '请再次输入密码',
            required: true,
          },
        ],
        onSubmit: async (data) => {
          formModal.setState({ loading: true });
          await wait(1000);
          formModal.setState({ loading: false });
          formModal.hide();
          Toast.lite('表单提交成功，请在下方运行日志查看数据', 2400);
          runner.log(`${dateTime()} 提交数据: ${JSON.stringify(data)}`);
        },
      });
      runner.log(`${dateTime()} 表单 Modal 已创建`);
      syncState();
      mountButtons('form', () => ui.form, '创建表单 Modal 实例');
      mountDemo(
        'form',
        () => ui.form,
        '表单 Modal 已创建，请点击"打开"查看效果'
      );
    }

    if (id === 'btn-md-form-open' && formModal) {
      formModal.show();
    }

    if (id === 'btn-md-form-destroy' && formModal) {
      formModal.destroy();
      formModal = null;
      runner.log(`${dateTime()} 表单 Modal 已销毁`);
      syncState();
      mountButtons('form', () => ui.form, '创建表单 Modal 实例');
      mountDemo('form', () => ui.form, '');
    }

    // Flow Modal
    if (id === 'btn-md-flow-create') {
      if (flowModal) {
        runner.log(`${dateTime()} Flow 实例已存在`);
        return;
      }

      const exitFlow = new Flow({
        render: false,
        linear: true,
        steps: [
          {
            id: 'confirm',
            title: '确认退出',
            modal: {
              content: jsx`<div style="width:276px;display:flex;flex-direction:column;align-items:center;gap:calc(var(--space)*4);">
                <div style="width:24px;fill:currentColor">${icon('warning')}</div>
                <div style="margin-bottom:12px">确认执行这项危险操作？</div>
                <div style="display:flex;gap:calc(var(--space)*4);">
                  <button class="j-button is-ghost is-sm" data-action="close">取消</button>
                  <button class="j-button is-danger is-sm" data-action="next">确认</button>
                </div>
              </div>`,
            },
          },
          {
            id: 'processing',
            title: '处理中',
            modal: {
              content: jsx`<div style="width:276px;display:flex;flex-direction:column;align-items:center;gap:calc(var(--space)*4);">
                <div class="is-active" style="width:32px;fill:currentColor;padding-top:calc(var(--space)*2);"><div class="animate-spin">${icon('loader')}</div></div>
                <div class="font-semiBold">正在处理请求</div>
                <div>请稍候，请勿刷新页面。</div>
                <div style="display:flex;gap:calc(var(--space)*4);width:50%;margin-top:calc(var(--space)*2);">
                  <button class="j-button is-contrast is-sm" style="flex:1;" data-action="cancel">取消</button>
                </div>
              </div>`,
            },
            onEnter: () => {
              runner.log(`${dateTime()} 确认退出，处理中...`);
              timer.start('modal-exit', 2000, () => {
                Toast.lite('请求已完成');
                flowModal?.hide();
              });
            },
          },
        ],
      });

      flowModal = new Modal({
        header: false,
        footer: false,
        bgClose: false,
        flow: exitFlow,
        onHidden: () => {
          timer.cancel('modal-exit');
        },
        onShow: () => {
          exitFlow.reset();
          flowModal.syncFlowView(exitFlow);
        },
      });
      runner.log(`${dateTime()} Flow Modal 已创建`);
      syncState();
      mountButtons('flow', () => ui.flow, '创建 Flow Modal 实例');
      mountDemo(
        'flow',
        () => ui.flow,
        'Flow Modal 已创建，请点击"打开"查看效果'
      );
    }

    if (id === 'btn-md-flow-open' && flowModal) {
      flowModal.show();
    }

    if (id === 'btn-md-flow-destroy' && flowModal) {
      const flow = flowModal.state?.flow;
      flowModal.destroy();
      flow?.destroy?.();
      flowModal = null;
      runner.log(`${dateTime()} Flow Modal 已销毁`);
      syncState();
      mountButtons('flow', () => ui.flow, '创建 Flow Modal 实例');
      mountDemo('flow', () => ui.flow, '');
    }
  });
}

function clearRuntimeLayers() {
  document
    .querySelectorAll('.j-popup-layout, .j-toast-container')
    .forEach((node) => node.remove());
}

// ========== 自动化测试 ==========

export function modalApp(runner) {
  runner.add('默认状态与 ID', '验证默认文本、可见性和自动 ID', () => {
    clearRuntimeLayers();
    const modal = new Modal();

    truthy(
      typeof modal.state.id === 'string' && modal.state.id.length > 0,
      'auto id'
    );
    equal(modal.state.text.title, 'Tip', 'default title');
    equal(modal.state.text.confirm, 'Confirm', 'default confirm text');
    equal(modal.state.text.cancel, 'Cancel', 'default cancel text');
    equal(modal.state.visible, false, 'default hidden');

    modal.destroy();
  });

  runner.add(
    '生命周期顺序',
    '验证 onShow/onShown/onHide/onHidden 调用顺序',
    async () => {
      clearRuntimeLayers();
      const order = [];

      const modal = new Modal({
        onShow: () => order.push('onShow'),
        onShown: () => order.push('onShown'),
        onHide: () => order.push('onHide'),
        onHidden: () => order.push('onHidden'),
      });

      modal.show();
      modal.hide();
      await wait(360);

      equal(order.join(','), 'onShow,onShown,onHide,onHidden', 'hook order');
      modal.destroy();
    }
  );

  runner.add('props 更新与限制', '验证 update 文本合并和不可变字段保护', () => {
    clearRuntimeLayers();
    const modal = new Modal({
      id: 'modal-stable-id',
      text: { title: 'A', confirm: 'B', cancel: 'C' },
      showCancel: true,
    });

    modal.update({ text: { confirm: '提交' }, showCancel: false });
    equal(modal.state.text.title, 'A', 'title preserved');
    equal(modal.state.text.confirm, '提交', 'confirm updated');
    equal(modal.state.showCancel, false, 'showCancel updated');

    let blocked = false;
    try {
      modal.update({ id: 'new-id' });
    } catch {
      blocked = true;
    }
    truthy(blocked, 'id update should be blocked');

    modal.destroy();
  });

  runner.add(
    '表单模式与内容互斥',
    '验证 fields 模式下 setContent 的限制与 force 行为',
    () => {
      clearRuntimeLayers();
      const modal = new Modal({
        fields: [{ label: 'Name', name: 'name', type: 'text' }],
      });

      truthy(modal.isFormMode(), 'form mode enabled');

      let throwsWithoutForce = false;
      try {
        modal.setContent('forbidden');
      } catch {
        throwsWithoutForce = true;
      }
      truthy(throwsWithoutForce, 'setContent should throw in form mode');

      modal.setContent('forced content', true);
      equal(modal.state.content, 'forced content', 'setContent with force');
      modal.setFields(null);
      truthy(!modal.isFormMode(), 'form mode disabled');

      modal.destroy();
    }
  );

  runner.add('setState 与链式调用', '验证 setState 类型校验和链式返回', () => {
    clearRuntimeLayers();
    const modal = new Modal({ text: { title: 'Init' } });

    const chained = modal
      .setState({ text: { title: 'Next' } })
      .setState({ loading: true })
      .setState({ loading: false });

    equal(chained, modal, 'chain returns self');
    equal(modal.state.text.title, 'Next', 'title changed');
    equal(modal.state.loading, false, 'loading toggled back');

    let invalidStateKey = false;
    try {
      modal.setState({ unknown: 1 });
    } catch {
      invalidStateKey = true;
    }
    truthy(invalidStateKey, 'invalid state key should throw');

    modal.destroy();
  });

  runner.add(
    '表单提交合并 extraData',
    '验证 requestSubmit 会触发 onSubmit 并合并 addFields',
    async () => {
      clearRuntimeLayers();
      let payload = null;

      const modal = new Modal({
        fields: [
          { label: '用户名', name: 'username', type: 'text', required: true },
        ],
        onSubmit: (data) => {
          payload = data;
        },
      });

      modal.show();
      await wait(0);

      const nameInput = modal.dom.form?.querySelector('input[name="username"]');
      truthy(!!nameInput, 'username input exists');

      nameInput.value = 'alice';
      modal.addFields({ source: 'manual-test' });
      modal.requestSubmit();

      await wait(0);

      equal(payload.username, 'alice', 'username submitted');
      equal(payload.source, 'manual-test', 'extraData merged');

      modal.destroy();
    }
  );

  runner.add(
    '按钮动作 confirm/cancel',
    '验证 data-action 触发 handleConfirm/handleCancel',
    async () => {
      clearRuntimeLayers();
      let confirmCount = 0;
      let cancelCount = 0;

      const modal = new Modal({
        content: '<p>action test</p>',
        onConfirm: () => {
          confirmCount += 1;
        },
        onCancel: () => {
          cancelCount += 1;
        },
      });

      modal.show();
      const confirmButton = modal.dom.modal?.querySelector('.modal-confirm');
      truthy(!!confirmButton, 'confirm button exists');
      confirmButton.click();
      await wait(0);

      equal(confirmCount, 1, 'confirm callback called');
      equal(modal.state.visible, false, 'hidden after confirm');

      await wait(360);
      modal.show();
      const closeButton = modal.dom.modal?.querySelector(
        '[data-action="close"]'
      );
      truthy(!!closeButton, 'close button exists');
      closeButton.click();
      await wait(0);

      equal(cancelCount, 1, 'cancel callback called');
      equal(modal.state.visible, false, 'hidden after cancel');

      modal.destroy();
    }
  );

  runner.add('ESC 与背景关闭', '验证 escClose/bgClose 行为', async () => {
    clearRuntimeLayers();
    const modal = new Modal({
      content: 'esc and bg close',
      escClose: true,
      bgClose: true,
    });

    modal.show();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    await wait(0);
    equal(modal.state.visible, false, 'escape closes modal');

    await wait(360);
    modal.show();
    modal.root.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(0);
    equal(modal.state.visible, false, 'overlay click closes modal');

    modal.destroy();
  });

  runner.add(
    'reset / resetContent / resetFields',
    '验证重置 API 恢复初始值',
    () => {
      clearRuntimeLayers();
      const initialFields = [{ label: '邮箱', name: 'email', type: 'email' }];
      const modal = new Modal({
        content: 'init content',
        fields: initialFields,
        text: { title: 'Init title', confirm: 'OK', cancel: 'Cancel' },
      });

      modal.setFields([{ label: '昵称', name: 'nick', type: 'text' }]);
      modal.resetFields();
      equal(modal.state.fields[0].name, 'email', 'resetFields back to initial');

      modal.setContent('changed', true);
      modal.setFields(null);
      modal.resetContent();
      equal(
        modal.state.content,
        'init content',
        'resetContent back to initial'
      );

      modal.setState({
        text: { title: 'Changed', confirm: 'Go', cancel: 'Back' },
      });
      modal.reset();
      equal(modal.state.text.title, 'Init title', 'reset text title');
      equal(modal.state.text.confirm, 'OK', 'reset text confirm');

      modal.destroy();
    }
  );

  runner.add('销毁后实例不可用', '验证 destroy 后 show/setState 会抛错', () => {
    clearRuntimeLayers();
    const modal = new Modal({ content: 'to destroy' });
    modal.destroy();

    let showThrows = false;
    let setStateThrows = false;
    try {
      modal.show();
    } catch {
      showThrows = true;
    }
    try {
      modal.setState({ visible: true });
    } catch {
      setStateThrows = true;
    }

    truthy(showThrows, 'show should throw after destroy');
    truthy(setStateThrows, 'setState should throw after destroy');
  });

  runner.log('Modal 组件测试已加载。');
}

export function modalSetup(runner) {
  const wrap = document.querySelector('.test-wrap');
  if (wrap) wrap.innerHTML = '';

  mountBox('regular');
  mountButtons('regular', () => ui.regular, '创建常规 Modal 实例');
  mountDemo('regular', () => ui.regular, 'Modal 已创建，请点击"打开"查看效果');

  mountBox('form');
  mountButtons('form', () => ui.form, '创建表单 Modal 实例');
  mountDemo('form', () => ui.form, '表单 Modal 已创建，请点击"打开"查看效果');

  mountBox('flow');
  mountButtons('flow', () => ui.flow, '创建 Flow Modal 实例');
  mountDemo('flow', () => ui.flow, 'Flow Modal 已创建，请点击"打开"查看效果');

  bindEvents(runner);
}

export function modalReset() {
  regularModal?.destroy();
  formModal?.destroy();
  flowModal?.state?.flow?.destroy?.();
  flowModal?.destroy();
  regularModal = null;
  formModal = null;
  flowModal = null;
  syncState();
  mountButtons('regular', () => ui.regular, '创建常规 Modal 实例');
  mountDemo('regular', () => ui.regular, '');
  mountButtons('form', () => ui.form, '创建表单 Modal 实例');
  mountDemo('form', () => ui.form, '');
  mountButtons('flow', () => ui.flow, '创建 Flow Modal 实例');
  mountDemo('flow', () => ui.flow, '');
}

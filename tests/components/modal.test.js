import { Modal, Toast, q, all } from '../dist/index.js?v=1781589307';
import { TestRunner, equal, hasClass, textOf, truthy, wait } from './test.js';

const runner = new TestRunner();

function cleanup() {
  all('.j-popup-layout, .j-offcanvas-overlay').forEach((node) => node.remove());
}

runner.add('展示和隐藏', '验证 DOM 挂载、内容和状态', async () => {
  cleanup();
  const modal = new Modal({
    content: '<button data-action="close">关闭</button><p>Modal content</p>',
  });

  await modal.show();
  truthy(document.body.contains(modal.root), 'root mounted');
  equal(modal.state.visible, true, 'visible');

  await modal.hide();
  equal(modal.state.visible, false, 'hidden');
  modal.destroy();
});

runner.add('表单模式', '验证 fields 和 onSubmit', async () => {
  cleanup();
  const modal = new Modal({
    fields: [{ label: 'Name', name: 'name', type: 'text', required: true }],
  });
  truthy(modal.isFormMode(), 'form mode');
  modal.destroy();
});

runner.add('销毁清理', '验证状态清理', async () => {
  cleanup();
  const modal = new Modal({ content: 'Test' });
  modal.destroy();
  equal(modal.root, null, 'root cleared');
  equal(modal.runtime.destroyed, true, 'destroyed');
});

if (typeof document !== 'undefined') {
  runner.mount(q('#test-list'));
  runner.bindUI();
  runner.log('Modal 组件测试已加载。');
}

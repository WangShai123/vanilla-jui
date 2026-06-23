import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Offcanvas } from '../dist/index.js?v=2';
import { equal, hasClass, textOf, truthy, dateTime } from './helpers.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function cleanup() {
  if (slideInstance) {
    slideInstance.destroy();
    slideInstance = null;
  }
  if (pushInstance) {
    pushInstance.destroy();
    pushInstance = null;
  }
  document
    .querySelectorAll('.j-offcanvas, .j-offcanvas-overlay')
    .forEach((node) => node.remove());
  document.body.style.overflow = '';
  document.body.classList.remove(
    'offcanvas-push-body',
    'offcanvas-push-left',
    'offcanvas-push-right',
    'offcanvas-push-top',
    'offcanvas-push-bottom'
  );
}

// ========== 手动测试 UI ==========

let slideInstance = null;
let pushInstance = null;

const ui = createDeepStore({ created: false });

function mountButtons() {
  const container = document.getElementById('manual-buttons');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => !ui.created,
        children: () =>
          jsx('button', {
            id: 'btn-oc-create',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: '创建实例',
          }),
        fallback: () =>
          jsx('div', {
            className: 'demo-buttons',
            children: [
              jsx('button', {
                id: 'btn-oc-slide',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: 'Slide',
              }),
              jsx('button', {
                id: 'btn-oc-push',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: 'Push',
              }),
              jsx('button', {
                id: 'btn-oc-destroy',
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

    if (id === 'btn-oc-create') {
      if (slideInstance) {
        runner.log(`${dateTime()} 实例已存在`);
        return;
      }

      flushSync(() => {
        ui.created = true;
      });
      mountButtons(runner);

      slideInstance = new Offcanvas({
        animation: 'slide',
        direction: 'bottom',
        content:
          '<div style="padding: 16px"><button data-action="close" class="j-button is-outline is-sm">关闭</button><p>Slide Offcanvas 内容</p></div>',
        onShown: () => {
          runner.log(`${dateTime()} Slide Offcanvas 已显示`);
        },
        onHidden: () => {
          runner.log(`${dateTime()} Slide Offcanvas 已关闭`);
        },
      });
      pushInstance = new Offcanvas({
        animation: 'push',
        direction: 'left',
        content:
          '<div style="padding: 16px"><button data-action="close" class="j-button is-outline is-sm">关闭</button><p>Push Offcanvas 内容</p></div>',
        onShown: () => {
          runner.log(`${dateTime()} Push Offcanvas 已显示`);
        },
        onHidden: () => {
          runner.log(`${dateTime()} Push Offcanvas 已关闭`);
        },
      });

      runner.log(`${dateTime()} 已创建 2 个 Offcanvas 实例`);
    }

    if (id === 'btn-oc-slide' && slideInstance) {
      slideInstance.show();
    }

    if (id === 'btn-oc-push' && pushInstance) {
      pushInstance.show();
    }

    if (id === 'btn-oc-destroy') {
      slideInstance?.destroy();
      pushInstance?.destroy();
      slideInstance = null;
      pushInstance = null;
      flushSync(() => {
        ui.created = false;
      });
      runner.log(`${dateTime()} 已销毁 2 个 Offcanvas 实例`);
      mountButtons(runner);
    }
  });
}

// ========== 自动化测试 ==========

export function offcanvasApp(runner) {
  runner.add('展示和隐藏', '验证 DOM 挂载、内容和状态', async () => {
    cleanup();
    const offcanvas = new Offcanvas({
      content: '<button data-action="close">关闭</button><p>Panel content</p>',
      direction: 'right',
    });

    await offcanvas.show();
    await wait(80);
    truthy(document.body.contains(offcanvas.root), 'root mounted');
    equal(
      textOf(offcanvas.root).includes('Panel content'),
      true,
      'content text'
    );
    truthy(hasClass(offcanvas.root, 'is-active'), 'active class');

    await offcanvas.hide();
    await wait(130);
    equal(
      document.body.contains(offcanvas.root),
      false,
      'root removed after hide'
    );
    offcanvas.destroy();
  });

  runner.add('Node 内容和关闭按钮', '验证 data-action close', async () => {
    cleanup();
    const content = document.createElement('div');
    content.innerHTML =
      '<button data-action="close">Close</button><strong>Node content</strong>';
    const offcanvas = new Offcanvas({ content, overlay: false });

    await offcanvas.show();
    document.querySelector('[data-action="close"]', offcanvas.root)?.click();
    await wait(130);
    equal(offcanvas.state.visible, false, 'closed by action');
    offcanvas.destroy();
  });

  runner.add('销毁清理', '验证 body 和 DOM 清理', async () => {
    cleanup();
    const offcanvas = new Offcanvas({
      content: 'Destroy content',
      animation: 'push',
      direction: 'left',
    });

    await offcanvas.show();
    let destroyCount = 0;
    const onDestroy = offcanvas.onDestroy.bind(offcanvas);
    offcanvas.onDestroy = () => {
      destroyCount += 1;
      onDestroy();
    };
    offcanvas.destroy();
    offcanvas.destroy();
    equal(document.querySelectorAll('.j-offcanvas').length, 0, 'root removed');
    equal(document.body.style.overflow, '', 'body overflow restored');
    equal(destroyCount, 1, 'onDestroy once');
  });

  runner.log('Offcanvas 组件测试已加载。');
}

export function offcanvasSetup(runner) {
  mountButtons(runner);
  bindEvents(runner);
}

export function offcanvasReset() {
  cleanup();
  flushSync(() => {
    ui.created = false;
  });
  mountButtons();
}

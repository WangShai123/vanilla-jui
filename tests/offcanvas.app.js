import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Offcanvas } from '../dist/index.js?v=4';
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
  if (asyncInstance) {
    asyncInstance.destroy();
    asyncInstance = null;
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
let asyncInstance = null;

const ui = createDeepStore({ created: false, asyncCreated: false });

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

function mountAsyncButtons() {
  const container = document.getElementById('async-buttons');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => !ui.asyncCreated,
        children: () =>
          jsx('button', {
            id: 'btn-oc-create-async',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: '创建异步实例',
          }),
        fallback: () =>
          jsx('div', {
            className: 'demo-buttons',
            children: [
              jsx('button', {
                id: 'btn-oc-show-async',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: '显示异步面板',
              }),
              jsx('button', {
                id: 'btn-oc-destroy-async',
                type: 'button',
                className: 'j-button is-error is-sm',
                children: '销毁异步实例',
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
        direction: 'left',
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

function bindAsyncEvents(runner) {
  const container = document.getElementById('async-buttons');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const id = e.target.id;

    if (id === 'btn-oc-create-async') {
      if (asyncInstance) {
        runner.log(`${dateTime()} 异步实例已存在`);
        return;
      }

      flushSync(() => {
        ui.asyncCreated = true;
      });
      mountAsyncButtons(runner);

      asyncInstance = new Offcanvas({
        animation: 'slide',
        direction: 'right',
        cache: true,
        ttl: 5000,
        content: () =>
          new Promise((resolve) => {
            runner.log(`${dateTime()} Offcanvas 开始模拟异步请求`);
            setTimeout(() => {
              runner.log(`${dateTime()} Offcanvas 模拟异步请求完成`);
              resolve(
                `<div style="padding: 16px"><button data-action="close" class="j-button is-outline is-sm">关闭</button><p>异步 Offcanvas 内容 ${dateTime()}</p></div>`
              );
            }, 2000);
          }),
        onShown: () => {
          runner.log(`${dateTime()} 异步 Offcanvas 已显示`);
        },
        onHidden: () => {
          runner.log(`${dateTime()} 异步 Offcanvas 已关闭`);
        },
      });

      runner.log(`${dateTime()} 已创建异步 Offcanvas 实例`);
    }

    if (id === 'btn-oc-show-async' && asyncInstance) {
      asyncInstance.show();
    }

    if (id === 'btn-oc-destroy-async' && asyncInstance) {
      asyncInstance.destroy();
      asyncInstance = null;
      flushSync(() => {
        ui.asyncCreated = false;
      });
      runner.log(`${dateTime()} 已销毁异步 Offcanvas 实例`);
      mountAsyncButtons(runner);
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

  runner.add(
    '异步内容缓存',
    '验证 loading、异步 content 和 ttl cache',
    async () => {
      cleanup();
      let calls = 0;
      let resolveContent;
      const pendingContent = new Promise((resolve) => {
        resolveContent = resolve;
      });

      const offcanvas = new Offcanvas({
        overlay: false,
        cache: true,
        ttl: 1000,
        content: async () => {
          calls += 1;
          return pendingContent;
        },
      });

      const showing = offcanvas.show();
      await wait(20);
      equal(offcanvas.state.loading, true, 'loading true before resolve');
      truthy(
        offcanvas.root.querySelector('.j-loading.is-active'),
        'loading node visible'
      );

      resolveContent('Async Offcanvas Content');
      await showing;

      equal(offcanvas.state.loading, false, 'loading false after resolve');
      equal(textOf(offcanvas.root), 'Async Offcanvas Content', 'async content');
      equal(calls, 1, 'first call');

      await offcanvas.hide();
      await wait(130);
      await offcanvas.show();
      equal(calls, 1, 'cache hit skips content callback');
      equal(
        textOf(offcanvas.root),
        'Async Offcanvas Content',
        'cached content'
      );

      offcanvas.destroy();
    }
  );

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
  const testWrap = document.querySelector('.test-wrap');
  if (testWrap && !document.getElementById('async-buttons')) {
    const asyncBox = document.createElement('div');
    asyncBox.className = 'test-box';
    asyncBox.innerHTML = `
      <div id="async-buttons" class="demo-buttons"></div>
      <div id="async-demo" class="fixture-box"></div>
    `;
    testWrap.appendChild(asyncBox);
  }

  mountButtons(runner);
  bindEvents(runner);
  mountAsyncButtons();
  bindAsyncEvents(runner);
}

export function offcanvasReset() {
  cleanup();
  flushSync(() => {
    ui.created = false;
    ui.asyncCreated = false;
  });
  mountButtons();
  mountAsyncButtons();
}

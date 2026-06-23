import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Parabola } from '../dist/index.js?v=1';
import { equal, truthy, falsy, dateTime, wait } from './helpers.js';

function cleanupBalls() {
  document.querySelectorAll('.parabola-ball').forEach((node) => node.remove());
}

// ========== 手动测试 UI ==========

let parabolaInstance = null;

const ui = createDeepStore({ created: false });

function mountUI() {
  const btnContainer = document.getElementById('manual-buttons');
  const demoContainer = document.getElementById('manual-demo');
  if (!btnContainer || !demoContainer) return;

  render(
    () =>
      Show({
        when: () => !ui.created,
        children: () =>
          jsx('button', {
            id: 'btn-create',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: '创建实例',
          }),
        fallback: () =>
          jsx('button', {
            id: 'btn-destroy',
            type: 'button',
            className: 'j-button is-error is-sm',
            children: '销毁实例',
          }),
      }),
    btnContainer
  );

  render(
    () =>
      Show({
        when: () => ui.created,
        children: () =>
          jsx('div', {
            style:
              'position:relative;width:100%;max-width:300px;height:200px;border:1px dashed var(--gray-6,#ccc);border-radius:var(--radius-sm,4px)',
            children: [
              jsx('button', {
                id: 'from-point',
                style: 'position:absolute;top:12px;left:12px',
                className: 'j-button is-primary is-sm',
                children: '起点',
              }),
              jsx('button', {
                id: 'to-point',
                style: 'position:absolute;bottom:12px;right:12px',
                className: 'j-button is-outline is-sm',
                children: '终点',
              }),
            ],
          }),
      }),
    demoContainer
  );
}

function createInstance(runner) {
  flushSync(() => {
    ui.created = true;
  });
  mountUI();

  const from = document.getElementById('from-point');
  const to = document.getElementById('to-point');
  if (!from || !to) {
    runner.log(`${dateTime()} 起点或终点元素不存在`);
    return;
  }
  parabolaInstance = new Parabola({
    from,
    to,
    showDelay: 0,
    onShow: () => runner.log(`${dateTime()} onShow`),
  });
  runner.log(`${dateTime()} 实例已创建`);
}

function bindEvents(runner) {
  const container = document.getElementById('manual-buttons');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const id = e.target.id;

    if (id === 'btn-create') {
      createInstance(runner);
    }

    if (id === 'btn-destroy') {
      if (parabolaInstance) {
        parabolaInstance.destroy();
        parabolaInstance = null;
      }
      cleanupBalls();
      runner.log(`${dateTime()} 实例已销毁`);
      flushSync(() => {
        ui.created = false;
      });
      mountUI();
    }
  });

  const demo = document.getElementById('manual-demo');
  if (demo) {
    demo.addEventListener('click', (e) => {
      if (e.target.id !== 'from-point') return;
      if (!parabolaInstance) {
        runner.log(`${dateTime()} 请先创建实例`);
        return;
      }
      cleanupBalls();
      parabolaInstance = new Parabola({
        from: document.getElementById('from-point'),
        to: document.getElementById('to-point'),
      });
      void parabolaInstance.show();
    });
  }
}

function resetManual() {
  if (parabolaInstance) {
    parabolaInstance.destroy();
    parabolaInstance = null;
  }
  cleanupBalls();
  flushSync(() => {
    ui.created = false;
  });
  mountUI();
}

// ========== 自动化测试 ==========

export function parabolaApp(runner) {
  runner.add('初始化环境', '渲染 from/to 元素', () => {
    cleanupBalls();
    flushSync(() => {
      ui.created = true;
    });
    mountUI();
    truthy(document.getElementById('from-point'), 'from-point exists');
    truthy(document.getElementById('to-point'), 'to-point exists');
  });

  runner.add('创建小球', '验证构造后 DOM 和实例状态', () => {
    cleanupBalls();
    const from = document.getElementById('from-point');
    const to = document.getElementById('to-point');
    const parabola = new Parabola({ from, to });

    truthy(document.querySelector('.parabola-ball'), 'ball exists in DOM');
    equal(parabola.hidden, false, 'instance active');
    equal(parabola._ball !== null, true, 'ball reference set');

    parabola.destroy();
    equal(parabola.hidden, true, 'instance hidden after destroy');
    equal(parabola._ball, null, 'ball reference cleared');
    falsy(document.querySelector('.parabola-ball'), 'ball removed from DOM');
  });

  runner.add('启动动画', '验证 show 返回 true 并触发 onShow', async () => {
    cleanupBalls();
    const from = document.getElementById('from-point');
    const to = document.getElementById('to-point');
    let shown = false;
    const parabola = new Parabola({
      from,
      to,
      showDelay: 0,
      onShow: () => {
        shown = true;
      },
    });

    const result = await parabola.show();
    equal(result, true, 'show resolves true');
    equal(shown, true, 'onShow called');
    truthy(document.querySelector('.parabola-ball'), 'ball visible');

    parabola.destroy();
  });

  runner.add('延迟启动', '验证 showDelay 延迟后触发动画', async () => {
    cleanupBalls();
    const from = document.getElementById('from-point');
    const to = document.getElementById('to-point');
    let shown = false;
    const parabola = new Parabola({
      from,
      to,
      showDelay: 100,
      onShow: () => {
        shown = true;
      },
    });

    equal(shown, false, 'not shown before delay');
    const result = await parabola.show();
    equal(result, true, 'show resolves true');
    equal(shown, true, 'onShow called after delay');

    parabola.destroy();
  });

  runner.add('动画结束销毁', '验证 onHidden 和状态清理', async () => {
    cleanupBalls();
    const from = document.getElementById('from-point');
    const to = document.getElementById('to-point');
    let hidden = false;
    const parabola = new Parabola({
      from,
      to,
      onHidden: () => {
        hidden = true;
      },
    });

    await parabola.show();
    await wait(900);
    equal(hidden, true, 'onHidden called');
    equal(parabola.hidden, true, 'instance hidden');
    falsy(document.querySelector('.parabola-ball'), 'ball removed');
  });

  runner.add('destroy 清理', '验证多次 destroy 安全', () => {
    cleanupBalls();
    const from = document.getElementById('from-point');
    const to = document.getElementById('to-point');
    const parabola = new Parabola({ from, to });

    parabola.destroy();
    equal(parabola.hidden, true, 'first destroy');
    parabola.destroy();
    equal(parabola.hidden, true, 'second destroy is no-op');
  });

  runner.add('start 别名', '验证 start() 等价于 show()', async () => {
    cleanupBalls();
    const from = document.getElementById('from-point');
    const to = document.getElementById('to-point');
    let shown = false;
    const parabola = new Parabola({
      from,
      to,
      showDelay: 0,
      onShow: () => {
        shown = true;
      },
    });

    const result = await parabola.start();
    equal(result, true, 'start resolves true');
    equal(shown, true, 'onShow called via start');

    parabola.destroy();
  });

  runner.add('from/to 无效时抛错', '验证元素缺失时的错误处理', () => {
    cleanupBalls();
    let threw = false;
    try {
      new Parabola({ from: '#nonexistent', to: '#also-missing' });
    } catch (e) {
      threw = true;
      truthy(e.message.includes('element not found'), 'error message correct');
    }
    truthy(threw, 'should throw');
  });

  runner.add('cleanup 清理', '验证 cleanup 移除所有小球', () => {
    cleanupBalls();
    const from = document.getElementById('from-point');
    const to = document.getElementById('to-point');
    new Parabola({ from, to });
    new Parabola({ from, to });
    equal(document.querySelectorAll('.parabola-ball').length, 2, 'two balls');

    cleanupBalls();
    equal(document.querySelectorAll('.parabola-ball').length, 0, 'all removed');
  });

  runner.add('清理环境', '销毁实例并移除 from/to', () => {
    cleanupBalls();
    if (parabolaInstance) {
      parabolaInstance.destroy();
      parabolaInstance = null;
    }
    flushSync(() => {
      ui.created = false;
    });
    mountUI();
    falsy(document.getElementById('from-point'), 'from-point removed');
    falsy(document.getElementById('to-point'), 'to-point removed');
  });

  runner.log('Parabola 组件测试已加载。');
}

export function parabolaSetup(runner) {
  mountUI();
  bindEvents(runner);
}

export function parabolaReset() {
  resetManual();
}

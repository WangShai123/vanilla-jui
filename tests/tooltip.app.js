import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Tooltip } from '../dist/index.js?v=1';
import {
  equal,
  hasClass,
  textOf,
  truthy,
  dateTime,
} from './helpers.js';

// ========== 手动测试 UI ==========

let clickTooltip = null;
let hoverTooltip = null;

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
            id: 'btn-tooltip-create',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: '创建实例',
          }),
        fallback: () =>
          jsx('div', {
            className: 'demo-buttons',
            children: [
              jsx('button', {
                id: 'btn-tooltip-click',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: 'Click',
              }),
              jsx('button', {
                id: 'btn-tooltip-hover',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: 'Hover',
              }),
              jsx('button', {
                id: 'btn-tooltip-destroy',
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

    if (id === 'btn-tooltip-create') {
      if (clickTooltip) {
        runner.log(`${dateTime()} 实例已存在`);
        return;
      }

      flushSync(() => {
        ui.created = true;
      });
      mountButtons(runner);

      setTimeout(() => {
        const clickEl = document.getElementById('btn-tooltip-click');
        const hoverEl = document.getElementById('btn-tooltip-hover');

        clickTooltip = new Tooltip(clickEl, {
          message: 'Click Tooltip 提示',
          mode: 'click',
          onShown: () => {
            runner.log(`${dateTime()} Click Tooltip 已显示`);
          },
          onHidden: () => {
            runner.log(`${dateTime()} Click Tooltip 已关闭`);
          },
        });
        hoverTooltip = new Tooltip(hoverEl, {
          message: 'Hover Tooltip 提示',
          mode: 'hover',
          onShown: () => {
            runner.log(`${dateTime()} Hover Tooltip 已显示`);
          },
          onHidden: () => {
            runner.log(`${dateTime()} Hover Tooltip 已关闭`);
          },
        });

        runner.log(`${dateTime()} 已创建 2 个 Tooltip 实例`);
      });
    }

    if (id === 'btn-tooltip-click' && clickTooltip) {
      clickTooltip.toggle();
    }

    if (id === 'btn-tooltip-hover' && hoverTooltip) {
      hoverTooltip.toggle();
    }

    if (id === 'btn-tooltip-destroy') {
      clickTooltip?.destroy();
      hoverTooltip?.destroy();
      clickTooltip = null;
      hoverTooltip = null;
      flushSync(() => {
        ui.created = false;
      });
      runner.log(`${dateTime()} 已销毁 2 个 Tooltip 实例`);
      mountButtons(runner);
    }
  });
}

// ========== 自动化测试 ==========

export function tooltipApp(runner) {
  runner.add('创建 Tooltip', '验证文本容器和 Drop 实例', () => {
    const el = document.createElement('button');
    el.textContent = 'Target';
    document.body.appendChild(el);

    const tooltip = new Tooltip(el, { message: 'Tooltip message' });

    equal(textOf(tooltip.drop.root), 'Tooltip message', 'message text');
    truthy(tooltip.drop, 'drop instance exists');

    tooltip.destroy();
    el.remove();
  });

  runner.add('展示隐藏', '验证 show/hide 代理到底层 Drop', () => {
    const el = document.createElement('button');
    el.textContent = 'Show target';
    document.body.appendChild(el);

    const tooltip = new Tooltip(el, {
      message: 'Show message',
      mode: 'click',
    });

    tooltip.show(false);
    truthy(hasClass(tooltip.drop.root, 'is-active'), 'shown');
    tooltip.hide(false);
    truthy(!hasClass(tooltip.drop.root, 'is-active'), 'hidden');

    tooltip.destroy();
    el.remove();
  });

  runner.add('销毁清理', '验证 Tooltip 和 Drop DOM 清理', () => {
    const el = document.createElement('button');
    el.textContent = 'Destroy target';
    document.body.appendChild(el);

    const tooltip = new Tooltip(el, { message: 'Destroy message' });
    const root = tooltip.drop.root;
    tooltip.destroy();

    equal(tooltip.drop, null, 'drop reference cleared');
    equal(document.body.contains(root), false, 'drop removed');
    el.remove();
  });

  runner.log('Tooltip 组件测试已加载。');
}

export function tooltipSetup(runner) {
  mountButtons(runner);
  bindEvents(runner);
}

export function tooltipReset() {
  clickTooltip?.destroy();
  hoverTooltip?.destroy();
  clickTooltip = null;
  hoverTooltip = null;
  flushSync(() => {
    ui.created = false;
  });
  mountButtons();
}

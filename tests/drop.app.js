import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Drop } from '../dist/index.js?v=1';
import {
  equal,
  hasClass,
  textOf,
  truthy,
  dateTime,
} from './helpers.js';

// ========== 手动测试 UI ==========

let clickDrop = null;
let hoverDrop = null;

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
            id: 'btn-drop-create',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: '创建实例',
          }),
        fallback: () =>
          jsx('div', {
            className: 'demo-buttons',
            children: [
              jsx('button', {
                id: 'btn-drop-click',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: 'Click',
              }),
              jsx('button', {
                id: 'btn-drop-hover',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: 'Hover',
              }),
              jsx('button', {
                id: 'btn-drop-destroy',
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

    if (id === 'btn-drop-create') {
      if (clickDrop) {
        runner.log(`${dateTime()} 实例已存在`);
        return;
      }

      flushSync(() => {
        ui.created = true;
      });
      mountButtons(runner);

      setTimeout(() => {
        const clickEl = document.getElementById('btn-drop-click');
        const hoverEl = document.getElementById('btn-drop-hover');

        clickDrop = new Drop(clickEl, {
          content: 'Click Drop 内容',
          onShown: () => {
            runner.log(`${dateTime()} Click Drop 已显示`);
          },
          onHidden: () => {
            runner.log(`${dateTime()} Click Drop 已关闭`);
          },
        });
        hoverDrop = new Drop(hoverEl, {
          mode: 'hover',
          hoverIntent: true,
          content: 'Hover Drop 内容',
          onShown: () => {
            runner.log(`${dateTime()} Hover Drop 已显示`);
          },
          onHidden: () => {
            runner.log(`${dateTime()} Hover Drop 已关闭`);
          },
        });

        runner.log(`${dateTime()} 已创建 2 个 Drop 实例`);
      });
    }

    if (id === 'btn-drop-destroy') {
      clickDrop?.destroy();
      hoverDrop?.destroy();
      clickDrop = null;
      hoverDrop = null;
      flushSync(() => {
        ui.created = false;
      });
      runner.log(`${dateTime()} 已销毁 2 个 Drop 实例`);
      mountButtons(runner);
    }
  });
}

// ========== 自动化测试 ==========

export function dropApp(runner) {
  runner.add('点击模式展示隐藏', '验证 show/hide/toggle 状态', () => {
    const target = document.createElement('button');
    target.textContent = 'Target';
    document.body.appendChild(target);

    const drop = new Drop(target, { content: '<b>Drop content</b>' });

    drop.show(false);
    truthy(hasClass(drop.root, 'is-active'), 'drop active');
    equal(textOf(drop.root), 'Drop content', 'content text');
    drop.hide(false);
    truthy(!hasClass(drop.root, 'is-active'), 'drop inactive');

    drop.destroy();
    target.remove();
  });

  runner.add('Node 内容', '验证 DOM 节点内容直接作为 wrapper', () => {
    const target = document.createElement('button');
    target.textContent = 'Node target';
    document.body.appendChild(target);

    const node = document.createElement('section');
    node.className = 'custom-drop-node';
    node.textContent = 'Node drop';
    const drop = new Drop(target, { content: node });

    truthy(drop.root.querySelector('.custom-drop-node'), 'custom node exists');
    drop.destroy();
    target.remove();
  });

  runner.add('hover 模式', '验证 hover 配置', () => {
    const target = document.createElement('button');
    target.textContent = 'Hover target';
    document.body.appendChild(target);

    const drop = new Drop(target, {
      mode: 'hover',
      hoverIntent: false,
      content: 'Hover drop',
    });

    target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    truthy(hasClass(drop.root, 'is-active'), 'hover active');
    target.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    truthy(!hasClass(drop.root, 'is-active'), 'hover inactive');

    drop.destroy();
    target.remove();
  });

  runner.add('销毁清理', '验证 DOM 清理', () => {
    const target = document.createElement('button');
    target.textContent = 'Destroy target';
    document.body.appendChild(target);

    const drop = new Drop(target, { content: 'Destroy drop' });
    const root = drop.root;
    drop.destroy();

    equal(document.body.contains(root), false, 'root removed');
    target.remove();
  });

  runner.log('Drop 组件测试已加载。');
}

export function dropSetup(runner) {
  mountButtons(runner);
  bindEvents(runner);
}

export function dropReset() {
  clickDrop?.destroy();
  hoverDrop?.destroy();
  clickDrop = null;
  hoverDrop = null;
  flushSync(() => {
    ui.created = false;
  });
  mountButtons();
}

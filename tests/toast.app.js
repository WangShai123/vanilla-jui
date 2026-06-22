import { jsx, render } from 'vanilla-signal';

import { Toast } from '../dist/index.js?v=1';
import {
  equal,
  hasClass,
  textOf,
  truthy,
  dateTime,
} from './helpers.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function cleanup() {
  Toast.clearAll();
}

// ========== 手动测试 UI ==========

function mountButtons() {
  const container = document.getElementById('manual-buttons');
  if (!container) return;

  render(
    () =>
      jsx('div', {
        className: 'demo-buttons',
        children: [
          jsx('button', {
            id: 'btn-info',
            type: 'button',
            className: 'j-button is-default is-sm',
            children: 'Info',
          }),
          jsx('button', {
            id: 'btn-primary',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: 'Primary',
          }),
          jsx('button', {
            id: 'btn-success',
            type: 'button',
            className: 'j-button is-success is-sm',
            children: 'Success',
          }),
          jsx('button', {
            id: 'btn-warning',
            type: 'button',
            className: 'j-button is-warning is-sm',
            children: 'Warning',
          }),
          jsx('button', {
            id: 'btn-error',
            type: 'button',
            className: 'j-button is-danger is-sm',
            children: 'Error',
          }),
          jsx('button', {
            id: 'btn-lite',
            type: 'button',
            className: 'j-button is-secondary is-sm',
            children: 'Lite',
          }),
          jsx('button', {
            id: 'btn-clear',
            type: 'button',
            className: 'j-button is-error is-sm',
            children: 'Clear All',
          }),
        ],
      }),
    container
  );
}

function bindEvents(runner) {
  const container = document.getElementById('manual-buttons');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const id = e.target.id;

    if (id === 'btn-success') {
      Toast.success('操作成功', 2400);
      runner.log(`${dateTime()} 显示 Success Toast`);
    }
    if (id === 'btn-info') {
      Toast.info('提示信息', 2400);
      runner.log(`${dateTime()} 显示 Info Toast`);
    }
    if (id === 'btn-warning') {
      Toast.warning('警告信息', 2400);
      runner.log(`${dateTime()} 显示 Warning Toast`);
    }
    if (id === 'btn-error') {
      Toast.error('错误信息', 2400);
      runner.log(`${dateTime()} 显示 Error Toast`);
    }
    if (id === 'btn-primary') {
      Toast.primary('主色消息', 2400);
      runner.log(`${dateTime()} 显示 Primary Toast`);
    }
    if (id === 'btn-lite') {
      Toast.lite('轻量提示', 1800);
      runner.log(`${dateTime()} 显示 Lite Toast`);
    }
    if (id === 'btn-clear') {
      cleanup();
      runner.log(`${dateTime()} 已清理所有 Toast`);
    }
  });
}

// ========== 自动化测试 ==========

export function toastApp(runner) {
  runner.add('展示普通 Toast', '验证容器、类型和文案', async () => {
    cleanup();
    const toast = Toast.success('Saved', 0);
    await wait(20);

    truthy(document.querySelector('.j-toast-container'), 'container exists');
    truthy(hasClass(toast, 'is-success'), 'success class');
    truthy(hasClass(toast, 'toast-show'), 'show class');
    equal(textOf(toast).includes('Saved'), true, 'message text');

    cleanup();
  });

  runner.add('隐藏 Toast', '验证 hide 后移除 DOM', async () => {
    cleanup();
    const toast = Toast.info('Hide me', 0);
    Toast.hide(toast);
    await wait(330);
    equal(document.body.contains(toast), false, 'toast removed');
  });

  runner.add('lite 单例', '验证 lite 只保留一个', () => {
    cleanup();
    Toast.lite('One', 1000);
    Toast.lite('Two', 1000);
    equal(document.querySelectorAll('.j-toast-lite').length, 1, 'single lite');
    equal(
      textOf(document.querySelector('.j-toast-lite')),
      'Two',
      'latest text'
    );
    cleanup();
  });

  runner.add('clearAll 清理', '验证定时器和 DOM 清理', () => {
    Toast.warning('Warning', 1000);
    Toast.lite('Lite', 1000);
    truthy(Toast.timers.size > 0, 'timers registered');
    cleanup();
    equal(Toast.timers.size, 0, 'timers cleared');
    equal(
      document.querySelector('.j-toast-container'),
      null,
      'container removed'
    );
    equal(document.querySelector('.j-toast-lite'), null, 'lite removed');
  });

  runner.log('Toast 组件测试已加载。');
}

export function toastSetup(runner) {
  mountButtons(runner);
  bindEvents(runner);
}

export function toastReset() {
  cleanup();
}

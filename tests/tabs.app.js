import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Tabs } from '../dist/index.js?v=13';
import { equal, hasClass, textOf, truthy, dateTime } from './helpers.js';

const tabsConfig = () => [
  { name: 'one', title: 'Tab 1', panel: 'No 1 Panel' },
  { name: 'two', title: 'Tab 2', panel: 'No 2 Panel' },
  { name: 'three', title: () => 'Tab 3', panel: () => 'No 3 Panel' },
];

const tabs2Config = () => [
  { name: 'alpha', title: 'Alpha', panel: 'Alpha Panel' },
  { name: 'beta', title: 'Beta', panel: 'Beta Panel' },
];

let demoTabs = null;
let asyncDemoTabs = null;

const ui = createDeepStore({
  created: false,
  multiple: false,
  disabled: false,
  reinited: true,
  asyncCreated: false,
});

function mountButtons() {
  const container = document.getElementById('manual-buttons');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => !ui.created,
        children: () =>
          jsx('button', {
            id: 'btn-create',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: '创建普通实例',
          }),
        fallback: () =>
          jsx('div', {
            className: 'demo-buttons',
            children: [
              jsx('button', {
                id: 'btn-add',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: '新增标签',
              }),
              jsx('button', {
                id: 'btn-delete',
                type: 'button',
                className: 'j-button is-outline is-sm',
                disabled: () => !ui.multiple,
                children: '删除标签',
              }),
              jsx('button', {
                id: 'btn-switch',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: '指定切换',
              }),
              jsx('button', {
                id: 'btn-disable',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: '指定禁用',
              }),
              jsx('button', {
                id: 'btn-enable',
                type: 'button',
                className: 'j-button is-outline is-sm',
                disabled: () => !ui.disabled,
                children: '指定启用',
              }),
              jsx('button', {
                id: 'btn-reinit',
                type: 'button',
                className: 'j-button is-outline is-sm',
                disabled: () => !ui.reinited,
                children: '重新初始化',
              }),
              jsx('button', {
                id: 'btn-destroy',
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
            id: 'btn-create-async',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: '创建异步实例',
          }),
        fallback: () =>
          jsx('button', {
            id: 'btn-destroy-async',
            type: 'button',
            className: 'j-button is-error is-sm',
            children: '销毁异步实例',
          }),
      }),
    container
  );
}

function mountDemo() {
  const container = document.getElementById('manual-demo');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => ui.created,
        children: () =>
          jsx('div', {
            ref: (el) => {
              if (el && demoTabs && !el.contains(demoTabs.root)) {
                el.appendChild(demoTabs.root);
              }
            },
          }),
      }),
    container
  );
}

function mountAsyncDemo() {
  const container = document.getElementById('async-demo');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => ui.asyncCreated,
        children: () =>
          jsx('div', {
            ref: (el) => {
              if (el && asyncDemoTabs && !el.contains(asyncDemoTabs.root)) {
                el.appendChild(asyncDemoTabs.root);
              }
            },
          }),
      }),
    container
  );
}

function syncState() {
  flushSync(() => {
    ui.created = !!demoTabs;
    ui.multiple = demoTabs ? demoTabs.props.tabs.length > 1 : false;
    ui.disabled = demoTabs ? demoTabs.state.disabled.names.length > 0 : false;
    ui.asyncCreated = !!asyncDemoTabs;
  });
}

function createAsyncTabsConfig(runner) {
  return [
    { name: 'intro', title: 'Intro', panel: '普通同步面板' },
    {
      name: 'request',
      title: '异步请求',
      cache: true,
      ttl: 5000,
      panel: () =>
        new Promise((resolve) => {
          runner.log(`${dateTime()} 开始模拟异步请求`);
          setTimeout(() => {
            runner.log(`${dateTime()} 模拟异步请求完成`);
            resolve(`异步内容 ${dateTime()}`);
          }, 2000);
        }),
    },
  ];
}

function bindEvents(runner) {
  const container = document.getElementById('manual-buttons');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const id = e.target.id;

    if (id === 'btn-create') {
      if (demoTabs) {
        runner.log(`${dateTime()} 实例已存在, ID ${demoTabs.props.id}`);
        return;
      }
      demoTabs = new Tabs('#manual-demo', { tabs: tabsConfig(), active: 0 });
      runner.log(`${dateTime()} 实例已创建, ID ${demoTabs.props.id}`);
      syncState();
      mountButtons(runner);
      mountDemo();
    }

    if (id === 'btn-add' && demoTabs) {
      const n = demoTabs.props.tabs.length;
      demoTabs.add({
        name: `tab-${n}`,
        title: `Tab ${n + 1}`,
        panel: `Panel ${n + 1}`,
      });
      runner.log(`${dateTime()} 已新增标签 Tab ${n + 1}`);
      syncState();
      mountButtons(runner);
    }

    if (id === 'btn-delete' && demoTabs && demoTabs.props.tabs.length > 1) {
      const last = demoTabs.props.tabs[demoTabs.props.tabs.length - 1];
      demoTabs.delete(last.name);
      runner.log(`${dateTime()} 已删除标签 ${last.title}`);
      syncState();
      mountButtons(runner);
    }

    if (id === 'btn-switch' && demoTabs) {
      const next =
        (demoTabs.state.current.index + 1) % demoTabs.props.tabs.length;
      demoTabs.activate(next);
      runner.log(`${dateTime()} 已切换到 ${demoTabs.props.tabs[next].title}`);
    }

    if (id === 'btn-disable' && demoTabs) {
      const idx = demoTabs.state.current.index;
      const name = demoTabs.props.tabs[idx]?.name;
      if (name && !demoTabs.state.disabled.names.includes(name)) {
        demoTabs.disable(name);
        runner.log(`${dateTime()} 已禁用 ${demoTabs.props.tabs[idx].title}`);
        syncState();
        mountButtons(runner);
      }
    }

    if (
      id === 'btn-enable' &&
      demoTabs &&
      demoTabs.state.disabled.names.length > 0
    ) {
      const name = demoTabs.state.disabled.names[0];
      const tab = demoTabs.props.tabs.find((t) => t.name === name);
      demoTabs.enable(name);
      runner.log(`${dateTime()} 已启用 ${tab?.title || name}`);
      syncState();
      mountButtons(runner);
    }

    if (id === 'btn-reinit' && demoTabs && ui.reinited) {
      flushSync(() => {
        ui.reinited = false;
      });
      demoTabs.reInit({ tabs: tabs2Config() });
      runner.log(`${dateTime()} 已重新初始化, ID ${demoTabs.props.id}`);
      syncState();
      mountButtons(runner);
    }

    if (id === 'btn-destroy' && demoTabs) {
      const id = demoTabs.props.id;
      demoTabs.destroy();
      demoTabs = null;
      flushSync(() => {
        ui.reinited = true;
      });
      runner.log(`${dateTime()} 实例已销毁, ID ${id}`);
      syncState();
      mountButtons(runner);
      mountDemo();
    }
  });
}

function bindAsyncEvents(runner) {
  const container = document.getElementById('async-buttons');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const id = e.target.id;

    if (id === 'btn-create-async') {
      if (asyncDemoTabs) {
        runner.log(
          `${dateTime()} 异步实例已存在, ID ${asyncDemoTabs.props.id}`
        );
        return;
      }

      asyncDemoTabs = new Tabs('#async-demo', {
        tabs: createAsyncTabsConfig(runner),
        active: 'intro',
      });
      runner.log(`${dateTime()} 异步实例已创建, ID ${asyncDemoTabs.props.id}`);
      syncState();
      mountAsyncButtons();
      mountAsyncDemo();
    }

    if (id === 'btn-destroy-async' && asyncDemoTabs) {
      const id = asyncDemoTabs.props.id;
      asyncDemoTabs.destroy();
      asyncDemoTabs = null;
      runner.log(`${dateTime()} 异步实例已销毁, ID ${id}`);
      syncState();
      mountAsyncButtons();
      mountAsyncDemo();
    }
  });
}

function resetManual() {
  if (demoTabs) {
    demoTabs.destroy();
    demoTabs = null;
  }
  if (asyncDemoTabs) {
    asyncDemoTabs.destroy();
    asyncDemoTabs = null;
  }
  flushSync(() => {
    ui.created = false;
    ui.multiple = false;
    ui.disabled = false;
    ui.reinited = true;
    ui.asyncCreated = false;
  });
  mountButtons();
  mountDemo();
  mountAsyncButtons();
  mountAsyncDemo();
}

export function tabsApp(runner) {
  runner.add('动态创建 Tabs', '验证 创建并 render DOM', async () => {
    const tabs = new Tabs(document.body, {
      tabs: tabsConfig(),
      active: 'two',
    });
    tabs.render();
    tabs.root.dataset.test = 'dynamic';

    equal(tabs.dom.tabs.length, 3, 'tabs length');
    equal(tabs.dom.panels.length, 3, 'panels length');
    equal(tabs.state.current.index, 1, 'current index');
    equal(tabs.state.current.name, 'two', 'current name');
    equal(textOf(tabs.dom.panels[1]), 'No 2 Panel', 'html content');
    equal(textOf(tabs.dom.panels[2]), '', 'function panel lazy initially');

    const root = tabs.root;
    tabs.destroy();
    equal(
      document.body.contains(root),
      false,
      'dynamic root should be removed'
    );
  });

  runner.add('名称激活和点击切换', '验证 activate(name) 与点击', async () => {
    const tabs = new Tabs(document.body, { tabs: tabsConfig(), active: 0 });
    tabs.render();
    tabs.root.dataset.test = 'switch';

    await tabs.activate('three');
    equal(tabs.state.current.index, 2, 'active by name');
    equal(tabs.state.current.name, 'three', 'active name');
    tabs.dom.tabs[1].click();
    await Promise.resolve();
    equal(tabs.state.current.index, 1, 'click switch');
    equal(tabs.state.current.name, 'two', 'click switch name');
    truthy(hasClass(tabs.dom.tabs[1], 'is-active'), 'second tab active');

    tabs.destroy();
  });

  runner.add(
    '异步面板缓存',
    '验证 loading、lazy panel 和 ttl cache',
    async () => {
      let calls = 0;
      let resolvePanel;
      const pendingPanel = new Promise((resolve) => {
        resolvePanel = resolve;
      });

      const tabs = new Tabs(document.body, {
        tabs: [
          { name: 'sync', title: 'Sync', panel: 'Sync Panel' },
          {
            name: 'async',
            title: 'Async',
            cache: true,
            ttl: 1000,
            panel: async () => {
              calls += 1;
              return pendingPanel;
            },
          },
        ],
        active: 'sync',
      });
      tabs.render();
      tabs.root.dataset.test = 'async-cache';

      const activating = tabs.activate('async');
      equal(tabs.state.loading, true, 'loading true before resolve');
      truthy(
        tabs.dom.panels[1].querySelector('.j-loading.is-active'),
        'loading node visible'
      );

      resolvePanel('Async Panel');
      await activating;

      equal(tabs.state.loading, false, 'loading false after resolve');
      equal(textOf(tabs.dom.panels[1]), 'Async Panel', 'async content');
      equal(calls, 1, 'first call');

      await tabs.activate('sync');
      await tabs.activate('async');
      equal(calls, 1, 'cache hit skips panel callback');
      equal(textOf(tabs.dom.panels[1]), 'Async Panel', 'cached content');

      tabs.destroy();
    }
  );

  runner.add('禁用与启用', '验证 disabled、disable、enable', async () => {
    const tabs = new Tabs(document.body, {
      tabs: tabsConfig(),
      active: 0,
      disabled: ['two'],
    });
    tabs.render();
    tabs.root.dataset.test = 'disabled';

    tabs.dom.tabs[1].click();
    equal(tabs.state.current.index, 0, 'disabled tab should not activate');
    tabs.enable('two');
    tabs.dom.tabs[1].click();
    await Promise.resolve();
    equal(tabs.state.current.index, 1, 'enabled tab can activate');
    tabs.disable('three');
    truthy(hasClass(tabs.dom.tabs[2], 'is-disabled'), 'third tab disabled');
    equal(tabs.state.disabled.names[0], 'three', 'disabled names');
    equal(tabs.state.disabled.indexes[0], 2, 'disabled indexes');

    tabs.destroy();
  });

  runner.add('动态增删', '验证 add 和 delete', async () => {
    const tabs = new Tabs(document.body, { tabs: tabsConfig(), active: 0 });
    tabs.render();
    tabs.root.dataset.test = 'dynamic-mutate';

    await tabs.add({ name: 'four', title: 'Four', panel: 'Four content' });
    equal(tabs.dom.tabs.length, 4, 'after add length');
    await tabs.delete('four');
    equal(tabs.dom.tabs.length, 3, 'after delete length');

    tabs.destroy();
  });

  runner.add('销毁清理', '验证 DOM 状态', () => {
    const tabs = new Tabs(document.body, { tabs: tabsConfig(), active: 0 });
    tabs.render();
    tabs.root.dataset.test = 'destroy';
    const root = tabs.root;
    let destroyCount = 0;
    const onDestroy = tabs.onDestroy.bind(tabs);
    tabs.onDestroy = () => {
      destroyCount += 1;
      onDestroy();
    };
    tabs.destroy();
    tabs.destroy();

    equal(
      document.body.contains(root),
      false,
      'dynamic root should be removed'
    );
    equal(destroyCount, 1, 'onDestroy once');
    equal(tabs.root, null, 'root cleared');
  });

  runner.log('Tabs 组件测试已加载。');
}

export function tabsSetup(runner) {
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
  mountDemo();
  bindEvents(runner);
  mountAsyncButtons();
  mountAsyncDemo();
  bindAsyncEvents(runner);
}

export function tabsReset() {
  resetManual();
}

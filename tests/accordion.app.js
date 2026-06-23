import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Accordion } from '../dist/index.js?v=2';
import { equal, hasClass, textOf, truthy, dateTime } from './helpers.js';

const items = (prefix = 'Item') => [
  {
    name: 'intro',
    title: `${prefix} Intro`,
    content: `${prefix} introduction content.`,
  },
  {
    name: 'usage',
    title: `${prefix} Usage`,
    content: `${prefix} usage content.`,
  },
  {
    name: 'api',
    title: `${prefix} API`,
    content: `${prefix} API content.`,
  },
];

let demoAccordion = null;

const ui = createDeepStore({
  created: false,
  current: null,
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
            children: '创建实例',
          }),
        fallback: () =>
          jsx('div', {
            className: 'demo-buttons',
            children: [
              jsx('button', {
                id: 'btn-next',
                type: 'button',
                className: 'j-button is-outline is-sm',
                children: '切到下项',
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
              if (el && demoAccordion && !el.contains(demoAccordion.root)) {
                el.appendChild(demoAccordion.root);
              }
            },
          }),
      }),
    container
  );
}

function syncState() {
  flushSync(() => {
    ui.created = !!demoAccordion;
    ui.current = demoAccordion?.state.current?.index ?? null;
  });
}

function bindEvents(runner) {
  const container = document.getElementById('manual-buttons');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const id = e.target.id;

    if (id === 'btn-create') {
      if (demoAccordion) {
        runner.log(`${dateTime()} 实例已存在, ID ${demoAccordion.props.id}`);
        return;
      }
      demoAccordion = new Accordion('#manual-demo', {
        items: items('Demo'),
        collapsible: true,
      });
      demoAccordion.render();
      runner.log(`${dateTime()} 实例已创建, ID ${demoAccordion.props.id}`);
      syncState();
      mountButtons(runner);
      mountDemo();
    }

    if (id === 'btn-next' && demoAccordion) {
      const cur = demoAccordion.state.current.index;
      const next = cur == null ? 0 : (cur + 1) % 3;
      demoAccordion.active(next);
      runner.log(
        `${dateTime()} 已切换到 ${demoAccordion.dom.headers[next]?.textContent?.trim() || next}`
      );
      syncState();
    }

    if (id === 'btn-destroy' && demoAccordion) {
      const id = demoAccordion.props.id;
      demoAccordion.destroy();
      demoAccordion = null;
      runner.log(`${dateTime()} 实例已销毁, ID ${id}`);
      syncState();
      mountButtons(runner);
      mountDemo();
    }
  });
}

function resetManual() {
  if (demoAccordion) {
    demoAccordion.destroy();
    demoAccordion = null;
  }
  flushSync(() => {
    ui.created = false;
    ui.current = null;
  });
  mountButtons();
  mountDemo();
}

export function accordionApp(runner) {
  runner.add('动态创建 Accordion', '验证 创建并 render DOM', async () => {
    const accordion = new Accordion(document.body, {
      active: 'usage',
      items: items('Dynamic'),
    });
    accordion.render();
    const root = accordion.root;

    equal(accordion.dom.headers.length, 3, 'headers length');
    equal(accordion.dom.panels.length, 3, 'panels length');
    equal(accordion.state.current.index, 1, 'current index');
    equal(accordion.root.id, accordion.props.id, 'root id');
    truthy(accordion.root.querySelector('svg'), 'arrow icon should render');
    truthy(
      hasClass(accordion.dom.headers[1], 'is-active'),
      'second header should active'
    );
    truthy(accordion.dom.panels[0].hidden, 'first panel hidden');
    equal(
      accordion.dom.panels[0].getAttribute('aria-hidden'),
      'true',
      'first panel aria hidden'
    );
    equal(
      getComputedStyle(accordion.dom.panels[0]).display,
      'none',
      'first panel display none'
    );
    truthy(!accordion.dom.panels[1].hidden, 'second panel visible');
    equal(
      accordion.dom.panels[1].getAttribute('aria-hidden'),
      'false',
      'second panel aria visible'
    );
    accordion.destroy();
    equal(
      document.body.contains(root),
      false,
      'dynamic root should be removed'
    );
  });

  runner.add(
    '按名称和点击切换',
    '验证 active(name) 与 header click',
    async () => {
      const accordion = new Accordion(document.body, {
        active: 0,
        items: items('Switch'),
      });
      accordion.render();

      await accordion.active('api');
      equal(accordion.state.current.index, 2, 'active by name');
      truthy(
        hasClass(accordion.dom.panels[2], 'is-active'),
        'api panel active'
      );
      accordion.dom.headers[1].click();
      equal(accordion.state.current.index, 1, 'click switch');
      truthy(
        hasClass(accordion.dom.headers[1], 'is-active'),
        'usage header active'
      );
      truthy(
        !hasClass(accordion.dom.headers[2], 'is-active'),
        'api header inactive'
      );
      truthy(accordion.dom.panels[2].hidden, 'api panel hidden after switch');
      truthy(!accordion.dom.panels[1].hidden, 'usage panel visible');

      accordion.destroy();
    }
  );

  runner.add('可折叠单开模式', '验证 collapsible 关闭当前项', async () => {
    const accordion = new Accordion(document.body, {
      active: 0,
      collapsible: true,
      items: items('Collapse'),
    });

    await accordion.active(0);
    equal(accordion.state.current.index, null, 'current should be null');
    equal(accordion.state.activeNames.length, 0, 'activeNames should empty');

    accordion.destroy();
  });

  runner.add('多开模式', '验证 multiple 可以同时展开多个面板', async () => {
    const accordion = new Accordion(document.body, {
      active: [0, 'api'],
      multiple: true,
      items: items('Multiple'),
    });

    equal(accordion.state.activeNames.length, 2, 'initial active count');
    await accordion.active('usage');
    equal(accordion.state.activeNames.length, 3, 'after open usage');
    truthy(hasClass(accordion.dom.headers[0], 'is-active'), 'intro active');
    truthy(hasClass(accordion.dom.headers[1], 'is-active'), 'usage active');
    truthy(hasClass(accordion.dom.headers[2], 'is-active'), 'api active');

    await accordion.active('intro');
    equal(accordion.state.activeNames.length, 2, 'after close intro');
    truthy(!hasClass(accordion.dom.headers[0], 'is-active'), 'intro inactive');

    accordion.destroy();
  });

  runner.add('setItems 动态替换', '验证动态替换条目和默认激活项', () => {
    const accordion = new Accordion(document.body, {
      active: 0,
      items: items('Before'),
    });

    accordion.setItems(
      [
        { name: 'first', title: 'First', content: 'First content' },
        { name: 'second', title: 'Second', content: 'Second content' },
      ],
      'second'
    );

    equal(accordion.dom.headers.length, 2, 'headers length');
    equal(accordion.state.current.index, 1, 'current index');
    equal(textOf(accordion.dom.headers[1]), 'Second', 'second title');

    accordion.destroy();
  });

  runner.add('键盘交互', '验证 Enter/Space 可切换面板', () => {
    const accordion = new Accordion(document.body, {
      active: 0,
      items: items('Keyboard'),
    });

    accordion.dom.headers[2].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    equal(accordion.state.current.index, 2, 'enter active');

    accordion.dom.headers[1].dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    );
    equal(accordion.state.current.index, 1, 'space active');

    accordion.destroy();
  });

  runner.add('onChange 与销毁', '验证回调参数和状态清理', async () => {
    let changed = null;
    const accordion = new Accordion(document.body, {
      active: 0,
      items: items('Change'),
      onChange: (index, name, header, panel, instance) => {
        changed = { index, name, header, panel, instance };
      },
    });

    await accordion.active('api');
    equal(changed.index, 2, 'change index');
    equal(changed.name, 'api', 'change name');
    equal(changed.instance, accordion, 'change instance');
    truthy(changed.header instanceof HTMLElement, 'header element');
    truthy(changed.panel instanceof HTMLElement, 'panel element');

    let destroyCount = 0;
    const onDestroy = accordion.onDestroy.bind(accordion);
    accordion.onDestroy = () => {
      destroyCount += 1;
      onDestroy();
    };
    accordion.destroy();
    accordion.destroy();
    equal(destroyCount, 1, 'onDestroy once');
    equal(accordion.root, null, 'root cleared');
    equal(accordion.runtime.destroyed, true, 'instance destroyed');
  });

  runner.log('Accordion 组件测试已加载。');
}

export function accordionSetup(runner) {
  mountButtons(runner);
  mountDemo();
  bindEvents(runner);
}

export function accordionReset() {
  resetManual();
}

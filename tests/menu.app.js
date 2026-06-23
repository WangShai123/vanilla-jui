import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Menu } from '../dist/index.js?v=0';
import { equal, hasClass, textOf, truthy, dateTime } from './helpers.js';

const items = () => [
  { id: 'home', title: 'Home', url: '' },
  {
    id: 'docs',
    title: 'Docs',
    children: [
      { id: 'api', title: 'API', url: '' },
      { id: 'guide', title: 'Guide', url: '' },
    ],
  },
  {
    id: 'about',
    title: 'About',
    children: [
      { id: 'team', title: 'Team', url: '' },
      { id: 'contact', title: 'Contact', url: '' },
    ],
  },
];

function cleanup() {
  document
    .querySelectorAll('.j-mobile-menu, .j-bottom-menu')
    .forEach((node) => node.remove());
}

// ========== 手动测试 UI ==========

let mobileMenu = null;
let bottomMenu = null;

const mobileUI = createDeepStore({ created: false });
const bottomUI = createDeepStore({ created: false });

function mountMobileButtons() {
  const container = document.getElementById('mobile-buttons');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => !mobileUI.created,
        children: () =>
          jsx('button', {
            id: 'btn-mobile-create',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: '创建 mobile 菜单实例',
          }),
        fallback: () =>
          jsx('button', {
            id: 'btn-mobile-destroy',
            type: 'button',
            className: 'j-button is-error is-sm',
            children: '销毁实例',
          }),
      }),
    container
  );
}

function mountBottomButtons() {
  const container = document.getElementById('bottom-buttons');
  if (!container) return;

  render(
    () =>
      Show({
        when: () => !bottomUI.created,
        children: () =>
          jsx('button', {
            id: 'btn-bottom-create',
            type: 'button',
            className: 'j-button is-primary is-sm',
            children: '创建 bottom 菜单实例',
          }),
        fallback: () =>
          jsx('button', {
            id: 'btn-bottom-destroy',
            type: 'button',
            className: 'j-button is-error is-sm',
            children: '销毁实例',
          }),
      }),
    container
  );
}

function mountDemo() {
  const container = document.getElementById('manual-demo');
  if (!container) return;

  container.innerHTML = '';

  const mobileBox = document.createElement('div');
  mobileBox.className = 'test-box';
  mobileBox.innerHTML = `
    <div id="mobile-buttons" class="demo-buttons"></div>
    <div id="mobile-demo" class="fixture-box"></div>
  `;
  container.appendChild(mobileBox);

  const bottomBox = document.createElement('div');
  bottomBox.className = 'test-box';
  bottomBox.innerHTML = `
    <div id="bottom-buttons" class="demo-buttons"></div>
    <div id="bottom-demo" class="fixture-box"></div>
  `;
  container.appendChild(bottomBox);

  mountMobileButtons();
  mountBottomButtons();
}

function bindEvents(runner) {
  const container = document.getElementById('manual-demo');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const id = e.target.id;

    if (id === 'btn-mobile-create') {
      if (mobileMenu) return;
      mobileMenu = new Menu({ type: 'mobile', items: items() }).build();
      document.getElementById('mobile-demo')?.appendChild(mobileMenu.root);
      flushSync(() => {
        mobileUI.created = true;
      });
      mountMobileButtons();
      runner.log(`${dateTime()} Mobile 菜单已创建`);
    }

    if (id === 'btn-mobile-destroy' && mobileMenu) {
      mobileMenu.destroy();
      mobileMenu = null;
      document.getElementById('mobile-demo').textContent = '';
      flushSync(() => {
        mobileUI.created = false;
      });
      mountMobileButtons();
      runner.log(`${dateTime()} Mobile 菜单已销毁`);
    }

    if (id === 'btn-bottom-create') {
      if (bottomMenu) return;
      bottomMenu = new Menu({ type: 'bottom', items: items() }).build();
      const demo = document.getElementById('bottom-demo');
      if (demo) {
        const hint = document.createElement('p');
        hint.className = 'help-block';
        hint.textContent = 'bottom菜单创建在页面底部查看工具栏菜单。';
        demo.appendChild(bottomMenu.root);
        demo.appendChild(hint);
      }
      flushSync(() => {
        bottomUI.created = true;
      });
      mountBottomButtons();
      runner.log(`${dateTime()} Bottom 菜单已创建`);
    }

    if (id === 'btn-bottom-destroy' && bottomMenu) {
      bottomMenu.destroy();
      bottomMenu = null;
      document.getElementById('bottom-demo').textContent = '';
      flushSync(() => {
        bottomUI.created = false;
      });
      mountBottomButtons();
      runner.log(`${dateTime()} Bottom 菜单已销毁`);
    }
  });
}

// ========== 自动化测试 ==========

export function menuApp(runner) {
  runner.add('动态创建 Mobile 菜单', '验证 build 生成 DOM 结构', () => {
    cleanup();
    const menu = new Menu({ type: 'mobile', items: items() }).build();

    truthy(menu.root, 'root exists');
    truthy(hasClass(menu.root, 'j-mobile-menu'), 'mobile class');
    equal(menu.root.querySelectorAll('.menu-item').length, 7, 'item count');
    truthy(menu.root.querySelector('.menu-item-has-children'), 'has children');
    truthy(menu.root.querySelector('.sub-menu'), 'sub-menu exists');

    menu.destroy();
  });

  runner.add('动态创建 Bottom 菜单', '验证 build 生成 DOM 结构', () => {
    cleanup();
    const menu = new Menu({ type: 'bottom', items: items() }).build();

    truthy(menu.root, 'root exists');
    truthy(hasClass(menu.root, 'j-bottom-menu'), 'bottom class');
    equal(menu.root.querySelectorAll('.menu-item').length, 7, 'item count');

    menu.destroy();
  });

  runner.add('setItems 动态替换', '验证替换后 DOM 更新', () => {
    cleanup();
    const menu = new Menu({ type: 'mobile', items: items() }).build();

    menu.setItems([{ id: 'new', title: 'New', url: '#new' }]);
    equal(menu.root.querySelectorAll('.menu-item').length, 1, 'new item count');
    equal(textOf(menu.root), 'New', 'new text');

    menu.destroy();
  });

  runner.add('removeItem 移除菜单项', '验证按 id 移除', () => {
    cleanup();
    const menu = new Menu({ type: 'mobile', items: items() }).build();

    menu.removeItem('home');
    equal(menu.root.querySelectorAll('.menu-item').length, 6, 'after remove');

    menu.destroy();
  });

  runner.add('销毁清理', '验证销毁后状态', () => {
    cleanup();
    const menu = new Menu({ type: 'mobile', items: items() }).build();
    const root = menu.root;

    menu.destroy();
    equal(document.body.contains(root), false, 'root removed');
    equal(menu.root, null, 'root cleared');
    equal(menu.options, null, 'options cleared');
  });

  runner.add('mobile 子菜单展开和返回', '验证 is-active 和 back 按钮', () => {
    cleanup();
    const menu = new Menu({
      type: 'mobile',
      items: items(),
      backText: 'Back',
    }).build();
    document.body.appendChild(menu.root);

    const parent = menu.root.querySelector('.menu-item-has-children');
    parent.querySelector(':scope > a').click();
    truthy(hasClass(parent, 'is-active'), 'parent active');
    truthy(parent.querySelector('.menu-item.back'), 'back item created');

    parent.querySelector('.menu-item.back a').click();
    truthy(!hasClass(parent, 'is-active'), 'parent inactive');

    menu.destroy();
  });

  runner.add('绑定已有 DOM', '验证绑定已有节点并替换条目', () => {
    cleanup();
    const root = document.createElement('nav');
    root.className = 'j-mobile-menu';
    root.innerHTML =
      '<ul class="menu"><li class="menu-item"><a class="menu-link">Old</a></li></ul>';
    document.body.appendChild(root);

    const menu = new Menu({ type: 'mobile', items: [] }, root).build();
    menu.setItems([{ id: 'bound', title: 'Bound', url: '#bound' }]);
    equal(textOf(root), 'Bound', 'bound text');

    menu.destroy();
    root.remove();
  });

  runner.add('绑定 JSX DOM', '验证 h/jsx 返回节点可作为 element', () => {
    cleanup();
    const root = jsx('nav', {
      className: 'j-mobile-menu',
      children: jsx('ul', {
        className: 'menu',
        children: jsx('li', {
          className: 'menu-item',
          children: jsx('a', { className: 'menu-link', children: 'Old' }),
        }),
      }),
    });
    document.body.appendChild(root);

    const menu = new Menu({ type: 'mobile', items: [] }, root).build();
    menu.setItems([{ id: 'jsx-bound', title: 'JSX Bound', url: '#bound' }]);
    equal(textOf(root), 'JSX Bound', 'jsx bound text');

    menu.destroy();
    root.remove();
  });

  runner.log('Menu 组件测试已加载。');
}

export function menuSetup(runner) {
  mountDemo();
  bindEvents(runner);
}

export function menuReset() {
  mobileMenu?.destroy();
  mobileMenu = null;
  bottomMenu?.destroy();
  bottomMenu = null;
  flushSync(() => {
    mobileUI.created = false;
    bottomUI.created = false;
  });
  cleanup();
  mountDemo();
}

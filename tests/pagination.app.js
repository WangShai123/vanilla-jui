import { createDeepStore, flushSync, render, For, jsx } from 'vanilla-signal';

import { Pagination } from '../dist/index.js?v=2';
import { createLoading } from '../src/utilities/dom.js';
import { dateTime, equal, hasClass, sleep, textOf, truthy } from './helpers.js';

const PAGE_SIZE = 2;
const TOTAL_PAGES = 10;
const records = Array.from({ length: PAGE_SIZE * TOTAL_PAGES }, (_, index) => ({
  id: index + 1,
  title: `No. ** ${index + 1} ** item in simulated data`,
}));

let manualPagination = null;
let manualUnlockedPagination = null;
let manualLoadId = 0;
let manualUnlockedLoadId = 0;

const manualState = createDeepStore({
  created: false,
  loading: false,
  page: 1,
  items: [],
});

const manualUnlockedState = createDeepStore({
  created: false,
  loading: false,
  page: 1,
  items: [],
});

async function fetchPage(page) {
  await sleep(1000);
  const start = (page - 1) * PAGE_SIZE;
  return {
    page,
    total: records.length,
    items: records.slice(start, start + PAGE_SIZE),
  };
}

function cleanup() {
  manualPagination?.destroy();
  manualUnlockedPagination?.destroy();
  manualPagination = null;
  manualUnlockedPagination = null;
  manualLoadId += 1;
  manualUnlockedLoadId += 1;
  document.querySelector('#manual-demo .test-wrap')?.remove();
}

function mountDemo() {
  const container = document.getElementById('manual-demo');
  if (!container) return;

  container.innerHTML = `
    <div class="test-wrap">
      <div class="test-box">
        <div id="pagination-buttons" class="demo-buttons">
          <button id="btn-pagination-create" class="j-button is-primary is-sm" type="button">创建默认分页实例</button>
        </div>
        <div class="fixture-box">
          <div id="pagination-result" class="help-block" style="position:relative"></div>
          <div id="pagination-demo"></div>
        </div>
      </div>
      <div class="test-box">
        <div id="pagination-unlocked-buttons" class="demo-buttons">
          <button id="btn-pagination-unlocked-create" class="j-button is-primary is-sm" type="button">创建分页实例 lock:false</button>
        </div>
        <div class="fixture-box">
          <div id="pagination-unlocked-result" class="help-block" style="position:relative"></div>
          <div id="pagination-unlocked-demo"></div>
        </div>
      </div>
    </div>
  `;
}

function renderResult(state, resultId) {
  const result = document.getElementById(resultId);
  if (!result) return;

  if (!state.created) {
    result.textContent = '';
    return;
  }

  if (state.loading) {
    // result.textContent = `正在加载第 ${manualState.page} 页数据...`;
    render(() => {
      result.style.position = 'relative';
      result.style.minHeight = '60px';
      result.style.marginBottom = '4px';
      return createLoading();
    }, result);
    return;
  }

  render(() => {
    result.style = null;
    return jsx('ul', {
      children: jsx`
          ${For({
            each: state.items,
            key: (item) => item.id,
            children: (item) => jsx`
            <li>${() => item().title}</li>
            `,
          })}`,
    });
  }, result);
}

function renderManualResult() {
  renderResult(manualState, 'pagination-result');
}

function renderManualUnlockedResult() {
  renderResult(manualUnlockedState, 'pagination-unlocked-result');
}

function renderButtons(state, buttonsId, createId, destroyId, createText) {
  const buttons = document.getElementById(buttonsId);
  if (!buttons) return;

  buttons.innerHTML = state.created
    ? `<button id="${destroyId}" class="j-button is-error is-sm" type="button">销毁实例</button>`
    : `<button id="${createId}" class="j-button is-primary is-sm" type="button">${createText}</button>`;
}

function renderManualButtons() {
  renderButtons(
    manualState,
    'pagination-buttons',
    'btn-pagination-create',
    'btn-pagination-destroy',
    '创建默认分页实例'
  );
}

function renderManualUnlockedButtons() {
  renderButtons(
    manualUnlockedState,
    'pagination-unlocked-buttons',
    'btn-pagination-unlocked-create',
    'btn-pagination-unlocked-destroy',
    '创建分页实例 lock:false'
  );
}

async function loadManualPage(page, runner) {
  const loadId = ++manualLoadId;
  flushSync(() => {
    manualState.loading = true;
    manualState.page = page;
  });
  renderManualResult();

  const result = await fetchPage(page);
  if (loadId !== manualLoadId || !manualPagination) return;

  flushSync(() => {
    manualState.loading = false;
    manualState.page = result.page;
    manualState.items = result.items;
  });
  renderManualResult();
  runner.log(`${dateTime()} 第 ${result.page} 页数据加载完成`);
}

async function loadManualUnlockedPage(page, runner) {
  const loadId = ++manualUnlockedLoadId;
  flushSync(() => {
    manualUnlockedState.loading = true;
    manualUnlockedState.page = page;
  });
  renderManualUnlockedResult();

  const result = await fetchPage(page);
  if (loadId !== manualUnlockedLoadId || !manualUnlockedPagination) return;

  flushSync(() => {
    manualUnlockedState.loading = false;
    manualUnlockedState.page = result.page;
    manualUnlockedState.items = result.items;
  });
  renderManualUnlockedResult();
  runner.log(`${dateTime()} lock:false 第 ${result.page} 页数据加载完成`);
}

function createManualPagination(runner) {
  if (manualPagination) return;

  const target = document.getElementById('pagination-demo');
  manualPagination = new Pagination(target, {
    total: records.length,
    page: { size: PAGE_SIZE, current: 1 },
    count: { sibling: 1, boundary: 1 },
    onChange: (page) => {
      return loadManualPage(page, runner);
    },
  });
  manualPagination.build();

  flushSync(() => {
    manualState.created = true;
    manualState.items = [];
    manualState.page = 1;
  });
  renderManualButtons();
  void loadManualPage(1, runner);
  runner.log(`${dateTime()} Pagination 已创建`);
}

function createManualUnlockedPagination(runner) {
  if (manualUnlockedPagination) return;

  const target = document.getElementById('pagination-unlocked-demo');
  manualUnlockedPagination = new Pagination(target, {
    total: records.length,
    lock: false,
    page: { size: PAGE_SIZE, current: 1 },
    count: { sibling: 1, boundary: 1 },
    onChange: (page) => {
      return loadManualUnlockedPage(page, runner);
    },
  });
  manualUnlockedPagination.build();

  flushSync(() => {
    manualUnlockedState.created = true;
    manualUnlockedState.items = [];
    manualUnlockedState.page = 1;
  });
  renderManualUnlockedButtons();
  void loadManualUnlockedPage(1, runner);
  runner.log(`${dateTime()} Pagination lock:false 已创建`);
}

function destroyManualPagination(runner) {
  if (!manualPagination) return;

  manualPagination.destroy();
  manualPagination = null;
  manualLoadId += 1;
  flushSync(() => {
    manualState.created = false;
    manualState.loading = false;
    manualState.page = 1;
    manualState.items = [];
  });
  renderManualButtons();
  renderManualResult();
  runner.log(`${dateTime()} Pagination 已销毁`);
}

function destroyManualUnlockedPagination(runner) {
  if (!manualUnlockedPagination) return;

  manualUnlockedPagination.destroy();
  manualUnlockedPagination = null;
  manualUnlockedLoadId += 1;
  flushSync(() => {
    manualUnlockedState.created = false;
    manualUnlockedState.loading = false;
    manualUnlockedState.page = 1;
    manualUnlockedState.items = [];
  });
  renderManualUnlockedButtons();
  renderManualUnlockedResult();
  runner.log(`${dateTime()} Pagination lock:false 已销毁`);
}

function bindEvents(runner) {
  const container = document.getElementById('manual-demo');
  if (!container) return;

  container.addEventListener('click', (event) => {
    const id = event.target.id;
    if (id === 'btn-pagination-create') createManualPagination(runner);
    if (id === 'btn-pagination-destroy') destroyManualPagination(runner);
    if (id === 'btn-pagination-create-go') createManualPagination(runner);
    if (id === 'btn-pagination-unlocked-create')
      createManualUnlockedPagination(runner);
    if (id === 'btn-pagination-unlocked-destroy')
      destroyManualUnlockedPagination(runner);
    if (id === 'btn-pagination-unlocked-create-go')
      createManualUnlockedPagination(runner);
  });
}

function pageTextList(root) {
  return Array.from(root.querySelectorAll('[data-page]')).map((node) =>
    node.textContent.trim()
  );
}

// ========== 自动化测试 ==========

export function paginationApp(runner) {
  runner.add('构造器不渲染 DOM', '验证 build 前不挂载、不绑定', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const pagination = new Pagination(container, {
      total: records.length,
      page: { size: PAGE_SIZE, current: 1 },
      count: { sibling: 1, boundary: 1 },
    });

    equal(pagination.runtime.built, false, 'not built');
    equal(pagination.root, null, 'root is empty');
    equal(container.children.length, 0, 'container empty');

    pagination.destroy();
    container.remove();
  });

  runner.add('build 生成 DOM 和 aria', '验证初始结构、更多项和可访问性', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const pagination = new Pagination(container, {
      total: records.length,
      page: { size: PAGE_SIZE, current: 1 },
      count: { sibling: 1, boundary: 1 },
    }).build();

    truthy(pagination.root, 'root exists');
    truthy(hasClass(pagination.root, 'j-pagination'), 'root class');
    equal(
      pagination.root.getAttribute('role'),
      'navigation',
      'navigation role'
    );
    equal(
      pagination.root.querySelector('.pagination').getAttribute('aria-live'),
      'polite',
      'aria live'
    );
    equal(
      textOf(pagination.root.querySelector('[aria-current="page"]')),
      '1',
      'current page'
    );
    equal(
      pagination.root
        .querySelector('[data-page-action="prev"]')
        .getAttribute('aria-disabled'),
      'true',
      'prev disabled'
    );
    equal(
      pagination.root
        .querySelector('[data-page-action="next"]')
        .getAttribute('aria-disabled'),
      'false',
      'next enabled'
    );
    truthy(pagination.root.querySelector('.more svg'), 'more icon');
    equal(pageTextList(pagination.root).join(','), '2,10', 'visible links');

    pagination.destroy();
    container.remove();
  });

  runner.add('go 触发状态和 onChange', '验证 page 参数为 newPage', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const changes = [];

    const pagination = new Pagination(container, {
      total: records.length,
      page: { size: PAGE_SIZE, current: 1 },
      count: { sibling: 1, boundary: 1 },
      onChange: (page, instance) => changes.push([page, instance]),
    }).build();

    pagination.go(3);

    equal(pagination.state.page.current, 3, 'state current');
    equal(changes.length, 1, 'onChange count');
    equal(changes[0][0], 3, 'new page');
    equal(changes[0][1], pagination, 'instance');
    equal(
      textOf(pagination.root.querySelector('[aria-current="page"]')),
      '3',
      'current text'
    );

    pagination.destroy();
    container.remove();
  });

  runner.add('点击下一页', '验证事件委托和禁用状态更新', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const pagination = new Pagination(container, {
      total: records.length,
      page: { size: PAGE_SIZE, current: 1 },
      count: { sibling: 1, boundary: 1 },
    }).build();

    pagination.root.querySelector('[data-page-action="next"]').click();

    equal(pagination.state.page.current, 2, 'next page');
    equal(
      pagination.root
        .querySelector('[data-page-action="prev"]')
        .getAttribute('aria-disabled'),
      'false',
      'prev enabled'
    );

    pagination.destroy();
    container.remove();
  });

  runner.add(
    'update 重新计算页数',
    '验证 total 改变时 current 自动夹取',
    () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const pagination = new Pagination(container, {
        total: records.length,
        page: { size: PAGE_SIZE, current: 10 },
        count: { sibling: 1, boundary: 1 },
      }).build();

      pagination.update({ total: 6 });

      equal(pagination.state.pageCount, 3, 'page count');
      equal(pagination.state.page.current, 3, 'clamped current');
      equal(
        textOf(pagination.root.querySelector('[aria-current="page"]')),
        '3',
        'current text'
      );

      pagination.destroy();
      container.remove();
    }
  );

  runner.add('模拟 1 秒数据返回', '验证 10 页数据、每页 2 条', async () => {
    const container = document.createElement('div');
    const result = document.createElement('div');
    document.body.append(container, result);

    const pagination = new Pagination(container, {
      total: records.length,
      page: { size: PAGE_SIZE, current: 1 },
      count: { sibling: 1, boundary: 1 },
      onChange: async (page) => {
        result.textContent = 'loading';
        const data = await fetchPage(page);
        result.textContent = data.items.map((item) => item.title).join(',');
      },
    }).build();

    pagination.go(4);
    equal(result.textContent, 'loading', 'loading state');
    await sleep(1050);
    const expected =
      'No. ** 7 ** item in simulated data,No. ** 8 ** item in simulated data';
    equal(result.textContent, expected, 'loaded page data');
    equal(pagination.state.pageCount, TOTAL_PAGES, 'ten pages');

    pagination.destroy();
    container.remove();
    result.remove();
  });

  runner.add(
    'lock 默认阻止连续切换',
    '验证异步 onChange 返回前不允许再次翻页',
    async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const changes = [];
      let resolveLoad;
      const loading = new Promise((resolve) => {
        resolveLoad = resolve;
      });

      const pagination = new Pagination(container, {
        total: records.length,
        page: { size: PAGE_SIZE, current: 1 },
        count: { sibling: 1, boundary: 1 },
        onChange: (page) => {
          changes.push(page);
          return loading;
        },
      }).build();

      pagination.go(2);
      pagination.go(3);

      equal(pagination.state.page.current, 2, 'locked current');
      equal(pagination.state.locked, true, 'locked state');
      equal(changes.join(','), '2', 'single change');
      equal(
        pagination.root
          .querySelector('[data-page-action="next"]')
          .getAttribute('aria-disabled'),
        'true',
        'next locked'
      );

      resolveLoad();
      await sleep(0);

      equal(pagination.state.locked, false, 'unlocked state');
      pagination.go(3);
      equal(pagination.state.page.current, 3, 'go after unlock');
      equal(changes.join(','), '2,3', 'second change after unlock');

      pagination.destroy();
      container.remove();
    }
  );

  runner.add('lock false 允许连续切换', '验证禁用锁定后可连续翻页', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const changes = [];

    const pagination = new Pagination(container, {
      total: records.length,
      lock: false,
      page: { size: PAGE_SIZE, current: 1 },
      count: { sibling: 1, boundary: 1 },
      onChange: (page) => {
        changes.push(page);
        return sleep(1000);
      },
    }).build();

    pagination.go(2);
    pagination.go(3);

    equal(pagination.state.page.current, 3, 'current page');
    equal(pagination.state.locked, false, 'unlocked state');
    equal(changes.join(','), '2,3', 'continuous changes');

    pagination.destroy();
    container.remove();
  });

  runner.add('destroy 清理 DOM', '验证销毁后容器清空', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const pagination = new Pagination(container, {
      total: records.length,
      page: { size: PAGE_SIZE, current: 1 },
      count: { sibling: 1, boundary: 1 },
    }).build();

    pagination.destroy();

    equal(container.children.length, 0, 'container cleared');
    equal(pagination.runtime.destroyed, true, 'destroyed');

    container.remove();
  });

  runner.log('Pagination 组件测试已加载。');
}

export function paginationSetup(runner) {
  mountDemo();
  bindEvents(runner);
  renderManualResult();
  renderManualUnlockedResult();
}

export function paginationReset() {
  cleanup();
  flushSync(() => {
    manualState.created = false;
    manualState.loading = false;
    manualState.page = 1;
    manualState.items = [];
    manualUnlockedState.created = false;
    manualUnlockedState.loading = false;
    manualUnlockedState.page = 1;
    manualUnlockedState.items = [];
  });
  mountDemo();
  renderManualResult();
  renderManualUnlockedResult();
}

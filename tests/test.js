import {
  createDeepStore,
  createEffect,
  flushSync,
  jsx,
} from 'vanilla-signal';

import { Offcanvas, q } from '../dist/index.js?v=1';
import config from './config.test.js';
import { TestRunner, dateTime } from './helpers.js';

// ========== SPA Router ==========

const router = createDeepStore({ slug: '' });

function navigate(slug) {
  flushSync(() => {
    router.slug = slug;
  });
  history.pushState({ slug }, '', `#${slug}`);
}

window.addEventListener('popstate', (e) => {
  flushSync(() => {
    router.slug = e.state?.slug || '';
  });
});

// ========== Lazy App Loader ==========

const appModules = {};

function summaryText(meta = {}, slug = '') {
  const name = meta.name || slug;
  if (meta.extends) {
    return `基于 <b>${meta.extends}</b> 实现，${name} 组件测试。`;
  }
  return `轻量独立组件，${name} 组件测试。`;
}

async function loadApp(slug) {
  if (appModules[slug]) return appModules[slug];

  const entry = config.find((c) => c.slug === slug);
  if (!entry) return null;

  try {
    const mod = await import(`./${slug}.app.js`);
    appModules[slug] = {
      mount: mod[`${slug}App`],
      setup: mod[`${slug}Setup`],
      reset: mod[`${slug}Reset`],
    };
    return appModules[slug];
  } catch {
    return null;
  }
}

// ========== UI Shell ==========

function createShell() {
  const app = q('#app');
  app.textContent = '';
  app.innerHTML = `
    <div id="test-content"></div>
    <div id="offcanvas-container"></div>
  `;
}

function renderHome() {
  const content = q('#test-content');
  if (!content) return;
  content.textContent = '';
  content.innerHTML = `
    <section class="topbar">
      <div>
        <h1>JUI Component Test</h1>
        <div class="summary">vanilla-jui 组件测试平台。点击菜单选择组件。</div>
      </div>
    </section>
    <section class="main-layout">
      <div class="panel">
        <div class="panel-head"><h2>组件列表</h2></div>
        <div class="panel-body">
          <div class="test-list" id="home-list"></div>
        </div>
      </div>
    </section>
  `;

  const list = q('#home-list');
  if (!list) return;
  for (const item of config) {
    const row = document.createElement('div');
    row.className = 'test-row';
    row.innerHTML = `
      <span class="badge">APP</span>
      <div>
        <div class="test-name">${item.name}</div>
        <div class="test-detail">${item.extends ? `Based on <b>${item.extends}</b> implementation` : 'Individual lightweight component'}</div>
      </div>
      <button class="j-button is-primary is-sm" type="button">进入</button>
    `;
    q('button', row).addEventListener('click', () => navigate(item.slug));
    list.appendChild(row);
  }
}

async function renderApp(slug) {
  const content = q('#test-content');
  if (!content) return;

  const entry = await loadApp(slug);
  if (!entry) {
    content.innerHTML =
      '<div class="panel"><div class="panel-body"><p>未找到该组件测试。</p></div></div>';
    return;
  }

  const runner = new TestRunner();
  entry.mount(runner);

  const meta = config.find((c) => c.slug === slug) || {};

  content.textContent = '';
  content.innerHTML = `
    <section class="topbar">
      <div>
        <h1>${meta.name || slug}</h1>
        <div class="summary">${summaryText(meta, slug)}</div>
      </div>
      <div class="topbar-actions">
        <button id="run-all" class="j-button is-primary">运行全部测试</button>
        <button id="btn-reset" class="j-button is-outline">重置</button>
        <button id="btn-menu" class="j-button is-outline" type="button">菜单</button>
      </div>
    </section>
    <section class="stats">
      <div class="stat"><strong id="stat-total">0</strong><span>总测试</span></div>
      <div class="stat"><strong id="stat-pass">0</strong><span>通过</span></div>
      <div class="stat"><strong id="stat-fail">0</strong><span>失败</span></div>
      <div class="stat"><strong id="stat-pending">0</strong><span>待运行</span></div>
    </section>
    <section class="main-layout">
      <div class="panel">
        <div class="panel-head">
          <h2>自动化测试</h2>
          <span id="run-state" class="badge">IDLE</span>
        </div>
        <div class="panel-body">
          <div id="test-list" class="test-list"></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>手动测试</h2></div>
        <div class="panel-body">
          <div class="test-wrap">
            <div class="test-box">
              <div id="manual-buttons" class="demo-buttons"></div>
              <div id="manual-demo" class="fixture-box"></div>
            </div>
          </div>
          <div class="log-box">
            <div class="log-header">
              <h2>运行日志</h2>
              <button id="clear-log" class="j-button is-outline is-sm">清空</button>
            </div>
            <div id="log" class="log"></div>
          </div>
        </div>
      </div>
    </section>
  `;

  const testList = q('#test-list');
  if (testList) runner.mount(testList);

  entry.setup?.(runner);

  q('#run-all')?.addEventListener('click', () => runner.runAll());
  q('#btn-reset')?.addEventListener('click', () => {
    runner.reset();
    entry.reset?.();
  });
  q('#btn-menu')?.addEventListener('click', openMenu);
  q('#clear-log')?.addEventListener('click', () => {
    runner.logs = [];
    const logEl = q('#log');
    if (logEl) logEl.textContent = '';
  });
}

// ========== Offcanvas Menu ==========

let menuInstance = null;

function renderMenuContent() {
  return jsx('div', {
    style: 'padding: 16px;',
    children: [
      jsx('div', {
        style: 'font-weight: 600; margin-bottom: 12px;',
        children: '导航',
      }),
      jsx('div', {
        children: [
          jsx('div', {
            style: 'padding: 8px 0; cursor: pointer;',
            onClick: () => {
              navigate('');
              menuInstance?.hide();
            },
            children: 'Home',
          }),
          ...config.map((item) =>
            jsx('div', {
              style: 'padding: 8px 0; cursor: pointer;',
              onClick: () => {
                navigate(item.slug);
                menuInstance?.hide();
              },
              children: item.name,
            })
          ),
        ],
      }),
    ],
  });
}

function openMenu() {
  if (menuInstance) {
    menuInstance.show();
    return;
  }
  menuInstance = new Offcanvas({
    direction: 'right',
    overlay: true,
    bgClose: true,
    content: renderMenuContent(),
  });
  menuInstance.show();
}

// ========== Init ==========

function init() {
  createShell();

  const initial = location.hash.slice(1);
  if (initial && config.some((c) => c.slug === initial)) {
    navigate(initial);
  } else {
    renderHome();
  }

  createEffect(() => {
    const slug = router.slug;
    if (slug && config.some((c) => c.slug === slug)) {
      void renderApp(slug);
    } else {
      renderHome();
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

export { TestRunner, dateTime };

/**
 * Browser test helpers shared by visual semi-automatic test pages.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tick = () => sleep(0);
const wait = sleep;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message} (expected ${expected}, got ${actual})`);
  }
}

function notEqual(actual, expected, message) {
  if (Object.is(actual, expected)) {
    throw new Error(`${message} (should not be ${expected})`);
  }
}

function truthy(value, message) {
  if (!value) throw new Error(`${message} (got ${value})`);
}

function falsy(value, message) {
  if (value) throw new Error(`${message} (got ${value})`);
}

function deepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
    );
  }
}

function textOf(el) {
  if (!el) return '';
  return el.textContent.replace(/\s+/g, ' ').trim();
}

function hasClass(el, className) {
  return el?.classList.contains(className) ?? false;
}

function addClass(el, className) {
  el?.classList.add(className);
}

function removeClass(el, className) {
  el?.classList.remove(className);
}

class TestRunner {
  constructor() {
    this.tests = [];
    this.rows = new Map();
    this.stats = { pass: 0, fail: 0, pending: 0, running: 0 };
    this.logs = [];
  }

  add(name, detail, fn) {
    this.tests.push({ name, detail, fn, status: 'pending', error: null });
    this.stats.pending++;
  }

  mount(container) {
    container.textContent = '';
    this.tests.forEach((test, index) => {
      const row = document.createElement('div');
      row.className = 'test-row';
      row.innerHTML = `
        <span class="badge">PENDING</span>
        <div>
          <div class="test-name"></div>
          <div class="test-detail"></div>
        </div>
        <button class="j-button is-primary is-sm" type="button">运行</button>
      `;
      row.querySelector('.test-name').textContent = test.name;
      row.querySelector('.test-detail').textContent = test.detail;
      row
        .querySelector('button')
        .addEventListener('click', () => void this.runOne(index));
      container.appendChild(row);
      this.rows.set(test, row);
    });
    this.updateStats();
  }

  reset() {
    for (const test of this.tests) {
      if (test.status !== 'pending') this.setStatus(test, 'pending');
    }
    this.logs = [];
    const logEl = document.getElementById('log');
    if (logEl) logEl.textContent = '';
    this.updateStats();
  }

  setStatus(test, status, message = '') {
    if (test.status !== status) {
      if (Object.hasOwn(this.stats, test.status)) this.stats[test.status]--;
      if (Object.hasOwn(this.stats, status)) this.stats[status]++;
      test.status = status;
    }
    const row = this.rows.get(test);
    if (row) {
      row.querySelector('.badge').className = `badge ${status}`;
      row.querySelector('.badge').textContent = status.toUpperCase();
      row.querySelector('.test-detail').textContent = message || test.detail;
    }
    this.updateStats();
  }

  updateStats() {
    const el = (id) => document.getElementById(id);
    el('stat-total').textContent = this.tests.length;
    el('stat-pass').textContent = this.stats.pass;
    el('stat-fail').textContent = this.stats.fail;
    el('stat-pending').textContent = this.stats.pending;
    const state = document.getElementById('run-state');
    if (state) {
      state.className = `badge ${this.stats.running > 0 ? 'running' : ''}`;
      state.textContent = this.stats.running > 0 ? 'RUNNING' : 'IDLE';
    }
  }

  async runOne(index) {
    const test = this.tests[index];
    if (!test) return;
    this.setStatus(test, 'running');
    try {
      await test.fn();
      test.error = null;
      this.setStatus(test, 'pass');
      this.log(`✓ ${test.name}`);
    } catch (error) {
      test.error = error.message;
      this.setStatus(test, 'fail', error.message);
      this.log(`✗ ${test.name}\n  ${error.message}`);
      console.error(error);
    }
  }

  async runAll() {
    for (let i = 0; i < this.tests.length; i++) {
      await this.runOne(i);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  log(message) {
    this.logs.push(message);
    const logEl = document.getElementById('log');
    if (logEl) {
      logEl.textContent = this.logs.join('\n');
      logEl.scrollTop = logEl.scrollHeight;
    }
  }
}

const dateTime = () => new Date().toLocaleTimeString();

export {
  TestRunner,
  sleep,
  tick,
  wait,
  assert,
  equal,
  notEqual,
  truthy,
  falsy,
  deepEqual,
  textOf,
  hasClass,
  addClass,
  removeClass,
  dateTime,
};

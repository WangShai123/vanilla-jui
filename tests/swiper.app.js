import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Swiper } from '../dist/index.js?v=8';
import { equal, truthy, falsy, hasClass, dateTime } from './helpers.js';

function cleanup() {
  if (swiperInstance) {
    swiperInstance.destroy();
    swiperInstance = null;
  }
  const mount = document.getElementById('swiper-mount');
  if (mount) mount.textContent = '';
}

function freshMount() {
  cleanup();
  const mount = document.getElementById('swiper-mount');
  if (!mount) {
    flushSync(() => {
      ui.created = true;
    });
    mountUI();
  }
  const el = document.getElementById('swiper-mount');
  if (el && !el.querySelector('.swiper-wrapper')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'swiper-wrapper';
    wrapper.innerHTML = `
      <a href="#slide-1" class="swiper-slide"><span>1</span></a>
      <a href="#slide-2" class="swiper-slide"><span>2</span></a>
      <a href="#slide-3" class="swiper-slide"><span>3</span></a>
    `;
    el.appendChild(wrapper);
  }
  return document.getElementById('swiper-mount');
}

// ========== 手动测试 UI ==========

let swiperInstance = null;

const ui = createDeepStore({ created: false, playing: false });

function mountUI() {
  const btnContainer = document.getElementById('manual-buttons');
  const demoContainer = document.getElementById('manual-demo');
  if (!btnContainer || !demoContainer) return;

  render(
    () =>
      jsx('div', {
        className: 'demo-buttons',
        children: [
          jsx('button', {
            id: 'btn-create',
            type: 'button',
            className: () => `j-button is-primary is-sm`,
            disabled: () => ui.created,
            children: '创建实例',
          }),
          jsx('button', {
            id: 'btn-next',
            type: 'button',
            className: 'j-button is-outline is-sm',
            disabled: () => !ui.created,
            children: '下一张',
          }),
          jsx('button', {
            id: 'btn-prev',
            type: 'button',
            className: 'j-button is-outline is-sm',
            disabled: () => !ui.created,
            children: '上一张',
          }),
          jsx('button', {
            id: 'btn-pause',
            type: 'button',
            className: 'j-button is-default is-sm',
            disabled: () => !ui.playing || !ui.created,
            children: '暂停',
          }),
          jsx('button', {
            id: 'btn-play',
            type: 'button',
            className: 'j-button is-default is-sm',
            disabled: () => ui.playing || !ui.created,
            children: '播放',
          }),
          jsx('button', {
            id: 'btn-destroy',
            type: 'button',
            className: 'j-button is-error is-sm',
            disabled: () => !ui.created,
            children: '销毁实例',
          }),
        ],
      }),
    btnContainer
  );

  render(
    () =>
      Show({
        when: () => ui.created,
        children: () =>
          jsx('div', {
            id: 'swiper-mount',
            style: 'width:min(420px,100%)',
          }),
      }),
    demoContainer
  );
}

const SLIDE_DATA = [
  { image: 'https://placehold.co/600x400?text=Slide+1', title: 'Slide 1' },
  { image: 'https://placehold.co/600x400?text=Slide+2', title: 'Slide 2' },
  { image: 'https://placehold.co/600x400?text=Slide+3', title: 'Slide 3' },
];

function createInstance(runner, options = {}) {
  flushSync(() => {
    ui.created = true;
  });
  mountUI();

  const mount = document.getElementById('swiper-mount');
  if (!mount) {
    runner.log(`${dateTime()} 挂载容器不存在`);
    return;
  }
  try {
    swiperInstance = new Swiper(mount, {
      data: SLIDE_DATA,
      autoplay: true,
      delay: 1000,
      ...options,
    });
    flushSync(() => {
      ui.playing = true;
    });
    runner.log(`${dateTime()} 实例已创建, index=${swiperInstance.state.index}`);
  } catch (e) {
    runner.log(`${dateTime()} 创建失败: ${e.message}`);
  }
}

function destroyInstance(runner) {
  if (swiperInstance) {
    swiperInstance.destroy();
    swiperInstance = null;
  }
  flushSync(() => {
    ui.created = false;
    ui.playing = false;
  });
  mountUI();
  runner.log(`${dateTime()} 实例已销毁`);
}

function bindEvents(runner) {
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[id]');
    const id = btn?.id;

    if (id === 'btn-create' && !swiperInstance) {
      createInstance(runner);
    }

    if (id === 'btn-next' && swiperInstance) {
      try {
        swiperInstance.next();
        runner.log(`${dateTime()} next → index=${swiperInstance.state.index}`);
      } catch (err) {
        runner.log(`${dateTime()} next 失败: ${err.message}`);
      }
    }

    if (id === 'btn-prev' && swiperInstance) {
      try {
        swiperInstance.prev();
        runner.log(`${dateTime()} prev → index=${swiperInstance.state.index}`);
      } catch (err) {
        runner.log(`${dateTime()} prev 失败: ${err.message}`);
      }
    }

    if (id === 'btn-pause' && swiperInstance) {
      swiperInstance.pause();
      flushSync(() => {
        ui.playing = false;
      });
      runner.log(`${dateTime()} paused, timer=${swiperInstance.runtime.timer}`);
    }

    if (id === 'btn-play' && swiperInstance) {
      swiperInstance.play();
      flushSync(() => {
        ui.playing = true;
      });
      runner.log(
        `${dateTime()} playing, timer=${swiperInstance.runtime.timer}`
      );
    }

    if (id === 'btn-destroy' && swiperInstance) {
      destroyInstance(runner);
    }
  });
}

function resetManual() {
  cleanup();
  flushSync(() => {
    ui.created = false;
    ui.playing = false;
  });
  mountUI();
}

// ========== 自动化测试 ==========

export function swiperApp(runner) {
  runner.add('初始化环境', '渲染 swiper 挂载容器', () => {
    freshMount();
    truthy(document.getElementById('swiper-mount'), 'mount container exists');
  });

  runner.add('创建实例', '验证动态生成 slide 和 DOM 结构', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA });

    equal(swiper.state.index, 1, 'initial index (loop default)');
    equal(swiper.dom.slides.length, 5, 'slides count (3 + 2 clones)');
    truthy(swiper.dom.wrapper, 'wrapper exists');
    truthy(swiper.dom.prevButton, 'prev button created');
    truthy(swiper.dom.nextButton, 'next button created');
    truthy(swiper.dom.pagination, 'pagination created');
    equal(swiper.dom.bullets.length, 3, 'bullets count');
    truthy(swiper.dom.createdRoot, 'root was created by Swiper');

    swiper.destroy();
    equal(swiper.runtime.destroyed, true, 'instance destroyed');
  });

  runner.add('loop 模式', '验证 loop 克隆 slide', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA, loop: true });

    equal(swiper.state.index, 1, 'loop starts at index 1');
    equal(swiper.dom.slides.length, 5, 'loop adds 2 clone slides');
    truthy(
      swiper.dom.slides[0].hasAttribute('data-clone'),
      'first slide is clone'
    );
    truthy(
      swiper.dom.slides[4].hasAttribute('data-clone'),
      'last slide is clone'
    );

    swiper.destroy();
  });

  runner.add('loop 边界回绕', '验证 next/prev 跨边界无缝回绕', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA, loop: true });

    swiper.slideTo(3);
    swiper.state.animating = false;
    equal(swiper.state.index, 3, 'at last real slide');

    swiper.next();
    equal(swiper.state.index, 4, 'next enters tail clone');
    swiper.onTransitionEnd();
    equal(swiper.state.index, 1, 'tail clone wraps to first real slide');

    swiper.prev();
    equal(swiper.state.index, 0, 'prev enters head clone');
    swiper.onTransitionEnd();
    equal(swiper.state.index, 3, 'head clone wraps to last real slide');

    swiper.destroy();
  });

  runner.add('next/prev 导航', '验证 slideTo 切换', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA });

    equal(swiper.state.index, 1, 'start at 1 (loop default)');
    swiper.slideTo(2);
    swiper.state.animating = false;
    equal(swiper.state.index, 2, 'next → 2');
    swiper.slideTo(3);
    swiper.state.animating = false;
    equal(swiper.state.index, 3, 'next → 3');
    swiper.slideTo(2);
    swiper.state.animating = false;
    equal(swiper.state.index, 2, 'prev → 2');

    swiper.destroy();
  });

  runner.add('slideTo 跳转', '验证指定索引跳转', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA });

    // @todo

    swiper.destroy();
  });

  runner.add('autoplay', '验证 play/pause/resume', async () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, {
      data: SLIDE_DATA,
      delay: 100,
    });

    // @todo

    swiper.pause();
    swiper.destroy();
  });

  runner.add('updateControls', '验证 pagination 和 navigation 状态', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA });

    // @todo

    swiper.destroy();
  });

  runner.add('update 尺寸', '验证 update 重新计算', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA });

    const w = swiper.state.width;
    equal(typeof w, 'number', 'width is number');
    truthy(w > 0, 'width > 0');

    swiper.update();
    equal(swiper.state.width, w, 'width unchanged after update');

    swiper.destroy();
  });

  runner.add('destroy 清理', '验证销毁后状态', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA });

    swiper.destroy();
    equal(swiper.runtime.destroyed, true, 'destroyed flag');
    falsy(swiper.dom.root, 'root cleared');
    falsy(swiper.dom.wrapper, 'wrapper cleared');
  });

  runner.add('清理环境', '销毁实例并移除 fixture', () => {
    cleanup();
    flushSync(() => {
      ui.created = false;
    });
    mountUI();
    falsy(document.getElementById('swiper-mount'), 'mount removed');
  });

  runner.log('Swiper 组件测试已加载。');
}

export function swiperSetup(runner) {
  mountUI();
  bindEvents(runner);
}

export function swiperReset() {
  resetManual();
}

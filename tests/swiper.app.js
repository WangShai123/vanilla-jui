import { createDeepStore, flushSync, jsx, Show, render } from 'vanilla-signal';

import { Swiper } from '../dist/index.js?v=9';
import { equal, truthy, falsy, hasClass, wait, dateTime } from './helpers.js';

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
            id: 'btn-update-data',
            type: 'button',
            className: 'j-button is-outline is-sm',
            disabled: () => !ui.created,
            children: '更新数据',
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

const NEW_DATA = [
  { image: 'https://placehold.co/600x400?text=New+1', title: 'New 1' },
  { image: 'https://placehold.co/600x400?text=New+2', title: 'New 2' },
  { image: 'https://placehold.co/600x400?text=New+3', title: 'New 3' },
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
    }).build();
    flushSync(() => {
      ui.playing = true;
    });
    runner.log(
      `${dateTime()} 实例已创建, index=${swiperInstance.state.index}, trackIndex=${swiperInstance.state.trackIndex}`
    );
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
        runner.log(
          `${dateTime()} next → index=${swiperInstance.state.index}, trackIndex=${swiperInstance.state.trackIndex}`
        );
      } catch (err) {
        runner.log(`${dateTime()} next 失败: ${err.message}`);
      }
    }

    if (id === 'btn-prev' && swiperInstance) {
      try {
        swiperInstance.prev();
        runner.log(
          `${dateTime()} prev → index=${swiperInstance.state.index}, trackIndex=${swiperInstance.state.trackIndex}`
        );
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

    if (id === 'btn-update-data' && swiperInstance) {
      try {
        swiperInstance.updateData(NEW_DATA);
        runner.log(
          `${dateTime()} 数据已更新, count=${swiperInstance.realCount}, index=${swiperInstance.state.index}, trackIndex=${swiperInstance.state.trackIndex}`
        );
      } catch (err) {
        runner.log(`${dateTime()} 更新数据失败: ${err.message}`);
      }
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
    const swiper = new Swiper(mount, { data: SLIDE_DATA }).build();

    equal(swiper.state.index, 0, 'initial real index');
    equal(swiper.realIndex, 0, 'realIndex getter');
    equal(swiper.state.trackIndex, 1, 'initial track index (loop default)');
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

  runner.add('延迟构建', '验证实例化后 build 才绑定 DOM', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA });

    falsy(swiper.dom.root, 'root is empty before build');
    equal(swiper.dom.slides.length, 0, 'slides are empty before build');

    swiper.build();
    truthy(swiper.dom.root, 'root exists after build');
    equal(swiper.dom.slides.length, 5, 'slides are built after build');

    swiper.destroy();
  });

  runner.add('绑定已有 DOM', '验证容器内唯一 .j-swiper 会作为 root', () => {
    const mount = freshMount();
    mount.textContent = '';
    mount.innerHTML = `
      <section class="j-swiper">
        <div class="swiper-wrapper">
          <div class="swiper-slide">Static 1</div>
          <div class="swiper-slide">Static 2</div>
        </div>
      </section>
    `;

    const root = mount.querySelector('.j-swiper');
    const swiper = new Swiper(mount, {
      autoplay: false,
      loop: false,
    }).build();

    equal(swiper.dom.root, root, 'inner .j-swiper is used as root');
    equal(swiper.dom.mountTarget, null, 'existing DOM has no mount target');
    equal(swiper.dom.slides.length, 2, 'existing slides are detected');

    swiper.destroy();
  });

  runner.add('loop 模式', '验证 loop 克隆 slide', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA, loop: true }).build();

    equal(swiper.state.index, 0, 'loop starts at real index 0');
    equal(swiper.state.trackIndex, 1, 'loop starts at track index 1');
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
    const swiper = new Swiper(mount, { data: SLIDE_DATA, loop: true }).build();

    swiper.slideTo(2);
    swiper.state.animating = false;
    equal(swiper.state.index, 2, 'at last real slide');
    equal(swiper.state.trackIndex, 3, 'at last real track slide');

    swiper.next();
    equal(swiper.state.index, 0, 'next enters tail clone as first real slide');
    equal(swiper.state.trackIndex, 4, 'next enters tail clone');
    swiper.onTransitionEnd();
    equal(swiper.state.index, 0, 'tail clone wraps to first real slide');
    equal(swiper.state.trackIndex, 1, 'tail clone wraps to track index 1');

    swiper.prev();
    equal(swiper.state.index, 2, 'prev enters head clone as last real slide');
    equal(swiper.state.trackIndex, 0, 'prev enters head clone');
    swiper.onTransitionEnd();
    equal(swiper.state.index, 2, 'head clone wraps to last real slide');
    equal(swiper.state.trackIndex, 3, 'head clone wraps to last real track');

    swiper.destroy();
  });

  runner.add('next/prev 导航', '验证 slideTo 切换', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA }).build();

    equal(swiper.state.index, 0, 'start at real index 0');
    equal(swiper.state.trackIndex, 1, 'start at track index 1');
    swiper.slideTo(1);
    swiper.state.animating = false;
    equal(swiper.state.index, 1, 'slideTo real index 1');
    equal(swiper.state.trackIndex, 2, 'track index 2');
    swiper.slideTo(2);
    swiper.state.animating = false;
    equal(swiper.state.index, 2, 'slideTo real index 2');
    equal(swiper.state.trackIndex, 3, 'track index 3');
    swiper.slideTo(1);
    swiper.state.animating = false;
    equal(swiper.state.index, 1, 'slideTo real index 1');
    equal(swiper.state.trackIndex, 2, 'track index 2');

    swiper.destroy();
  });

  runner.add('slideTo 跳转', '验证指定索引跳转', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA }).build();

    swiper.slideTo(2);
    swiper.state.animating = false;
    equal(swiper.state.index, 2, 'slideTo uses real index');
    equal(swiper.state.trackIndex, 3, 'track index is internal');
    swiper.slideTo(99);
    swiper.state.animating = false;
    equal(swiper.state.index, 2, 'slideTo clamps real index');

    swiper.destroy();
  });

  runner.add('autoplay', '验证 play/pause/resume', async () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, {
      data: SLIDE_DATA,
      delay: 40,
    }).build();

    truthy(swiper.runtime.timer, 'timer starts when autoplay is enabled');
    equal(swiper.state.index, 0, 'autoplay starts at first real slide');

    await wait(70);
    truthy(swiper.state.index > 0, 'autoplay advances slide');
    truthy(swiper.state.animating, 'autoplay starts transition');

    swiper.pause();
    falsy(swiper.runtime.timer, 'pause clears timer');

    swiper.state.animating = false;
    swiper.resume();
    truthy(swiper.runtime.timer, 'resume restarts timer');

    swiper.pause();
    swiper.update({ delay: 0 });
    truthy(swiper.runtime.timer, 'delay 0 still starts a guarded timer');

    swiper.pause();
    swiper.destroy();
  });

  runner.add('updateControls', '验证 pagination 和 navigation 状态', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, {
      data: SLIDE_DATA,
      loop: false,
      autoplay: false,
    }).build();

    equal(swiper.dom.bullets.length, 3, 'pagination bullet count');
    truthy(hasClass(swiper.dom.bullets[0], 'is-active'), 'first bullet active');
    equal(
      swiper.dom.bullets[0].getAttribute('aria-current'),
      'true',
      'active bullet aria-current'
    );
    truthy(
      hasClass(swiper.dom.prevButton, 'is-disabled'),
      'prev disabled at first slide'
    );
    truthy(swiper.dom.prevButton.disabled, 'prev button disabled property');
    falsy(
      hasClass(swiper.dom.nextButton, 'is-disabled'),
      'next enabled at first slide'
    );

    swiper.slideTo(2);
    swiper.state.animating = false;
    equal(swiper.state.index, 2, 'slideTo last real index');
    truthy(hasClass(swiper.dom.bullets[2], 'is-active'), 'last bullet active');
    equal(
      swiper.dom.bullets[2].getAttribute('aria-current'),
      'true',
      'last bullet aria-current'
    );
    falsy(
      hasClass(swiper.dom.prevButton, 'is-disabled'),
      'prev enabled at last slide'
    );
    truthy(
      hasClass(swiper.dom.nextButton, 'is-disabled'),
      'next disabled at last slide'
    );
    truthy(swiper.dom.nextButton.disabled, 'next button disabled property');

    swiper.updateData([
      { image: 'https://placehold.co/600x400?text=A', title: 'A' },
      { image: 'https://placehold.co/600x400?text=B', title: 'B' },
    ]);
    equal(swiper.dom.bullets.length, 2, 'pagination updates after data change');
    truthy(hasClass(swiper.dom.bullets[1], 'is-active'), 'active clamps');
    truthy(
      hasClass(swiper.dom.nextButton, 'is-disabled'),
      'next stays disabled after data clamp'
    );

    swiper.destroy();
  });

  runner.add('update 尺寸', '验证 update 重新计算', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA }).build();

    const w = swiper.state.width;
    equal(typeof w, 'number', 'width is number');
    truthy(w > 0, 'width > 0');

    swiper.update();
    equal(typeof swiper.state.width, 'number', 'width remains number');

    swiper.destroy();
  });

  runner.add('updateData 数据更新', '验证 updateData 重建 slide', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA }).build();

    swiper.updateData([
      { image: 'https://placehold.co/600x400?text=A', title: 'A' },
      { image: 'https://placehold.co/600x400?text=B', title: 'B' },
    ]);

    equal(swiper.realCount, 2, 'realCount updated');
    equal(swiper.dom.bullets.length, 2, 'bullets updated');
    equal(swiper.dom.slides.length, 4, 'loop clones rebuilt');
    equal(swiper.state.index, 0, 'real index remains valid');
    equal(swiper.state.trackIndex, 1, 'track index recalculated');

    swiper.update({ data: SLIDE_DATA });
    equal(swiper.realCount, 3, 'update({ data }) rebuilds data');

    swiper.destroy();
  });

  runner.add('destroy 清理', '验证销毁后状态', () => {
    const mount = freshMount();
    const swiper = new Swiper(mount, { data: SLIDE_DATA }).build();

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

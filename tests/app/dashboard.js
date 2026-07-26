const { createSignal, createEffect, jsx, insert, html } = vanillaSignal;
const { t } = vanillaSignalI18n;

const {
  Theme,
  Offcanvas,
  Accordion,
  Toast,
  Modal,
  Flow,
  Tabs,
  Drop,
  Tooltip,
  Parabola,
  Menu,
  Validator,
  q,
  all,
  service,
  icon,
  timer,
  listen,
} = jui;

const locales = {
  en: {
    addTab: 'Add Tab',
    removeTab: 'Remove Tab',
    background: 'Background',
    interactiveComponent: 'Interactive Components',
    borderAndSeparator: 'Borders, Separators',
    borderAndFocusRingAndDisabledText: 'Border, Focus Ring, Disabled Text',
    solidBackgroundColorDisabledText: 'Solid Background, Disabled Text',
    secondaryTextAndLink: 'Secondary Text, Link',
    highContrastText: 'High Contrast Text',
    backgroundColors: 'Background Colors',
    white: 'White',
    'step1-5BackgroundColors': 'Step 1–5 Background Colors',
    step12labelColors: 'Step 12 Labels',
    'step11-12labelColors': 'Step 11, 12 Labels',
    step11labelsStep12TextColor: 'Step 11 Labels, Step 12 Text',
    'step11-12TextColor': 'Step 11, 12 Text',
    variantCode: 'Variant Code',
    suggestedUsage: 'Usage',
    suggestedPairsWith: 'Pairs With',
    colorValue: 'Color Value',
    thisIsAModal: 'This is a modal.',
    thisIsAFullWidthModal: 'This is a full-width modal.',
    closeModal: 'Close Modal!',
    modalHidden: 'Modal Hidden!',
    modalConfirmed: 'Modal Confirmed!',
    showModal: 'Open Modal!',
    modalShown: 'Modal Shown!',
    noDataSubmitted: 'No data submitted!',
    updateSuccess: 'Update successful!',
    usernameRequired: 'Username is required!',
    passwordRequired: 'Password is required!',
    countryRequired: 'Country is required!',
    edit: 'Edit',
    submit: 'Submit',
    username: 'Username',
    password: 'Password',
    pleaseEnterUsername: 'Please enter your username',
    pleaseEnterPassword: 'Please enter your password',
    country: 'Country',
    china: 'China',
    us: 'United States',
    uk: 'United Kingdom',
    description: 'Description',
    pleaseEnterDescription: 'Please enter your description',
    user: 'User',
    infoToastMessage: 'This is a info toast Message',
    primaryToastMessage: 'This is a primary toast Message',
    successToastMessage: 'This is a success toast Message',
    warningToastMessage: 'This is a warning toast Message',
    errorToastMessage: 'This is a error toast Message',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    disabledItem: 'Disabled Item',
    MondayIsTheFirstDay: 'Monday is the first day of the week.',
    TuesdayIsTheSecondDay: 'Tuesday is the second day of the week.',
    WednesdayIsTheThirdDay: 'Wednesday is the third day of the week.',
    liteToastMessage: 'Updated',
    firstItem: 'First Item',
    secondItem: 'Second Item',
    thirdItem: 'Third Item',
    firstItemContent: 'The Content of First Item',
    secondItemContent: 'The Content of Second Item',
    thirdItemContent: 'The Content of Third Item',
    ColorVarCopied: 'CSS color variable copied to clipboard',
    formValidated: 'Form validated',
    emailRequired: 'Email Required',
    invalidEmail: 'Invalid Email',
    emailMinLength: 'Email Minimum length is 8 characters',
    emailMaxLength: 'Email Maximum length is 10 characters',
    noSpace: 'No Space',
    noChinese: 'No Chinese',
    noSpecial: 'No Special Characters',
    passwordRequired: 'Password Required',
    passwordMinLength: 'Password Min Length is 6 characters',
    passwordMaxLength: 'Password Max Length is 8 characters',
    equalToRequired: 'Different Password Warning',
    agreementRequired: 'Please agree to the terms of service',
    FirstLetterCaps: 'The first letter must be capitalized',
  },
  zh: {
    addTab: '添加选项卡',
    removeTab: '移除选项卡',
    background: '背景',
    interactiveComponent: '互动组件',
    borderAndSeparator: '边框和分隔符',
    borderAndFocusRingAndDisabledText: '边框，对焦环，禁用文本',
    solidBackgroundColorDisabledText: '纯色背景，禁用文本',
    secondaryTextAndLink: '辅助文本，链接',
    highContrastText: '高对比度文本',
    backgroundColors: '背景色',
    white: '白色',
    gray: '灰色',
    olive: '橄榄绿',
    tomato: '番茄红',
    red: '红色',
    ruby: '红宝石',
    pink: '粉色',
    violet: '紫罗兰色',
    indigo: '靛蓝色',
    blue: '蓝色',
    teal: '青色',
    green: '绿色',
    grass: '草绿色',
    gold: '金色',
    orange: '橙色',
    amber: '琥珀色',
    yellow: '黄色',
    lime: '酸橙绿',
    mint: '薄荷绿',
    'step1-5BackgroundColors': '编号 1–5 背景色',
    step12labelColors: '编号 12 标签色',
    'step11-12labelColors': '编号 11, 12 标签色',
    step11labelsStep12TextColor: '编号 11 标签色, 编号 12 文本色',
    'step11-12TextColor': '编号 11, 12 文本色',
    variantCode: '变体编码',
    suggestedUsage: '建议用法',
    suggestedPairsWith: '建议搭配',
    colorValue: '色值',
    Tip: '提示',
    thisIsAModal: '这是一个弹窗。',
    Confirm: '确认',
    Cancel: '取消',
    thisIsAFullWidthModal: '这是一个全屏弹窗。',
    'Confirm Logout?': '确认退出登录吗？',
    'Logout Success': '退出登录成功',
    'Processing your request': '正在处理您的请求...',
    'Confirm Dangerous Action?': '确认执行这项危险操作？',
    'Please wait while we process your request. Do not refresh the page.':
      '请稍候，请勿刷新页面。',
    'Request Cancelled': '请求已取消',
    'Request Completed': '请求已完成',
    closeModal: '关闭弹窗！',
    modalHidden: '弹窗已关闭！',
    modalConfirmed: '弹窗已确认！',
    showModal: '打开弹窗！',
    modalShown: '弹窗已打开！',
    noDataSubmitted: '未提交任何数据！',
    updateSuccess: '更新成功！',
    usernameRequired: '用户名不能为空！',
    passwordRequired: '密码不能为空！',
    countryRequired: '国家不能为空！',
    edit: '编辑',
    submit: '提交',
    username: '用户名',
    password: '密码',
    pleaseEnterUsername: '请输入用户名',
    pleaseEnterPassword: '请输入密码',
    country: '国家',
    china: '中国',
    us: '美国',
    uk: '英国',
    description: '描述',
    pleaseEnterDescription: '请输入描述',
    user: '用户',
    infoToastMessage: '这是一条普通信息提示。',
    primaryToastMessage: '这是一条主要信息提示。',
    successToastMessage: '这是一条成功提示消息。',
    warningToastMessage: '这是一条警告提示消息。',
    errorToastMessage: '这是一条错误提示消息。',
    monday: '星期一',
    tuesday: '星期二',
    wednesday: '星期三',
    thursday: '星期四',
    friday: '星期五',
    disabledItem: '禁用项',
    MondayIsTheFirstDay: '星期一为一周的第一天。',
    TuesdayIsTheSecondDay: '星期二为一周的第二天。',
    WednesdayIsTheThirdDay: '星期三为一周的第三天。',
    liteToastMessage: '更新成功',
    firstItem: '选项一',
    secondItem: '选项二',
    thirdItem: '选项三',
    firstItemContent: '选项一的内容区',
    secondItemContent: '选项二的内容区',
    thirdItemContent: '选项三的内容区',
    ColorVarCopied: 'CSS 颜色变量已复制到剪贴板',
    formValidated: '表单验证成功',
    emailRequired: '请输入邮箱',
    invalidEmail: '请输入正确的邮箱',
    emailMinLength: '邮箱长度不能小于8位',
    emailMaxLength: '邮箱长度不能大于10位',
    noSpace: '不允许使用空格',
    noChinese: '不允许使用中文',
    noSpecial: '不允许使用特殊字符',
    passwordRequired: '请输入密码',
    passwordMinLength: '密码长度不能小于6位',
    passwordMaxLength: '密码长度不能大于8位',
    equalToRequired: '两次输入的密码不一致',
    agreementRequired: '请勾选同意协议',
    FirstLetterCaps: '首字母必须大写',
    Back: '返回',
    'Menu Created': '菜单已创建',
    'Menu Destroyed': '菜单已销毁',
    'Create a menu first': '请先创建菜单',
  },
};

const menuItems = [
  {
    title: '交互组件',
    children: [
      { title: { zh: '选项卡', en: 'Tabs' }, link: '#tabs' },
      { title: { zh: '通知', en: 'Toast' }, link: '#toast' },
      { title: { zh: '模态框', en: 'Modal' }, link: '#modal' },
      { title: { zh: '滑动侧边栏', en: 'Offcanvas' }, link: '#offcanvas' },
      { title: { zh: '手风琴', en: 'Accordion' }, link: '#accordion' },
      { title: { zh: '下拉容器', en: 'Drop' }, link: '#drop' },
      { title: { zh: '提示标签', en: 'Tooltip' }, link: '#tooltip' },
      { title: { zh: '抛物线', en: 'Parabola' }, link: '#parabola' },
      { title: { zh: '菜单', en: 'Menu' }, link: '#menu' },
    ],
  },
  {
    title: '表单组件',
    children: [
      { title: { zh: '表单', en: 'Form' }, link: '#form' },
      { title: { zh: '输入框', en: 'Input' }, link: '#input' },
      { title: { zh: '单选框', en: 'Radio' }, link: '#radio' },
      { title: { zh: '复选框', en: 'Checkbox' }, link: '#checkbox' },
      { title: { zh: '开关', en: 'Switch' }, link: '#switch' },
      { title: { zh: '文本域', en: 'Textarea' }, link: '#textarea' },
    ],
  },
  {
    title: '静态组件',
    children: [
      { title: { zh: '按钮', en: 'Button' }, link: '#button' },
      { title: { zh: '头像', en: 'Avatar' }, link: '#avatar' },
      { title: { zh: '徽标', en: 'Badge' }, link: '#badge' },
      { title: { zh: '标签', en: 'Tag' }, link: '#tag' },
      { title: { zh: '提示', en: 'Tip' }, link: '#tip' },
      { title: { zh: '表格', en: 'Table' }, link: '#table' },
      { title: { zh: '面包屑', en: 'Breadcrumb' }, link: '#breadcrumb' },
      { title: { zh: '卡片', en: 'Card' }, link: '#card' },
      { title: { zh: '骨架屏', en: 'Skeleton' }, link: '#skeleton' },
      { title: { zh: '分页', en: 'Pagination' }, link: '#pagination' },
      { title: { zh: '加载状态', en: 'Loading' }, link: '#loading' },
      { title: { zh: '工具栏', en: 'Toolbar' }, link: '#toolbar' },
      { title: { zh: '内容域', en: 'Content' }, link: '#content' },
    ],
  },
];

const { show, info, primary, success, warning, error, lite } = Toast;
const path = window.location.pathname;
const ts = (key) => {
  return t(key, locales);
};
const toggle = (x) => {
  return x.state.visible ? x.hide() : x.show();
};

const header = jsx('header', {
  children: [
    jsx('button', {
      className: 'dashboard-menu j-button is-ghost',
      children: [icon('menu'), jsx('span', { children: ts('Menu') })],
    }),
    jsx('h1', {
      children: 'JUI Dashboard',
    }),
    jsx('button', {
      className: 'j-button is-ghost theme-palette',
      children: [icon('palette'), jsx('span', { children: ts('Theme') })],
    }),
  ],
});
q('.j-background-grid').after(header);
// insert(document.body, header);

/**
 * 生成抽屉菜单
 * @param {Array<Object>} menuItems 菜单项数组
 * @return {string} menuContent 抽屉菜单的HTML字符串
 */
const generateMenu = (menuItems) => {
  let menuContent = '';
  const stack = [...menuItems];
  const hash = location.hash;
  while (stack.length > 0) {
    const item = stack.shift();
    if (item.children) {
      menuContent += `<div class="doc-menu-devider">${item.title}</div>`;
      stack.unshift(...item.children);
    }
    if (item.link) {
      const isCurrent = hash && item.link === hash;
      if (isCurrent) {
        menuContent += `<a href="${item.link}" class="doc-menu-item is-current"><span>${item.title.zh}</span><span>${item.title.en}</span></a>`;
      } else {
        menuContent += `<a href="${item.link}" class="doc-menu-item"><span>${item.title.zh}</span><span>${item.title.en}</span></a>`;
      }
    }
  }
  return menuContent;
};

/**
 * 菜单按钮交互
 */
service.get('menu', () => {
  const menuContainer = jsx('section', {
    className: 'menu-container',
    style: {
      paddingBottom: '3rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 'calc(var(--space)*5)',
    },
    children: html(generateMenu(menuItems)),
  });
  const menuOffcanvas = new Offcanvas({
    content: menuContainer,
    overlay: true,
    id: 'menu-offcanvas',
  });

  const [currentAnchor, setCurrentAnchor] = createSignal(window.location.hash);
  const updateCurrentMenuItem = () => {
    const menuLinks = all('a', menuContainer);
    menuLinks.forEach((link) => {
      link.classList.remove('is-current');
      if (link.getAttribute('href') === currentAnchor()) {
        link.classList.add('is-current');
      }
    });
  };
  createEffect(() => {
    updateCurrentMenuItem();
  });
  updateCurrentMenuItem();
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a.doc-menu-item');
    if (target && target.getAttribute('href')) {
      const anchor = target.getAttribute('href');
      setCurrentAnchor(anchor);
    }
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('.dashboard-menu')) {
      toggle(menuOffcanvas);
    }
  });
  menuContainer.after(
    jsx('div', {
      style: {
        textAlign: 'center',
        padding: '1rem 0',
        color: 'var(--ui-fg-subtle)',
      },
      children: '@JEALER',
    })
  );
});

/**
 * 主题按钮交互
 */
service.get('Theme', () => {
  const themeInstance = new Theme();
  const themeOffcanvas = new Offcanvas({
    overlay: true,
    direction: 'right',
    content: themeInstance.createPanel(),
    filter: false,
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('.theme-palette')) {
      toggle(themeOffcanvas);
    }
  });
});

/**
 * dashboard tip
 */
const dashboardTip = jsx('div', {
  className: 'j-tip is-default',
  children: [
    jsx`<div class="tip-title">TIP</div>`,
    jsx('div', {
      className: 'tip-content',
      children: [
        jsx`<p>JUI components provide only the basic DOM structure and basic styles. You can customize styles and features and combine them freely.</p>`,
      ],
    }),
  ],
});
/**
 * section tabs
 */
const sectionTabs = jsx('section', {
  children: [
    jsx`<h2 id="tabs">Tabs</h2>`,
    jsx`<div id="dynamic-tabs" class="block"></div>`,
    jsx('div', {
      className: 'actions',
      children: [
        jsx('button', {
          className: 'j-button is-outline add-tab-btn',
          children: `${ts('addTab')}`,
        }),
        jsx('button', {
          className: 'j-button is-error remove-tab-btn',
          children: `${ts('removeTab')}`,
        }),
      ],
    }),
  ],
});
const tabsAction = () => {
  const target = q('#dynamic-tabs');
  const removeTabBtn = q('.remove-tab-btn');
  const dynamicTabs = new Tabs(target, {
    active: 0,
    disabled: ['tab-4'],
    tabs: [
      { title: ts('monday'), panel: ts('MondayIsTheFirstDay'), name: 'tab-1' },
      {
        title: ts('tuesday'),
        panel: ts('TuesdayIsTheSecondDay'),
        name: 'tab-2',
      },
      {
        title: ts('wednesday'),
        panel: ts('WednesdayIsTheThirdDay'),
        name: 'tab-3',
      },
      { title: ts('disabledItem'), panel: 'disabled content', name: 'tab-4' },
    ],
    onChange: (index, name) => {
      info('Change to: ' + 'index ' + index + ', name ' + name);
    },
    onAdd: (index, tabConfig) => {
      success('Added tab at index: ' + index + ', name ' + tabConfig.name);
      if (dynamicTabs.dom.tabs.length > 1) {
        removeTabBtn.disabled = false;
      }
    },
    onRemove: (index, tabName) => {
      error('Deleted tab at index: ' + index + ', name ' + tabName);
      if (dynamicTabs.dom.tabs.length === 1) {
        removeTabBtn.disabled = true;
      }
    },
  });
  dynamicTabs.build();
  listen(q('.add-tab-btn'), 'click', () => {
    dynamicTabs.add({
      title: `tab ${dynamicTabs.dom.tabs.length + 1}`,
      panel: `panel ${dynamicTabs.dom.tabs.length + 1}`,
    });
    dynamicTabs.activate(dynamicTabs.dom.tabs.length - 1);
  });
  listen(removeTabBtn, 'click', () => {
    dynamicTabs.delete(dynamicTabs.state.current.index);
  });
};
/**
 * section toast
 */
const sectionToast = jsx('section', {
  children: [
    jsx`<h2 id="toast">Toast</h2>`,
    jsx`<h3>base usage</h3>`,
    jsx('div', {
      className: 'actions',
      children: [
        jsx('button', {
          className: 'j-button is-default example-toast-info',
          children: 'info msg',
          onClick: () => {
            show(ts('infoToastMessage'));
          },
        }),
        jsx('button', {
          className: 'j-button is-primary example-toast-primary',
          children: 'primary msg',
          onClick: () => {
            primary(ts('primaryToastMessage'));
          },
        }),
        jsx('button', {
          className: 'j-button is-success example-toast-success',
          children: 'success msg',
          onClick: () => {
            success(ts('successToastMessage'));
          },
        }),
        jsx('button', {
          className: 'j-button is-warning example-toast-warning',
          children: 'warning msg',
          onClick: () => {
            warning(ts('warningToastMessage'));
          },
        }),
        jsx('button', {
          className: 'j-button is-danger example-toast-error',
          children: 'error msg',
          onClick: () => {
            error(ts('errorToastMessage'));
          },
        }),
        jsx('button', {
          className: 'j-button is-contrast example-toast-lite',
          children: 'lite msg',
          onClick: () => {
            lite(ts('liteToastMessage'));
          },
        }),
      ],
    }),
    jsx`<h3>advanced usage</h3>`,
    jsx('div', {
      className: 'actions',
      children: jsx('button', {
        className: 'j-button is-outline',
        children: 'action toast',
        onClick: () => {
          Toast.action(
            'This is an action toast message without auto hide feature.',
            {
              text: {
                cancel: ts('Cancel'),
                action: ts('Confirm'),
              },
              onAction: async () => {
                await Toast.lite(ts('Request Completed'));
              },
            }
          );
        },
      }),
    }),
  ],
});
/**
 * section modal
 */
const exitFlow = new Flow({
  render: false,
  linear: true,
  steps: [
    {
      id: 'confirm',
      title: 'confirm',
      modal: {
        content: jsx`<div style="width:276px;display:flex;flex-direction:column;align-items:center;gap:calc(var(--space)*4);">
                <div style="width:24px;fill:currentColor">${icon('warning')}</div>
                <div style="margin-bottom:12px">${ts('Confirm Dangerous Action?')}</div>
                <div style="display:flex;gap:calc(var(--space)*4);">
                  <button class="j-button is-ghost is-sm" data-action="close">${ts('Cancel')}</button>
                  <button class="j-button is-contrast is-sm" data-action="next">${ts('Confirm')}</button>
                </div>
              </div>`,
      },
    },
    {
      id: 'processing',
      title: 'processing',
      modal: {
        content: jsx`<div style="width:276px;display:flex;flex-direction:column;align-items:center;gap:calc(var(--space)*4);">
                <div class="is-active" style="width:32px;fill:currentColor;padding-top:calc(var(--space)*2);"><div class="animate-spin">${icon('loader')}</div></div>
                <div class="font-semiBold">${ts('Processing your request')}</div>
                <div>${ts('Please wait while we process your request. Do not refresh the page.')}</div>
                <div style="display:flex;gap:calc(var(--space)*4);width:50%;margin-top:calc(var(--space)*2);">
                  <button class="j-button is-contrast is-sm" style="flex:1;" data-action="cancel">${ts('Cancel')}</button>
                </div>
              </div>`,
      },
      onEnter: () => {
        timer.start('modal-exit', 2000, () => {
          Toast.lite(ts('Request Completed'));
          // flowModal?.hide();
          if (flowModal) {
            flowModal.hide();
          }
        });
      },
    },
  ],
});
const flowModal = service.get('customModal-2', () => {
  return new Modal({
    header: false,
    footer: false,
    bgClose: false,
    flow: exitFlow,
    onHidden: () => {
      timer.cancel('modal-exit');
    },
    onShow: () => {
      exitFlow.reset();
      flowModal.syncFlowView(exitFlow);
    },
    onCancel: () => {
      lite(ts('Request Cancelled'));
    },
  });
});
const sectionModal = jsx('section', {
  children: [
    jsx`<h2 id="modal">Modal</h2>`,
    jsx`<h3>base usage</h3>`,
    jsx('div', {
      className: 'actions',
      children: [
        jsx('button', {
          className: 'j-button is-default example-modal-basic',
          children: 'base modal',
          onClick: () => {
            const m = new Modal({
              text: {
                title: ts('Tip'),
                confirm: ts('Confirm'),
                cancel: ts('Cancel'),
              },
              content: ts('thisIsAModal'),
              bgClose: true,
              escClose: true,
              onHidden: () => m.destroy(),
            }).show();
          },
        }),
        jsx('button', {
          className: 'j-button is-primary example-modal-fullscreen',
          children: 'fullscreen modal',
          onClick: () => {
            const m = new Modal({
              text: {
                title: ts('Tip'),
                confirm: ts('Confirm'),
                cancel: ts('Cancel'),
              },
              content: ts('thisIsAFullWidthModal'),
              fullscreen: true,
              escClose: true,
              onHidden: () => m.destroy(),
            }).show();
          },
        }),
        jsx('button', {
          className: 'j-button is-outline example-modal-custom',
          children: 'custom modal',
          onClick: () => {
            const m = new Modal({
              header: false,
              footer: false,
              content: jsx`<div class="flex flex-cols align-center gap-4">
          <div style="width:24px;fill:currentColor">${icon('warning')}</div>
          <div style="margin-bottom:8px;font-weight:500">${ts('Confirm Logout?')}</div>
          <div class="flex gap-4"><button class="j-button is-ghost is-sm" data-action="close">${ts('Cancel')}</button><button class="j-button is-primary is-sm" data-action="confirm">${ts('Confirm')}</button></div>
          </div>`,
              bgClose: true,
              onConfirm: () => {
                success(`${ts('Logout Success')}`);
              },
              onHidden: () => m.destroy(),
            }).show();
          },
        }),
      ],
    }),
    jsx`<h3>advanced usage</h3>`,
    jsx('div', {
      className: 'actions',
      children: [
        jsx('button', {
          className: 'j-button is-default example-modal-form',
          children: 'form modal',
          onClick: () => {
            const m = new Modal({
              text: {
                title: ts('edit'),
                confirm: ts('submit'),
                cancel: ts('Cancel'),
              },
              fields: [
                {
                  label: ts('username'),
                  name: 'username',
                  id: '_username',
                  type: 'text',
                  placeholder: ts('pleaseEnterUsername'),
                  required: true,
                },
                {
                  label: ts('password'),
                  name: 'password',
                  id: '_password',
                  type: 'password',
                  placeholder: ts('pleaseEnterPassword'),
                  required: true,
                },
                {
                  label: ts('country'),
                  name: 'country',
                  id: '_country',
                  type: 'select',
                  options: [
                    { value: '', text: '' },
                    { value: 'cn', text: ts('china') },
                    { value: 'us', text: ts('us') },
                    { value: 'uk', text: ts('uk') },
                  ],
                  required: true,
                },
                {
                  label: ts('description'),
                  name: 'description',
                  id: '_description',
                  type: 'textarea',
                  placeholder: ts('pleaseEnterDescription'),
                },
              ],
              onSubmit: function (data) {
                m.setState({ loading: true });
                setTimeout(() => {
                  m.setState({ loading: false });
                  if (!data.username) {
                    error(ts('usernameRequired'));
                    return;
                  }
                  if (!data.password) {
                    error(ts('passwordRequired'));
                    return;
                  }
                  if (!data.country) {
                    error(ts('countryRequired'));
                    return;
                  }
                  success(ts('updateSuccess'));
                  m.hide();
                }, 1000);
              },
              onHidden: () => m.destroy(),
            }).show();
          },
        }),
        jsx('button', {
          className: 'j-button is-contrast example-flow-adapter',
          children: 'flow adapter',
          onClick: () => {
            flowModal.show();
          },
        }),
      ],
    }),
  ],
});
/**
 * section offcanvas
 */
const sectionOffcanvas = jsx('section', {
  children: [
    jsx`<h2 id="offcanvas">Offcanvas</h2>`,
    jsx`<h3>animation</h3>`,
    jsx('div', {
      className: 'actions',
      children: [
        jsx('button', {
          className: 'j-button is-default example-offcanvas-slide',
          children: 'slide',
          onClick: () => {
            service
              .get('slideOffcanvas', () => {
                return new Offcanvas({
                  overlay: true,
                  content: '<h2>Slide Offcanvas</h2>',
                });
              })
              .show();
          },
        }),
        jsx('button', {
          className: 'j-button is-default example-offcanvas-push',
          children: 'push',
          onClick: () => {
            service
              .get('pushOffcanvas', () => {
                return new Offcanvas({
                  animation: 'push',
                  content: 'Push Offcanvas',
                });
              })
              .show();
          },
        }),
      ],
    }),
    jsx`<h3>direction</h3>`,
    jsx('div', {
      className: 'actions',
      children: [
        jsx('button', {
          className: 'j-button is-default example-offcanvas-top',
          children: 'top',
          onClick: () => {
            service
              .get('topOffcanvas', () => {
                return new Offcanvas({
                  overlay: true,
                  direction: 'top',
                  content: '<h2>Top Offcanvas</h2>',
                });
              })
              .show();
          },
        }),
        jsx('button', {
          className: 'j-button is-default example-offcanvas-bottom',
          children: 'bottom',
          onClick: () => {
            service
              .get('bottomOffcanvas', () => {
                return new Offcanvas({
                  overlay: true,
                  direction: 'bottom',
                  content: '<h2>Bottom Offcanvas</h2>',
                });
              })
              .show();
          },
        }),
        jsx('button', {
          className: 'j-button is-default example-offcanvas-right',
          children: 'right',
          onClick: () => {
            service
              .get('rightOffcanvas', () => {
                return new Offcanvas({
                  overlay: true,
                  direction: 'right',
                  content: '<h2>Right Offcanvas</h2>',
                });
              })
              .show();
          },
        }),
      ],
    }),
  ],
});
const sectionAccordion = jsx('section', {
  children: [
    jsx`<h2 id="accordion">Accordion</h2>`,
    jsx`<div class="example-accordion"></div>`,
  ],
});
const sectionDrop = jsx('section', {
  children: [
    jsx`<h2 id="drop">Drop</h2>`,
    jsx`<h3>trigger modes</h3>`,
    jsx('div', {
      className: 'actions',
      children: [
        jsx`<button class="j-button is-default drop-auto">hover</button>`,
        jsx`<button class="j-button is-default drop-click">click</button>`,
      ],
    }),
    jsx`<h3>positions</h3>`,
    jsx('div', {
      className: 'actions',
      children: [
        jsx`<button class="j-button is-default drop-top-left">top-left</button>`,
        jsx`<button class="j-button is-default drop-top-center">top-center</button>`,
        jsx`<button class="j-button is-default drop-top-right">top-right</button>`,
        jsx`<button class="j-button is-default drop-bottom-left">bottom-left</button>`,
        jsx`<button class="j-button is-default drop-bottom-center">bottom-center</button>`,
        jsx`<button class="j-button is-default drop-bottom-right">bottom-right</button>`,
        jsx`<button class="j-button is-default drop-left">left</button>`,
        jsx`<button class="j-button is-default drop-right">right</button>`,
      ],
    }),
  ],
});
const sectionTooltip = jsx('section', {
  children: [
    jsx`<h2 id="tooltip">Tooltip</h2>`,
    jsx`<h3>trigger modes</h3>`,
    jsx('div', {
      className: 'actions',
      children: [
        jsx`<button class="j-button is-default tooltip-auto">hover</button>`,
        jsx`<button class="j-button is-default tooltip-click">click</button>`,
      ],
    }),
    jsx`<h3>positions</h3>`,
    jsx('div', {
      className: 'actions',
      children: [
        jsx`<button class="j-button is-default tooltip-top-left">top-left</button>`,
        jsx`<button class="j-button is-default tooltip-top-center">top-center</button>`,
        jsx`<button class="j-button is-default tooltip-top-right">top-right</button>`,
        jsx`<button class="j-button is-default tooltip-bottom-left">bottom-left</button>`,
        jsx`<button class="j-button is-default tooltip-bottom-center">bottom-center</button>`,
        jsx`<button class="j-button is-default tooltip-bottom-right">bottom-right</button>`,
        jsx`<button class="j-button is-default tooltip-left">left</button>`,
        jsx`<button class="j-button is-default tooltip-right">right</button>`,
      ],
    }),
  ],
});
const sectionParabola = jsx('section', {
  children: [
    jsx`<h2 id="parabola">Parabola</h2>`,
    jsx('div', {
      style: { width: '280px' },
      children: [
        jsx('div', {
          style: {
            marginBottom: '120px',
            display: 'flex',
            justifyContent: 'space-between',
          },
          children: [
            jsx`<button type="button" class="j-button is-default" id="from-point">Start 1</button>`,
            jsx`<button type="button" class="j-button is-outline" id="end-point-2">End 2</button>`,
          ],
        }),
        jsx('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
          },
          children: [
            jsx`<button type="button" class="j-button is-default" id="from-point-2">Start 2</button>`,
            jsx`<button type="button" class="j-button is-outline" id="end-point">End 1</button>`,
          ],
        }),
      ],
    }),
  ],
});
const sectionMenu = jsx('section', {
  children: [
    jsx`<h2 id="menu">Menu</h2>`,
    jsx`<h3>horizontal menu (desktop)</h3>`,
    jsx('div', {
      className: 'block',
      children: jsx('nav', {
        className: 'j-menu',
        children: jsx('ul', {
          className: 'menu',
          children: [
            jsx`<li class="menu-item current-menu-item"><a><icon class="el-icon el-prefix"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21H5C4.44772 21 4 20.5523 4 20V11L1 11L11.3273 1.6115C11.7087 1.26475 12.2913 1.26475 12.6727 1.6115L23 11L20 11V20C20 20.5523 19.5523 21 19 21ZM6 19H18V9.15745L12 3.7029L6 9.15745V19ZM8 15H16V17H8V15Z"></path></svg></icon><span class="is-text">menu</span></a></li>`,
            jsx`<li class="menu-item"><a>level-one</a></li>`,
            jsx('li', {
              className: 'menu-item menu-item-has-children',
              children: [
                jsx`<a href="#">has-children</a>`,
                jsx('ul', {
                  className: 'sub-menu',
                  children: [
                    jsx`<li class="menu-item"><a>child one</a></li>`,
                    jsx`<li class="menu-item"><a>child two</a></li>`,
                    jsx`<li class="menu-item"><a>child three: long text, it'll be automatically wrapped</a></li>`,
                    jsx`<li class="menu-item"><a>child four</a></li>`,
                  ],
                }),
              ],
            }),
            jsx`<li class="menu-item">no-link-notice</li>`,
            jsx('li', {
              className: 'menu-item menu-item-has-children list-card-menu',
              children: [
                jsx`<a href="#">list-card</a>`,
                jsx('ul', {
                  className: 'sub-menu',
                  children: [
                    jsx`<li class="menu-item"><a>child one</a></li>`,
                    jsx`<li class="menu-item"><a>child two</a></li>`,
                    jsx`<li class="menu-item"><a>child three: calmp 1 while triming</a></li>`,
                    jsx`<li class="menu-item"><a>child four</a></li>`,
                    jsx`<li class="menu-item"><a>child five</a></li>`,
                    jsx`<li class="menu-item"><a>child six</a></li>`,
                    jsx`<li class="menu-item"><a>child seven</a></li>`,
                    jsx`<li class="menu-item"><a>child eight</a></li>`,
                    jsx`<li class="menu-item"><a>child nine</a></li>`,
                    jsx`<li class="menu-item"><a>child ten</a></li>`,
                  ],
                }),
              ],
            }),
            jsx('li', {
              className: 'menu-item menu-item-has-children advanced-card-menu',
              children: [
                jsx`<a href="#">advanced-card</a>`,
                jsx('ul', {
                  className: 'sub-menu',
                  children: [
                    jsx`<li class="menu-item"><a>child one</a></li>`,
                    jsx`<li class="menu-item"><a><img src="https://placehold.co/300x200/lightgray/gray?text=Option-2" alt="" /></a></li>`,
                    jsx`<li class="menu-item"><a><img src="https://placehold.co/300x200/lightgray/gray?text=Option-3" alt="" /></a></li>`,
                    jsx`<li class="menu-item"><a>child four</a></li>`,
                    jsx`<li class="menu-item"><a>child five</a></li>`,
                    jsx`<li class="menu-item"><a>child six</a></li>`,
                    jsx`<li class="menu-item"><a><img src="https://placehold.co/300x200/lightgray/gray?text=Option-7" alt="" /></a></li>`,
                    jsx`<li class="menu-item"><a><img src="https://placehold.co/300x200/lightgray/gray?text=Option-8" alt=""/></a></li>`,
                    jsx`<li class="menu-item"><a>child nine</a></li>`,
                    jsx`<li class="menu-item"><a>child ten</a></li>`,
                  ],
                }),
              ],
            }),
            jsx`<li class="menu-item"><a><span class="el-icon el-prefix"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12H5V21H3V12ZM19 8H21V21H19V8ZM11 2H13V21H11V2Z"></path></svg></span><span class="menu-text">level-one</span></a></li>`,
          ],
        }),
      }),
    }),
    jsx`<h3>vertical menu (mobile)</h3>`,
    jsx('div', {
      className: 'actions',
      children: [
        jsx`<button class="j-button is-outline" id="createMobileMenu">build menu</button>`,
        jsx`<button class="j-button is-error" id="destroyMobileMenu">destroy menu</button>`,
      ],
    }),
    jsx('div', {
      className: 'block',
      children: [
        jsx`<div class="mobile-menu-container" style="width:240px;border:1px solid var(--ui-border-subtle)"></div>`,
      ],
    }),
    jsx`<h3>bottom menu (bottom)</h3>`,
    jsx('div', {
      className: 'actions',
      children: [
        jsx`<button class="j-button is-outline" id="createMenu">build menu</button>`,
        jsx`<button class="j-button is-error" id="destroyMenu">destroy menu</button>`,
      ],
    }),
    jsx`<h3>drop menu</h3>`,
    jsx('div', {
      className: 'block',
      children: jsx('div', {
        className: 'drop-contaner drop-menu',
        children: jsx('ul', {
          className: 'menu',
          children: [
            jsx`<li class="menu-item"><a><span class="el-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.9998 6V3C6.9998 2.44772 7.44752 2 7.9998 2H19.9998C20.5521 2 20.9998 2.44772 20.9998 3V17C20.9998 17.5523 20.5521 18 19.9998 18H16.9998V20.9991C16.9998 21.5519 16.5499 22 15.993 22H4.00666C3.45059 22 3 21.5554 3 20.9991L3.0026 7.00087C3.0027 6.44811 3.45264 6 4.00942 6H6.9998ZM5.00242 8L5.00019 20H14.9998V8H5.00242ZM8.9998 6H16.9998V16H18.9998V4H8.9998V6Z"></path></svg></span><span class="menu-text">copy</span></a></li>`,
            jsx`<li class="menu-item"><a><span class="el-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4V2H17V4H20.0066C20.5552 4 21 4.44495 21 4.9934V21.0066C21 21.5552 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5551 3 21.0066V4.9934C3 4.44476 3.44495 4 3.9934 4H7ZM7 6H5V20H19V6H17V8H7V6ZM9 4V6H15V4H9Z"></path></svg></span><span class="menu-text">clipboard</span></a></li>`,
            jsx`<li class="menu-item menu-heading">Heading</li>`,
            jsx`<li class="menu-item"><a><span class="el-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4V2H17V4H20.0066C20.5552 4 21 4.44495 21 4.9934V21.0066C21 21.5552 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5551 3 21.0066V4.9934C3 4.44476 3.44495 4 3.9934 4H7ZM7 6H5V20H19V6H17V8H7V6ZM9 4V6H15V4H9Z"></path></svg></span><span class="menu-text">clipboard</span><span class="menu-addon"><span class="bdk-cmd">C</span></span></a></li>`,
          ],
        }),
      }),
    }),
  ],
});
const main = jsx('div', {
  className: 'main-container container',
  children: [
    dashboardTip,
    sectionTabs,
    sectionToast,
    sectionModal,
    sectionOffcanvas,
    sectionAccordion,
    sectionDrop,
    sectionTooltip,
    sectionParabola,
    sectionMenu,
  ],
});
q('header').after(main);
tabsAction();

/**
 * Addon Panel
 */
const addon = jsx('div', {
  className: 'dashboard-addon',
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: '.25rem',
    position: 'fixed',
    right: '1.25rem',
    bottom: '20%',
    zIndex: 2,
  },
  children: [
    jsx('button', {
      className: 'j-button is-icon is-primary dashboard-menu',
      children: jsx`<span class="el-icon">${icon('menu')}</span>`,
    }),
    jsx('button', {
      className: 'j-button is-icon is-outline theme-palette',
      children: jsx`<span class="el-icon">${icon('palette')}</span>`,
    }),
    jsx('button', {
      className: 'j-button is-icon is-default to-top',
      onClick: () => {
        scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      },
      children: jsx`<span class="el-icon">${icon('arrow-up')}</span>`,
    }),
    jsx('button', {
      className: 'j-button is-icon is-default to-bottom',
      onClick: () => {
        scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth',
        });
      },
      children: jsx`<span class="el-icon">${icon('arrow-down')}</span>`,
    }),
  ],
});
insert(document.body, addon);

const __content = () => {
  listen(q('#content-radio'), 'change', (e) => {
    const target = e.target;
    if (target.tagName === 'INPUT' && target.type === 'radio') {
      const value = target.value;
      const content = q('#demo');
      if (value) {
        content.className = `j-content is-${value}`;
      } else {
        content.classList.remove('is-sm', 'is-md', 'is-lg');
      }
    }
  });
};
__content();

/**
 * 生成文档页脚
 */
const __footer = () => {
  const footer = jsx('footer', {
    style: {
      borderTop: '1px solid var(--ui-border-subtle)',
      paddingBlock: '1rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    children: jsx`Copyright © ${new Date().getFullYear()} JEALER`,
  });
  insert(document.body, footer);
};
__footer();

let themeBoxObserver = null;
const __background = () => {
  if (themeBoxObserver) {
    themeBoxObserver.disconnect();
  }
  let themeBox = null;
  const ensureThemeBox = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      if (!themeBox) {
        themeBox = jsx('div', {
          style: {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '60vh',
            minHeight: '480px',
            pointerEvents: 'none',
            opacity: '0.6',
          },
        });
        insert(q(document.body), themeBox);
      }

      const themeValues = Array.from(document.documentElement.classList)
        .filter((cls) => cls.startsWith('j-theme-'))
        .map((cls) => cls.replace('j-theme-', ''));

      if (themeValues.length) {
        const themeName = themeValues[0];
        themeBox.style.background = `linear-gradient(to bottom, var(--${themeName}-4), transparent)`;
      }
    } else {
      if (themeBox && themeBox.parentNode) {
        themeBox.parentNode.removeChild(themeBox);
        themeBox = null;
      }
    }
  };

  ensureThemeBox();

  const localObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'class'
      ) {
        ensureThemeBox();
      }
    }
  });

  localObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  themeBoxObserver = localObserver;
};
// __background();

service.get('accordion', () => {
  new Accordion('.example-accordion', {
    collapsible: true,
    items: [
      {
        title: ts('firstItem'),
        content: ts('firstItemContent'),
        name: 'first-item',
      },
      {
        title: ts('secondItem'),
        content: ts('secondItemContent'),
        name: 'second-item',
      },
      {
        title: ts('thirdItem'),
        content: ts('thirdItemContent'),
        name: 'third-item',
      },
    ],
    onChange: (index, name, headerEl) => {
      lite(`${headerEl.textContent}`);
    },
  }).build();
});

const __drop = () => {
  service.get('drop-auto', () => {
    return new Drop('.drop-auto', {
      mode: 'hover',
      delay: 100,
      content: '<h4 class="drop-wrap">Drop: hover to show</h4>',
    });
  });
  service.get('drop-click', () => {
    return new Drop('.drop-click', {
      content: '<h4 class="drop-wrap">Drop: click to show</h4>',
    });
  });
  service.get('drop-top-left', () => {
    return new Drop('.drop-top-left', {
      mode: 'hover',
      delay: 100,
      content: '<h4 class="drop-wrap">Drop: top-left</h4>',
      position: 'top-left',
    });
  });
  service.get('drop-top-center', () => {
    return new Drop('.drop-top-center', {
      mode: 'hover',
      delay: 100,
      content: '<h4 class="drop-wrap">Drop: top-center</h4>',
      position: 'top-center',
    });
  });
  service.get('drop-top-right', () => {
    return new Drop('.drop-top-right', {
      mode: 'hover',
      delay: 100,
      content: '<h4 class="drop-wrap">Drop: top-right</h4>',
      position: 'top-right',
    });
  });
  service.get('drop-bottom-left', () => {
    return new Drop('.drop-bottom-left', {
      mode: 'hover',
      delay: 100,
      content: '<h4 class="drop-wrap">Drop: bottom-left</h4>',
      position: 'bottom-left',
    });
  });
  service.get('drop-bottom-center', () => {
    return new Drop('.drop-bottom-center', {
      mode: 'hover',
      delay: 100,
      content: '<h4 class="drop-wrap">Drop: bottom-center</h4>',
      position: 'bottom-center',
    });
  });
  service.get('drop-bottom-right', () => {
    return new Drop('.drop-bottom-right', {
      mode: 'hover',
      delay: 100,
      content: '<h4 class="drop-wrap">Drop: bottom-right</h4>',
      position: 'bottom-right',
    });
  });
  service.get('drop-left', () => {
    return new Drop('.drop-left', {
      mode: 'hover',
      delay: 100,
      content: '<h4 class="drop-wrap">Drop: left</h4>',
      position: 'left',
    });
  });
  service.get('drop-right', () => {
    return new Drop('.drop-right', {
      mode: 'hover',
      delay: 100,
      content: '<h4 class="drop-wrap">Drop: right</h4>',
      position: 'right',
    });
  });
};
__drop();

const __tooltip = () => {
  service.get('tooltip-auto', () => {
    return new Tooltip(q('.tooltip-auto'), {
      message: 'Message',
    });
  });
  service.get('tooltip-click', () => {
    return new Tooltip(q('.tooltip-click'), {
      message: 'Message',
      mode: 'click',
    });
  });
  service.get('tooltip-top-left', () => {
    return new Tooltip(q('.tooltip-top-left'), {
      message: 'Message',
      position: 'top-left',
    });
  });
  service.get('tooltip-top-right', () => {
    return new Tooltip(q('.tooltip-top-right'), {
      message: 'Message',
      position: 'top-right',
    });
  });
  service.get('tooltip-top-center', () => {
    return new Tooltip(q('.tooltip-top-center'), {
      message: 'Message',
      position: 'top-center',
    });
  });

  service.get('tooltip-bottom-left', () => {
    return new Tooltip(q('.tooltip-bottom-left'), {
      message: 'Message',
      position: 'bottom-left',
    });
  });
  service.get('tooltip-bottom-center', () => {
    return new Tooltip(q('.tooltip-bottom-center'), {
      message: 'Message',
      position: 'bottom-center',
    });
  });
  service.get('tooltip-bottom-right', () => {
    return new Tooltip(q('.tooltip-bottom-right'), {
      message: 'Message',
      position: 'bottom-right',
    });
  });
  service.get('tooltip-left', () => {
    return new Tooltip(q('.tooltip-left'), {
      message: 'Message',
      position: 'left',
    });
  });
  service.get('tooltip-right', () => {
    return new Tooltip(q('.tooltip-right'), {
      message: 'Message',
      position: 'right',
    });
  });
};
__tooltip();

/**
 * test: Parabola, validator
 */
const __parabola = () => {
  const from = q('#from-point');
  const to = q('#end-point');
  listen(from, 'click', () => {
    const ball = new Parabola({
      from,
      to,
      direction: 'top-right',
    });
    ball.start();
  });
  const from2 = q('#from-point-2');
  const to2 = q('#end-point-2');
  listen(from2, 'click', () => {
    const ball = new Parabola({
      from: from2,
      to: to2,
    });
    ball.start();
  });
};
__parabola();

const __form = () => {
  const form = q('form#form-validator');
  const test = new Validator(form, {
    rules: {
      email: {
        required: true,
        email: true,
        minLength: 8,
        maxLength: 10,
        noChinese: true,
      },
      password: {
        required: true,
        minLength: 6,
        maxLength: 8,
        noSpace: true,
        noSpecial: true,
        pattern: /^[A-Z].*$/,
      },
      password_repeat: {
        required: true,
        equalTo: 'password',
      },
      country: {
        required: true,
        selected: true,
      },
      file: {
        required: true,
        file: true,
        maxSize: 1024 * 1024 * 5,
        accept: 'image/*',
      },
      agreement: {
        checked: true,
      },
    },
    messages: {
      email: {
        required: ts('emailRequired'),
        email: ts('invalidEmail'),
        minLength: ts('emailMinLength'),
        maxLength: ts('emailMaxLength'),
        noChinese: ts('noChinese'),
      },
      password: {
        required: ts('passwordRequired'),
        minLength: ts('passwordMinLength'),
        maxLength: ts('passwordMaxLength'),
        noSpace: ts('noSpace'),
        noSpecial: ts('noSpecial'),
        pattern: ts('FirstLetterCaps'),
      },
      password_repeat: {
        required: ts('passwordRequired'),
        equalTo: ts('equalToRequired'),
      },
      file: {
        required: 'File Required',
        maxSize: 'File size must not exceed 5MB',
        accept: 'Only images are allowed',
      },
      agreement: {
        checked: ts('agreementRequired'),
      },
    },
  });
  listen(form, 'submit', (e) => {
    e.preventDefault();
    const result = test.validate();
    console.log(test);
    console.log(result);

    if (!result && test.runtime.message) {
      error(test.runtime.message);
    } else {
      success(ts('formValidated'));
    }
  });
  listen(form, 'reset', () => {
    test.reset();
  });
};
__form();

const __mobileMenu = () => {
  const [menu, setMenu] = createSignal(null);
  createEffect(() => {
    const instance = menu();
    if (instance) {
      insert(q('.mobile-menu-container'), instance.dom.root);
      success(ts('Menu Created'));
      q('#createMobileMenu').disabled = true;
      q('#destroyMobileMenu').disabled = false;
      q('.mobile-menu-container').style.width = '240px';
      q('.mobile-menu-container').style.border =
        '1px solid var(--ui-border-subtle)';
    } else {
      q('#createMobileMenu').disabled = false;
      q('#destroyMobileMenu').disabled = true;
      q('.mobile-menu-container').style = '';
    }
  });

  const menuItems = [
    { title: 'level-one', url: '#' },
    {
      title: 'has-children',
      // url: '#',
      children: [
        { title: 'level-two-1', url: '#' },
        {
          title: 'level-two-2',
          url: '',
          children: [
            { title: 'level-three-1', url: '#' },
            { title: 'level-three-2', url: '#' },
            {
              title: "level-three-3: long text, it'll be automatically wrapped",
              url: '#',
            },
          ],
        },
        { title: 'level-two-3', url: '#' },
        { title: 'level-two-4', url: '#' },
      ],
    },
    { title: 'no-link-notice' },
    { title: 'level-one', url: '#' },
    { title: 'level-one', url: '#' },
  ];

  listen(document.body, 'click', (e) => {
    if (e.target.closest('#createMobileMenu')) {
      if (!menu()) {
        const newMenu = new Menu({
          type: 'mobile',
          backText: ts('Back'),
          items: menuItems,
        });
        newMenu.build();
        insert(q('.mobile-menu-container'), newMenu.dom.root);
        setMenu(newMenu);
      }
    }
    if (e.target.closest('#destroyMobileMenu')) {
      const instance = menu();
      if (instance) {
        instance.destroy();
        setMenu(null);
        error(ts('Menu Destroyed'));
      } else {
        error(ts('Create a menu first'));
        q('#destroyMobileMenu').disabled = true;
      }
    }
  });
};
__mobileMenu();

const menuData = [
  {
    id: 10,
    title: '首页',
    url: '#home',
  },
  {
    id: 20,
    title: '产品中心',
    url: '#products',
    children: [
      {
        id: 21,
        title: '智能硬件',
        url: '#hardware',
      },
      {
        id: 22,
        title: '软件服务',
        url: '#software',
        children: [
          {
            id: 221,
            title: 'SaaS 平台',
            url: '#saas',
          },
          {
            id: 222,
            title: '企业定制',
            url: '#enterprise',
            children: [
              {
                id: 2221,
                title: 'CRM 系统',
                url: '#crm',
              },
              {
                id: 2222,
                title: 'ERP 系统',
                url: '#erp',
              },
              {
                id: 2223,
                title: 'OA 系统',
                url: '#oa',
              },
            ],
          },
          {
            id: 223,
            title: '移动应用',
            url: '#mobile',
          },
        ],
      },
      {
        id: 23,
        title: '云服务',
        url: '#cloud',
      },
    ],
  },
  {
    id: 30,
    title: '解决方案',
    url: '#solutions',
    children: [
      {
        id: 31,
        title: '零售行业',
        url: '#retail',
      },
      {
        id: 32,
        title: '制造业',
        url: '#manufacturing',
      },
      {
        id: 33,
        title: '金融行业',
        url: '#finance',
      },
    ],
  },
  {
    id: 40,
    title: '关于我们',
    url: '#about',
    children: [
      {
        id: 41,
        title: '公司简介',
        url: '#company',
      },
      {
        id: 42,
        title: '联系我们',
        url: '#contact',
      },
    ],
  },
];
const __bottomMenu = () => {
  const [_menu, setMenu] = createSignal(null);
  createEffect(() => {
    const menuInstance = _menu();
    if (menuInstance) {
      insert(document.body, menuInstance.dom.root);
      success(ts('Menu Created'));
      q('#createMenu').disabled = true;
      q('#destroyMenu').disabled = false;
    } else {
      q('#destroyMenu').disabled = true;
      q('#createMenu').disabled = false;
      const existingMenu = q('.j-bottom-menu');
      if (existingMenu) {
        existingMenu.remove();
      }
    }
  });

  listen(document.body, 'click', (e) => {
    if (e.target.closest('#createMenu')) {
      if (!_menu()) {
        const newMenu = new Menu({
          type: 'bottom',
          items: menuData,
        });
        newMenu.build();
        insert(document.body, newMenu.dom.root);
        setMenu(newMenu);
      }
    }
    if (e.target.closest('#destroyMenu')) {
      if (_menu()) {
        _menu().destroy();
        setMenu(null);
        error(ts('Menu Destroyed'));
      } else {
        error(ts('Create a menu first'));
        q('#destroyMenu').disabled = true;
      }
    }
  });
};
__bottomMenu();

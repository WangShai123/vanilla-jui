# color.css 颜色变量使用统计

生成时间：2026-06-25

## 统计口径

- 入口：`src/css/index.css`。
- 范围：递归纳入入口中未被注释的 `@import` 文件；被注释的 `base.css`、`utilities.css`、`color_p3.css` 不计入。
- 注释：统计前移除 `/* ... */` 注释内容。
- 变量全集：`src/css/color.css` 中声明过的 CSS 自定义属性，重复声明只算一个变量。
- 直接引用次数：只统计直接出现的 `var(--token)`，不展开 `--primary: var(--indigo-9)` 后组件再使用 `var(--primary)` 的间接链路。
- 引用占比：该变量直接引用次数 / 所有 color.css 变量直接引用总次数。
- 文件覆盖率：引用到该变量的文件数 / 纳入统计的 CSS 文件数。

## 纳入统计的 CSS 文件

- `src/css/color.css`
- `src/css/config.css`
- `src/css/layout.css`
- `src/css/content.css`
- `src/css/icon.css`
- `src/css/font.css`
- `src/css/components.css`
- `src/css/divider.css`
- `src/css/button.css`
- `src/css/avatar.css`
- `src/css/badge.css`
- `src/css/tag.css`
- `src/css/tip.css`
- `src/css/loading.css`
- `src/css/skeleton.css`
- `src/css/popup.css`
- `src/css/modal.css`
- `src/css/flow.css`
- `src/css/toast.css`
- `src/css/tabs.css`
- `src/css/offcanvas.css`
- `src/css/accordion.css`
- `src/css/theme-palette.css`
- `src/css/drop.css`
- `src/css/tooltip.css`
- `src/css/swiper.css`
- `src/css/breadcrumb.css`
- `src/css/table.css`
- `src/css/pagination.css`
- `src/css/card.css`
- `src/css/toolbar.css`
- `src/css/menu.css`
- `src/css/form.css`
- `src/css/animation.css`
- `src/css/status.css`

## 总览

- 纳入统计 CSS 文件数：35
- color.css 变量总数：506
- 有直接引用的变量数：152
- 零直接引用变量数：354
- color.css 变量直接引用总次数：279

## 色系汇总

| 色系 | 变量数 | 已用变量数 | 零引用变量数 | 直接引用次数 | 引用占比 | 引用文件数 | 文件覆盖率 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| gray | 28 | 20 | 8 | 85 | 30.47% | 16 | 45.71% |
| indigo | 28 | 12 | 16 | 27 | 9.68% | 2 | 5.71% |
| red | 28 | 8 | 20 | 13 | 4.66% | 5 | 14.29% |
| ruby | 28 | 8 | 20 | 12 | 4.30% | 2 | 5.71% |
| yellow | 28 | 8 | 20 | 12 | 4.30% | 2 | 5.71% |
| blue | 28 | 8 | 20 | 11 | 3.94% | 1 | 2.86% |
| gold | 28 | 8 | 20 | 11 | 3.94% | 1 | 2.86% |
| grass | 28 | 8 | 20 | 11 | 3.94% | 1 | 2.86% |
| mint | 28 | 8 | 20 | 11 | 3.94% | 1 | 2.86% |
| orange | 28 | 8 | 20 | 11 | 3.94% | 1 | 2.86% |
| pink | 28 | 8 | 20 | 11 | 3.94% | 1 | 2.86% |
| teal | 28 | 8 | 20 | 11 | 3.94% | 1 | 2.86% |
| tomato | 28 | 8 | 20 | 11 | 3.94% | 1 | 2.86% |
| violet | 28 | 8 | 20 | 11 | 3.94% | 1 | 2.86% |
| olive | 28 | 9 | 19 | 10 | 3.58% | 2 | 5.71% |
| lime | 28 | 6 | 22 | 8 | 2.87% | 1 | 2.86% |
| amber | 28 | 5 | 23 | 7 | 2.51% | 3 | 8.57% |
| green | 28 | 4 | 24 | 6 | 2.15% | 2 | 5.71% |
| black | 1 | 0 | 1 | 0 | 0.00% | 0 | 0.00% |
| white | 1 | 0 | 1 | 0 | 0.00% | 0 | 0.00% |

## Top 30 直接引用变量

| 变量 | 色系 | 直接引用次数 | 引用占比 | 引用文件数 | 文件覆盖率 | 主要文件 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `--gray-3` | gray | 10 | 3.58% | 4 | 11.43% | `src/css/menu.css` (4)<br>`src/css/content.css` (3)<br>`src/css/config.css` (2)<br>`src/css/form.css` (1) |
| `--gray-a3` | gray | 9 | 3.23% | 4 | 11.43% | `src/css/config.css` (4)<br>`src/css/content.css` (2)<br>`src/css/layout.css` (2)<br>`src/css/form.css` (1) |
| `--gray-11` | gray | 8 | 2.87% | 5 | 14.29% | `src/css/content.css` (2)<br>`src/css/flow.css` (2)<br>`src/css/form.css` (2)<br>`src/css/card.css` (1)<br>`src/css/modal.css` (1) |
| `--gray-a2` | gray | 8 | 2.87% | 6 | 17.14% | `src/css/config.css` (2)<br>`src/css/layout.css` (2)<br>`src/css/accordion.css` (1)<br>`src/css/button.css` (1)<br>`src/css/content.css` (1) |
| `--gray-a6` | gray | 8 | 2.87% | 3 | 8.57% | `src/css/config.css` (6)<br>`src/css/button.css` (1)<br>`src/css/form.css` (1) |
| `--gray-9` | gray | 7 | 2.51% | 3 | 8.57% | `src/css/content.css` (4)<br>`src/css/breadcrumb.css` (2)<br>`src/css/form.css` (1) |
| `--gray-a8` | gray | 6 | 2.15% | 3 | 8.57% | `src/css/form.css` (4)<br>`src/css/button.css` (1)<br>`src/css/tabs.css` (1) |
| `--indigo-9` | indigo | 5 | 1.79% | 2 | 5.71% | `src/css/config.css` (3)<br>`src/css/toast.css` (2) |
| `--indigo-a3` | indigo | 5 | 1.79% | 1 | 2.86% | `src/css/config.css` (5) |
| `--gray-1` | gray | 4 | 1.43% | 3 | 8.57% | `src/css/config.css` (2)<br>`src/css/form.css` (1)<br>`src/css/loading.css` (1) |
| `--gray-a11` | gray | 4 | 1.43% | 3 | 8.57% | `src/css/config.css` (2)<br>`src/css/form.css` (1)<br>`src/css/menu.css` (1) |
| `--indigo-a11` | indigo | 4 | 1.43% | 1 | 2.86% | `src/css/config.css` (4) |
| `--amber-10` | amber | 3 | 1.08% | 2 | 5.71% | `src/css/toast.css` (2)<br>`src/css/config.css` (1) |
| `--blue-a3` | blue | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--gold-a3` | gold | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--grass-a3` | grass | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--gray-10` | gray | 3 | 1.08% | 3 | 8.57% | `src/css/breadcrumb.css` (1)<br>`src/css/form.css` (1)<br>`src/css/menu.css` (1) |
| `--gray-4` | gray | 3 | 1.08% | 3 | 8.57% | `src/css/config.css` (1)<br>`src/css/flow.css` (1)<br>`src/css/skeleton.css` (1) |
| `--green-10` | green | 3 | 1.08% | 2 | 5.71% | `src/css/toast.css` (2)<br>`src/css/config.css` (1) |
| `--mint-a3` | mint | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--orange-a3` | orange | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--pink-a3` | pink | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--red-10` | red | 3 | 1.08% | 2 | 5.71% | `src/css/toast.css` (2)<br>`src/css/config.css` (1) |
| `--ruby-a3` | ruby | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--teal-a3` | teal | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--tomato-a3` | tomato | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--violet-a3` | violet | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--yellow-a3` | yellow | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--blue-a11` | blue | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--gold-a11` | gold | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |

## 全量变量明细

| 变量 | 色系 | 直接引用次数 | 引用占比 | 引用文件数 | 文件覆盖率 | 引用文件 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `--white` | white | 0 | 0.00% | 0 | 0.00% | - |
| `--black` | black | 0 | 0.00% | 0 | 0.00% | - |
| `--gray-1` | gray | 4 | 1.43% | 3 | 8.57% | `src/css/config.css` (2)<br>`src/css/form.css` (1)<br>`src/css/loading.css` (1) |
| `--gray-2` | gray | 2 | 0.72% | 2 | 5.71% | `src/css/config.css` (1)<br>`src/css/tag.css` (1) |
| `--gray-3` | gray | 10 | 3.58% | 4 | 11.43% | `src/css/menu.css` (4)<br>`src/css/content.css` (3)<br>`src/css/config.css` (2)<br>`src/css/form.css` (1) |
| `--gray-4` | gray | 3 | 1.08% | 3 | 8.57% | `src/css/config.css` (1)<br>`src/css/flow.css` (1)<br>`src/css/skeleton.css` (1) |
| `--gray-5` | gray | 2 | 0.72% | 1 | 2.86% | `src/css/menu.css` (2) |
| `--gray-6` | gray | 2 | 0.72% | 1 | 2.86% | `src/css/content.css` (2) |
| `--gray-7` | gray | 0 | 0.00% | 0 | 0.00% | - |
| `--gray-8` | gray | 0 | 0.00% | 0 | 0.00% | - |
| `--gray-9` | gray | 7 | 2.51% | 3 | 8.57% | `src/css/content.css` (4)<br>`src/css/breadcrumb.css` (2)<br>`src/css/form.css` (1) |
| `--gray-10` | gray | 3 | 1.08% | 3 | 8.57% | `src/css/breadcrumb.css` (1)<br>`src/css/form.css` (1)<br>`src/css/menu.css` (1) |
| `--gray-11` | gray | 8 | 2.87% | 5 | 14.29% | `src/css/content.css` (2)<br>`src/css/flow.css` (2)<br>`src/css/form.css` (2)<br>`src/css/card.css` (1)<br>`src/css/modal.css` (1) |
| `--gray-12` | gray | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--gray-a1` | gray | 1 | 0.36% | 1 | 2.86% | `src/css/offcanvas.css` (1) |
| `--gray-a2` | gray | 8 | 2.87% | 6 | 17.14% | `src/css/config.css` (2)<br>`src/css/layout.css` (2)<br>`src/css/accordion.css` (1)<br>`src/css/button.css` (1)<br>`src/css/content.css` (1)<br>`src/css/tag.css` (1) |
| `--gray-a3` | gray | 9 | 3.23% | 4 | 11.43% | `src/css/config.css` (4)<br>`src/css/content.css` (2)<br>`src/css/layout.css` (2)<br>`src/css/form.css` (1) |
| `--gray-a4` | gray | 1 | 0.36% | 1 | 2.86% | `src/css/button.css` (1) |
| `--gray-a5` | gray | 2 | 0.72% | 2 | 5.71% | `src/css/config.css` (1)<br>`src/css/form.css` (1) |
| `--gray-a6` | gray | 8 | 2.87% | 3 | 8.57% | `src/css/config.css` (6)<br>`src/css/button.css` (1)<br>`src/css/form.css` (1) |
| `--gray-a7` | gray | 0 | 0.00% | 0 | 0.00% | - |
| `--gray-a8` | gray | 6 | 2.15% | 3 | 8.57% | `src/css/form.css` (4)<br>`src/css/button.css` (1)<br>`src/css/tabs.css` (1) |
| `--gray-a9` | gray | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--gray-a10` | gray | 0 | 0.00% | 0 | 0.00% | - |
| `--gray-a11` | gray | 4 | 1.43% | 3 | 8.57% | `src/css/config.css` (2)<br>`src/css/form.css` (1)<br>`src/css/menu.css` (1) |
| `--gray-a12` | gray | 1 | 0.36% | 1 | 2.86% | `src/css/tag.css` (1) |
| `--gray-contrast` | gray | 0 | 0.00% | 0 | 0.00% | - |
| `--gray-surface` | gray | 0 | 0.00% | 0 | 0.00% | - |
| `--gray-indicator` | gray | 0 | 0.00% | 0 | 0.00% | - |
| `--gray-track` | gray | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-1` | olive | 1 | 0.36% | 1 | 2.86% | `src/css/form.css` (1) |
| `--olive-2` | olive | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--olive-3` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-4` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-5` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-6` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-7` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-8` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-9` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-10` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-11` | olive | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--olive-12` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-a1` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-a2` | olive | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--olive-a3` | olive | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--olive-a4` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-a5` | olive | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--olive-a6` | olive | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--olive-a7` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-a8` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-a9` | olive | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--olive-a10` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-a11` | olive | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--olive-a12` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-contrast` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-surface` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-indicator` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--olive-track` | olive | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-1` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-2` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-3` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-4` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-5` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-6` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-7` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-8` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-9` | tomato | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--tomato-10` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-11` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-12` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-a1` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-a2` | tomato | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--tomato-a3` | tomato | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--tomato-a4` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-a5` | tomato | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--tomato-a6` | tomato | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--tomato-a7` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-a8` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-a9` | tomato | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--tomato-a10` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-a11` | tomato | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--tomato-a12` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-contrast` | tomato | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--tomato-surface` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-indicator` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--tomato-track` | tomato | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-1` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-2` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-3` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-4` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-5` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-6` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-7` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-8` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-9` | ruby | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--ruby-10` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-11` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-12` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-a1` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-a2` | ruby | 2 | 0.72% | 2 | 5.71% | `src/css/config.css` (1)<br>`src/css/menu.css` (1) |
| `--ruby-a3` | ruby | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--ruby-a4` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-a5` | ruby | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--ruby-a6` | ruby | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--ruby-a7` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-a8` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-a9` | ruby | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--ruby-a10` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-a11` | ruby | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--ruby-a12` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-contrast` | ruby | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--ruby-surface` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-indicator` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--ruby-track` | ruby | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-1` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-2` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-3` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-4` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-5` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-6` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-7` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-8` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-9` | pink | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--pink-10` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-11` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-12` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-a1` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-a2` | pink | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--pink-a3` | pink | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--pink-a4` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-a5` | pink | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--pink-a6` | pink | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--pink-a7` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-a8` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-a9` | pink | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--pink-a10` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-a11` | pink | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--pink-a12` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-contrast` | pink | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--pink-surface` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-indicator` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--pink-track` | pink | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-1` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-2` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-3` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-4` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-5` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-6` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-7` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-8` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-9` | violet | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--violet-10` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-11` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-12` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-a1` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-a2` | violet | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--violet-a3` | violet | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--violet-a4` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-a5` | violet | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--violet-a6` | violet | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--violet-a7` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-a8` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-a9` | violet | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--violet-a10` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-a11` | violet | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--violet-a12` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-contrast` | violet | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--violet-surface` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-indicator` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--violet-track` | violet | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-1` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-2` | indigo | 1 | 0.36% | 1 | 2.86% | `src/css/toast.css` (1) |
| `--indigo-3` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-4` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-5` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-6` | indigo | 2 | 0.72% | 2 | 5.71% | `src/css/config.css` (1)<br>`src/css/toast.css` (1) |
| `--indigo-7` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-8` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-9` | indigo | 5 | 1.79% | 2 | 5.71% | `src/css/config.css` (3)<br>`src/css/toast.css` (2) |
| `--indigo-10` | indigo | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--indigo-11` | indigo | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--indigo-12` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-a1` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-a2` | indigo | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--indigo-a3` | indigo | 5 | 1.79% | 1 | 2.86% | `src/css/config.css` (5) |
| `--indigo-a4` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-a5` | indigo | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--indigo-a6` | indigo | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--indigo-a7` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-a8` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-a9` | indigo | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--indigo-a10` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-a11` | indigo | 4 | 1.43% | 1 | 2.86% | `src/css/config.css` (4) |
| `--indigo-a12` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-contrast` | indigo | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--indigo-surface` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-indicator` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--indigo-track` | indigo | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-1` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-2` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-3` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-4` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-5` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-6` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-7` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-8` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-9` | blue | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--blue-10` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-11` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-12` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-a1` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-a2` | blue | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--blue-a3` | blue | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--blue-a4` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-a5` | blue | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--blue-a6` | blue | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--blue-a7` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-a8` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-a9` | blue | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--blue-a10` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-a11` | blue | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--blue-a12` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-contrast` | blue | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--blue-surface` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-indicator` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--blue-track` | blue | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-1` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-2` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-3` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-4` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-5` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-6` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-7` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-8` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-9` | teal | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--teal-10` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-11` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-12` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-a1` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-a2` | teal | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--teal-a3` | teal | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--teal-a4` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-a5` | teal | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--teal-a6` | teal | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--teal-a7` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-a8` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-a9` | teal | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--teal-a10` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-a11` | teal | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--teal-a12` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-contrast` | teal | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--teal-surface` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-indicator` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--teal-track` | teal | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-1` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-2` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-3` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-4` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-5` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-6` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-7` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-8` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-9` | grass | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--grass-10` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-11` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-12` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-a1` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-a2` | grass | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--grass-a3` | grass | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--grass-a4` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-a5` | grass | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--grass-a6` | grass | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--grass-a7` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-a8` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-a9` | grass | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--grass-a10` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-a11` | grass | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--grass-a12` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-contrast` | grass | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--grass-surface` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-indicator` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--grass-track` | grass | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-1` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-2` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-3` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-4` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-5` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-6` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-7` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-8` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-9` | mint | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--mint-10` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-11` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-12` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-a1` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-a2` | mint | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--mint-a3` | mint | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--mint-a4` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-a5` | mint | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--mint-a6` | mint | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--mint-a7` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-a8` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-a9` | mint | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--mint-a10` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-a11` | mint | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--mint-a12` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-contrast` | mint | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--mint-surface` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-indicator` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--mint-track` | mint | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-1` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-2` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-3` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-4` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-5` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-6` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-7` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-8` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-9` | lime | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--lime-10` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-11` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-12` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-a1` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-a2` | lime | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--lime-a3` | lime | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--lime-a4` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-a5` | lime | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--lime-a6` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-a7` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-a8` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-a9` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-a10` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-a11` | lime | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--lime-a12` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-contrast` | lime | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--lime-surface` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-indicator` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--lime-track` | lime | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-1` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-2` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-3` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-4` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-5` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-6` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-7` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-8` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-9` | yellow | 2 | 0.72% | 2 | 5.71% | `src/css/config.css` (1)<br>`src/css/content.css` (1) |
| `--yellow-10` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-11` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-12` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-a1` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-a2` | yellow | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--yellow-a3` | yellow | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--yellow-a4` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-a5` | yellow | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--yellow-a6` | yellow | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--yellow-a7` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-a8` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-a9` | yellow | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--yellow-a10` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-a11` | yellow | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--yellow-a12` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-contrast` | yellow | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--yellow-surface` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-indicator` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--yellow-track` | yellow | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-1` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-2` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-3` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-4` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-5` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-6` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-7` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-8` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-9` | orange | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--orange-10` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-11` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-12` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-a1` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-a2` | orange | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--orange-a3` | orange | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--orange-a4` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-a5` | orange | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--orange-a6` | orange | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--orange-a7` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-a8` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-a9` | orange | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--orange-a10` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-a11` | orange | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--orange-a12` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-contrast` | orange | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--orange-surface` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-indicator` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--orange-track` | orange | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-1` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-2` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-3` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-4` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-5` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-6` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-7` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-8` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-9` | gold | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--gold-10` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-11` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-12` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-a1` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-a2` | gold | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--gold-a3` | gold | 3 | 1.08% | 1 | 2.86% | `src/css/config.css` (3) |
| `--gold-a4` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-a5` | gold | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--gold-a6` | gold | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--gold-a7` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-a8` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-a9` | gold | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--gold-a10` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-a11` | gold | 2 | 0.72% | 1 | 2.86% | `src/css/config.css` (2) |
| `--gold-a12` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-contrast` | gold | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--gold-surface` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-indicator` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--gold-track` | gold | 0 | 0.00% | 0 | 0.00% | - |
| `--red-1` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-2` | red | 1 | 0.36% | 1 | 2.86% | `src/css/toast.css` (1) |
| `--red-3` | red | 2 | 0.72% | 1 | 2.86% | `src/css/button.css` (2) |
| `--red-4` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-5` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-6` | red | 1 | 0.36% | 1 | 2.86% | `src/css/toast.css` (1) |
| `--red-7` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-8` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-9` | red | 1 | 0.36% | 1 | 2.86% | `src/css/form.css` (1) |
| `--red-10` | red | 3 | 1.08% | 2 | 5.71% | `src/css/toast.css` (2)<br>`src/css/config.css` (1) |
| `--red-11` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-12` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-a1` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-a2` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-a3` | red | 2 | 0.72% | 1 | 2.86% | `src/css/badge.css` (2) |
| `--red-a4` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-a5` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-a6` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-a7` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-a8` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-a9` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-a10` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-a11` | red | 2 | 0.72% | 2 | 5.71% | `src/css/badge.css` (1)<br>`src/css/button.css` (1) |
| `--red-a12` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-contrast` | red | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--red-surface` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-indicator` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--red-track` | red | 0 | 0.00% | 0 | 0.00% | - |
| `--green-1` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-2` | green | 1 | 0.36% | 1 | 2.86% | `src/css/toast.css` (1) |
| `--green-3` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-4` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-5` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-6` | green | 1 | 0.36% | 1 | 2.86% | `src/css/toast.css` (1) |
| `--green-7` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-8` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-9` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-10` | green | 3 | 1.08% | 2 | 5.71% | `src/css/toast.css` (2)<br>`src/css/config.css` (1) |
| `--green-11` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-12` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-a1` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-a2` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-a3` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-a4` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-a5` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-a6` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-a7` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-a8` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-a9` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-a10` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-a11` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-a12` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-contrast` | green | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--green-surface` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-indicator` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--green-track` | green | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-1` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-2` | amber | 1 | 0.36% | 1 | 2.86% | `src/css/toast.css` (1) |
| `--amber-3` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-4` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-5` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-6` | amber | 1 | 0.36% | 1 | 2.86% | `src/css/toast.css` (1) |
| `--amber-7` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-8` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-9` | amber | 1 | 0.36% | 1 | 2.86% | `src/css/content.css` (1) |
| `--amber-10` | amber | 3 | 1.08% | 2 | 5.71% | `src/css/toast.css` (2)<br>`src/css/config.css` (1) |
| `--amber-11` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-12` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-a1` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-a2` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-a3` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-a4` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-a5` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-a6` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-a7` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-a8` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-a9` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-a10` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-a11` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-a12` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-contrast` | amber | 1 | 0.36% | 1 | 2.86% | `src/css/config.css` (1) |
| `--amber-surface` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-indicator` | amber | 0 | 0.00% | 0 | 0.00% | - |
| `--amber-track` | amber | 0 | 0.00% | 0 | 0.00% | - |

## 零直接引用变量按色系

### white (1/1)

`--white`

### black (1/1)

`--black`

### gray (8/28)

`--gray-7`, `--gray-8`, `--gray-a7`, `--gray-a10`, `--gray-contrast`, `--gray-surface`, `--gray-indicator`, `--gray-track`

### olive (19/28)

`--olive-3`, `--olive-4`, `--olive-5`, `--olive-6`, `--olive-7`, `--olive-8`, `--olive-9`, `--olive-10`, `--olive-12`, `--olive-a1`, `--olive-a4`, `--olive-a7`, `--olive-a8`, `--olive-a10`, `--olive-a12`, `--olive-contrast`, `--olive-surface`, `--olive-indicator`, `--olive-track`

### tomato (20/28)

`--tomato-1`, `--tomato-2`, `--tomato-3`, `--tomato-4`, `--tomato-5`, `--tomato-6`, `--tomato-7`, `--tomato-8`, `--tomato-10`, `--tomato-11`, `--tomato-12`, `--tomato-a1`, `--tomato-a4`, `--tomato-a7`, `--tomato-a8`, `--tomato-a10`, `--tomato-a12`, `--tomato-surface`, `--tomato-indicator`, `--tomato-track`

### ruby (20/28)

`--ruby-1`, `--ruby-2`, `--ruby-3`, `--ruby-4`, `--ruby-5`, `--ruby-6`, `--ruby-7`, `--ruby-8`, `--ruby-10`, `--ruby-11`, `--ruby-12`, `--ruby-a1`, `--ruby-a4`, `--ruby-a7`, `--ruby-a8`, `--ruby-a10`, `--ruby-a12`, `--ruby-surface`, `--ruby-indicator`, `--ruby-track`

### pink (20/28)

`--pink-1`, `--pink-2`, `--pink-3`, `--pink-4`, `--pink-5`, `--pink-6`, `--pink-7`, `--pink-8`, `--pink-10`, `--pink-11`, `--pink-12`, `--pink-a1`, `--pink-a4`, `--pink-a7`, `--pink-a8`, `--pink-a10`, `--pink-a12`, `--pink-surface`, `--pink-indicator`, `--pink-track`

### violet (20/28)

`--violet-1`, `--violet-2`, `--violet-3`, `--violet-4`, `--violet-5`, `--violet-6`, `--violet-7`, `--violet-8`, `--violet-10`, `--violet-11`, `--violet-12`, `--violet-a1`, `--violet-a4`, `--violet-a7`, `--violet-a8`, `--violet-a10`, `--violet-a12`, `--violet-surface`, `--violet-indicator`, `--violet-track`

### indigo (16/28)

`--indigo-1`, `--indigo-3`, `--indigo-4`, `--indigo-5`, `--indigo-7`, `--indigo-8`, `--indigo-12`, `--indigo-a1`, `--indigo-a4`, `--indigo-a7`, `--indigo-a8`, `--indigo-a10`, `--indigo-a12`, `--indigo-surface`, `--indigo-indicator`, `--indigo-track`

### blue (20/28)

`--blue-1`, `--blue-2`, `--blue-3`, `--blue-4`, `--blue-5`, `--blue-6`, `--blue-7`, `--blue-8`, `--blue-10`, `--blue-11`, `--blue-12`, `--blue-a1`, `--blue-a4`, `--blue-a7`, `--blue-a8`, `--blue-a10`, `--blue-a12`, `--blue-surface`, `--blue-indicator`, `--blue-track`

### teal (20/28)

`--teal-1`, `--teal-2`, `--teal-3`, `--teal-4`, `--teal-5`, `--teal-6`, `--teal-7`, `--teal-8`, `--teal-10`, `--teal-11`, `--teal-12`, `--teal-a1`, `--teal-a4`, `--teal-a7`, `--teal-a8`, `--teal-a10`, `--teal-a12`, `--teal-surface`, `--teal-indicator`, `--teal-track`

### grass (20/28)

`--grass-1`, `--grass-2`, `--grass-3`, `--grass-4`, `--grass-5`, `--grass-6`, `--grass-7`, `--grass-8`, `--grass-10`, `--grass-11`, `--grass-12`, `--grass-a1`, `--grass-a4`, `--grass-a7`, `--grass-a8`, `--grass-a10`, `--grass-a12`, `--grass-surface`, `--grass-indicator`, `--grass-track`

### mint (20/28)

`--mint-1`, `--mint-2`, `--mint-3`, `--mint-4`, `--mint-5`, `--mint-6`, `--mint-7`, `--mint-8`, `--mint-10`, `--mint-11`, `--mint-12`, `--mint-a1`, `--mint-a4`, `--mint-a7`, `--mint-a8`, `--mint-a10`, `--mint-a12`, `--mint-surface`, `--mint-indicator`, `--mint-track`

### lime (22/28)

`--lime-1`, `--lime-2`, `--lime-3`, `--lime-4`, `--lime-5`, `--lime-6`, `--lime-7`, `--lime-8`, `--lime-10`, `--lime-11`, `--lime-12`, `--lime-a1`, `--lime-a4`, `--lime-a6`, `--lime-a7`, `--lime-a8`, `--lime-a9`, `--lime-a10`, `--lime-a12`, `--lime-surface`, `--lime-indicator`, `--lime-track`

### yellow (20/28)

`--yellow-1`, `--yellow-2`, `--yellow-3`, `--yellow-4`, `--yellow-5`, `--yellow-6`, `--yellow-7`, `--yellow-8`, `--yellow-10`, `--yellow-11`, `--yellow-12`, `--yellow-a1`, `--yellow-a4`, `--yellow-a7`, `--yellow-a8`, `--yellow-a10`, `--yellow-a12`, `--yellow-surface`, `--yellow-indicator`, `--yellow-track`

### orange (20/28)

`--orange-1`, `--orange-2`, `--orange-3`, `--orange-4`, `--orange-5`, `--orange-6`, `--orange-7`, `--orange-8`, `--orange-10`, `--orange-11`, `--orange-12`, `--orange-a1`, `--orange-a4`, `--orange-a7`, `--orange-a8`, `--orange-a10`, `--orange-a12`, `--orange-surface`, `--orange-indicator`, `--orange-track`

### gold (20/28)

`--gold-1`, `--gold-2`, `--gold-3`, `--gold-4`, `--gold-5`, `--gold-6`, `--gold-7`, `--gold-8`, `--gold-10`, `--gold-11`, `--gold-12`, `--gold-a1`, `--gold-a4`, `--gold-a7`, `--gold-a8`, `--gold-a10`, `--gold-a12`, `--gold-surface`, `--gold-indicator`, `--gold-track`

### red (20/28)

`--red-1`, `--red-4`, `--red-5`, `--red-7`, `--red-8`, `--red-11`, `--red-12`, `--red-a1`, `--red-a2`, `--red-a4`, `--red-a5`, `--red-a6`, `--red-a7`, `--red-a8`, `--red-a9`, `--red-a10`, `--red-a12`, `--red-surface`, `--red-indicator`, `--red-track`

### green (24/28)

`--green-1`, `--green-3`, `--green-4`, `--green-5`, `--green-7`, `--green-8`, `--green-9`, `--green-11`, `--green-12`, `--green-a1`, `--green-a2`, `--green-a3`, `--green-a4`, `--green-a5`, `--green-a6`, `--green-a7`, `--green-a8`, `--green-a9`, `--green-a10`, `--green-a11`, `--green-a12`, `--green-surface`, `--green-indicator`, `--green-track`

### amber (23/28)

`--amber-1`, `--amber-3`, `--amber-4`, `--amber-5`, `--amber-7`, `--amber-8`, `--amber-11`, `--amber-12`, `--amber-a1`, `--amber-a2`, `--amber-a3`, `--amber-a4`, `--amber-a5`, `--amber-a6`, `--amber-a7`, `--amber-a8`, `--amber-a9`, `--amber-a10`, `--amber-a11`, `--amber-a12`, `--amber-surface`, `--amber-indicator`, `--amber-track`


# 色彩系统设计 V2

生成时间：2026-06-25

## 结论

这版把颜色系统拆成三层，但只有两层是语义层：

1. 业务状态层：`danger`、`success`、`warning`、`info`。
2. 色阶表达层：`tone-*`，负责强弱、深浅、明暗。
3. 结构层：`ui-*`，只负责页面背景、边框、文字、遮罩和输入框等基础 UI。

主题名已修正为 `violet`，最终输出不再保留 `purple`。

## 依据

- `--primary` 49 次
- `--background` 23 次
- `--foreground` 20 次
- `--border-color` 15 次
- `--danger` 12 次
- `--success` 8 次
- `--warning` 6 次

这说明组件最需要的是稳定的结构层和状态层，而不是继续把 `primary/secondary/nautral/accent` 当成总入口。

## 设计原则

业务状态层只管辨识度，不跟主题跑。色阶层只管明暗与强弱，跟主题跑。结构层只管 UI 骨架，不参与品牌表达。

## 主题列表

`gray`、`olive`、`tomato`、`ruby`、`pink`、`violet`、`indigo`、`blue`、`teal`、`grass`、`mint`、`lime`、`yellow`、`orange`、`gold`

## 色值策略

我保留了现有 `color.css` 的 15 套色阶作为 `tone` 源，因为它们已经足够丰富，问题主要在变量结构，不在色阶密度。

如果你后续想把主题做得更艳丽，只需要替换 `tone` 层，不必动组件 CSS。

## 输出文件

- [data/color-system-theme-output-v2.css](/Users/wangsihai/www/js/packages/vanilla-jui/data/color-system-theme-output-v2.css)

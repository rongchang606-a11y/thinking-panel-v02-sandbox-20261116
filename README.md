# 思维面板 V0.2 · 计数器

使用纯 HTML、CSS 和 JavaScript 实现的独立测试项目，无第三方依赖。

## 功能

- 标题下显示项目说明“连续开发验证项目”，保留原有说明“从零开始，记录你的每一次变化。”。
- 初始计数为 0，点击「+1」加一，点击「−1」减一，支持负数。
- 点击「重置」回到 0。刷新页面也会从 0 开始，不保存历史数据。
- “累计操作次数”初始为 0，加一、减一、重置每次点击都累计一次；数值已经为 0 时再次重置也计入。重置不会清空操作次数，刷新页面后两项均归零。
- 原生按钮支持 Tab 聚焦及 Enter / 空格操作，实时区域向辅助技术报告计数变化。
- 布局适配手机和桌面屏幕。

## 本地使用

需要 Node.js 22 或更高版本，不需要安装依赖。

直接用现代浏览器打开 `index.html`，或部署构建后的 `dist` 目录到静态站点。样式和经典 JavaScript 脚本均内嵌，无需加载外部字体或依赖。

```sh
npm test
npm run build
```

`npm test` 使用 Node 内置测试运行器，覆盖初始值、连续加减、负数、重置、操作次数累计（含零值时重复重置）、实例独立性、按钮事件与两项显示同步、项目说明在标题下的位置和可见性，以及页面控件和自包含资源。

`npm run build` 生成`dist/index.html` 及已到位的素材。构建输出可直接供静态 HTTP 服务使用。

## 文件

- `index.html`：页面结构、无障碍属性、响应式样式、计数状态和按钮绑定。
- `tests/counter.test.mjs`：自动化测试，不依赖浏览器或网络。

提交与 PR 由可信交付桥在任务进程结束后处理，本项目不自动合并或发布。

## V04: Mountain focus

- The new mountain area pairs with the original counter. Desktop uses two columns; tablet and narrow screens stack the visual above the controls. The image stays in its own area and cannot cover buttons.
- Click the focus button to hide the visual and enlarge the count and action buttons. Click it again to restore the regular layout. The toggle exposes aria-pressed and supports native keyboard activation. Switching layouts preserves the current count and operation total, and never counts as a counter operation.
- The visual references exactly `assets/v04/background.png`. Until the separate art integration supplies that file, a CSS gradient and short placeholder appear. No generated image is included in this development change. Load success, failure and cached images are handled; counting works without the image. After adding the asset, rebuild and reload the page.
- New styles and classic JavaScript are embedded in index.html, preserving the shared single-file requirement. Both scripts run after the controls exist, so opening index.html directly works without module loading. No fonts, packages or network services are required. Separate src/styles files were tried, but this execution environment denies directory copying in the unmodified build script; inline delivery avoids that limitation.
- Deploy the entire `dist` directory including any integrated assets. The existing build copies assets automatically when supplied; the image is the only separate page resource.
- `tests/focus.test.mjs` executes the real scripts with a small DOM fixture through Node vm. It covers focus on/off and accessible state, original actions across mode changes, the relative image contract, missing/failed/late/cached images, and responsive layout rules. These are automated behavior and contract checks, not browser screenshot verification.

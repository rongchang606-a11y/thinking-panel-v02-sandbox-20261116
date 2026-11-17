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

## V04 山间专注整合

- 实际主视觉已到位：`assets/v04/background.png`，1672×941 横版 PNG。`assets/v04/manifest.json` 保留美术生成工具、提示词、尺寸和时间；本轮没有生成或修改图片。
- 图片以原生 `<img>` 引用，装饰图片使用空替代文本，不参与点击。标题放在画面上方留白处，山景与计数按钮分处两个区域。桌面使用双列，760px 及以下改为单列，图片区域按素材比例展示；短横屏从顶部排版并允许页面滚动。
- 「专注模式」隐藏山景、放大计数和操作按钮，再次点击「恢复普通布局」恢复展示。切换提供 `aria-pressed` 状态，保留当前计数和累计操作次数，切换自身不计入操作次数。加一、减一、负数、重复重置及项目说明均保留。
- 图片未加载、加载失败时显示渐变占位；加载完成后隐藏占位，缓存命中也能直接展示。图片失败不影响计数或布局切换。
- 沿用共享文档要求的单文件内嵌样式与经典脚本，无模块、外部字体、依赖或网络服务。部署时必须一并交付素材目录。

### 输入来源

以下提交号是可信任务记录中的输入版本，并非本轮创建的提交：

| 输入 | 版本 |
| --- | --- |
| 开发与基线 | `de9c58feb999a69c467df90d950fd3ca3fa51707` |
| 美术 | `6f88df3a87c5de699c562c595ee782a70576b606` |
| PNG SHA-256 | `3fc0f71b59f52bf3c4d8c6e7417f69a49e130c2dfb97cf67b6cceae8fdf42da4` |

### 验证范围与环境限制

`tests/focus.test.mjs` 用 Node VM 执行页面实际脚本，覆盖专注切换、切换期间计数与累计操作、缓存及失败占位。`tests/integration.test.mjs` 新增真实 PNG 哈希、尺寸和解压检查、页面图片引用、横竖屏样式契约、原生可访问按钮及来源文档检查。全部测试只使用 Node 内置能力。

响应式与按钮检查属于自动化行为及静态契约验证，本轮没有完成浏览器截图或真实键盘操作验收。

本轮已用指定 Node 24.22.3 完成构建。需同时将该运行时目录放在当前进程 PATH 首位，否则 npm 的子命令仍可能调用登录 Shell 提供的 Node 22，导致素材目录复制失败。构建脚本和包配置保持原样。

新增 	ests/build.test.mjs：在工作区内的临时目录执行原始构建脚本，逐字节核对输出 HTML、PNG 与素材清单，结束后清理临时目录。

Windows PowerShell verification (process-local PATH only):

```powershell
$env:Path = 'E:/日常/AI-Project-Platform-Test/agent-autoloop/runtime/node-v24.22.3-win-x64;' + $env:Path
& 'E:/日常/AI-Project-Platform-Test/agent-autoloop/runtime/node-v24.22.3-win-x64/node.exe' 'E:/日常/AI-Project-Platform-Test/agent-autoloop/runtime/node-v24.22.3-win-x64/node_modules/npm/bin/npm-cli.js' test
& 'E:/日常/AI-Project-Platform-Test/agent-autoloop/runtime/node-v24.22.3-win-x64/node.exe' 'E:/日常/AI-Project-Platform-Test/agent-autoloop/runtime/node-v24.22.3-win-x64/node_modules/npm/bin/npm-cli.js' run build
```

Validation: all 18 tests pass under Node 24.22.3; build succeeds. Delivered HTML, PNG and manifest match their source files byte for byte.

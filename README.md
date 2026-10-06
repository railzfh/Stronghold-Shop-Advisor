# 卫戍协议 · 构筑顾问

独立的 Chrome / Edge Manifest V3 浏览器插件，用于在《卫戍协议：盟约》页面上显示商店构筑建议、回合提醒和禁用干员风险提示。

本项目只显示辅助信息，不会自动购买、出售、刷新、部署、切换策略，也不读取 WebSocket、账号信息或隐藏游戏状态。

## 安装

1. 下载本仓库源码，或在 GitHub Releases 下载 `shop-advisor-*.zip`。
2. 如果下载的是 ZIP，先解压到本地目录。Chrome / Edge 的“加载已解压的扩展程序”需要一个目录，而不是 ZIP 文件。
3. 打开 `chrome://extensions` 或 `edge://extensions`，启用“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择本仓库根目录，确认目录中直接包含 `manifest.json`。
5. 打开游戏页面，点击扩展图标，导入或编辑策略，然后点击“应用到当前游戏”。

扩展只在用户点击“应用到当前游戏”后向当前 HTTP/HTTPS 页面注入显示层。浏览器首次使用时可能会询问网页访问权限。

## 功能

- 羁绊和干员规则分别编辑，支持任意数量的目标。
- 优先、推荐、可考虑三档提示，并支持逐干员理由。
- 回合注意事项，可按统一 JSON 配置。
- 本局禁用干员分析，支持 `critical`、`warning`、`info` 三档风险。
- 统一配置导入/导出，可分享策略、提醒和禁用分析规则。
- 页面商店高亮、推荐徽标，以及不会改变游戏行为的提醒面板。

## 适配边界

插件当前依赖游戏页面可见 DOM 中的以下选择器：

- `.shopbar__cards`
- `.shopbar__rwcards`
- `.scard__name`
- `.scard__mergetag`
- 本局信息中的禁用干员缩略图标题

如果游戏更新了商店或本局信息界面，需要同步修改 `content.js` 的 DOM 适配器，并补充回归测试。插件目录中的 `catalog.json` 是从主游戏项目导出的轻量目录快照，不包含服务器、素材或完整游戏逻辑。

## 配置

配置格式见 [CONFIG.md](CONFIG.md)。注意事项的独立旧格式见 [ATTENTION-NOTES.md](ATTENTION-NOTES.md)；推荐使用统一配置文件。

配置导入只接受 JSON 数据，不执行配置中的脚本、表达式或 HTML。未知 ID、重复规则、无效条件和超长文本会被拒绝。

## 开发

环境要求：Node.js 22 或更高版本。

```bash
npm test
npm run check
npm run build
```

`npm run build` 会执行校验，并生成：

- `dist/unpacked/`：可直接加载的扩展目录；
- `dist/shop-advisor-<version>.zip`：根目录直接包含 `manifest.json` 的发布包。

### 同步游戏目录

独立项目不依赖主游戏仓库才能运行。需要更新干员或羁绊目录时，把主游戏仓库生成的轻量 `catalog.json` 作为输入：

```bash
node tools/build-catalog.mjs --input ../Stronghold-Protocol/extension/catalog.json
```

命令会校验 ID、重复项和字段，并写入本项目的 `catalog.json`。详细约束见 [docs/CATALOG-SYNC.md](docs/CATALOG-SYNC.md)。

## 贡献

提交代码前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。仓库采用 Pull Request 工作流，配置格式、DOM 适配器和 UI 修改都有对应的验证要求。

## 隐私与版权

隐私说明见 [PRIVACY.md](PRIVACY.md)，安全问题请阅读 [SECURITY.md](SECURITY.md)。

本项目代码采用 GPL-3.0-or-later。游戏名称、干员名称、游戏目录等派生数据属于其原权利人，具体边界见 [NOTICE.md](NOTICE.md) 和 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。本项目是非官方工具，与相关权利人没有关联或授权关系。

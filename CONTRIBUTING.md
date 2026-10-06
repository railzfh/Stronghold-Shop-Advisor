# 贡献指南

感谢参与构筑顾问。请先阅读 `README.md`、`NOTICE.md` 和 `CODE_OF_CONDUCT.md`。

## 开发环境

- Node.js 22 或更高版本；
- Chrome 或 Edge，用于手动加载扩展；
- 可访问的游戏页面或脱敏的静态 DOM 测试页面。

安装后运行：

```bash
npm test
npm run check
npm run build
```

## 提交范围

插件 PR 应保持独立，不要修改或复制主游戏服务器、客户端、素材、账号数据、网络抓包或隐藏状态数据。

特别注意：

- 配置导入必须保持纯 JSON，不能执行脚本、表达式或 HTML；
- 不要加入 `eval`、`new Function` 或远程脚本加载；
- 不要自动购买、出售、刷新、部署或替玩家切换策略；
- 只读取页面上为用户可见的必要信息；
- 游戏目录只能保留插件所需的轻量 `catalog.json` 快照；
- 不要提交临时截图、浏览器配置目录、`dist/`、`.cache/`、本地策略或完整游戏素材。

## 修改要求

### 配置格式

修改配置格式时必须：

1. 更新 `CONFIG.md`；
2. 增加或更新解析校验测试；
3. 说明兼容性和迁移方式；
4. 按项目规则递增版本号最后一位。

### DOM 适配器

修改 `content.js` 的选择器、页面注入结构或权限时必须：

1. 在 PR 中列出受影响的选择器；
2. 增加静态 DOM 回归测试，或附上脱敏的浏览器验证步骤；
3. 说明插件如何在页面刷新、商店刷新和关闭顾问时恢复原状。

### UI

弹窗或游戏页面 UI 修改应附上至少一种验证结果：

- 浏览器手动验证步骤；
- 截图；
- Playwright 或其他自动化检查。

## Commit 规范

提交信息使用简短的 Conventional Commits 风格：

```text
feat: add configurable ban groups
fix: keep popup width stable
test: cover config migration
docs: explain catalog sync
chore: update release workflow
```

正文可补充原因和测试结果。一个提交尽量只做一类事情，不要把临时文件、格式化全仓库和功能修改混在一起。

## Pull Request

PR 描述至少包括：

- 改了什么；
- 为什么改；
- 影响哪些用户行为；
- 是否改变配置格式或页面权限；
- 执行了哪些测试；
- 是否需要同步游戏目录或更新文档。

维护者会重点检查兼容性、隐私边界、版权边界、无障碍和没有自动执行游戏操作。

## 版本与发布

当前版本格式为 `1.0.x`。每次合并到可发布版本时递增最后一位，例如 `1.0.12` 到 `1.0.13`，并同步：

- `package.json`
- `manifest.json`
- `CHANGELOG.md`

发布使用 `v1.0.x` 标签。GitHub 分支保护、审核人数和 Actions 权限的推荐设置见 [REPOSITORY-SETUP.md](REPOSITORY-SETUP.md)。

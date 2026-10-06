# GitHub 仓库设置清单

下面的项目文件已经随仓库提供；GitHub 网页上的保护规则仍需要仓库管理员手动开启。

## 首次创建

1. 在 GitHub 创建空仓库，建议名称为 `Stronghold-Shop-Advisor`。
2. 推送本地 `main` 分支和 `v1.0.12` 标签。
3. 在仓库 Settings > General 中确认许可证、Issues 和 Actions 设置。
4. 在 Settings > Collaborators and teams 中只授予必要的写权限。
5. 在 Settings > Security 中启用 Dependabot alerts、Dependabot security updates 和 Secret scanning（账号方案支持时）。

## `main` 分支保护

建议对 `main` 设置：

- 禁止直接推送，所有改动必须通过 Pull Request；
- 合并前要求 `CI / test` 成功；
- 至少 1 名维护者审核；
- 新提交后重新审核，禁止绕过已有审核；
- 禁止强制推送和删除分支；
- 允许维护者在必要时绕过规则，但所有绕过操作应在 PR 中说明。

## 发布规则

- 发布版本使用 `v1.0.x` 标签，版本号的最后一位每次递增。
- 发布前运行 `npm test`、`npm run check` 和 `npm run build`。
- GitHub Release 只上传 `dist/shop-advisor-<version>.zip`。
- Release 说明应写明适配的游戏页面版本、已知限制和配置格式变更。

## 权限与 Actions

- Actions 默认只读仓库内容。
- 不在 CI 中保存游戏账号、登录 Cookie、页面录屏或完整游戏客户端。
- 第三方 Actions 固定到经过审查的 major 版本；升级时在 PR 中说明。

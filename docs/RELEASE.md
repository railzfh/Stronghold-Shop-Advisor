# 发布流程

1. 更新 `package.json`、`manifest.json` 和 `CHANGELOG.md` 的最后一位版本号。
2. 运行 `npm test`。
3. 运行 `npm run check`。
4. 运行 `npm run build`。
5. 检查 `dist/shop-advisor-<version>.zip` 的根目录直接包含 `manifest.json`。
6. 在 Git 中提交版本变更，创建同名标签，例如 `v1.0.12`。
7. 推送分支和标签，在 GitHub Release 中上传 ZIP。

Release ZIP 不应包含 `.git/`、`node_modules/`、`.cache/`、完整游戏数据或临时截图。

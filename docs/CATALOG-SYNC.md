# 目录同步说明

插件需要通过 `catalog.json` 将页面上的干员名称映射到 `chessId`，并将羁绊名称映射到 `bondId`。独立项目只提交插件所需的轻量目录，不依赖主游戏仓库运行。

## 输入格式

输入文件必须是：

```json
{
  "operators": [
    {
      "id": "chess_char_1_03_a",
      "name": "惊蛰",
      "tier": 1,
      "bonds": ["yanShip"]
    }
  ],
  "bonds": [
    {
      "id": "yanShip",
      "name": "炎"
    }
  ]
}
```

干员 `id`、羁绊 `id` 必须唯一；干员的 `bonds` 必须引用输入中的羁绊 ID；`tier` 必须是正整数。不要加入完整技能文本、数值表、素材、图片路径或服务器数据。

## 更新流程

在主游戏项目中生成或复制轻量目录后，在独立项目根目录运行：

```bash
node tools/build-catalog.mjs --input ../Stronghold-Protocol/extension/catalog.json
npm run check
npm test
```

如果两个项目不在同一个父目录，改成绝对路径或其他相对路径。提交目录更新时，PR 需要说明来源项目的版本或提交号。

## 兼容性

目录快照只负责名称和 ID 映射。游戏页面选择器仍由 `content.js` 维护；目录更新不能替代 DOM 适配器测试。

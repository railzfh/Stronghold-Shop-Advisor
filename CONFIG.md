# 顾问统一配置文件指南

插件现在使用一个配置文件，同时保存商店推荐规则和回合注意事项：

```json
{
  "format": "stronghold.shop-advisor-config",
  "version": 1,
  "name": "炎盟约经营方案",
  "strategy": {
    "format": "stronghold.shop-strategy",
    "version": 1,
    "name": "炎盟约经营方案",
    "bondRules": [
      { "bondId": "yanShip", "tier": 1, "reason": "核心层数目标" },
      { "bondId": "investShip", "tier": 2, "reason": "放大获得时特质" }
    ],
    "operatorRules": [
      { "chessId": "chess_char_1_03_a", "tier": 1, "reason": "惊蛰获得时加炎层数" }
    ],
    "mergeTier": 1
  },
  "notes": {
    "format": "stronghold.shop-attention-notes",
    "version": 1,
    "name": "炎盟约回合提醒",
    "defaultText": "保留升级和必要刷新资金。",
    "rounds": {
      "1": ["先保证基础战力。", "看到惊蛰时优先保留。"],
      "6": ["检查炎是否达到6名不同干员。"]
    }
  },
  "banAdvisor": {
    "format": "stronghold.shop-ban-advisor",
    "version": 1,
    "enabled": true,
    "groups": [
      {
        "id": "kjerag-core",
        "name": "谢拉格核心",
        "operatorIds": ["chess_char_4_13_a", "chess_char_5_14_a"],
        "minAvailable": 1,
        "severity": "warning",
        "message": "谢拉格核心组件不足，叠层效率会下降。",
        "conditions": { "anyBanned": true }
      }
    ]
  }
}
```

重要度使用三档：

- `1`：优先
- `2`：推荐
- `3`：可考虑

`bondRules` 可以添加任意数量的羁绊。`operatorRules` 可以为每个干员单独指定优先级和说明；干员规则会覆盖它命中的羁绊规则和合成提示。`mergeTier` 为 `null` 时关闭合成提示。

干员 ID 和羁绊 ID 必须来自游戏目录。当前可用干员和羁绊可以在插件弹窗的搜索列表中确认。导入时插件会检查 ID、重复规则、字段名、重要度和文本长度；不符合要求的文件不会替换当前配置。

注意事项的 `rounds` 键是 `1` 到 `99` 的回合号，值是字符串数组，每回合最多 12 条，每条最多 240 个字符。没有专属回合内容时使用 `defaultText`。注意事项只显示文本，不会自动执行游戏操作。

## 禁用干员分析

`banAdvisor` 是可选字段。没有它时插件照常工作，不显示禁用构筑分析。

分析结果会同时出现在插件弹窗和游戏页面顾问区域。`critical`、`warning`、`info` 分别对应严重、警告和提示。

每个 `groups` 项代表一个构筑组件组：

- `operatorIds`：组成该组件的干员 `chessId`。
- `minAvailable`：可用干员少于这个数量时触发。
- `conditions.bannedAtLeast`：至少有多少名组内干员被禁用时触发。
- `conditions.availableBelow`：可用人数低于这个数量时触发。
- `conditions.anyBanned`：组内任意一名干员被禁用时触发。
- `severity`：只能使用 `critical`、`warning`、`info`。
- `message`：触发后在插件弹窗和游戏页面显示的文字，最多 240 个字符。

多个条件满足任意一个就触发。例如：

```json
{
  "id": "freeze-engine",
  "name": "寒冷冻结发动机",
  "operatorIds": ["chess_char_4_13_a", "chess_char_3_20_a"],
  "severity": "warning",
  "message": "寒冷或冻结组件不足，谢拉格叠层效率会明显下降。",
  "conditions": { "anyBanned": true }
}
```

插件只读取本局信息界面或本局信息抽屉中可见的禁用干员名称，再和目录中的干员 ID 匹配。它不会读取隐藏状态，也不会自动切换策略或执行购买操作。

操作流程：

1. 在插件弹窗点击“导入配置”。
2. 选择这个统一 JSON 文件。
3. 在预览框确认导入。
4. 点击“应用到当前游戏”。
5. 点击“导出配置”可以生成可分享的完整配置文件。

旧版单独的策略 JSON 和注意事项 JSON 仍可以保留作备份，但新的分享文件应使用这个统一格式。

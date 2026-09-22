# 云隐仙踪

水墨画风的单机修仙门派模拟器（H5）。对标《了不起的修仙模拟器》的玩法框架，全部名词、文案、数值自创。

## 运行
双击 `index.html` 即可（零依赖，无需服务器、无需构建）。存档在浏览器 localStorage。
开发者：`npm test` 跑核心回归（node），浏览器控制台 `__G.test()` 跑全量（含水墨烘焙预算），`__G` 为调试钩子。
**联网模式（可选）**：`node server/server.js` → 打开 `http://localhost:8700`，云端存档/门派参观/排行榜（详见 [server/README.md](server/README.md)）；断网全功能单机。

## 当前状态
**P0~P7 全部交付**（v1.0.0 全卷终）：经营→修行→百艺→江湖→九劫飞升/旧案三结局→打磨→云端。后续为长线维护与画风终稿替换。

| 里程碑 | 内容 | 状态 |
|---|---|---|
| P0 地基·笔墨 | 引擎骨架 + 水墨渲染管线 v1 | ✅ |
| P1 荒山立足 | 杂役/建造/庶务/炊事/心境/节气 | ✅ |
| P2 仙路初启 | 修士/境界/道典神通/五行/风水局/观星台 | ✅ |
| P3 百艺俱全 | 丹器符阵四艺 + 灵植蕴养 | ✅ |
| P4 江湖已远 | 九州游历/妖潮/犯山/恩怨客卿/拍卖 | ✅ |
| P5 天道无常 | 九劫天劫 QTE/飞升传承/旧案五章/三结局 | ✅ |
| P6 成卷 | 教学/清晰模式/平衡验证 | ✅ |
| P7 云卷云舒 | 轻账号/云存档/门派参观/排行榜（零 npm 后端） | ✅ |

## 项目结构
```
index.html        入口（经典 script 按序加载 js/）
docs/             产品文档、数值表
js/core           引擎：boot/tick/rng/save/debug(__G)/bus
js/db             静态数据：境界/道典/丹方/建筑/事件/剧情…
js/sim            模拟器：time/map/disciple/work/build/cultivate/craft/combat/world/story
js/render         Canvas 分层渲染 + ink/ 水墨管线（笔触库/宣纸/雾水）
js/ui             DOM 面板
test/             __G.test() 泵帧回归套件
```

调试：浏览器控制台访问 `__G`。版本记录见 [CHANGELOG.md](CHANGELOG.md)，设计见 [docs/产品文档.md](docs/产品文档.md)。

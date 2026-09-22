# 云卷云舒 · 云端服务器（P7）

Node ≥ 22.5（需内置 `node:sqlite`），**零 npm 依赖**。

```bash
node server/server.js          # :8700，同时托管游戏静态文件（联网模式）
XIANG_PORT=9000 node server/server.js   # 自定义端口
```

- 打开 `http://localhost:8700` 即为带云端的完整游戏；双击 `index.html` 则纯离线单机（探测不到后端时「云端」按钮静默降级）。
- 数据落在 `server/cloud.db`（sqlite）。删库即重置。
- API：`/api/ping | /api/auth | /api/saves/:slot | /api/sects | /api/board`（详见 server.js 头注）。
- 轻账号=道号即身份（无密码，重登自动换 token），适合个人与朋友间共享；云存档三槽 LWW；门派参观只读快照；排行榜投稿取最优。

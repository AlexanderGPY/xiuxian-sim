/* 营造套间：整间放置——围墙+门+家具一次落图，杜绝"随手散放"。
   w/h 为外框；items 相对左上角（外墙满环、门嵌墙线、家具居内）；cost 由各件自动汇总。 */
(function (X) {
  // 生成 5×5 / 6×6 满环墙：doorIn 墙线上替换为门
  function ring(n, wallId, doorAt) {
    const items = [];
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
      const onRing = x === 0 || y === 0 || x === n - 1 || y === n - 1;
      if (!onRing) continue;
      const [dx, dy] = doorAt;
      items.push([x === dx && y === dy ? 'doorWood' : wallId, x, y]);
    }
    return items;
  }
  const S = [
    {
      id: 'suiteBed', name: '卧房套间', cat: '起居',
      w: 5, h: 5, desc: '石墙满环+木门+玄铁榻+灯架——土命弟子住此易得「大吉」（土生金）',
      items: [
        ...ring(5, 'wallStone', [2, 4]),
        ['ironBed', 1, 1], ['lantern', 3, 3],
      ],
    },
    {
      id: 'suiteCalm', name: '静室套间', cat: '道场',
      w: 5, h: 5, desc: '石墙静室+双蒲团+梅瓶——修士打坐标配，风水生扶本命则修炼大吉',
      items: [
        ...ring(5, 'wallStone', [2, 4]),
        ['mat', 1, 1], ['mat', 3, 1], ['vase', 2, 3],
      ],
    },
    {
      id: 'suiteDan', name: '丹房套间', cat: '百艺',
      w: 6, h: 6, desc: '石墙作坊间+丹炉+置物台——委托炼丹的完整丹房',
      items: [
        ...ring(6, 'wallStone', [2, 5]),
        ['alchemy', 1, 1], ['stocker', 1, 4],
      ],
    },
    {
      id: 'suiteHall', name: '迎客堂套间', cat: '起居',
      w: 5, h: 5, desc: '木墙堂屋+客舍+食案——结缘客卿、安置来客的门面',
      items: [
        ...ring(5, 'wallWood', [2, 4]),
        ['guesthall', 1, 1], ['table', 2, 3],
      ],
    },
  ];
  for (const s of S) {
    s.cost = {};
    for (const [id] of s.items) {
      const c = X.Buildings.byId[id].cost || {};
      for (const k in c) s.cost[k] = (s.cost[k] || 0) + c[k];
    }
  }
  const SU = {
    list: S,
    byId: {},
    /* 整间落图：先验资与地形，再一次扣料逐件放蓝图 */
    place(sid, x, y) {
      const s = SU.byId[sid];
      if (!s) return { ok: false, why: '无此套间' };
      for (const k in s.cost) if (X.Inv.count(k) < s.cost[k]) return { ok: false, why: `物料不足（${X.Items[k].name} 需 ${s.cost[k]}）` };
      for (const [id, dx, dy] of s.items) {
        if (!X.Build.terrainOk(id, x + dx, y + dy) || X.Build.at(x + dx, y + dy)) {
          return { ok: false, why: `${X.Buildings.byId[id].name} 落位受阻（${x + dx},${y + dy}）` };
        }
      }
      for (const k in s.cost) X.Inv.take(k, s.cost[k]);
      let n = 0;
      for (const [id, dx, dy] of s.items) {
        if (X.Build.place(id, x + dx, y + dy, { free: true })) n++;
      }
      X.Game.log(`【营造】${s.name}落图（${n} 件蓝图），杂役即将开工`);
      X.Bus.emit('suite:place', { sid, x, y, n });
      return { ok: true, n };
    },
  };
  for (const s of S) SU.byId[s.id] = s;
  X.Suites = SU;
})(globalThis.XIANG);

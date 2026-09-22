/* 库存：门派总库存（P1 简化为全局账目，不带搬运损耗）。
   容量 = 基础 200 + 各仓储建筑加成，分物品上限。 */
(function (X) {
  const I = {
    stock: { wood: 0, stone: 0, grain: 0, meal: 0, ling: 0 },
    TARGET: { wood: 60, stone: 40, grain: 80, meal: 14 },   // 自动补给目标
  };

  I.capOf = function (item) {
    let cap = 900;
    X.Build.each(b => {
      if (!b.built || !b.def.tags || !b.def.tags.store) return;
      const s = b.def.tags.store;
      if (!s.only || s.only === item) cap += s.cap * (s.only ? 1 : 0.2);  // 通用台对单项只算两成
    });
    return Math.floor(cap);
  };

  I.add = function (item, n) {
    const cap = I.capOf(item);
    const room = Math.max(0, cap - I.stock[item]);
    const real = Math.min(n, room);
    I.stock[item] += real;
    return real;
  };
  I.take = function (item, n) {
    if (I.stock[item] >= n) { I.stock[item] -= n; return true; }
    return false;
  };
  I.count = item => I.stock[item];
  I.foodCount = () => I.stock.meal + I.stock.grain;
  I.reset = () => { for (const k in I.stock) I.stock[k] = 0; };

  // 存储点：找离 (x,y) 最近的已落成仓储建筑（供 AI 行走目标）
  I.nearestStore = function (x, y) {
    let best = null, bd = Infinity;
    X.Build.each(b => {
      if (!b.built || !b.def.tags || !b.def.tags.store) return;
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < bd) { bd = d; best = b; }
    });
    return best;
  };

  I.snapshot = () => ({ stock: { ...I.stock } });
  I.restore = o => { for (const k in I.stock) I.stock[k] = (o.stock[k] || 0); };

  X.Inv = I;
})(globalThis.XIANG);

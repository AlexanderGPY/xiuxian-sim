/* 坊市拍卖：声望≥60 方得入场；每 90 日一届（首届第 75 日），会期两日。
   NPC 竞价抬价（每日加价至其心理上限），玩家跟价一口定胜负。
   另设摆摊售货（rep≥20）：灵材/丹药换灵石，卖货亦涨声望。 */
(function (X) {
  const SELL = { herb: 2, lingzhi: 5, yaodan1: 8, yaodan2: 15, yaodan3: 28, yaodan4: 50, guDan: 120 };

  const A = {
    nextDay: 75,
    active: false,
    dayLeft: 0,
    lots: [],      // {id, kind, rid?, name, desc, base, cur, mine:false, sold:false}
    nextLotId: 1,
  };

  function genLots() {
    const lots = [];
    // 1~2 件灵材包
    for (let i = 0; i < X.rng.i(1, 2); i++) {
      const item = X.rng.pick(['lingzhi', 'yaodan2', 'yaodan3']);
      const n = item === 'yaodan3' ? 1 : X.rng.i(2, 3);
      lots.push({ kind: 'item', rid: item, n, name: `${X.Items[item].name}×${n}`, desc: '游历拍卖硬通货', base: SELL[item] * n });
    }
    // 未得之典一部
    const owned = new Set(X.Disciple.list.map(d => d.scId).filter(Boolean));
    const scrolls = X.Game.found.slice();
    const sc = X.Scriptures.list.filter(s => s.locked && !owned.has(s.id) && scrolls.indexOf(s.id) < 0);
    if (sc.length) {
      const s = X.rng.pick(sc);
      lots.push({ kind: 'scroll', rid: s.id, name: `道典·${s.name}`, desc: '孤本残卷，过时不候', base: 60 + (10 - s.tier) * 15 });
    }
    // 未种之灵植种一粒
    const unseed = X.Recipes.splant.filter(p => !X.SP.planted(p.id) && X.Inv.count(p.seed) === 0);
    if (unseed.length) {
      const p = X.rng.pick(unseed);
      lots.push({ kind: 'seed', rid: p.seed, name: `${X.Items[p.seed].name}`, desc: '天地灵植之种', base: 45 });
    }
    // 法宝一件（当场开光）
    if (X.rng.chance(0.7)) {
      const r = X.rng.pick(X.Recipes.qi);
      lots.push({ kind: 'artifact', rid: r.id, name: `法宝·${r.name}`, desc: '附随机词条', base: 55 });
    }
    for (const l of lots) {
      l.id = A.nextLotId++;
      l.cur = l.base; l.mine = false; l.sold = false;
      l.rivalMax = Math.round(l.base * X.rng.f(1.15, 1.9));   // NPC 心理上限
    }
    return lots;
  }

  A.open = function () {
    A.active = true; A.dayLeft = 2;
    A.lots = genLots();
    X.Game.log(`【拍卖】白石城万宝楼开槌，${A.lots.length} 件拍品待价而沽（会期两日）`);
    X.Bus.emit('auction:on', A.lots.length);
  };
  A.close = function () {
    for (const l of A.lots) {
      if (l.mine && !l.sold) A.deliver(l);
      else if (!l.mine && X.rng.chance(0.6)) { /* 流拍或他人得之 */ }
    }
    A.active = false; A.lots = [];
    A.nextDay = X.Time.day + 90;
    X.Game.log('【拍卖】本届拍卖会落幕');
  };
  A.deliver = function (l) {
    if (l.kind === 'item') X.Inv.add(l.rid, l.n);
    else if (l.kind === 'scroll') { X.Game.found.push(l.rid); X.Game.log(`拍得道典《${X.Scriptures.byId[l.rid].name}》，可在藏经阁研读`); }
    else if (l.kind === 'seed') X.Inv.add(l.rid, 1);
    else if (l.kind === 'artifact') X.Craft.makeArt(l.rid, null);
    X.Game.addRep(1);
  };
  // 玩家跟价：需灵石 = 当前价 +12%
  A.bid = function (lotId) {
    const l = A.lots.find(x => x.id === lotId && !x.sold);
    if (!l) return { ok: false, why: '拍品不存在' };
    const price = Math.round(l.cur * 1.12);
    if (!X.Inv.take('ling', price)) return { ok: false, why: '灵石不足' };
    if (l.mine) { X.Inv.add('ling', price); return { ok: false, why: '已是你的价' }; }
    l.cur = price; l.mine = true;
    return { ok: true, price };
  };
  // 摆摊售货
  A.sell = function (item) {
    if (X.Game.rep() < 20) return { ok: false, why: '声望不足 20，无人问津' };
    const n = X.Inv.count(item);
    if (!n || !SELL[item]) return { ok: false, why: '无可售之物' };
    const sell = Math.min(n, item === 'herb' ? 5 : 3);
    if (!X.Inv.take(item, sell)) return { ok: false, why: '取货失败' };
    const ling = SELL[item] * sell;
    X.Inv.add('ling', ling);
    X.Game.addRep(1);
    return { ok: true, ling, item, n: sell };
  };
  A.sellPrices = () => ({ ...SELL });

  X.Bus.on('time:day', () => {
    if (!X.Game.inited) return;
    if (!A.active && X.Time.day >= A.nextDay) {
      if (X.Game.rep() >= 60) A.open();
      else {
        A.nextDay = X.Time.day + 30;
        X.Game.log('万宝楼来使：声望不足 60，暂无拍卖请柬（游历斩妖可扬名）');
      }
      return;
    }
    if (!A.active) return;
    // NPC 每日抬价：未被玩家持有的拍品加价 8~15%，至其上限
    for (const l of A.lots) {
      if (l.sold) continue;
      if (!l.mine && l.cur < l.rivalMax) l.cur = Math.min(l.rivalMax, Math.round(l.cur * X.rng.f(1.08, 1.15)));
    }
    if (--A.dayLeft <= 0) A.close();
  });

  A.snapshot = () => ({ nextDay: A.nextDay, active: A.active, dayLeft: A.dayLeft, nextLotId: A.nextLotId });
  A.restore = function (o) {
    A.nextDay = o.nextDay || 75; A.active = false; A.dayLeft = 0; A.lots = [];
    A.nextLotId = o.nextLotId || 1;   // 拍品会期极短，读档时直接错届，不还原在场拍品
  };
  A.reset = function () { A.nextDay = 75; A.active = false; A.dayLeft = 0; A.lots = []; A.nextLotId = 1; };
  X.Auction = A;
})(globalThis.XIANG);

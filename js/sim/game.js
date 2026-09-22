/* 总控：开局营地、逐 tick 调度、访客、日志、快照。 */
(function (X) {
  const G = {
    disciples: () => X.Disciple.list,
    forest: [], rocks: [],
    home: [40, 30],
    logs: [],
    stats: { mealsCooked: 0, mealsEaten: 0, harvests: 0, buildingsDone: 0 },
    inited: false,
  };

  function scanTerrain() {
    G.forest = []; G.rocks = [];
    const M = X.Map;
    for (let i = 0; i < M.N; i++) {
      if (M.terrain[i] === M.TERRAIN.FOREST) G.forest.push([i % M.W, (i / M.W) | 0]);
      else if (M.terrain[i] === M.TERRAIN.ROCK) G.rocks.push([i % M.W, (i / M.W) | 0]);
    }
  }
  // 找一块可立足的家园（中心附近 5×5 空地）
  function findHome() {
    const M = X.Map, T = M.TERRAIN;
    for (let r = 0; r < 30; r++) {
      for (let a = 0; a < 24; a++) {
        const x = M.W / 2 + Math.round(Math.cos(a) * r * 2), y = M.H / 2 + Math.round(Math.sin(a) * r);
        if (x < 6 || y < 6 || x > M.W - 8 || y > M.H - 8) continue;
        let ok = true;
        for (let j = -1; j <= 5 && ok; j++) for (let i = -1; i <= 6 && ok; i++) {
          const t = M.terrain[(y + j) * M.W + (x + i)];
          if (t === T.WATER || t === T.ROCK || t === T.FOREST) ok = false;
        }
        if (ok) { G.home = [x + 2, y + 2]; return; }
      }
    }
  }

  G.init = function (seed) {
    // 全量清场（跨局/读档安全）
    X.Build.reset();
    X.Disciple.list = [];
    X.Disciple.nextId = 1;
    X.Inv.reset();
    X.Work.clear();
    if (X.Craft) X.Craft.reset();
    if (X.Combat) X.Combat.reset();
    if (X.Travel) X.Travel.reset();
    if (X.Relation) X.Relation.reset();
    if (X.Auction) X.Auction.reset();
    if (X.Story) X.Story.reset();
    if (X.Trib) X.Trib.reset();
    X.Feng._dirty = true;
    if (X.Form) X.Form._dirty = true;
    X.Solar.buff = { growthMult: 1, yieldMult: 1, cold: 0, until: 0 };
    G.repVal = 10; G.found = []; G.libBuilt = false; G.hallBuilt = false;
    G.ascended = 0; G.endless = false;
    G.legacy = { points: 0, perks: [], ascList: [] };
    G.tutStep = 0; G.tutSkip = false;

    if (seed !== undefined) X.rng = X.Rng(seed);
    if (!X.Map.seed || seed !== undefined) { X.Map.mut = {}; X.Map.generate(seed); }
    scanTerrain();
    findHome();
    const [hx, hy] = G.home;

    // 开局小院：置物台/灶台/2 灵田/3 床/2 蒲团（免费落成）
    X.Build.place('stocker', hx - 3, hy - 1, { instant: true, free: true });
    X.Build.place('stove', hx + 1, hy - 1, { instant: true, free: true });
    X.Build.place('plot', hx - 3, hy + 1, { instant: true, free: true });
    X.Build.place('plot', hx + 1, hy + 1, { instant: true, free: true });
    X.Build.place('bedWood', hx - 6, hy - 1, { instant: true, free: true });
    X.Build.place('bedWood', hx - 6, hy + 1, { instant: true, free: true });
    X.Build.place('bedWood', hx + 4, hy - 1, { instant: true, free: true });
    X.Build.place('mat', hx + 4, hy + 1, { instant: true, free: true });
    X.Build.place('mat', hx + 5, hy + 1, { instant: true, free: true });

    // 开局物资 + 三名杂役
    X.Inv.add('wood', 50); X.Inv.add('stone', 25);
    X.Inv.add('grain', 70); X.Inv.add('meal', 10);
    for (let i = 0; i < 3; i++) X.Disciple.add(hx + i - 1, hy + 3);

    G.logs = []; G.stats = { mealsCooked: 0, mealsEaten: 0, harvests: 0, buildingsDone: 0 };
    X.Work.clear();
    G.inited = true;
    G.log('云隐山门立足，三名杂役入册');
  };
  X.Bus.on('build:done', () => {
    if (!G.inited) return;
    G.stats.buildingsDone++;
    scanLandmarks();
  });

  // ---- P4 江湖：声望 / 残卷 / 楼阁 ----
  G.repVal = 10; G.found = []; G.libBuilt = false; G.hallBuilt = false;
  G.rep = () => G.repVal | 0;
  G.addRep = function (n) {
    G.repVal = Math.max(0, Math.min(999, (G.repVal || 0) + n));
  };
  function scanLandmarks() {
    G.libBuilt = false; G.hallBuilt = false;
    X.Build.each(b => {
      if (!b.built) return;
      if (b.def.id === 'library') G.libBuilt = true;
      if (b.def.id === 'hall') G.hallBuilt = true;
    });
  }
  G.libBonus = () => (G.libBuilt ? 0.05 : 0);
  // P5：传承代（12 年一代；三代无人飞升 → 道统断绝）
  G.legacyGen = () => 1 + Math.floor(X.Time.day / 360 / 12);
  // 游历所得残卷（含拍卖）：随机一部未得之典
  G.findScroll = function () {
    const owned = new Set(X.Disciple.list.map(d => d.scId).filter(Boolean));
    const pool = X.Scriptures.list.filter(s => s.locked && !owned.has(s.id) && G.found.indexOf(s.id) < 0);
    if (!pool.length) { X.Inv.add('ling', 20); X.Game.log('残卷与已有典籍重合，折灵石二十'); return null; }
    const s = X.rng.pick(pool);
    G.found.push(s.id);
    X.Game.log(`喜得残卷《${s.name}》（${{ 8: '八品', 4: '四品', 2: '二品' }[s.tier]}），藏经阁可研读`);
    return s;
  };

  G.tick = function () {
    if (!G.inited) return;
    for (const d of X.Disciple.list) X.Disciple.update(d);
    if (X.Tick.count % 120 === 0) { X.Work.scan(); X.Work.assign(); }
    if (X.Tick.count % 30 === 0) X.Work.assign();
  };

  G.log = function (msg) {
    G.logs.push({ day: X.Time.day, msg });
    if (G.logs.length > 200) G.logs.shift();
    X.Bus.emit('game:log', { day: X.Time.day, msg });
  };

  G.kill = function (d, reason) {
    d.dead = true;
    X.Disciple.list = X.Disciple.list.filter(o => o !== d);
    if (d.bed && X.Build.inst[d.bed]) X.Build.inst[d.bed].sleeper = 0;
    if (d.task && d.task.job) X.Work.release(d.task.job);
    G.log(`${d.name} ${reason}，门中致哀`);
    X.Bus.emit('game:death', d);
  };

  G.tryVisitor = function (termName) {
    const pop = X.Disciple.list.length;
    if (pop >= 8) return;
    if (X.Inv.foodCount() < pop * 50) { G.log(`${termName}有求道者路过，见粮仓不丰而却步`); return; }
    const d = X.Disciple.add(G.home[0], G.home[1] + 3);
    if (d) G.log(`${termName}收徒潮：${d.name} 投奔入门`);
  };

  // 节气赠种：未拥有的天地灵植种子随机赐一
  G.giftSeed = function () {
    const unowned = X.Recipes.splant.filter(s => !X.SP.planted(s.id) && X.Inv.count(s.seed) === 0);
    if (!unowned.length) return;
    const s = X.rng.pick(unowned);
    X.Inv.add(s.seed, 1);
    G.log(`天降机缘，得${X.Items[s.seed].name}一枚（选中灵植或在营造面板种植）`);
  };

  // 按人口自发开垦：每两人一块田（含基础两块），杂役自行营建
  G.autoFarm = function () {
    const pop = X.Disciple.list.length;
    if (!pop) return;
    let plots = 0;
    X.Build.each(b => { if (b.built && b.farm) plots++; });
    let blueprints = 0;
    X.Build.each(b => { if (!b.built && b.farm) blueprints++; });
    const target = Math.ceil(pop / 2) + 1;
    if (plots + blueprints >= target) return;
    if (!X.Inv.take('wood', 2)) return;
    const def = X.Buildings.byId.plot;
    const [hx, hy] = G.home;
    for (let r = 2; r < 16; r++) {
      for (let k = 0; k < 12; k++) {
        const x = hx + X.rng.i(-r * 2, r * 2), y = hy + X.rng.i(-r, r);
        if (X.Build.terrainOk(def, x, y)) {
          if (X.Build.place('plot', x, y)) { G.log('杂役自发开垦一块灵田'); return; }
        }
      }
    }
    X.Inv.add('wood', 2);   // 没找到地方，退料
  };
  X.Bus.on('time:day', () => {
    if (!G.inited) return;
    G.autoFarm();
    if (X.Combat) X.Combat.tryWave(X.Time.day);   // 妖潮
    if (X.Trib) {   // 渡劫兜底：劫云压顶超过 35 日仍无人操持 → 托付天命
      for (const d of X.Disciple.list) {
        if (d.kind === '修士' && X.Trib.ready(d) && (X.Trib.lastDay[d.id] || -999) + 35 <= X.Time.day) {
          X.Trib.begin(d, false);
        }
      }
    }
  });

  // 平均心境 / 人口
  G.avgMood = () => {
    const L = X.Disciple.list;
    return L.length ? Math.round(L.reduce((s, d) => s + d.mood, 0) / L.length) : 0;
  };

  G.snapshot = () => ({
    home: [...G.home],
    stock: { ...X.Inv.stock },
    builds: X.Build.snapshot(),
    disciples: X.Disciple.snapshot(),
    stats: { ...G.stats },
    solar: { ...X.Solar.buff },
    craft: X.Craft ? X.Craft.snapshot() : null,
    rep: G.repVal,
    found: [...G.found],
    combat: X.Combat ? X.Combat.snapshot() : null,
    travel: X.Travel ? X.Travel.snapshot() : null,
    relation: X.Relation ? X.Relation.snapshot() : null,
    auction: X.Auction ? X.Auction.snapshot() : null,
    story: X.Story ? X.Story.snapshot() : null,
    trib: X.Trib ? X.Trib.snapshot() : null,
    ascended: G.ascended,
    endless: G.endless,
    tutStep: G.tutStep, tutSkip: G.tutSkip,
    legacy: { ...G.legacy, ascList: G.legacy.ascList.slice(0, 10), perks: [...G.legacy.perks] },
  });
  G.restore = function (o) {
    G.home = o.home || [40, 30];
    X.Inv.reset();
    for (const k in (o.stock || {})) X.Inv.stock[k] = o.stock[k];
    X.Build.restore(o.builds || []);
    X.Disciple.restore(o.disciples || []);
    Object.assign(X.Solar.buff, o.solar || {});
    if (X.Craft) X.Craft.restore(o.craft || {});
    G.repVal = o.rep !== undefined ? o.rep : 10;
    G.found = o.found || [];
    if (X.Combat) X.Combat.restore(o.combat || {});
    if (X.Travel) X.Travel.restore(o.travel || {});
    if (X.Relation) X.Relation.restore(o.relation || {});
    if (X.Auction) X.Auction.restore(o.auction || {});
    if (X.Story) X.Story.restore(o.story || {});
    if (X.Trib) X.Trib.restore(o.trib || {});
    G.ascended = o.ascended || 0;
    G.endless = !!o.endless;
    G.tutStep = o.tutStep || 0;
    G.tutSkip = !!o.tutSkip;
    G.legacy = o.legacy || { points: 0, perks: [], ascList: [] };
    G.stats = Object.assign({ mealsCooked: 0, mealsEaten: 0, harvests: 0, buildingsDone: 0 }, o.stats);
    scanTerrain();
    scanLandmarks();
    X.Work.clear();
    X.Feng._dirty = true;
    if (X.Form) X.Form._dirty = true;
    G.inited = true;
  };

  X.Game = G;
  X.Tick.on(G.tick);
})(globalThis.XIANG);

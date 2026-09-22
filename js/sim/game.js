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
    if (seed !== undefined) X.rng = X.Rng(seed);
    if (!X.Map.seed || seed !== undefined) X.Map.generate(seed);
    scanTerrain();
    findHome();
    const [hx, hy] = G.home;

    // 开局小院：置物台/灶台/2 灵田/3 床（免费落成）
    X.Build.place('stocker', hx - 3, hy - 1, { instant: true, free: true });
    X.Build.place('stove', hx + 1, hy - 1, { instant: true, free: true });
    X.Build.place('plot', hx - 3, hy + 1, { instant: true, free: true });
    X.Build.place('plot', hx + 1, hy + 1, { instant: true, free: true });
    X.Build.place('bedWood', hx - 6, hy - 1, { instant: true, free: true });
    X.Build.place('bedWood', hx - 6, hy + 1, { instant: true, free: true });
    X.Build.place('bedWood', hx + 4, hy - 1, { instant: true, free: true });

    // 开局物资 + 三名杂役
    X.Inv.add('wood', 50); X.Inv.add('stone', 25);
    X.Inv.add('grain', 70); X.Inv.add('meal', 10);
    for (let i = 0; i < 3; i++) X.Disciple.add(hx + i - 1, hy + 3);

    G.logs = []; G.stats = { mealsCooked: 0, mealsEaten: 0, harvests: 0, buildingsDone: 0 };
    X.Work.clear();
    G.inited = true;
    G.log('云隐山门立足，三名杂役入册');
  };
  X.Bus.on('build:done', () => { if (G.inited) G.stats.buildingsDone++; });

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
  X.Bus.on('time:day', () => { if (G.inited) G.autoFarm(); });

  // 平均心境 / 人口
  G.avgMood = () => {
    const L = X.Disciple.list;
    return L.length ? Math.round(L.reduce((s, d) => s + d.mood, 0) / L.length) : 0;
  };

  G.snapshot = () => ({
    home: [...G.home],
    stock: X.Inv.snapshot().stock,
    builds: X.Build.snapshot(),
    disciples: X.Disciple.snapshot(),
    stats: { ...G.stats },
    solar: { ...X.Solar.buff },
  });
  G.restore = function (o) {
    G.home = o.home || [40, 30];
    X.Inv.restore({ stock: o.stock });
    X.Build.restore(o.builds || []);
    X.Disciple.restore(o.disciples || []);
    Object.assign(X.Solar.buff, o.solar || {});
    G.stats = Object.assign({ mealsCooked: 0, mealsEaten: 0, harvests: 0, buildingsDone: 0 }, o.stats);
    scanTerrain();
    X.Work.clear();
    G.inited = true;
  };

  X.Game = G;
  X.Tick.on(G.tick);
})(globalThis.XIANG);

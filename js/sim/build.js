/* 建造：蓝图放置 → 施工 → 落成；拆除返还半价。
   grid: 每格建筑实例 id；inst: 实例表（含蓝图与农作状态）。 */
(function (X) {
  const W = X.Map.W, H = X.Map.H;
  const B = {
    grid: new Uint16Array(W * H),
    inst: {}, nextId: 1,
  };
  const T = X.Map.TERRAIN;

  B.terrainOk = function (def, x, y) {
    for (let j = 0; j < def.h; j++) for (let i = 0; i < def.w; i++) {
      const tx = x + i, ty = y + j;
      if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1) return false;
      const t = X.Map.terrain[ty * W + tx];
      if (t === T.WATER || t === T.ROCK || t === T.FOREST) return false;  // 林地需先伐木
      if (B.grid[ty * W + tx]) return false;
    }
    return true;
  };

  B.place = function (defId, x, y, opts) {
    const def = X.Buildings.byId[defId];
    if (!def || def.tags && def.tags.lock) return null;
    if (!B.terrainOk(def, x, y)) return null;
    opts = opts || {};
    if (!opts.free) {
      for (const k in def.cost) if (!X.Inv.take(k, def.cost[k])) {
        for (const k2 in def.cost) if (k2 !== k) X.Inv.add(k2, def.cost[k2]);   // 回滚
        return null;
      }
    }
    const id = B.nextId++;
    const b = {
      id, def, x, y, built: !!opts.instant, progress: opts.instant ? def.work : 0,
      farm: def.tags && def.tags.farm ? { planted: false, prog: 0, ready: false } : null,
      sp: def.kind === 'splant' ? { stage: 0, grow: 0, cd: 0 } : null,
    };
    B.inst[id] = b;
    for (let j = 0; j < def.h; j++) for (let i = 0; i < def.w; i++) B.grid[(y + j) * W + (x + i)] = id;
    X.Bus.emit('build:change', b);
    return b;
  };

  B.work = function (b, amount) {
    b.progress += amount;
    if (b.progress >= b.def.work && !b.built) {
      b.built = true; b.progress = b.def.work;
      X.Bus.emit('build:done', b);
      X.Game && X.Game.log(`${b.def.name} 落成`);
    }
  };

  B.demolish = function (id) {
    const b = B.inst[id];
    if (!b) return;
    for (const k in b.def.cost) X.Inv.add(k, Math.ceil(b.def.cost[k] * 0.5));
    for (let j = 0; j < b.def.h; j++) for (let i = 0; i < b.def.w; i++) B.grid[(b.y + j) * W + (b.x + i)] = 0;
    delete B.inst[id];
    X.Bus.emit('build:change', b);
  };

  B.reset = function () {
    B.grid.fill(0);
    B.inst = {};
    B.nextId = 1;
  };

  B.each = function (fn) { for (const id in B.inst) fn(B.inst[id]); };
  B.builtOf = function (tag) {   // 已落成且带 tag 的建筑列表
    const out = [];
    B.each(b => { if (b.built && b.def.tags && b.def.tags[tag]) out.push(b); });
    return out;
  };
  B.at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? null : B.inst[B.grid[y * W + x]];

  // 床位认领记录在实例上：b.sleeper = discipleId
  B.freeBed = function () {
    const beds = B.builtOf('sleep');
    for (const b of beds) if (!b.sleeper) return b;
    return null;
  };

  B.snapshot = () => Object.values(B.inst).map(b => ({
    def: b.def.id, x: b.x, y: b.y, built: b.built, progress: b.progress,
    sleeper: b.sleeper || 0, farm: b.farm ? { ...b.farm } : null,
    sp: b.sp ? { ...b.sp } : null,
  }));
  B.restore = function (arr) {
    B.grid.fill(0); B.inst = {}; B.nextId = 1;
    for (const r of arr) {
      const def = X.Buildings.byId[r.def];
      const id = B.nextId++;
      B.inst[id] = {
        id, def, x: r.x, y: r.y, built: r.built, progress: r.progress,
        sleeper: r.sleeper, farm: r.farm ? { ...r.farm } : null,
        sp: r.sp ? { ...r.sp } : null,
      };
      for (let j = 0; j < def.h; j++) for (let i = 0; i < def.w; i++) B.grid[(r.y + j) * W + (r.x + i)] = id;
    }
  };

  X.Build = B;
})(globalThis.XIANG);

/* 阵法：阵眼(定阵) + 阵旗(够数且在半径内) → 激活，产出范围效果。
   各系统经 Form.qiAt/growMultAt/yieldMultAt/cultAt/moodRegenAt/fengUpAt 查询。 */
(function (X) {
  const F = { active: [], _dirty: true };

  F.recompute = function () {
    F.active = [];
    const eyes = [];
    X.Build.each(b => { if (b.built && b.def.kind === 'zeye') eyes.push(b); });
    const flags = [];
    X.Build.each(b => { if (b.built && b.def.kind === 'zflag') flags.push(b); });
    const fired = [];
    for (const eye of eyes) {
      const zid = eye.def.tags.zeye;
      const z = X.Recipes.zhen.find(z => z.id === zid);
      if (!z) continue;
      const near = flags.filter(f => Math.hypot(f.x - eye.x, f.y - eye.y) <= z.radius);
      if (near.length >= z.flags) {
        F.active.push({ z, eye, flags: near });
        fired.push(z);
      }
    }
    F._dirty = false;   // 先落脏标记再发事件：订阅方在回调里调 Form.get() 不会重入 recompute
    for (const z of fired) X.Bus.emit('form:on', z);
  };
  F.get = () => { if (F._dirty) F.recompute(); return F.active; };
  F.isActive = function (zid) { return F.get().some(a => a.z.id === zid); };

  function cover(zid, x, y) {
    for (const a of F.get()) {
      if (a.z.id !== zid) continue;
      if (Math.hypot(x - a.eye.x, y - a.eye.y) <= a.z.radius) return true;
    }
    return false;
  }

  // 灵韵加成（聚灵阵 + 成株灵植光环）
  F.qiAt = function (x, y) {
    let qi = X.Map.qi[y * X.Map.W + x] || 0;
    if (cover('juling', x, y)) qi += 3;
    X.Build.each(b => {
      if (!b.built || b.def.kind !== 'splant' || !b.sp || b.sp.stage < 3) return;
      if (Math.hypot(b.x - x, b.y - y) <= 6) qi += 3;
    });
    return qi;
  };
  F.growMultAt = (x, y) => (cover('wenyang', x, y) ? 1.5 : 1);
  F.yieldMultAt = (x, y) => (cover('houTu', x, y) ? 1.3 : 1);
  F.cultAt = (x, y) => (cover('yinqi', x, y) ? 0.15 : 0);
  F.moodRegenAt = (x, y) => (cover('qingxin', x, y) ? 1 : 0);
  F.fengUpAt = (x, y) => cover('cangfeng', x, y);

  X.Bus.on('build:change', () => { F._dirty = true; });
  X.Bus.on('build:done', () => { F._dirty = true; });
  X.Form = F;
})(globalThis.XIANG);

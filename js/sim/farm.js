/* 农作：灵田按"日"生长（时辰事件里不重复结算）。
   生长 10 段；季节系数 春0.9 夏1.0 秋1.4 冬0.25；节气增益在 X.Solar.buff。 */
(function (X) {
  const SEASON_MULT = [1.3, 1.0, 1.4, 0.75];
  const F = {
    GROW_STAGES: 10, BASE_YIELD: 44,
  };

  F.plant = function (b) {
    if (!b.farm || b.farm.planted) return false;
    b.farm.planted = true; b.farm.prog = 0; b.farm.ready = false;
    return true;
  };

  F.onDay = function () {
    const season = X.Time.season;
    const buff = X.Solar.buff;
    let rackBonus = 0;
    X.Build.each(b => { if (b.built && b.def.tags && b.def.tags.farmBuff) rackBonus += b.def.tags.farmBuff; });
    X.Build.each(b => {
      if (!b.built || !b.farm || !b.farm.planted || b.farm.ready) return;
      const zhen = X.Form ? X.Form.growMultAt(b.x, b.y) : 1;
      const mult = SEASON_MULT[season] * (buff.until > X.Time.day ? buff.growthMult : 1) * zhen * (1 + rackBonus);
      b.farm.prog += mult;
      if (b.farm.prog >= F.GROW_STAGES) { b.farm.ready = true; b.farm.prog = F.GROW_STAGES; }
    });
  };

  F.harvest = function (b) {
    if (!b.farm || !b.farm.ready) return { item: 'grain', n: 0 };
    const crop = (b.def.tags && b.def.tags.crop) || 'grain';
    let y = crop === 'herb'
      ? Math.round(12 * (0.85 + X.rng.f(0, 0.3)))
      : Math.round(F.BASE_YIELD * (0.85 + X.rng.f(0, 0.3)));
    if (X.Solar.buff.until > X.Time.day) y = Math.round(y * X.Solar.buff.yieldMult);
    if (X.Form) y = Math.round(y * X.Form.yieldMultAt(b.x, b.y));
    if (X.Time.season === 3) y = Math.round(y * 0.6);
    b.farm.planted = false; b.farm.prog = 0; b.farm.ready = false;
    return { item: crop, n: y };
  };

  X.Farm = F;
})(globalThis.XIANG);

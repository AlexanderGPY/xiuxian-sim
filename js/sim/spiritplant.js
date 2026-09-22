/* 天地灵植：种入（耗种子，每图每属限一株）→ 90 日三阶成株 → 灵韵光环。
   蕴养：投料触发 催生/反哺/无事，五日一喂。 */
(function (X) {
  const S = {};

  S.planted = function (defId) {
    let found = null;
    X.Build.each(b => { if (b.def.id === defId) found = b; });
    return found;
  };

  S.plant = function (seedId) {
    const sp = X.Recipes.splant.find(s => s.seed === seedId);
    if (!sp) return false;
    if (S.planted(sp.id)) { X.Game.log(`${sp.name} 已植有一株（每图限一）`); return false; }
    if (!X.Inv.take(seedId, 1)) return false;
    const def = X.Buildings.byId[sp.id];
    const [hx, hy] = X.Game.home;
    for (let r = 3; r < 20; r++) {
      for (let k = 0; k < 24; k++) {
        const x = hx + X.rng.i(-r * 2, r * 2), y = hy + X.rng.i(-r, r);
        if (!X.Build.terrainOk(def, x, y)) continue;
        const b = X.Build.place(sp.id, x, y, { instant: true, free: true });
        if (b) {
          b.sp = { stage: 0, grow: 0, cd: 0 };
          X.Game.log(`植下天地灵植【${sp.name}】，静待其成`);
          X.Bus.emit('sp:plant', b);
          return true;
        }
      }
    }
    X.Inv.add(seedId, 1);
    return false;
  };

  S.onDay = function () {
    X.Build.each(b => {
      if (!b.built || b.def.kind !== 'splant' || !b.sp || b.sp.stage >= 3) return;
      const sp = X.Recipes.splant.find(s => s.id === b.def.id);
      if (!sp) return;
      if (b.sp.cd > 0) b.sp.cd--;
      b.sp.grow += 1 * X.Form.growMultAt(b.x, b.y);
      if (b.sp.grow >= sp.days / 3) {
        b.sp.grow = 0;
        b.sp.stage++;
        if (b.sp.stage >= 3) {
          b.sp.stage = 3;
          X.Game.log(`天地灵植【${sp.name}】功成，方圆灵韵渐盛`);
          X.Bus.emit('sp:mature', b);
        }
      }
    });
  };

  // 蕴养：投料 → 催生 30% / 反哺 20% / 无事 50%
  S.feed = function (b, itemId, n) {
    if (!b.sp) return { ok: false, why: '非灵植' };
    if (b.sp.cd > 0) return { ok: false, why: `蕴养未满（余${b.sp.cd}日）` };
    const fi = X.Recipes.FEED_ITEMS.find(f => f.item === itemId && f.n === n);
    if (!fi) return { ok: false, why: '不可投之物' };
    if (!X.Inv.take(itemId, n)) return { ok: false, why: '物料不足' };
    b.sp.cd = 5;
    const roll = X.rng.f();
    const sp = X.Recipes.splant.find(s => s.id === b.def.id);
    if (roll < 0.3) {
      b.sp.grow += 6;
      X.Game.log(`【${sp.name}】受养，长势喜人`);
      return { ok: true, r: '催生' };
    }
    if (roll < 0.5) {
      const gifts = [['lingzhi', 1], ['ling', 2], ['ling', 3], ['herb', 6]];
      const [it, c] = X.rng.pick(gifts);
      X.Inv.add(it, c);
      X.Game.log(`【${sp.name}】反哺${X.Items[it].name}×${c}`);
      return { ok: true, r: '反哺' };
    }
    X.Game.log(`【${sp.name}】静立如常，不见动静`);
    return { ok: true, r: '无事' };
  };

  X.Bus.on('time:day', () => { if (X.Game.inited) S.onDay(); });
  X.SP = S;
})(globalThis.XIANG);

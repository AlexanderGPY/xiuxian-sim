/* 修行核心：吐纳/打坐修为、破境判定、神通增益聚合、静修点管理。 */
(function (X) {
  const C = {
    PASSIVE: 0.022,    // 杂役吐纳基础速率
    ACTIVE: 0.15,      // 修士打坐基础速率
    forcePass: false,  // 调试：破境必成
  };

  C.spotFor = function (d) {   // 最近的静修点
    let best = null, bd = Infinity;
    X.Build.each(b => {
      if (!b.built || !b.def.tags || !b.def.tags.cult) return;
      const dd = Math.hypot(b.x - d.px, b.y - d.py);
      if (dd < bd) { bd = dd; best = b; }
    });
    return best;
  };

  C.scriptureOf = d => (d.scId ? X.Scriptures.byId[d.scId] : null);

  // 已解锁神通及其增益聚合
  C.spellsOn = function (d) {
    const sc = C.scriptureOf(d);
    if (!sc) return [];
    return sc.spells.filter((s, i) => X.Realms.SPELL_AT[i](d));
  };
  C.mods = function (d) {
    const m = { cult: 0, brk: 0, mood: 0, work: 0, gat: 0, cook: 0, hp: 0 };
    for (const s of C.spellsOn(d)) for (const k in s.eff) m[k] += s.eff[k];
    if (X.Craft) {   // 法宝词条
      const a = X.Craft.artMods(d);
      for (const k in a) m[k] += a[k];
    }
    m.cult += X.Buffs.get(d, 'cult');   // 限时增益（凝神丹/修行符）
    return m;
  };

  // 灵根(五行) × 道典 生克
  C.elMatch = function (d) {
    const sc = C.scriptureOf(d);
    if (!sc || sc.el < 0) return 1;
    const rel = X.Feng.relation(d.linggen, sc.el);
    return rel === '生' ? 1.25 : rel === '同' ? 1.1 : rel === '克' ? 0.75 : 1;
  };
  const tierM = d => { const sc = C.scriptureOf(d); return sc ? 1 + (10 - sc.tier) * 0.06 : 1; };

  // 打坐速率（每 tick 修为）
  C.rate = function (d) {
    if (d.realm === 0) return 0;
    const spot = d.cultSpot ? X.Build.inst[d.cultSpot] : null;
    if (!spot) return 0;
    const qi = 1 + (X.Form ? X.Form.qiAt(spot.x, spot.y) : X.Map.qi[spot.y * X.Map.W + spot.x]) / 20;
    const zhen = X.Form ? X.Form.cultAt(spot.x, spot.y) : 0;
    const feng = X.Feng.gradeFor(d).cultM;
    const mood = 0.6 + d.mood / 250;
    const m = C.mods(d);
    const active = d.kind === '修士' ? C.ACTIVE : C.PASSIVE * 2;
    return active * tierM(d) * C.elMatch(d) * feng * qi * mood * (1 + m.cult + zhen);
  };

  // 吐纳（杂役闲时自动，不打断活计；筑基为止）
  C.passiveGain = function (d) {
    if (d.kind !== '杂役' || d.realm > 1) return 0;
    return C.PASSIVE * (0.6 + d.mood / 250) * (1 + C.mods(d).cult);
  };

  C.gain = function (d, amount) {
    if (!isFinite(amount) || amount <= 0) return;
    d.exp = Math.min(X.Realms.cost(d.realm, d.stage), d.exp + amount);
    if (d.realm === 0) { d.realm = 1; d.stage = 0; d.exp = 0; return; }   // 首缕灵气
    const R = X.Realms.list[d.realm];
    while (d.stage < R.stages - 1 && X.Realms.full(d)) { d.stage++; d.exp = 0; }
    if (d.realm === 1 && d.stage >= R.stages - 1 && X.Realms.full(d) && !d.eligible) {
      d.eligible = true;
      X.Game.log(`${d.name} 练气圆满，可择典筑基`);
      X.Bus.emit('cult:ready', d);
    }
  };

  // 筑基：择典（杂役 → 修士的门槛）
  C.foundDisciple = function (d, scId) {
    if (!d.eligible || d.kind !== '杂役') return false;
    const sc = X.Scriptures.byId[scId];
    if (!sc || sc.locked) return false;
    d.scId = scId;
    return true;
  };

  // 破境尝试（在静修点进行）
  C.attempt = function (d) {
    const R = X.Realms;
    if (d.realm === 1) {   // 练气 → 筑基
      if (!d.eligible || !d.scId) return { ok: false, why: '未择典' };
    } else if (!R.atCap(d)) return { ok: false, why: '修为未满' };
    if (d.breakCd > X.Time.day) return { ok: false, why: '冷却' };

    const chance = Math.min(0.95, C.chanceOf(d) + (X.Craft ? X.Craft.brkBoost(d) : 0));
    const ok = C.forcePass || X.rng.f() < chance;
    if (ok) {
      d.failPity = 0;
      if (d.realm === 1) {
        d.kind = '修士';
        X.Game.log(`${d.name} 筑基功成，入内门修《${C.scriptureOf(d).name}》`);
      } else {
        X.Game.log(`${d.name} 破境【${R.list[d.realm + 1].name}】功成`);
      }
      d.realm++; d.stage = 0; d.exp = 0;
      d.hp = Math.min(C.maxHp(d), d.hp + 30);
      if (d.realm === 10) X.Bus.emit('cult:ascend', d);
      X.Bus.emit('cult:break', { d, ok: true });
      return { ok: true };
    }
    d.failPity++;
    d.breakCd = X.Time.day + 2;
    if (d.mood < 30) {
      d.moodEv -= 18; d.breakCd = X.Time.day + 3;
      X.Game.log(`${d.name} 破境失败，走火入魔（心境大损）`);
    } else {
      d.hp -= 22;
      X.Game.log(`${d.name} 破境失败，气血受创`);
    }
    X.Bus.emit('cult:break', { d, ok: false });
    return { ok: false, why: '败' };
  };

  C.chanceOf = function (d) {
    const base = X.Realms.list[d.realm === 1 ? 1 : d.realm].brk;
    const feng = X.Feng.gradeFor(d).brkM;
    const mood = 0.7 + d.mood / 330;
    return base * tierM(d) * C.elMatch(d) * feng * mood * (1 + C.mods(d).brk) * (1 + 0.2 * d.failPity);
  };

  C.maxHp = d => (X.Disciple.hasTrait(d, 'tough') ? 130 : 100) + d.realm * 12 + (d.hpMaxBuff || 0);
  C.lifespan = d => X.Realms.list[d.realm].life + (d.lifeBuff || 0);
  C.age = d => Math.max(0, Math.floor((X.Time.day - d.bornDay) / 360));

  // 自动筑基：圆满满 10 日无人理、修士名额<3，且至少保留两名杂役劳作
  C.autoCheck = function () {
    let xiushi = 0, zayi = 0;
    for (const d of X.Disciple.list) d.kind === '修士' ? xiushi++ : zayi++;
    if (zayi < 3) return;   // 人手紧张时不转化
    for (const d of X.Disciple.list) {
      if (!d.eligible || d.kind !== '杂役' || d.scId) continue;
      if (d.readyDay && X.Time.day - d.readyDay < 10) continue;
      if (xiushi >= 3 || zayi <= 2) return;
      const el = d.linggen;
      const best = X.Scriptures.starter.find(s => s.el === el) || X.Scriptures.starter.find(s => s.el < 0);
      if (C.foundDisciple(d, best.id)) {
        X.Game.log(`${d.name} 于后山自发筑基（修《${best.name}》）`);
        xiushi++; zayi--;
      }
    }
  };

  X.Bus.on('cult:ready', d => { d.readyDay = X.Time.day; });
  X.Bus.on('time:day', () => {
    if (!X.Game.inited) return;
    C.autoCheck();
    // 寿元检定（每年岁首）
    for (const d of X.Disciple.list.slice()) {
      if (C.age(d) > C.lifespan(d)) {
        X.Disciple.list = X.Disciple.list.filter(o => o !== d);
        if (d.bed && X.Build.inst[d.bed]) X.Build.inst[d.bed].sleeper = 0;
        X.Game.log(`${d.name} 寿元耗尽，含笑坐化（享年${C.age(d)}）`);
        for (const o of X.Disciple.list) o.moodEv -= 8;
        X.Bus.emit('game:death', d);
      }
    }
  });

  X.Cult = C;
})(globalThis.XIANG);

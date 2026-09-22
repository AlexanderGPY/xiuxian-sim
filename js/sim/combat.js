/* 战斗：妖兽 24 种（五行×四阶 + 上古四凶）、妖潮 30 日一波（12 波封顶）、
   门派犯山（恩怨引发）、御器斗法（境界×神识×法宝×阵法加成，与修行同套数值）。 */
(function (X) {
  const ELEM = ['金', '木', '水', '火', '土'];
  const T1 = { hp: 60, atk: 12, pw: 16 };   // 各阶基准
  const T2 = { hp: 130, atk: 22, pw: 32 };
  const T3 = { hp: 260, atk: 38, pw: 58 };
  const T4 = { hp: 480, atk: 60, pw: 95 };
  const TIERS = [null, T1, T2, T3, T4];
  const NAMES = { 1: ['赤目狼', '青背豺', '碎石蜥'], 2: ['铁背蛟', '碧鳞蟒', '火鬃罴'], 3: ['噬魂雕', '裂地豕', '玄冰貉'], 4: ['吞岳狻猊', '烛阴', '九婴雏'] };
  const ANCIENT = ['饕餮之裔', '穷奇之嗣', '梼杌之血', '混沌遗种'];

  // —— 妖兽图鉴（24） ——
  const DEFS = [];
  let uid = 0;
  for (let el = 0; el < 5; el++) {
    for (let tier = 1; tier <= 4; tier++) {
      DEFS.push({
        id: 'bst' + (++uid), name: NAMES[tier][el % 3] + ELEM[el], el, tier,
        hp: TIERS[tier].hp, atk: TIERS[tier].atk, pw: TIERS[tier].pw,
        drop: 'yaodan' + tier, glyph: '兽',
      });
    }
  }
  ANCIENT.forEach((n, i) => DEFS.push({
    id: 'bst' + (++uid), name: n, el: i % 5, tier: 5, ancient: true,
    hp: 850, atk: 88, pw: 150, drop: 'guDan', glyph: '凶',
  }));

  const C = {
    defs: DEFS,
    beasts: [],       // 场上妖兽实体
    raiders: [],      // 犯山者（NPC 实体）
    wave: 0,          // 妖潮波次（1~12）
    lastWaveDay: 0,
    killed: 0,
    nextId: 1,
  };

  /* —— 战力：与修行同套数值 —— */
  C.power = function (d) {
    let p = (10 + d.realm * 14 + d.stage * 3) * (1 + d.stats.shen / 300);
    const m = X.Craft ? X.Craft.artMods(d) : { atk: 0, def: 0 };
    p *= 1 + m.atk;
    // 神通加持（道典 gat/攻伐类近似为 cult 加成折算）
    if (X.Cult && X.Cult.mods) p *= 1 + ((X.Cult.mods(d).cult || 0)) * 0.5;
    p *= 0.7 + 0.3 * Math.max(0.2, d.hp / X.Disciple.maxHp(d));   // 气血越低战力越衰
    return p;
  };
  // 守山加成：山门 +15%/座，每座激活阵法 +8%
  C.defenseBonus = function () {
    let gate = 0;
    X.Build.each(b => { if (b.built && b.def.id === 'gate') gate++; });
    const forms = X.Form ? X.Form.get().length : 0;
    return 1 + Math.min(0.3, gate * 0.15) + Math.min(0.4, forms * 0.08);
  };

  /* —— 妖潮：30 日一波（自第 60 日起）；树大招风——声望≥25 方引妖觊觎 —— */
  C.tryWave = function (day) {
    if (day < 60 || day - C.lastWaveDay < 30) return;
    if (X.Game.rep() < 25) { C.lastWaveDay = day; return; }   // 未扬名之局，妖兽不屑
    C.wave = Math.min(12, C.wave + 1);
    C.lastWaveDay = day;
    const n = 1 + Math.ceil(C.wave / 2);
    const maxTier = Math.min(4, Math.ceil(C.wave / 3) + (C.wave > 3 ? 1 : 0));
    const minTier = Math.max(1, Math.ceil(C.wave / 3) - 1);
    for (let i = 0; i < n; i++) C.spawn(minTier, maxTier);
    // 第 6 波起三成几率妖王压阵
    if (C.wave >= 6 && X.rng.chance(0.3)) {
      const a = DEFS.filter(d => d.tier === 5)[X.rng.i(0, 3)];
      C.spawn(a);
      X.Game.log(`【妖潮·第${C.wave}波】妖王「${a.name}」现世，倾巢犯山！`);
    } else {
      X.Game.log(`【妖潮·第${C.wave}波】${n} 头妖兽下山，护住粮仓！`);
    }
    X.Bus.emit('wave:on', C.wave);
  };
  // 霜降前哨：临时加刷 1~2 头（同样不吃无名小观）
  C.vanguard = function () {
    if (X.Time.day < 60 || X.Game.rep() < 25) return;
    const n = X.rng.i(1, 2);
    for (let i = 0; i < n; i++) C.spawn(1, 2);
    X.Game.log(`【霜降】妖兽南下前哨，${n} 头游至山门`);
  };

  C.spawn = function (a, b) {
    let def = a;
    if (a && typeof a === 'object') def = a;
    else {
      const tier = X.rng.i(a, b);
      const pool = DEFS.filter(d => d.tier === tier);
      def = pool[X.rng.i(0, pool.length - 1)];
    }
    const [hx, hy] = X.Game.home;
    // 从地图边缘入场，偏向家园一侧
    const side = X.rng.i(0, 3);
    const M = X.Map;
    const x = side === 0 ? X.rng.i(0, M.W - 1) : side === 1 ? M.W - 2 : Math.max(1, Math.min(M.W - 2, hx + X.rng.i(-25, 25)));
    const y = side === 2 ? X.rng.i(0, M.H - 1) : side === 3 ? M.H - 2 : Math.max(1, Math.min(M.H - 2, hy + X.rng.i(-18, 18)));
    const bs = { id: C.nextId++, def, x: x + 0.5, y: y + 0.5, hp: def.hp, flee: false, cd: 0 };
    C.beasts.push(bs);
    return bs;
  };

  /* —— 每 tick：妖兽行动 —— */
  C.tick = function () {
    if (!C.beasts.length && !C.raiders.length) return;
    const [hx, hy] = X.Game.home;
    for (const bs of C.beasts) {
      if (bs.flee) {   // 溃逃出图
        bs.x += (bs.x < hx ? -1 : 1) * 0.06;
        bs.y += (bs.y < hy ? -1 : 1) * 0.06;
        if (bs.x < 0 || bs.y < 0 || bs.x > X.Map.W || bs.y > X.Map.H) bs.hp = -1;
        continue;
      }
      // 目标：迎战的修士优先，否则直奔家园劫粮
      let tgt = null, td = 1e9;
      for (const d of X.Disciple.list) {
        if (d.kind !== '修士' || d.travel) continue;
        const dd = Math.hypot(d.px - bs.x, d.py - bs.y);
        if (dd < 12 && dd < td) { td = dd; tgt = d; }
      }
      let tx = hx, ty = hy;
      if (tgt) { tx = tgt.px; ty = tgt.py; }
      const dx = tx - bs.x, dy = ty - bs.y, dist = Math.hypot(dx, dy) || 1;
      const sp = 0.05 + bs.def.tier * 0.006;
      bs.x += dx / dist * sp; bs.y += dy / dist * sp;
      // 到家：啃食粮仓
      if (!tgt && dist < 2.5 && --bs.cd <= 0) {
        bs.cd = 40;
        const stolen = X.Inv.take('grain', 6 + bs.def.tier * 4) || X.Inv.take('meal', 4) || 0;
        if (stolen) X.Game.log(`${bs.def.name} 蹂躏粮仓，损失粮食若干`);
        else { bs.flee = true; X.Game.log(`${bs.def.name} 掠食无获，悻悻而去`); }
      }
    }
    C.beasts = C.beasts.filter(bs => bs.hp > 0);

    // 犯山者：冲向家园中心，与迎战者对决
    for (const rd of C.raiders) {
      if (rd.dead) continue;
      const dx = hx - rd.x, dy = hy - rd.y, dist = Math.hypot(dx, dy) || 1;
      if (dist > 1.5) { rd.x += dx / dist * 0.07; rd.y += dy / dist * 0.07; }
    }
    C.raiders = C.raiders.filter(r => !r.dead);
  };

  /* —— 修士迎战（disciple.js 的 fight 任务每 tick 调用） —— */
  C.fightTick = function (d) {
    const bs = C.nearestBeast(d);
    if (!bs) return false;   // 无敌可战
    const dist = Math.hypot(bs.x - d.px, bs.y - d.py);
    if (dist > 1.4) { d._fightTgt = [bs.x | 0, bs.y | 0]; return 'go'; }   // 走位接近
    // 交手：每 16 tick 一合
    if (!d._fcd) d._fcd = 0;
    if (--d._fcd > 0) return 'fight';
    d._fcd = 16;
    const pw = C.power(d) * C.defenseBonus();
    const bpw = bs.def.pw * X.rng.f(0.8, 1.2);
    if (pw >= bpw) {
      bs.hp -= Math.max(6, pw * 0.45 * X.rng.f(0.8, 1.3));
      if (bs.hp <= 0) C.beastDown(bs, d);
    } else {
      const m = X.Craft ? X.Craft.artMods(d) : { def: 0 };
      d.hp -= Math.max(3, bs.def.atk * X.rng.f(0.7, 1.2) * (1 - m.def * 0.5));
      d.moodEv -= 1;
      // 重伤先吃护符/丹（P3 自动服用复用）
      if (X.Craft && d.hp < 25) X.Craft.autoConsume(d);
      if (d.hp <= 0) {
        X.Craft && X.Craft.autoConsume(d);
        if (d.hp <= 0) { X.Game.kill(d, '战殒'); return 'dead'; }
      }
    }
    // 妖兽溃逃判定
    if (!bs.flee && bs.hp < bs.def.hp * 0.18 && X.rng.chance(0.4)) {
      bs.flee = true;
      X.Game.log(`${bs.def.name} 不敌遁走`);
    }
    return 'fight';
  };
  C.beastDown = function (bs, d) {
    bs.hp = -1;
    C.killed++;
    const n = X.rng.i(1, 2) + (bs.def.tier >= 3 ? 1 : 0);
    X.Inv.add(bs.def.drop, n);
    const ling = bs.def.tier * 4 * X.rng.i(1, 2);
    X.Inv.add('ling', ling);
    X.Game.addRep(bs.def.tier * 3 + (bs.def.ancient ? 10 : 0));
    X.Game.log(`${d ? d.name : '弟子'} 斩杀${bs.def.ancient ? '妖王' : '妖兽'}「${bs.def.name}」，得${X.Items[bs.def.drop].name}×${n}、灵石×${ling}`);
    X.Bus.emit('beast:down', { def: bs.def, by: d });
  };
  C.nearestBeast = function (d) {
    let best = null, bd = 1e9;
    for (const bs of C.beasts) {
      if (bs.flee) continue;
      const dd = Math.hypot(bs.x - d.px, bs.y - d.py);
      if (dd < bd) { bd = dd; best = bs; }
    }
    return best;
  };
  C.threat = () => C.beasts.some(bs => !bs.flee) || C.raiders.length > 0;

  /* —— fight 任务统一入口：先犯山者后妖兽 —— */
  C.discTick = function (d) {
    if (C.raiders.length) return C.raidTick(d);
    return C.fightTick(d);
  };

  /* —— 游历中的遭遇战（离屏，按队伍总战力一次结算） —— */
  C.resolvePartyFight = function (party, tier) {
    let pw = 0;
    for (const d of party) pw += C.power(d) * 0.8;   // 离山无阵法地利
    const pool = DEFS.filter(d => d.tier === tier);
    const def = pool[X.rng.i(0, pool.length - 1)];
    const bpw = def.pw * X.rng.f(0.85, 1.25) * 1.15;
    const ok = pw >= bpw;
    const res = { ok, def, loot: null, hurt: 0 };
    if (ok) {
      res.loot = { item: def.drop, n: 1 + (tier >= 3 ? 1 : 0) };
      X.Inv.add('ling', tier * 3);
      X.Game.addRep(tier * 2);
    } else {
      res.hurt = Math.round(def.atk * X.rng.f(0.8, 1.4));
    }
    return res;
  };

  /* —— 犯山：门派恩怨引发 —— */
  C.sectRaid = function (sectId, npcs) {
    const [hx, hy] = X.Game.home;
    const names = [];
    for (const def of npcs) {
      C.raiders.push({
        id: C.nextId++, def,
        x: hx + X.rng.i(-6, 6) + (X.rng.chance(0.5) ? -18 : 18),
        y: hy + X.rng.i(-4, 4) + (X.rng.chance(0.5) ? -14 : 14),
        hp: 200 + def.realm * 120, dead: false, cd: 0,
      });
      names.push(def.name);
    }
    X.Game.log(`【犯山】${X.Npcs.SECT_NAMES[sectId]}来犯：${names.join('、')} 兵至山门！`);
    X.Bus.emit('raid:on', { sect: sectId, names });
  };
  // 迎战者与犯山人过招（修士 fight 任务复用）
  C.raidTick = function (d) {
    let rd = null, bd = 1e9;
    for (const r of C.raiders) {
      if (r.dead) continue;
      const dd = Math.hypot(r.x - d.px, r.y - d.py);
      if (dd < bd) { bd = dd; rd = r; }
    }
    if (!rd) return false;
    if (bd > 1.5) { d._raidTgt = [rd.x | 0, rd.y | 0]; d._fightTgt = d._raidTgt; return 'go'; }
    if (!d._fcd) d._fcd = 0;
    if (--d._fcd > 0) return 'fight';
    d._fcd = 18;
    const pw = C.power(d) * C.defenseBonus();
    const rpw = (30 + rd.def.realm * 26) * X.rng.f(0.85, 1.15);
    if (pw >= rpw) {
      rd.hp -= Math.max(8, pw * 0.5 * X.rng.f(0.8, 1.3));
      if (rd.hp <= 0) {
        rd.dead = true;
        X.Game.log(`${d.name} 阵前挫败 ${rd.def.name}，其狼狈遁走`);
        X.Game.addRep(6);
        X.Relation.settleRaid(rd.def.sect, d);
      }
    } else {
      d.hp -= Math.max(4, (rpw - pw) * 0.35 * X.rng.f(0.8, 1.2));
      if (X.Craft && d.hp < 25) X.Craft.autoConsume(d);
      if (d.hp <= 0) { X.Craft && X.Craft.autoConsume(d); if (d.hp <= 0) { X.Game.kill(d, '斗殒'); return 'dead'; } }
    }
    return 'fight';
  };

  C.snapshot = () => ({
    wave: C.wave, lastWaveDay: C.lastWaveDay, killed: C.killed, nextId: C.nextId,
    beasts: C.beasts.map(b => ({ def: b.def.id, x: b.x, y: b.y, hp: b.hp, flee: b.flee })),
    raiders: C.raiders.filter(r => !r.dead).map(r => ({ def: r.def.id, x: r.x, y: r.y, hp: r.hp })),
  });
  C.restore = function (o) {
    C.wave = o.wave || 0; C.lastWaveDay = o.lastWaveDay || 0;
    C.killed = o.killed || 0; C.nextId = o.nextId || 1;
    const byId = {}; for (const d of DEFS) byId[d.id] = d;
    C.beasts = (o.beasts || []).map(b => ({ id: C.nextId++, def: byId[b.def] || DEFS[0], x: b.x, y: b.y, hp: b.hp, flee: b.flee, cd: 0 }));
    C.raiders = (o.raiders || []).map(r => ({ id: C.nextId++, def: X.Npcs.byId[r.def] || X.Npcs.list[0], x: r.x, y: r.y, hp: r.hp, dead: false, cd: 0 }));
  };
  C.reset = function () {
    C.beasts = []; C.raiders = []; C.wave = 0; C.lastWaveDay = 0; C.killed = 0; C.nextId = 1;
  };

  X.Combat = C;
  X.Tick.on(() => { if (X.Game.inited) C.tick(); });
})(globalThis.XIANG);

/* 江湖关系：六派好感（缘分）与仇怨；恩怨满则犯山；好感+声望+客舍 → 客卿驻山（全门增益）。
   传功殿：客卿每日传艺。 */
(function (X) {
  const SECTS = ['qingyun', 'luoxia', 'xuanshui', 'chiyang', 'houtu', 'taixu'];
  const R = { sects: {}, raiding: {} };

  function blank() { return { aff: 0, grudge: 0, met: {}, guest: null }; }
  R.resetSects = function () { for (const s of SECTS) R.sects[s] = blank(); R.raiding = {}; };
  R.resetSects();

  R.change = function (sect, n) {
    const r = R.sects[sect]; if (!r) return;
    r.aff = Math.max(-50, Math.min(120, r.aff + n));
    tryGuest(sect);
  };
  R.grudgeChange = function (sect, n) {
    const r = R.sects[sect]; if (!r) return;
    r.grudge = Math.max(0, Math.min(140, r.grudge + n));
  };
  // 游历偶遇：sect 为空则随机门派
  R.meet = function (sect) {
    if (!sect) sect = SECTS[X.rng.i(0, SECTS.length - 1)];
    const r = R.sects[sect];
    const unmet = X.Npcs.list.filter(n => n.sect === sect && !r.met[n.id]);
    let npc;
    if (unmet.length) { npc = X.rng.pick(unmet); r.met[npc.id] = true; }
    else npc = X.rng.pick(X.Npcs.list.filter(n => n.sect === sect));
    r.aff = Math.min(120, r.aff + X.rng.i(5, 12));
    X.Game.log(`江湖偶遇：${X.Npcs.SECT_NAMES[sect]} ${npc.name}（${npc.desc}），相谈甚欢`);
    tryGuest(sect);
    return npc;
  };
  R.name = s => X.Npcs.SECT_NAMES[s];
  R.affName = a => a >= 100 ? '盟誓' : a >= 60 ? '知交' : a >= 30 ? '相识' : a > 0 ? '点头之交' : a <= -30 ? '交恶' : '冷淡';

  /* —— 客卿：好感≥100 且 声望≥40 且 已建客舍，每派至多一位 —— */
  R.guestCap = function () {
    let cap = 0;
    X.Build.each(b => { if (b.built && b.def.id === 'guesthall') cap = Math.max(cap, 1); });
    // 传功殿不计容量，只提供传艺
    return cap;
  };
  function tryGuest(sect) {
    const r = R.sects[sect];
    if (r.guest || r.aff < 100) return;
    if (X.Game.rep() < 40 || !R.guestCap()) return;
    const total = SECTS.filter(s => R.sects[s].guest).length;
    if (total >= R.guestCap()) return;
    const cand = X.Npcs.list.filter(n => n.sect === sect && r.met[n.id]);
    const npc = cand.length ? X.rng.pick(cand) : X.rng.pick(X.Npcs.list.filter(n => n.sect === sect));
    r.guest = npc.id;
    X.Game.log(`【客卿】${X.Npcs.SECT_NAMES[sect]} ${npc.name} 应盟誓驻山，${npc.buff.label}`);
    X.Bus.emit('guest:on', { sect, npc });
  }
  R.guests = () => SECTS.filter(s => R.sects[s].guest).map(s => ({ sect: s, npc: X.Npcs.byId[R.sects[s].guest] }));
  /* —— P5 道侣：与驻山客卿结缘（心境互济；天劫时护法一条命） —— */
  R.canDaolv = function (d, npcId) {
    const npc = X.Npcs.byId[npcId];
    if (!npc || !d || d.daolv || d.realm < 4 || d.mood < 60) return false;
    const r = R.sects[npc.sect];
    return r.guest === npcId && !SECTS.some(s => {
      const g = R.sects[s].guest;
      return g && X.Disciple.list.some(o => o.daolv === g);
    });
  };
  R.pairDaolv = function (d, npcId) {
    if (!R.canDaolv(d, npcId)) return { ok: false, why: '须客卿驻山、其尚无道侣，且弟子元婴以上、心境 60+' };
    d.daolv = npcId;
    d.moodEv += 10;
    X.Game.log(`${d.name} 与 ${X.Npcs.byId[npcId].name} 结为道侣，共参大道`);
    X.Bus.emit('daolv:on', { d, npcId });
    return { ok: true };
  };
  // 全门增益聚合：{atk/dan/cult/brk/qi/mood: 累计值}
  R.buff = function () {
    const m = { atk: 0, dan: 0, cult: 0, brk: 0, qi: 0, mood: 0 };
    for (const g of R.guests()) m[g.npc.buff.key] += g.npc.buff.n;
    return m;
  };

  /* —— 犯山：仇怨≥100 且当前无敌来犯 —— */
  X.Bus.on('time:day', () => {
    if (!X.Game.inited) return;
    // 客卿传艺（传功殿）
    let hall = false;
    X.Build.each(b => { if (b.built && b.def.id === 'hall') hall = true; });
    if (hall) for (const g of R.guests()) {
      const pool = X.Disciple.list.filter(d => !d.travel && !d.dead);
      if (!pool.length) continue;
      const d = X.rng.pick(pool);
      X.Cult.gain(d, 10);
      if (d.craft) {
        const k = ['dan', 'qi', 'fu'][X.rng.i(0, 2)];
        d.craft[k] += 0.15;
      }
      if (X.Time.day % 10 === 0) X.Game.log(`${g.npc.name} 于传功殿授艺，${d.name} 颇有所得`);
    }
    // 仇怨蓄势
    for (const s of SECTS) {
      const r = R.sects[s];
      if (r.grudge >= 100 && !R.raiding[s] && X.Time.day > 30) {
        R.raiding[s] = true;
        const fighters = X.Npcs.list.filter(n => n.sect === s).slice(0, X.rng.i(2, 3));
        X.Combat.sectRaid(s, fighters);
      }
      if (R.raiding[s] && !X.Combat.raiders.length) {
        // 来犯者尽退，解怨收场
        R.raiding[s] = false;
        r.grudge = Math.max(0, r.grudge - 50);
      }
    }
  });
  // 阵前挫败：不打不相识
  R.settleRaid = function (sect, winner) {
    const r = R.sects[sect]; if (!r) return;
    r.grudge = Math.max(0, r.grudge - 45);
    r.aff = Math.min(120, r.aff + 12);
    if (r.grudge <= 0) X.Game.log(`${R.name(sect)}怨气渐消，江湖风波暂平`);
    tryGuest(sect);
  };

  R.snapshot = () => ({
    sects: SECTS.map(s => {
      const r = R.sects[s];
      return { aff: r.aff, grudge: r.grudge, met: Object.keys(r.met), guest: r.guest };
    }),
  });
  R.restore = function (o) {
    R.resetSects();
    (o.sects || []).forEach((r, i) => {
      const s = SECTS[i]; if (!s) return;
      const t = R.sects[s];
      t.aff = r.aff || 0; t.grudge = r.grudge || 0;
      for (const m of (r.met || [])) t.met[m] = true;
      t.guest = r.guest || null;
    });
  };
  R.reset = R.resetSects;
  X.Relation = R;
})(globalThis.XIANG);

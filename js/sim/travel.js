/* 游历：派遣修士赴九州各地，途中文字事件链（自动抉择+属性检定），归山结算带回。
   声望与道典残卷的主要来源。 */
(function (X) {
  const T = {
    list: [],      // 进行中的远行队
    nextId: 1,
    log: [],      // 最近游历记闻（供面板展示）
  };

  T.canGo = d => d.kind === '修士' && !d.travel && (d.realm > 1 || (d.realm === 1 && d.stage >= 3));

  T.start = function (destId, ids) {
    const loc = X.World.byId[destId];
    if (!loc) return { ok: false, why: '未知地点' };
    const party = ids.map(i => X.Disciple.list.find(d => d.id === i)).filter(Boolean);
    if (!party.length || party.length > 3) return { ok: false, why: '须遣一至三名修士' };
    for (const d of party) if (!T.canGo(d)) return { ok: false, why: `${d.name} 修为尚浅（需练气三层）或已在途` };
    if (T.list.length >= 2) return { ok: false, why: '同时在外的队伍至多两支' };
    if (!X.Inv.take('grain', 4 * party.length)) return { ok: false, why: '行粮不足（每人 4 灵谷）' };
    const ex = {
      id: T.nextId++, dest: destId, party: party.map(d => d.id),
      day0: X.Time.day, days: loc.dist, back: false, done: false,
      loot: {}, ling: 0, kills: 0, events: 0,
    };
    for (const d of party) {
      d.travel = ex.id;
      d.task = null; d.state = '离山';
    }
    T.list.push(ex);
    X.Game.log(`游历启程：${party.map(d => d.name).join('、')} 远赴${loc.name}（约 ${loc.dist * 2} 日往返）`);
    return { ok: true, ex };
  };

  /* —— 事件抉择：优先尝试带检定的选项，过检走 ok，败检走 fail；无 fail 则退而求其次 —— */
  function resolveEvent(ex, party, loc) {
    const e = X.Events.roll(loc);
    if (!e) return;
    ex.events++;
    let chosen = null, outcome = null, okBranch = false;
    for (const o of e.opts) {
      if (!o.check) { chosen = o; outcome = o.ok; okBranch = true; break; }
      if (X.Events.check(party, o.check)) { chosen = o; outcome = o.ok; okBranch = true; break; }
      if (o.fail) { chosen = o; outcome = o.fail; okBranch = false; break; }
    }
    if (!chosen) return;
    const rec = { day: X.Time.day, name: e.name, opt: chosen.label, ok: okBranch, eff: outcome, dest: loc.name };
    T.log.unshift(rec); if (T.log.length > 40) T.log.pop();
    applyEffects(ex, party, outcome, loc);
    X.Game.log(`【游历·${loc.name}】${e.name} —— ${chosen.label}${okBranch ? '·成' : '·败'}`);
  }

  function applyEffects(ex, party, f, loc) {
    if (!f) return;
    if (f.items) for (const k in f.items) ex.loot[k] = (ex.loot[k] || 0) + f.items[k];
    if (f.ling) ex.ling += f.ling;
    if (f.rep) X.Game.addRep(f.rep);
    if (f.hp) for (const d of party) d.hp = Math.max(1, Math.min(X.Disciple.maxHp(d), d.hp + f.hp));
    if (f.exp) for (const d of party) X.Cult.gain(d, f.exp);
    if (f.mood) for (const d of party) d.moodEv += f.mood;
    if (f.days) ex.days = Math.max(2, ex.days + f.days);
    if (f.skill) for (const d of party) for (const k in f.skill) {
      if (d.craft && (k === 'dan' || k === 'qi' || k === 'fu')) d.craft[k] += f.skill[k];
      else if (d.skills && d.skills[k] !== undefined) d.skills[k] += f.skill[k];
    }
    if (f.affinity) X.Relation.change(f.affinity.sect, f.affinity.n);
    if (f.grudge) X.Relation.grudgeChange(f.grudge.sect, f.grudge.n);
    if (f.npc) X.Relation.meet(loc.type === 'sect' ? loc.id : null);
    if (f.sc) X.Game.findScroll();
    if (f.fight) {
      const res = X.Combat.resolvePartyFight(party, f.fight.tier);
      ex.kills += res.ok ? 1 : 0;
      if (res.ok) {
        ex.loot[res.loot.item] = (ex.loot[res.loot.item] || 0) + res.loot.n;
        X.Game.log(`【游历】队中修士合力斩杀「${res.def.name}」，取其内丹`);
      } else {
        X.Game.log(`【游历】不敌「${res.def.name}」，且战且走`);
        for (const d of party) d.hp = Math.max(1, d.hp - Math.round(res.hurt / party.length));
      }
    }
  }

  /* —— 归山结算 —— */
  function settle(ex) {
    const loc = X.World.byId[ex.dest];
    const party = ex.party.map(i => X.Disciple.list.find(d => d.id === i)).filter(Boolean);
    let lootStr = [];
    for (const k in ex.loot) {
      const n = ex.loot[k];
      if (n > 0) { const real = X.Inv.add(k, n); if (real > 0) lootStr.push(`${X.Items[k] ? X.Items[k].name : k}×${real}`); }
      else X.Inv.take(k, -n);
    }
    if (ex.ling) { X.Inv.add('ling', Math.max(0, ex.ling)); if (ex.ling > 0) lootStr.push(`灵石×${ex.ling}`); }
    X.Game.addRep(3 + Math.floor(loc.danger / 2) + (ex.kills ? 2 : 0));
    for (const d of party) {
      d.travel = 0;
      d.task = null; d.state = '归山';
      d.px = X.Game.home[0] + 0.5; d.py = X.Game.home[1] + 0.5;
      d.x = d.px | 0; d.y = d.py | 0;
      d.moodEv += 6;
    }
    X.Game.log(`游历归来：${loc.name}之行${lootStr.length ? '，携回 ' + lootStr.join('、') : '（此行收获寥寥）'}`);
    ex.done = true;
  }

  X.Bus.on('time:day', () => {
    if (!X.Game.inited) return;
    for (const ex of T.list) {
      if (ex.done) continue;
      const elapsed = X.Time.day - ex.day0;
      const party = ex.party.map(i => X.Disciple.list.find(d => d.id === i)).filter(d => d && !d.dead);
      if (!party.length) { ex.done = true; continue; }   // 全员覆没（理论兜底）
      const loc = X.World.byId[ex.dest];
      if (!ex.back) {
        if (elapsed >= ex.days) {
          ex.back = true; ex.day0 = X.Time.day;
          X.Game.log(`【游历】一行抵达${loc.name}，开始寻访`);
        } else if (elapsed > 0 && elapsed % 2 === 0) {
          resolveEvent(ex, party, loc);
        }
      } else {
        const e2 = X.Time.day - ex.day0;
        if (e2 >= ex.days) settle(ex);
        else if (e2 > 0 && e2 % 2 === 0 && X.rng.chance(0.6)) resolveEvent(ex, party, loc);
      }
    }
    T.list = T.list.filter(e => !e.done);
  });

  T.snapshot = () => ({
    list: T.list.map(e => ({ ...e, loot: { ...e.loot } })),
    log: T.log.slice(0, 40), nextId: T.nextId,
  });
  T.restore = function (o) {
    T.list = (o.list || []).map(e => ({ ...e, loot: { ...e.loot } }));
    T.log = o.log || []; T.nextId = o.nextId || 1;
    // 恢复弟子的 travel 标记
    for (const ex of T.list) for (const id of ex.party) {
      const d = X.Disciple.list.find(x => x.id === id);
      if (d) { d.travel = ex.id; d.state = '离山'; }
    }
  };
  T.reset = function () { T.list = []; T.log = []; T.nextId = 1; };
  X.Travel = T;
})(globalThis.XIANG);

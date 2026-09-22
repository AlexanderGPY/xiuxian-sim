/* 百艺总控：委托队列（修士自动执行）、成败判定、丹药符箓自动服用、法宝实例与词条。
   art: dan 丹 / qi 器 / fu 符；材料在下单时预扣。 */
(function (X) {
  const C = {
    orders: [], nextId: 1,
    artifacts: [], nextArt: 1,
  };

  C.stations = function (art) {
    return X.Build.builtOf('station').filter(b => b.def.tags.station === art);
  };

  // 下单：扣料排队
  C.queue = function (art, rid, count) {
    count = count || 1;
    const r = X.Recipes.byId[rid];
    if (!r) return null;
    if (!C.stations(art).length) { X.Game.log(`尚未建成${({ dan: '丹房', qi: '器坊', fu: '符案' })[art]}`); return null; }
    for (let i = 0; i < count; i++) {
      let ok = true;
      for (const k in r.cost) if (!X.Inv.take(k, r.cost[k])) ok = false;
      if (!ok) {   // 回滚本单
        for (const k in r.cost) X.Inv.add(k, r.cost[k]);
        X.Game.log(`物料不足：${r.name}（${Object.keys(r.cost).map(k => X.Items[k].name).join('、')}）`);
        return i > 0 ? C.orders[C.orders.length - 1] : null;
      }
      const o = { id: C.nextId++, art, rid, worker: 0, station: C.stations(art)[0].id };
      C.orders.push(o);
    }
    return C.orders[C.orders.length - 1];
  };
  C.cancel = function (id) {
    const i = C.orders.findIndex(o => o.id === id);
    if (i < 0) return;
    const r = X.Recipes.byId[C.orders[i].rid];
    for (const k in r.cost) X.Inv.add(k, r.cost[k]);
    if (C.orders[i].worker) {
      const d = X.Disciple.list.find(d => d.task && d.task.order === id);
      if (d) d.task = null;
    }
    C.orders.splice(i, 1);
  };

  // 修士认领（境界达标 + 有作坊）
  C.claim = function (d) {
    if (d.kind !== '修士') return null;
    for (const o of C.orders) {
      if (o.worker) continue;
      const r = X.Recipes.byId[o.rid];
      if (d.realm < r.realm) continue;
      const st = X.Build.inst[o.station];
      if (!st || !st.built) continue;
      o.worker = d.id;
      return o;
    }
    return null;
  };
  C.releaseOrder = function (o) { o.worker = 0; };

  // 完成判定
  C.finish = function (o, d, qte) {
    qte = qte || 0;   // QTE 加成 0~0.35
    const r = X.Recipes.byId[o.rid];
    const art = o.art;
    const skill = (d.craft && d.craft[art]) || 0;
    const st = X.Build.inst[o.station];
    const feng = st ? X.Feng.roomAt(st.x, st.y) : null;
    const fengM = feng ? feng.brkM : 1;
    let chance = 0.52 + d.stats.shen / 300 + skill * 0.05 + (fengM - 1) * 0.8 - r.diff * 0.045 + qte;
    if (X.Relation) chance += art === 'dan' ? X.Relation.buff().dan : X.Relation.buff().qi;   // 客卿传艺
    chance = Math.max(0.05, Math.min(0.98, chance));
    const perfect = qte >= 0.3;
    d.craft[art] = Math.min(10, d.craft[art] + (perfect ? 0.6 : 0.4));
    const idx = C.orders.indexOf(o);
    if (idx >= 0) C.orders.splice(idx, 1);

    if (X.rng.f() < chance) {
      if (art === 'qi') {
        const pool = X.rng.shuffle(X.Recipes.AFFIX_POOL.slice()).slice(0, r.affix);
        const artItem = {
          iid: C.nextArt++, name: r.name, tier: r.realm,
          affixes: pool.map(a => ({ k: a.k, n: a.n, desc: a.desc })),
          holder: 0,
        };
        C.artifacts.push(artItem);
        X.Game.log(`${d.name} 锻成【${r.name}】（${artItem.affixes.map(a => a.n).join('·')}）`);
        X.Bus.emit('craft:done', { ok: true, art, item: artItem });
      } else {
        let n = X.rng.i(r.out[0], r.out[1]) + (perfect ? 1 : 0);
        X.Inv.add(r.id, n);
        X.Game.log(`${d.name} 炼成 ${r.name}×${n}`);
        X.Bus.emit('craft:done', { ok: true, art, rid: r.id, n });
      }
      return true;
    }
    // 失败：折损一半物料
    for (const k in r.cost) X.Inv.add(k, Math.ceil(r.cost[k] / 2));
    X.Game.log(`${d.name} 炼制 ${r.name} 失败，折损物料`);
    X.Bus.emit('craft:done', { ok: false, art, rid: r.id });
    return false;
  };

  // 亲手炼制：玩家 QTE 结算（选技艺最高的修士执炉，免走位）
  C.manual = function (art, rid, bonus) {
    const r = X.Recipes.byId[rid];
    if (!r || !C.stations(art).length) return false;
    for (const k in r.cost) if (!X.Inv.take(k, r.cost[k])) {
      for (const k2 in r.cost) if (k2 !== k) X.Inv.add(k2, r.cost[k2]);
      X.Game.log(`物料不足：${r.name}`);
      return false;
    }
    let best = null;
    for (const d of X.Disciple.list) {
      if (d.kind !== '修士' || d.realm < r.realm) continue;
      if (!best || d.craft[art] > best.craft[art]) best = d;
    }
    if (!best) {
      for (const k in r.cost) X.Inv.add(k, r.cost[k]);
      X.Game.log('无境界相当的修士可执此事');
      return false;
    }
    const o = { id: 0, art, rid, worker: best.id, station: C.stations(art)[0].id };
    return C.finish(o, best, bonus);
  };

  // 丹药/符箓效果
  C.applyUse = function (d, r) {
    const u = r.use;
    if (u.hp) d.hp = Math.min(X.Cult.maxHp(d), d.hp + u.hp);
    if (u.hpMax) d.hpMaxBuff = (d.hpMaxBuff || 0) + u.hpMax;
    if (u.mood) d.moodEv += u.mood;
    if (u.hunger) d.needs.hunger = Math.min(100, d.needs.hunger + u.hunger);
    if (u.sleep) d.needs.sleep = Math.min(100, d.needs.sleep + u.sleep);
    if (u.comfort) { d.needs.comfort = Math.min(100, d.needs.comfort + u.comfort); d.needs.beauty = Math.min(100, d.needs.beauty + u.beauty); }
    if (u.exp) X.Cult.gain(d, u.exp);
    if (u.statWu) d.stats.wu += u.statWu;
    if (u.statAll) for (const k in d.stats) d.stats[k] += u.statAll;
    if (u.life) d.lifeBuff = (d.lifeBuff || 0) + u.life;
    if (u.buffCult) X.Buffs.add(d, 'cult', u.buffCult[0], u.buffCult[1]);
    if (u.hpShield) d.hp = Math.min(X.Cult.maxHp(d), d.hp + u.hpShield);
  };

  // 冲关自动服药/符：返回加成
  C.brkBoost = function (d) {
    const cands = ['fuPo', 'pillPoZ', 'pillPoJ', 'pillPoY'].filter(id => X.Inv.count(id) > 0);
    if (!cands.length) return 0;
    const id = cands[cands.length - 1];
    X.Inv.take(id, 1);
    C.applyUse(d, X.Recipes.byId[id]);
    X.Game.log(`${d.name} 服下${X.Recipes.byId[id].name}，冲关胜算大增`);
    return X.Recipes.byId[id].use.brk || 0;
  };

  // 每时辰自动服用（弟子 update 调用）
  C.autoConsume = function (d) {
    if (d.hp < 40 && X.Inv.take('pillLiao', 1)) { C.applyUse(d, X.Recipes.byId.pillLiao); return; }
    if (d.hp < 25 && X.Inv.take('fuHu', 1)) { C.applyUse(d, X.Recipes.byId.fuHu); return; }
    if (d.mood < 20) {
      if (X.Inv.take('pillQing', 1)) { C.applyUse(d, X.Recipes.byId.pillQing); return; }
      if (X.Inv.take('fuQing', 1)) { C.applyUse(d, X.Recipes.byId.fuQing); return; }
    }
    if (d.needs.hunger < 30 && X.Inv.take('pillBiGu', 1)) { C.applyUse(d, X.Recipes.byId.pillBiGu); return; }
    if (d.needs.hunger < 30 && X.Inv.take('fuBiGu', 1)) { C.applyUse(d, X.Recipes.byId.fuBiGu); return; }
  };

  // 法宝加成聚合（装备中）
  C.artMods = function (d) {
    const m = { cult: 0, brk: 0, mood: 0, gather: 0, atk: 0, def: 0, hp: 0 };
    if (d.artifact) {
      const a = C.artifacts.find(x => x.iid === d.artifact);
      if (a) for (const af of a.affixes) {
        if (af.k === 'hp') m.hp += 15;
        else m[af.k] += ({ cult: 0.08, brk: 0.06, mood: 0.08, gather: 0.1, atk: 0.15, def: 0.12 })[af.k] || 0;
      }
    }
    return m;
  };
  C.equip = function (d, iid) {
    if (d.artifact) {
      const old = C.artifacts.find(x => x.iid === d.artifact);
      if (old) old.holder = 0;
    }
    d.artifact = iid;
    const a = C.artifacts.find(x => x.iid === iid);
    if (a) a.holder = d.id;
  };

  C.snapshot = () => ({
    orders: C.orders.map(o => ({ art: o.art, rid: o.rid })),
    artifacts: C.artifacts.map(a => ({ ...a, affixes: a.affixes.map(x => ({ ...x })) })),
    nextArt: C.nextArt,
  });
  C.restore = function (o) {
    C.orders = []; C.nextId = 1;
    for (const r of (o && o.orders) || []) {
      const st = C.stations(r.art)[0];
      if (st) C.orders.push({ id: C.nextId++, art: r.art, rid: r.rid, worker: 0, station: st.id });
    }
    C.artifacts = ((o && o.artifacts) || []).map(a => ({ ...a, affixes: (a.affixes || []).map(x => ({ ...x })) }));
    C.nextArt = (o && o.nextArt) || 1;
  };
  // P4：拍卖直接购得已开光法宝
  C.makeArt = function (rid) {
    const r = X.Recipes.byId[rid];
    if (!r) return null;
    const pool = X.rng.shuffle(X.Recipes.AFFIX_POOL.slice()).slice(0, r.affix);
    const artItem = {
      iid: C.nextArt++, name: r.name, tier: r.realm,
      affixes: pool.map(a => ({ k: a.k, n: a.n, desc: a.desc })),
      holder: 0,
    };
    C.artifacts.push(artItem);
    X.Game.log(`拍得法宝【${r.name}】（${artItem.affixes.map(a => a.n).join('·')}），入库存放`);
    return artItem;
  };

  C.reset = function () { C.orders = []; C.nextId = 1; C.artifacts = []; C.nextArt = 1; };

  X.Craft = C;
})(globalThis.XIANG);

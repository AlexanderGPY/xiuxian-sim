/* 天劫：渡劫境（第10境）九层即九劫，每 30 日一劫、劫前 5 日布置窗。
   准备度 = 护体丹（容错带宽）+ 法宝（偏差减伤）+ 护体阵（一次免伤）+ 道侣护法（一条命）。
   结算通道：浏览器走 QTE 时机条（X.QTE.lei），无界面环境走托付天命（按准备度概率模拟）。 */
(function (X) {
  const T = {
    total: 0,        // 本局累计渡劫次数（全门）
    lastDay: {},     // discipleId -> 上次渡劫日
    log: [],
  };

  /* —— 渡劫境修士就绪判定（cultivate 侧调用）：当前层修为满即雷云可聚 —— */
  T.ready = function (d) {
    return d.realm === 9 && X.Realms.full(d);
  };
  T.canTri = function (d) {
    if (!T.ready(d)) return false;
    return (T.lastDay[d.id] || 0) + 30 <= X.Time.day;
  };
  T.arm = function (d) {   // 进入劫前布置窗（由 FSM 置 ready 状态）
    d.state = '劫云压顶';
  };

  /* —— 准备度快照 —— */
  T.prepare = function (d) {
    const p = { width: 0.16, slow: 1, dmgCut: 0, shieldFree: 0, extraLife: 0, used: {} };
    // 护体丹：每粒 +16% 带宽（至多三粒）
    let pills = Math.min(3, X.Inv.count('pillHu'));
    if (pills > 0) { X.Inv.take('pillHu', pills); p.width += 0.16 * pills; p.used.pillHu = pills; }
    // 法宝：偏差减伤 30%
    if (d.artifact) { p.dmgCut = 0.3; p.used.artifact = true; }
    // 护体阵：每座激活阵法 8% 减伤；藏风阵额外「一次免伤」
    const forms = X.Form ? X.Form.get() : [];
    if (forms.length) {
      p.dmgCut += Math.min(0.24, forms.length * 0.08);
      p.used.forms = forms.length;
      if (forms.some(a => a.z.id === 'cangfeng' || a.z.id === 'hushan')) { p.shieldFree = 1; p.used.cangfeng = true; }
    }
    // 道侣护法：额外一条命
    if (d.daolv) { p.extraLife = 1; p.used.daolv = true; }
    // 心境与神识微调指针速度
    p.slow = 1 + d.stats.shen / 900 + d.mood / 900;
    p.width = Math.min(0.62, p.width);
    return p;
  };

  /* —— 渡劫主入口 —— */
  T.begin = function (d, interactive) {
    if (!T.canTri(d)) return { ok: false, why: '雷云未聚（三十日一劫）' };
    T.lastDay[d.id] = X.Time.day;
    const no = (d.stage + 1);   // 第几劫
    const bolts = 3 + Math.min(3, Math.floor((no - 1) / 2)) + (no >= 7 ? 1 : 0);   // 3~7 道
    const prep = T.prepare(d);
    T.total++;
    X.Game.log(`【天劫·第${no}劫】${d.name} 顶上雷云压城（${bolts} 道天雷）`);
    X.Bus.emit('trib:on', { d, no, bolts });
    const settle = hits => T.settle(d, no, prep, hits);
    if (interactive && X.QTE && X.QTE.lei) {
      X.QTE.lei({ name: d.name, no, bolts, prep }, settle);
      return { ok: true, deferred: true };
    }
    // 托付天命：按准备度模拟（每道雷命中带宽概率 = width×slow + 基础手气）
    const hits = [];
    let speedSlow = 1;
    for (let i = 0; i < bolts; i++) {
      const p = 0.28 + prep.width * prep.slow * 0.9;
      const r = X.rng.f();
      if (r < p) { hits.push('in'); speedSlow *= 1.06; }        // 命中带内：下道更慢
      else if (r < p + 0.24) hits.push('edge');
      else hits.push('out');
    }
    return settle(hits);
  };

  /* —— 结算：护体 100 起步，气血另计；带内借力/边缘扣护体/带外扣气血 —— */
  T.settle = function (d, no, prep, hits) {
    let shield = 100, hp = d.hp, free = prep.shieldFree, life = prep.extraLife, res = { no, hits: [], dead: false };
    for (const h of hits) {
      if (h === 'in') { res.hits.push('借力'); continue; }
      if (h === 'edge') {
        if (free > 0) { free--; res.hits.push('阵挡'); continue; }
        shield -= 22 * (1 - prep.dmgCut);
        res.hits.push('擦身');
      } else {
        if (free > 0) { free--; res.hits.push('阵挡'); continue; }
        hp -= 34 * (1 - prep.dmgCut);
        res.hits.push('雷贯');
      }
      if (hp <= 0 && life > 0) { life--; hp = X.Disciple.maxHp(d) * 0.5; res.hits.push('道侣护法'); }
      if (hp <= 0) { res.dead = true; break; }
    }
    d.hp = Math.max(1, hp);
    if (res.dead) {
      res.hits.push('身陨');
      X.Game.kill(d, `渡第${no}劫失败，形神俱灭`);
      T.log.unshift({ day: X.Time.day, name: d.name, no, ok: false });
      X.Bus.emit('trib:done', { ok: false, no });
      return { ok: false, dead: true, res };
    }
    // 劫成：渡劫境内推一层；第九劫成 → 飞升
    if (no >= 9) {
      d.realm = 10; d.stage = 0; d.exp = 0;
      X.Trib.ascend(d);
    } else {
      d.stage++; d.exp = 0;
      d.moodEv += 12;
      X.Game.addRep(8 + no * 2);
      X.Game.log(`【天劫】${d.name} 渡过第${no}劫（${res.hits.join('·')}），气冲斗牛`);
    }
    T.log.unshift({ day: X.Time.day, name: d.name, no, ok: true });
    if (T.log.length > 20) T.log.pop();
    X.Bus.emit('trib:done', { ok: true, no });
    return { ok: true, res };
  };

  /* —— 飞升：传承与声望 —— */
  T.ascend = function (d) {
    X.Game.ascended++;
    X.Game.addRep(40);
    X.Game.legacy.points += 60 + Math.floor((d.stats.shen + d.stats.wu + d.stats.li) / 6);
    X.Game.legacy.ascList.unshift({ name: d.name, day: X.Time.day, year: X.Time.year || 1 });
    X.Game.log(`【飞升】${d.name} 破开九霄，霞光万丈！山门声望大涨，道统有承`);
    X.Bus.emit('ascend:done', d);
    // 弟子离山登仙
    d.dead = true;
    X.Disciple.list = X.Disciple.list.filter(o => o !== d);
    if (d.bed && X.Build.inst[d.bed]) X.Build.inst[d.bed].sleeper = 0;
    if (d.daolv) {   // 道侣随缘证道，客卿离任归山
      const npc = X.Npcs.byId[d.daolv];
      if (npc) X.Relation.sects[npc.sect].guest = null;
    }
  };

  /* —— 传承（周目内世袭）：传功殿以功德换血脉/机缘 —— */
  T.PERKS = [
    { id: 'lingRoot', name: '灵根淬养', cost: 50, desc: '此后来投弟子灵根更佳（+20% 概率灵根上佳）' },
    { id: 'startBook', name: '遗泽藏书', cost: 40, desc: '开局/来访弟子更易携艺入门（入门百艺熟练 +1）' },
    { id: 'calmWave', name: '山灵安澜', cost: 60, desc: '妖潮间隔延长 10 日' },
  ];
  T.buyPerk = function (id) {
    const p = T.PERKS.find(x => x.id === id);
    const L = X.Game.legacy;
    if (!p || L.perks.indexOf(id) >= 0 || L.points < p.cost) return { ok: false, why: '功德不足或已购' };
    L.points -= p.cost;
    L.perks.push(id);
    X.Game.log(`【传承】「${p.name}」惠及后人`);
    return { ok: true };
  };
  T.hasPerk = id => X.Game.legacy.perks.indexOf(id) >= 0;

  T.snapshot = () => ({ total: T.total, lastDay: { ...T.lastDay }, log: T.log.slice(0, 20) });
  T.restore = function (o) {
    T.total = (o && o.total) || 0;
    T.lastDay = (o && o.lastDay) || {};
    T.log = (o && o.log) || [];
  };
  T.reset = function () { T.total = 0; T.lastDay = {}; T.log = []; };
  X.Trib = T;
})(globalThis.XIANG);

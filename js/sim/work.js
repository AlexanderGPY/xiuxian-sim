/* 任务板：扫描生成岗位（采集/营建/农作/炊事），闲散弟子按 优先级×距离 认领。 */
(function (X) {
  const W = { jobs: {}, nextId: 1 };

  function add(type, tx, ty, prio, meta) {
    for (const id in W.jobs) {   // 去重：同目标同类岗位只留一个
      const j = W.jobs[id];
      if (j.type === type && j.tx === tx && j.ty === ty) return;
    }
    const id = W.nextId++;
    W.jobs[id] = { id, type, tx, ty, prio, worker: 0, bid: meta && meta.bid };
  }
  W.done = id => { delete W.jobs[id]; };
  W.release = (id, d) => { const j = W.jobs[id]; if (j) { if (!d || j.worker === d.id) j.worker = 0; } };

  // 找离 (x,y) 最近的地形格
  function nearestTile(list, x, y, maxD) {
    let best = null, bd = Infinity;
    for (const p of list) {
      const dd = Math.abs(p[0] - x) + Math.abs(p[1] - y);
      if (dd < bd) { bd = dd; best = p; }
    }
    return bd <= (maxD || 60) ? best : null;
  }

  W.scan = function () {
    const G = X.Game, Inv = X.Inv, T = X.Inv.TARGET;
    // 清死岗
    for (const id in W.jobs) {
      const j = W.jobs[id];
      if (j.worker && !X.Disciple.list.some(d => d.id === j.worker && d.task && d.task.job === j.id)) j.worker = 0;
      if (j.type === 'build' && (!X.Build.inst[j.bid] || X.Build.inst[j.bid].built)) delete W.jobs[id];
      if (j.type === 'harvest' && (!X.Build.inst[j.bid] || !X.Build.inst[j.bid].farm || !X.Build.inst[j.bid].farm.ready)) delete W.jobs[id];
      if (j.type === 'sow' && (!X.Build.inst[j.bid] || !X.Build.inst[j.bid].farm || X.Build.inst[j.bid].farm.planted)) delete W.jobs[id];
    }
    // 在途量（已被认领的同类岗位）
    const pending = k => Object.values(W.jobs).filter(j => j.type === k).length;

    // 1) 收割（最高优先）
    X.Build.each(b => {
      if (b.built && b.farm && b.farm.ready) add('harvest', b.x, b.y, 4, { bid: b.id });
    });
    // 2) 营建
    X.Build.each(b => { if (!b.built) add('build', b.x, b.y, 3, { bid: b.id }); });
    // 3) 炊事：食 < 目标 且有谷（同一灶台同时只开一岗，扣粮在建岗成功之后）
    if (Inv.count('meal') + pending('cook') * 2 < T.meal && pending('cook') === 0 && Inv.count('grain') >= 6) {
      const stove = X.Build.builtOf('cook')[0];
      if (stove && Inv.take('grain', 3)) add('cook', stove.x, stove.y, 3);
    }
    // 4) 播种（仓满八成五则惜工停播）
    const grainFull = Inv.count('grain') > Inv.capOf('grain') * 0.85;
    if (!grainFull) X.Build.each(b => {
      if (b.built && b.farm && !b.farm.planted && !b.farm.ready) add('sow', b.x, b.y, 2, { bid: b.id });
    });
    // 5) 伐木 / 采石（补给目标）
    if (Inv.count('wood') + pending('chop') * 8 < T.wood && pending('chop') < 3) {
      const p = nearestTile(G.forest, G.home[0], G.home[1]);
      if (p) add('chop', p[0], p[1], 1);
    }
    if (Inv.count('stone') + pending('mine') * 6 < T.stone && pending('mine') < 3) {
      const p = nearestTile(G.rocks, G.home[0], G.home[1]);
      if (p) add('mine', p[0], p[1], 1);
    }
  };

  // 闲散杂役领岗（修士不事杂务）
  W.assign = function () {
    const idle = X.Disciple.list.filter(d => !d.task && !d.dead && d.kind === '杂役');
    if (!idle.length) return;
    const open = Object.values(W.jobs).filter(j => !j.worker);
    if (!open.length) return;
    open.sort((a, b) => b.prio - a.prio);
    for (const d of idle) {
      let best = null, bd = Infinity;
      for (const j of open) {
        if (j.worker) continue;
        const dist = Math.abs(j.tx - d.x) + Math.abs(j.ty - d.y);
        const score = dist - j.prio * 18;   // 优先级换算距离折扣
        if (score < bd) { bd = score; best = j; }
      }
      if (best && X.Disciple.takeJob(d, best)) best.worker = d.id;
    }
  };

  W.clear = () => { W.jobs = {}; };
  X.Work = W;
})(globalThis.XIANG);

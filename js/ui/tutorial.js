/* P6 教学引导：首局按里程碑推进的掌门手册（可跳过；进度存 G.tut）。 */
(function (X) {
  const T = {};
  const STEPS = [
    { id: 'build', name: '安身之所', hint: '左侧【营造】选一处建筑放置（建议柴堆/床榻）——杂役会自动营建', done: () => X.Game.stats.buildingsDone >= 3 },
    { id: 'farm', name: '开辟灵田', hint: '营建里放置「灵田」，杂役会自行播种收割；人口增长时他们也会自发开垦', done: () => { let n = 0; X.Build.each(b => { if (b.built && b.farm) n++; }); return n >= 3; } },
    { id: 'cult', name: '吐纳筑基', hint: '杂役闲时自行吐纳；练气圆满者会待择典——点选其人择典冲关筑基', done: () => X.Disciple.list.some(d => d.kind === '修士') },
    { id: 'craft', name: '百艺开炉', hint: '建蒲团静修、再起丹房/符案；修士闲时自动接单炼制，亦可亲手制作赢加成', done: () => X.Craft.orders.length > 0 || X.Travel.log.length > 0 || X.Craft.artifacts.length > 0 },
    { id: 'wave', name: '扬名立万', hint: '声望满 25 后妖潮将至——派修士游历九州、炼丹售货攒声望，并造山门布阵迎敌', done: () => X.Combat.wave >= 1 },
    { id: 'dujie', name: '大道之约', hint: '结丹以上修士可在风水宝地打坐冲境；渡劫境弟子将面对九重天劫——护体丹/法宝/护体阵/道侣护法缺一不可', done: () => X.Trib.total >= 1 || X.Game.ascended >= 1 },
  ];
  T.step = function () {
    if (!X.Game.inited || X.Game.tutSkip) return null;
    const i = X.Game.tutStep | 0;
    if (i >= STEPS.length) return null;
    const s = STEPS[i];
    return s.done() ? (X.Game.tutStep = i + 1, T.step()) : { idx: i + 1, total: STEPS.length, ...s };
  };
  T.skip = function () { X.Game.tutSkip = true; };
  X.Tut = T;
})(globalThis.XIANG);

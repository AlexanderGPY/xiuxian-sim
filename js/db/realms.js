/* 十一境：段数/修为/寿元/破境基数。
   修为需求 cost(stage) = costBase × (1 + 0.5×stage)；练气 9 层，其余 4 段。 */
(function (X) {
  const R = [
    { name: '凡人', stages: 1, costBase: 0, life: 60, brk: 0 },
    { name: '练气', stages: 9, costBase: 60, life: 80, brk: 0.65 },
    { name: '筑基', stages: 4, costBase: 1200, life: 120, brk: 0.55 },
    { name: '结丹', stages: 4, costBase: 2400, life: 170, brk: 0.45 },
    { name: '元婴', stages: 4, costBase: 4800, life: 240, brk: 0.40 },
    { name: '化神', stages: 4, costBase: 9600, life: 340, brk: 0.35 },
    { name: '炼虚', stages: 4, costBase: 19200, life: 480, brk: 0.30 },
    { name: '合体', stages: 4, costBase: 38400, life: 650, brk: 0.30 },
    { name: '大乘', stages: 4, costBase: 76800, life: 900, brk: 0.25 },
    { name: '渡劫', stages: 9, costBase: 153600, life: 1000, brk: 0.25 },
    { name: '飞升', stages: 1, costBase: 0, life: 99999, brk: 0 },
  ];
  X.Realms = {
    list: R,
    cost(realm, stage) {
      const r = R[realm];
      if (!r.costBase) return Infinity;
      return Math.round(r.costBase * (1 + 0.5 * stage));
    },
    realmName(d) { return R[d.realm].name; },
    stageName(d) {
      const r = R[d.realm];
      if (d.realm === 0) return '';
      if (d.realm === 1) return `第${d.stage + 1}层`;
      return ['初期', '中期', '后期', '圆满'][d.stage] || '';
    },
    full(d) { return d.exp >= X.Realms.cost(d.realm, d.stage); },
    atCap(d) { return d.stage >= R[d.realm].stages - 1 && X.Realms.full(d); },
    life(realm) { return R[realm].life; },
  };
  // 神通解锁节点：练气三层 / 练气六层 / 筑基 / 结丹
  X.Realms.SPELL_AT = [
    d => d.realm === 1 && d.stage >= 2,
    d => d.realm === 1 && d.stage >= 5,
    d => d.realm >= 2,
    d => d.realm >= 3,
  ];
})(globalThis.XIANG);

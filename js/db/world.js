/* 九州二十地：门派六 / 城坊四 / 秘境六 / 荒域四。
   dist=单程日数；danger=1~5；tags 加权游历事件抽取；drop 为灵材掉落池。 */
(function (X) {
  const L = [
    // —— 六大门派（换典/缘分/客卿） ——
    { id: 'qingyun', name: '青云观', type: 'sect', el: 0, dist: 6, danger: 1, tags: ['sect', 'sword'], desc: '剑修名门，藏经浩繁' },
    { id: 'luoxia', name: '落霞谷', type: 'sect', el: 2, dist: 8, danger: 1, tags: ['sect', 'dan'], desc: '丹修圣地，谷中百草皆药' },
    { id: 'xuanshui', name: '玄水宫', type: 'sect', el: 2, dist: 10, danger: 2, tags: ['sect', 'water'], desc: '临北海寒渊，宫阙在水下' },
    { id: 'chiyang', name: '赤阳宗', type: 'sect', el: 3, dist: 9, danger: 2, tags: ['sect', 'fire'], desc: '火山口立宗，性烈好斗' },
    { id: 'houtu', name: '厚土门', type: 'sect', el: 4, dist: 7, danger: 1, tags: ['sect', 'craft'], desc: '器修世家，断山为炉' },
    { id: 'taixu', name: '太虚道', type: 'sect', el: 1, dist: 12, danger: 2, tags: ['sect', 'zen'], desc: '飘渺难寻，非有缘不至' },
    // —— 四城坊（买卖/拍卖/消息） ——
    { id: 'linjiang', name: '临江坊', type: 'city', el: 1, dist: 4, danger: 1, tags: ['city', 'trade'], desc: '水陆码头，百货云集' },
    { id: 'baishi', name: '白石城', type: 'city', el: 0, dist: 6, danger: 1, tags: ['city', 'trade'], desc: '修真界第一大城' },
    { id: 'yanhui', name: '雁回集', type: 'city', el: 3, dist: 5, danger: 1, tags: ['city', 'rumor'], desc: '散修聚集，消息灵通' },
    { id: 'cangwu', name: '苍梧墟', type: 'city', el: 2, dist: 9, danger: 2, tags: ['city', 'trade', 'black'], desc: '灰市之地，鱼龙混杂' },
    // —— 六秘境（灵材/奇遇） ——
    { id: 'jianzhong', name: '古剑冢', type: 'realm', el: 0, dist: 8, danger: 3, tags: ['realm', 'sword', 'relic'], desc: '万剑朝冢，剑意未散' },
    { id: 'chenxing', name: '沉星涧', type: 'realm', el: 2, dist: 10, danger: 3, tags: ['realm', 'water', 'relic'], desc: '陨星坠涧，寒气侵骨' },
    { id: 'biwu', name: '碧梧林', type: 'realm', el: 1, dist: 7, danger: 2, tags: ['realm', 'herb'], desc: '灵禽栖梧，芝草满地' },
    { id: 'rongyan', name: '熔岩窟', type: 'realm', el: 3, dist: 11, danger: 4, tags: ['realm', 'fire', 'ore'], desc: '地火奔涌，火灵横行' },
    { id: 'huangsha', name: '黄沙秘境', type: 'realm', el: 4, dist: 10, danger: 3, tags: ['realm', 'relic'], desc: '上古修士坐化之地' },
    { id: 'wuyin', name: '雾隐谷', type: 'realm', el: 1, dist: 8, danger: 3, tags: ['realm', 'herb', 'mist'], desc: '雾锁终年，内有洞天' },
    // —— 四荒域（高危高赏） ——
    { id: 'beiming', name: '北冥冰原', type: 'wild', el: 2, dist: 16, danger: 5, tags: ['wild', 'beast', 'relic'], desc: '极北苦寒，上古妖兽沉眠' },
    { id: 'shanwan', name: '十万大山', type: 'wild', el: 1, dist: 14, danger: 5, tags: ['wild', 'beast', 'herb'], desc: '山连万重，妖族称王' },
    { id: 'youming', name: '幽冥泽', type: 'wild', el: 2, dist: 15, danger: 5, tags: ['wild', 'ghost', 'relic'], desc: '瘴雾蔽日，亡魂不散' },
    { id: 'damoguyan', name: '大漠孤烟', type: 'wild', el: 4, dist: 13, danger: 4, tags: ['wild', 'relic', 'trade'], desc: '沙海无垠，古国湮灭' },
  ];
  // 掉落池：[itemId, 权重, 最少, 最多]
  const DROPS = {
    sect: [['ling', 30, 8, 25], ['herb', 15, 2, 5], ['lingzhi', 6, 1, 2], ['yaodan1', 5, 1, 2], ['yaodan2', 2, 1, 1]],
    city: [['ling', 35, 10, 30], ['grain', 12, 8, 20], ['herb', 10, 2, 6], ['yaodan1', 4, 1, 2]],
    realm: [['herb', 20, 3, 8], ['lingzhi', 12, 1, 3], ['yaodan1', 10, 1, 3], ['yaodan2', 8, 1, 2], ['yaodan3', 4, 1, 1], ['ling', 15, 5, 20], ['stone', 8, 5, 12], ['wood', 8, 5, 12]],
    wild: [['yaodan2', 14, 1, 3], ['yaodan3', 12, 1, 2], ['yaodan4', 6, 1, 1], ['lingzhi', 10, 2, 4], ['ling', 12, 15, 45], ['guDan', 2, 1, 1]],
  };
  const W = {
    list: L,
    byId: {},
    distName: { sect: '门派', city: '城坊', realm: '秘境', wild: '荒域' },
    drop(loc) {
      const pool = DROPS[loc.type] || DROPS.city;
      let sum = 0; for (const p of pool) sum += p[1];
      let r = X.rng.i(0, sum - 1);
      for (const [item, wgt, lo, hi] of pool) {
        if ((r -= wgt) < 0) return { item, n: X.rng.i(lo, hi) };
      }
      return { item: 'ling', n: 5 };
    },
  };
  for (const l of L) W.byId[l.id] = l;
  X.World = W;
})(globalThis.XIANG);

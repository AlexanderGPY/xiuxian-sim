/* 百艺数据：丹方/器方/符箓/阵法/天地灵植。
   丹 effect 直接作用于服用者；器 affixes 从池中抽取；符为一次性；
   阵由 阵眼+阵旗 激活；灵植五株限种。 */
(function (X) {
  const R = X.Recipes = {};

  // ---- 丹道（14 方）----
  R.dan = [
    { id: 'pillJu', name: '聚气丹', realm: 1, cost: { herb: 2 }, work: 160, diff: 2, out: [2, 4],
      desc: '修为 +120', use: { exp: 120 } },
    { id: 'pillLiao', name: '疗伤丹', realm: 1, cost: { herb: 1, grain: 2 }, work: 140, diff: 1, out: [2, 3],
      desc: '气血 +45（重伤自服）', use: { hp: 45 } },
    { id: 'pillQing', name: '清心丹', realm: 1, cost: { herb: 2 }, work: 150, diff: 2, out: [2, 3],
      desc: '心境 +18（郁时自服）', use: { mood: 18 } },
    { id: 'pillBiGu', name: '辟谷丹', realm: 1, cost: { grain: 3, herb: 1 }, work: 170, diff: 2, out: [2, 3],
      desc: '饥饿全满', use: { hunger: 100 } },
    { id: 'pillPoZ', name: '破境丹', realm: 2, cost: { herb: 3, lingzhi: 1 }, work: 260, diff: 4, out: [1, 2],
      desc: '破境成功率 +18%（冲关自服）', use: { brk: 0.18 } },
    { id: 'pillNing', name: '凝神丹', realm: 2, cost: { herb: 3 }, work: 220, diff: 3, out: [1, 3],
      desc: '修炼 +25%（三日）', use: { buffCult: [0.25, 3] } },
    { id: 'pillSui', name: '洗髓丹', realm: 2, cost: { lingzhi: 1, herb: 2 }, work: 300, diff: 5, out: [1, 1],
      desc: '悟性 +3（永久）', use: { statWu: 3 } },
    { id: 'pillPoJ', name: '破障丹·结丹', realm: 3, cost: { herb: 4, lingzhi: 2 }, work: 320, diff: 5, out: [1, 2],
      desc: '破境成功率 +22%', use: { brk: 0.22 } },
    { id: 'pillYu', name: '玉髓丹', realm: 3, cost: { lingzhi: 2, herb: 3 }, work: 340, diff: 5, out: [1, 2],
      desc: '气血上限 +20（永久）', use: { hpMax: 20 } },
    { id: 'pillXu', name: '续命丹', realm: 4, cost: { lingzhi: 3, herb: 5 }, work: 420, diff: 7, out: [1, 1],
      desc: '寿元 +8 载', use: { life: 8 } },
    { id: 'pillPoY', name: '破障丹·元婴', realm: 4, cost: { herb: 6, lingzhi: 3 }, work: 440, diff: 7, out: [1, 2],
      desc: '破境成功率 +25%', use: { brk: 0.25 } },
    { id: 'pillHun', name: '混元丹', realm: 5, cost: { lingzhi: 5, herb: 8 }, work: 520, diff: 8, out: [1, 1],
      desc: '修为 +4000', use: { exp: 4000 } },
    { id: 'pillDu', name: '渡厄丹', realm: 5, cost: { lingzhi: 4, herb: 6 }, work: 500, diff: 8, out: [1, 1],
      desc: '气血回满且上限 +10', use: { hp: 999, hpMax: 10 } },
    { id: 'pillHu', name: '护体丹', realm: 4, cost: { herb: 3, yaodan2: 1 }, work: 420, diff: 5, out: [1, 2],
      desc: '渡劫容错带宽 +16%（每劫至多三粒，自动受用）', use: {} },
    { id: 'pillTai', name: '太初灵丹', realm: 7, cost: { lingzhi: 8, herb: 12 }, work: 700, diff: 9, out: [1, 1],
      desc: '全属性 +5', use: { statAll: 5 } },
  ];

  // ---- 器道（6 方）：法宝词条从池抽 ----
  R.qi = [
    { id: 'artSword', name: '青霜飞剑', realm: 1, cost: { stone: 8, wood: 4, ling: 1 }, work: 300, diff: 3, affix: 2 },
    { id: 'artRuyi', name: '玉如意', realm: 2, cost: { stone: 12, ling: 2 }, work: 380, diff: 4, affix: 2 },
    { id: 'artMirror', name: '护心宝镜', realm: 2, cost: { stone: 10, wood: 8, ling: 2 }, work: 360, diff: 4, affix: 2 },
    { id: 'artPearl', name: '聚灵珠', realm: 3, cost: { ling: 4, stone: 10 }, work: 460, diff: 6, affix: 3 },
    { id: 'artWhisk', name: '云纹拂尘', realm: 3, cost: { wood: 16, ling: 3 }, work: 440, diff: 5, affix: 2 },
    { id: 'artBell', name: '震岳钟', realm: 4, cost: { stone: 30, ling: 8 }, work: 640, diff: 8, affix: 3 },
  ];
  R.AFFIX_POOL = [
    { k: 'atk', n: '锋锐', desc: '斗法威能 +15%' },
    { k: 'def', n: '厚重', desc: '受创 -12%' },
    { k: 'cult', n: '凝气', desc: '修炼 +8%' },
    { k: 'brk', n: '破障', desc: '破境 +6%' },
    { k: 'mood', n: '宁神', desc: '心境 +8%' },
    { k: 'hp', n: '生机', desc: '气血上限 +15' },
    { k: 'gather', n: '巧手', desc: '采集 +10%' },
  ];

  // ---- 符道（8 符）----
  R.fu = [
    { id: 'fuHu', name: '护身符', realm: 1, cost: { wood: 2 }, work: 120, diff: 2, out: [1, 2], desc: '危时自燃护体（气血 +50）', use: { hpShield: 50 } },
    { id: 'fuQing', name: '清心符', realm: 1, cost: { wood: 2 }, work: 110, diff: 1, out: [1, 2], desc: '心境 +20', use: { mood: 20 } },
    { id: 'fuBiGu', name: '辟谷符', realm: 1, cost: { wood: 3 }, work: 130, diff: 2, out: [1, 2], desc: '饥饿全满', use: { hunger: 100 } },
    { id: 'fuXiu', name: '修行符', realm: 2, cost: { wood: 3, ling: 1 }, work: 160, diff: 3, out: [1, 1], desc: '修炼 +30%（三日）', use: { buffCult: [0.3, 3] } },
    { id: 'fuPo', name: '破障符', realm: 2, cost: { wood: 3, ling: 1 }, work: 170, diff: 3, out: [1, 1], desc: '破境成功率 +20%（冲关自燃）', use: { brk: 0.20 } },
    { id: 'fuAn', name: '安神符', realm: 1, cost: { wood: 2 }, work: 110, diff: 1, out: [1, 2], desc: '睡眠全满', use: { sleep: 100 } },
    { id: 'fuChen', name: '避尘符', realm: 2, cost: { wood: 2, herb: 1 }, work: 140, diff: 2, out: [1, 2], desc: '舒适美观回升', use: { comfort: 40, beauty: 40 } },
    { id: 'fuLing', name: '引灵符', realm: 3, cost: { wood: 4, ling: 2 }, work: 200, diff: 5, out: [1, 1], desc: '修为 +600', use: { exp: 600 } },
  ];

  // ---- 阵道（6 阵激活 + 2 预留）----
  R.zhen = [
    { id: 'juling', name: '聚灵阵', flags: 3, radius: 8, effect: { qi: 3 }, desc: '范围内灵韵 +3（修炼/灵植受益）' },
    { id: 'wenyang', name: '温养阵', flags: 3, radius: 8, effect: { grow: 1.5 }, desc: '范围内灵植/药圃生长 ×1.5' },
    { id: 'houTu', name: '厚土阵', flags: 2, radius: 8, effect: { yield: 1.3 }, desc: '范围内灵田收成 ×1.3' },
    { id: 'qingxin', name: '清心阵', flags: 2, radius: 9, effect: { moodRegen: 1 }, desc: '范围内弟子心境渐复' },
    { id: 'yinqi', name: '引气阵', flags: 3, radius: 8, effect: { cult: 0.15 }, desc: '范围内打坐修炼 +15%' },
    { id: 'cangfeng', name: '藏风阵', flags: 3, radius: 9, effect: { fengUp: 1 }, desc: '范围内房间风水升一档' },
    { id: 'yudi', name: '御敌阵', flags: 4, radius: 12, effect: {}, desc: '御敌护山：守御加成' },
    { id: 'hushan', name: '护山大阵', flags: 6, radius: 20, effect: {}, desc: '门派屏障：渡劫免伤一击' },
  ];

  // ---- 五大天地灵植（每图限一株）----
  R.splant = [
    { id: 'spJin', name: '铃音果树', el: 0, seed: 'seedJin', days: 90, auraQi: 3, desc: '金属·成株灵韵+3，元婴之引' },
    { id: 'spMu', name: '垂云藤', el: 1, seed: 'seedMu', days: 90, auraQi: 3, desc: '木属·成株灵韵+3' },
    { id: 'spShui', name: '五色莲', el: 2, seed: 'seedShui', days: 90, auraQi: 3, desc: '水属·成株灵韵+3' },
    { id: 'spHuo', name: '赤焰果树', el: 3, seed: 'seedHuo', days: 90, auraQi: 3, desc: '火属·成株灵韵+3' },
    { id: 'spTu', name: '赭岩参', el: 4, seed: 'seedTu', days: 90, auraQi: 3, desc: '土属·成株灵韵+3' },
  ];
  // 蕴养反应：30% 催生(+6日)、20% 反哺、50% 无事
  R.FEED_ITEMS = [
    { item: 'wood', n: 2, label: '木料×2' },
    { item: 'stone', n: 2, label: '石料×2' },
    { item: 'grain', n: 4, label: '灵谷×4' },
    { item: 'meal', n: 1, label: '灵食×1' },
    { item: 'herb', n: 2, label: '灵草×2' },
  ];
  R.byId = {};
  for (const k of ['dan', 'qi', 'fu']) for (const r of R[k]) R.byId[r.id] = r;
  // 丹/符产物注册为可堆叠物品（器走法宝实例）
  for (const r of [...R.dan, ...R.fu]) {
    X.Items[r.id] = { name: r.name, glyph: r.name[0], recipe: r.id };
  }
})(globalThis.XIANG);

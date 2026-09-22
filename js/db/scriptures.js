/* 36 部道典：五行×品阶 + 无属性符经。
   starter 6 部开局可选；其余 30 部待游历(P4)解锁。
   spells: 4 个神通（按 realms.SPELL_AT 节点解锁），eff 为百分比增益键：
   cult 修炼 / brk 破境 / mood 心境回复 / work 劳作 / gat 采集 / cook 炊事 / hp 气血 */
(function (X) {
  const E = ['金', '木', '水', '火', '土'];
  // ---- 开局六典 ----
  const STARTER = [
    { id: 'ruijin', name: '锐金诀', el: 0, tier: 7, desc: '锋锐凝练，攻伐之意',
      spells: [
        { n: '金锋', eff: { cult: 0.06, gat: 0.08 } },
        { n: '凝锋', eff: { brk: 0.06 } },
        { n: '庚金体', eff: { hp: 0.10 } },
        { n: '剑心通明', eff: { cult: 0.10, mood: 0.08 } },
      ] },
    { id: 'qingmu', name: '青木长生功', el: 1, tier: 6, desc: '生生不息，滋养气血',
      spells: [
        { n: '木荣', eff: { cult: 0.06, hp: 0.06 } },
        { n: '回春', eff: { hp: 0.10 } },
        { n: '深根', eff: { brk: 0.06, mood: 0.06 } },
        { n: '长春', eff: { cult: 0.08, mood: 0.10 } },
      ] },
    { id: 'yunshui', name: '云水诀', el: 2, tier: 6, desc: '柔水绵长，润物无声',
      spells: [
        { n: '水润', eff: { cult: 0.07 } },
        { n: '止水', eff: { mood: 0.10 } },
        { n: '川流', eff: { cult: 0.07, brk: 0.05 } },
        { n: '上善', eff: { cult: 0.10, mood: 0.08 } },
      ] },
    { id: 'fenshan', name: '焚山箓', el: 3, tier: 7, desc: '烈火淬体，破障焚邪',
      spells: [
        { n: '火种', eff: { cult: 0.06, cook: 0.10 } },
        { n: '淬体', eff: { hp: 0.08 } },
        { n: '烈焰', eff: { cult: 0.09 } },
        { n: '焚尽', eff: { cult: 0.10, brk: 0.06 } },
      ] },
    { id: 'houtu', name: '厚土经', el: 4, tier: 6, desc: '厚重载物，稳如磐石',
      spells: [
        { n: '土行', eff: { cult: 0.06, work: 0.08 } },
        { n: '磐石', eff: { brk: 0.08 } },
        { n: '厚载', eff: { cult: 0.08, work: 0.06 } },
        { n: '不动', eff: { brk: 0.10, hp: 0.06 } },
      ] },
    { id: 'taiyan', name: '太衍符经', el: -1, tier: 5, desc: '无属性符修，不惧生克',
      spells: [
        { n: '符感', eff: { cult: 0.05, brk: 0.04 } },
        { n: '画符', eff: { cook: 0.06, work: 0.06 } },
        { n: '通符', eff: { cult: 0.08, brk: 0.05 } },
        { n: '万符朝宗', eff: { cult: 0.10, brk: 0.08 } },
      ] },
  ];
  // ---- 游历典 30 部（数据占位，P4 开放获取） ----
  const NAMES = {
    0: ['裂空剑典', '庚金杀道', '斩星录'],
    1: ['枯木逢春录', '万藤心经', '青帝残卷'],
    2: ['寒潭映月功', '弱水真解', '沧浪引'],
    3: ['离火燎原经', '赤帝心灯', '烈阳真解'],
    4: ['撼岳功', '黄庭中卷', '大地之契'],
  };
  const EXTRA = [];
  let uid = 0;
  for (const el of [0, 1, 2, 3, 4]) {
    for (let k = 0; k < 3; k++) {
      for (const tier of [8, 4, 2]) {   // 每行三部名 × 三品 → 每行 9 部? 名字循环用
        EXTRA.push({
          id: 'sc' + (++uid),
          name: NAMES[el][k % 3],
          el, tier, locked: true, desc: '游历所得残卷',
          spells: [
            { n: '初悟', eff: { cult: 0.05 + (10 - tier) * 0.01 } },
            { n: '小成', eff: { brk: 0.04 + (10 - tier) * 0.008 } },
            { n: '贯通', eff: { cult: 0.07 + (10 - tier) * 0.012 } },
            { n: '大成', eff: { cult: 0.09 + (10 - tier) * 0.015, mood: 0.08 } },
          ],
        });
      }
    }
  }
  // 名字去重加缀
  const seen = {};
  for (const s of EXTRA) {
    if (seen[s.name]) s.name += '·' + E[s.el];
    seen[s.name] = 1;
  }
  const ALL = STARTER.concat(EXTRA);
  X.Scriptures = {
    list: ALL,
    starter: STARTER,
    byId: {},
  };
  for (const s of ALL) X.Scriptures.byId[s.id] = s;
})(globalThis.XIANG);

/* 六派人物名录：掌门/长老/圣使 各一 → 18 位具名 NPC（缘分/恩怨/客卿的对象）。
   realm 为其境界序号；客卿增益 guest.buff 作用于全门。 */
(function (X) {
  const SECTS = [
    { id: 'qingyun', npcs: [['岳凌虚', 4, '剑修魁首，一剑破万法'], ['白芷', 2, '守阁长老，博闻强识'], ['裴星回', 3, '首席大弟子，锋芒毕露']] },
    { id: 'luoxia', npcs: [['丹尘子', 4, '丹道宗师，癖好灵乳'], ['苏半夏', 2, '药园管事，识遍百草'], ['陆云炙', 3, '护谷剑修，嫉恶如仇']] },
    { id: 'xuanshui', npcs: [['洛神妃', 4, '宫主，御水如御指'], ['寒潭叟', 3, '闭关老怪，不喜生人'], ['阿沅', 2, '巡海弟子，心善话少']] },
    { id: 'chiyang', npcs: [['赤炎君', 4, '宗主，脾气火爆记仇'], ['焦尾', 3, '炼火长老，收徒极严'], ['小火', 1, '杂役童子，人小鬼大']] },
    { id: 'houtu', npcs: [['石敢当', 4, '门主，双锤镇山'], ['丁卯', 3, '铸器大师，见宝眼开'], ['陶三姐', 2, '坊市管事，精于算计']] },
    { id: 'taixu', npcs: [['太虚子', 5, '道主，百年一现'], ['云梦', 3, '云游圣使，踪迹不定'], ['守一', 2, '扫地僧，深藏不露']] },
  ];
  // 客卿驻山增益：随门派定位
  const GUEST_BUFF = {
    qingyun: { key: 'atk', n: 0.10, label: '剑意加身：斗法 +10%' },
    luoxia: { key: 'dan', n: 0.10, label: '丹道真传：炼丹成率 +10%' },
    xuanshui: { key: 'cult', n: 0.08, label: '寒泉心法：修炼 +8%' },
    chiyang: { key: 'brk', n: 0.06, label: '赤阳淬体：破境 +6%' },
    houtu: { key: 'qi', n: 0.10, label: '铸魂心诀：锻器成率 +10%' },
    taixu: { key: 'mood', n: 0.10, label: '太虚静意：心境回复 +10%' },
  };
  const ALL = [];
  let uid = 0;
  for (const s of SECTS) {
    for (const [name, realm, desc] of s.npcs) {
      ALL.push({ id: 'npc' + (++uid), sect: s.id, name, realm, desc, buff: GUEST_BUFF[s.id] });
    }
  }
  X.Npcs = { list: ALL, byId: {}, SECT_NAMES: { qingyun: '青云观', luoxia: '落霞谷', xuanshui: '玄水宫', chiyang: '赤阳宗', houtu: '厚土门', taixu: '太虚道' } };
  for (const n of ALL) X.Npcs.byId[n.id] = n;
})(globalThis.XIANG);

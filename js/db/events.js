/* 游历事件池（151 则）：参数化族生成，保证池量与多样性。
   事件结构：{id, name, text, where(匹配地点 tags), w(权重), opts:[{label, check:{stat,diff}|null, ok, fail}]}
   效果词汇：items/ling/rep/hp/exp/mood/affinity{sect,n}/grudge{sect,n}/sc(得典)/fight{tier}/skill/npc(可遇人物) */
(function (X) {
  const E = [];
  let uid = 0;
  const add = (name, text, where, w, opts) => E.push({ id: 'ev' + (++uid), name, text, where, w, opts });

  /* —— 遇袭（8） —— */
  const BEASTS = ['赤目狼', '铁背蛟', '噬魂雕', '裂地豕', '碧鳞蟒', '火鬃罴', '玄冰貉', '食气狖'];
  BEASTS.forEach((b, i) => add(
    `遇袭·${b}`, `山道转角撞见${b}，獠牙泛着寒光。`,
    ['wild', 'realm'], 10,
    [
      { label: '结阵迎敌', check: { stat: 'wu', diff: 45 + i * 5 }, ok: { fight: { tier: 1 + (i % 3) }, rep: 3 }, fail: { fight: { tier: 1 + (i % 3) }, hp: -25 } },
      { label: '绕道避让', ok: { days: 1, mood: -2 }, fail: null },
    ]
  ));

  /* —— 灵草奇遇（8） —— */
  const HERBS = ['九节菖蒲', '紫玉参', '雪魄兰', '赤箭芝', '云雾苓', '碧蚕衣', '黄精露', '金线断肠'];
  HERBS.forEach((h, i) => add(
    `灵草·${h}`, `岩缝间一株${h}灵光湛湛，采与不采？`,
    ['realm', 'herb', 'wild'], 9,
    [
      { label: '小心采撷', check: { stat: 'mei', diff: 40 + i * 4 }, ok: { items: i % 2 ? { herb: 4 } : { lingzhi: 2 }, exp: 6 }, fail: { items: { herb: 1 }, hp: -8, mood: -2 } },
      { label: '守株待灵', ok: { exp: 3, mood: 2 }, fail: null },
    ]
  ));

  /* —— 悟道（8） —— */
  const DAO = ['古碑残偈', '流云剑意', '溪水禅音', '落花易数', '残垣卦象', '孤峰观日', '石窟壁刻', '雪夜枯坐'];
  DAO.forEach((s, i) => add(
    `悟道·${s}`, `途中得见${s}，似有所感。`,
    ['sect', 'realm', 'wild', 'city'], 8,
    [
      { label: '静心参悟', check: { stat: 'shen', diff: 38 + i * 5 }, ok: { exp: 24 + i * 4, mood: 6 }, fail: { exp: 6, mood: -3 } },
      { label: '抄录留证', ok: { items: { herb: 1 }, exp: 4 }, fail: null },
    ]
  ));

  /* —— 商旅（8） —— */
  const TRADE = ['护送商队', '代购灵谷', '摆摊售货', '商队相邀', '灵石兑换', '代传书信', '镖行急单', '货栈盘点'];
  TRADE.forEach((s, i) => add(
    `商旅·${s}`, `${s}的买卖找上门来。`,
    ['city', 'trade'], 11,
    [
      { label: '应下这单', check: { stat: i % 2 ? 'mei' : 'li', diff: 36 + i * 5 }, ok: { ling: 12 + i * 4, rep: 2 }, fail: { ling: -5, mood: -3 } },
      { label: '婉言谢绝', ok: { mood: 1 }, fail: null },
    ]
  ));

  /* —— 门派拜访（6） —— */
  const SECT_IDS = ['qingyun', 'luoxia', 'xuanshui', 'chiyang', 'houtu', 'taixu'];
  SECT_IDS.forEach((s) => add(
    `拜访·${X.Npcs.SECT_NAMES[s]}`, `途经${X.Npcs.SECT_NAMES[s]}山门，递帖拜访。`,
    ['sect'], 12,
    [
      { label: '以礼相交', check: { stat: 'mei', diff: 40 }, ok: { affinity: { sect: s, n: 12 }, ling: -6, rep: 2, npc: true }, fail: { affinity: { sect: s, n: 4 }, ling: -6 } },
      { label: '求观藏经', check: { stat: 'shen', diff: 52 }, ok: { affinity: { sect: s, n: 8 }, sc: true, exp: 10 }, fail: { affinity: { sect: s, n: -2 } } },
    ]
  ));

  /* —— 门派切磋（6） —— */
  SECT_IDS.forEach((s) => add(
    `切磋·${X.Npcs.SECT_NAMES[s]}`, `${X.Npcs.SECT_NAMES[s]}弟子邀你论剑。`,
    ['sect'], 9,
    [
      { label: '欣然应战', check: { stat: 'wu', diff: 50 }, ok: { rep: 6, exp: 12, affinity: { sect: s, n: 6 } }, fail: { hp: -18, exp: 6, mood: -2 } },
      { label: '推说赶路', ok: { mood: 1 }, fail: null },
    ]
  ));

  /* —— 冲突结怨（6） —— */
  SECT_IDS.forEach((s) => add(
    `冲突·${X.Npcs.SECT_NAMES[s]}械斗`, `荒道上撞见${X.Npcs.SECT_NAMES[s]}弟子强抢散修灵材。`,
    ['sect', 'city', 'wild'], 6,
    [
      { label: '出手制止', check: { stat: 'wu', diff: 55 }, ok: { rep: 8, affinity: { sect: s, n: -18 }, mood: 4 }, fail: { hp: -30, grudge: { sect: s, n: 25 } } },
      { label: '袖手旁观', ok: { mood: -5, rep: -2 }, fail: null },
    ]
  ));

  /* —— 秘境遗蜕（8） —— */
  const RELIC = ['坐化修士', '断剑残躯', '丹炉冷灰', '储物破袋', '阵图残页', '蒲团枯骨', '玉简散落', '兽骨山堆'];
  RELIC.forEach((r, i) => add(
    `遗蜕·${r}`, `秘境深处发现${r}遗存。`,
    ['realm', 'relic'], 10,
    [
      { label: '仔细搜寻', check: { stat: 'shen', diff: 42 + i * 4 }, ok: { items: { ['yaodan' + (1 + i % 3)]: 1 + (i % 2) }, ling: 8 + i * 3, exp: 5 }, fail: { hp: -10, items: { herb: 1 } } },
      { label: '拜而远之', ok: { mood: 3, exp: 2 }, fail: null },
    ]
  ));

  /* —— 天灾（6） —— */
  const DIS = ['黑风骤起', '山洪断路', '瘴雾锁谷', '雷暴之夜', '流沙陷道', '寒潮突至'];
  DIS.forEach((s, i) => add(
    `天灾·${s}`, `${s}，去路凶险。`,
    ['wild', 'realm', 'city', 'sect'], 7,
    [
      { label: '冒进赶路', check: { stat: 'gu', diff: 44 + i * 6 }, ok: { days: -1, exp: 6 }, fail: { hp: -20, days: 2, items: { grain: -3 } } },
      { label: '扎营以待', ok: { days: 2, mood: -2 }, fail: null },
    ]
  ));

  /* —— 灵泉异果（6） —— */
  const SPRING = ['灵泉洗髓', '百年朱果', '玉髓石乳', '梦蝶花海', '暖玉温泉', '月华凝露'];
  SPRING.forEach((s, i) => add(
    `奇物·${s}`, `寻得${s}，机缘当前。`,
    ['realm', 'herb', 'wild', 'mist', 'water'], 8,
    [
      { label: '尽情受用', ok: { exp: 14 + i * 3, hp: 25, mood: 8 }, fail: null },
      { label: '装瓶带走', check: { stat: 'li', diff: 45 }, ok: { items: { lingzhi: 2 }, mood: 3 }, fail: { mood: -2 } },
    ]
  ));

  /* —— 传艺奇人（6） —— */
  const MASTERS = ['疯癫剑客', '哑巴铁匠', '盲眼画符叟', '负薪樵夫', '摆渡老妪', '说书先生'];
  MASTERS.forEach((m, i) => add(
    `奇人·${m}`, `路遇${m}，看似身怀绝艺。`,
    ['city', 'sect', 'wild', 'realm'], 7,
    [
      { label: '虚心求教', check: { stat: 'qi', diff: 40 + i * 6 }, ok: { skill: { [['dan', 'qi', 'fu'][i % 3]]: 0.8 }, exp: 8 }, fail: { exp: 3, mood: -1 } },
      { label: '以物易艺', ok: { ling: -10, skill: { dan: 0.5, qi: 0.5, fu: 0.5 }, exp: 6 }, fail: { ling: -10, mood: -3 } },
    ]
  ));

  /* —— 妖市黑店（4） —— */
  ['无名鬼市', '黑雾当铺', '夜半拍卖', '蛇姬酒肆'].forEach((s, i) => add(
    `黑市·${s}`, `${s}里灯火幽幽，货主非人。`,
    ['city', 'black'], 8,
    [
      { label: '大胆淘货', check: { stat: 'shen', diff: 48 }, ok: { items: { ['yaodan' + (2 + i % 2)]: 1 }, ling: -12 }, fail: { ling: -15, hp: -12, mood: -4 } },
      { label: '扭头就走', ok: { mood: 1 }, fail: null },
    ]
  ));

  /* —— 江湖恩义（6） —— */
  const KIND = ['坠崖修士', '中毒散修', '被逐弟子', '迷路孩童', '重伤妖商', '落难医者'];
  KIND.forEach((s, i) => add(
    `恩义·救${s}`, `${s}命悬一线，救与不救？`,
    ['city', 'wild', 'realm', 'sect'], 8,
    [
      { label: '出手相救', check: { stat: 'shen', diff: 40 }, ok: { rep: 6, affinity: { sect: SECT_IDS[i % 6], n: 8 }, items: { herb: -1 }, mood: 5 }, fail: { rep: 2, hp: -10, mood: 2 } },
      { label: '赠药自去', ok: { rep: 2, items: { herb: -1 }, mood: 1 }, fail: null },
    ]
  ));

  /* —— 寻宝图（5） —— */
  ['半张藏宝图', '古钱为引', '碑下之秘', '鱼腹绢书', '梦中指点'].forEach((s, i) => add(
    `寻宝·${s}`, `得到${s}，所指之处似有灵气波动。`,
    ['realm', 'wild', 'relic'], 7,
    [
      { label: '循迹掘取', check: { stat: 'gu', diff: 46 + i * 5 }, ok: { items: { ['yaodan' + (1 + i % 3)]: 2 }, ling: 15 + i * 5, rep: 3 }, fail: { hp: -12, days: 1 } },
      { label: '售于坊市', ok: { ling: 18 }, fail: null },
    ]
  ));

  /* —— 灵兽幼崽（4） —— */
  ['青羽雏鹰', '白泽幼兽', '墨鳞小蛟', '火狐崽子'].forEach((s, i) => add(
    `灵兽·${s}`, `一只${s}被困猎户陷阱，呜呜哀鸣。`,
    ['wild', 'realm', 'herb'], 6,
    [
      { label: '解而放之', ok: { rep: 4, mood: 6, exp: 5 }, fail: null },
      { label: '带回山门', check: { stat: 'mei', diff: 50 }, ok: { rep: 6, mood: 10, affinity: { sect: SECT_IDS[i], n: 5 } }, fail: { hp: -14, mood: -4 } },
    ]
  ));

  /* —— 斗法擂台（6） —— */
  const ARENA = ['坊市擂台', '万宝楼约战', '渡口比剑', '雪山论道', '鬼市暗斗', '荒原决斗'];
  ARENA.forEach((s, i) => add(
    `擂台·${s}`, `${s}设局，胜者得名得利。`,
    ['city', 'trade', 'wild'], 8,
    [
      { label: '登台一战', check: { stat: 'wu', diff: 48 + i * 6 }, ok: { rep: 8, ling: 10 + i * 6, exp: 10 }, fail: { hp: -22, mood: -3, rep: -1 } },
      { label: '场边观摩', ok: { exp: 5 }, fail: null },
    ]
  ));

  /* —— 上古遗迹（5） —— */
  ['坍圮神殿', '沉没祭坛', '封印石门', '古修洞府', '陨落战场'].forEach((s, i) => add(
    `上古·${s}`, `荒域深处现${s}，灵压森然。`,
    ['wild', 'relic'], 6,
    [
      { label: '破禁而入', check: { stat: 'shen', diff: 56 + i * 5 }, ok: { items: i === 2 ? { guDan: 1 } : { yaodan4: 1, yaodan3: 1 }, sc: true, rep: 6, hp: -15 }, fail: { hp: -35, mood: -5, exp: 8 } },
      { label: '外围拾遗', ok: { items: { yaodan2: 1 }, ling: 10 }, fail: null },
    ]
  ));

  /* —— 妖王猎踪（3） —— */
  ['北冥鲸吟', '山君巡疆', '泽底巨影'].forEach((s, i) => add(
    `猎踪·${s}`, `${s}隐隐可闻，妖王气息迫近。`,
    ['wild', 'beast'], 5,
    [
      { label: '舍命搏杀', check: { stat: 'wu', diff: 66 }, ok: { fight: { tier: 4 }, rep: 12 }, fail: { fight: { tier: 4 }, hp: -40 } },
      { label: '记下方位', ok: { rep: 3, exp: 4 }, fail: null },
    ]
  ));

  /* —— 雾/水/火/剑/药/矿 专列（各3，共18） —— */
  const TAGGED = [
    ['mist', '雾中迷城', '雾里楼阁时隐时现', { ok: { items: { lingzhi: 2 }, exp: 8, mood: 4 }, fail: { hp: -10, days: 1 } }, 'shen'],
    ['water', '水府夜宴', '水底传来笙歌', { ok: { items: { yaodan2: 1 }, affinity: { sect: 'xuanshui', n: 8 } }, fail: { hp: -12 } }, 'mei'],
    ['fire', '火中取栗', '地火裂隙里灵光闪烁', { ok: { items: { yaodan3: 1, stone: 6 }, hp: -10 }, fail: { hp: -25 } }, 'gu'],
    ['sword', '剑冢剑鸣', '万剑齐鸣如诉', { ok: { exp: 20, skill: { qi: 0.6 } }, fail: { exp: 5 } }, 'wu'],
    ['herb', '药圃窃贼', '月黑风高有人偷药', { ok: { rep: 4, items: { herb: 3 } }, fail: { items: { herb: -2 } } }, 'li'],
    ['ore', '矿脉露头', '山壁裸露出灵矿', { ok: { items: { stone: 12, yaodan2: 1 } }, fail: { hp: -8 } }, 'gu'],
  ];
  for (const [tag, name, text, eff, stat] of TAGGED) {
    for (let k = 0; k < 4; k++) add(
      `${name}·${['壹', '贰', '叁', '肆'][k]}式`, `${text}（${['机缘深远', '平平无奇', '险中求胜', '大凶大吉'][k]}）`,
      [tag], 7 - k,
      [
        { label: '深入探究', check: { stat, diff: 38 + k * 7 }, ok: k === 0 ? { ...eff.ok, rep: 2 } : eff.ok, fail: eff.fail },
        { label: '浅尝辄止', ok: { exp: 3 }, fail: null },
      ]
    );
  }

  /* —— 流民/故人/馈赠（各3+3+6，共12） —— */
  ['流民拦路', '荒村托孤', '驿卒求信'].forEach(s => add(    `尘世·${s}`, `${s}，凡人苦楚当前。`,
    ['city', 'trade'], 6,
    [
      { label: '援手相助', ok: { rep: 5, items: { grain: -4 }, mood: 4 }, fail: null },
      { label: '修士不理凡尘', ok: { mood: -3 }, fail: null },
    ]
  ));
  ['故友重逢', '同门旧识', '故人之托'].forEach(s => add(
    `故人·${s}`, `${s}，把酒话江湖。`,
    ['city', 'sect'], 7,
    [
      { label: '结伴同行', ok: { npc: true, mood: 5, affinity: { sect: 'qingyun', n: 5 } }, fail: null },
      { label: '擦肩而过', ok: { mood: 1 }, fail: null },
    ]
  ));
  SECT_IDS.forEach(s => add(
    `馈赠·${X.Npcs.SECT_NAMES[s]}`, `${X.Npcs.SECT_NAMES[s]}闻你斩妖除害之名，遣人赠礼。`,
    ['sect', 'city'], 5,
    [
      { label: '欣然受之', ok: { items: { ['yaodan' + (1 + uid % 2)]: 1 }, ling: 15, affinity: { sect: s, n: 6 }, rep: 2 }, fail: null },
      { label: '回赠灵材', ok: { items: { herb: -2 }, affinity: { sect: s, n: 12 }, rep: 4 }, fail: null },
    ]
  ));

  /* —— 归途与夜话（5） —— */
  ['归途·故道残碑', '归途·风雪夜归', '归途·轻舟顺流'].forEach((s, i) => add(
    s.split('·')[1] ? s : s, `归程过半，${['残碑指路省了两日', '风雪迟滞行程', '顺水行舟一日千里'][i]}。`,
    ['city', 'sect', 'realm', 'wild'], 7,
    [
      { label: i === 1 ? '冒雪兼程' : '顺势而行', check: { stat: 'gu', diff: 42 }, ok: { days: i === 1 ? -1 : 1, exp: 5, mood: 2 }, fail: { days: 1, hp: -6, mood: -2 } },
      { label: '安步当车', ok: { exp: 3 }, fail: null },
    ]
  ));
  ['夜话·篝火论道', '夜话·古寺听经'].forEach((s, i) => add(
    s, `${['同宿修士篝火旁畅谈道法', '破庙老僧夜半讲经'][i]}，令人顿开茅塞。`,
    ['wild', 'city', 'sect', 'realm'], 7,
    [
      { label: '彻夜长谈', check: { stat: 'shen', diff: 44 }, ok: { exp: 16, mood: 5, npc: i === 0 }, fail: { exp: 4, mood: -2 } },
      { label: '早些歇息', ok: { hp: 10 }, fail: null },
    ]
  ));

  X.Events = {
    list: E,
    byId: {},
    /* 按地点抽事件：tags 匹配 + 季节加权（秋吉事 ×1.5） */
    roll(loc) {
      const autumn = X.Time.season === 2 ? 1.5 : 1;
      let sum = 0;
      const pool = [];
      for (const e of E) {
        if (!e.where.some(t => loc.tags.indexOf(t) >= 0)) continue;
        const w = e.w * (autumn);
        pool.push([e, w]); sum += w;
      }
      if (!pool.length) return null;
      let r = X.rng.f(0, sum);
      for (const [e, w] of pool) { if ((r -= w) <= 0) return e; }
      return pool[pool.length - 1][0];
    },
    /* 队伍最优属性过检定 */
    check(party, ck) {
      let best = 0;
      for (const d of party) best = Math.max(best, d.stats[ck.stat] || 0);
      return best + X.rng.i(-8, 8) >= ck.diff;
    },
  };
  for (const e of E) X.Events.byId[e.id] = e;
})(globalThis.XIANG);

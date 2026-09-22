/* 旧案主线「灰烬遗音」：五章 24 节点。
   云隐观前身「听雨观」一夜覆灭之谜，随门派成长逐层揭开，终章抉择导向三结局。
   cond(G,X) 逐日评估（章内顺序解锁）；opts 为空则自动播报；有效果的节点在 story.js 应用。 */
(function (X) {
  const rep = () => X.Game.rep();
  const hasRealm = r => X.Disciple.list.some(d => d.realm >= r);
  const wave = () => X.Combat.wave;

  const NODES = [
    /* —— 卷一 · 灰烬（立足期） —— */
    { id: 's11', ch: 1, name: '焦土残碑', text: '弟子平整地基时挖出半块焦黑残碑，刻着「听雨」二字——山志里没有这座观。', cond: () => X.Time.day >= 6, eff: { flag: 's11' } },
    { id: 's12', ch: 1, name: '老猎户的旧话', text: '山下老猎户说：五十年前此山雷火一夜，观中百余口无一生还，官府封山至今。', cond: () => X.Time.day >= 15, eff: { rep: 2 } },
    { id: 's13', ch: 1, name: '废墟地窖', text: '在残碑正下方掘出一处地窖，尸骨早已化尘，只余一枚熔毁的护山阵旗。', cond: (f) => f.s11 && X.Time.day >= 24, eff: { flag: 's13' } },
    { id: 's14', ch: 1, name: '观星台夜话', text: '夜观星象，此山灵脉有一处旧伤——像是被人硬生生「抽走」过一缕地髓。', cond: (f) => f.s13 && X.Build.builtOf('observatory').length > 0, eff: { flag: 's14' } },
    { id: 's15', ch: 1, name: '卷一终 · 灰烬遗音', text: '拼合线索：听雨观灭门那夜并无天雷——火是「人」放的。卷一终。', cond: (f) => f.s14 && X.Time.day >= 40, eff: { flag: 'ch1', story: 1 } },

    /* —— 卷二 · 迷雾（游历期） —— */
    { id: 's21', ch: 2, name: '坊市旧闻', text: '游历弟子带回一本水渍斑斑的《九州异闻录》，其中一页折角：听雨观主持玄真子，擅阵法，人称「阵痴」。', cond: (f) => f.ch1 && X.Travel.log.length >= 3 },
    { id: 's22', ch: 2, name: '阵痴的债', text: '雁回集说书人讲古：阵痴玄真子成名前，曾向厚土门借过一部阵书，至今未还。', cond: (f) => f.s21 && X.Relation.sects.houtu.met && Object.keys(X.Relation.sects.houtu.met).length > 0 },
    { id: 's23', ch: 2, name: '阵书残页', text: '厚土门客卿醉后吐真：那部阵书最后一页画着「引雷借地髓」的禁阵，玄真子借书根本不为还。', cond: (f) => f.s22 && X.Relation.sects.houtu.guest },
    { id: 's24', ch: 2, name: '丹房的密格', text: '整理藏经阁时发现密格一封：玄真子手书「……彼所要者非我命，乃此山龙脉。吾若不从，满门俱焚。』', cond: (f) => f.s23 && X.Game.libBuilt },
    { id: 's25', ch: 2, name: '卷二终 · 迷雾渐开', text: '真相轮廓浮现：当年有人逼玄真子布「引雷抽髓」之阵，不从则灭门。听雨观选了……两者都发生。卷二终。', cond: (f) => f.s24, eff: { flag: 'ch2', story: 2 } },

    /* —— 卷三 · 追凶（妖潮中期） —— */
    { id: 's31', ch: 3, name: '妖潮里的眼熟', text: '妖潮中一头妖王的行动路数竟隐含阵意——妖兽身后有人驱使。', cond: (f) => f.ch2 && wave() >= 3 },
    { id: 's32', ch: 3, name: '驱妖的痕迹', text: '斩杀的妖兽尸身上发现烙印般的阵纹，与熔毁护山阵旗上的纹路同源。', cond: (f) => f.s31 && X.Combat.killed >= 8 },
    { id: 's33', ch: 3, name: '玄水宫的卷宗', text: '玄水宫藏卷记载：五十年前有人大量收购「驯妖阵盘」，买主署名——青岚散人。', cond: (f) => f.s32 && X.Relation.sects.xuanshui.aff >= 30 },
    { id: 's34', ch: 3, name: '青岚散人', text: '查访得知：青岚散人曾是听雨观供奉长老，灭门案后失踪，无人知其所终。', cond: (f) => f.s33, eff: { flag: 's34' } },
    { id: 's35', ch: 3, name: '卷三终 · 内鬼', text: '原来灭门惨案的引路人就在观内。青岚散人——供奉长老——是他开的山门。卷三终。', cond: (f) => f.s34 && X.Time.day >= 200, eff: { flag: 'ch3', story: 3 } },

    /* —— 卷四 · 对峙（大宗期） —— */
    { id: 's41', ch: 4, name: '荒域的呼救', text: '北冥冰原游历队伍带回讯息：有隐修称见过一位「布阵老者」常年采集地髓，逆推其行止，正指向大漠深处。', cond: (f) => f.ch3 && X.Travel.log.some(r => r.dest === '北冥冰原' || r.dest === '大漠孤烟') },
    { id: 's42', ch: 4, name: '上古内丹的用途', text: '参详拍卖会流出的上古内丹：以此为引布「引雷抽髓」阵，可抽一山龙脉炼私丹——五十年前如此，今日仍如此。', cond: (f) => f.s41 && X.Inv.count('guDan') >= 1 },
    { id: 's43', ch: 4, name: '妖潮的节律', text: '对照历年妖潮：每逢我观灵韵高涨，妖潮必至——青岚散人一直在借妖潮之口，探我山龙脉复苏之深浅！', cond: (f) => f.s42 && wave() >= 6 },
    { id: 's44', ch: 4, name: '设伏', text: '将计就计：故意放出「飞升大典」消息，静候故人自投罗网。', cond: (f) => f.s43 && hasRealm(8), opts: [{ label: '设伏擒拿', eff: { flag: 'ambush' } }, { label: '遣使通牒', eff: { flag: 'envoy', rep: 5 } }] },
    { id: 's45', ch: 4, name: '卷四终 · 真相', text: '青岚散人到案（伏诛或自陈），供出幕后：其抽髓炼丹皆是为一 位「将陨大能」续命——而那位大能，正在九霄之上等一场雷。卷四终。', cond: (f) => (f.ambush || f.envoy), eff: { flag: 'ch4', story: 4 } },

    /* —— 卷五 · 终章（天劫期） —— */
    { id: 's51', ch: 5, name: '雷在等谁', text: '藏经阁推演：所谓九重天劫，本是天道巡山——那位大能欲借我观渡劫弟子之雷，遮天换日续命千年。', cond: (f) => f.ch4 && X.Trib && X.Trib.total >= 1 },
    { id: 's52', ch: 5, name: '两难', text: '不渡劫：门派灵韵终将被慢慢抽干；渡劫：或成那人的嫁衣。玄真子当年面对的是同一道题。', cond: (f) => f.s51 },
    { id: 's53', ch: 5, name: '玄真子的答案', text: '密格夹层最后一页：「吾已将护山阵改为『反客为主』之局——若后人有渡劫者，愿以此残阵助其借雷反杀。』', cond: (f) => f.s52 && X.Form.get().length >= 2, eff: { flag: 'reverse' } },
    { id: 's54', ch: 5, name: '终章抉择', text: '第九劫落雷之前，是依玄真子残阵行「借雷反杀」，还是以己身硬撼天道？', cond: (f) => f.s53 && X.Trib && X.Trib.total >= 8, opts: [{ label: '借雷反杀（需大吉风水+护体阵）', eff: { flag: 'choice_kill', rep: 15 } }, { label: '以正合道，硬撼九霄', eff: { flag: 'choice_face', rep: 10 } }] },
    { id: 's55', ch: 5, name: '卷五终 · 尘埃落定', text: '终局已至。旧案了结，山门重光——听雨观的名字，重新刻上山门。', cond: (f) => (f.choice_kill || f.choice_face) && X.Game.ascended >= 1, eff: { flag: 'ch5', story: 5 } },
  ];

  X.StoryDb = { nodes: NODES };
})(globalThis.XIANG);

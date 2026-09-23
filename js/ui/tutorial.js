/* 掌门手册 2.0：聚光灯步骤式引导（高亮目标元素+等待玩家行动）+顶栏按钮按进度解锁。
   node 端无 DOM，仅逻辑接口（step/unlocked）可测。 */
(function (X) {
  const farmCount = () => { let n = 0; X.Build.each(b => { if (b.built && b.farm) n++; }); return n; };

  const STEPS = [
    {
      id: 'welcome', title: '欢迎接掌云隐观', target: null,
      text: '你要做的是：<b>经营→修行→百艺→江湖→九劫飞升</b>。眼下只有三名杂役和一小院——先安身，再求道。跟着手册走，每步都会高亮告诉你在哪。',
      btn: '开始',
      done: () => X.Game._tutGo === true,
    },
    {
      id: 'place', title: '放置你的第一个建筑', target: '#bpanel',
      text: '这是<b>营造面板</b>：结构页有墙/门/地板（围成「房间」触发风水），生产页有灵田。选一张卡片，再到地图上点一格放下。试试放一张<b>床榻</b>或<b>柴堆</b>。',
      done: () => (X.Game.stats.playerPlaced || 0) >= 1,
    },
    {
      id: 'suite', title: '套间——一键成房', target: '#btabs',
      text: '围墙+门+家具围成的<b>房间</b>有风水属性：生扶本命＝大吉（修炼×1.4）。手动围墙麻烦？营造面板切到<b>【套间】</b>页，整间落图。静室套间是修士刚需。',
      done: () => (X.Game.stats.suites || 0) >= 1 || X.Feng.get().length >= 1,
    },
    {
      id: 'farm', title: '灵田与口粮', target: '#btabs',
      text: '切到<b>【生产】</b>页放一块灵田。杂役会自行播种收割、做饭进食——人口增长后他们也会自发开垦。粮仓见底是灭门之首，留意顶栏「谷」。',
      done: () => farmCount() >= 3,
    },
    {
      id: 'time', title: '时辰与倍速', target: '#speed',
      text: '右上角可<b>暂停/1/2/4倍速</b>。一日=12时辰，一季=90日。等待期不必干瞪眼——开2倍让杂役吐纳、庄稼生长。',
      done: () => X.Time.day >= (X.Game._tutDay0 || 0) + 2,
    },
    {
      id: 'disc', title: '点选弟子看详情', target: '#stage',
      text: '点地图上的<b>墨点小人</b>：六维/灵根/需求/心境/境界都在右侧面板。杂役闲时会自行<b>吐纳</b>，练气圆满即可择典筑基转修士。',
      done: () => X.Dyn && X.Dyn.sel && X.Dyn.sel.kind === 'disc',
    },
    {
      id: 'xiu', title: '修行之路', target: '#stage',
      text: '练气圆满的弟子右侧会出现<b>【择典筑基…】</b>按钮——道典终身不换（开局六典+游历残卷）。修士不干杂活：打坐/冲关/炼制/迎敌。想快，先给静室凑「大吉」风水。',
      done: () => X.Disciple.list.some(d => d.kind === '修士'),
    },
    {
      id: 'craft', title: '百艺开炉', target: '#bpanel',
      text: '修士闲时会自动接单<b>炼丹/锻器/画符</b>（需丹房/器坊/符案+委托），亲手制作有小游戏加成。丹药自动服用、破境符自动辅助冲关。',
      done: () => X.Craft.log && X.Craft.log.length >= 0 && (X.Game.stats.suites >= 1 || X.Craft.orders.length > 0 || X.Craft.artifacts.length > 0),
    },
    {
      id: 'world', title: '江湖在远方', target: '#btn-travel',
      text: '门内是修仙，门外是江湖：<b>游历</b>九州（声望+残卷+灵材）、妖潮30日一波、恩怨客卿、坊市拍卖。按钮会随进度逐一解锁——不用记，亮什么点什么。',
      btn: '知道了',
      done: () => X.Game._tutGo === true,
    },
  ];

  const T = {};
  T.STEPS = STEPS;
  T.step = function () {
    if (!X.Game || X.Game.inited === false) return null;
    if (X.Game.tutSkip) return null;
    const i = X.Game.tutStep | 0;
    if (i >= STEPS.length) return null;
    const s = STEPS[i];
    // 新手保底：到达套间步而物料不足时，一次性开山资助（静室套间为准）
    if (s.id === 'suite' && !X.Game.stats.tutGift && X.Suites) {
      const need = X.Suites.byId.suiteCalm.cost;
      const shortS = need.stone - X.Inv.count('stone'), shortW = need.wood - X.Inv.count('wood');
      if (shortS > 0 || shortW > 0) {
        if (shortS > 0) X.Inv.add('stone', shortS);
        if (shortW > 0) X.Inv.add('wood', shortW);
        X.Game.stats.tutGift = 1;
        X.Game.log('【开山资助】掌门下山筹得一批木石，静室套间可即落图');
      }
    }
    let ok = false;
    try { ok = !!s.done(); } catch (e) { ok = false; }
    if (ok) {
      X.Game.tutStep = i + 1;
      X.Bus.emit('tut:step', X.Game.tutStep);
      return T.step();
    }
    return { idx: i + 1, total: STEPS.length, ...s };
  };
  T.skip = function () { X.Game.tutSkip = true; X.Bus.emit('tut:step', -1); };
  T.begin = function () { X.Game._tutGo = true; };

  /* —— 顶栏按钮解锁门控（返回是否可见；解锁瞬间由 hud toast） —— */
  T.unlocked = function (what) {
    if (!X.Game || !X.Game.inited) return false;
    const rep = X.Game.rep();
    switch (what) {
      case 'travel': return X.Disciple.list.some(d => d.kind === '修士');
      case 'jianghu': return rep >= 20;
      case 'market': return rep >= 20;
      case 'story': return X.Time.day >= 10;
      case 'feng': return X.Build.builtOf('observatory').length > 0;
      default: return true;
    }
  };
  X.Tut = T;
})(globalThis.XIANG);

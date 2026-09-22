/* 剧情引擎：旧案节点逐日评估、章内顺序解锁、抉择与三结局判定。 */
(function (X) {
  const S = {
    flags: {},        // 已触发节点 id 与剧情旗标
    chapter: 0,       // 已完成卷数
    ending: null,     // {id, name, day} 一旦判定不再更改（除无尽续玩）
    choicePending: null,   // 等待玩家抉择的节点
    seenLog: [],      // 已揭节点名（面板用）
  };

  S.reset = function () { S.flags = {}; S.chapter = 0; S.ending = null; S.choicePending = null; S.seenLog = []; };
  S.progress = () => X.StoryDb.nodes.filter(n => S.flags[n.id]).length;

  // 逐日：同一时间至多解锁一个节点（含抉择）
  S.onDay = function () {
    if (!X.Game.inited || S.ending) return;
    if (S.choicePending) return;   // 抉择未决，暂停推进
    for (const n of X.StoryDb.nodes) {
      if (S.flags[n.id]) continue;
      // 章内顺序：本章前一节点须已触发
      const prev = X.StoryDb.nodes.filter(o => o.ch === n.ch && o.idx < n.idx);
      // 节点按数组顺序排列即 idx；直接要求：同章中此节点之前的节点都已触发
      const sameCh = X.StoryDb.nodes.filter(o => o.ch === n.ch);
      const before = sameCh.slice(0, sameCh.indexOf(n));
      if (before.some(o => !S.flags[o.id])) continue;
      let ok = false;
      try { ok = !!n.cond(S.flags); } catch (e) { ok = false; }
      if (!ok) continue;
      // 触发
      S.flags[n.id] = true;
      S.seenLog.unshift({ day: X.Time.day, name: n.name, ch: n.ch });
      if (S.seenLog.length > 30) S.seenLog.pop();
      if (n.opts) {
        S.choicePending = n.id;
        X.Bus.emit('story:choice', n);
        X.Game.log(`【旧案·卷${'一二三四五'[n.ch - 1]}】${n.name}——须由掌门定夺（旧案面板）`);
      } else {
        X.Game.log(`【旧案·卷${'一二三四五'[n.ch - 1]}】${n.name}`);
        X.Bus.emit('story:node', n);
        S.applyEff(n.eff);
      }
      return;   // 每日至多一节点
    }
  };
  S.nodeById = id => X.StoryDb.nodes.find(n => n.id === id);
  S.choose = function (nodeId, optIdx) {
    const n = S.nodeById(nodeId);
    if (!n || S.choicePending !== nodeId) return false;
    const o = n.opts[optIdx];
    if (!o) return false;
    S.choicePending = null;
    X.Game.log(`【旧案】${n.name} —— 抉择：${o.label}`);
    S.applyEff(o.eff);
    X.Bus.emit('story:node', n);
    S.applyEff(n.eff);   // 节点自身效果（如 ch 旗标）在抉择后生效
    return true;
  };
  S.applyEff = function (eff) {
    if (!eff) return;
    if (eff.flag) S.flags[eff.flag] = true;
    if (eff.rep) X.Game.addRep(eff.rep);
    if (eff.story) { S.chapter = eff.story; X.Bus.emit('story:chapter', eff.story); }
  };

  /* —— 三结局判定 —— */
  S.ENDINGS = {
    dao_off: '道统断绝', truth: '真相大白', golden: '重开盛世',
  };
  S.checkEndings = function () {
    if (S.ending || !X.Game.inited || X.Game.endless) return null;
    const alive = X.Disciple.list.length;
    // 道统断绝：全门覆灭，或传承三代（12 年一代）无人飞升
    if (alive === 0) return S.finish('dao_off', '门中再无一人，香火自此而绝');
    if (X.Game.legacyGen && X.Game.legacyGen() >= 3 && X.Game.ascended === 0)
      return S.finish('dao_off', '三代经营，终无一人渡得九霄');
    // 真相大白：旧案五章完成
    if (S.flags.ch5 && !X.Game.ascended)
      return S.finish('truth', '旧案昭雪，山门重立；飞升之路留待来者');
    // 重开盛世：飞升且旧案了结
    if (S.flags.ch5 && X.Game.ascended >= 1)
      return S.finish('golden', '九霄雷散，听雨观旧名重刻山门——盛世自兹而始');
    return null;
  };
  S.finish = function (id, note) {
    S.ending = { id, name: S.ENDINGS[id], note, day: X.Time.day };
    X.Game.log(`【结局·${S.ending.name}】${note}（无尽模式下可继续经营）`);
    X.Bus.emit('story:ending', S.ending);
    return S.ending;
  };

  S.snapshot = () => ({ flags: { ...S.flags }, chapter: S.chapter, ending: S.ending, seen: S.seenLog.slice(0, 30) });
  S.restore = function (o) {
    S.reset();
    Object.assign(S.flags, (o && o.flags) || {});
    S.chapter = (o && o.chapter) || 0;
    S.ending = (o && o.ending) || null;
    S.seenLog = (o && o.seen) || [];
  };

  X.Bus.on('time:day', () => {
    S.onDay();
    S.checkEndings();
  });
  X.Bus.on('game:death', () => S.checkEndings());
  X.Bus.on('ascend:done', () => S.checkEndings());
  X.Story = S;
})(globalThis.XIANG);

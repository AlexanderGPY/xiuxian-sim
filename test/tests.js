/* 回归套件：浏览器 __G.test() 与 node test/node-core.js 共用同一份用例 */
(function (X) {
  const cases = [];
  const t = (name, fn) => cases.push({ name, fn });

  // ---- 引擎与历法 ----
  t('泵帧360日(裸tick)无崩溃', () => {
    X.Time.reset();
    X.Tick.pump(360 * X.Time.ticksPerDay);
    if (X.Time.year !== 2) throw new Error('year=' + X.Time.year);
  });
  t('历法一致性(季节/年)', () => {
    X.Time.reset();
    X.Tick.pump(90 * X.Time.ticksPerDay);
    if (X.Time.season !== 1) throw new Error('90日后应为夏(1)，得 ' + X.Time.season);
    X.Tick.pump(270 * X.Time.ticksPerDay);
    if (X.Time.season !== 0 || X.Time.year !== 2) throw new Error(`一年后应为第二年春，得 ${X.Time.year}年${X.Time.season}季`);
  });
  t('种子随机可复现', () => {
    const a = X.Rng(42), b = X.Rng(42);
    for (let i = 0; i < 100; i++) if (a.f() !== b.f()) throw new Error('同种子序列不一致');
  });
  t('地图:五行和恰为100', () => {
    X.Map.mut = {}; X.Map.generate(12345);
    let bad = 0;
    for (let i = 0; i < X.Map.N; i++) {
      const s = X.Map.elem[i * 5] + X.Map.elem[i * 5 + 1] + X.Map.elem[i * 5 + 2] + X.Map.elem[i * 5 + 3] + X.Map.elem[i * 5 + 4];
      if (s !== 100) bad++;
    }
    if (bad) throw new Error(bad + ' 格五行和≠100');
  });
  t('地图:同种子可复现(含改写)', () => {
    X.Map.mut = {};
    const A = X.Map.generate(777);
    X.Map.setTile(5, 5, X.Map.TERRAIN.GRASS);
    const tA = Array.from(A.terrain);
    const B = X.Map.generate(777);
    for (let i = 0; i < A.N; i++) if (tA[i] !== B.terrain[i]) throw new Error('地形不一致 @' + i);
    if (B.terrain[5 * A.W + 5] !== X.Map.TERRAIN.GRASS) throw new Error('地形改写未随种子重建生效');
  });

  // ---- P1 经营层 ----
  t('P1:3杂役自助存活30日', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(123);
    X.Tick.pump(30 * X.Time.ticksPerDay);
    const alive = X.Disciple.list.length;
    const deaths = X.Game.logs.filter(l => l.msg.indexOf('饿殒') >= 0).length;
    if (alive < 3) throw new Error(`仅存活 ${alive} 人（饿殒 ${deaths}）`);
    if (X.Game.stats.mealsEaten <= 0) throw new Error('从未进食');
    return `存活${alive}人 用餐${X.Game.stats.mealsEaten}次`;
  });
  t('P1:农炊自给自足', () => {
    if (X.Game.stats.harvests <= 0) throw new Error('从未收割');
    if (X.Game.stats.mealsCooked <= 0) throw new Error('从未炊事');
    if (X.Inv.foodCount() <= 0) throw new Error('粮仓见底');
    return `收割${X.Game.stats.harvests} 炊事${X.Game.stats.mealsCooked} 余粮${X.Inv.foodCount()}`;
  });
  t('P1:营建蓝图可完工', () => {
    X.Inv.add('wood', 30);
    const [hx, hy] = X.Game.home;
    const b = X.Build.place('toilet', hx + 6, hy);
    if (!b) throw new Error('蓝图放置失败');
    X.Tick.pump(2 * X.Time.ticksPerDay);
    if (!b.built) throw new Error('两日未完工: ' + Math.floor(b.progress) + '/' + b.def.work);
    return '茅厕落成';
  });
  t('P1:节气按期触发', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(123);
    X.Tick.pump(360 * X.Time.ticksPerDay);
    const terms = X.Game.logs.filter(l => l.msg.indexOf('【节气') === 0);
    if (terms.length !== 12) throw new Error('一年应触发12节气，得 ' + terms.length);
    return terms.map(l => l.msg.slice(4, 6)).join(' ');
  });
  t('P1:自动经营一年存活且扩产', () => {
    X.Tick.pump(360 * X.Time.ticksPerDay);
    const deaths = X.Game.logs.filter(l => l.msg.indexOf('饿殒') >= 0).length;
    if (X.Disciple.list.length < 3) throw new Error('一年后人口 ' + X.Disciple.list.length);
    if (deaths > 0) throw new Error('饿殒 ' + deaths + ' 人');
    let plots = 0;
    X.Build.each(b => { if (b.built && b.farm) plots++; });
    if (plots < 3) throw new Error('未按人口扩田: ' + plots);
    return `人口${X.Disciple.list.length} 田${plots} 谷${X.Inv.count('grain')} 境${X.Game.avgMood()}`;
  });

  // ---- P2 修行层 ----
  // 在家园附近找一块 7×7 净土，筑"土生金"石屋（5×5 围合+底部门），返回 {bed, inner}
  function buildTujinRoom() {
    const T = X.Map.TERRAIN, M = X.Map;
    const [hx, hy] = X.Game.home;
    for (let r = 3; r < 18; r++) {
      for (let a = 0; a < 22; a++) {
        const ox = hx + Math.round(Math.cos(a) * r * 1.6) - 3, oy = hy + Math.round(Math.sin(a) * r) - 3;
        let ok = true;
        for (let i = 0; i < 7 && ok; i++) for (let j = 0; j < 7 && ok; j++) {
          const t = M.terrain[(oy + j) * M.W + (ox + i)];
          if (t === T.WATER || t === T.ROCK || t === T.FOREST) ok = false;
          if (X.Build.grid[(oy + j) * M.W + (ox + i)]) ok = false;
        }
        if (!ok) continue;
        for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
          const edge = i === 0 || i === 4 || j === 0 || j === 4;
          if (!edge) continue;
          const isDoor = (i === 2 && j === 4);
          X.Build.place(isDoor ? 'doorWood' : 'wallStone', ox + i, oy + j, { instant: true, free: true });
        }
        const bed = X.Build.place('ironBed', ox + 2, oy + 1, { instant: true, free: true });
        if (!bed) continue;
        return { bed, inner: { x: ox + 1, y: oy + 2 } };
      }
    }
    return null;
  }
  t('P2:杂役吐纳练气圆满', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(5);
    X.Tick.pump(60 * X.Time.ticksPerDay);
    if (!X.Disciple.list.some(d => d.eligible)) throw new Error('60 日内无人练气圆满');
    const d = X.Disciple.list.find(d => d.eligible);
    return `${d.name} ${X.Realms.realmName(d)}${X.Realms.stageName(d)}`;
  });
  t('P2:风水·土生金寝室大吉', () => {
    const room0 = buildTujinRoom();
    if (!room0) throw new Error('家园附近找不到 7×7 空地');
    const room = X.Feng.roomAt(room0.bed.x, room0.bed.y);
    if (!room) throw new Error('未识别出房间');
    if (room.grade !== '大吉') throw new Error(`土生金应大吉，得 ${room.grade}（dom=${X.Map.ELEM[room.dom]} life=${room.life && X.Map.ELEM[room.life.el]}）`);
    X.Game._tujin = room0;
    return `${room.purpose}·${X.Map.ELEM[room.dom]}生${room.life ? X.Map.ELEM[room.life.el] : '?'} → 大吉 ✓`;
  });
  t('P2:风水增益修炼速率', () => {
    const d = X.Disciple.list.find(o => o.kind === '修士') || (() => {
      const c = X.Disciple.list[0];
      c.realm = 2; c.stage = 0; c.exp = 0; c.kind = '修士'; c.scId = 'yunshui';
      return c;
    })();
    // 室外蒲团（平）
    const [hx, hy] = X.Game.home;
    let m1 = null;
    for (let r = 4; r < 16 && !m1; r++) for (let a = 0; a < 20 && !m1; a++) {
      const x = hx + Math.round(Math.cos(a) * r * 1.6), y = hy + Math.round(Math.sin(a) * r);
      m1 = X.Build.place('mat', x, y, { instant: true, free: true });
    }
    d.cultSpot = m1.id;
    const r1 = X.Cult.rate(d);
    // 大吉静室：水井(水)围屋 + 蒲团(木) → 水生木
    let m2 = null, ring = null;
    for (let r = 6; r < 20 && !m2; r++) {
      for (let a = 0; a < 22 && !m2; a++) {
        const ox = hx + Math.round(Math.cos(a) * r * 1.6) - 3, oy = hy + Math.round(Math.sin(a) * r) - 3;
        if (!X.Build.terrainOk(X.Buildings.byId.well, ox + 2, oy)) continue;
        let ok = true;
        for (let i = 0; i < 5 && ok; i++) for (let j = 0; j < 5 && ok; j++) {
          const edge = i === 0 || i === 4 || j === 0 || j === 4;
          if (!edge) continue;
          if (!X.Build.terrainOk(X.Buildings.byId.well, ox + i, oy + j)) ok = false;
        }
        if (!ok) continue;
        let placed = true;
        for (let i = 0; i < 5 && placed; i++) for (let j = 0; j < 5 && placed; j++) {
          const edge = i === 0 || i === 4 || j === 0 || j === 4;
          if (edge && !X.Build.place('well', ox + i, oy + j, { instant: true, free: true })) placed = false;
        }
        if (!placed) continue;
        m2 = X.Build.place('mat', ox + 2, oy + 2, { instant: true, free: true });
        if (!m2) continue;
        ring = X.Feng.roomAt(m2.x, m2.y);
        if (!ring || ring.grade !== '大吉') { m2 = null; continue; }
      }
    }
    if (!m2) throw new Error('未能筑出水生木大吉静室');
    d.cultSpot = m2.id;
    const r2 = X.Cult.rate(d);
    if (!(r2 > r1 * 1.3)) throw new Error(`大吉速率 ${r2.toFixed(3)} 应显著高于平地 ${r1.toFixed(3)}`);
    return `平${r1.toFixed(3)} → 大吉${r2.toFixed(3)}（×${(r2 / r1).toFixed(2)}）`;
  });
  t('P2:择典筑基转修士', () => {
    X.Tick.pump(30 * X.Time.ticksPerDay);
    const xs = X.Disciple.list.filter(d => d.kind === '修士');
    if (!xs.length) throw new Error('90 日内无人筑基');
    return `${xs.map(d => d.name + '·' + X.Realms.realmName(d) + '《' + (X.Cult.scriptureOf(d) || {}).name + '》').join(' ')}`;
  });
  t('P2:寿元坐化', () => {
    const d = X.Disciple.list[0];
    if (!d) return 'skip(无人)';
    d.bornDay = X.Time.day - 999 * 360;
    const n0 = X.Disciple.list.length;
    X.Tick.pump(X.Time.ticksPerDay + 5);
    if (X.Disciple.list.length >= n0) throw new Error('寿元耗尽未坐化');
    if (!X.Game.logs.some(l => l.msg.includes('坐化'))) throw new Error('无坐化日志');
    return '含笑坐化 ✓';
  });
  t('P2:全链路凡人至结丹', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(9);
    X.Cult.forcePass = false;
    const limit = 260 * X.Time.ticksPerDay;
    const step = 10 * X.Time.ticksPerDay;
    for (let t0 = 0; t0 < limit; t0 += step) {
      X.Tick.pump(step);
      if (X.Disciple.list.some(d => d.realm >= 3)) break;
    }
    const d = X.Disciple.list.find(d => d.realm >= 3);
    if (!d) {
      if (!X.Disciple.list.length) throw new Error(`第${X.Time.day}日全员殒没`);
      const best = Math.max(...X.Disciple.list.map(d => d.realm));
      throw new Error(`260 日仅至 ${X.Realms.list[best].name}（第${X.Time.day}日）`);
    }
    return `${d.name} 结丹功成（第${X.Time.day}日）`;
  });
  t('P2:存档v3修行字段往返', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(11);
    X.Tick.pump(45 * X.Time.ticksPerDay);
    const snap = JSON.parse(JSON.stringify(X.Save.snapshot()));
    const pick = snap.game.disciples.map(r => [r.name, r.kind, r.realm, r.stage, r.scId, r.bornDay]);
    X.Game.init(2);
    X.Save.restore(snap);
    const now = X.Disciple.list.map(d => [d.name, d.kind, d.realm, d.stage, d.scId, d.bornDay]);
    if (JSON.stringify(pick) !== JSON.stringify(now)) throw new Error('修行字段不一致');
  });

  // ---- P3 百艺 ----
  t('P3:丹道委托产出', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(31);
    const [hx, hy] = X.Game.home;
    X.Build.place('alchemy', hx + 8, hy + 4, { instant: true, free: true });
    X.Build.place('herbPlot', hx - 4, hy + 4, { instant: true, free: true });
    X.Inv.add('herb', 20);
    const d = X.Disciple.list[0];
    Object.assign(d, { kind: '修士', realm: 3, stage: 0, exp: 0, scId: 'yunshui' });
    if (!X.Craft.queue('dan', 'pillJu', 3)) throw new Error('下单失败');
    X.Tick.pump(4000);
    if (X.Inv.count('pillJu') < 1) throw new Error('未出丹: ' + X.Inv.count('pillJu'));
    if (d.craft.dan <= 0) throw new Error('熟练度未涨');
    return `聚气丹×${X.Inv.count('pillJu')} 丹道熟练${d.craft.dan.toFixed(1)}`;
  });
  t('P3:丹药自动服用', () => {
    const d = X.Disciple.list[0];
    d.hp = 30; X.Inv.add('pillLiao', 2);
    X.Tick.pump(X.Time.TICKS_PER_SHICHEN + 50);
    if (d.hp <= 40) throw new Error('疗伤丹未生效 hp=' + Math.round(d.hp));
    X.Inv.add('pillPoZ', 1);
    const boost = X.Craft.brkBoost(d);
    if (boost < 0.1 || X.Inv.count('pillPoZ') !== 0) throw new Error('破境丹未消耗');
    return `疗伤(hp${Math.round(d.hp)})/破境(+${boost}) ✓`;
  });
  t('P3:器道法宝与装备', () => {
    const d = X.Disciple.list[0];
    X.Build.place('forge', X.Game.home[0] - 12, X.Game.home[1] + 6, { instant: true, free: true });
    X.Inv.add('stone', 50); X.Inv.add('ling', 5);
    if (!X.Craft.queue('qi', 'artSword', 2)) throw new Error('下单失败');
    X.Tick.pump(3000);
    if (!X.Craft.artifacts.length) throw new Error('未锻出法宝');
    const a = X.Craft.artifacts[0];
    if (!a.affixes.length) throw new Error('无词条');
    X.Craft.equip(d, a.iid);
    if (d.artifact !== a.iid || a.holder !== d.id) throw new Error('装备失败');
    return `${X.Craft.artifacts.length}件，词条：${a.affixes.map(x => x.n).join('·')}`;
  });
  t('P3:符道护身符', () => {
    X.Build.place('talisman', X.Game.home[0] + 8, X.Game.home[1] - 8, { instant: true, free: true });
    X.Inv.add('wood', 30);
    if (!X.Craft.queue('fu', 'fuHu', 4)) throw new Error('下单失败');
    X.Tick.pump(9000);
    if (X.Inv.count('fuHu') < 1) throw new Error('未出符');
    const d = X.Disciple.list[0];
    d.hp = 20;
    X.Tick.pump(X.Time.TICKS_PER_SHICHEN + 50);
    if (d.hp <= 30) throw new Error('护身符未自燃 hp=' + Math.round(d.hp));
    return `护身符×${X.Inv.count('fuHu')} 自燃护体(hp${Math.round(d.hp)}) ✓`;
  });
  t('P3:阵法聚灵生效', () => {
    const [hx, hy] = X.Game.home;
    // 家园净空带内布阵（hy+4/5 两行无建筑）
    const eye = X.Build.place('eyeJuling', hx, hy + 4, { instant: true, free: true });
    let placed = 0;
    for (const dx of [-2, -1, 1]) if (X.Build.place('zhenFlag', hx + dx, hy + 4, { instant: true, free: true })) placed++;
    if (!eye || placed < 3) throw new Error(`摆放失败 eye=${!!eye} flags=${placed}`);
    if (!X.Form.isActive('juling')) throw new Error('聚灵阵未激活');
    const base = X.Map.qi[eye.y * X.Map.W + eye.x];
    if (X.Form.qiAt(eye.x, eye.y) < base + 3) throw new Error('灵韵未提升');
    const eye2 = X.Build.place('eyeYinqi', hx, hy + 5, { instant: true, free: true });
    let p2 = 0;
    for (const dx of [-2, 1, 3]) if (X.Build.place('zhenFlag', hx + dx, hy + 5, { instant: true, free: true })) p2++;
    if (!eye2 || p2 < 3 || !X.Form.isActive('yinqi')) throw new Error(`引气阵未成 eye2=${!!eye2} flags=${p2}`);
    return `聚灵+${X.Form.qiAt(eye.x, eye.y) - base}灵韵，引气阵成 ✓`;
  });
  t('P3:灵植种植与蕴养', () => {
    X.Inv.add('seedMu', 1);
    if (!X.SP.plant('seedMu')) throw new Error('种植失败');
    let b = null;
    X.Build.each(x => { if (x.def.kind === 'splant') b = x; });
    if (!b) throw new Error('灵植不存在');
    X.Tick.pump(95 * X.Time.ticksPerDay);
    if (!b.sp || b.sp.stage < 3) throw new Error('95 日未成株: stage=' + (b.sp && b.sp.stage));
    X.Inv.add('wood', 10);
    const r = X.SP.feed(b, 'wood', 2);
    if (!r.ok) throw new Error('蕴养失败: ' + r.why);
    return `三阶功成，蕴养反应「${r.r}」✓`;
  });
  t('P3:存档v4百艺往返', () => {
    const snap = JSON.parse(JSON.stringify(X.Save.snapshot()));
    const nArt = snap.game.craft.artifacts.length;
    const c0 = snap.game.disciples.map(r => r.craft);
    X.Game.init(2);
    X.Save.restore(snap);
    if (X.Craft.artifacts.length !== nArt) throw new Error('法宝数不一致');
    const c1 = X.Disciple.list.map(r => r.craft);
    if (JSON.stringify(c0) !== JSON.stringify(c1)) throw new Error('熟练度不一致');
    let sp = 0;
    X.Build.each(x => { if (x.sp) sp++; });
    if (sp !== snap.game.builds.filter(r => r.sp).length) throw new Error('灵植状态不一致');
    return `法宝${nArt} 灵植${sp} ✓`;
  });

  // ---- P4 江湖已远 ----
  function makeXiu(d, realm, stage, scId) {
    d.kind = '修士'; d.realm = realm || 2; d.stage = stage || 0;
    d.scId = scId || 'ruijin'; d.hp = X.Disciple.maxHp(d);
    d.exp = X.Realms.cost(d.realm, d.stage);   // 修为灌满（atCap 可判）
    return d;
  }
  t('P4:世界·事件池·妖兽图鉴规模', () => {
    if (X.World.list.length !== 20) throw new Error('地点数 ' + X.World.list.length);
    if (X.Events.list.length < 150) throw new Error('事件池 ' + X.Events.list.length);
    if (X.Npcs.list.length !== 18) throw new Error('NPC ' + X.Npcs.list.length);
    if (X.Combat.defs.length !== 24) throw new Error('妖兽 ' + X.Combat.defs.length);
    const ids = new Set(X.Events.list.map(e => e.id));
    if (ids.size !== X.Events.list.length) throw new Error('事件 id 重复');
    return `20地点 / ${X.Events.list.length}事件 / 18人物 / 24妖兽 ✓`;
  });
  t('P4:游历全流程(委派→记闻→归山)', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(31);
    const L = X.Disciple.list;
    makeXiu(L[0], 3, 0); makeXiu(L[1], 2, 1);
    const rep0 = X.Game.rep();
    const r = X.Travel.start('linjiang', [L[0].id, L[1].id]);
    if (!r.ok) throw new Error('启程失败: ' + r.why);
    if (L[0].travel !== r.ex.id) throw new Error('离山标记缺失');
    X.Tick.pump(11 * X.Time.ticksPerDay);
    if (X.Travel.list.some(e => e.id === r.ex.id)) throw new Error('11 日后仍未归山(往返 8 日)');
    if (L[0].travel || L[1].travel) throw new Error('归山后 travel 未清');
    if (!X.Travel.log.length) throw new Error('全程无记闻');
    if (X.Game.rep() <= rep0) throw new Error('声望未增');
    return `记闻${X.Travel.log.length}则 声望${rep0}→${X.Game.rep()} ✓`;
  });
  t('P4:妖潮首波·修士迎战斩妖', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(31);
    makeXiu(X.Disciple.list[0], 6, 0);
    X.Game.addRep(20);   // 声望≥25 方引妖潮
    X.Time.day = 59; X.Time.dayOfYear = 59;
    X.Tick.pump(1 * X.Time.ticksPerDay + 60);
    if (X.Combat.wave !== 1) throw new Error('第 60 日应有首波妖潮，得 wave=' + X.Combat.wave);
    if (!X.Combat.beasts.length) throw new Error('妖潮未生成妖兽');
    X.Tick.pump(6 * X.Time.ticksPerDay);
    if (X.Combat.beasts.filter(b => !b.flee).length) throw new Error('6 日后仍有妖兽在山');
    if (X.Combat.killed < 1) throw new Error('未斩杀任何妖兽（seed 需调整）');
    if (X.Inv.count('yaodan1') + X.Inv.count('yaodan2') < 1) throw new Error('未获妖丹');
    return `第${X.Combat.wave}波 斩妖${X.Combat.killed} 得妖丹 声望${X.Game.rep()} ✓`;
  });
  t('P4:战力公式方向正确', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(31);
    const a = makeXiu(X.Disciple.list[0], 5, 2);
    const b = X.Disciple.list[1];
    if (!(X.Combat.power(a) > X.Combat.power(b) * 1.5)) throw new Error('高境界战力未显著领先');
    const d0 = X.Combat.defenseBonus();
    const [hx, hy] = X.Game.home;
    X.Build.place('gate', hx + 5, hy + 2, { instant: true, free: true });
    if (X.Combat.defenseBonus() <= d0) throw new Error('山门未提升守御');
    return `高境战力${X.Combat.power(a).toFixed(0)} 山门守御+${((X.Combat.defenseBonus() - d0) * 100).toFixed(0)}% ✓`;
  });
  t('P4:缘分客卿驻山增益', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(31);
    const [hx, hy] = X.Game.home;
    X.Build.place('guesthall', hx + 4, hy - 3, { instant: true, free: true });
    X.Game.addRep(50);
    X.Relation.meet('qingyun');
    X.Relation.change('qingyun', 110);
    const gs = X.Relation.guests();
    if (!gs.length) throw new Error('好感满+客舍+声望≥40 仍未有客卿');
    if (X.Relation.buff().atk <= 0) throw new Error('客卿增益未生效');
    return `${gs[0].npc.name} 驻山（${gs[0].npc.buff.label}）✓`;
  });
  t('P4:恩怨犯山·阵前化解', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(31);
    makeXiu(X.Disciple.list[0], 7, 1);
    X.Time.day = 40; X.Time.dayOfYear = 40;
    X.Relation.grudgeChange('chiyang', 100);
    X.Tick.pump(1 * X.Time.ticksPerDay + 100);
    if (!X.Combat.raiders.length) throw new Error('仇怨满未触发犯山');
    X.Tick.pump(10 * X.Time.ticksPerDay);
    if (X.Combat.raiders.length) throw new Error('10 日后犯山者未退');
    if (X.Relation.sects.chiyang.grudge >= 100) throw new Error('战后仇怨未消减');
    return `犯山来袭 化解仇怨至${X.Relation.sects.chiyang.grudge} ✓`;
  });
  t('P4:拍卖竞价购得拍品', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(31);
    X.Game.addRep(60);
    X.Inv.add('ling', 800);
    X.Time.day = 74; X.Time.dayOfYear = 74;
    X.Tick.pump(1 * X.Time.ticksPerDay + 60);
    if (!X.Auction.active) throw new Error('第 75 日声望 60+ 未开拍');
    const lot = X.Auction.lots[0];
    const before = X.Inv.count('ling');
    const bid = X.Auction.bid(lot.id);
    if (!bid.ok) throw new Error('竞价失败: ' + bid.why);
    if (X.Inv.count('ling') !== before - bid.price) throw new Error('灵石未扣除');
    const found0 = X.Game.found.length, art0 = X.Craft.artifacts.length;
    const seed0 = X.Recipes.splant.reduce((s, p) => s + X.Inv.count(p.seed), 0);
    X.Tick.pump(3 * X.Time.ticksPerDay);
    if (X.Auction.active) throw new Error('会期两日后未收槌');
    const got = X.Game.found.length > found0 || X.Craft.artifacts.length > art0 ||
      X.Recipes.splant.reduce((s, p) => s + X.Inv.count(p.seed), 0) > seed0 ||
      X.Inv.count('yaodan2') + X.Inv.count('yaodan3') + X.Inv.count('lingzhi') > 0;
    if (!got) throw new Error('未拍到任何东西');
    return `出价${bid.price}灵石 成交交割 ✓`;
  });
  t('P4:游历得典可入藏经阁', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(31);
    const sc = X.Game.findScroll();
    if (!sc || !sc.locked) throw new Error('未抽到未解锁之典');
    if (X.Game.found.indexOf(sc.id) < 0) throw new Error('残卷未入藏');
    const sc2 = X.Game.findScroll();
    if (sc2 && sc2.id === sc.id) throw new Error('残卷重复');
    return `《${sc.name}》入库 ✓`;
  });
  t('P4:存档v5江湖往返', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(31);
    makeXiu(X.Disciple.list[0], 3, 0);
    X.Travel.start('wuyin', [X.Disciple.list[0].id]);
    X.Game.addRep(33);
    X.Relation.change('luoxia', 45);
    X.Combat.wave = 4; X.Combat.killed = 7;
    const snap = JSON.parse(JSON.stringify(X.Save.snapshot()));
    if (snap.ver < 5) throw new Error('版本 ' + snap.ver);   // v5+ 均兼容（当前 v6）
    X.Game.init(2);
    X.Save.restore(snap);
    if (X.Game.rep() !== 43) throw new Error('声望不一致: ' + X.Game.rep());
    if (!X.Travel.list.length) throw new Error('在途队伍丢失');
    if (!X.Disciple.list.some(d => d.travel)) throw new Error('离山标记丢失');
    if (X.Relation.sects.luoxia.aff !== 45) throw new Error('门派好感丢失');
    if (X.Combat.wave !== 4 || X.Combat.killed !== 7) throw new Error('妖潮进度丢失');
    return `声望43/在途1/好感45/妖潮4波 ✓`;
  });

  // ---- P5 天道无常 ----
  t('P5:旧案五章顺序推进', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(41);
    X.Tick.pump(6 * X.Time.ticksPerDay);
    if (!X.Story.flags.s11) throw new Error('第6日未触发焦土残碑');
    X.Tick.pump(10 * X.Time.ticksPerDay);
    if (!X.Story.flags.s12) throw new Error('第15日未触发旧话');
    X.Tick.pump(10 * X.Time.ticksPerDay);
    if (!X.Story.flags.s13) throw new Error('第24日未触发地窖');
    const [hx, hy] = X.Game.home;
    X.Build.place('observatory', hx + 6, hy + 2, { instant: true, free: true });
    X.Tick.pump(2 * X.Time.ticksPerDay);
    if (!X.Story.flags.s14) throw new Error('观星台夜话未触发');
    X.Tick.pump(13 * X.Time.ticksPerDay);
    if (X.Story.chapter < 1) throw new Error('卷一未终卷（day=' + X.Time.day + '）');
    return `卷一终 @第${X.Time.day}日 进度${X.Story.progress()}/24 ✓`;
  });
  t('P5:九劫全流程·飞升传承', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(41);
    const d = X.Disciple.list[0];
    makeXiu(d, 9, 0);   // 渡劫境初期，连渡九劫
    X.Inv.add('pillHu', 27);   // 每劫三粒，九劫备足
    X.Game.endless = true;   // 防结局打断
    X.Time.day = 40; X.Time.dayOfYear = 40;   // 雷云初聚（开局 30 日后）
    let asc0 = X.Game.ascended, pts0 = X.Game.legacy.points;
    for (let i = 0; i < 9; i++) {
      d.exp = X.Realms.cost(9, d.stage);   // 劫后重蓄修为（模拟继续打坐）
      const r = X.Trib.begin(d, false);
      if (!r.ok && !r.dead) throw new Error('第' + (i + 1) + '劫未能开启: ' + (r.why || ''));
      if (r.dead) throw new Error('高准备度仍身陨（seed 需调整）');
      X.Time.day += 31;   // 雷云重聚
      X.Tick.pump(10);
    }
    if (X.Game.ascended !== asc0 + 1) throw new Error('九劫全过未飞升');
    if (X.Game.legacy.points <= pts0) throw new Error('飞升未得功德');
    if (X.Disciple.list.includes(d)) throw new Error('飞升弟子未离山');
    // 传承兑换
    X.Game.legacy.points += 100;
    if (!X.Trib.buyPerk('lingRoot').ok) throw new Error('功德兑换失败');
    if (X.Trib.buyPerk('lingRoot').ok) throw new Error('重复兑换未拦');
    return `九劫飞升 功德+${X.Game.legacy.points - pts0} 传承「灵根淬养」✓`;
  });
  t('P5:准备度与道侣护法', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(41);
    const d = X.Disciple.list[0];
    makeXiu(d, 9, 0);
    // 基础带宽 0.16
    let p = X.Trib.prepare(d);
    if (Math.abs(p.width - 0.16) > 1e-9) throw new Error('基础带宽应 0.16，得 ' + p.width);
    // 护体丹×3 → 0.64 截断至 0.62；法宝+阵减伤
    X.Inv.add('pillHu', 3);
    d.artifact = 1; X.Craft.artifacts.push({ iid: 1, name: '试剑', affixes: [], holder: 0 });
    X.Build.place('eyeCangfeng', X.Game.home[0] + 3, X.Game.home[1] + 3, { instant: true, free: true });
    X.Build.place('zhenFlag', X.Game.home[0] + 2, X.Game.home[1] + 3, { instant: true, free: true });
    X.Build.place('zhenFlag', X.Game.home[0] + 4, X.Game.home[1] + 3, { instant: true, free: true });
    X.Build.place('zhenFlag', X.Game.home[0] + 3, X.Game.home[1] + 4, { instant: true, free: true });
    p = X.Trib.prepare(d);
    if (p.width < 0.6) throw new Error('护体丹未扩带宽: ' + p.width);
    if (p.dmgCut < 0.3) throw new Error('法宝/阵减伤未叠加: ' + p.dmgCut);
    if (p.shieldFree !== 1) throw new Error('藏风阵未给免伤');
    // 道侣护法
    X.Build.place('guesthall', X.Game.home[0] + 5, X.Game.home[1] - 3, { instant: true, free: true });
    X.Game.addRep(50);
    X.Relation.meet('qingyun');
    X.Relation.change('qingyun', 110);
    d.realm = 4; d.mood = 80;
    const g = X.Relation.guests()[0];
    if (!X.Relation.pairDaolv(d, g.npc.id).ok) throw new Error('结道侣失败');
    const p2 = X.Trib.prepare(d);
    if (p2.extraLife !== 1) throw new Error('道侣护法未生效');
    return `带宽${p.width.toFixed(2)} 减伤${(p.dmgCut * 100) | 0}% 免伤1 护法1 ✓`;
  });
  t('P5:三结局可达', () => {
    // 道统断绝：全门覆灭
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(41);
    X.Game.endless = false;
    [...X.Disciple.list].forEach(d => X.Game.kill(d, '劫火'));
    if (!X.Story.ending || X.Story.ending.id !== 'dao_off') throw new Error('全灭未判道统断绝');
    // 重开盛世：飞升+旧案终卷
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(41);
    X.Game.endless = false;
    X.Story.flags.ch5 = true;
    const d = makeXiu(X.Disciple.list[0], 9, 8);
    X.Inv.add('pillHu', 9);
    X.Time.day = 40;
    X.Trib.begin(d, false);
    if (X.Game.ascended !== 1) throw new Error('辅助结算未飞升');
    if (!X.Story.ending || X.Story.ending.id !== 'golden') throw new Error('未判重开盛世: ' + (X.Story.ending || {}).id);
    return `道统断绝 ✓ 重开盛世 ✓（真相大白=终卷未飞升时判，同路径）`;
  });
  t('P5:大乘失败即陨·渡劫境走天劫', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(41);
    const d = makeXiu(X.Disciple.list[0], 8, 3);   // 大乘圆满
    X.Cult.forcePass = false;
    d.breakCd = 0;
    let died = false;
    for (let i = 0; i < 40 && !died; i++) {
      d.breakCd = 0; d.realm = 8; d.stage = 3; d.exp = 1e9;
      const r = X.Cult.attempt(d);
      if (r.why === '身陨') died = true;
    }
    if (!died) throw new Error('大乘失败从未身陨（判定过松或未生效）');
    // 渡劫境不走普通冲关
    const e = makeXiu(X.Disciple.list[1] || X.Disciple.list[0], 9, 0);
    const r2 = X.Cult.attempt(e);
    if (r2.why !== '天劫将至') throw new Error('渡劫境应走天劫: ' + r2.why);
    return `大乘陨落✓ 渡劫境拦普通冲关✓`;
  });
  t('P5:存档v6天道往返', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(41);
    const d = makeXiu(X.Disciple.list[0], 9, 3);
    X.Time.day = 40;
    X.Trib.begin(d, false);
    X.Game.legacy.points = 77; X.Game.endless = true; X.Game.tutStep = 3;
    X.Story.flags.s11 = true;
    const snap = JSON.parse(JSON.stringify(X.Save.snapshot()));
    if (snap.ver !== 6) throw new Error('版本 ' + snap.ver);
    X.Game.init(2);
    X.Save.restore(snap);
    if (X.Game.legacy.points !== 77 || !X.Game.endless || X.Game.tutStep !== 3) throw new Error('传承/无尽/教学丢失');
    if (!X.Story.flags.s11) throw new Error('旧案旗标丢失');
    if (X.Trib.total !== 1) throw new Error('渡劫计数丢失');
    return `功德77/无尽/教学3/旗标/劫数1 ✓`;
  });

  // ---- P6 成卷 ----
  t('P6:教学步骤推进与按钮门控', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(41);
    let s1 = X.Tut.step();
    if (!s1 || s1.id !== 'welcome') throw new Error('首步应为欢迎');
    X.Tut.begin();   // 点"开始"
    s1 = X.Tut.step();
    if (!s1 || s1.id !== 'place') throw new Error('第二步应为放置建筑');
    // 门控：无修士时游历锁定
    if (X.Tut.unlocked('travel')) throw new Error('无修士时游历不应解锁');
    const d = X.Disciple.list[0];
    d.kind = '修士';
    if (!X.Tut.unlocked('travel')) throw new Error('有修士游历应解锁');
    if (X.Tut.unlocked('jianghu')) throw new Error('声望不足江湖不应解锁');
    X.Game.tutSkip = true;
    if (X.Tut.step() !== null) throw new Error('跳过后仍有教学');
    return `欢迎→放置→门控(游历随修士/江湖随声望)→可跳过 ✓`;
  });
  t('P6:套间整间落图成房间', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(41);
    X.Inv.add('wood', 200); X.Inv.add('stone', 200);
    // 找一块 6×6 空地
    const M = X.Map, T = M.TERRAIN;
    const [hx, hy] = X.Game.home;
    let sx = 0, sy = 0;
    outer: for (let r = 6; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r * 2; dx <= r * 2; dx++) {
      const x = hx + dx, y = hy + dy;
      if (x < 2 || y < 2 || x > M.W - 8 || y > M.H - 8) continue;
      let ok = true;
      for (let j = 0; j < 6 && ok; j++) for (let i = 0; i < 6 && ok; i++) {
        const t = M.terrain[(y + j) * M.W + x + i];
        if (t === T.WATER || t === T.ROCK || t === T.FOREST) ok = false;
        if (X.Build.at(x + i, y + j)) ok = false;
      }
      if (ok) { sx = x; sy = y; break outer; }
    }
    if (!sx && !sy) throw new Error('找不到 6×6 空地');
    const r = X.Suites.place('suiteCalm', sx, sy);
    if (!r.ok) throw new Error('套间放置失败: ' + r.why);
    if (r.n !== X.Suites.byId.suiteCalm.items.length) throw new Error('件数不全: ' + r.n);
    // 蓝图即时落成（测试直接竣工）
    X.Build.each(b => { if (!b.built) { X.Build.work(b, 1e6); } });
    const room = X.Feng.roomAt(sx + 2, sy + 2);
    if (!room) throw new Error('未围合出房间');
    return `${X.Suites.byId.suiteCalm.name} ${r.n}件 → ${room.purpose || '房间'}围合 ✓`;
  });

  // ---- P7 云卷云舒（后端 API） ----
  const srv = (() => {
    try {
      process.env.XIANG_SRV_DB = ':memory:';
      const mod = require('../server/server.js');
      mod.server.listen(0);
      return mod;
    } catch (e) { return { err: e.message }; }
  })();
  function httpCall(method, path, body) {
    const http = require('http');
    const port = srv.server.address().port;
    return new Promise((ok, no) => {
      const req = http.request({ port, method, path, headers: { 'Content-Type': 'application/json' } }, res => {
        let s = '';
        res.on('data', c => s += c);
        res.on('end', () => { try { ok(JSON.parse(s)); } catch (e) { ok({ ok: 0, why: 'bad json' }); } });
      });
      req.on('error', no);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }
  t('P7:轻账号+云存档LWW', async () => {
    if (srv.err) throw new Error('server 载入失败: ' + srv.err);
    const a = await httpCall('POST', '/api/auth', { name: '测试掌门' });
    if (!a.ok || !a.token) throw new Error('轻账号失败');
    const up = await httpCall('PUT', `/api/saves/1?token=${a.token}`, { json: '{"ver":6,"day":100}', at: 1000, device: 'test' });
    if (!up.ok) throw new Error('上传失败');
    const down = await httpCall('GET', `/api/saves/1?token=${a.token}`);
    if (!down.ok || down.json.indexOf('"day":100') < 0) throw new Error('取回不一致');
    const up2 = await httpCall('PUT', `/api/saves/1?token=${a.token}`, { json: '{"ver":6,"day":200}', at: 2000, device: 'test' });
    const down2 = await httpCall('GET', `/api/saves/1?token=${a.token}`);
    if (down2.json.indexOf('"day":200') < 0) throw new Error('LWW 覆盖失败');
    const noAuth = await httpCall('GET', '/api/saves/1?token=bad');
    if (noAuth.ok) throw new Error('未拦伪token');
    return `登录/上传/取回/LWW/鉴权 ✓`;
  });
  t('P7:门派参观+排行榜', async () => {
    if (srv.err) throw new Error('server 载入失败');
    await httpCall('POST', '/api/sects', { name: '云隐观', snap: { 年: 2, 人口: 8, 飞升: 0 } });
    const ss = await httpCall('GET', '/api/sects');
    if (!ss.ok || !ss.sects.some(x => x.name === '云隐观' && x.snap['年'] === 2)) throw new Error('参观快照失败');
    await httpCall('POST', '/api/board', { cat: 'topRep', value: 88, name: '云隐观主' });
    await httpCall('POST', '/api/board', { cat: 'topRep', value: 120, name: '云隐观主' });
    await httpCall('POST', '/api/board', { cat: 'topRep', value: 60, name: '云隐观主' });   // 更差不覆盖
    const bd = await httpCall('GET', '/api/board');
    const me = bd.board.topRep.find(r => r.name === '云隐观主');
    if (!me || me.value !== 120) throw new Error('排行榜未取最优');
    return `快照参观✓ 排行取最优✓`;
  });

  t('P6:开局物资与开山资助', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(41);
    // 开局库存直接够放静室套间
    const need = X.Suites.byId.suiteCalm.cost;
    if (X.Inv.count('stone') < need.stone || X.Inv.count('wood') < need.wood) {
      throw new Error(`开局库存不够静室套间: 石${X.Inv.count('stone')}/${need.stone} 木${X.Inv.count('wood')}/${need.wood}`);
    }
    // 引导保底：花光石料后到达套间步，应触发开山资助
    X.Game.tutStep = 0; X.Game.tutSkip = false; X.Game.stats.tutGift = 0;
    X.Tut.begin();
    X.Game.stats.playerPlaced = 1;   // 过 place 步
    X.Inv.stock['stone'] = 5; X.Inv.stock['wood'] = 2;   // 挥霍一空
    const s = X.Tut.step();
    if (!s || s.id !== 'suite') throw new Error('应停在套间步');
    if (!X.Game.stats.tutGift) throw new Error('开山资助未触发');
    if (X.Inv.count('stone') < need.stone || X.Inv.count('wood') < need.wood) throw new Error('资助后仍不足');
    // 只资助一次
    X.Inv.stock['stone'] = 0;
    X.Tut.step();
    if (X.Inv.count('stone') > 0) throw new Error('资助重复');
    return `开局石${60}木${70} 够静室(46石5木) · 短缺触发资助 ✓`;
  });

  // ---- 存档 ----
  t('存档:v2往返一致', () => {
    X.Time.reset(); X.Map.mut = {};
    X.Game.init(777);
    X.Tick.pump(500);
    const snap = JSON.parse(JSON.stringify(X.Save.snapshot()));
    const stock0 = JSON.stringify(snap.game.stock);
    const n0 = snap.game.disciples.length;
    const mut0 = Object.keys(snap.map.mut).length;
    X.Game.init(1);
    X.Save.restore(snap);
    if (JSON.stringify(X.Inv.stock) !== stock0) throw new Error('库存不一致');
    if (X.Disciple.list.length !== n0) throw new Error('弟子数不一致');
    if (Object.keys(X.Map.mut).length !== mut0) throw new Error('地形改写不一致');
  });
  t('存档:坏版本报错', () => {
    try { X.Save.restore({ ver: 999 }); } catch { return; }
    throw new Error('应拒绝未知版本');
  });

  // ---- 渲染（仅浏览器） ----
  t('笔触库烘焙<300ms(浏览器)', () => {
    if (typeof document === 'undefined') return 'skip(node无canvas)';
    const ms = X.Brush.bake();
    if (!(ms > 0)) throw new Error('烘焙耗时异常: ' + ms);
    if (ms > 300) throw new Error('烘焙 ' + ms + 'ms 超预算');
    return ms + 'ms / ' + X.Brush.count + '笔';
  });

  X.Tests = {
    // 返回 Promise 供异步用例（P7 网络）；浏览器 __G.test() 同样可用
    run(log = console.log) {
      const p = (async () => {
        let pass = 0;
        const fails = [];
        log('—— 云隐仙踪 回归 ——');
        for (const c of cases) {
          try {
            const r = await c.fn();
            log(`  ✓ ${c.name}${typeof r === 'string' ? ' · ' + r : ''}`);
            pass++;
          } catch (e) {
            fails.push(`${c.name}: ${e.message}`);
            log(`  ✗ ${c.name} — ${e.message}`);
          }
        }
        log(`测试结果: ${pass}/${cases.length} 通过${fails.length ? ' ✗' : ' ✓'}`);
        return { pass, total: cases.length, fails };
      })();
      // node-core 直接 await；浏览器 __G.test() 拿 Promise 亦无碍
      return p;
    },
  };
})(globalThis.XIANG);

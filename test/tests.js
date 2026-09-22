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
    run(log = console.log) {
      let pass = 0;
      const fails = [];
      log('—— 云隐仙踪 回归 ——');
      for (const c of cases) {
        try {
          const r = c.fn();
          log(`  ✓ ${c.name}${typeof r === 'string' ? ' · ' + r : ''}`);
          pass++;
        } catch (e) {
          fails.push(`${c.name}: ${e.message}`);
          log(`  ✗ ${c.name} — ${e.message}`);
        }
      }
      log(`测试结果: ${pass}/${cases.length} 通过${fails.length ? ' ✗' : ' ✓'}`);
      return { pass, total: cases.length, fails };
    },
  };
})(globalThis.XIANG);

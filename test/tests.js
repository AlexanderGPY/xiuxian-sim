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

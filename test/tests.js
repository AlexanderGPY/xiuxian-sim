/* 回归套件：浏览器 __G.test() 与 node test/node-core.js 共用同一份用例 */
(function (X) {
  const cases = [];
  const t = (name, fn) => cases.push({ name, fn });

  t('泵帧360日无崩溃', () => {
    X.Time.reset();
    const d0 = X.Time.day;
    X.Tick.pump(360 * X.Time.ticksPerDay);
    if (X.Time.day !== d0 + 360) throw new Error(`day=${X.Time.day} 应为 ${d0 + 360}`);
  });

  t('历法一致性(季节/年)', () => {
    X.Time.reset();
    X.Tick.pump(90 * X.Time.ticksPerDay);
    if (X.Time.season !== 1) throw new Error('90日后应为夏(1)，得 ' + X.Time.season);
    X.Tick.pump(270 * X.Time.ticksPerDay);
    if (X.Time.season !== 0 || X.Time.year !== 2) throw new Error(`一年后应为第二年春，得 ${X.Time.year}年${X.Time.season}季`);
  });

  t('时辰事件触发', () => {
    X.Time.reset();
    let shichens = 0;
    const fn = () => shichens++;
    X.Bus.on('time:shichen', fn);
    X.Tick.pump(X.Time.ticksPerDay);
    X.Bus.off('time:shichen', fn);
    if (shichens !== 12) throw new Error('一日应广播12个时辰，得 ' + shichens);
  });

  t('种子随机可复现', () => {
    const a = X.Rng(42), b = X.Rng(42);
    for (let i = 0; i < 100; i++) if (a.f() !== b.f()) throw new Error('同种子序列不一致');
  });

  t('地图:五行和恰为100', () => {
    X.Map.generate(12345);
    let bad = 0;
    for (let i = 0; i < X.Map.N; i++) {
      const s = X.Map.elem[i * 5] + X.Map.elem[i * 5 + 1] + X.Map.elem[i * 5 + 2] + X.Map.elem[i * 5 + 3] + X.Map.elem[i * 5 + 4];
      if (s !== 100) bad++;
    }
    if (bad) throw new Error(bad + ' 格五行和≠100');
  });

  t('地图:灵脉4处且注入灵韵', () => {
    X.Map.generate(12345);
    if (X.Map.veins.length !== 4) throw new Error('灵脉数=' + X.Map.veins.length);
    let qiSum = 0;
    for (let i = 0; i < X.Map.N; i++) qiSum += X.Map.qi[i];
    if (qiSum < 400) throw new Error('灵韵总量过低: ' + qiSum);
  });

  t('地图:同种子可复现', () => {
    const A = X.Map.generate(777), tA = Array.from(A.terrain), eA = Array.from(A.elem);
    const B = X.Map.generate(777);
    for (let i = 0; i < A.N; i++) if (tA[i] !== B.terrain[i]) throw new Error('地形不一致 @' + i);
    for (let i = 0; i < eA.length; i++) if (eA[i] !== B.elem[i]) throw new Error('五行不一致 @' + i);
  });

  t('存档:快照往返一致', () => {
    X.Map.generate(999);
    X.Time.reset();
    X.Tick.pump(1234);
    const snap = JSON.parse(JSON.stringify(X.Save.snapshot()));
    X.Map.generate(1);
    X.Time.reset();
    X.Save.restore(snap);
    if (X.Time.tick !== snap.time.tick || X.Time.day !== snap.time.day) throw new Error('时间不一致');
    if (X.Map.seed !== snap.map.seed) throw new Error('地图种子不一致');
  });

  t('存档:坏版本报错', () => {
    try { X.Save.restore({ ver: 999 }); } catch { return; }
    throw new Error('应拒绝未知版本');
  });

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

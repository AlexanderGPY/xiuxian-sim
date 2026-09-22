/* __G 调试钩子：控制台即调试台 */
(function (X) {
  globalThis.__G = {
    X, version: X.VERSION,
    speed: v => X.Tick.setSpeed(v),
    pause: () => X.Tick.stop(),
    run: () => X.Tick.start(),
    date: () => X.Time.dateString(),
    pumpDays(d) { X.Tick.pump(d * X.Time.ticksPerDay); return X.Time.dateString(); },
    regenMap(seed) { X.Map.generate(seed); X.Scene && X.Scene.render(); return X.Map.seed; },
    test: () => (X.Tests ? X.Tests.run() : 'no tests'),
    stats: () => (X.Canvas ? X.Canvas.stats() : 'no canvas'),
    // P1 经营调试
    stock: () => ({ ...X.Inv.stock, 人口: X.Disciple.list.length, 心境: X.Game.avgMood() }),
    add: (item = 'wood', n = 50) => { X.Inv.add(item, n); return __G.stock(); },
    build: (defId, x, y, instant = false) => X.Build.place(defId, x, y, { instant, free: instant }),
    disciples: () => X.Disciple.list.map(d => `${d.name} ${d.state} 心境${Math.round(d.mood)} 饿${Math.round(d.needs.hunger)}`),
  };
})(globalThis.XIANG);

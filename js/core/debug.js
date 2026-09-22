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
  };
})(globalThis.XIANG);

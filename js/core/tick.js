/* 固定步长模拟节拍：20tps 与渲染解耦；支持 0/1/2/4 倍速与同步泵帧（测试/跳时） */
(function (X) {
  const TPS = 20, MS = 1000 / TPS;
  const fns = new Set();
  let running = false, speed = 1, acc = 0, last = 0, count = 0;

  function step() { count++; for (const fn of fns) fn(); }
  function loop() {
    if (!running) return;
    const now = Date.now();
    acc += Math.min(now - last, 200) * speed;
    last = now;
    let n = 0;
    while (acc >= MS && n < 80) { step(); acc -= MS; n++; }
    setTimeout(loop, 16);
  }

  X.Tick = {
    TPS,
    on(fn) { fns.add(fn); return fn; },
    off(fn) { fns.delete(fn); },
    get speed() { return speed; },
    get count() { return count; },
    setSpeed(v) { speed = v; X.Bus.emit('tick:speed', v); },
    start() { if (running) return; running = true; acc = 0; last = Date.now(); setTimeout(loop, 16); X.Bus.emit('tick:run', true); },
    stop() { running = false; X.Bus.emit('tick:run', false); },
    setRunning(on) { on ? X.Tick.start() : X.Tick.stop(); },
    pump(n) { for (let i = 0; i < n; i++) step(); },
  };
})(globalThis.XIANG);

/* 轻量事件总线：跨模块通知（time:day / story:hook 等） */
(function (X) {
  const map = new Map();
  X.Bus = {
    on(ev, fn) { if (!map.has(ev)) map.set(ev, []); map.get(ev).push(fn); return fn; },
    off(ev, fn) { const l = map.get(ev); if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
    emit(ev, data) { const l = map.get(ev); if (l) for (const fn of l.slice()) fn(data); },
  };
})(globalThis.XIANG);

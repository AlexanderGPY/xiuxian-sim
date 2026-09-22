/* 存档：版本化 JSON 快照，localStorage 三槽 + 导出文本。
   P0 只存时间与地图种子（地图可由种子重建）；后续期增量加大物件。 */
(function (X) {
  const VER = 1;
  const KEY = s => `xiang_save_${s}`;
  X.Save = {
    VER,
    snapshot() {
      return {
        ver: VER, at: Date.now(),
        time: X.Time.snapshot(),
        map: { seed: X.Map.seed },
      };
    },
    restore(o) {
      if (!o || o.ver !== VER) throw new Error('存档版本不符: ' + (o && o.ver));
      X.Time.restore(o.time);
      X.Map.generate(o.map.seed);
    },
    save(slot = 1) { localStorage.setItem(KEY(slot), JSON.stringify(X.Save.snapshot())); },
    load(slot = 1) {
      const s = localStorage.getItem(KEY(slot));
      if (!s) return false;
      X.Save.restore(JSON.parse(s));
      return true;
    },
    slots() {
      return [1, 2, 3].map(i => {
        const s = localStorage.getItem(KEY(i));
        try { return s ? JSON.parse(s) : null; } catch { return null; }
      });
    },
    exportText: () => JSON.stringify(X.Save.snapshot()),
    importText(t) { X.Save.restore(JSON.parse(t)); },
  };
})(globalThis.XIANG);

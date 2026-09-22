/* 存档 v3：时间 + 地图(种子/地形改写) + 经营 + 修行（境界/道典/寿元）。
   v1/v2 旧档自动迁移（缺失字段走默认值）。 */
(function (X) {
  const VER = 3;
  const KEY = s => `xiang_save_${s}`;
  X.Save = {
    VER,
    snapshot() {
      return {
        ver: VER, at: Date.now(),
        time: X.Time.snapshot(),
        map: { seed: X.Map.seed, mut: { ...X.Map.mut } },
        game: X.Game.snapshot(),
      };
    },
    restore(o) {
      if (!o) throw new Error('空存档');
      X.Time.restore(o.time);
      X.Map.mut = (o.map && o.map.mut) || {};
      X.Map.generate(o.map ? o.map.seed : undefined);
      if (o.ver >= 2 && o.game) X.Game.restore(o.game);
      else X.Game.init();   // v1 → 同图新开局
    },
    save(slot = 1) {
      try { localStorage.setItem(KEY(slot), JSON.stringify(X.Save.snapshot())); return true; }
      catch (e) { console.warn('存档失败', e); return false; }
    },
    load(slot = 1) {
      let s;
      try { s = localStorage.getItem(KEY(slot)); } catch { return false; }
      if (!s) return false;
      X.Save.restore(JSON.parse(s));
      return true;
    },
    slots() {
      return [1, 2, 3, 'auto'].map(i => {
        let s;
        try { s = localStorage.getItem(KEY(i)); } catch { s = null; }
        try { return s ? JSON.parse(s) : null; } catch { return null; }
      });
    },
    exportText: () => JSON.stringify(X.Save.snapshot()),
    importText(t) { X.Save.restore(JSON.parse(t)); },
  };
})(globalThis.XIANG);

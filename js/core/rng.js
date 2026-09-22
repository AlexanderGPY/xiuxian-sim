/* 种子随机（mulberry32）：地图/事件/笔触全部走种子，存档可复现 */
(function (X) {
  function Rng(seed) {
    let s = (seed >>> 0) || 1;
    const next = () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      seed,
      f: (a = 0, b = 1) => a + (b - a) * next(),
      i: (a, b) => a + Math.floor(next() * (b - a + 1)),
      chance: p => next() < p,
      pick: arr => arr[Math.floor(next() * arr.length)],
      shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      },
    };
  }
  X.Rng = Rng;
  X.rng = Rng(Date.now() % 2 ** 31);
})(globalThis.XIANG);

/* 轻量增益：限时 buff 与一次性效果作用到弟子。 */
(function (X) {
  const B = {};
  B.add = function (d, key, amt, days) {
    d.buffs = d.buffs || [];
    const until = X.Time.day + days;
    const ex = d.buffs.find(b => b.k === key);
    if (ex) { ex.amt = Math.max(ex.amt, amt); ex.until = Math.max(ex.until, until); }
    else d.buffs.push({ k: key, amt, until });
  };
  B.get = function (d, key) {
    let v = 0;
    if (d.buffs) d.buffs = d.buffs.filter(b => b.until > X.Time.day);
    if (d.buffs) for (const b of d.buffs) if (b.k === key) v += b.amt;
    return v;
  };
  X.Buffs = B;
})(globalThis.XIANG);

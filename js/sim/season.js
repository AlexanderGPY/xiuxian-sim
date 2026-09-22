/* 节气：按日轮转触发 12 节气事件；同时结算农作与季节增益到期。 */
(function (X) {
  X.Bus.on('time:day', () => {
    const doy = X.Time.dayOfYear;   // 0..359
    X.Farm.onDay();

    const buff = X.Solar.buff;
    if (buff.until && X.Time.day >= buff.until) {
      buff.growthMult = 1; buff.yieldMult = 1; buff.cold = 0; buff.until = 0;
    }

    for (const t of X.Solar.TERMS) {
      if (t.d - 1 !== doy) continue;
      const G = X.Game;
      G.log(`【节气·${t.n}】${t.desc}`);
      switch (t.e) {
        case 'rain': buff.growthMult = 1.5; buff.until = X.Time.day + 5; break;
        case 'rain2': buff.growthMult = 2.0; buff.until = X.Time.day + 5; X.Inv.add('grain', 10); break;
        case 'meteor': X.Inv.add('stone', 15); G.log('天火流星坠落，拾得石料十五'); break;
        case 'harvest': buff.yieldMult = 1.2; buff.until = X.Time.day + 10; break;
        case 'frost':
          X.Build.each(b => { if (b.farm && b.farm.planted && !b.farm.ready) b.farm.prog = Math.max(0, b.farm.prog - 3); });
          break;
        case 'visit': G.tryVisitor(t.n); break;
        case 'mood': X.Disciple.list.forEach(d => { d.moodEv += 8; }); break;
        case 'mood2': X.Disciple.list.forEach(d => { d.moodEv += 14; }); break;
        case 'cold': buff.cold = 1; buff.until = X.Time.day + 10; break;
      }
      X.Bus.emit('solar:term', t);
    }
  });
})(globalThis.XIANG);

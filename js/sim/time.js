/* 时辰历法：240 tick=1时辰，12时辰=1日，90日=1季，360日=1年。
   时间只推进与广播，不做任何游戏逻辑——各系统自行订阅 time:* 事件。 */
(function (X) {
  const SHICHEN_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const T = {
    TICKS_PER_SHICHEN: 240,
    SHICHEN_PER_DAY: 12,
    DAY_PER_SEASON: 90,
    SEASONS: ['春', '夏', '秋', '冬'],
    tick: 0, day: 1, shichen: 0, dayOfYear: 0, year: 1,
  };
  T.ticksPerDay = T.TICKS_PER_SHICHEN * T.SHICHEN_PER_DAY;
  Object.defineProperty(T, 'season', { get() { return Math.min(3, Math.floor(this.dayOfYear / this.DAY_PER_SEASON)); } });
  T.shichenName = () => SHICHEN_NAMES[T.shichen];
  T.dateString = () => `第${T.year}年${T.SEASONS[T.season]}季 第${(T.dayOfYear % 90) + 1}日 ${T.shichenName()}时`;

  function onTick() {
    T.tick++;
    if (T.tick % T.TICKS_PER_SHICHEN !== 0) return;
    T.shichen++;
    X.Bus.emit('time:shichen', T.shichen);
    if (T.shichen < T.SHICHEN_PER_DAY) return;
    T.shichen = 0; T.day++; T.dayOfYear++;
    X.Bus.emit('time:day', T.day);
    if (T.dayOfYear % T.DAY_PER_SEASON === 0) X.Bus.emit('time:season', T.season);
    if (T.dayOfYear >= 360) { T.dayOfYear = 0; T.year++; X.Bus.emit('time:year', T.year); }
  }
  X.Tick.on(onTick);

  T.snapshot = () => ({ tick: T.tick, day: T.day, shichen: T.shichen, dayOfYear: T.dayOfYear, year: T.year });
  T.restore = o => { T.tick = o.tick; T.day = o.day; T.shichen = o.shichen; T.dayOfYear = o.dayOfYear; T.year = o.year; };
  T.reset = () => T.restore({ tick: 0, day: 1, shichen: 0, dayOfYear: 0, year: 1 });
  X.Time = T;
})(globalThis.XIANG);

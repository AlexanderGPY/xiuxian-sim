/* node 端核心回归（含 P1 经营全模拟，不含渲染/UI）：npm test */
const fs = require('fs');
const path = require('path');

const FILES = [
  'js/core/boot.js',
  'js/core/rng.js',
  'js/core/bus.js',
  'js/core/tick.js',
  'js/sim/time.js',
  'js/sim/map.js',
  'js/db/items.js',
  'js/db/buildings.js',
  'js/db/realms.js',
  'js/db/scriptures.js',
  'js/db/solar.js',
  'js/sim/path.js',
  'js/sim/inventory.js',
  'js/sim/build.js',
  'js/sim/fengshui.js',
  'js/sim/cultivate.js',
  'js/sim/farm.js',
  'js/sim/disciple.js',
  'js/sim/work.js',
  'js/sim/season.js',
  'js/sim/game.js',
  'js/core/save.js',
  'test/tests.js',
];

for (const f of FILES) {
  eval(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
}

const r = XIANG.Tests.run(m => console.log(m));
process.exit(r.fails.length ? 1 : 0);

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
  'js/db/recipes.js',
  'js/db/solar.js',
  'js/db/world.js',
  'js/db/npcs.js',
  'js/db/events.js',
  'js/db/story.js',
  'js/sim/path.js',
  'js/sim/inventory.js',
  'js/sim/build.js',
  'js/sim/fengshui.js',
  'js/sim/formation.js',
  'js/sim/cultivate.js',
  'js/sim/buff.js',
  'js/sim/craft.js',
  'js/sim/spiritplant.js',
  'js/sim/combat.js',
  'js/sim/travel.js',
  'js/sim/relation.js',
  'js/sim/auction.js',
  'js/sim/tribulation.js',
  'js/sim/story.js',
  'js/ui/tutorial.js',
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

(async () => {
  const r = await XIANG.Tests.run(m => console.log(m));
  process.exit(r.fails.length ? 1 : 0);
})();

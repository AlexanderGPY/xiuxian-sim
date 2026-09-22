/* node 端核心回归（不含渲染）：npm test 或 node test/node-core.js */
const fs = require('fs');
const path = require('path');

const FILES = [
  'js/core/boot.js',
  'js/core/rng.js',
  'js/core/bus.js',
  'js/core/tick.js',
  'js/sim/time.js',
  'js/sim/map.js',
  'js/core/save.js',
  'test/tests.js',
];

for (const f of FILES) {
  eval(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
}

const r = XIANG.Tests.run(m => console.log(m));
process.exit(r.fails.length ? 1 : 0);

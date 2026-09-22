/* 山门地图（纯数据，渲染独立）：80×60 值噪声地形 + 五行底属性(每格和=100) + 灵韵/灵脉。
   地图由种子完全决定——存档只存种子即可重建。 */
(function (X) {
  const W = 80, H = 60, N = W * H;
  const TERRAIN = { WATER: 0, SOIL: 1, GRASS: 2, FOREST: 3, ROCK: 4 };
  const ELEM = ['金', '木', '水', '火', '土'];
  // 地形 → 五行偏置（岩=金、林=木、水=水、草野=火、壤=土）
  const BIAS = { 0: 2, 1: 4, 2: 3, 3: 1, 4: 0 };

  const M = {
    W, H, N, TERRAIN, ELEM,
    terrain: new Uint8Array(N), elem: new Uint8Array(N * 5), qi: new Uint8Array(N),
    veins: [], seed: 0,
    mut: {},   // 采集造成的地形改写 {tileIndex: 新地形}，存档携带
  };
  M.setTile = function (x, y, t) {
    const i = y * W + x;
    M.terrain[i] = t;
    M.mut[i] = t;
    X.Bus.emit('map:change', { x, y, t });
  };

  function noiseField(rng, cell) {
    const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2;
    const g = new Float32Array(gw * gh);
    for (let i = 0; i < g.length; i++) g[i] = rng.f();
    const sm = t => t * t * (3 - 2 * t);
    return (x, y) => {
      const fx = x / cell, fy = y / cell;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = sm(fx - x0), ty = sm(fy - y0);
      const a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1];
      const c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
      return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    };
  }

  M.generate = function generate(seed) {
    seed = seed === undefined ? X.rng.i(1, 1e9) : seed;
    const rng = X.Rng(seed);
    const n1 = noiseField(rng, 14), n2 = noiseField(rng, 6);
    M.seed = seed;
    M.veins.length = 0;

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const e = n1(x, y) * 0.7 + n2(x, y) * 0.3;
      let t;
      if (e < 0.26) t = TERRAIN.WATER;
      else if (e < 0.44) t = TERRAIN.SOIL;
      else if (e < 0.63) t = TERRAIN.GRASS;
      else if (e < 0.81) t = TERRAIN.FOREST;
      else t = TERRAIN.ROCK;
      M.terrain[i] = t;

      // 五行底属性：随机五行 + 地形偏置，归一到和恰为 100
      const w = [rng.i(4, 34), rng.i(4, 34), rng.i(4, 34), rng.i(4, 34), rng.i(4, 34)];
      w[BIAS[t]] += 36;
      const s = w[0] + w[1] + w[2] + w[3] + w[4];
      let sum = 0, maxK = 0;
      for (let k = 0; k < 5; k++) {
        const v = Math.round(w[k] * 100 / s);
        M.elem[i * 5 + k] = v; sum += v;
        if (v > M.elem[i * 5 + maxK]) maxK = k;
      }
      M.elem[i * 5 + maxK] += 100 - sum;   // 舍入误差归到最大项
      M.qi[i] = 0;
    }

    // 灵脉 4 处：互相拉开距离，向周边注入灵韵（半径 ~12 格衰减）
    const spots = [];
    for (let tries = 0; tries < 600 && spots.length < 4; tries++) {
      const x = rng.i(10, W - 11), y = rng.i(10, H - 11);
      if (spots.every(p => Math.hypot(p[0] - x, p[1] - y) >= 20)) spots.push([x, y]);
    }
    for (const [vx, vy] of spots) {
      M.veins.push({ x: vx, y: vy, el: rng.i(0, 4) });
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = Math.max(0, Math.round(10 - Math.hypot(x - vx, y - vy) * 0.8));
        const i = y * W + x;
        if (v > M.qi[i]) M.qi[i] = v;
      }
    }
    // 采集造成的地形改写（读档后重建）
    for (const i in M.mut) M.terrain[i] = M.mut[i];
    return M;
  };

  M.at = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    const i = y * W + x;
    return { t: M.terrain[i], qi: M.qi[i], el: Array.from(M.elem.subarray(i * 5, i * 5 + 5)) };
  };

  X.Map = M;
})(globalThis.XIANG);

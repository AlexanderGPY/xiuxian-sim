/* 笔触库：启动时固定种子烘焙 4 类×3 尺寸×12 变体 ≈144 个笔触 sprite 到离屏 atlas，
   运行时只取用不重算（性能与像素 sprite 同级）。
   中锋 zhong（圆头收尖线）/ 侧锋 ce（扫排）/ 点苔 dian（点簇）/ 飞白 feibai（枯笔）。 */
(function (X) {
  const K = X.Ink;
  const SIZES = {
    zhong:  { len: [18, 34, 60], w: [3, 5, 8] },
    ce:     { len: [24, 44, 76], w: [7, 12, 18] },
    dian:   { r: [3, 5, 8] },
    feibai: { len: [20, 40, 70], w: [4, 7, 10] },
  };
  const VARIANTS = 12, PAD = 4;
  const B = { atlas: null, ms: 0, count: 0, items: {} };

  // ---- 几何工具 ----
  function quadPts(p0, p1, p2, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      pts.push({ x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y });
    }
    return pts;
  }
  // 沿路径按宽度函数填多边形（宽度沿 t 变化，边缘带毛糙抖动）
  function fillStroke(g, rng, pts, wFn, color, alpha, ragged = 1) {
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
      let nx = -(q.y - o.y), ny = q.x - o.x;
      const l = Math.hypot(nx, ny) || 1;
      nx /= l; ny /= l;
      const t = i / (pts.length - 1);
      const w = Math.max(0.4, wFn(t) / 2 + rng.f(-0.5, 0.5) * ragged);
      L.push([p.x + nx * w, p.y + ny * w]);
      R.push([p.x - nx * w, p.y - ny * w]);
    }
    g.beginPath();
    g.moveTo(L[0][0], L[0][1]);
    for (const [x, y] of L) g.lineTo(x, y);
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.closePath();
    g.fillStyle = K.a(color, alpha);
    g.fill();
  }

  // ---- 四类笔触生成（各自小画布，再打包进 atlas）----
  function genZhong(rng, len, w) {
    const c = document.createElement('canvas');
    c.width = len + PAD * 2; c.height = w * 3 + PAD * 2;
    const g = c.getContext('2d');
    const a = rng.f(-0.25, 0.25);
    const pts = quadPts({ x: PAD, y: c.height / 2 + a * 6 },
      { x: c.width / 2, y: c.height / 2 + rng.f(-4, 4) },
      { x: c.width - PAD, y: c.height / 2 - a * 6 }, 14);
    const env = t => Math.sin(Math.PI * t) * w + 0.6;   // 两端收尖
    fillStroke(g, rng, pts, env, K.jiao, 0.9, 0.8);
    fillStroke(g, rng, pts, t => env(t) * 1.7, K.nong, 0.22, 1.2);  // 墨晕
    return c;
  }
  function genCe(rng, len, w) {
    const c = document.createElement('canvas');
    c.width = len + PAD * 2; c.height = w + PAD * 2;
    const g = c.getContext('2d');
    const pts = quadPts({ x: PAD, y: c.height / 2 }, { x: c.width * rng.f(0.3, 0.7), y: c.height / 2 + rng.f(-3, 3) },
      { x: c.width - PAD, y: c.height / 2 + rng.f(-2, 2) }, 12);
    const env = t => w * (t < 0.2 ? t / 0.2 : 1 - (t - 0.2) * 0.55);  // 快起缓收的侧锋
    fillStroke(g, rng, pts, env, K.zhong, 0.75, 1.6);
    fillStroke(g, rng, pts, t => env(t) * 0.4, K.jiao, 0.5, 1);       // 笔根浓痕
    return c;
  }
  function genDian(rng, r) {
    const c = document.createElement('canvas');
    c.width = c.height = r * 2.6 + PAD * 2;
    const g = c.getContext('2d');
    const cx = c.width / 2, cy = c.height / 2;
    for (const [ox, oy, rr, al] of [[0, 0, r, 0.9], [r * 0.7, -r * 0.4, r * 0.45, 0.7], [-r * 0.5, r * 0.6, r * 0.35, 0.55]]) {
      g.beginPath();
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rad = rr * (1 + rng.f(-0.3, 0.3));
        const px = cx + ox + Math.cos(a) * rad, py = cy + oy + Math.sin(a) * rad * 0.85;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.closePath();
      g.fillStyle = K.a(rng.chance(0.5) ? K.jiao : K.nong, al);
      g.fill();
    }
    return c;
  }
  function genFeibai(rng, len, w) {
    const c = document.createElement('canvas');
    c.width = len + PAD * 2; c.height = w + PAD * 2;
    const g = c.getContext('2d');
    let x = PAD, y = c.height / 2;
    const drift = rng.f(-0.08, 0.08);
    while (x < c.width - PAD) {
      const t = (x - PAD) / len;
      const seg = rng.f(2, 6), gap = rng.f(1, 3.5);
      g.strokeStyle = K.a(rng.chance(0.3) ? K.jiao : K.zhong, rng.f(0.35, 0.9));
      g.lineWidth = Math.max(0.5, w * (1 - t * 0.6) * rng.f(0.12, 0.3));
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + seg, y + drift * seg * 2);
      g.stroke();
      x += seg + gap; y += drift * seg;
    }
    return c;
  }
  const GENS = { zhong: genZhong, ce: genCe, dian: genDian, feibai: genFeibai };

  B.bake = function bake(seed = 11) {
    if (typeof document === 'undefined') return 0;   // node 环境跳过
    const t0 = performance.now();
    const rng = X.Rng(seed);
    const AW = 2048, AH = 1024;
    const atlas = document.createElement('canvas');
    atlas.width = AW; atlas.height = AH;
    const ag = atlas.getContext('2d');
    B.items = {};
    const flat = [];
    for (const kind of Object.keys(GENS)) {
      for (let size = 0; size < 3; size++) {
        const key = kind + size, arr = [];
        for (let v = 0; v < VARIANTS; v++) {
          const s = SIZES[kind];
          const c = GENS[kind](rng, s.len ? s.len[size] : s.r[size], s.len ? s.w[size] : s.r[size]);
          arr.push({ c, x: 0, y: 0, w: c.width, h: c.height, kind, size, v });
          flat.push(arr[arr.length - 1]);
        }
        B.items[key] = arr;
      }
    }
    // 货架打包：按高排序逐行摆放
    flat.sort((a, b) => b.h - a.h);
    let x = 0, y = 0, rowH = 0;
    for (const s of flat) {
      if (x + s.w + 2 > AW) { x = 0; y += rowH + 2; rowH = 0; }
      ag.drawImage(s.c, x, y);
      s.x = x; s.y = y;
      x += s.w + 2; rowH = Math.max(rowH, s.h);
    }
    B.atlas = atlas;
    B.count = flat.length;
    B.ms = Math.round(performance.now() - t0);
    return B.ms;
  };

  // 取用：同 (kind,size) 下按 i 轮转变体，保证同格重绘稳定
  B.get = (kind, size, i = 0) => {
    const arr = B.items[kind + size];
    return arr ? arr[((i % arr.length) + arr.length) % arr.length] : null;
  };
  X.Brush = B;
})(globalThis.XIANG);

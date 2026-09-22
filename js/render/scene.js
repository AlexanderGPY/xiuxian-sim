/* P0 场景：地图 → 水墨世界图（离屏，一次性绘制）。
   画法：纸上留白为主——林=点苔簇、岩=侧锋皴、草=短扫、水=留白+断续波纹、
   灵脉=朱砂印、顶部=淡墨远山两层。每格用坐标哈希取种子，重绘稳定。 */
(function (X) {
  const T = 14;   // 每格世界像素
  const S = { world: null };

  function hash(x, y, seed) {
    let h = (x * 73856093) ^ (y * 19349663) ^ (seed * 83492791);
    h = (h ^ (h >>> 13)) * 0x5bd1e995;
    return (h ^ (h >>> 15)) >>> 0;
  }
  // 从 atlas 引一笔：旋转/缩放/透明度
  function blit(g, spr, x, y, rot = 0, alpha = 1, scale = 1) {
    if (!spr) return;
    g.save();
    g.translate(x, y);
    if (rot) g.rotate(rot);
    g.globalAlpha = alpha;
    g.drawImage(X.Brush.atlas, spr.x, spr.y, spr.w, spr.h,
      -spr.w * scale / 2, -spr.h * scale / 2, spr.w * scale, spr.h * scale);
    g.restore();
  }

  S.render = function render() {
    const M = X.Map;
    const c = document.createElement('canvas');
    c.width = M.W * T; c.height = M.H * T;
    const g = c.getContext('2d');

    // 远山两层（画外意境装饰）
    const rr = X.Rng((M.seed ^ 0x9e37) >>> 0);
    for (const [base, amp, col, al] of [[34, 22, X.Ink.qing, 0.5], [66, 26, X.Ink.dan, 0.35]]) {
      g.beginPath();
      g.moveTo(0, 0);
      let y = base + rr.f(-amp * 0.4, amp * 0.4);
      for (let x = 0; x <= c.width; x += 10) {
        y += rr.f(-5, 5);
        y = Math.max(base - amp, Math.min(base + amp, y));
        g.lineTo(x, y);
      }
      g.lineTo(c.width, 0);
      g.closePath();
      g.fillStyle = X.Ink.a(col, al);
      g.fill();
    }
    // 山脊上点缀侧锋
    for (let i = 0; i < 26; i++) {
      blit(g, X.Brush.get('ce', rr.chance(0.5) ? 0 : 1, i), rr.f(0, c.width), rr.f(30, 80), rr.f(-0.5, 0.5), 0.5);
    }

    // 逐格落墨
    const TR = M.TERRAIN;
    for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) {
      const i = y * M.W + x, t = M.terrain[i];
      const rng = X.Rng(hash(x, y, M.seed));
      const cx = x * T + T / 2, cy = y * T + T / 2;
      if (t === TR.WATER) {
        // 留白 + 断续波纹；邻岸画岸线
        if (rng.chance(0.28)) blit(g, X.Brush.get('zhong', 0, rng.i(0, 99)), cx, cy, rng.f(-0.06, 0.06), 0.35);
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dy] of nb) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= M.W || ny >= M.H) continue;
          if (M.terrain[ny * M.W + nx] !== TR.WATER) {
            blit(g, X.Brush.get('zhong', 1, rng.i(0, 99)),
              cx + dx * T / 2, cy + dy * T / 2, Math.abs(dx) ? Math.PI / 2 : 0, 0.55);
          }
        }
      } else if (t === TR.SOIL) {
        if (rng.chance(0.1)) blit(g, X.Brush.get('dian', 0, rng.i(0, 99)), cx + rng.f(-4, 4), cy + rng.f(-4, 4), 0, 0.4);
      } else if (t === TR.GRASS) {
        for (let k = 0; k < 3; k++) {
          blit(g, X.Brush.get('ce', 0, rng.i(0, 99)), cx + rng.f(-5, 5), cy + rng.f(-4, 4), rng.f(-0.5, 0.5), 0.5);
        }
      } else if (t === TR.FOREST) {
        blit(g, X.Brush.get('zhong', 0, rng.i(0, 99)), cx + rng.f(-2, 2), cy + 4, Math.PI / 2 + rng.f(-0.2, 0.2), 0.9);  // 干
        const lush = M.qi[i] >= 4 ? 1 : 0;
        for (let k = 0; k < 2 + lush; k++) {
          blit(g, X.Brush.get('dian', k === 0 ? 1 : 0, rng.i(0, 99)),
            cx + rng.f(-3, 3), cy - 2 + rng.f(-3, 3), 0, k === 0 ? 0.85 : 0.6);
        }
      } else if (t === TR.ROCK) {
        blit(g, X.Brush.get('ce', 1, rng.i(0, 99)), cx, cy, rng.f(-0.6, 0.6), 0.7);
        for (let k = 0; k < 2; k++) {
          blit(g, X.Brush.get('ce', 0, rng.i(0, 99)), cx + rng.f(-5, 5), cy + rng.f(-4, 4), rng.f(-0.9, 0.9), 0.45);  // 皴
        }
      }
    }

    // 灵脉：朱砂印记（双环+心点+四芒）
    for (let vi = 0; vi < M.veins.length; vi++) {
      const v = M.veins[vi];
      const cx = v.x * T + T / 2, cy = v.y * T + T / 2;
      g.strokeStyle = X.Ink.a(X.Ink.zhu, 0.9);
      g.lineWidth = 2;
      g.beginPath(); g.arc(cx, cy, 9, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = X.Ink.a(X.Ink.zhu, 0.45);
      g.lineWidth = 1;
      g.beginPath(); g.arc(cx, cy, 13, 0, Math.PI * 2); g.stroke();
      g.fillStyle = X.Ink.zhu;
      g.beginPath(); g.arc(cx, cy, 2.4, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
        g.lineTo(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15);
        g.stroke();
      }
    }

    S.world = c;
    if (X.Canvas && X.Canvas.setWorld) X.Canvas.setWorld(c);
    return c;
  };

  X.Scene = S;
})(globalThis.XIANG);

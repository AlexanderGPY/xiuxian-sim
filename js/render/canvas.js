/* 主画布：单可见 Canvas + 离屏世界图。
   每帧：宣纸底 → 世界图(相机变换) → 边缘留白渐隐 → 云雾动效。
   相机：拖拽平移 / 滚轮缩放锚定光标；DPR 自适应。 */
(function (X) {
  const C = { cam: { x: 0, y: 0, z: 1 }, TILE: 14 };
  let cv, g, dpr = 1, cssW = 0, cssH = 0;
  let world = null, pattern = null, raf = 0, lastT = 0;
  let fps = 60, fpsAcc = 0, fpsN = 0, fpsAt = 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    cssW = cv.clientWidth; cssH = cv.clientHeight;
    C.cssW = cssW; C.cssH = cssH;
    cv.width = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);
  }

  function worldRect() {
    const z = C.cam.z;
    return { x: -C.cam.x * z, y: -C.cam.y * z, w: world.width * z, h: world.height * z };
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    // fps 统计
    if (lastT) {
      fpsAcc += 1000 / Math.max(1, t - lastT); fpsN++;
      if (t - fpsAt > 500) { fps = Math.round(fpsAcc / fpsN); fpsAcc = fpsN = 0; fpsAt = t; }
    }
    lastT = t;

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 宣纸底
    if (pattern) { g.fillStyle = pattern; g.fillRect(0, 0, cssW, cssH); }
    else { g.fillStyle = X.Ink.paper; g.fillRect(0, 0, cssW, cssH); }

    if (!world) return;
    const r = worldRect(), z = C.cam.z;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(world, r.x, r.y, r.w, r.h);
    // 动态层（建筑/弟子/夜色）
    if (X.Dyn) X.Dyn.draw(g, r, z);

    // 边缘留白：世界图四边向纸色渐隐（计白当黑，边缘处纸色最浓）
    const F = Math.min(90, r.w, r.h) * 0.5;
    const fades = [
      [r.x, r.y, r.w, F, 1, 0],            // 上：边缘纸色→向内透明
      [r.x, r.y + r.h - F, r.w, F, 0, 1],  // 下
      [r.x, r.y, F, r.h, 1, 0],            // 左
      [r.x + r.w - F, r.y, F, r.h, 0, 1],  // 右
    ];
    for (const [fx, fy, fw, fh, a0, a1] of fades) {
      const grad = fw > fh
        ? g.createLinearGradient(0, fy, 0, fy + fh)
        : g.createLinearGradient(fx, 0, fx + fw, 0);
      grad.addColorStop(0, X.Ink.a(X.Ink.paper, a0));
      grad.addColorStop(1, X.Ink.a(X.Ink.paper, a1));
      g.fillStyle = grad;
      g.fillRect(fx, fy, fw, fh);
    }
    // 云雾：3 团慢速漂移（屏幕空间）
    const mist = (mx, my, mr, al) => {
      const grad = g.createRadialGradient(mx, my, 0, mx, my, mr);
      grad.addColorStop(0, `rgba(255,253,247,${al})`);
      grad.addColorStop(1, 'rgba(255,253,247,0)');
      g.fillStyle = grad;
      g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    };
    const w = cssW, h = cssH, tt = t * 0.001;
    mist((tt * 12) % (w + 500) - 250, h * 0.3 + Math.sin(tt * 0.13) * 30, 260, 0.20);
    mist(w - ((tt * 8) % (w + 500)) + 250, h * 0.62 + Math.cos(tt * 0.1) * 26, 320, 0.16);
    mist((tt * 5.5) % (w + 600) - 300, h * 0.85 + Math.sin(tt * 0.08) * 20, 220, 0.13);
  }

  C.init = function init(container) {
    cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab';
    container.appendChild(cv);
    g = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // 拖拽平移
    let drag = null;
    cv.addEventListener('pointerdown', e => {
      drag = { x: e.clientX, y: e.clientY, cx: C.cam.x, cy: C.cam.y };
      cv.setPointerCapture(e.pointerId);
      cv.style.cursor = 'grabbing';
    });
    cv.addEventListener('pointermove', e => {
      if (!drag) return;
      C.cam.x = drag.cx - (e.clientX - drag.x) / C.cam.z;
      C.cam.y = drag.cy - (e.clientY - drag.y) / C.cam.z;
    });
    const endDrag = () => { drag = null; cv.style.cursor = 'grab'; };
    cv.addEventListener('pointerup', endDrag);
    cv.addEventListener('pointercancel', endDrag);

    // 滚轮缩放（锚定光标）
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      const k = e.deltaY < 0 ? 1.18 : 1 / 1.18;
      const nz = Math.min(2.6, Math.max(0.45, C.cam.z * k));
      const r = cv.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const wx = C.cam.x + mx / C.cam.z, wy = C.cam.y + my / C.cam.z;
      C.cam.z = nz;
      C.cam.x = wx - mx / nz;
      C.cam.y = wy - my / nz;
    }, { passive: false });

    raf = requestAnimationFrame(frame);
  };

  C.setWorld = function setWorld(canvas) {
    world = canvas;
    if (pattern) return;
    pattern = g ? g.createPattern(X.Paper.tile, 'repeat') : null;
    // 初始视角：世界居中，视口宽度约 72 格
    const fitZ = Math.max(0.45, Math.min(2.6, cssW / (world.width * 0.9)));
    C.cam.z = fitZ;
    C.cam.x = world.width / 2 - cssW / 2 / fitZ;
    C.cam.y = world.height / 2 - cssH / 2 / fitZ;
  };

  C.stats = () => ({ fps, zoom: +C.cam.z.toFixed(2), cam: { x: Math.round(C.cam.x), y: Math.round(C.cam.y) } });
  Object.defineProperty(C, 'canvas', { get: () => cv });
  // 屏幕坐标 → 世界格
  C.pick = (clientX, clientY) => {
    const b = cv.getBoundingClientRect();
    const mx = clientX - b.left, my = clientY - b.top;
    const wx = C.cam.x + mx / C.cam.z, wy = C.cam.y + my / C.cam.z;
    return { mx, my, wx, wy, tx: Math.floor(wx / C.TILE), ty: Math.floor(wy / C.TILE) };
  };
  X.Canvas = C;
})(globalThis.XIANG);

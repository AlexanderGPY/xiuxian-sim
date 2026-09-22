/* 百艺 QTE：丹·火候条 / 器·锻打圈 / 符·走笔。弹出小窗，resolve(加成 0~0.35)。 */
(function (X) {
  const Q = {};
  const ART2MODE = { dan: 'fire', qi: 'hammer', fu: 'brush' };

  Q.open = function (art, recipeName, resolve) {
    const mode = ART2MODE[art];
    const wrap = document.createElement('div');
    wrap.id = 'modal';
    wrap.innerHTML = `<div class="mbox" style="width:480px"><h3>亲手${{ dan: '炼制', qi: '锻打', fu: '画符' }[art]} · ${recipeName}</h3>
      <canvas id="qte-c" width="420" height="240"></canvas>
      <div class="qte-tip" id="qte-tip">${{ fire: '指针行至朱红火候带时点击！', hammer: '圆环缩至目标圈时点击，共三锤！', brush: '自起点按住拖笔，沿虚线行至终点！' }[mode]}</div>
      <button class="act" id="qte-give">放弃（按普通委托结算）</button></div>`;
    document.body.appendChild(wrap);
    const cv = wrap.querySelector('#qte-c'), g = cv.getContext('2d');
    const tip = wrap.querySelector('#qte-tip');
    let raf = 0, done = false;
    const finish = bonus => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      wrap.remove();
      resolve(Math.max(0, Math.min(0.35, bonus)));
    };
    wrap.querySelector('#qte-give').onclick = () => finish(0);

    const K = X.Ink;
    function base() {
      g.fillStyle = K.paper; g.fillRect(0, 0, 420, 240);
      g.strokeStyle = K.zhong; g.strokeRect(6, 6, 408, 228);
    }

    if (mode === 'fire') {
      // 火候条：左右往复指针 + 中央火候带
      const zw = 0.16;
      let p = 0, dir = 1, rounds = 0;
      const speeds = [0.012, 0.017, 0.022];
      const scores = [];
      const click = () => {
        const inZone = Math.abs(p - 0.5) < zw / 2;
        const center = Math.abs(p - 0.5) < zw / 6;
        scores.push(center ? 1 : inZone ? 0.6 : 0.15);
        rounds++;
        if (rounds >= 3) finish(scores.reduce((a, b) => a + b, 0) / 3 * 0.35);
      };
      wrap.onclick = click;
      (function loop() {
        raf = requestAnimationFrame(loop);
        base();
        p += speeds[Math.min(2, rounds)] * dir;
        if (p > 1) { p = 1; dir = -1; }
        if (p < 0) { p = 0; dir = 1; }
        g.fillStyle = K.a(K.zhu, 0.75);
        g.fillRect(210 - zw / 2 * 380, 90, zw * 380, 60);
        g.fillStyle = K.a('#e8a05a', 0.5);
        g.fillRect(210 - zw / 6 * 380, 90, zw / 3 * 380, 60);
        g.fillStyle = K.jiao;
        g.fillRect(20 + p * 380 - 3, 80, 6, 80);
        tip.textContent = `第 ${Math.min(3, rounds + 1)}/3 火 · ${scores.length ? '上一火：' + (scores[scores.length - 1] === 1 ? '完美' : scores[scores.length - 1] >= 0.6 ? '尚可' : '失手') : '指针行至朱红带时点击'}`;
      })();
    } else if (mode === 'hammer') {
      // 锻打：三锤，圆环缩至目标圈时点
      let hit = 0, r = 90, scores = [];
      const targets = [36, 30, 24];
      const click = () => {
        const t = targets[Math.min(2, hit)];
        const d = Math.abs(r - t);
        scores.push(d < 5 ? 1 : d < 12 ? 0.6 : 0.15);
        hit++;
        r = 95;
        if (hit >= 3) finish(scores.reduce((a, b) => a + b, 0) / 3 * 0.35);
      };
      wrap.onclick = click;
      (function loop() {
        raf = requestAnimationFrame(loop);
        base();
        r -= 0.9;
        if (r < 8) { r = 95; scores.push(0.1); hit++; if (hit >= 3) finish(scores.reduce((a, b) => a + b, 0) / 3 * 0.35); }
        const cx = 210, cy = 120, t = targets[Math.min(2, hit)];
        g.strokeStyle = K.zhu; g.lineWidth = 3;
        g.beginPath(); g.arc(cx, cy, t, 0, 7); g.stroke();
        g.strokeStyle = K.zhong; g.lineWidth = 2;
        g.beginPath(); g.arc(cx, cy, Math.max(6, r), 0, 7); g.stroke();
        g.fillStyle = K.nong; g.font = '20px "Kaiti SC",serif'; g.textAlign = 'center';
        g.fillText(`第 ${Math.min(3, hit + 1)} 锤`, cx, 210);
      })();
    } else {
      // 走笔：沿贝塞尔虚线拖笔
      const P0 = [40, 190], P1 = [150, 40], P2 = [290, 220], P3 = [390, 70];
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, u = 1 - t;
        pts.push([
          u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0],
          u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1],
        ]);
      }
      const visited = new Uint8Array(pts.length);
      let drawing = false, sx = 0, sy = 0;
      const rect = () => cv.getBoundingClientRect();
      cv.addEventListener('pointerdown', e => {
        const [x0, y0] = pts[0];
        const rr = rect();
        if (Math.hypot(e.clientX - rr.left - x0, e.clientY - rr.top - y0) < 30) {
          drawing = true; visited[0] = 1; sx = e.clientX; sy = e.clientY;
          cv.setPointerCapture(e.pointerId);
        }
      });
      cv.addEventListener('pointermove', e => {
        if (!drawing) return;
        const rr = rect();
        const mx = e.clientX - rr.left, my = e.clientY - rr.top;
        pts.forEach((p, i) => { if (Math.hypot(p[0] - mx, p[1] - my) < 22) visited[i] = 1; });
        if (visited[pts.length - 1]) {
          const cov = visited.reduce((a, b) => a + b, 0) / pts.length;
          finish(cov * cov * 0.35);   // 覆盖率平方：要求走满
        }
      });
      const up = () => {
        if (!drawing) return;
        drawing = false;
        const cov = visited.reduce((a, b) => a + b, 0) / pts.length;
        finish(cov * cov * 0.35);
      };
      cv.addEventListener('pointerup', up);
      (function loop() {
        raf = requestAnimationFrame(loop);
        base();
        g.setLineDash([6, 6]);
        g.strokeStyle = K.dan; g.lineWidth = 2;
        g.beginPath();
        pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
        g.stroke();
        g.setLineDash([]);
        // 已走部分实线
        g.strokeStyle = K.jiao; g.lineWidth = 3.4; g.lineCap = 'round';
        g.beginPath();
        let started = false;
        pts.forEach((p, i) => {
          if (!visited[i]) { started = false; return; }
          started ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
          started = true;
        });
        g.stroke();
        g.fillStyle = K.zhu;
        g.beginPath(); g.arc(pts[0][0], pts[0][1], 6, 0, 7); g.fill();
        g.fillStyle = K.hua;
        g.beginPath(); g.arc(pts[pts.length - 1][0], pts[pts.length - 1][1], 6, 0, 7); g.fill();
      })();
    }
  };

  X.QTE = Q;
})(globalThis.XIANG);

/* 宣纸底：米白 + 像素噪声 + 纤维长痕 + 霉斑晕点，一次性预渲染 256 tile 平铺 */
(function (X) {
  let tile = null;
  X.Paper = {
    get tile() { return tile; },
    bake(seed = 7) {
      const rng = X.Rng(seed), S = 256;
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      g.fillStyle = X.Ink.paper;
      g.fillRect(0, 0, S, S);
      const img = g.getImageData(0, 0, S, S), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = rng.f(-1, 1) * 7 + rng.f(-1, 1) * 3;
        d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.75;
      }
      g.putImageData(img, 0, 0);
      // 纤维长痕（横向为主，双色调）
      g.lineWidth = 1;
      for (let i = 0; i < 34; i++) {
        const x = rng.f(0, S), y = rng.f(0, S), len = rng.f(20, 100), a = rng.f(-0.25, 0.25);
        g.strokeStyle = rng.chance(0.5)
          ? X.Ink.a(X.Ink.qing, 0.5)
          : 'rgba(252,248,236,0.6)';
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        g.stroke();
      }
      // 霉斑晕点
      for (let i = 0; i < 7; i++) {
        const x = rng.f(0, S), y = rng.f(0, S), r = rng.f(8, 26);
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(168,150,116,0.09)');
        gr.addColorStop(1, 'rgba(168,150,116,0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      tile = c;
      return c;
    },
  };
})(globalThis.XIANG);

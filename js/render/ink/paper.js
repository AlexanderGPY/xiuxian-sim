/* 宣纸底：米白 + 像素噪声 + 纤维长痕，一次性预渲染 256 tile 平铺 */
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
        const n = rng.f(-1, 1) * 6 + rng.f(-1, 1) * 3;
        d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.8;
      }
      g.putImageData(img, 0, 0);
      g.strokeStyle = X.Ink.a(X.Ink.qing, 0.5);
      g.lineWidth = 1;
      for (let i = 0; i < 26; i++) {
        const x = rng.f(0, S), y = rng.f(0, S), len = rng.f(20, 90), a = rng.f(-0.4, 0.4);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        g.stroke();
      }
      tile = c;
      return c;
    },
  };
})(globalThis.XIANG);

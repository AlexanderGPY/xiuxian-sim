/* 动态层：建筑(含蓝图)/农田生长/弟子墨人/选中圈/建造幽灵/夜色。
   世界画布只画地形；变化的事物每帧画在相机空间上。 */
(function (X) {
  const T = 14;   // 与 Scene 一致的每格像素
  const Dyn = {
    ghost: null,     // {def, x, y, ok}
    hover: null,     // [tx, ty]
    sel: null,       // {kind:'disc', id} | {kind:'build', id} | {kind:'tile', x, y}
    fengView: false, // 观星台解锁的风水叠加视图
  };

  function drawBuilding(g, b, r, z) {
    const x = r.x + b.x * T * z, y = r.y + b.y * T * z;
    const w = b.def.w * T * z, h = b.def.h * T * z;
    const K = X.Ink;
    if (!b.built) {
      g.setLineDash([4 * z, 3 * z]);
      g.strokeStyle = K.zhong; g.lineWidth = 1.4;
      g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      g.setLineDash([]);
      g.fillStyle = K.a(K.zhong, 0.55);
      g.font = `${Math.max(8, 11 * z)}px "Kaiti SC",serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(`${Math.floor(b.progress / b.def.work * 100)}%`, x + w / 2, y + h / 2);
      return;
    }
    // 各类建筑的占位画法（画风定稿后整套替换）
    const kind = b.def.kind;
    if (kind === 'floor') { g.fillStyle = K.a(K.dan, 0.16); g.fillRect(x, y, w, h); return; }
    if (kind === 'wall') {
      g.fillStyle = b.def.id === 'wallStone' ? K.a(K.zhong, 0.85) : K.a(K.nong, 0.8);
      g.fillRect(x, y, w, h);
      g.strokeStyle = K.jiao; g.lineWidth = 1; g.strokeRect(x, y, w, h);
      return;
    }
    if (kind === 'door') {
      g.fillStyle = K.a(K.dan, 0.3); g.fillRect(x, y, w, h);
      g.strokeStyle = K.nong; g.lineWidth = 1.6; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      return;
    }
    if (kind === 'plot') {   // 灵田：垄线 + 生长点
      g.fillStyle = K.a(K.zhe, 0.14); g.fillRect(x, y, w, h);
      g.strokeStyle = K.a(K.zhe, 0.5); g.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        g.beginPath(); g.moveTo(x + 2, y + h * i / 4); g.lineTo(x + w - 2, y + h * i / 4); g.stroke();
      }
      if (b.farm && b.farm.planted) {
        const pr = b.farm.prog / 10;
        g.fillStyle = b.farm.ready ? X.Ink.zhu : K.a(K.nong, 0.75);
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
          const s = (2.5 + pr * 4) * z;
          g.beginPath();
          g.arc(x + w * (0.3 + i * 0.4), y + h * (0.3 + j * 0.4), Math.max(1, s), 0, 7);
          g.fill();
        }
      }
      return;
    }
    // 通用：淡底 + 墨框 + 名字
    g.fillStyle = K.a(K.qing, 0.5); g.fillRect(x, y, w, h);
    g.fillStyle = K.paper; g.globalAlpha = 0.4; g.fillRect(x, y, w, h); g.globalAlpha = 1;
    g.strokeStyle = K.nong; g.lineWidth = 1.4;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (kind === 'bed') {
      g.strokeStyle = K.zhong;
      g.beginPath(); g.moveTo(x + 2, y + h * 0.45); g.lineTo(x + w - 2, y + h * 0.45); g.stroke();
    }
    g.fillStyle = K.nong;
    g.font = `${Math.max(8, 12 * z)}px "Kaiti SC",serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(b.def.glyph, x + w / 2, y + h / 2 + 1);
  }

  function drawDisciple(g, d, r, z) {
    const K = X.Ink;
    const x = r.x + d.px * T * z, y = r.y + d.py * T * z;
    const s = Math.max(0.8, 0.9 * z);
    // 阴影
    g.fillStyle = 'rgba(31,29,26,.15)';
    g.beginPath(); g.ellipse(x, y + 6 * s, 7 * s, 2.4 * s, 0, 0, 7); g.fill();
    // 墨人
    const asleep = d.task && d.task.type === 'sleep';
    const bob = asleep ? 0 : Math.sin((X.Tick.count + d.id * 7) / 8) * 0.8;   // 走路轻微起伏
    // 修行气场：境界越高环越亮（占位画法）
    if (d.realm >= 1) {
      const aura = 0.12 + d.realm * 0.05;
      g.strokeStyle = X.Ink.a(X.Ink.hua, Math.min(0.6, aura));
      g.lineWidth = 1.6;
      g.beginPath(); g.arc(x, y - 3 * s, (9 + d.realm * 1.2) * s, 0, 7); g.stroke();
      if (d.kind === '修士' && z > 1.0) {
        g.fillStyle = X.Ink.a(X.Ink.hua, 0.9);
        g.font = `${9 * z}px "Kaiti SC",serif`;
        g.textAlign = 'center';
        g.fillText(X.Realms.realmName(d)[0], x + 10 * s, y - 20 * s);
      }
    }
    g.fillStyle = K.nong;
    g.beginPath();
    g.moveTo(x - 4.4 * s, y - 7 * s + bob);
    g.quadraticCurveTo(x - 7 * s, y + 3 * s, x - 5 * s, y + 5 * s);
    g.quadraticCurveTo(x, y + 7 * s, x + 5 * s, y + 5 * s);
    g.quadraticCurveTo(x + 7 * s, y + 3 * s, x + 4.4 * s, y - 7 * s + bob);
    g.closePath(); g.fill();
    g.fillStyle = K.jiao;
    g.beginPath(); g.arc(x, y - 11 * s + bob, 3.4 * s, 0, 7); g.fill();
    // 搬运物
    if (d.carry) {
      g.fillStyle = K.zhe;
      g.fillRect(x + 5 * s, y - 10 * s, 3.6 * s, 3.6 * s);
    }
    // 状态字（放大时）
    if (z > 1.15) {
      g.fillStyle = K.a(K.zhong, 0.85);
      g.font = `${9.5 * z}px "Kaiti SC",serif`;
      g.textAlign = 'center';
      g.fillText(d.state, x, y - 18 * s);
    }
    // 心境低落标记
    if (d.mood < 25) {
      g.fillStyle = X.Ink.zhu;
      g.beginPath(); g.arc(x + 6.4 * s, y - 14 * s, 1.8 * s, 0, 7); g.fill();
    }
    // 选中圈
    if (Dyn.sel && Dyn.sel.kind === 'disc' && Dyn.sel.id === d.id) {
      g.strokeStyle = X.Ink.zhu; g.lineWidth = 1.6;
      g.setLineDash([3, 3]);
      g.beginPath(); g.arc(x, y - 3 * s, 12 * s, 0, 7); g.stroke();
      g.setLineDash([]);
    }
  }

  Dyn.draw = function (g, r, z) {
    // 建筑
    X.Build.each(b => drawBuilding(g, b, r, z));
    // 弟子
    for (const d of X.Disciple.list) drawDisciple(g, d, r, z);
    // 选中建筑高亮
    if (Dyn.sel && Dyn.sel.kind === 'build') {
      const b = X.Build.inst[Dyn.sel.id];
      if (b) {
        g.strokeStyle = X.Ink.zhu; g.lineWidth = 2; g.setLineDash([4, 3]);
        g.strokeRect(r.x + b.x * T * z - 1, r.y + b.y * T * z - 1, b.def.w * T * z + 2, b.def.h * T * z + 2);
        g.setLineDash([]);
      }
    }
    // 悬停格
    if (Dyn.hover && !Dyn.ghost) {
      const [tx, ty] = Dyn.hover;
      g.strokeStyle = X.Ink.a(X.Ink.zhong, 0.6); g.lineWidth = 1;
      g.strokeRect(r.x + tx * T * z, r.y + ty * T * z, T * z, T * z);
    }
    // 建造幽灵
    if (Dyn.ghost) {
      const { def, x, y, ok } = Dyn.ghost;
      g.fillStyle = ok ? X.Ink.a(X.Ink.hua, 0.25) : X.Ink.a(X.Ink.zhu, 0.25);
      g.fillRect(r.x + x * T * z, r.y + y * T * z, def.w * T * z, def.h * T * z);
      g.strokeStyle = ok ? X.Ink.hua : X.Ink.zhu; g.lineWidth = 1.6;
      g.strokeRect(r.x + x * T * z, r.y + y * T * z, def.w * T * z, def.h * T * z);
    }
    // 风水叠加视图（观星台）
    if (Dyn.fengView && X.Feng) {
      const GC = { 大吉: X.Ink.zhu, 吉: '#3d7a52', 平: X.Ink.dan, 凶: X.Ink.jiao };
      for (const room of X.Feng.get()) {
        const bx = r.x + room.bbox.minX * T * z, by = r.y + room.bbox.minY * T * z;
        const bw = (room.bbox.maxX - room.bbox.minX + 1) * T * z, bh = (room.bbox.maxY - room.bbox.minY + 1) * T * z;
        g.fillStyle = X.Ink.a(GC[room.grade], 0.10);
        g.fillRect(bx, by, bw, bh);
        g.strokeStyle = GC[room.grade]; g.lineWidth = 2;
        g.setLineDash([6, 4]);
        g.strokeRect(bx, by, bw, bh);
        g.setLineDash([]);
        g.fillStyle = GC[room.grade];
        g.font = `${12 * Math.min(1.4, z)}px "Kaiti SC",serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(`${room.grade}·${X.Map.ELEM[room.dom]}`, bx + bw / 2, by + bh / 2);
      }
    }
    // 夜色
    const sh = X.Time.shichen;
    let night = 0;
    if (sh >= 11 || sh <= 1) night = 0.16;
    else if (sh === 2 || sh === 10) night = 0.07;
    if (night) {
      g.fillStyle = `rgba(24,30,54,${night})`;
      g.fillRect(0, 0, X.Canvas.cssW, X.Canvas.cssH);
    }
    const dawn = sh === 4 || sh === 5 ? 0.05 : 0;
    if (dawn) { g.fillStyle = `rgba(226,160,90,${dawn})`; g.fillRect(0, 0, X.Canvas.cssW, X.Canvas.cssH); }
  };

  X.Dyn = Dyn;
})(globalThis.XIANG);

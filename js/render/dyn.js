/* 动态层：建筑水墨淡彩小画(含蓝图)/农田生长/弟子淡彩小人/选中圈/建造幽灵/特效/夜色灯火。
   世界画布只画地形；变化的事物每帧画在相机空间上。
   画风：鬼谷向——纸墙墨线飞檐顶 + 淡彩设色；凡人向——破境金光特效。 */
(function (X) {
  const T = 14;   // 与 Scene 一致的每格像素
  const Dyn = {
    ghost: null,     // {def, x, y, ok}
    hover: null,     // [tx, ty]
    sel: null,       // {kind:'disc', id} | {kind:'build', id} | {kind:'tile', x, y}
    fengView: false, // 观星台解锁的风水叠加视图
  };
  const K = () => X.Ink;

  /* ---------- 通用小件 ---------- */
  function begin(g, b, r, z) {   // 进入建筑局部坐标（世界像素单位）
    g.save();
    g.translate(r.x + b.x * T * z, r.y + b.y * T * z);
    g.scale(z, z);
    return { w: b.def.w * T, h: b.def.h * T };
  }
  function shadow(g, w, h) {    // 落地投影
    g.fillStyle = 'rgba(43,40,34,.14)';
    g.beginPath(); g.ellipse(w / 2, h - 1.5, w * 0.52, 2.6, 0, 0, 7); g.fill();
  }
  function frame(g, w, h) {     // 墨线外框（接地）
    g.strokeStyle = K().a(K().nong, 0.75); g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, w - 1, h - 1);
  }
  // 飞檐小顶：cx 中心，y 为檐口基线，覆盖宽 w、矢高 h
  function roofMini(g, cx, y, w, h, col) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(cx - w / 2, y);
    g.quadraticCurveTo(cx - w * 0.42, y - h * 0.66, cx, y - h);
    g.quadraticCurveTo(cx + w * 0.42, y - h * 0.66, cx + w / 2, y);
    g.quadraticCurveTo(cx + w * 0.38, y - h * 0.16, cx + w * 0.3, y - h * 0.1);
    g.quadraticCurveTo(cx, y - h * 0.32, cx - w * 0.3, y - h * 0.1);
    g.quadraticCurveTo(cx - w * 0.38, y - h * 0.16, cx - w / 2, y);
    g.closePath(); g.fill();
    g.strokeStyle = K().jiao; g.lineWidth = 0.9; g.stroke();
    // 正脊
    g.beginPath(); g.moveTo(cx - w * 0.13, y - h * 0.9); g.lineTo(cx + w * 0.13, y - h * 0.9); g.stroke();
  }
  function walls(g, x, y, w, h, col) {  // 纸色墙 + 柱
    g.fillStyle = col || K().wallP;
    g.fillRect(x, y, w, h);
    g.strokeStyle = K().jiao; g.lineWidth = 0.9;
    g.strokeRect(x, y, w, h);
    g.beginPath();
    g.moveTo(x + w * 0.18, y + h); g.lineTo(x + w * 0.18, y);
    g.moveTo(x + w * 0.82, y + h); g.lineTo(x + w * 0.82, y);
    g.stroke();
  }
  function doorDot(g, cx, yBottom, w, h) {  // 门洞
    g.fillStyle = '#4a4034';
    g.fillRect(cx - w / 2, yBottom - h, w, h);
    g.strokeStyle = K().jiao; g.lineWidth = 0.7;
    g.strokeRect(cx - w / 2, yBottom - h, w, h);
  }

  /* ---------- 各类建筑 ---------- */
  function drawBuilding(g, b, r, z) {
    const id = b.def.id, kind = b.def.kind;
    if (!b.built) {   // 蓝图
      const x = r.x + b.x * T * z, y = r.y + b.y * T * z;
      const w = b.def.w * T * z, h = b.def.h * T * z;
      g.setLineDash([4 * z, 3 * z]);
      g.strokeStyle = K().zhong; g.lineWidth = 1.4;
      g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      g.setLineDash([]);
      g.fillStyle = K().a(K().zhong, 0.55);
      g.font = `${Math.max(8, 11 * z)}px "Kaiti SC",serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(`${Math.floor(b.progress / b.def.work * 100)}%`, x + w / 2, y + h / 2);
      return;
    }
    const L = begin(g, b, r, z), w = L.w, h = L.h;
    const cx = w / 2;
    shadow(g, w, h);

    if (kind === 'wall') {
      if (id === 'wallStone') {   // 石墙：砖缝
        g.fillStyle = K().a(K().yan, 0.9); g.fillRect(0.5, 0.5, w - 1, h - 1);
        g.strokeStyle = K().a(K().jiao, 0.6); g.lineWidth = 0.7;
        for (let i = 1; i < 3; i++) {
          g.beginPath(); g.moveTo(1, h * i / 3); g.lineTo(w - 1, h * i / 3); g.stroke();
          g.beginPath(); g.moveTo((i % 2) ? w * 0.33 : w * 0.66, h * (i - 1) / 3); g.lineTo((i % 2) ? w * 0.33 : w * 0.66, h * i / 3); g.stroke();
        }
        g.strokeStyle = K().jiao; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, h - 1);
      } else {                    // 木墙：竖板
        g.fillStyle = '#c9b492'; g.fillRect(0.5, 0.5, w - 1, h - 1);
        g.strokeStyle = K().a(K().zhe, 0.75); g.lineWidth = 0.8;
        for (let i = 1; i < 3; i++) {
          g.beginPath(); g.moveTo(w * i / 3, 1); g.lineTo(w * i / 3, h - 1); g.stroke();
        }
        g.strokeStyle = K().jiao; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, h - 1);
      }
    } else if (kind === 'floor') {
      if (id === 'floorStone') {
        g.fillStyle = K().a(K().yan, 0.5); g.fillRect(0, 0, w, h);
        g.strokeStyle = K().a(K().jiao, 0.35); g.lineWidth = 0.6;
        g.strokeRect(w * 0.25, h * 0.25, w * 0.5, h * 0.5);
      } else {
        g.fillStyle = K().a('#c9b492', 0.5); g.fillRect(0, 0, w, h);
        g.strokeStyle = K().a(K().zhe, 0.4); g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
      }
    } else if (kind === 'door') {
      g.fillStyle = K().a('#c9b492', 0.85); g.fillRect(0, 0, w, h);
      g.strokeStyle = K().jiao; g.lineWidth = 1.1;
      g.strokeRect(1, 1, w - 2, h - 2);
      g.fillStyle = '#6a5138';
      g.fillRect(w * 0.2, h * 0.15, w * 0.6, h * 0.8);
      g.strokeRect(w * 0.2, h * 0.15, w * 0.6, h * 0.8);
      g.fillStyle = K().gold;
      g.beginPath(); g.arc(w * 0.68, h * 0.55, 0.9, 0, 7); g.fill();
    } else if (kind === 'plot') {   // 灵田/药圃：垄线 + 生长点
      const isHerb = id === 'herbPlot';
      g.fillStyle = isHerb ? K().a(K().caoD, 0.22) : K().a(K().zhe, 0.16);
      g.fillRect(0, 0, w, h);
      g.strokeStyle = isHerb ? K().a(K().caoD, 0.6) : K().a(K().zhe, 0.55);
      g.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        g.beginPath(); g.moveTo(2, h * i / 4); g.lineTo(w - 2, h * i / 4); g.stroke();
      }
      if (b.farm && b.farm.planted) {
        const pr = b.farm.prog / 10;
        g.fillStyle = b.farm.ready ? (isHerb ? K().caoD : X.Ink.zhu) : K().a(K().nong, 0.75);
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
          const s = (2.5 + pr * 4);
          g.beginPath();
          g.arc(w * (0.3 + i * 0.4), h * (0.3 + j * 0.4), Math.max(1, s), 0, 7);
          g.fill();
        }
      }
    } else if (kind === 'zflag') {   // 阵旗
      g.strokeStyle = K().zhong; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(cx, h - 2); g.lineTo(cx, 3); g.stroke();
      const wav = Math.sin(X.Tick.count / 18 + b.x) * 1.2;
      g.fillStyle = X.Ink.hua;
      g.beginPath();
      g.moveTo(cx, 3);
      g.quadraticCurveTo(cx + w * 0.55, 4 + wav, cx + w * 0.75, 6 + wav);
      g.lineTo(cx + w * 0.6, h * 0.42);
      g.quadraticCurveTo(cx + w * 0.4, h * 0.4 + wav, cx, h * 0.5);
      g.closePath(); g.fill();
      g.strokeStyle = K().a(K().jiao, 0.6); g.lineWidth = 0.7; g.stroke();
    } else if (kind === 'zeye') {   // 阵眼：激活时花青辉光
      const zid = b.def.tags && b.def.tags.zeye;
      const on = X.Form && X.Form.isActive(zid);
      if (on) {
        g.fillStyle = X.Ink.a(X.Ink.hua, 0.15 + 0.05 * Math.sin(X.Tick.count / 20));
        g.beginPath(); g.arc(cx, h / 2, w * 1.1, 0, 7); g.fill();
      }
      g.strokeStyle = on ? X.Ink.hua : K().zhong; g.lineWidth = 1.6;
      g.beginPath(); g.arc(cx, h / 2, Math.min(w, h) * 0.42, 0, 7); g.stroke();
      g.fillStyle = on ? X.Ink.hua : K().zhong;
      g.font = `${Math.max(8, 12)}px "Kaiti SC",serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.def.glyph, cx, h / 2 + 1);
    } else if (kind === 'splant' && b.sp) {   // 天地灵植：土丘三阶
      const st = b.sp.stage;
      const ELC = ['#b8a04a', '#5a9a5a', '#5a8ab8', '#c86a4a', '#a8865a'];
      const ec = ELC[b.def.el];
      // 土丘
      g.fillStyle = K().a(K().zhe, 0.4);
      g.beginPath(); g.ellipse(cx, h * 0.78, w * 0.4, h * 0.16, 0, 0, 7); g.fill();
      g.strokeStyle = K().a(K().zhong, 0.8); g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(cx, h * 0.76); g.quadraticCurveTo(cx - 1, h * 0.5, cx, h * 0.76 - (6 + st * 7)); g.stroke();
      g.fillStyle = st >= 3 ? ec : K().a(ec, 0.65);
      const r2 = (3 + st * 3);
      g.beginPath(); g.arc(cx, h * 0.76 - (6 + st * 7), Math.max(1.5, r2), 0, 7); g.fill();
      if (st >= 3) {
        g.strokeStyle = X.Ink.a(ec, 0.6);
        g.beginPath(); g.arc(cx, h * 0.76 - (6 + st * 7), Math.max(3, r2 + 3), 0, 7); g.stroke();
      }
    } else if (kind === 'stove') {   // 灶台：灶身+釜+火光
      walls(g, w * 0.1, h * 0.34, w * 0.8, h * 0.6, '#bfae90');
      // 釜
      g.fillStyle = '#4c443a';
      g.beginPath(); g.arc(cx, h * 0.34, Math.min(w, h) * 0.26, Math.PI, 0); g.closePath(); g.fill();
      g.strokeStyle = K().jiao; g.lineWidth = 0.9; g.stroke();
      // 火
      const fl = 0.6 + 0.4 * Math.sin(X.Tick.count / 9);
      const fg = g.createRadialGradient(cx, h * 0.2, 0, cx, h * 0.2, 8);
      fg.addColorStop(0, `rgba(238,150,70,${0.5 * fl})`);
      fg.addColorStop(1, 'rgba(238,150,70,0)');
      g.fillStyle = fg;
      g.beginPath(); g.arc(cx, h * 0.2, 8, 0, 7); g.fill();
    } else if (kind === 'well') {    // 水井：石沿+双柱+小顶
      g.fillStyle = K().a(K().yan, 0.85);
      g.beginPath(); g.arc(cx, h * 0.66, Math.min(w, h) * 0.3, 0, 7); g.fill();
      g.fillStyle = K().a(K().hua, 0.5);
      g.beginPath(); g.arc(cx, h * 0.66, Math.min(w, h) * 0.18, 0, 7); g.fill();
      g.strokeStyle = K().jiao; g.lineWidth = 0.9;
      g.beginPath(); g.arc(cx, h * 0.66, Math.min(w, h) * 0.3, 0, 7); g.stroke();
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(cx - w * 0.26, h * 0.62); g.lineTo(cx - w * 0.26, h * 0.1); g.moveTo(cx + w * 0.26, h * 0.62); g.lineTo(cx + w * 0.26, h * 0.1); g.stroke();
      roofMini(g, cx, h * 0.16, w * 0.9, h * 0.3, K().thatch);
    } else if (kind === 'pile') {    // 柴堆/石堆
      if (id === 'woodpile') {
        g.strokeStyle = K().zhe; g.lineWidth = 2.2; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          g.beginPath(); g.moveTo(w * 0.15, h * (0.72 - i * 0.2)); g.lineTo(w * 0.85, h * (0.62 - i * 0.2)); g.stroke();
        }
        g.strokeStyle = K().a(K().jiao, 0.5); g.lineWidth = 0.7;
      } else {
        g.fillStyle = K().a(K().yan, 0.9);
        [[0.3, 0.72, 3.4], [0.62, 0.75, 2.8], [0.46, 0.5, 3]].forEach(([px, py, rr]) => {
          g.beginPath(); g.arc(w * px, h * py, rr, 0, 7); g.fill();
        });
        g.strokeStyle = K().a(K().jiao, 0.55); g.lineWidth = 0.8;
        g.beginPath(); g.arc(w * 0.3, h * 0.72, 3.4, 0, 7); g.stroke();
        g.beginPath(); g.arc(w * 0.46, h * 0.5, 3, 0, 7); g.stroke();
      }
    } else if (kind === 'store') {   // 置物台/谷仓
      if (id === 'granary') {      // 谷仓：圆顶草仓
        walls(g, w * 0.16, h * 0.42, w * 0.68, h * 0.5, '#cfc3a4');
        g.fillStyle = K().thatch;
        g.beginPath();
        g.moveTo(cx - w * 0.46, h * 0.44);
        g.quadraticCurveTo(cx, h * 0.02, cx + w * 0.46, h * 0.44);
        g.quadraticCurveTo(cx, h * 0.3, cx - w * 0.46, h * 0.44);
        g.closePath(); g.fill();
        g.strokeStyle = K().jiao; g.lineWidth = 0.9; g.stroke();
        doorDot(g, cx, h * 0.9, w * 0.2, h * 0.3);
      } else {                     // 置物台：案+箱
        g.fillStyle = '#bfae90';
        g.fillRect(w * 0.1, h * 0.5, w * 0.8, h * 0.14);
        g.strokeStyle = K().jiao; g.lineWidth = 0.8;
        g.strokeRect(w * 0.1, h * 0.5, w * 0.8, h * 0.14);
        g.beginPath();
        g.moveTo(w * 0.18, h * 0.64); g.lineTo(w * 0.18, h * 0.94);
        g.moveTo(w * 0.82, h * 0.64); g.lineTo(w * 0.82, h * 0.94);
        g.stroke();
        g.fillStyle = K().a(K().zhe, 0.7);
        g.fillRect(w * 0.3, h * 0.3, w * 0.26, h * 0.2);
        g.strokeRect(w * 0.3, h * 0.3, w * 0.26, h * 0.2);
      }
    } else if (kind === 'obs') {     // 观星台/祭星坛
      if (id === 'observatory') {  // 高台穹顶
        g.fillStyle = K().a(K().yan, 0.8);
        g.fillRect(w * 0.12, h * 0.5, w * 0.76, h * 0.38);
        g.strokeStyle = K().jiao; g.lineWidth = 0.9; g.strokeRect(w * 0.12, h * 0.5, w * 0.76, h * 0.38);
        g.strokeStyle = K().a(K().jiao, 0.45); g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(w * 0.12, h * 0.69); g.lineTo(w * 0.88, h * 0.69); g.stroke();
        // 穹顶
        g.fillStyle = K().watt;
        g.beginPath(); g.arc(cx, h * 0.5, w * 0.24, Math.PI, 0); g.closePath(); g.fill();
        g.strokeStyle = K().jiao; g.lineWidth = 0.9; g.stroke();
        // 立杆望星
        g.strokeStyle = K().jiao; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(cx, h * 0.26); g.lineTo(cx, h * 0.06); g.stroke();
        g.fillStyle = K().gold;
        g.beginPath(); g.arc(cx, h * 0.06, 1.8, 0, 7); g.fill();
        const tw = 0.5 + 0.5 * Math.sin(X.Tick.count / 14);
        g.strokeStyle = X.Ink.a(K().gold, 0.5 * tw); g.lineWidth = 0.7;
        g.beginPath(); g.arc(cx, h * 0.06, 3.4, 0, 7); g.stroke();
      } else {                     // 祭星坛：三层坛
        g.fillStyle = K().a(K().yan, 0.85);
        g.fillRect(w * 0.1, h * 0.6, w * 0.8, h * 0.28);
        g.fillRect(w * 0.22, h * 0.42, w * 0.56, h * 0.2);
        g.fillRect(w * 0.34, h * 0.26, w * 0.32, h * 0.18);
        g.strokeStyle = K().jiao; g.lineWidth = 0.8;
        g.strokeRect(w * 0.1, h * 0.6, w * 0.8, h * 0.28);
        g.strokeRect(w * 0.22, h * 0.42, w * 0.56, h * 0.2);
        g.strokeRect(w * 0.34, h * 0.26, w * 0.32, h * 0.18);
        g.fillStyle = K().gold;
        g.beginPath(); g.arc(cx, h * 0.2, 1.8, 0, 7); g.fill();
      }
    } else if (kind === 'craft') {   // 丹房/器坊/符案
      if (id === 'alchemy') {      // 丹炉居中
        walls(g, w * 0.08, h * 0.5, w * 0.84, h * 0.42, '#cfc3a4');
        roofMini(g, cx, h * 0.52, w * 0.95, h * 0.4, K().watt);
        // 炉
        const fx = cx, fy = h * 0.34;
        g.fillStyle = '#5a5248';
        g.beginPath();
        g.moveTo(fx - w * 0.1, fy - h * 0.14);
        g.quadraticCurveTo(fx - w * 0.14, fy + h * 0.06, fx - w * 0.08, fy + h * 0.16);
        g.lineTo(fx + w * 0.08, fy + h * 0.16);
        g.quadraticCurveTo(fx + w * 0.14, fy + h * 0.06, fx + w * 0.1, fy - h * 0.14);
        g.closePath(); g.fill();
        g.strokeStyle = K().jiao; g.lineWidth = 0.8; g.stroke();
        const fl = 0.6 + 0.4 * Math.sin(X.Tick.count / 11 + b.x);
        const pg = g.createRadialGradient(fx, fy - h * 0.16, 0, fx, fy - h * 0.16, w * 0.16);
        pg.addColorStop(0, `rgba(120,190,170,${0.5 * fl})`);
        pg.addColorStop(1, 'rgba(120,190,170,0)');
        g.fillStyle = pg;
        g.beginPath(); g.arc(fx, fy - h * 0.16, w * 0.16, 0, 7); g.fill();
      } else if (id === 'forge') { // 砧+炭炉
        walls(g, w * 0.08, h * 0.5, w * 0.84, h * 0.42, '#c2b49a');
        roofMini(g, cx, h * 0.52, w * 0.95, h * 0.4, '#6a6258');
        g.fillStyle = '#4c443a';
        g.fillRect(w * 0.18, h * 0.32, w * 0.28, h * 0.12);
        g.strokeStyle = K().jiao; g.lineWidth = 0.8; g.strokeRect(w * 0.18, h * 0.32, w * 0.28, h * 0.12);
        const fl = 0.6 + 0.4 * Math.sin(X.Tick.count / 7);
        const fg = g.createRadialGradient(w * 0.66, h * 0.3, 0, w * 0.66, h * 0.3, w * 0.18);
        fg.addColorStop(0, `rgba(238,120,60,${0.55 * fl})`);
        fg.addColorStop(1, 'rgba(238,120,60,0)');
        g.fillStyle = fg;
        g.beginPath(); g.arc(w * 0.66, h * 0.3, w * 0.18, 0, 7); g.fill();
      } else {                     // 符案：案+符纸
        g.fillStyle = '#bfae90';
        g.fillRect(w * 0.12, h * 0.4, w * 0.76, h * 0.16);
        g.strokeStyle = K().jiao; g.lineWidth = 0.8; g.strokeRect(w * 0.12, h * 0.4, w * 0.76, h * 0.16);
        g.beginPath();
        g.moveTo(w * 0.2, h * 0.56); g.lineTo(w * 0.2, h * 0.9);
        g.moveTo(w * 0.8, h * 0.56); g.lineTo(w * 0.8, h * 0.9);
        g.stroke();
        // 符纸（朱砂一点）
        g.fillStyle = '#f0e8d4';
        g.fillRect(w * 0.4, h * 0.18, w * 0.2, h * 0.26);
        g.strokeStyle = K().a(K().jiao, 0.6); g.lineWidth = 0.6;
        g.strokeRect(w * 0.4, h * 0.18, w * 0.2, h * 0.26);
        g.fillStyle = X.Ink.zhu;
        g.beginPath(); g.arc(cx, h * 0.3, 1.6, 0, 7); g.fill();
      }
    } else if (kind === 'bed') {     // 床榻：架+被+枕
      g.fillStyle = '#c9b492';
      g.fillRect(w * 0.08, h * 0.2, w * 0.84, h * 0.68);
      g.strokeStyle = K().jiao; g.lineWidth = 1;
      g.strokeRect(w * 0.08, h * 0.2, w * 0.84, h * 0.68);
      // 床头
      g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(w * 0.08, h * 0.2); g.lineTo(w * 0.08, h * 0.08); g.moveTo(w * 0.92, h * 0.2); g.lineTo(w * 0.92, h * 0.08); g.stroke();
      // 被子（淡彩）
      g.fillStyle = id === 'ironBed' ? K().a(K().yan, 0.8) : K().a(K().robe1, 0.55);
      g.fillRect(w * 0.2, h * 0.34, w * 0.62, h * 0.42);
      g.strokeStyle = K().a(K().jiao, 0.5); g.lineWidth = 0.7;
      g.strokeRect(w * 0.2, h * 0.34, w * 0.62, h * 0.42);
      // 枕
      g.fillStyle = '#e8dcc0';
      g.fillRect(w * 0.24, h * 0.24, w * 0.2, h * 0.1);
    } else if (kind === 'furn') {    // 家具：按 id 细画
      switch (id) {
        case 'table': case 'redTable': {
          g.fillStyle = id === 'redTable' ? '#9c4a38' : '#bfae90';
          g.fillRect(w * 0.08, h * 0.34, w * 0.84, h * 0.18);
          g.strokeStyle = K().jiao; g.lineWidth = 0.9;
          g.strokeRect(w * 0.08, h * 0.34, w * 0.84, h * 0.18);
          g.beginPath();
          g.moveTo(w * 0.18, h * 0.52); g.lineTo(w * 0.18, h * 0.9);
          g.moveTo(w * 0.82, h * 0.52); g.lineTo(w * 0.82, h * 0.9);
          g.stroke();
          break;
        }
        case 'chair': {
          g.fillStyle = '#bfae90';
          g.fillRect(w * 0.24, h * 0.4, w * 0.52, h * 0.14);
          g.strokeStyle = K().jiao; g.lineWidth = 0.9;
          g.strokeRect(w * 0.24, h * 0.4, w * 0.52, h * 0.14);
          g.beginPath();
          g.moveTo(w * 0.3, h * 0.54); g.lineTo(w * 0.3, h * 0.88);
          g.moveTo(w * 0.7, h * 0.54); g.lineTo(w * 0.7, h * 0.88);
          g.moveTo(w * 0.3, h * 0.54); g.quadraticCurveTo(w * 0.5, h * 0.28, w * 0.7, h * 0.54);
          g.stroke();
          break;
        }
        case 'screen': {   // 屏风：三折
          g.fillStyle = K().a('#b8934e', 0.5);
          g.fillRect(w * 0.14, h * 0.12, w * 0.24, h * 0.74);
          g.fillRect(w * 0.38, h * 0.08, w * 0.24, h * 0.8);
          g.fillRect(w * 0.62, h * 0.12, w * 0.24, h * 0.74);
          g.strokeStyle = K().jiao; g.lineWidth = 0.9;
          g.strokeRect(w * 0.14, h * 0.12, w * 0.24, h * 0.74);
          g.strokeRect(w * 0.38, h * 0.08, w * 0.24, h * 0.8);
          g.strokeRect(w * 0.62, h * 0.12, w * 0.24, h * 0.74);
          break;
        }
        case 'stand': {    // 衣架
          g.strokeStyle = K().zhe; g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(cx, h * 0.9); g.lineTo(cx, h * 0.2);
          g.moveTo(w * 0.2, h * 0.24); g.quadraticCurveTo(cx, h * 0.1, w * 0.8, h * 0.24);
          g.stroke();
          break;
        }
        case 'mat': {      // 蒲团
          g.fillStyle = '#c2b088';
          g.beginPath(); g.ellipse(cx, h * 0.6, w * 0.3, h * 0.22, 0, 0, 7); g.fill();
          g.strokeStyle = K().jiao; g.lineWidth = 0.9; g.stroke();
          g.strokeStyle = K().a(K().jiao, 0.4); g.lineWidth = 0.6;
          g.beginPath(); g.ellipse(cx, h * 0.6, w * 0.18, h * 0.12, 0, 0, 7); g.stroke();
          break;
        }
        case 'jadeMat': {  // 寒玉席
          g.fillStyle = K().a('#9ab8ae', 0.7);
          g.fillRect(w * 0.1, h * 0.24, w * 0.8, h * 0.6);
          g.strokeStyle = K().a(K().jiao, 0.5); g.lineWidth = 0.8;
          g.strokeRect(w * 0.1, h * 0.24, w * 0.8, h * 0.6);
          const gl = 0.5 + 0.5 * Math.sin(X.Tick.count / 22);
          g.strokeStyle = X.Ink.a('#9ab8ae', 0.4 + gl * 0.3); g.lineWidth = 1.2;
          g.strokeRect(w * 0.16, h * 0.3, w * 0.68, h * 0.48);
          break;
        }
        case 'yellowAltar': {  // 黄玉案
          g.fillStyle = K().a('#c9b26a', 0.85);
          g.fillRect(w * 0.14, h * 0.36, w * 0.72, h * 0.2);
          g.strokeStyle = K().jiao; g.lineWidth = 0.9;
          g.strokeRect(w * 0.14, h * 0.36, w * 0.72, h * 0.2);
          g.beginPath();
          g.moveTo(w * 0.24, h * 0.56); g.lineTo(w * 0.24, h * 0.88);
          g.moveTo(w * 0.76, h * 0.56); g.lineTo(w * 0.76, h * 0.88);
          g.stroke();
          break;
        }
        case 'toilet': {   // 茅厕：小棚
          walls(g, w * 0.2, h * 0.5, w * 0.6, h * 0.4, '#cfc3a4');
          roofMini(g, cx, h * 0.52, w * 0.8, h * 0.34, K().thatch);
          doorDot(g, cx, h * 0.88, w * 0.2, h * 0.3);
          break;
        }
        case 'tub': {      // 浴桶
          g.fillStyle = '#a98c62';
          g.fillRect(w * 0.2, h * 0.36, w * 0.6, h * 0.48);
          g.strokeStyle = K().jiao; g.lineWidth = 0.9;
          g.strokeRect(w * 0.2, h * 0.36, w * 0.6, h * 0.48);
          g.strokeStyle = K().a(K().jiao, 0.5); g.lineWidth = 0.6;
          g.beginPath(); g.moveTo(w * 0.2, h * 0.52); g.lineTo(w * 0.8, h * 0.52); g.stroke();
          g.fillStyle = K().a(K().hua, 0.45);
          g.beginPath(); g.ellipse(cx, h * 0.38, w * 0.26, h * 0.08, 0, 0, 7); g.fill();
          break;
        }
        default: {         // 兜底：案形
          g.fillStyle = '#bfae90';
          g.fillRect(w * 0.14, h * 0.42, w * 0.72, h * 0.16);
          g.strokeStyle = K().jiao; g.lineWidth = 0.9;
          g.strokeRect(w * 0.14, h * 0.42, w * 0.72, h * 0.16);
        }
      }
    } else if (kind === 'lamp') {    // 灯笼/石灯
      if (id === 'lantern') {
        g.strokeStyle = K().zhe; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(cx, h * 0.92); g.lineTo(cx, h * 0.3); g.stroke();
        g.beginPath(); g.moveTo(w * 0.22, h * 0.34); g.quadraticCurveTo(cx, h * 0.2, w * 0.78, h * 0.34); g.stroke();
        // 灯笼（夜发光在夜色段处理）
        g.fillStyle = X.Ink.zhu;
        g.beginPath(); g.ellipse(cx, h * 0.46, w * 0.17, h * 0.14, 0, 0, 7); g.fill();
        g.strokeStyle = K().a(K().jiao, 0.6); g.lineWidth = 0.7; g.stroke();
      } else {   // 石灯
        g.fillStyle = K().a(K().yan, 0.9);
        g.fillRect(w * 0.4, h * 0.5, w * 0.2, h * 0.4);
        g.fillRect(w * 0.3, h * 0.34, w * 0.4, h * 0.16);
        g.fillRect(w * 0.24, h * 0.2, w * 0.52, h * 0.14);
        g.strokeStyle = K().a(K().jiao, 0.6); g.lineWidth = 0.7;
        g.strokeRect(w * 0.4, h * 0.5, w * 0.2, h * 0.4);
        g.strokeRect(w * 0.3, h * 0.34, w * 0.4, h * 0.16);
        g.strokeRect(w * 0.24, h * 0.2, w * 0.52, h * 0.14);
      }
    } else if (kind === 'decor') {   // 装饰
      switch (id) {
        case 'fence': {    // 竹篱
          g.strokeStyle = K().a('#8ba06a', 0.95); g.lineWidth = 1.8; g.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            g.beginPath(); g.moveTo(w * (0.2 + i * 0.3), 1); g.lineTo(w * (0.2 + i * 0.3), h - 1); g.stroke();
          }
          g.lineWidth = 1;
          g.beginPath(); g.moveTo(1, h * 0.35); g.lineTo(w - 1, h * 0.35); g.moveTo(1, h * 0.7); g.lineTo(w - 1, h * 0.7); g.stroke();
          break;
        }
        case 'bamboo': {   // 竹丛
          g.strokeStyle = '#7d9a6a'; g.lineWidth = 1.6; g.lineCap = 'round';
          [[0.36, -2], [0.62, 2]].forEach(([px, lean]) => {
            g.beginPath(); g.moveTo(w * px, h * 0.94); g.lineTo(w * px + lean, h * 0.1); g.stroke();
          });
          g.lineWidth = 1.1;
          for (let k = 0; k < 6; k++) {
            const bx = w * (0.36 + (k % 2) * 0.26), by = h * (0.14 + (k % 3) * 0.12);
            g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (k % 2 ? 5 : -5), by - 4); g.stroke();
          }
          break;
        }
        case 'bonsai': {   // 盆栽
          g.fillStyle = '#9c6a4a';
          g.beginPath(); g.moveTo(w * 0.3, h * 0.68); g.lineTo(w * 0.7, h * 0.68); g.lineTo(w * 0.62, h * 0.88); g.lineTo(w * 0.38, h * 0.88); g.closePath(); g.fill();
          g.strokeStyle = K().jiao; g.lineWidth = 0.8; g.stroke();
          g.strokeStyle = K().caoD; g.lineWidth = 1.3;
          g.beginPath(); g.moveTo(cx, h * 0.66); g.quadraticCurveTo(cx - 2, h * 0.44, cx + 1, h * 0.3); g.stroke();
          g.fillStyle = K().a(K().caoD, 0.8);
          g.beginPath(); g.arc(cx + 1, h * 0.28, 3, 0, 7); g.fill();
          break;
        }
        case 'rockery': {  // 假山：mini 皴石
          g.fillStyle = K().a(K().yan, 0.95);
          g.beginPath();
          g.moveTo(w * 0.1, h * 0.9);
          g.quadraticCurveTo(w * 0.08, h * 0.4, w * 0.34, h * 0.26);
          g.quadraticCurveTo(cx, h * 0.04, w * 0.68, h * 0.3);
          g.quadraticCurveTo(w * 0.94, h * 0.44, w * 0.9, h * 0.9);
          g.closePath(); g.fill();
          g.strokeStyle = K().a(K().jiao, 0.7); g.lineWidth = 1; g.stroke();
          g.strokeStyle = K().a(K().jiao, 0.4); g.lineWidth = 0.7;
          g.beginPath(); g.moveTo(w * 0.4, h * 0.3); g.quadraticCurveTo(w * 0.34, h * 0.6, w * 0.42, h * 0.86); g.stroke();
          g.beginPath(); g.moveTo(w * 0.62, h * 0.34); g.quadraticCurveTo(w * 0.68, h * 0.6, w * 0.62, h * 0.86); g.stroke();
          break;
        }
        case 'vase': {     // 梅瓶
          g.fillStyle = '#d8d2c2';
          g.beginPath();
          g.moveTo(cx - w * 0.16, h * 0.3);
          g.quadraticCurveTo(cx - w * 0.3, h * 0.6, cx - w * 0.2, h * 0.86);
          g.lineTo(cx + w * 0.2, h * 0.86);
          g.quadraticCurveTo(cx + w * 0.3, h * 0.6, cx + w * 0.16, h * 0.3);
          g.closePath(); g.fill();
          g.strokeStyle = K().jiao; g.lineWidth = 0.9; g.stroke();
          // 梅枝一点
          g.strokeStyle = K().zhe; g.lineWidth = 1;
          g.beginPath(); g.moveTo(cx, h * 0.3); g.quadraticCurveTo(cx + 2, h * 0.2, cx + 4, h * 0.16); g.stroke();
          g.fillStyle = X.Ink.zhu;
          g.beginPath(); g.arc(cx + 4, h * 0.16, 1.2, 0, 7); g.fill();
          break;
        }
        case 'flag': {     // 旗杆
          g.strokeStyle = K().zhong; g.lineWidth = 1.6;
          g.beginPath(); g.moveTo(cx, h * 0.94); g.lineTo(cx, h * 0.06); g.stroke();
          const wav = Math.sin(X.Tick.count / 20 + b.y) * 1.4;
          g.fillStyle = X.Ink.zhu;
          g.beginPath();
          g.moveTo(cx, h * 0.08);
          g.quadraticCurveTo(cx + w * 0.5, h * 0.1 + wav, cx + w * 0.66, h * 0.16 + wav);
          g.lineTo(cx, h * 0.4);
          g.closePath(); g.fill();
          break;
        }
        default: frame(g, w, h);
      }
    } else if (kind === 'lock') {    // 后期锁定：淡影
      g.globalAlpha = 0.5;
      walls(g, w * 0.14, h * 0.42, w * 0.72, h * 0.5, K().a(K().qing, 0.6));
      roofMini(g, cx, h * 0.44, w * 0.9, h * 0.36, K().a(K().watt, 0.7));
      g.globalAlpha = 1;
    } else {
      // 未枚举类型兜底：纸台 + 名字
      g.fillStyle = K().a(K().qing, 0.5); g.fillRect(0, 0, w, h);
      frame(g, w, h);
      g.fillStyle = K().nong;
      g.font = `${Math.max(8, 12)}px "Kaiti SC",serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.def.glyph || b.def.name[0], cx, h / 2 + 1);
    }
    g.restore();
  }

  /* ---------- 弟子：淡彩小人 ---------- */
  function drawDisciple(g, d, r, z) {
    const x = r.x + d.px * T * z, y = r.y + d.py * T * z;
    const s = Math.max(0.8, 0.9 * z);
    const KI = K();
    // 阴影
    g.fillStyle = 'rgba(43,40,34,.18)';
    g.beginPath(); g.ellipse(x, y + 6 * s, 7 * s, 2.4 * s, 0, 0, 7); g.fill();
    const asleep = d.task && d.task.type === 'sleep';
    const bob = asleep ? 0 : Math.sin((X.Tick.count + d.id * 7) / 8) * 0.8;   // 走路轻微起伏
    // 修行气场：境界越高环越亮
    if (d.realm >= 1) {
      const aura = 0.12 + d.realm * 0.05;
      g.strokeStyle = KI.a(KI.hua, Math.min(0.6, aura));
      g.lineWidth = 1.6;
      g.beginPath(); g.arc(x, y - 3 * s, (9 + d.realm * 1.2) * s, 0, 7); g.stroke();
      if (d.kind === '修士' && z > 1.0) {
        g.fillStyle = KI.a(KI.hua, 0.9);
        g.font = `${9 * z}px "Kaiti SC",serif`;
        g.textAlign = 'center';
        g.fillText(X.Realms.realmName(d)[0], x + 10 * s, y - 20 * s);
      }
    }
    // 袍（杂役青灰 / 修士月白）
    const robe = d.kind === '修士' ? KI.robe2 : KI.robe1;
    g.fillStyle = robe;
    g.beginPath();
    g.moveTo(x - 4.6 * s, y - 8 * s + bob);
    g.quadraticCurveTo(x - 7.2 * s, y + 2 * s, x - 5.4 * s, y + 5.4 * s);
    g.quadraticCurveTo(x, y + 7.4 * s, x + 5.4 * s, y + 5.4 * s);
    g.quadraticCurveTo(x + 7.2 * s, y + 2 * s, x + 4.6 * s, y - 8 * s + bob);
    g.closePath(); g.fill();
    g.strokeStyle = KI.a(KI.jiao, 0.75); g.lineWidth = 0.9; g.stroke();
    // 腰带
    g.strokeStyle = KI.a('#5a4030', 0.9); g.lineWidth = 1.4 * s;
    g.beginPath(); g.moveTo(x - 4.2 * s, y - 1 * s + bob); g.lineTo(x + 4.2 * s, y - 1 * s + bob); g.stroke();
    // 头 + 束发
    g.fillStyle = KI.skin;
    g.beginPath(); g.arc(x, y - 11.5 * s + bob, 3.4 * s, 0, 7); g.fill();
    g.strokeStyle = KI.a(KI.jiao, 0.7); g.lineWidth = 0.8; g.stroke();
    g.fillStyle = '#2c2824';
    g.beginPath(); g.arc(x, y - 13.4 * s + bob, 3 * s, Math.PI * 0.95, Math.PI * 2.05); g.fill();
    g.beginPath(); g.arc(x, y - 16.6 * s + bob, 1.5 * s, 0, 7); g.fill();
    // 背篓（搬运物）
    if (d.carry) {
      g.fillStyle = KI.a(KI.zhe, 0.85);
      g.fillRect(x + 4.5 * s, y - 12 * s, 4 * s, 4.2 * s);
      g.strokeStyle = KI.a(KI.jiao, 0.6); g.lineWidth = 0.7;
      g.strokeRect(x + 4.5 * s, y - 12 * s, 4 * s, 4.2 * s);
    }
    // 状态字（放大时）
    if (z > 1.15) {
      g.fillStyle = KI.a(KI.zhong, 0.85);
      g.font = `${9.5 * z}px "Kaiti SC",serif`;
      g.textAlign = 'center';
      g.fillText(d.state, x, y - 20 * s);
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

  /* ---------- 特效（凡人向高光） ---------- */
  const FX = [];
  X.Bus.on('cult:break', e => {
    if (e.ok) FX.push({ type: 'break', x: e.d.px + 0.5, y: e.d.py + 0.5, born: performance.now() });
  });
  X.Bus.on('sp:mature', b => {
    FX.push({ type: 'bloom', x: b.x + b.def.w / 2, y: b.y + b.def.h / 2, born: performance.now() });
  });
  X.Bus.on('form:on', z => {
    const a = X.Form.get().find(a => a.z.id === z.id);
    if (a) FX.push({ type: 'form', x: a.eye.x + 0.5, y: a.eye.y + 0.5, born: performance.now() });
  });

  function drawFX(g, r, z, now) {
    for (let i = FX.length - 1; i >= 0; i--) {
      const f = FX[i];
      const life = f.type === 'break' ? 2600 : 1600;
      const age = (now - f.born) / life;
      if (age >= 1) { FX.splice(i, 1); continue; }
      const cx = r.x + f.x * T * z, cy = r.y + f.y * T * z;
      const fade = 1 - age;
      if (f.type === 'break') {
        // 金光穿云：旋转光扇 + 扩散环 + 升腾光点
        g.save();
        g.translate(cx, cy);
        g.rotate(now * 0.0005);
        for (let k = 0; k < 7; k++) {
          g.rotate(Math.PI * 2 / 7);
          const len = (60 + 30 * Math.sin(now * 0.003 + k)) * z;
          const gr = g.createLinearGradient(0, 0, 0, -len);
          gr.addColorStop(0, `rgba(184,147,78,${0.4 * fade})`);
          gr.addColorStop(1, 'rgba(184,147,78,0)');
          g.fillStyle = gr;
          g.beginPath();
          g.moveTo(-4 * z, 0); g.lineTo(4 * z, 0);
          g.lineTo(13 * z, -len); g.lineTo(-13 * z, -len);
          g.closePath(); g.fill();
        }
        g.restore();
        for (let k = 0; k < 3; k++) {
          const rr = (age * 1.5 - k * 0.2) * 64 * z;
          if (rr <= 0) continue;
          g.strokeStyle = X.Ink.a(k ? K().hua : K().gold, Math.max(0, fade * (0.55 - k * 0.15)));
          g.lineWidth = 2 - k * 0.5;
          g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.stroke();
        }
        for (let k = 0; k < 9; k++) {
          const py = cy - age * 80 * z - k * 9 * z;
          const px = cx + Math.sin(now * 0.004 + k * 2.1) * (6 + k) * z;
          g.fillStyle = X.Ink.a(k % 2 ? K().gold : '#f0e2b8', 0.7 * fade);
          g.beginPath(); g.arc(px, py, 1.6 * z, 0, 7); g.fill();
        }
      } else if (f.type === 'bloom') {
        g.fillStyle = X.Ink.a(K().caoD, 0.25 * fade);
        g.beginPath(); g.arc(cx, cy, (8 + age * 30) * z, 0, 7); g.fill();
        g.strokeStyle = X.Ink.a(K().caoD, 0.6 * fade); g.lineWidth = 1.4;
        g.beginPath(); g.arc(cx, cy, (6 + age * 40) * z, 0, 7); g.stroke();
      } else {   // form：阵成涟漪
        g.strokeStyle = X.Ink.a(K().hua, 0.6 * fade); g.lineWidth = 2;
        g.beginPath(); g.arc(cx, cy, (4 + age * 52) * z, 0, 7); g.stroke();
        g.strokeStyle = X.Ink.a(K().hua, 0.35 * fade); g.lineWidth = 1;
        g.beginPath(); g.arc(cx, cy, (2 + age * 34) * z, 0, 7); g.stroke();
      }
    }
  }

  /* ---------- 每帧合成 ---------- */
  Dyn.draw = function (g, r, z) {
    const now = performance.now();
    // 建筑
    X.Build.each(b => drawBuilding(g, b, r, z));
    // 激活阵法：阵眼→阵旗 连线
    if (X.Form) {
      for (const a of X.Form.get()) {
        const ex = r.x + (a.eye.x + 0.5) * T * z, ey = r.y + (a.eye.y + 0.5) * T * z;
        g.strokeStyle = X.Ink.a(X.Ink.hua, 0.35 + 0.1 * Math.sin(X.Tick.count / 24));
        g.lineWidth = 1.4;
        for (const f of a.flags) {
          g.beginPath();
          g.moveTo(ex, ey);
          g.lineTo(r.x + (f.x + 0.5) * T * z, r.y + (f.y + 0.5) * T * z);
          g.stroke();
        }
      }
    }
    // 弟子
    for (const d of X.Disciple.list) drawDisciple(g, d, r, z);
    // 特效
    drawFX(g, r, z, now);
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
    // 夜色 + 灯火
    const sh = X.Time.shichen;
    let night = 0;
    if (sh >= 11 || sh <= 1) night = 0.16;
    else if (sh === 2 || sh === 10) night = 0.07;
    if (night) {
      g.fillStyle = `rgba(24,30,54,${night})`;
      g.fillRect(0, 0, X.Canvas.cssW, X.Canvas.cssH);
      // 灯笼/石灯暖光
      const glowA = night / 0.16 * 0.3;
      X.Build.each(b => {
        if (!b.built || b.def.kind !== 'lamp') return;
        const cx = r.x + (b.x + b.def.w / 2) * T * z, cy = r.y + (b.y + b.def.h / 2) * T * z;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 44 * z);
        gr.addColorStop(0, `rgba(240,180,96,${glowA})`);
        gr.addColorStop(1, 'rgba(240,180,96,0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(cx, cy, 44 * z, 0, 7); g.fill();
      });
    }
    const dawn = sh === 4 || sh === 5 ? 0.05 : 0;
    if (dawn) { g.fillStyle = `rgba(226,160,90,${dawn})`; g.fillRect(0, 0, X.Canvas.cssW, X.Canvas.cssH); }
  };

  X.Dyn = Dyn;
})(globalThis.XIANG);

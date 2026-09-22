/* HUD：资源栏 / 建造菜单 / 选中面板 / 消息日志 / 存读档工具栏 / 建造交互。 */
(function (X) {
  const H = { buildDef: null, painting: false, lastPaint: null };

  const el = id => document.getElementById(id);

  // ---- 资源栏 ----
  function refreshRes() {
    const I = X.Inv;
    el('res').innerHTML = ['wood', 'stone', 'grain', 'meal'].map(k =>
      `<span class="chip">${X.Items[k].glyph} ${I.count(k)}</span>`).join('') +
      `<span class="chip">人 ${X.Disciple.list.length}/12</span>` +
      `<span class="chip ${X.Game.avgMood() < 30 ? 'bad' : ''}">心境 ${X.Game.avgMood()}</span>`;
  }

  // ---- 建造菜单 ----
  function refreshBuildMenu(cat) {
    H.cat = cat || H.cat || '结构';
    el('btabs').innerHTML = X.Buildings.cats.map(c =>
      `<button class="${c === H.cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('');
    el('bgrid').innerHTML = X.Buildings.list
      .filter(d => d.cat === H.cat)
      .map(d => {
        const locked = d.tags && d.tags.lock;
        const cost = Object.entries(d.cost).map(([k, v]) => `${X.Items[k].glyph}${v}`).join(' ');
        return `<button class="bcard ${locked ? 'locked' : ''}" data-id="${d.id}" ${locked ? 'disabled' : ''}>
          <b>${d.name}</b><span>${locked ? d.tags.lock + ' 解锁' : cost}</span><span>${d.w}×${d.h}${tagsDesc(d)}</span></button>`;
      }).join('');
    el('btabs').querySelectorAll('button').forEach(b =>
      b.onclick = () => refreshBuildMenu(b.dataset.c));
    el('bgrid').querySelectorAll('button:not(.locked)').forEach(b =>
      b.onclick = () => {
        H.buildDef = X.Buildings.byId[b.dataset.id];
        el('bhint').textContent = `放置：${H.buildDef.name}（拖动可连放 · 右键/ESC 取消）`;
        document.querySelectorAll('.bcard').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
      });
  }
  function tagsDesc(d) {
    const t = d.tags || {};
    const parts = [];
    if (t.sleep) parts.push('眠');
    if (t.cook) parts.push('炊');
    if (t.store) parts.push('储');
    if (t.farm) parts.push('农');
    if (t.comfort) parts.push('适+' + t.comfort);
    if (t.beauty) parts.push('美+' + t.beauty);
    return parts.length ? ' · ' + parts.join(' ') : '';
  }

  // ---- 选中面板 ----
  function bar(label, v, cls) {
    return `<div class="bar"><em>${label}</em><i><b style="width:${Math.max(0, Math.min(100, v))}%" class="${cls || ''}"></b></i><u>${Math.round(v)}</u></div>`;
  }
  function refreshSel() {
    const box = el('selinfo');
    const sel = X.Dyn.sel;
    if (!sel) { box.innerHTML = '<div class="hint">点选弟子 / 建筑 / 地块</div>'; return; }
    if (sel.kind === 'disc') {
      const d = X.Disciple.list.find(o => o.id === sel.id);
      if (!d) { X.Dyn.sel = null; return; }
      const tr = d.traits.map(t => X.Disciple && TRAIT_NAME(t)).join(' ');
      const S = d.stats;
      box.innerHTML = `<h3>${d.name} <small>${d.kind}</small></h3>
        <div class="sub">${tr}</div>
        <div class="sub">膂${S.li} 骨${S.gu} 识${S.shen} 悟${S.wu} 魅${S.mei}</div>
        <div class="sub">状态：${d.state}${d.bed ? ' · 有床' : ' · 无床'}${d.carry ? ` · 携${X.Items[d.carry.item].name}×${d.carry.n}` : ''}</div>
        ${bar('心境', d.mood, d.mood < 30 ? 'bad' : '')}
        ${bar('气血', d.hp / X.Disciple.maxHp(d) * 100)}
        ${bar('饥饿', d.needs.hunger)}${bar('睡眠', d.needs.sleep)}
        ${bar('舒适', d.needs.comfort)}${bar('美观', d.needs.beauty)}${bar('社交', d.needs.social)}`;
    } else if (sel.kind === 'build') {
      const b = X.Build.inst[sel.id];
      if (!b) { X.Dyn.sel = null; return; }
      const st = b.built ? '已落成' : `营造 ${Math.floor(b.progress / b.def.work * 100)}%`;
      box.innerHTML = `<h3>${b.def.name} <small>${st}</small></h3>
        <div class="sub">${b.def.w}×${b.def.h} · ${b.def.cat}${tagsDesc(b.def)}</div>
        ${b.farm ? `<div class="sub">农时：${b.farm.planted ? (b.farm.ready ? '待收' : `${Math.floor(b.farm.prog)}/10`) : '未播种'}</div>` : ''}
        <button class="act" id="btn-demolish">拆除（返还半料）</button>`;
      el('btn-demolish').onclick = () => { X.Build.demolish(b.id); X.Dyn.sel = null; };
    } else {
      const t = X.Map.at(sel.x, sel.y);
      if (!t) return;
      const TN = ['水域', '壤地', '草野', '林地', '岩场'];
      const EI = X.Map.ELEM;
      box.innerHTML = `<h3>${TN[t.t]} <small>(${sel.x},${sel.y})</small></h3>
        <div class="sub">灵韵 ${t.qi}</div>
        <div class="sub">${t.el.map((v, i) => `${EI[i]}${v}`).join(' ')}</div>`;
    }
  }
  function TRAIT_NAME(k) {
    const M = { diligent: '勤快', lazy: '怠惰', sleepy: '贪睡', ironbelly: '耐饥', foodie: '馋嘴', greenhand: '木灵', stonekin: '石肤', chatty: '话痨', quiet: '喜静', tough: '皮糙' };
    return M[k] || k;
  }

  // ---- 日志 / 提示 ----
  function pushLog(e) {
    const box = el('log');
    const div = document.createElement('div');
    div.innerHTML = `<b>第${e.day}日</b> ${e.msg}`;
    box.prepend(div);
    while (box.children.length > 12) box.lastChild.remove();
    if (e.msg.indexOf('【节气') === 0 || e.msg.indexOf('饿殒') >= 0) toast(e.msg);
  }
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    el('toasts').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 600); }, 3800);
  }

  // ---- 建造交互 ----
  function wireCanvas() {
    const cv = X.Canvas.canvas;
    let downPt = null;
    cv.addEventListener('pointermove', e => {
      const p = X.Canvas.pick(e.clientX, e.clientY);
      X.Dyn.hover = [p.tx, p.ty];
      if (H.buildDef) {
        const ox = p.tx - (H.buildDef.w >> 1), oy = p.ty - (H.buildDef.h >> 1);
        X.Dyn.ghost = { def: H.buildDef, x: ox, y: oy, ok: X.Build.terrainOk(H.buildDef, ox, oy) };
        if (H.painting && ['floor', 'wall'].includes(H.buildDef.kind)) tryPlace(ox, oy, true);
      }
    });
    cv.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      downPt = [e.clientX, e.clientY];
      if (H.buildDef && ['floor', 'wall'].includes(H.buildDef.kind)) H.painting = true;
    });
    cv.addEventListener('pointerup', e => {
      H.painting = false;
      const moved = downPt && Math.hypot(e.clientX - downPt[0], e.clientY - downPt[1]) > 5;
      if (e.button === 0 && !moved && e.target === cv) {
        const p = X.Canvas.pick(e.clientX, e.clientY);
        if (H.buildDef) {
          const ox = p.tx - (H.buildDef.w >> 1), oy = p.ty - (H.buildDef.h >> 1);
          tryPlace(ox, oy, false);
        } else selectAt(p);
      }
    });
    cv.addEventListener('contextmenu', e => { e.preventDefault(); cancelBuild(); });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') cancelBuild();
    });
  }
  function cancelBuild() {
    H.buildDef = null; X.Dyn.ghost = null; H.painting = false;
    el('bhint').textContent = '选择建筑后在地图上放置';
    document.querySelectorAll('.bcard').forEach(x => x.classList.remove('on'));
  }
  function tryPlace(x, y, silent) {
    const def = H.buildDef;
    if (!def) return;
    if (H.lastPaint && H.lastPaint === x + ',' + y) return;
    H.lastPaint = x + ',' + y;
    const b = X.Build.place(def.id, x, y);
    if (!b && !silent) toast('无法放置：地形不合或物料不足');
  }
  function selectAt(p) {
    // 优先弟子
    let best = null, bd = 1.0;
    for (const d of X.Disciple.list) {
      const dist = Math.hypot(d.px - (p.tx + 0.5), d.py - (p.ty + 0.5));
      if (dist < bd) { bd = dist; best = d; }
    }
    if (best) { X.Dyn.sel = { kind: 'disc', id: best.id }; refreshSel(); return; }
    const b = X.Build.at(p.tx, p.ty);
    if (b) { X.Dyn.sel = { kind: 'build', id: b.id }; refreshSel(); return; }
    X.Dyn.sel = { kind: 'tile', x: p.tx, y: p.ty };
    refreshSel();
  }

  // ---- 工具栏（存读档） ----
  function wireToolbar() {
    el('btn-save').onclick = () => { X.Save.save(+el('slot').value); toast('已存入档位 ' + el('slot').value); };
    el('btn-load').onclick = () => {
      if (X.Save.load(+el('slot').value)) {
        X.Scene.render(); refreshBuildMenu(); toast('读档成功');
      } else toast('该档位为空');
    };
    el('btn-new').onclick = () => {
      X.Time.reset(); X.Map.mut = {}; X.Game.init();
      X.Scene.render(); toast('新开一局：荒山立足');
    };
  }

  H.init = function () {
    refreshBuildMenu('结构');
    wireCanvas();
    wireToolbar();
    X.Bus.on('game:log', pushLog);
    X.Bus.on('map:change', () => {
      clearTimeout(H._mapT);
      H._mapT = setTimeout(() => X.Scene.render(), 150);   // 伐木/采石后重绘地形
    });
    refreshRes(); refreshSel();
    setInterval(() => { refreshRes(); refreshSel(); }, 450);
    el('bhint').textContent = '选择建筑后在地图上放置';
  };

  X.HUD = H;
})(globalThis.XIANG);

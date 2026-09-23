/* HUD：资源栏 / 建造菜单 / 选中面板 / 消息日志 / 存读档工具栏 / 建造交互。 */
(function (X) {
  const H = { buildDef: null, painting: false, lastPaint: null };

  const el = id => document.getElementById(id);

  // ---- 资源栏 ----
  function refreshRes() {
    const I = X.Inv;
    const beasts = X.Combat ? X.Combat.beasts.filter(b => !b.flee).length : 0;
    el('res').innerHTML = ['wood', 'stone', 'grain', 'meal'].map(k =>
      `<span class="chip">${X.Items[k].glyph} ${I.count(k)}</span>`).join('') +
      `<span class="chip">灵 ${I.count('ling')}</span>` +
      `<span class="chip">名 ${X.Game.rep()}</span>` +
      (beasts ? `<span class="chip bad">妖 ${beasts}</span>` : '') +
      `<span class="chip">人 ${X.Disciple.list.length}/12</span>` +
      `<span class="chip ${X.Game.avgMood() < 30 ? 'bad' : ''}">心境 ${X.Game.avgMood()}</span>`;
    const mk = el('btn-market');
    if (mk) mk.classList.toggle('alert', !!(X.Auction && X.Auction.active));
    const tv = el('btn-travel');
    if (tv) tv.classList.toggle('alert', !!beasts);
  }

  // ---- 建造菜单 ----
  function refreshBuildMenu(cat) {
    H.cat = cat || H.cat || '结构';
    const seeds = X.Recipes.splant.filter(s => X.Inv.count(s.seed) > 0)
      .map(s => `<button class="bcard seed" data-seed="${s.seed}"><b>${X.Items[s.seed].name}</b><span>种于山野 · ${s.desc}</span></button>`).join('');
    el('btabs').innerHTML = X.Buildings.cats.map(c =>
      `<button class="${c === H.cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('');
    // 套间页：整间落图
    const suites = X.Suites ? X.Suites.list.map(s => {
      const cost = Object.entries(s.cost).map(([k, v]) => `${X.Items[k].glyph}${v}`).join(' ');
      return `<button class="bcard" data-suite="${s.id}">
        <b>${s.name}</b><span>${cost}</span><span>${s.w}×${s.h} 整间 · ${s.desc}</span></button>`;
    }).join('') : '';
    el('bgrid').innerHTML =
      (seeds && H.cat === '生产' ? `<div class="sub seedhead" style="grid-column:1/-1">天地灵植（有种子可种）</div>${seeds}` : '') +
      (H.cat === '套间'
        ? `<div class="sub seedhead" style="grid-column:1/-1">整间落图：墙+门+家具一次放好，自动成房间</div>${suites}`
        : X.Buildings.list
        .filter(d => d.cat === H.cat)
        .map(d => {
          const locked = d.tags && d.tags.lock;
          const cost = Object.entries(d.cost).map(([k, v]) => `${X.Items[k].glyph}${v}`).join(' ');
          return `<button class="bcard ${locked ? 'locked' : ''}" data-id="${d.id}" ${locked ? 'disabled' : ''}>
          <b>${d.name}</b><span>${locked ? d.tags.lock + ' 解锁' : cost}</span><span>${d.w}×${d.h}${tagsDesc(d)}</span></button>`;
        }).join(''));
    el('btabs').querySelectorAll('button').forEach(b =>
      b.onclick = () => refreshBuildMenu(b.dataset.c));
    el('bgrid').querySelectorAll('button.seed').forEach(b =>
      b.onclick = () => { X.SP.plant(b.dataset.seed); refreshBuildMenu(); });
    el('bgrid').querySelectorAll('button[data-suite]').forEach(b =>
      b.onclick = () => {
        H.buildSuite = X.Suites.byId[b.dataset.suite];
        H.buildDef = null;
        el('bhint').textContent = `放置：${H.buildSuite.name}（整间 ${H.buildSuite.w}×${H.buildSuite.h} · 右键/ESC 取消）`;
        document.querySelectorAll('.bcard').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
      });
    el('bgrid').querySelectorAll('button[data-id]:not(.locked)').forEach(b =>
      b.onclick = () => {
        H.buildDef = X.Buildings.byId[b.dataset.id];
        H.buildSuite = null;
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
      if (d.travel) {   // 游历在外
        const ex = X.Travel ? X.Travel.list.find(e => e.id === d.travel) : null;
        const loc = ex ? X.World.byId[ex.dest] : null;
        const total = ex ? ex.days * 2 : 0;
        const gone = ex ? (X.Time.day - ex.day0) + (ex.back ? ex.days : 0) : 0;
        box.innerHTML = `<h3>${d.name} <small>离山</small></h3>
          <div class="sub">${loc ? `远赴${loc.name}（${X.World.distName[loc.type]}·${'★'.repeat(loc.danger)}）` : ''}</div>
          ${bar('行程', total ? gone / total * 100 : 0)}
          <div class="sub">记闻 ${ex ? ex.events : 0} 则 · 斩妖 ${ex ? ex.kills : 0} 头</div>`;
        return;
      }
      const tr = d.traits.map(t => TRAIT_NAME(t)).join(' ');
      const S = d.stats;
      const R = X.Realms, Cu = X.Cult;
      const expNeed = R.cost(d.realm, d.stage);
      const expPct = isFinite(expNeed) ? d.exp / expNeed * 100 : 100;
      const sc = Cu.scriptureOf(d);
      const spells = Cu.spellsOn(d).map(s => s.n).join('、') || '—';
      const feng = X.Feng.gradeFor(d);
      const foundBtn = d.eligible && d.kind === '杂役' && !d.scId
        ? `<button class="act" id="btn-found">择典筑基…</button>` : '';
      const foundInfo = d.eligible && d.kind === '杂役' && d.scId
        ? `<div class="sub">已择《${sc.name}》——待冲关</div>` : '';
      box.innerHTML = `<h3>${d.name} <small>${d.kind}·${R.realmName(d)}${R.stageName(d)}</small></h3>
        <div class="sub">${tr} · 灵根${X.Map.ELEM[d.linggen]}</div>
        <div class="sub">膂${S.li} 骨${S.gu} 识${S.shen} 悟${S.wu} 魅${S.mei} 气感${S.qi}</div>
        <div class="sub">状态：${d.state} · ${d.bed ? '有床' : '无床'} · 风水【${feng.grade}】 · 寿${Cu.age(d)}/${Cu.lifespan(d)}</div>
        ${d.realm >= 1 ? bar('修为', expPct, expPct >= 99.5 ? 'full' : '') : ''}
        ${sc ? `<div class="sub">道典：《${sc.name}》${X.Map.ELEM[sc.el] || '无'}属·${10 - sc.tier}品</div>
        <div class="sub">神通：${spells}</div>` : ''}
        <div class="sub">百艺：丹${Math.floor(d.craft.dan)} 器${Math.floor(d.craft.qi)} 符${Math.floor(d.craft.fu)}${d.artifact ? ' · 持' + ((X.Craft.artifacts.find(a => a.iid === d.artifact) || {}).name || '宝') : ''}</div>
        ${artifactRow(d)}
        ${foundInfo}${foundBtn}
        ${d.realm === 9 && X.Trib ? (() => {
          const ready = X.Trib.ready(d);
          const can = X.Trib.canTri(d);
          const daolv = d.daolv ? `<div class="sub">道侣：${(X.Npcs.byId[d.daolv] || {}).name || '—'}（天劫护法）</div>`
            : (X.Relation.guests().some(g => X.Relation.canDaolv(d, g.npc.id))
              ? `<button class="act small" id="btn-daolv">与驻山客卿结为道侣</button>` : '');
          return `<div class="sub" style="color:var(--zhu)">渡劫境·第${d.stage + 1}/9 劫</div>
            ${ready && can ? '<button class="act" id="btn-trib">亲手渡劫（时机条）</button> <button class="act small" id="btn-trib-auto">托付天命</button>' : ready ? '<div class="hint">雷云未聚（三十日一劫）</div>' : ''}${daolv}`;
        })() : ''}
        ${bar('心境', d.mood, d.mood < 30 ? 'bad' : '')}
        ${bar('气血', d.hp / X.Disciple.maxHp(d) * 100)}
        ${bar('饥饿', d.needs.hunger)}${bar('睡眠', d.needs.sleep)}
        ${bar('舒适', d.needs.comfort)}${bar('美观', d.needs.beauty)}${bar('社交', d.needs.social)}`;
      const fb = el('btn-found');
      if (fb) fb.onclick = () => openScriptureModal(d);
      const tb = el('btn-trib');
      if (tb) tb.onclick = () => X.Trib.begin(d, true);
      const ta = el('btn-trib-auto');
      if (ta) ta.onclick = () => { const r = X.Trib.begin(d, false); if (!r.ok) toast(r.why); };
      const dv = el('btn-daolv');
      if (dv) dv.onclick = () => {
        const g = X.Relation.guests().find(g => X.Relation.canDaolv(d, g.npc.id));
        if (g) { const r = X.Relation.pairDaolv(d, g.npc.id); toast(r.ok ? '结为道侣' : r.why); }
      };
      document.querySelectorAll('#selinfo [data-art]').forEach(btn => {
        btn.onclick = () => { X.Craft.equip(d, +btn.dataset.art); refreshSel(); };
      });
    } else if (sel.kind === 'build') {
      const b = X.Build.inst[sel.id];
      if (!b) { X.Dyn.sel = null; return; }
      const st = b.built ? '已落成' : `营造 ${Math.floor(b.progress / b.def.work * 100)}%`;
      let extra = '';
      if (b.built && b.def.tags && b.def.tags.station) extra = stationPanel(b);
      if (b.built && b.def.kind === 'splant') extra = splantPanel(b);
      if (b.built && b.def.kind === 'zeye') {
        const zid = b.def.tags.zeye;
        const z = X.Recipes.zhen.find(z => z.id === zid);
        const on = X.Form.isActive(zid);
        const cnt = X.Build.builtOf('zflag').filter(f => Math.hypot(f.x - b.x, f.y - b.y) <= z.radius).length;
        extra = `<div class="sub">${z.name}：阵旗 ${cnt}/${z.flags}（半径${z.radius}）· ${on ? '<u class="good">阵成</u>' : '未成'}</div><div class="sub">${z.desc}</div>`;
      }
      box.innerHTML = `<h3>${b.def.name} <small>${st}</small></h3>
        <div class="sub">${b.def.w}×${b.def.h} · ${b.def.cat}${tagsDesc(b.def)}</div>
        ${b.farm ? `<div class="sub">农时：${b.farm.planted ? (b.farm.ready ? '待收' : `${Math.floor(b.farm.prog)}/10`) : '未播种'}</div>` : ''}
        ${extra}
        <button class="act" id="btn-demolish">拆除（返还半料）</button>`;
      el('btn-demolish').onclick = () => { X.Build.demolish(b.id); X.Dyn.sel = null; };
      wireStation(b);
      wireSplant(b);
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
    const M = { diligent: '勤快', lazy: '怠惰', sleepy: '贪睡', ironbelly: '耐饥', foodie: '馋嘴', greenhand: '木灵', stonekin: '石肤', chatty: '话痨', quiet: '喜静', tough: '皮糙', daochi: '道痴', leyi: '乐逸' };
    return M[k] || k;
  }

  function artifactRow(d) {
    if (!X.Craft.artifacts.length) return '';
    const items = X.Craft.artifacts.map(a =>
      `<button class="act small ${a.holder && a.holder !== d.id ? 'dim' : ''}" data-art="${a.iid}">${a.name}·${a.affixes.map(x => x.n).join('')}${a.holder === d.id ? '✓' : a.holder ? '(他持)' : ''}</button>`).join('');
    return `<div class="artrow">${items}</div>`;
  }

  // ---- 择典筑基弹窗 ----
  function openScriptureModal(d) {
    closeModal();
    const wrap = document.createElement('div');
    wrap.id = 'modal';
    wrap.innerHTML = `<div class="mbox"><h3>${d.name} 择典筑基 <small>道典终身不换（除夺舍）</small></h3>
      ${X.Game.found.length ? `<div class="sub" style="margin:4px 0;color:var(--hua)">游历所得残卷 ${X.Game.found.length} 部，与开局六典同列可择：</div>` : ''}
      <div class="mgrid">${[
        ...X.Scriptures.starter,
        ...X.Game.found.map(id => X.Scriptures.byId[id]).filter(Boolean),
      ].map(s => `
        <button class="scard" data-id="${s.id}">
          <b>《${s.name}》</b>
          <span>${s.el < 0 ? '无属' : X.Map.ELEM[s.el] + '属'}·${10 - s.tier}品 · 与其灵根：
            ${X.Feng.relation(d.linggen, s.el) === '生' ? '<u class="good">相生+25%</u>' : X.Feng.relation(d.linggen, s.el) === '克' ? '<u class="bad">相克−25%</u>' : X.Feng.relation(d.linggen, s.el) === '同' ? '<u class="good">同源+10%</u>' : '平常'}
          </span>
          <span>${s.spells.map(p => p.n).join(' → ')}</span>
        </button>`).join('')}</div>
      <button class="act" id="modal-close">再想想</button></div>`;
    document.body.appendChild(wrap);
    el('modal-close').onclick = closeModal;
    wrap.querySelectorAll('.scard').forEach(b => {
      b.onclick = () => {
        X.Cult.foundDisciple(d, b.dataset.id);
        X.Game.log(`${d.name} 择定《${X.Scriptures.byId[b.dataset.id].name}》，即日冲关筑基`);
        closeModal();
        toast(`${d.name} 已择典，将赴静室冲关`);
      };
    });
  }
  function closeModal() { const m = el('modal'); if (m) m.remove(); }

  // ---- 观星台：风水视图开关 ----
  function refreshObsButton() {
    const btn = el('btn-feng');
    const has = X.Build.builtOf('observatory').length > 0;
    btn.style.display = has ? '' : 'none';
  }

  // ---- 百艺作坊面板 ----
  function stationPanel(b) {
    const art = b.def.tags.station;
    const artName = { dan: '丹道', qi: '器道', fu: '符道' }[art];
    const list = X.Recipes[art].map(r => {
      const cost = Object.entries(r.cost).map(([k, v]) => `${X.Items[k].glyph}${v}`).join(' ');
      const need = X.Realms.list[r.realm].name;
      return `<div class="recipe">
        <div class="rline"><b>${r.name}</b><span>${need}以上 · ${cost}</span></div>
        <div class="rdesc">${r.desc || (r.affix + '条词条：' + r.id)}</div>
        <div class="rbtns">
          <button class="act small" data-act="auto" data-rid="${r.id}">委托</button>
          <button class="act small" data-act="hand" data-rid="${r.id}">亲手</button>
        </div></div>`;
    }).join('');
    const queue = X.Craft.orders.filter(o => o.art === art)
      .map(o => `<span class="qtag">${X.Recipes.byId[o.rid].name}${o.worker ? '·炼' : ''} <b data-cancel="${o.id}">✕</b></span>`).join(' ') || '<span class="sub">队列空闲</span>';
    return `<div class="sub">—— ${artName} ——</div>${list}<div class="sub">队列：${queue}</div>`;
  }
  function wireStation(b) {
    const art = b.built && b.def.tags && b.def.tags.station;
    if (!art) return;
    document.querySelectorAll('#selinfo [data-act]').forEach(btn => {
      btn.onclick = () => {
        const rid = btn.dataset.rid;
        if (btn.dataset.act === 'auto') { X.Craft.queue(art, rid, 1); refreshSel(); }
        else X.QTE.open(art, X.Recipes.byId[rid].name, bonus => {
          X.Craft.manual(art, rid, bonus);
          refreshSel();
        });
      };
    });
    document.querySelectorAll('#selinfo [data-cancel]').forEach(x => {
      x.onclick = () => { X.Craft.cancel(+x.dataset.cancel); refreshSel(); };
    });
  }

  // ---- 天地灵植面板 ----
  function splantPanel(b) {
    const sp = X.Recipes.splant.find(s => s.id === b.def.id);
    const stageTxt = ['初芽', '抽条', '将成', '功成'][b.sp.stage];
    const feeds = X.Recipes.FEED_ITEMS.map((f, i) =>
      `<button class="act small" data-feed="${i}">${f.label}</button>`).join('');
    return `<div class="sub">—— ${sp.name}（${['金', '木', '水', '火', '土'][sp.el]}属）——</div>
      <div class="sub">长势：${stageTxt} · 培育 ${b.sp.stage}/3</div>
      <div class="sub">蕴养（五日一喂，可催生/反哺）：${b.sp.cd > 0 ? `静养中（余${b.sp.cd}日）` : ''}</div>
      <div>${feeds}</div>`;
  }
  function wireSplant(b) {
    if (!(b.built && b.def.kind === 'splant')) return;
    document.querySelectorAll('#selinfo [data-feed]').forEach(btn => {
      btn.onclick = () => {
        const f = X.Recipes.FEED_ITEMS[+btn.dataset.feed];
        const r = X.SP.feed(b, f.item, f.n);
        if (!r.ok) toast(r.why);
        refreshSel();
      };
    });
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
      X.Dyn.buildMode = !!(H.buildDef || H.buildSuite);
      if (H.buildDef) {
        const ox = p.tx - (H.buildDef.w >> 1), oy = p.ty - (H.buildDef.h >> 1);
        X.Dyn.ghost = { def: H.buildDef, x: ox, y: oy, ok: X.Build.terrainOk(H.buildDef, ox, oy) };
        if (H.painting && ['floor', 'wall'].includes(H.buildDef.kind)) tryPlace(ox, oy, true);
      } else if (H.buildSuite) {
        const s = H.buildSuite;
        const ox = p.tx - (s.w >> 1), oy = p.ty - (s.h >> 1);
        let ok = true;
        for (const [id, dx, dy] of s.items) {
          if (!X.Build.terrainOk(id, ox + dx, oy + dy) || X.Build.at(ox + dx, oy + dy)) { ok = false; break; }
        }
        X.Dyn.ghost = { suite: s, def: { w: s.w, h: s.h, id: 'suite', kind: 'suite' }, x: ox, y: oy, ok };
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
        if (H.buildSuite) {
          const s = H.buildSuite;
          const r = X.Suites.place(s.id, p.tx - (s.w >> 1), p.ty - (s.h >> 1));
          if (r.ok) {
            X.Game.stats.suites = (X.Game.stats.suites || 0) + 1;
            toast(`${s.name}落图（${r.n} 件蓝图）`);
            X.Feng._dirty = true;
          } else toast(r.why);
        }
        else if (H.buildDef) {
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
    H.buildDef = null; H.buildSuite = null; X.Dyn.ghost = null; X.Dyn.buildMode = false; H.painting = false;
    el('bhint').textContent = '选择建筑后在地图上放置';
    document.querySelectorAll('.bcard').forEach(x => x.classList.remove('on'));
  }
  function tryPlace(x, y, silent) {
    const def = H.buildDef;
    if (!def) return;
    if (H.lastPaint && H.lastPaint === x + ',' + y) return;
    H.lastPaint = x + ',' + y;
    const b = X.Build.place(def.id, x, y);
    if (b) {
      X.Game.stats.playerPlaced = (X.Game.stats.playerPlaced || 0) + 1;
      X.Feng._dirty = true;
    } else if (!silent) toast('无法放置：地形不合或物料不足');
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

  /* ================= P4 江湖 ================= */
  function openModal(title, bodyHtml) {
    closeModal();
    const wrap = document.createElement('div');
    wrap.id = 'modal';
    wrap.innerHTML = `<div class="mbox"><h3>${title}</h3><div id="modal-body">${bodyHtml}</div>
      <button class="act" id="modal-close">合上</button></div>`;
    document.body.appendChild(wrap);
    el('modal-close').onclick = () => { H.modalKind = null; closeModal(); };
    return wrap;
  }
  H.modalKind = null;
  function rerenderModal() {
    if (!H.modalKind || !el('modal')) return;
    const html = ({
      travel: travelBody, jianghu: jianghuBody, market: marketBody, story: storyBody,
    })[H.modalKind]();
    if (html === null || html === undefined) return;
    Promise.resolve(html).then(h => {
      const body = el('modal-body');
      if (body && H.modalKind) { body.innerHTML = h; wireModal(); cloudWire(); }
    });
  }
  function wireModal() {
    const body = el('modal-body');
    if (!body) return;
    body.querySelectorAll('[data-go]').forEach(b =>
      b.onclick = () => { H.travelDest = b.dataset.go; rerenderModal(); });
    body.querySelectorAll('[data-setoff]').forEach(b =>
      b.onclick = () => {
        const ids = [...body.querySelectorAll('[data-pick]:checked')].map(x => +x.dataset.pick);
        const r = X.Travel.start(H.travelDest, ids);
        toast(r.ok ? '游历队伍启程' : r.why);
        rerenderModal();
      });
    body.querySelectorAll('[data-bid]').forEach(b =>
      b.onclick = () => {
        const r = X.Auction.bid(+b.dataset.bid);
        toast(r.ok ? `出价 ${r.price} 灵石，暂列头名` : r.why);
        rerenderModal();
      });
    body.querySelectorAll('[data-sell]').forEach(b =>
      b.onclick = () => {
        const r = X.Auction.sell(b.dataset.sell);
        toast(r.ok ? `售出${X.Items[r.item].name}×${r.n}，得灵石 ${r.ling}` : r.why);
        rerenderModal();
      });
    // P5 旧案抉择 / 传承功德
    body.querySelectorAll('[data-choice]').forEach(b =>
      b.onclick = () => {
        const [nid, oi] = b.dataset.choice.split(':');
        X.Story.choose(nid, +oi);
        rerenderModal();
      });
    body.querySelectorAll('[data-perk]').forEach(b =>
      b.onclick = () => {
        const r = X.Trib.buyPerk(b.dataset.perk);
        toast(r.ok ? '传承已承' : r.why);
        rerenderModal();
      });
    const eb = body.querySelector('#endless-btn');
    if (eb) eb.onclick = () => { X.Game.endless = true; X.Story.ending = null; toast('无尽模式：终局判定已关闭'); rerenderModal(); };
  }

  // ---- 游历面板 ----
  function travelBody() {
    const act = X.Travel.list.map(e => {
      const loc = X.World.byId[e.dest];
      const party = e.party.map(i => (X.Disciple.list.find(d => d.id === i) || { name: '?' }).name).join('、');
      const gone = (X.Time.day - e.day0) + (e.back ? e.days : 0);
      return `<div class="sectrow">${loc.name} · ${party} · 第${Math.min(gone, e.days * 2)}/${e.days * 2}日${e.back ? ' · 归途' : ''} · 记闻${e.events} · 斩妖${e.kills}</div>`;
    }).join('') || '<div class="hint" style="padding:6px 0">暂无队伍在外</div>';
    let dest = '';
    if (H.travelDest) {
      const loc = X.World.byId[H.travelDest];
      const cands = X.Disciple.list.filter(d => X.Travel.canGo(d));
      dest = `<div style="margin:10px 0 4px;color:var(--hua)">遣队赴【${loc.name}】（往返约 ${loc.dist * 2} 日，每人耗 4 灵谷）</div>` +
        (cands.length ? cands.map(d =>
          `<label style="display:block;font-size:12.5px;color:var(--zhong);padding:2px 0">
            <input type="checkbox" data-pick="${d.id}"> ${d.name} · ${X.Realms.realmName(d)} · 武${d.stats.wu} 神${d.stats.shen}</label>`).join('') +
        `<button class="act small" data-setoff="1" style="margin-top:6px">启程</button>`
          : '<div class="hint">无练气三层以上的修士可遣</div>');
    }
    const locs = X.World.list.map(l =>
      `<div class="locrow"><b>${l.name}</b><span>${X.World.distName[l.type]}·${'★'.repeat(l.danger)}</span>
        <span>往返${l.dist * 2}日</span><span style="flex:1">${l.desc}</span>
        <button class="act small" data-go="${l.id}">遣队</button></div>`).join('');
    const news = X.Travel.log.slice(0, 10).map(r =>
      `<div class="hint" style="padding:2px 0">第${r.day}日 · ${r.dest} · ${r.name}（${r.opt}${r.ok ? '·成' : '·败'}）</div>`).join('');
    return `<div style="margin-bottom:8px">声望 ${X.Game.rep()} · 在外队伍 ${X.Travel.list.length}/2</div>
      <div style="font-size:13px;color:var(--jiao);letter-spacing:2px;margin:6px 0">在途</div>${act}
      ${dest}
      <div style="font-size:13px;color:var(--jiao);letter-spacing:2px;margin:10px 0 2px">九州（20 地）</div>${locs}
      ${news ? `<div style="font-size:13px;color:var(--jiao);letter-spacing:2px;margin:10px 0 2px">游历记闻</div>${news}` : ''}`;
  }

  // ---- 江湖面板 ----
  function jianghuBody() {
    const SECTS = Object.keys(X.Npcs.SECT_NAMES);
    const rows = SECTS.map(s => {
      const r = X.Relation.sects[s];
      const guest = r.guest ? X.Npcs.byId[r.guest] : null;
      return `<div class="sectrow"><b style="color:var(--jiao)">${X.Npcs.SECT_NAMES[s]}</b>
        好感 <u class="${r.aff >= 60 ? 'good' : r.aff < 0 ? 'bad' : ''}">${X.Relation.affName(r.aff)} ${r.aff}</u>
        仇怨<span class="grudgebar"><i style="width:${Math.min(100, r.grudge / 1.4)}%"></i></span>${r.grudge}
        ${guest ? `<u class="good">客卿·${guest.name}（${guest.buff.label}）</u>` : (r.aff >= 100 ? '<span style="color:var(--dan)">待客卿（需客舍+声望40）</span>' : '')}
      </div>`;
    }).join('');
    const st = X.Combat;
    return `<div style="margin-bottom:6px">声望 ${X.Game.rep()}（拍卖入场 60 · 客卿 40 · 摆摊 20） · 妖潮第 ${st.wave}/12 波 · 累计斩妖 ${st.killed}</div>
      <div style="font-size:13px;color:var(--jiao);letter-spacing:2px;margin:6px 0">六派恩怨</div>${rows}
      <div class="hint" style="margin-top:8px">游历拜访/切磋/救难增好感；途中冲突或拦截械斗结仇怨。仇怨满 100 触发犯山斗法——御器迎战可化解（不打不相识）。</div>`;
  }

  // ---- 坊市面板 ----
  function marketBody() {
    const A = X.Auction;
    let lots = '';
    if (A.active) {
      lots = `<div style="font-size:13px;color:var(--zhu);letter-spacing:2px;margin:6px 0">万宝楼开槌中 · 会期还剩 ${A.dayLeft} 日（他人每日抬价）</div>` +
        A.lots.map(l => `<div class="lotrow">
          <b>${l.name}</b><span class="ldesc">${l.desc}</span>
          <span class="price">现价 ${l.cur} 灵石</span>
          ${l.mine ? '<u class="good">你暂列头名</u>' : `<button class="act small" data-bid="${l.id}">跟价 ${Math.round(l.cur * 1.12)}</button>`}
        </div>`).join('');
    } else {
      const need = A.nextDay - X.Time.day;
      lots = `<div class="hint" style="padding:6px 0">下一届拍卖约 ${need > 0 ? need + ' 日后' : '近日'}（第${A.nextDay}日，声望≥60 得请柬）</div>`;
    }
    const SELL = A.sellPrices();
    const sellRow = Object.keys(SELL).map(k => {
      const n = X.Inv.count(k);
      return `<div class="locrow"><b>${X.Items[k].name}</b><span>存 ${n}</span><span style="flex:1">单价 ${SELL[k]} 灵石</span>
        ${n > 0 && X.Game.rep() >= 20 ? `<button class="act small" data-sell="${k}">售${k === 'herb' ? 5 : 3}份</button>` : '<span style="color:var(--dan)">声望20方可摆摊</span>'}</div>`;
    }).join('');
    return `<div style="margin-bottom:6px">灵石 ${X.Inv.count('ling')}</div>${lots}
      <div style="font-size:13px;color:var(--jiao);letter-spacing:2px;margin:10px 0 2px">摆摊售货（涨声望）</div>${sellRow}`;
  }

  // ---- 旧案面板（P5） ----
  function storyBody() {
    const S = X.Story;
    const pend = S.choicePending ? S.nodeById(S.choicePending) : null;
    const choiceHtml = pend ? `<div style="margin:10px 0;padding:10px;border:1px solid var(--zhu);border-radius:6px">
      <div style="font-size:13.5px;color:var(--zhu);margin-bottom:4px">${pend.name}</div>
      <div class="hint" style="margin-bottom:8px">${pend.text}</div>
      ${pend.opts.map((o, i) => `<button class="act small" data-choice="${S.choicePending}:${i}">${o.label}</button>`).join(' ')}
    </div>` : '';
    const seen = S.seenLog.map(r => `<div class="hint" style="padding:2px 0">卷${'一二三四五'[r.ch - 1]} · 第${r.day}日 · ${r.name}</div>`).join('');
    const legacy = X.Game.legacy;
    const perks = X.Trib.PERKS.map(p => {
      const owned = X.Trib.hasPerk(p.id);
      return `<div class="locrow"><b>${p.name}</b><span style="flex:1">${p.desc}</span>
        ${owned ? '<u class="good">已承</u>' : `<button class="act small" data-perk="${p.id}">功德${p.cost}</button>`}</div>`;
    }).join('');
    const end = S.ending ? `<div style="margin-top:10px;padding:10px;border:2px solid var(--zhu);border-radius:8px;text-align:center">
      <div style="font-size:17px;color:var(--zhu);letter-spacing:4px">【${S.ending.name}】</div>
      <div class="hint" style="margin:6px 0">${S.ending.note}（第${S.ending.day}日）</div>
      <button class="act small" id="endless-btn">无尽模式·继续经营</button></div>` : '';
    return `<div style="margin-bottom:6px">旧案进度 ${S.progress()}/24 · 已终卷${S.chapter} · 飞升 ${X.Game.ascended} 人 · 功德 ${legacy.points}</div>
      ${end}${choiceHtml}
      <div style="font-size:13px;color:var(--jiao);letter-spacing:2px;margin:8px 0 2px">旧案记闻</div>
      ${seen || '<div class="hint">尚无线索——经营门派、游历九州，真相自会浮现</div>'}
      <div style="font-size:13px;color:var(--jiao);letter-spacing:2px;margin:10px 0 2px">飞升传承（功德 ${legacy.points}）</div>${perks}
      ${legacy.ascList.length ? `<div class="hint" style="margin-top:6px">登仙录：${legacy.ascList.map(a => `${a.name}(第${a.day}日)`).join('、')}</div>` : ''}`;
  }
  // ---- 云端面板（P7） ----
  function cloudBody() {
    const C = X.Cloud;
    if (!C || !C.online) return `<div class="hint" style="padding:8px 0">未探测到云端（需 node server/server.js @ :8700）。单机完全可玩，云端仅同步/参观/排行。</div>`;
    if (!C.token) {
      return `<div style="padding:6px 0"><input id="cloud-name" placeholder="掌门道号（即账号）" style="height:30px;padding:0 8px;border:1px solid rgba(106,95,76,.5);border-radius:4px;background:var(--paper);color:var(--jiao);font-family:inherit">
        <button class="act small" id="cloud-login">登录/注册</button></div>
        <div class="hint">轻账号：道号即身份，无密码——个人自用与朋友共享足够。</div>`;
    }
    let main = `<div style="margin:4px 0">已登录：<b style="color:var(--hua)">${C.name}</b></div>
      <div style="margin:8px 0 4px;font-size:13px;color:var(--jiao);letter-spacing:2px">云存档（LWW，取回前自动留底本地）</div>`;
    for (const s of [1, 2, 3]) main += `<button class="act small" data-cup="${s}">上传至槽${s}</button> `;
    main += `<div style="margin:6px 0">`;
    for (const s of [1, 2, 3]) main += `<button class="act small" data-cdown="${s}">自槽${s}取回</button> `;
    main += `</div><div style="margin:10px 0 4px;font-size:13px;color:var(--jiao);letter-spacing:2px">门派参观与排行</div>
      <button class="act small" id="cloud-sect-up">上传本派快照</button>
      <button class="act small" id="cloud-board-up">投稿排行（最高声望）</button>
      <button class="act small" id="cloud-view">拉取参观/排行</button>
      <div id="cloud-list" style="margin-top:8px"></div>`;
    return main;
  }
  function cloudWire() {
    const box = el('modal-body');
    if (!box) return;
    const login = el('cloud-login');
    if (login) login.onclick = async () => {
      const n = el('cloud-name').value.trim();
      if (!n) return toast('请输入道号');
      const r = await X.Cloud.login(n);
      toast(r.ok ? `欢迎，${r.name}` : '登录失败');
      rerenderModal();
    };
    const up = el('cloud-sect-up');
    if (up) up.onclick = async () => {
      const realms = {};
      X.Disciple.list.forEach(d => { const n = X.Realms.realmName(d); realms[n] = (realms[n] || 0) + 1; });
      const snap = { 年: X.Time.year, 人口: X.Disciple.list.length, 境界: realms, 声望: X.Game.rep(), 飞升: X.Game.ascended, 妖潮波次: X.Combat.wave, 建筑: X.Game.stats.buildingsDone, 斩妖: X.Combat.killed };
      const r = await X.Cloud.postSect(snap);
      toast(r.ok ? '快照已上传，静候参观' : '上传失败');
    };
    const bu = el('cloud-board-up');
    if (bu) bu.onclick = async () => {
      const r = await X.Cloud.postBoard('topRep', X.Game.rep());
      toast(r.ok ? '已投稿（最高声望榜）' : '投稿失败');
    };
    const vw = el('cloud-view');
    if (vw) vw.onclick = async () => {
      const [b, s] = await Promise.all([X.Cloud.board(), X.Cloud.sects()]);
      const list = el('cloud-list');
      if (!list) return;
      let html = '<div class="hint">声望榜：' + ((b.board && b.board.topRep) || []).slice(0, 5).map((r, i) => `${i + 1}.${r.name}(${r.value})`).join(' · ') + '</div>';
      html += '<div class="hint" style="margin-top:4px">参观：' + ((s.sects) || []).slice(0, 5).map(x => `${x.name}·${(x.snap['年'] || 1)}年·人口${x.snap['人口']}·飞升${x.snap['飞升'] || 0}`).join('｜') + '</div>';
      list.innerHTML = html;
    };
    box.querySelectorAll('[data-cup]').forEach(b => b.onclick = async () => {
      const r = await X.Cloud.putSave(+b.dataset.cup, X.Save.snapshot());
      toast(r.ok ? `已上传云端槽${b.dataset.cup}` : '上传失败');
    });
    box.querySelectorAll('[data-cdown]').forEach(b => b.onclick = async () => {
      const r = await X.Cloud.getSave(+b.dataset.cdown);
      if (!r.ok) return toast(r.why || '空槽');
      try {
        X.Save.save('auto');
        X.Save.importText(r.json);
        H.modalKind = null; closeModal();
        X.Scene.render(); refreshBuildMenu();
        toast('已取回云端存档（本地原进度已入自动档）');
      } catch (e) { toast('存档解析失败'); }
    });
  }

  function wireP4Buttons() {
    el('btn-travel').onclick = () => {
      if (H.modalKind === 'travel') { H.modalKind = null; return closeModal(); }
      H.modalKind = 'travel'; H.travelDest = null;
      openModal('游历九州', travelBody()); wireModal();
    };
    el('btn-jianghu').onclick = () => {
      if (H.modalKind === 'jianghu') { H.modalKind = null; return closeModal(); }
      H.modalKind = 'jianghu';
      openModal('江湖恩怨', jianghuBody()); wireModal();
    };
    el('btn-market').onclick = () => {
      if (H.modalKind === 'market') { H.modalKind = null; return closeModal(); }
      H.modalKind = 'market';
      openModal('坊市·万宝楼', marketBody()); wireModal();
    };
    // P5 旧案 / P7 云端
    el('btn-story').onclick = () => {
      if (H.modalKind === 'story') { H.modalKind = null; return closeModal(); }
      H.modalKind = 'story';
      openModal('旧案·灰烬遗音', storyBody()); wireModal();
    };
    el('btn-cloud').onclick = () => {
      if (H.modalKind === 'cloud') { H.modalKind = null; return closeModal(); }
      H.modalKind = 'cloud';
      openModal('云端·云卷云舒', cloudBody()); wireModal(); cloudWire();
    };
    // P5 结局/抉择弹层
    X.Bus.on('story:choice', n => { toast(`旧案待决：${n.name}（旧案面板）`); el('btn-story').classList.add('alert'); });
    X.Bus.on('story:ending', e => {
      const wrap = document.createElement('div');
      wrap.id = 'modal';
      wrap.innerHTML = `<div class="mbox" style="text-align:center">
        <div style="font-size:26px;color:var(--zhu);letter-spacing:8px;margin:10px 0">${e.name}</div>
        <div class="hint" style="font-size:14px;letter-spacing:2px">${e.note}</div>
        <div class="hint" style="margin:10px 0">第 ${e.day} 日 · 飞升 ${X.Game.ascended} 人 · 声望 ${X.Game.rep()}</div>
        <button class="act" id="endless-open">无尽模式·继续经营</button></div>`;
      document.body.appendChild(wrap);
      wrap.querySelector('#endless-open').onclick = () => {
        X.Game.endless = true; X.Story.ending = null;
        wrap.remove(); toast('终局判定已关闭，山门长青');
      };
    });
    X.Bus.on('trib:on', t => toast(`${t.d.name} 第${t.no}劫将至——旧案面板/弟子面板可亲手渡劫`));
    X.Bus.on('ascend:done', () => toast('有弟子飞升！功德传世（旧案面板·传承）'));
    // P7 云端探测（离线静默）
    if (X.Cloud) { X.Cloud.loadAuth(); X.Cloud.ping().then(on => { if (on && X.Cloud.token) el('btn-cloud').classList.add('alert'); }); }
    X.Bus.on('auction:on', () => { toast('万宝楼开槌——坊市面板可竞价'); });
    X.Bus.on('wave:on', w => { toast(`妖潮第 ${w} 波来袭！修士将自动迎敌`); });
    X.Bus.on('raid:on', e => { toast(`${X.Npcs.SECT_NAMES[e.sect]}犯山：${e.names.join('、')}！`); });
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
    wireP4Buttons();
    // 掌门手册 2.0（聚光灯引导）+ 按钮门控 + 清晰模式
    const tut = document.createElement('div');
    tut.id = 'tut'; tut.style.display = 'none';
    document.body.appendChild(tut);
    const refreshTut = () => {
      const s = X.Tut ? X.Tut.step() : null;
      document.querySelectorAll('.tut-hi').forEach(x => x.classList.remove('tut-hi'));
      tut.style.display = s ? 'block' : 'none';
      if (!s) return;
      // 定位：目标元素旁 / 无目标居中
      let left = innerWidth / 2 - 240, top = innerHeight / 2 - 90;
      if (s.target) {
        const tEl = document.querySelector(s.target);
        if (tEl) {
          tEl.classList.add('tut-hi');
          const rc = tEl.getBoundingClientRect();
          left = Math.max(8, Math.min(innerWidth - 500, rc.left + rc.width / 2 - 240));
          top = rc.bottom + 10;
          if (top + 150 > innerHeight) top = Math.max(8, rc.top - 155);
        }
      }
      tut.style.left = left + 'px'; tut.style.top = top + 'px';
      tut.innerHTML = `<b>掌门手册 ${s.idx}/${s.total} · ${s.title}</b>
        <div class="tut-text">${s.text}</div>
        <div class="tut-btns"><button id="tut-go">${s.btn || '下一步'}</button><button id="tut-skip">跳过教学</button></div>`;
      el('tut-go').onclick = () => {
        if (s.id === 'welcome' || s.id === 'world') X.Tut.begin();
        refreshTut();
      };
      el('tut-skip').onclick = () => {
        document.querySelectorAll('.tut-hi').forEach(x => x.classList.remove('tut-hi'));
        X.Tut.skip(); refreshTut();
      };
    };
    setInterval(refreshTut, 900); refreshTut();
    // 顶栏按钮按进度解锁（解锁瞬间提示）
    const GATES = { 'btn-travel': 'travel', 'btn-jianghu': 'jianghu', 'btn-market': 'market', 'btn-story': 'story' };
    setInterval(() => {
      for (const [bid, kind] of Object.entries(GATES)) {
        const btn = el(bid);
        if (!btn) continue;
        const show = X.Tut.unlocked(kind);
        if (show && btn.style.display === 'none') {
          btn.style.display = '';
          toast(`解锁新面板：${btn.title.split('·')[0]}`);
        }
        if (!show) btn.style.display = 'none';
        else if (btn.style.display === '') btn.style.display = '';
      }
    }, 700);
    // 帮助指南
    el('btn-help').onclick = () => {
      H.modalKind = null;
      openModal('玩法指南', `
        <div class="sub" style="margin:6px 0"><b style="color:var(--jiao)">主线循环</b>：安身（田/灶/床）→ 杂役吐纳 → 择典筑基 → 修士打坐冲境 → 丹器符阵辅修 → 游历扬名 → 御妖潮/犯山 → 渡劫九重 → 飞升传承。</div>
        <div class="sectrow"><b style="color:var(--jiao)">房间与风水</b>：墙+门围合即成「房间」，家具五行生扶本命＝大吉（修炼×1.4、破境加成）。嫌手围麻烦——营造【套间】页一键整间。观星台建好后顶栏「☰风水」可看全图吉凶。</div>
        <div class="sectrow"><b style="color:var(--jiao)">杂役 vs 修士</b>：杂役干活（建/种/炊/搬）闲时吐纳；练气圆满可择典筑基转修士。修士不干活：打坐/冲关/百艺/迎敌。转职门槛见弟子面板。</div>
        <div class="sectrow"><b style="color:var(--jiao)">百艺</b>：建丹房/器坊/符案，选中作坊即可「委托」（修士自动做）或「亲手」（小窗时机条加成）。丹药符箓会自动服用。</div>
        <div class="sectrow"><b style="color:var(--jiao)">江湖</b>：游历面板派修士出行（记闻/声望/残卷/灵材）；声望 25 后妖潮每 30 日一波，修士自动御敌；仇怨满会犯山；坊市每 90 日拍卖（声望 60）。</div>
        <div class="sectrow"><b style="color:var(--jiao)">终局</b>：渡劫境 30 日一劫共九劫（护体丹/法宝/护体阵/道侣四件套备战，弟子面板可亲手渡）；旧案五章随进度揭开；三结局+无尽模式见「旧案」面板。</div>
        <div class="hint" style="margin-top:8px">快捷键：空格=暂停/继续 · ESC/右键=取消放置 · 拖动地图=平移 · 滚轮=缩放 · 存档在浏览器本地（工具栏），云端可同步。</div>`);
    };
    const clr = el('btn-clear');
    try { if (localStorage.getItem('xiang_clear') === '1') { document.body.classList.add('clear'); clr.classList.add('on'); } } catch {}
    clr.onclick = () => {
      const on = document.body.classList.toggle('clear');
      clr.classList.toggle('on', on);
      try { localStorage.setItem('xiang_clear', on ? '1' : '0'); } catch {}
    };
    el('btn-feng').onclick = () => {
      X.Dyn.fengView = !X.Dyn.fengView;
      el('btn-feng').classList.toggle('on', X.Dyn.fengView);
    };
    setInterval(() => {
      refreshRes(); refreshSel(); refreshObsButton();
      if (H.modalKind) rerenderModal();
      // 种子增减时刷新建造菜单
      const sig = X.Recipes.splant.map(s => X.Inv.count(s.seed)).join(',');
      if (sig !== H._seedSig) { H._seedSig = sig; refreshBuildMenu(); }
    }, 450);
    el('bhint').textContent = '选择建筑后在地图上放置';
  };

  X.HUD = H;
})(globalThis.XIANG);

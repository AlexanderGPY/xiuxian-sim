/* 风水局：房间识别（围合检测）→ 房间五行加权 → 生扶本命定吉凶。
   吉凶作用：修炼速度 / 破境成功率。观星台落成后可开叠加视图。 */
(function (X) {
  const W = X.Map.W, H = X.Map.H;
  const SHENG = [2, 3, 1, 4, 0];   // 金生水 水生木 木生火 火生土 土生金
  const KE = [1, 4, 3, 2, 0];     // 金克木 木克土 土克水 水克火 火克金
  const F = { rooms: [], _dirty: true };

  F.relation = function (a, b) {
    if (a === b) return '同';
    if (SHENG[a] === b) return '生';
    if (KE[a] === b) return '克';
    return '无关';
  };

  // 围体（墙/门/不可通行建筑）算边界；可通行建筑不围合
  function solid(x, y) {
    const b = X.Build.at(x, y);
    return !!(b && (b.built && !b.def.passable || b.def.kind === 'door'));
  }

  F.compute = function () {
    const solidGrid = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = (i / W) | 0;
      if (solid(x, y)) solidGrid[i] = 1;
    }
    // 从地图边界泛洪"室外"
    const outside = new Uint8Array(W * H);
    const stack = [];
    for (let x = 0; x < W; x++) {
      if (!solidGrid[x]) { outside[x] = 1; stack.push(x); }
      const b = (H - 1) * W + x;
      if (!solidGrid[b]) { outside[b] = 1; stack.push(b); }
    }
    for (let y = 0; y < H; y++) {
      const l = y * W, r = y * W + W - 1;
      if (!solidGrid[l]) { outside[l] = 1; stack.push(l); }
      if (!solidGrid[r]) { outside[r] = 1; stack.push(r); }
    }
    while (stack.length) {
      const i = stack.pop(), x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (!solidGrid[ni] && !outside[ni]) { outside[ni] = 1; stack.push(ni); }
      }
    }
    // 非室外且非围体 → 房间内部，按连通分块
    const seen = new Uint8Array(W * H);
    const rooms = [];
    for (let i = 0; i < W * H; i++) {
      if (solidGrid[i] || outside[i] || seen[i]) continue;
      const tiles = [], st = [i];
      seen[i] = 1;
      while (st.length) {
        const c = st.pop(), x = c % W, y = (c / W) | 0;
        tiles.push(c);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx;
          if (!solidGrid[ni] && !outside[ni] && !seen[ni]) { seen[ni] = 1; st.push(ni); }
        }
      }
      if (tiles.length < 2 || tiles.length > 400) continue;
      rooms.push(analyze(tiles));
    }
    F.rooms = rooms;
    F._dirty = false;
    X.Bus.emit('feng:recompute', rooms);
    return rooms;
  };

  function analyze(tiles) {
    const elW = [0, 0, 0, 0, 0];
    let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
    const lifePri = { cult: 0, sleep: 1, cook: 2 };
    let life = null, purpose = null;
    // 内部：地板 + 家具；边界：墙/门
    for (const i of tiles) {
      const x = i % W, y = (i / W) | 0;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      const b = X.Build.at(x, y);
      if (b && b.built) {
        if (b.def.kind === 'floor') elW[b.def.el] += 1;
        else {
          elW[b.def.el] += 2;
          const pri = b.def.tags && (b.def.tags.cult ? 'cult' : b.def.tags.sleep ? 'sleep' : b.def.tags.cook ? 'cook' : null);
          if (pri && (!life || lifePri[pri] < lifePri[life])) { life = pri; purpose = b; }
        }
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nb = X.Build.at(x + dx, y + dy);
        if (nb && nb.built && solid(x + dx, y + dy)) elW[nb.def.el] += 3;
      }
    }
    let dom = 0;
    for (let k = 1; k < 5; k++) if (elW[k] > elW[dom]) dom = k;
    const total = elW.reduce((a, b) => a + b, 0);
    let grade = '平', cultM = 1, brkM = 1;
    if (life && purpose && total >= 4) {
      const rel = F.relation(dom, purpose.def.el);
      if (rel === '生') { grade = '大吉'; cultM = 1.4; brkM = 1.15; }
      else if (rel === '同') { grade = '吉'; cultM = 1.2; brkM = 1.08; }
      else if (rel === '克') { grade = '凶'; cultM = 0.7; brkM = 0.85; }
    }
    // 藏风阵：房间中心被覆盖则风水升一档
    if (X.Form && X.Form.fengUpAt((minX + maxX) >> 1, (minY + maxY) >> 1)) {
      const up = { 凶: ['平', 1, 1], 平: ['吉', 1.2, 1.08], 吉: ['大吉', 1.4, 1.15] }[grade];
      if (up) { grade = up[0]; cultM = up[1]; brkM = up[2]; }
    }
    const names = { cult: '静室', sleep: '寝室', cook: '灶房' };
    return {
      tiles, bbox: { minX, minY, maxX, maxY },
      elW, dom, total,
      purpose: life ? names[life] : '院落',
      life: purpose ? { el: purpose.def.el, name: purpose.def.name } : null,
      grade, cultM, brkM,
    };
  }

  F.roomAt = function (x, y) {
    if (F._dirty) F.compute();
    for (const r of F.rooms) {
      if (x >= r.bbox.minX && x <= r.bbox.maxX && y >= r.bbox.minY && y <= r.bbox.maxY) {
        if (r.tiles.some(i => (i % W) === x && ((i / W) | 0) === y)) return r;
      }
    }
    return null;
  };
  F.get = () => { if (F._dirty) F.compute(); return F.rooms; };

  // 某弟子可享的风水：静修点（修士）或床位（杂役）所在房间
  F.gradeFor = function (d) {
    const spot = d.cultSpot ? X.Build.inst[d.cultSpot] : (d.bed ? X.Build.inst[d.bed] : null);
    if (!spot) return { grade: '平', cultM: 1, brkM: 1 };
    const r = F.roomAt(spot.x, spot.y);
    return r || { grade: '平', cultM: 1, brkM: 1 };
  };

  X.Bus.on('build:change', () => { F._dirty = true; });
  X.Bus.on('build:done', () => { F._dirty = true; });
  X.Feng = F;
})(globalThis.XIANG);

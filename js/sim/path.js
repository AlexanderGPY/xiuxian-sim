/* A* 寻路：4 向，地形(水/岩不可行) × 建筑(墙/井等不可行)。
   80×60 小图，开表用数组足够；扩展上限防死锁。 */
(function (X) {
  const W = 80, H = 60, CAP = 6000;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function walkableTile(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const t = X.Map.terrain[y * W + x];
    if (t === X.Map.TERRAIN.WATER || t === X.Map.TERRAIN.ROCK) return false;
    const B = X.Build;
    if (B && B.grid) {
      const id = B.grid[y * W + x];
      if (id) {
        const b = B.inst[id];
        if (b && !b.built) return true;              // 蓝图不挡路
        if (b && !b.def.passable) return false;
      }
    }
    return true;
  }
  function passableNeighbor(x, y) {   // 目标格本身不可站时找邻格
    return walkableTile(x, y) ? [x, y] : DIRS.map(([dx, dy]) => [x + dx, y + dy]).find(([nx, ny]) => walkableTile(nx, ny)) || null;
  }

  function find(sx, sy, tx, ty) {
    sx |= 0; sy |= 0; tx |= 0; ty |= 0;
    const goal = passableNeighbor(tx, ty);
    if (!goal) return null;
    [tx, ty] = goal;
    const key = (x, y) => y * W + x;
    const gScore = new Float32Array(W * H).fill(Infinity);
    const came = new Int32Array(W * H).fill(-1);
    const inOpen = new Uint8Array(W * H);
    const open = [];
    const h = (x, y) => Math.abs(x - tx) + Math.abs(y - ty);
    const sk = key(sx, sy);
    gScore[sk] = 0;
    open.push([h(sx, sy), sk]); inOpen[sk] = 1;
    let expanded = 0, found = -1;
    while (open.length) {
      // 取 f 最小（小图插入排序开销可接受）
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [, ck] = open.splice(bi, 1)[0];
      inOpen[ck] = 0;
      if (ck === key(tx, ty)) { found = ck; break; }
      if (++expanded > CAP) break;
      const cx = ck % W, cy = (ck / W) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (!walkableTile(nx, ny)) continue;
        const nk = key(nx, ny);
        const ng = gScore[ck] + 1;
        if (ng < gScore[nk]) {
          gScore[nk] = ng; came[nk] = ck;
          if (!inOpen[nk]) { open.push([ng + h(nx, ny), nk]); inOpen[nk] = 1; }
        }
      }
    }
    if (found < 0) return null;
    const path = [];
    let cur = found;
    while (cur !== -1 && cur !== sk) { path.push([cur % W, (cur / W) | 0]); cur = came[cur]; }
    path.reverse();
    return path;
  }

  X.Path = { find, walkable: walkableTile };
})(globalThis.XIANG);

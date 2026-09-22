/* 建筑定义：P1 可用 30 种 + 后期锁定 4 种。
   cost 资源消耗；work 建造工时(tick)；passable 是否可通行；
   tags: sleep(床位品质) cook store(容量) farm comfort beauty well lock */
(function (X) {
  const D = [
    // ---- 结构 6 ----
    { id: 'wallWood',   name: '木墙',   cat: '结构', w: 1, h: 1, cost: { wood: 2 }, work: 40,  passable: false, kind: 'wall',  glyph: '〓' },
    { id: 'wallStone',  name: '石墙',   cat: '结构', w: 1, h: 1, cost: { stone: 3 }, work: 60, passable: false, kind: 'wall',  glyph: '▓' },
    { id: 'doorWood',   name: '木门',   cat: '结构', w: 1, h: 1, cost: { wood: 3 }, work: 40,  passable: true,  kind: 'door',  glyph: '门' },
    { id: 'floorWood',  name: '木地板', cat: '结构', w: 1, h: 1, cost: { wood: 1 }, work: 16,  passable: true,  kind: 'floor', glyph: '', tags: { comfort: 1 } },
    { id: 'floorStone', name: '石地板', cat: '结构', w: 1, h: 1, cost: { stone: 1 }, work: 20, passable: true,  kind: 'floor', glyph: '', tags: { comfort: 1, beauty: 1 } },
    { id: 'fence',      name: '竹篱',   cat: '结构', w: 1, h: 1, cost: { wood: 1 }, work: 12,  passable: true,  kind: 'decor', glyph: '篱', tags: { beauty: 1 } },
    // ---- 起居 8 ----
    { id: 'bedWood', name: '木床', cat: '起居', w: 1, h: 2, cost: { wood: 4 }, work: 50, passable: true, kind: 'bed', glyph: '眠', tags: { sleep: 1 } },
    { id: 'bedSoft', name: '软榻', cat: '起居', w: 1, h: 2, cost: { wood: 8 }, work: 80, passable: true, kind: 'bed', glyph: '寝', tags: { sleep: 2 } },
    { id: 'table',  name: '食案', cat: '起居', w: 2, h: 1, cost: { wood: 3 }, work: 30, passable: true, kind: 'furn', glyph: '案', tags: { comfort: 1 } },
    { id: 'chair',  name: '坐凳', cat: '起居', w: 1, h: 1, cost: { wood: 2 }, work: 20, passable: true, kind: 'furn', glyph: '凳', tags: { comfort: 1 } },
    { id: 'screen', name: '屏风', cat: '起居', w: 1, h: 2, cost: { wood: 3 }, work: 30, passable: true, kind: 'furn', glyph: '屏', tags: { beauty: 2 } },
    { id: 'stand',  name: '衣架', cat: '起居', w: 1, h: 1, cost: { wood: 2 }, work: 16, passable: true, kind: 'furn', glyph: '架', tags: { comfort: 1 } },
    { id: 'lantern', name: '灯架', cat: '起居', w: 1, h: 1, cost: { wood: 2 }, work: 20, passable: true, kind: 'lamp', glyph: '灯', tags: { beauty: 2 } },
    { id: 'mat',    name: '蒲团', cat: '起居', w: 1, h: 1, cost: { wood: 1 }, work: 12, passable: true, kind: 'furn', glyph: '团', tags: { comfort: 1 } },
    // ---- 生产 6 ----
    { id: 'stove', name: '灶台', cat: '生产', w: 2, h: 2, cost: { stone: 4, wood: 2 }, work: 90,  passable: true, kind: 'stove', glyph: '灶', tags: { cook: 1 } },
    { id: 'well',  name: '水井', cat: '生产', w: 1, h: 1, cost: { stone: 6 }, work: 80, passable: false, kind: 'well', glyph: '井', tags: { well: 1, beauty: 1 } },
    { id: 'plot',  name: '灵田', cat: '生产', w: 2, h: 2, cost: { wood: 2 }, work: 40, passable: true, kind: 'plot', glyph: '田', tags: { farm: 1 } },
    { id: 'rack',  name: '晒谷架', cat: '生产', w: 1, h: 1, cost: { wood: 3 }, work: 30, passable: true, kind: 'furn', glyph: '晒', tags: { store: { cap: 80, only: 'grain' }, farmBuff: 0.1 } },
    { id: 'woodpile', name: '柴堆', cat: '生产', w: 1, h: 1, cost: { wood: 2 }, work: 20, passable: true, kind: 'pile', glyph: '柴', tags: { store: { cap: 120, only: 'wood' } } },
    { id: 'stonepile', name: '石料堆', cat: '生产', w: 1, h: 1, cost: { wood: 2 }, work: 20, passable: true, kind: 'pile', glyph: '磊', tags: { store: { cap: 120, only: 'stone' } } },
    // ---- 仓储 2 ----
    { id: 'stocker', name: '置物台', cat: '仓储', w: 2, h: 1, cost: { wood: 3 }, work: 36, passable: true, kind: 'store', glyph: '置', tags: { store: { cap: 250 } } },
    { id: 'granary', name: '谷仓', cat: '仓储', w: 2, h: 2, cost: { wood: 8 }, work: 100, passable: false, kind: 'store', glyph: '仓', tags: { store: { cap: 400, only: 'grain' } } },
    // ---- 装饰 6 ----
    { id: 'bonsai',  name: '盆栽', cat: '装饰', w: 1, h: 1, cost: { wood: 1 }, work: 16, passable: true, kind: 'decor', glyph: '盆', tags: { beauty: 2 } },
    { id: 'lamp',    name: '石灯', cat: '装饰', w: 1, h: 1, cost: { stone: 2 }, work: 24, passable: true, kind: 'lamp', glyph: '烛', tags: { beauty: 2 } },
    { id: 'rockery', name: '假山', cat: '装饰', w: 2, h: 2, cost: { stone: 4 }, work: 60, passable: false, kind: 'decor', glyph: '山', tags: { beauty: 3 } },
    { id: 'bamboo',  name: '竹丛', cat: '装饰', w: 1, h: 1, cost: { wood: 1 }, work: 12, passable: true, kind: 'decor', glyph: '竹', tags: { beauty: 1 } },
    { id: 'flag',    name: '旗杆', cat: '装饰', w: 1, h: 1, cost: { wood: 2 }, work: 24, passable: true, kind: 'decor', glyph: '旗', tags: { beauty: 2 } },
    { id: 'vase',    name: '梅瓶', cat: '装饰', w: 1, h: 1, cost: { stone: 1 }, work: 16, passable: true, kind: 'decor', glyph: '瓶', tags: { beauty: 2 } },
    // ---- 卫生 2 ----
    { id: 'toilet', name: '茅厕', cat: '卫生', w: 1, h: 1, cost: { wood: 3 }, work: 30, passable: true, kind: 'furn', glyph: '厕', tags: { comfort: 2 } },
    { id: 'tub',    name: '浴桶', cat: '卫生', w: 1, h: 1, cost: { wood: 3 }, work: 30, passable: true, kind: 'furn', glyph: '浴', tags: { comfort: 2 } },
    // ---- 后期锁定（展示用） ----
    { id: 'observatory', name: '观星台', cat: '后期', w: 3, h: 3, cost: { stone: 20, wood: 10 }, work: 400, passable: false, kind: 'lock', glyph: '星', tags: { lock: 'P2' } },
    { id: 'library', name: '藏经阁', cat: '后期', w: 3, h: 3, cost: { wood: 24 }, work: 400, passable: false, kind: 'lock', glyph: '经', tags: { lock: 'P2' } },
    { id: 'hall', name: '传功殿', cat: '后期', w: 3, h: 3, cost: { wood: 20, stone: 12 }, work: 400, passable: false, kind: 'lock', glyph: '殿', tags: { lock: 'P2' } },
    { id: 'alchemy', name: '丹房', cat: '后期', w: 3, h: 3, cost: { stone: 16, wood: 12 }, work: 400, passable: false, kind: 'lock', glyph: '丹', tags: { lock: 'P3' } },
  ];
  X.Buildings = {
    list: D,
    byId: {},
    cats: ['结构', '起居', '生产', '仓储', '装饰', '卫生', '后期'],
  };
  for (const d of D) X.Buildings.byId[d.id] = d;
})(globalThis.XIANG);

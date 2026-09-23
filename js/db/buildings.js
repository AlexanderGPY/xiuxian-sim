/* 建筑定义：P1 可用 30 种 + P2 道场（观星台等）+ 五行家具 + 后期锁定。
   el 五行(0金1木2水3火4土)；cost 资源；work 工时；passable 通行；
   tags: sleep(床位) cook store farm comfort beauty cult(静修) observatory lock */
(function (X) {
  const D = [
    // ---- 结构 6 ----
    { id: 'wallWood',   name: '木墙',   cat: '结构', w: 1, h: 1, cost: { wood: 2 }, work: 40,  passable: false, kind: 'wall',  glyph: '〓', el: 1 },
    { id: 'wallStone',  name: '石墙',   cat: '结构', w: 1, h: 1, cost: { stone: 3 }, work: 60, passable: false, kind: 'wall',  glyph: '▓', el: 4 },
    { id: 'doorWood',   name: '木门',   cat: '结构', w: 1, h: 1, cost: { wood: 3 }, work: 40,  passable: true,  kind: 'door',  glyph: '门', el: 1 },
    { id: 'floorWood',  name: '木地板', cat: '结构', w: 1, h: 1, cost: { wood: 1 }, work: 16,  passable: true,  kind: 'floor', glyph: '',   el: 1, tags: { comfort: 1 } },
    { id: 'floorStone', name: '石地板', cat: '结构', w: 1, h: 1, cost: { stone: 1 }, work: 20, passable: true,  kind: 'floor', glyph: '',   el: 4, tags: { comfort: 1, beauty: 1 } },
    { id: 'fence',      name: '竹篱',   cat: '结构', w: 1, h: 1, cost: { wood: 1 }, work: 12,  passable: true,  kind: 'decor', glyph: '篱', el: 1, tags: { beauty: 1 } },
    // ---- 起居 12（含 P2 五行家具） ----
    { id: 'bedWood', name: '木床', cat: '起居', w: 1, h: 2, cost: { wood: 4 }, work: 50, passable: true, kind: 'bed', glyph: '眠', el: 1, tags: { sleep: 1 } },
    { id: 'bedSoft', name: '软榻', cat: '起居', w: 1, h: 2, cost: { wood: 8 }, work: 80, passable: true, kind: 'bed', glyph: '寝', el: 1, tags: { sleep: 2 } },
    { id: 'ironBed', name: '玄铁榻', cat: '起居', w: 1, h: 2, cost: { stone: 8, wood: 4 }, work: 110, passable: true, kind: 'bed', glyph: '铁', el: 0, tags: { sleep: 2, comfort: 1 } },
    { id: 'table',  name: '食案', cat: '起居', w: 2, h: 1, cost: { wood: 3 }, work: 30, passable: true, kind: 'furn', glyph: '案', el: 1, tags: { comfort: 1 } },
    { id: 'chair',  name: '坐凳', cat: '起居', w: 1, h: 1, cost: { wood: 2 }, work: 20, passable: true, kind: 'furn', glyph: '凳', el: 1, tags: { comfort: 1 } },
    { id: 'screen', name: '屏风', cat: '起居', w: 1, h: 2, cost: { wood: 3 }, work: 30, passable: true, kind: 'furn', glyph: '屏', el: 1, tags: { beauty: 2 } },
    { id: 'stand',  name: '衣架', cat: '起居', w: 1, h: 1, cost: { wood: 2 }, work: 16, passable: true, kind: 'furn', glyph: '架', el: 1, tags: { comfort: 1 } },
    { id: 'lantern', name: '灯架', cat: '起居', w: 1, h: 1, cost: { wood: 2 }, work: 20, passable: true, kind: 'lamp', glyph: '灯', el: 3, tags: { beauty: 2 } },
    { id: 'mat',    name: '蒲团', cat: '起居', w: 1, h: 1, cost: { wood: 1 }, work: 12, passable: true, kind: 'furn', glyph: '团', el: 1, tags: { comfort: 1, cult: 1 } },
    { id: 'jadeMat', name: '寒玉席', cat: '起居', w: 1, h: 2, cost: { stone: 6 }, work: 90, passable: true, kind: 'furn', glyph: '玄', el: 2, tags: { cult: 2, comfort: 1 } },
    { id: 'redTable', name: '朱漆案', cat: '起居', w: 2, h: 1, cost: { wood: 4 }, work: 40, passable: true, kind: 'furn', glyph: '朱', el: 3, tags: { beauty: 2, comfort: 1 } },
    { id: 'yellowAltar', name: '黄玉案', cat: '起居', w: 1, h: 1, cost: { stone: 5 }, work: 44, passable: true, kind: 'furn', glyph: '黄', el: 4, tags: { comfort: 2, beauty: 1 } },
    // ---- 生产 7（含 P3 药圃） ----
    { id: 'stove', name: '灶台', cat: '生产', w: 2, h: 2, cost: { stone: 4, wood: 2 }, work: 90,  passable: true, kind: 'stove', glyph: '灶', el: 3, tags: { cook: 1 } },
    { id: 'well',  name: '水井', cat: '生产', w: 1, h: 1, cost: { stone: 6 }, work: 80, passable: false, kind: 'well', glyph: '井', el: 2, tags: { well: 1, beauty: 1 } },
    { id: 'plot',  name: '灵田', cat: '生产', w: 2, h: 2, cost: { wood: 2 }, work: 40, passable: true, kind: 'plot', glyph: '田', el: 4, tags: { farm: 1, crop: 'grain' } },
    { id: 'herbPlot', name: '药圃', cat: '生产', w: 2, h: 2, cost: { wood: 4 }, work: 60, passable: true, kind: 'plot', glyph: '圃', el: 1, tags: { farm: 1, crop: 'herb' } },
    { id: 'rack',  name: '晒谷架', cat: '生产', w: 1, h: 1, cost: { wood: 3 }, work: 30, passable: true, kind: 'furn', glyph: '晒', el: 1, tags: { store: { cap: 80, only: 'grain' }, farmBuff: 0.1 } },
    { id: 'woodpile', name: '柴堆', cat: '生产', w: 1, h: 1, cost: { wood: 2 }, work: 20, passable: true, kind: 'pile', glyph: '柴', el: 1, tags: { store: { cap: 120, only: 'wood' } } },
    { id: 'stonepile', name: '石料堆', cat: '生产', w: 1, h: 1, cost: { wood: 2 }, work: 20, passable: true, kind: 'pile', glyph: '磊', el: 4, tags: { store: { cap: 120, only: 'stone' } } },
    // ---- 仓储 2 ----
    { id: 'stocker', name: '置物台', cat: '仓储', w: 2, h: 1, cost: { wood: 3 }, work: 36, passable: true, kind: 'store', glyph: '置', el: 1, tags: { store: { cap: 250 } } },
    { id: 'granary', name: '谷仓', cat: '仓储', w: 2, h: 2, cost: { wood: 8 }, work: 100, passable: false, kind: 'store', glyph: '仓', el: 1, tags: { store: { cap: 400, only: 'grain' } } },
    // ---- 道场 2 + 阵法 7（P3） ----
    { id: 'observatory', name: '观星台', cat: '道场', w: 3, h: 3, cost: { stone: 16, wood: 8 }, work: 220, passable: false, kind: 'obs', glyph: '星', el: 0, tags: { observatory: 1, beauty: 3 } },
    { id: 'starAltar', name: '祭星坛', cat: '道场', w: 2, h: 2, cost: { stone: 10 }, work: 140, passable: false, kind: 'obs', glyph: '祭', el: 0, tags: { beauty: 2, cult: 1 } },
    { id: 'zhenFlag', name: '阵旗', cat: '道场', w: 1, h: 1, cost: { wood: 3 }, work: 30, passable: true, kind: 'zflag', glyph: '幡', el: 1, tags: { zflag: 1, beauty: 1 } },
    { id: 'eyeJuling', name: '聚灵阵眼', cat: '道场', w: 1, h: 1, cost: { stone: 6, ling: 1 }, work: 90, passable: false, kind: 'zeye', glyph: '灵', el: 2, tags: { zeye: 'juling' } },
    { id: 'eyeWenyang', name: '温养阵眼', cat: '道场', w: 1, h: 1, cost: { stone: 6, ling: 1 }, work: 90, passable: false, kind: 'zeye', glyph: '温', el: 1, tags: { zeye: 'wenyang' } },
    { id: 'eyeHoutu', name: '厚土阵眼', cat: '道场', w: 1, h: 1, cost: { stone: 6, ling: 1 }, work: 90, passable: false, kind: 'zeye', glyph: '厚', el: 4, tags: { zeye: 'houTu' } },
    { id: 'eyeQingxin', name: '清心阵眼', cat: '道场', w: 1, h: 1, cost: { stone: 6, ling: 1 }, work: 90, passable: false, kind: 'zeye', glyph: '清', el: 3, tags: { zeye: 'qingxin' } },
    { id: 'eyeYinqi', name: '引气阵眼', cat: '道场', w: 1, h: 1, cost: { stone: 6, ling: 1 }, work: 90, passable: false, kind: 'zeye', glyph: '引', el: 0, tags: { zeye: 'yinqi' } },
    { id: 'eyeCangfeng', name: '藏风阵眼', cat: '道场', w: 1, h: 1, cost: { stone: 6, ling: 1 }, work: 90, passable: false, kind: 'zeye', glyph: '藏', el: 4, tags: { zeye: 'cangfeng' } },

    // ---- 百艺 3（P3 作坊） ----
    { id: 'alchemy', name: '丹房', cat: '百艺', w: 3, h: 3, cost: { stone: 16, wood: 12 }, work: 260, passable: true, kind: 'craft', glyph: '丹', el: 3, tags: { station: 'dan', beauty: 1 } },
    { id: 'forge', name: '器坊', cat: '百艺', w: 3, h: 3, cost: { stone: 20, wood: 10 }, work: 280, passable: true, kind: 'craft', glyph: '器', el: 0, tags: { station: 'qi', beauty: 1 } },
    { id: 'talisman', name: '符案', cat: '百艺', w: 2, h: 2, cost: { wood: 10 }, work: 160, passable: true, kind: 'craft', glyph: '符', el: 1, tags: { station: 'fu', beauty: 1 } },
    // ---- 装饰 6 ----
    { id: 'bonsai',  name: '盆栽', cat: '装饰', w: 1, h: 1, cost: { wood: 1 }, work: 16, passable: true, kind: 'decor', glyph: '盆', el: 1, tags: { beauty: 2 } },
    { id: 'lamp',    name: '石灯', cat: '装饰', w: 1, h: 1, cost: { stone: 2 }, work: 24, passable: true, kind: 'lamp', glyph: '烛', el: 3, tags: { beauty: 2 } },
    { id: 'rockery', name: '假山', cat: '装饰', w: 2, h: 2, cost: { stone: 4 }, work: 60, passable: false, kind: 'decor', glyph: '山', el: 4, tags: { beauty: 3 } },
    { id: 'bamboo',  name: '竹丛', cat: '装饰', w: 1, h: 1, cost: { wood: 1 }, work: 12, passable: true, kind: 'decor', glyph: '竹', el: 1, tags: { beauty: 1 } },
    { id: 'flag',    name: '旗杆', cat: '装饰', w: 1, h: 1, cost: { wood: 2 }, work: 24, passable: true, kind: 'decor', glyph: '旗', el: 1, tags: { beauty: 2 } },
    { id: 'vase',    name: '梅瓶', cat: '装饰', w: 1, h: 1, cost: { stone: 1 }, work: 16, passable: true, kind: 'decor', glyph: '瓶', el: 4, tags: { beauty: 2 } },
    // ---- 卫生 2 ----
    { id: 'toilet', name: '茅厕', cat: '卫生', w: 1, h: 1, cost: { wood: 3 }, work: 30, passable: true, kind: 'furn', glyph: '厕', el: 1, tags: { comfort: 2 } },
    { id: 'tub',    name: '浴桶', cat: '卫生', w: 1, h: 1, cost: { wood: 3 }, work: 30, passable: true, kind: 'furn', glyph: '浴', el: 2, tags: { comfort: 2 } },
    // ---- 天地灵植 5（种子种植，不入菜单：hidden 类） ----
    { id: 'spJin', name: '铃音果树', cat: '灵植', w: 1, h: 1, cost: {}, work: 0, passable: true, kind: 'splant', glyph: '铃', el: 0, tags: { splant: 'spJin' } },
    { id: 'spMu', name: '垂云藤', cat: '灵植', w: 1, h: 1, cost: {}, work: 0, passable: true, kind: 'splant', glyph: '藤', el: 1, tags: { splant: 'spMu' } },
    { id: 'spShui', name: '五色莲', cat: '灵植', w: 1, h: 1, cost: {}, work: 0, passable: true, kind: 'splant', glyph: '莲', el: 2, tags: { splant: 'spShui' } },
    { id: 'spHuo', name: '赤焰果树', cat: '灵植', w: 1, h: 1, cost: {}, work: 0, passable: true, kind: 'splant', glyph: '焰', el: 3, tags: { splant: 'spHuo' } },
    { id: 'spTu', name: '赭岩参', cat: '灵植', w: 1, h: 1, cost: {}, work: 0, passable: true, kind: 'splant', glyph: '参', el: 4, tags: { splant: 'spTu' } },

    // ---- P4 江湖：山门/客舍 + 藏经阁/传功殿落成 ----
    { id: 'library', name: '藏经阁', cat: '道场', w: 3, h: 3, cost: { wood: 24, stone: 8 }, work: 400, passable: false, kind: 'lib', glyph: '经', el: 1, tags: { beauty: 3, library: 1 } },
    { id: 'hall', name: '传功殿', cat: '道场', w: 3, h: 3, cost: { wood: 20, stone: 12 }, work: 400, passable: false, kind: 'obs', glyph: '殿', el: 4, tags: { beauty: 2, hall: 1 } },
    { id: 'gate', name: '山门', cat: '结构', w: 2, h: 2, cost: { stone: 12, wood: 10 }, work: 160, passable: false, kind: 'gate', glyph: '门', el: 0, tags: { beauty: 2, defense: 1 } },
    { id: 'guesthall', name: '客舍', cat: '起居', w: 2, h: 2, cost: { wood: 16 }, work: 120, passable: true, kind: 'guest', glyph: '客', el: 1, tags: { comfort: 2, guest: 1 } },
  ];
  X.Buildings = {
    list: D,
    byId: {},
    cats: ['结构', '起居', '道场', '生产', '百艺', '仓储', '装饰', '卫生', '套间'],
  };
  for (const d of D) X.Buildings.byId[d.id] = d;
})(globalThis.XIANG);

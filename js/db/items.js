/* 物品与资源定义（P1 经济圈：木/石/谷/食/灵石） */
(function (X) {
  X.Items = {
    wood:  { name: '木料', glyph: '木' },
    stone: { name: '石料', glyph: '石' },
    grain: { name: '灵谷', glyph: '谷', food: 32, raw: true, rawMood: -4 },
    meal:  { name: '灵食', glyph: '食', food: 62 },
    ling:  { name: '灵石', glyph: '灵' },
  };
})(globalThis.XIANG);

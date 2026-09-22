/* 物品与资源定义（P1 经济圈：木/石/谷/食/灵石） */
(function (X) {
  X.Items = {
    wood:  { name: '木料', glyph: '木' },
    stone: { name: '石料', glyph: '石' },
    grain: { name: '灵谷', glyph: '谷', food: 32, raw: true, rawMood: -4 },
    meal:  { name: '灵食', glyph: '食', food: 62 },
    ling:  { name: '灵石', glyph: '灵' },
    // P3
    herb:     { name: '灵草', glyph: '草' },
    lingzhi:  { name: '灵芝', glyph: '芝' },
    seedJin:  { name: '铃音果种', glyph: '种' },
    seedMu:   { name: '垂云藤种', glyph: '种' },
    seedShui: { name: '五色莲种', glyph: '种' },
    seedHuo:  { name: '赤焰果种', glyph: '种' },
    seedTu:   { name: '赭岩参种', glyph: '种' },
  };
})(globalThis.XIANG);

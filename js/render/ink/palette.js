/* 五墨阶 + 点缀色 + 水墨淡彩（鬼谷向）：墨阶灰为主体，淡彩只作轻晕染 */
(function (X) {
  const INK = {
    paper: '#f2ebd8',
    jiao: '#2b2822',   // 焦
    nong: '#454038',   // 浓
    zhong: '#6a6258',  // 重
    dan: '#948c7c',    // 淡
    qing: '#cdc5b0',   // 清
    zhu: '#a83a2a',    // 朱砂（交互/警示/印章）
    hua: '#3d5a80',    // 花青（水/水系/阵法）
    zhe: '#8c6a4f',    // 赭石（土/建筑辅助）
    // —— 水墨淡彩（地形晕染/建筑设色） ——
    cao: '#94a380',    // 草绿（草野晕染）
    caoD: '#6f8a5f',   // 深草（林地）
    yan: '#b9b9a9',    // 岩灰（岩场/石构）
    thatch: '#ab9468', // 茅草顶
    watt: '#5d6e67',   // 青瓦顶
    wallP: '#d9cdb0',  // 墙纸色（建筑墙面）
    gold: '#b8934e',   // 鎏金（匾额/破境高光）
    skin: '#e8d9c2',   // 肤色
    robe1: '#7d9a92',  // 杂役袍（青灰）
    robe2: '#aeb9bc',  // 修士袍（月白）
  };
  INK.a = (hex, alpha) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  };
  X.Ink = INK;
})(globalThis.XIANG);

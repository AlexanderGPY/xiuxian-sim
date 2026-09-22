/* 五墨阶 + 三点缀色：全场景 95% 面积只用墨阶灰，点缀色不过三 */
(function (X) {
  const INK = {
    paper: '#f4efe3',
    jiao: '#1f1d1a',   // 焦
    nong: '#3a3733',   // 浓
    zhong: '#5c5852',  // 重
    dan: '#8f8a80',    // 淡
    qing: '#c9c4b8',   // 清
    zhu: '#a33b2e',    // 朱砂（交互/警示/印章）
    hua: '#3d5a80',    // 花青（水/水系）
    zhe: '#8c6a4f',    // 赭石（土/建筑辅助）
  };
  INK.a = (hex, alpha) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  };
  X.Ink = INK;
})(globalThis.XIANG);

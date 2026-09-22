/* 12 节气（每 30 日一节，一岁轮转）：名称 + 效果标记，效果在 sim/season.js 落地 */
(function (X) {
  X.Solar = {
    TERMS: [
      { d: 15,  n: '立春', e: 'visit',   desc: '开山收徒潮' },
      { d: 45,  n: '春分', e: 'rain',    desc: '春雨润田，灵植生长加速' },
      { d: 75,  n: '谷雨', e: 'rain2',   desc: '灵雨普降，灵韵 +1（五日）' },
      { d: 105, n: '立夏', e: 'log',     desc: '夏雷渐起，妖物将醒' },
      { d: 135, n: '夏至', e: 'meteor',  desc: '天火流星，落陨石料' },
      { d: 165, n: '处暑', e: 'harvest', desc: '秋收在望，收成 +20%（十日）' },
      { d: 195, n: '秋分', e: 'visit',   desc: '秋高气爽，又有求道者来投' },
      { d: 225, n: '霜降', e: 'frost',   desc: '霜降杀田，灵谷减产' },
      { d: 255, n: '立冬', e: 'log',     desc: '冬藏之时，诸事收敛' },
      { d: 285, n: '冬至', e: 'mood',    desc: '围炉共修，全门心境回升' },
      { d: 315, n: '大寒', e: 'cold',    desc: '天寒地冻，起居不适（十日）' },
      { d: 345, n: '除夕', e: 'mood2',   desc: '辞旧迎新，全门大喜' },
    ],
    buff: { growthMult: 1, yieldMult: 1, cold: 0, until: 0 },   // 临时增益，until 为绝对日
  };
})(globalThis.XIANG);

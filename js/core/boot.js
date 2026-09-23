/* 云隐仙踪 · 引导：全局命名空间（浏览器与 node 共用 globalThis） */
(function (X) {
  X.VERSION = '1.1.0';
  X.log = (...a) => console.log('[云隐]', ...a);
})(globalThis.XIANG = globalThis.XIANG || {});

/* 云端客户端：探测后端才启用（离线优先）；token 存 localStorage。 */
(function (X) {
  const C = {
    base: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? `${location.protocol}//${location.hostname}:8700` : '',
    online: false,
    token: null,
    name: null,
  };
  C.ping = async function () {
    if (!C.base) return false;
    try {
      const r = await fetch(C.base + '/api/ping', { signal: AbortSignal.timeout ? AbortSignal.timeout(1500) : undefined });
      C.online = r.ok;
      return C.online;
    } catch { C.online = false; return false; }
  };
  C.loadAuth = function () {
    try {
      C.token = localStorage.getItem('xiang_token');
      C.name = localStorage.getItem('xiang_name');
    } catch {}
  };
  C.saveAuth = function () {
    try {
      localStorage.setItem('xiang_token', C.token || '');
      localStorage.setItem('xiang_name', C.name || '');
    } catch {}
  };
  async function call(path, opts) {
    const r = await fetch(C.base + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts && opts.body ? JSON.stringify(opts.body) : undefined,
    });
    return r.json();
  }
  C.login = async function (name) {
    const r = await call('/api/auth', { method: 'POST', body: { name } });
    if (r.ok) { C.token = r.token; C.name = r.name; C.saveAuth(); }
    return r;
  };
  C.putSave = (slot, snapObj) => call(`/api/saves/${slot}?token=${C.token}`, {
    method: 'PUT', body: { json: JSON.stringify(snapObj), at: Date.now(), device: navigator.userAgent.includes('Mac') ? 'mac' : 'web' },
  });
  C.getSave = slot => call(`/api/saves/${slot}?token=${C.token}`);
  C.saveMeta = () => call(`/api/saves?token=${C.token}`);
  C.postSect = snap => call('/api/sects', { method: 'POST', body: { name: C.name || '云隐观', snap } });
  C.sects = () => call('/api/sects');
  C.board = () => call('/api/board');
  C.postBoard = (cat, value) => call('/api/board', { method: 'POST', body: { token: C.token, cat, value, name: C.name } });
  X.Cloud = C;
})(globalThis.XIANG);

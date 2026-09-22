/* 云卷云舒 · P7 后端：Node 原生 http + node:sqlite，零 npm。
   node server/server.js        → :8700 托管游戏静态文件 + 云端 API（联网开发模式）
   离线优先：前端无后端时全功能本地游玩，探测到本服务才亮「云端」。
   API：
     GET  /api/ping                     探测
     POST /api/auth   {name}            轻账号（设备码+昵称）→ {token,name}
     GET  /api/saves?token=             云存档三槽元数据
     GET  /api/saves/:slot?token=       取档（LWW：返回 {json,at,device}）
     PUT  /api/saves/:slot  body        存档 JSON（含 token/at/device）
     GET  /api/sects                    门派参观（只读快照列表）
     POST /api/sects   body             上传本派快照
     GET  /api/board                    排行榜（最速筑基日/最高声望/飞升数）
     POST /api/board   body             投稿 {token,cat,value,name}
 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = +(process.env.XIANG_PORT || 8700);
const DB_PATH = process.env.XIANG_SRV_DB || path.join(__dirname, 'cloud.db');
const db = new DatabaseSync(DB_PATH === ':memory:' ? ':memory:' : DB_PATH);
db.exec(`
CREATE TABLE IF NOT EXISTS accounts(id INTEGER PRIMARY KEY, name TEXT UNIQUE, token TEXT UNIQUE, created INTEGER);
CREATE TABLE IF NOT EXISTS saves(account INTEGER, slot INTEGER, json TEXT, at INTEGER, device TEXT, PRIMARY KEY(account,slot));
CREATE TABLE IF NOT EXISTS sects(id INTEGER PRIMARY KEY, name TEXT, at INTEGER, snap TEXT);
CREATE TABLE IF NOT EXISTS board(cat TEXT, name TEXT, value REAL, at INTEGER, PRIMARY KEY(cat,name));
`);

function json(res, code, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json;charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  });
  res.end(s);
}
function readBody(req) {
  return new Promise(ok => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 3e6) req.destroy(); });
    req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch { ok({}); } });
  });
}
function authAcc(q, body) {
  const token = q.token || body.token;
  if (!token) return null;
  return db.prepare('SELECT id,name FROM accounts WHERE token=?').get(token) || null;
}

async function api(req, res, url) {
  const q = Object.fromEntries(url.searchParams.entries());
  const p = url.pathname;
  const body = (req.method === 'POST' || req.method === 'PUT') ? await readBody(req) : {};
  if (req.method === 'OPTIONS') return json(res, 200, { ok: 1 });
  if (p === '/api/ping') return json(res, 200, { ok: 1, name: '云卷云舒' });
  if (p === '/api/auth' && req.method === 'POST') {
    const name = String(body.name || '').trim().slice(0, 24) || '无名掌门';
    const token = crypto.randomUUID();
    try {
      db.prepare('INSERT INTO accounts(name,token,created) VALUES(?,?,?)').run(name, token, Date.now());
    } catch {
      const a = db.prepare('SELECT id FROM accounts WHERE name=?').get(name);
      const t2 = crypto.randomUUID();
      db.prepare('UPDATE accounts SET token=? WHERE id=?').run(t2, a.id);   // 重登换token（轻账号）
      return json(res, 200, { ok: 1, token: t2, name });
    }
    return json(res, 200, { ok: 1, token, name });
  }
  if (p === '/api/saves' && req.method === 'GET') {
    const acc = authAcc(q, body);
    if (!acc) return json(res, 401, { ok: 0, why: '未登录' });
    const rows = db.prepare('SELECT slot,at,device FROM saves WHERE account=?').all(acc.id);
    return json(res, 200, { ok: 1, slots: rows });
  }
  const m = p.match(/^\/api\/saves\/(\d)$/);
  if (m) {
    const acc = authAcc(q, body);
    if (!acc) return json(res, 401, { ok: 0, why: '未登录' });
    const slot = +m[1];
    if (req.method === 'GET') {
      const r = db.prepare('SELECT json,at,device FROM saves WHERE account=? AND slot=?').get(acc.id, slot);
      return json(res, 200, r ? { ok: 1, ...r } : { ok: 0, why: '空槽' });
    }
    if (req.method === 'PUT') {
      db.prepare('INSERT OR REPLACE INTO saves(account,slot,json,at,device) VALUES(?,?,?,?,?)')
        .run(acc.id, slot, String(body.json || ''), +(body.at || Date.now()), String(body.device || 'web').slice(0, 30));
      return json(res, 200, { ok: 1 });
    }
  }
  if (p === '/api/sects' && req.method === 'GET') {
    const rows = db.prepare('SELECT name,at,snap FROM sects ORDER BY at DESC LIMIT 50').all();
    return json(res, 200, { ok: 1, sects: rows.map(r => ({ ...r, snap: JSON.parse(r.snap) })) });
  }
  if (p === '/api/sects' && req.method === 'POST') {
    const name = String(body.name || '无名门派').slice(0, 24);
    const snap = JSON.stringify(body.snap || {});
    const old = db.prepare('SELECT id FROM sects WHERE name=?').get(name);
    if (old) db.prepare('UPDATE sects SET at=?,snap=? WHERE id=?').run(Date.now(), snap, old.id);
    else db.prepare('INSERT INTO sects(name,at,snap) VALUES(?,?,?)').run(name, Date.now(), snap);
    return json(res, 200, { ok: 1 });
  }
  if (p === '/api/board' && req.method === 'GET') {
    const cats = {};
    for (const c of ['fastZhuji', 'topRep', 'ascend']) {
      const asc = c === 'fastZhuji';
      cats[c] = db.prepare(`SELECT name,value,at FROM board WHERE cat=? ORDER BY value ${asc ? 'ASC' : 'DESC'} LIMIT 10`).all(c);
    }
    return json(res, 200, { ok: 1, board: cats });
  }
  if (p === '/api/board' && req.method === 'POST') {
    const cat = ['fastZhuji', 'topRep', 'ascend'].indexOf(body.cat) >= 0 ? body.cat : null;
    if (!cat || !isFinite(+body.value)) return json(res, 400, { ok: 0, why: '参数' });
    const name = String(body.name || '无名掌门').slice(0, 24);
    const better = cat === 'fastZhuji'
      ? (r => !r || +body.value < r.value)(db.prepare('SELECT value FROM board WHERE cat=? AND name=?').get(cat, name))
      : (r => !r || +body.value > r.value)(db.prepare('SELECT value FROM board WHERE cat=? AND name=?').get(cat, name));
    if (better) db.prepare('INSERT OR REPLACE INTO board(cat,name,value,at) VALUES(?,?,?,?)').run(cat, name, +body.value, Date.now());
    return json(res, 200, { ok: 1 });
  }
  json(res, 404, { ok: 0, why: 'not found' });
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.md': 'text/plain' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    try { await api(req, res, url); }
    catch (e) { json(res, 500, { ok: 0, why: String(e.message || e) }); }
    return;
  }
  // 静态托管（游戏根目录）
  let fp = path.join(__dirname, '..', decodeURIComponent(url.pathname));
  if (url.pathname.endsWith('/')) fp = path.join(__dirname, '..', 'index.html');
  fs.readFile(fp, (e, buf) => {
    if (e) {
      fs.readFile(path.join(__dirname, '..', 'index.html'), (e2, b2) => {
        if (e2) { res.writeHead(404); res.end('404'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }); res.end(b2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(fp)] || 'application/octet-stream') + ';charset=utf-8' });
    res.end(buf);
  });
});

module.exports = { server, db };
if (require.main === module) {
  server.listen(PORT, () => console.log(`云卷云舒 :${PORT}（静态托管 + /api/*）db=${DB_PATH}`));
}

// Servidor de la clasificación mundial de COMBAT ZONE.
// Sin dependencias salvo "pg". Si no hay DATABASE_URL guarda en memoria (para pruebas locales).
import http from 'node:http';
import { attachRooms } from './rooms.js';

const PORT = Number(process.env.PORT) || 8787;
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://jhanfrancopalacios215-ctrl.github.io').split(',').map(s => s.trim()).filter(Boolean);
const MAPS = new Set(['gris', 'lima']);
const NAME_RE = /^[\p{L}\p{N} _.\-]{2,16}$/u;

// ---------- almacenamiento ----------
let db = null;
const mem = [];
if (process.env.DATABASE_URL) {
  const pg = (await import('pg')).default;
  const url = process.env.DATABASE_URL;
  db = new pg.Pool({ connectionString: url, max: 3, ssl: /render\.com/.test(url) ? { rejectUnauthorized: false } : false });
  await db.query(`create table if not exists scores(
    id serial primary key, name text not null, score int not null, wave int not null, kills int not null,
    heads int not null, map text not null, won boolean not null, day date not null, created timestamptz not null default now())`);
  await db.query('create index if not exists scores_score on scores(score desc)');
  await db.query('create index if not exists scores_day on scores(day, score desc)');
}

async function top({ day, limit }) {
  if (db) {
    const where = day ? 'where day = $2' : '';
    const args = day ? [limit, day] : [limit];
    const r = await db.query(`select name, score, wave, kills, map, won from (
        select distinct on (lower(name)) name, score, wave, kills, map, won from scores ${where}
        order by lower(name), score desc, created asc) b order by score desc limit $1`, args);
    return r.rows;
  }
  const best = new Map();
  for (const s of mem) if (!day || s.day === day) { const k = s.name.toLowerCase(); if (!best.has(k) || best.get(k).score < s.score) best.set(k, s); }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit).map(({ name, score, wave, kills, map, won }) => ({ name, score, wave, kills, map, won }));
}
async function rankOf(score, day) {
  if (db) {
    const where = day ? 'and day = $2' : '';
    const r = await db.query(`select count(*)::int as n from (select lower(name) k, max(score) m from scores where true ${where} group by 1) b where m > $1`, day ? [score, day] : [score]);
    return r.rows[0].n + 1;
  }
  const best = new Map();
  for (const s of mem) if (!day || s.day === day) { const k = s.name.toLowerCase(); best.set(k, Math.max(best.get(k) || 0, s.score)); }
  return [...best.values()].filter(m => m > score).length + 1;
}
async function insert(s) {
  if (db) await db.query('insert into scores(name,score,wave,kills,heads,map,won,day) values($1,$2,$3,$4,$5,$6,$7,$8)', [s.name, s.score, s.wave, s.kills, s.heads, s.map, s.won, s.day]);
  else mem.push(s);
}

// ---------- validación y límites ----------
const today = () => new Date().toISOString().slice(0, 10);
function dayOk(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const diff = Math.abs(Date.parse(d + 'T00:00:00Z') - Date.parse(today() + 'T00:00:00Z'));
  return diff <= 36 * 3600 * 1000; // la fecha local del jugador puede ir un día por detrás o por delante
}
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
function validate(b) {
  if (!b || typeof b !== 'object') return 'datos inválidos';
  const name = String(b.name || '').trim().replace(/\s+/g, ' ');
  if (!NAME_RE.test(name)) return 'el nombre debe tener entre 2 y 16 letras o números';
  if (!int(b.score, 0, 100000) || !int(b.wave, 0, 10) || !int(b.kills, 0, 2000) || !int(b.heads, 0, 2000) || !int(b.time, 5, 36000)) return 'datos fuera de rango';
  if (b.heads > b.kills) return 'datos incoherentes';
  if (!MAPS.has(b.map) || typeof b.won !== 'boolean' || !dayOk(String(b.day))) return 'datos inválidos';
  // tope creíble: 50 por pesado + 5 por cabeza, 500 del Comandante, 300 del reto diario y margen por policías
  const cap = b.kills * 55 + 500 + 300 + 400;
  if (b.score > cap) return 'puntuación imposible';
  if (b.won && b.wave !== 10) return 'datos incoherentes';
  return { name, score: b.score, wave: b.wave, kills: b.kills, heads: b.heads, map: b.map, won: b.won, day: String(b.day) };
}
const hits = new Map();
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 8;
}

// ---------- HTTP ----------
function cors(req, res) {
  const o = req.headers.origin || '';
  if (ORIGINS.includes(o) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
function body(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2048) { reject(new Error('demasiado grande')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, db: !!db, coop: true });
    if (req.method === 'GET' && url.pathname === '/api/scores') {
      const period = url.searchParams.get('period') === 'today' ? 'today' : 'all';
      const day = period === 'today' ? (dayOk(url.searchParams.get('day') || '') ? url.searchParams.get('day') : today()) : null;
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));
      return send(res, 200, { ok: true, period, day, scores: await top({ day, limit }) });
    }
    if (req.method === 'POST' && url.pathname === '/api/scores') {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (limited(ip)) return send(res, 429, { ok: false, error: 'demasiados envíos, espera unos minutos' });
      const v = validate(await body(req));
      if (typeof v === 'string') return send(res, 400, { ok: false, error: v });
      await insert(v);
      return send(res, 200, { ok: true, rank: await rankOf(v.score, null), rankToday: await rankOf(v.score, v.day) });
    }
    send(res, 404, { ok: false, error: 'no encontrado' });
  } catch (e) {
    console.error(e);
    send(res, 500, { ok: false, error: 'error del servidor' });
  }
});
attachRooms(server, { origins: ORIGINS });
server.listen(PORT, () => console.log(`combat-zone-api escuchando en ${PORT} (${db ? 'Postgres' : 'memoria'})`));

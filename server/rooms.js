// Salas del modo cooperativo (WebSocket en /ws). El servidor solo reparte mensajes:
// el navegador del anfitrión es quien simula enemigos y oleadas.
import { WebSocketServer } from 'ws';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const NAME_RE = /^[\p{L}\p{N} _.\-]{2,16}$/u;
const MAX_PLAYERS = 4;

export function attachRooms(server, { origins = [] } = {}) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
  const rooms = new Map();
  let nextId = 1;

  const newCode = () => { let c; do { c = Array.from({ length: 4 }, () => LETTERS[Math.random() * LETTERS.length | 0]).join(''); } while (rooms.has(c)); return c; };
  const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
  const roster = r => [...r.players].map(([id, p]) => ({ id, name: p.name, host: id === r.host }));
  const broadcast = (r, o, except) => { const s = JSON.stringify(o); for (const [id, p] of r.players) if (id !== except && p.ws.readyState === 1) p.ws.send(s); };
  const cleanName = n => { n = String(n || '').trim().replace(/\s+/g, ' ').slice(0, 16); return NAME_RE.test(n) ? n : 'Jugador'; };
  const originOk = o => !o || origins.includes(o) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o);

  wss.on('connection', (ws, req) => {
    if (!originOk(req.headers.origin)) { ws.close(1008, 'origen no permitido'); return; }
    const id = nextId++;
    let room = null, winStart = Date.now(), count = 0;
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    const leave = () => {
      if (!room) return;
      const r = room; room = null;
      r.players.delete(id);
      if (r.host === id || r.players.size === 0) {
        broadcast(r, { t: 'closed' });
        for (const [, p] of r.players) p.leave?.();
        rooms.delete(r.code);
      } else broadcast(r, { t: 'roster', players: roster(r) });
    };

    ws.on('message', raw => {
      const now = Date.now();
      if (now - winStart > 1000) { winStart = now; count = 0; }
      if (++count > 150) return; // demasiados mensajes por segundo
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (!m || typeof m !== 'object') return;

      if (m.t === 'create' && !room) {
        const code = newCode();
        room = { code, host: id, players: new Map(), started: false };
        rooms.set(code, room);
        room.players.set(id, { ws, name: cleanName(m.name), leave: () => { room = null; } });
        send(ws, { t: 'room', code, you: id, host: id, players: roster(room) });
      } else if (m.t === 'join' && !room) {
        const r = rooms.get(String(m.code || '').toUpperCase().trim());
        if (!r) return send(ws, { t: 'error', error: 'No existe esa sala. Revisa el código.' });
        if (r.players.size >= MAX_PLAYERS) return send(ws, { t: 'error', error: 'La sala está llena (máximo 4 jugadores).' });
        if (r.started) return send(ws, { t: 'error', error: 'La partida de esa sala ya empezó. Espera a que termine.' });
        room = r;
        r.players.set(id, { ws, name: cleanName(m.name), leave: () => { room = null; } });
        send(ws, { t: 'room', code: r.code, you: id, host: r.host, players: roster(r) });
        broadcast(r, { t: 'roster', players: roster(r) }, id);
      } else if (m.t === 'start' && room && room.host === id) {
        room.started = true;
        broadcast(room, { t: 'start', players: roster(room) });
      } else if (m.t === 'lobby' && room && room.host === id) {
        room.started = false;
        broadcast(room, { t: 'lobby' }, id);
      } else if (m.t === 'relay' && room) {
        const out = JSON.stringify({ t: 'relay', from: id, d: m.d });
        if (m.to) { const p = room.players.get(m.to); if (p && p.ws.readyState === 1) p.ws.send(out); }
        else for (const [pid, p] of room.players) if (pid !== id && p.ws.readyState === 1) p.ws.send(out);
      } else if (m.t === 'leave') leave();
    });
    ws.on('close', leave);
    ws.on('error', leave);
  });

  const beat = setInterval(() => {
    for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); }
  }, 25000);
  wss.on('close', () => clearInterval(beat));
  return { rooms, wss };
}

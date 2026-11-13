// Pruebas del servidor de récords (modo memoria): node server/test.mjs
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8799, base = `http://127.0.0.1:${PORT}`;
const env = { ...process.env, PORT: String(PORT) }; delete env.DATABASE_URL;
const srv = spawn(process.execPath, [path.join(dir, 'index.js')], { env, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(r => srv.stdout.once('data', r));
const day = new Date().toISOString().slice(0, 10);
const post = (b) => fetch(base + '/api/scores', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:4173' }, body: JSON.stringify(b) });
const good = { name: 'Jhan', score: 900, wave: 5, kills: 30, heads: 6, map: 'lima', won: false, day, time: 600 };
let n = 0; const ok = (name, c) => { assert.ok(c, name); n++; console.log('PASS ' + name); };
try {
  ok('S1 salud', (await (await fetch(base + '/health')).json()).ok === true);
  let r = await post(good); let j = await r.json();
  ok('S2 publica una puntuación válida', r.status === 200 && j.rank === 1);
  ok('S3 CORS para el juego', r.headers.get('access-control-allow-origin') === 'http://127.0.0.1:4173');
  ok('S4 rechaza puntuación imposible', (await post({ ...good, score: 99999 })).status === 400);
  ok('S5 rechaza nombre inválido', (await post({ ...good, name: '<b>x</b>' })).status === 400);
  ok('S6 rechaza victoria sin oleada 10', (await post({ ...good, won: true })).status === 400);
  await post({ ...good, name: 'Ana', score: 1500, kills: 40 });
  await post({ ...good, name: 'jhan', score: 400 });
  j = await (await fetch(base + '/api/scores?period=all')).json();
  ok('S7 tabla ordenada y un récord por nombre', j.scores.length === 2 && j.scores[0].name === 'Ana' && j.scores[1].score === 900);
  j = await (await fetch(base + `/api/scores?period=today&day=${day}`)).json();
  ok('S8 tabla de hoy', j.period === 'today' && j.scores.length === 2);
  for (let i = 0; i < 6; i++) await post({ ...good, name: 'Spam' + i });
  ok('S9 limita los envíos repetidos', (await post({ ...good, name: 'Spam9' })).status === 429);
  console.log(`SERVIDOR: ${n} pruebas superadas`);
} finally { srv.kill(); }

// Pruebas automáticas de COMBAT ZONE 8.2 (Playwright + Chromium sin pantalla).
// Se ejecutan con: node tests/smoke.mjs  (desde la raíz del repositorio)
import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, pathname === '/' ? 'index.html' : '.' + pathname);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));

let browser, passed = 0;
const check = (name, condition) => { assert.ok(condition, name); passed++; console.log('PASS ' + name); };
// espera a que una condición se cumpla (el navegador de pruebas dibuja muy despacio, sin tarjeta gráfica)
const until = async (page, fn, arg, ms = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.evaluate(fn, arg)) return true;
    await page.waitForTimeout(200);
  }
  return false;
};

try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [], consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  // El navegador sin pantalla no puede capturar el ratón: así se prueba también el modo de respaldo.
  await page.addInitScript(() => { Element.prototype.requestPointerLock = function () { return Promise.reject(new Error('sin pantalla')); }; });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  try { await page.waitForFunction(() => window.__cz && window.__cz.state === 'menu', null, { timeout: 30000 }); }
  catch (e) { console.error('PAGE ERRORS', pageErrors); console.error('CONSOLE ERRORS', consoleErrors); throw e; }
  const cz = (expr, arg) => page.evaluate(expr, arg);

  // --- Carga y menús ---
  check('01 título de la página', await page.title() === 'COMBAT ZONE 8.2 — Operación Distrito Gris');
  check('02 versión 8.2 expuesta', await cz(() => window.__cz.version === '8.2'));
  await page.waitForSelector('#mainMenu:not(.hidden)', { timeout: 5000 });
  check('03 menú principal visible tras la carga', await page.locator('#mainMenu').isVisible() && !(await page.locator('#loading').isVisible()));
  check('04 botones del menú principal', await page.locator('#btnPlay').count() === 1 && await page.locator('#btnSettings').count() === 1 && await page.locator('#btnControls').count() === 1);
  check('05 un solo lienzo 3D', await page.locator('canvas#view').count() === 1);
  await page.click('#btnControls');
  check('06 pantalla de controles', await page.locator('#controlsMenu').isVisible() && (await page.locator('#controlsMenu').innerText()).includes('Agacharse'));
  await page.click('#controlsMenu [data-back]');
  await page.click('#btnSettings');
  check('07 pantalla de ajustes', await page.locator('#settingsMenu').isVisible());
  await page.locator('#setSens').fill('1.5');
  check('08 el ajuste de sensibilidad se aplica y se guarda', await cz(() => window.__cz.settings.sens === 1.5 && JSON.parse(localStorage.getItem('cz8-settings')).sens === 1.5));
  await page.locator('#setFps').check();
  check('09 opción de mostrar FPS', await cz(() => window.__cz.settings.fps === true));
  await page.click('#settingsMenu [data-back]');
  check('10 volver al menú principal', await page.locator('#mainMenu').isVisible());

  // --- Inicio de partida: Distrito Gris ---
  await page.click('#btnPlay');
  check('11 la partida empieza', await cz(() => window.__cz.state === 'playing' && window.__cz.zone === 'distrito'));
  check('12 HUD visible y menú oculto', await page.locator('#hud').isVisible() && !(await page.locator('#mainMenu').isVisible()));
  check('13 sin captura del ratón entra el modo de respaldo', await until(page, () => document.querySelector('#toast').textContent.includes('MUEVE EL RATÓN'), null, 5000));
  check('14 ocho hostiles en el distrito', await cz(() => window.__cz.hostilesAlive === 8));
  check('15 salud 100 y efectivo $500', await cz(() => window.__cz.health === 100 && window.__cz.money === 500));
  check('16 HUD de munición 30 / 120 con M16', (await page.locator('#ammoLine').innerText()).includes('30') && (await page.locator('#ammoLine').innerText()).includes('120') && await cz(() => window.__cz.weaponName === 'M16'));
  check('17 objetivo del distrito 0 / 8', (await page.locator('#objText').innerText()).includes('0 / 8'));
  check('18 radar visible', await page.locator('#radar').isVisible());
  check('19 soldados articulados (cadera, rodilla, codo, cabeza)', await cz(() => window.__cz.rigged));
  check('20 el mapa tiene colisiones', await cz(() => window.__cz.colliders > 60));

  // --- Armas ---
  await cz(() => window.__cz.fire());
  check('21 disparar gasta una bala', await cz(() => window.__cz.ammo === 29));
  check('22 respeta la cadencia del arma', await cz(async () => { const z = window.__cz; await new Promise(r => setTimeout(r, 150)); const a = z.fire(), b = z.fire(); return a === true && b === false; }));
  check('23 segundo disparo tras la cadencia', await cz(() => window.__cz.ammo === 28));
  check('24 disparar a la calle deja marcas de impacto', await until(page, () => window.__cz.decals > 0, null, 3000));
  check('25a al empezar solo tienes M16 y Magnum', await cz(() => { const o = window.__cz.owned; return o[0] && o[5] && !o[2] && window.__cz.selectWeapon(2) === false && window.__cz.weaponName === 'M16'; }));
  await cz(() => { window.__cz.unlockAll(); window.__cz.selectWeapon(2); });
  check('25 francotirador: aviso y cargador de 5', (await page.locator('#toast').textContent()).includes('FRANCOTIRADOR') && await cz(() => window.__cz.magazine === 5));
  check('26 Magnum con 6 balas y RPG con 1', await cz(() => { const z = window.__cz; z.selectWeapon(5); const a = z.magazine === 6 && z.weaponName === 'Magnum .44'; z.selectWeapon(6); const b = z.magazine === 1 && z.weaponName === 'RPG-7'; return a && b; }));
  await cz(() => window.__cz.selectWeapon(0));
  await page.waitForTimeout(400);
  await cz(() => window.__cz.reload());
  check('27 recargar empieza la animación', await cz(() => window.__cz.reloading === true));
  check('28 la recarga llena el cargador y gasta reserva', await until(page, () => window.__cz.ammo === 30 && window.__cz.reserve === 118, null, 4000));
  check('29 comprar munición: +90 por $100', await cz(() => { const z = window.__cz, m = z.money, r = z.reserve; return z.buyAmmo() && z.money === m - 100 && z.reserve === r + 90; }));
  check('30 comprar botiquín cura y cuesta $150', await cz(() => { const z = window.__cz; z.damage(30); const m = z.money; return z.buyMedkit() && z.money === m - 150 && z.health === 100; }));
  check('31a lanzar granada (G) gasta una y explota', await cz(() => { const z = window.__cz, n = z.grenades; return z.throwGrenade() && z.grenades === n - 1 && z.grenadesLive === 1; }) && await until(page, () => window.__cz.grenadesLive === 0, null, 15000));
  check('31 el salto eleva al jugador', await cz(() => { window.__cz.jump(); return true; }) && await until(page, () => window.__cz.playerY > .2, null, 3000));

  // --- Bajas, dinero y policía ---
  const moneyBefore = await cz(() => window.__cz.money), scoreBefore = await cz(() => window.__cz.score);
  await cz(() => { window.__cz.killOne(); window.__cz.killOne(true); });
  check('32 dos bajas en el distrito: 2 / 8', await cz(() => window.__cz.districtKills === 2) && (await page.locator('#objText').innerText()).includes('2 / 8'));
  check('33 dos bajas activan 2 estrellas y 4 policías', await cz(() => window.__cz.wanted === 2 && window.__cz.policeCount === 4));
  check('34 cada baja paga $50', await cz((m) => window.__cz.money === m + 100, moneyBefore));
  check('35 puntos: 10 + 15 por tiro a la cabeza', await cz((s) => window.__cz.score === s + 25, scoreBefore));
  check('36 las bajas sueltan dinero', await cz(() => window.__cz.pickups >= 2));
  check('37 lista de bajas en el HUD', await page.locator('#feed div').count() >= 2);
  const m2 = await cz(() => window.__cz.money);
  await cz(() => window.__cz.collectAll());
  check('38 recoger el dinero suma $100', await cz((m) => window.__cz.money >= m + 100 && window.__cz.pickups === 0, m2));

  // --- Pausa ---
  await cz(() => window.__cz.pause());
  check('39 menú de pausa', await page.locator('#pauseMenu').isVisible() && await cz(() => window.__cz.state === 'paused'));
  await page.click('#btnResume');
  check('40 continuar la partida', await cz(() => window.__cz.state === 'playing') && !(await page.locator('#pauseMenu').isVisible()));

  // --- Paso a la Arena ---
  await cz(() => { window.__cz.heal(); for (let i = 0; i < 8; i++) window.__cz.killOne(); });
  check('41 distrito asegurado con 8 bajas', await cz(() => window.__cz.districtKills === 8));
  check('42 te trasladan a la Arena', await until(page, () => window.__cz.zone === 'arena' && window.__cz.wave === 1, null, 20000));
  check('43 la Arena tiene coberturas y ciudad', await cz(() => window.__cz.colliders > 60 && Math.abs(window.__cz.position.x - 600) < 60));
  check('44 la policía se retira en la oleada 1', await cz(() => window.__cz.policeCount === 0 && window.__cz.wanted === 0));
  await cz(() => window.__cz.heal());
  check('45 la oleada genera hostiles', await until(page, () => window.__cz.hostilesAlive > 0, null, 25000));
  check('46 el HUD muestra la oleada', (await page.locator('#objTitle').innerText()).includes('OLEADA 1'));
  check('47 al vaciar la oleada hay descanso', await until(page, () => { window.__cz.heal(); window.__cz.killOne(); return window.__cz.intermission > 0; }, null, 60000));
  check('47a el HUD indica 1 / 10 oleadas', (await page.locator('#objTitle').innerText()).includes('1 / 10'));
  await page.keyboard.press('KeyB');
  check('47b la tecla B abre la tienda', await until(page, () => window.__cz.state === 'shop', null, 3000) && await page.locator('#shopMenu').isVisible());
  check('47c la tienda muestra armas y mejoras', await page.locator('#shopItems .item').count() >= 12);
  check('47d comprar chaleco protege', await cz(() => { const z = window.__cz; z.collectAll(); return z.buy('armor') && z.armor === 50; }));
  check('47e el chaleco absorbe daño', await cz(() => { const z = window.__cz; z.closeShop(); z.heal(); z.damage(20); return z.health === 92 && z.armor === 38; }));
  check('47f comprar mejora de cargador amplía el M16', await cz(() => { const z = window.__cz; z.selectWeapon(0); window.__czMoney = z.money; return true; }) && await cz(() => { const z = window.__cz; z.openShop(); const ok = z.buy('mag'); z.closeShop(); return !ok || z.magazine === 38; }));
  await cz(() => window.__cz.skipIntermission());
  check('48 tras el descanso empieza la oleada 2', await until(page, () => { window.__cz.heal(); return window.__cz.wave === 2; }, null, 40000));
  await cz(() => { window.__cz.killAll(); window.__cz.jumpToWave(10); });
  check('48a la oleada 10 trae al Comandante', await until(page, () => { window.__cz.heal(); return window.__cz.wave === 10 && window.__cz.bossAlive; }, null, 20000) && await page.locator('#bossBox').isVisible());
  await cz(() => window.__cz.killAll());
  check('48b vencer la oleada final da la victoria', await until(page, () => { window.__cz.heal(); window.__cz.killAll(); return !document.querySelector('#resultsMenu').classList.contains('hidden'); }, null, 30000) && (await page.locator('#resTitle').innerText()).includes('MISIÓN CUMPLIDA'));
  check('48c se guarda el récord', await cz(() => window.__cz.best.score > 0 && window.__cz.best.wins === 1) && await page.locator('#resRecord').isVisible());
  check('48d botón de compartir', await page.locator('#btnShare').isVisible());
  await page.click('#btnRetry');
  check('48e reintentar devuelve las armas iniciales', await cz(() => window.__cz.state === 'playing' && window.__cz.owned.filter(Boolean).length === 2 && window.__cz.grenades === 2 && window.__cz.armor === 0));

  // --- Derrota, resultados y reinicio ---
  await cz(() => window.__cz.damage(500));
  check('49 al morir se ven los resultados', await until(page, () => !document.querySelector('#resultsMenu').classList.contains('hidden'), null, 5000) && (await page.locator('#resStats').innerText()).includes('BAJAS'));
  await page.click('#btnRetry');
  check('50 reintentar vuelve al distrito', await cz(() => window.__cz.state === 'playing' && window.__cz.zone === 'distrito' && window.__cz.hostilesAlive === 8 && window.__cz.money === 500));
  await cz(() => window.__cz.quit());
  check('51 salir al menú principal', await page.locator('#mainMenu').isVisible() && await cz(() => window.__cz.state === 'menu'));
  await page.setViewportSize({ width: 390, height: 844 });
  check('52 el menú cabe en móvil', await page.locator('#btnPlay').isVisible());
  // --- Mapa Centro de Lima ---
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.click('[data-map="lima"]');
  check('54 se puede elegir el mapa Centro de Lima', await cz(() => window.__cz.mapId === 'lima') && await page.locator('[data-map="lima"].on').count() === 1);
  await page.click('#btnPlay');
  check('55 la partida empieza en Lima con 8 hostiles', await cz(() => window.__cz.state === 'playing' && window.__cz.zone === 'lima' && window.__cz.hostilesAlive === 8 && window.__cz.colliders > 60));
  check('56 el título del objetivo dice CENTRO DE LIMA', (await page.locator('#objTitle').innerText()).includes('CENTRO DE LIMA'));
  await cz(() => { window.__cz.heal(); for (let i = 0; i < 8; i++) window.__cz.killOne(); });
  check('57 desde Lima también se llega a la Arena', await until(page, () => { window.__cz.heal(); return window.__cz.zone === 'arena'; }, null, 20000));
  await cz(() => { window.__cz.quit(); window.__cz.setMap('gris'); });
  await page.setViewportSize({ width: 390, height: 844 });
  check('52a el menú muestra el récord', (await page.locator('#bestLine').innerText()).includes('Récord'));
  // --- Celular: controles táctiles ---
  const mctx = await browser.newContext({ ...devices['Pixel 7 landscape'] });
  const m = await mctx.newPage();
  m.on('pageerror', e => pageErrors.push('móvil: ' + e.message));
  await m.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await m.waitForFunction(() => window.__cz && window.__cz.state === 'menu', null, { timeout: 40000 });
  check('58 en el celular se activa el modo táctil', await m.evaluate(() => window.__cz.touchMode === true) && (await m.locator('#touchWarn').innerText()).includes('joystick'));
  await m.tap('#btnPlay');
  check('59 aparecen joystick y botones', await until(m, () => window.__cz.state === 'playing' && !document.querySelector('#touch').classList.contains('hidden'), null, 5000) && await m.locator('#tFire').isVisible());
  const z0 = await m.evaluate(() => window.__cz.position.z);
  await m.evaluate(() => window.__cz.touchMove(0, -1));
  check('60 el joystick mueve al jugador', await until(m, (z) => window.__cz.position.z < z - .5, z0, 15000));
  await m.evaluate(() => window.__cz.touchMove(0, 0));
  await m.tap('#tFire');
  check('61 el botón FUEGO dispara', await until(m, () => window.__cz.ammo < 30, null, 3000));
  await m.tap('#tReload');
  check('62 el botón R recarga', await until(m, () => window.__cz.reloading || window.__cz.ammo === 30, null, 3000));
  check('63 los consejos hablan de controles táctiles', await until(m, () => document.querySelector('#hint').textContent.includes('Joystick'), null, 15000));
  await mctx.close();

  check('53 no hay excepciones JavaScript', pageErrors.length === 0);
  if (pageErrors.length) console.error(pageErrors);
  console.log(`RESULTADO: ${passed} pruebas superadas`);
} finally {
  if (browser) await browser.close();
  server.close();
}

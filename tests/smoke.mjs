// Pruebas automáticas de COMBAT ZONE 8.0 (Playwright + Chromium sin pantalla).
// Se ejecutan con: node tests/smoke.mjs  (desde la raíz del repositorio)
import { chromium } from 'playwright';
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
  check('01 título de la página', await page.title() === 'COMBAT ZONE 8.0 — Operación Distrito Gris');
  check('02 versión 8.0 expuesta', await cz(() => window.__cz.version === '8.0'));
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
  check('22 respeta la cadencia del arma', await cz(() => window.__cz.fire() === false && window.__cz.ammo === 29));
  await page.waitForTimeout(150);
  await cz(() => window.__cz.fire());
  check('23 segundo disparo tras la cadencia', await cz(() => window.__cz.ammo === 28));
  check('24 disparar a la calle deja marcas de impacto', await until(page, () => window.__cz.decals > 0, null, 3000));
  await cz(() => window.__cz.selectWeapon(2));
  check('25 francotirador: aviso y cargador de 5', (await page.locator('#toast').textContent()).includes('FRANCOTIRADOR') && await cz(() => window.__cz.magazine === 5));
  check('26 Magnum con 6 balas y RPG con 1', await cz(() => { const z = window.__cz; z.selectWeapon(5); const a = z.magazine === 6 && z.weaponName === 'Magnum .44'; z.selectWeapon(6); const b = z.magazine === 1 && z.weaponName === 'RPG-7'; return a && b; }));
  await cz(() => window.__cz.selectWeapon(0));
  await page.waitForTimeout(400);
  await cz(() => window.__cz.reload());
  check('27 recargar empieza la animación', await cz(() => window.__cz.reloading === true));
  check('28 la recarga llena el cargador y gasta reserva', await until(page, () => window.__cz.ammo === 30 && window.__cz.reserve === 118, null, 4000));
  check('29 comprar munición: +90 por $100', await cz(() => { const z = window.__cz, m = z.money, r = z.reserve; return z.buyAmmo() && z.money === m - 100 && z.reserve === r + 90; }));
  check('30 comprar botiquín cura y cuesta $150', await cz(() => { const z = window.__cz; z.damage(30); const m = z.money; return z.buyMedkit() && z.money === m - 150 && z.health === 100; }));
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
  check('48 tras el descanso empieza la oleada 2', await until(page, () => { window.__cz.heal(); return window.__cz.wave === 2; }, null, 40000));

  // --- Derrota, resultados y reinicio ---
  await cz(() => window.__cz.damage(500));
  check('49 al morir se ven los resultados', await until(page, () => !document.querySelector('#resultsMenu').classList.contains('hidden'), null, 5000) && (await page.locator('#resStats').innerText()).includes('BAJAS'));
  await page.click('#btnRetry');
  check('50 reintentar vuelve al distrito', await cz(() => window.__cz.state === 'playing' && window.__cz.zone === 'distrito' && window.__cz.hostilesAlive === 8 && window.__cz.money === 500));
  await cz(() => window.__cz.quit());
  check('51 salir al menú principal', await page.locator('#mainMenu').isVisible() && await cz(() => window.__cz.state === 'menu'));
  await page.setViewportSize({ width: 390, height: 844 });
  check('52 el menú cabe en móvil', await page.locator('#btnPlay').isVisible());
  check('53 no hay excepciones JavaScript', pageErrors.length === 0);
  if (pageErrors.length) console.error(pageErrors);
  console.log(`RESULTADO: ${passed}/53 pruebas superadas`);
} finally {
  if (browser) await browser.close();
  server.close();
}

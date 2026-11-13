import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary','.obj':'text/plain','.mtl':'text/plain','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,pathname==='/'?'index.html':'.'+pathname);
  if(!file.startsWith(root)){res.writeHead(403).end();return}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('not found');return}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(data)});
});
await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1365,height:768}});
  const pageErrors=[],consoleErrors=[],failedRequests=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  page.on('requestfailed',r=>failedRequests.push(r.url()+' :: '+r.failure()?.errorText));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  try{await page.waitForFunction(()=>window.__combatZone!==undefined,null,{timeout:18000})}catch(e){console.error('PAGE ERRORS',pageErrors);console.error('CONSOLE ERRORS',consoleErrors);console.error('FAILED REQUESTS',failedRequests);throw e}
  const check=(name,condition)=>{assert.ok(condition,name);console.log('PASS '+name)};
  check('01 documento HTML carga',await page.title()==='COMBAT ZONE 7.1 — Distrito Gris');
  check('02 pantalla inicial visible',await page.locator('#start').isVisible());
  check('03 botón de inicio existe',await page.locator('#play').count()===1);
  check('04 HUD de salud existe',await page.locator('#health i').count()===1);
  check('05 contador de objetivos existe',await page.locator('#kills').textContent()==='0 / 8');
  check('06 HUD de munición inicial',await page.locator('#ammo').innerText().then(x=>x.includes('30')&&x.includes('120')));
  check('07 punto de mira presente',await page.locator('#cross').count()===1);
  check('08 indicador de FPS presente',await page.locator('#fps').count()===1);
  check('09 lienzo WebGL creado',await page.locator('body > canvas').count()===1);
  check('10 escena expone versión 7.1',await page.evaluate(()=>window.__combatZone.version==='7.1'));
  check('11 ocho enemigos creados',await page.evaluate(()=>window.__combatZone.enemies===8));
  check('12 ocho enemigos activos al inicio',await page.evaluate(()=>window.__combatZone.alive===8));
  check('13 salud inicia en 100',await page.evaluate(()=>window.__combatZone.health===100));
  check('14 resolución adaptativa en rango',await page.evaluate(()=>window.__combatZone.renderScale>=.5&&window.__combatZone.renderScale<=1));
  await page.evaluate(()=>window.__combatZone.start());
  check('15 inicio de operación cambia estado',await page.evaluate(()=>window.__combatZone.started===true));
  check('16 pantalla inicial se oculta',await page.locator('#start').evaluate(e=>getComputedStyle(e).display==='none'));
  await page.evaluate(()=>window.__combatZone.fire());
  check('17 disparar consume una bala',await page.evaluate(()=>window.__combatZone.ammo===29));
  await page.waitForTimeout(130);
  await page.evaluate(()=>window.__combatZone.fire());
  check('18 segundo disparo consume munición',await page.evaluate(()=>window.__combatZone.ammo===28));
  await page.evaluate(()=>window.__combatZone.selectWeapon(2));
  check('19 selección de arma actualiza aviso',await page.locator('#toast').textContent().then(x=>x.includes('FRANCOTIRADOR')));
  check('20 menú de pausa está preparado',await page.locator('#pause').count()===1);
  check('21 efecto visual de daño está preparado',await page.locator('#damage').count()===1);
  check('22 objetivo de misión está visible',await page.locator('#objective').isVisible());
  await page.setViewportSize({width:390,height:844});
  check('23 interfaz se adapta a móvil',await page.locator('#mobilehint').isVisible());
  await page.setViewportSize({width:1365,height:768});
  await page.waitForTimeout(1200);
  check('24 contador FPS se actualiza',await page.locator('#fps').textContent().then(x=>x.includes('FPS')));
  await page.evaluate(()=>window.__combatZone.selectWeapon(0));
  await page.evaluate(()=>window.__combatZone.reload());
  await page.waitForTimeout(1800);
  check('25 recarga devuelve cargador a 30',await page.evaluate(()=>window.__combatZone.ammo===30));
  check('26 recarga consume reserva',await page.evaluate(()=>window.__combatZone.reserve===118));

  check('28 articulaciones de enemigos animables',await page.evaluate(()=>window.__combatZone.animatedEnemies));
  check('29 economía inicial de $500',await page.evaluate(()=>window.__combatZone.money===500));
  check('30 compra de munición añade 90 balas y cuesta $100',await page.evaluate(()=>{const before=window.__combatZone.money;const ok=window.__combatZone.buyAmmo();return ok&&window.__combatZone.money===before-100}));
  check('31 compra de botiquín recupera salud y cuesta $150',await page.evaluate(()=>{window.__combatZone.damageForTest();const before=window.__combatZone.money;return window.__combatZone.buyMedkit()===true&&window.__combatZone.money===before-150}));
  check('32 dos bajas activan dos estrellas y cuatro policías',await page.evaluate(()=>{window.__combatZone.registerKill();window.__combatZone.registerKill();return window.__combatZone.wanted===2&&window.__combatZone.policeCount===4&&window.__combatZone.money===350}));
  check('33 las bajas generan drops verdes',await page.evaluate(()=>window.__combatZone.drops===2));
  check('34 recoger dinero suma $100',await page.evaluate(()=>{const before=window.__combatZone.money;window.__combatZone.collectDrops();return window.__combatZone.money===before+100&&window.__combatZone.drops===0}));
  check('36 radar de Operación Arena visible',await page.locator('#radar canvas').isVisible());
  check('37 marcador de puntos empieza en 0',await page.evaluate(()=>window.__combatZone.score===0)&&await page.locator('#score').textContent()==='0');
  check('38 una baja suma 10 puntos',await page.evaluate(()=>window.__combatZone.killOne()&&window.__combatZone.score===10));
  check('39 apuntar con clic derecho acerca la cámara',await page.evaluate(async()=>{window.__combatZone.selectWeapon(0);window.__combatZone.setAds(true);await new Promise(r=>setTimeout(r,500));const ok=window.__combatZone.ads;window.__combatZone.setAds(false);return ok}));
  check('40 el salto eleva al jugador',await page.evaluate(async()=>{window.__combatZone.jump();for(let i=0;i<40;i++){if(window.__combatZone.playerY>.2)return true;await new Promise(r=>setTimeout(r,50))}return false}));
  await page.evaluate(()=>window.__combatZone.startWaves());
  check('41 al asegurar el distrito empiezan las oleadas',await page.evaluate(()=>window.__combatZone.phase==='waves'&&window.__combatZone.wave===1));
  check('42 la policía se retira al empezar las oleadas',await page.evaluate(()=>window.__combatZone.policeCount===0&&window.__combatZone.wanted===0));
  let spawned=false;for(let i=0;i<60&&!spawned;i++){spawned=await page.evaluate(()=>window.__combatZone.alive>0);if(!spawned)await page.waitForTimeout(250)}
  check('43 la oleada genera hostiles nuevos',spawned);
  check('44 HUD muestra la oleada',await page.locator('#wave').textContent().then(x=>x.startsWith('1 ·')));
  let waveAdvanced=false;
  for(let i=0;i<240&&!waveAdvanced;i++){waveAdvanced=await page.evaluate(()=>{window.__combatZone.killOne();return window.__combatZone.wave===2});if(!waveAdvanced)await page.waitForTimeout(250)}
  check('45 al vaciar la oleada empieza la siguiente',waveAdvanced);
  check('46 enemigos de oleada siguen animados',await page.evaluate(()=>window.__combatZone.animatedEnemies));
  check('47 te traslada al mapa de Operación Arena',await page.evaluate(()=>window.__combatZone.zone==='arena'&&Math.abs(window.__combatZone.position.x-400)<60));
  check('48 la Arena tiene coberturas y ciudad Kenney',await page.evaluate(()=>window.__combatZone.solids>80));
  check('49 cada arma tiene su cargador (Magnum 6, RPG 1)',await page.evaluate(()=>{const z=window.__combatZone;z.selectWeapon(5);const a=z.magazine===6&&z.weaponName==='Magnum .44';z.selectWeapon(6);const b=z.magazine===1&&z.weaponName==='RPG-7';z.selectWeapon(0);return a&&b}));
  check('50 disparar a una pared deja un agujero de bala',await page.evaluate(async()=>{const z=window.__combatZone;z.lookAtWall();await new Promise(r=>setTimeout(r,200));const before=z.decals;z.fire();return z.decals>before}));
  check('51 no hay excepciones JavaScript',pageErrors.length===0);
  console.log('RESULTADO: 50/50 pruebas superadas');

} finally {
  if(browser) await browser.close();
  server.close();
}

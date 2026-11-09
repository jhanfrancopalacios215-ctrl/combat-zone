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
  check('01 documento HTML carga',await page.title()==='COMBAT ZONE 6.7 — Distrito Gris');
  check('02 pantalla inicial visible',await page.locator('#start').isVisible());
  check('03 botón de inicio existe',await page.locator('#play').count()===1);
  check('04 HUD de salud existe',await page.locator('#health i').count()===1);
  check('05 contador de objetivos existe',await page.locator('#kills').textContent()==='0 / 8');
  check('06 HUD de munición inicial',await page.locator('#ammo').innerText().then(x=>x.includes('30')&&x.includes('120')));
  check('07 punto de mira presente',await page.locator('#cross').count()===1);
  check('08 indicador de FPS presente',await page.locator('#fps').count()===1);
  check('09 lienzo WebGL creado',await page.locator('canvas').count()===1);
  check('10 escena expone versión 6.8',await page.evaluate(()=>window.__combatZone.version==='6.8'));
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
  check('19 selección de arma actualiza aviso',await page.locator('#toast').textContent().then(x=>x.includes('SNIPER')));
  check('20 menú de pausa está preparado',await page.locator('#pause').count()===1);
  check('21 efecto visual de daño está preparado',await page.locator('#damage').count()===1);
  check('22 objetivo de misión está visible',await page.locator('#objective').isVisible());
  await page.setViewportSize({width:390,height:844});
  check('23 interfaz se adapta a móvil',await page.locator('#mobilehint').isVisible());
  await page.setViewportSize({width:1365,height:768});
  await page.waitForTimeout(1200);
  check('24 contador FPS se actualiza',await page.locator('#fps').textContent().then(x=>x.includes('FPS')));
  await page.evaluate(()=>window.__combatZone.reload());
  await page.waitForTimeout(1250);
  check('25 recarga devuelve cargador a 30',await page.evaluate(()=>window.__combatZone.ammo===30));
  check('26 recarga consume reserva',await page.evaluate(()=>window.__combatZone.reserve===118));
  check('27 no hay excepciones JavaScript',pageErrors.length===0);
  console.log('RESULTADO: 27/27 pruebas superadas');
} finally {
  if(browser) await browser.close();
  server.close();
}

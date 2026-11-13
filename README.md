# COMBAT ZONE 8.0
Shooter 3D en primera persona para navegador, hecho con Three.js en un solo `index.html`.

## Cómo se juega
1. **Distrito Gris:** limpia la calle de 8 hostiles. Cada baja sube tu nivel de búsqueda y llega la policía.
2. **Operación Arena:** al asegurar el distrito te extraen a la Arena, una plaza con coberturas rodeada de ciudad. Resiste oleadas cada vez más duras; entre oleadas hay 5 s de descanso y una prima en efectivo.

## Controles
- WASD: moverse · Ratón o flechas: mirar · Shift: correr · C: agacharse · Espacio: saltar (sube a coberturas bajas)
- Clic izquierdo: disparar · Clic derecho: apuntar (mira telescópica en el francotirador) · R: recargar
- 1–8 o rueda: cambiar de arma · F: munición ($100) · H: botiquín ($150) · Esc: pausa

## Ajustes
Sensibilidad, volumen, campo de visión, calidad gráfica (automática, baja, media, alta), invertir eje Y y mostrar FPS. Se guardan en el navegador.

## Técnica
- Three.js 0.160 desde jsDelivr. Necesita conexión a internet.
- Los modelos (edificios, coches y árboles Kenney CC0 con texturas, y las 8 armas) van incluidos dentro de `index.html`.
- Sin sombras reales y con escala de render automática para PCs de gama baja.
- Pruebas: `node tests/smoke.mjs` (Playwright). El workflow las ejecuta antes de publicar en GitHub Pages.
- El workflow todavía extrae `COMBAT_ZONE_6_6_RECONSTRUIDO.zip`, pero la versión 8.0 ya no necesita esos modelos.

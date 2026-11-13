# COMBAT ZONE 8.2
Shooter 3D en primera persona para navegador, hecho con Three.js en un solo `index.html`.

## Mapas
- **Distrito Gris:** calle urbana con rascacielos.
- **Centro de Lima:** fachadas coloniales de colores con balcones de cajón, combis, mototaxis, carretillas de fruta, cables cruzando la calle, la iglesia al fondo, cielo gris y garúa.

## Cómo se juega
1. **Distrito Gris:** limpia la calle de 8 hostiles. Cada baja sube tu nivel de búsqueda y llega la policía.
2. **Operación Arena:** al asegurar el distrito te extraen a la Arena, una plaza con coberturas rodeada de ciudad. Resiste 10 oleadas; en la última llega el **Comandante**, que lanza granadas. Al vencerlo: misión cumplida.
3. **Tienda (B)** entre oleadas (15 s): armas, chaleco antibalas, granadas y mejoras de daño y cargador. Empiezas solo con M16 y Magnum.

Tu récord se guarda en el navegador y puedes compartir el resultado al terminar.

## Controles
- WASD: moverse · Ratón o flechas: mirar · Shift: correr · C: agacharse · Espacio: saltar (sube a coberturas bajas)
- Clic izquierdo: disparar · Clic derecho: apuntar (mira telescópica en el francotirador) · R: recargar
- 1–8 o rueda: cambiar de arma · G: granada · B: tienda (entre oleadas) · F: munición ($100) · H: botiquín ($150) · Esc: pausa

## Celular
En teléfonos y tabletas aparecen controles táctiles: joystick a la izquierda, deslizar a la derecha para mirar y botones FUEGO (se puede arrastrar para apuntar), MIRA, SALTO, R, AGACH., GRAN., ARMA y TIENDA. Se juega en horizontal.

## Ajustes
Sensibilidad, volumen, campo de visión, calidad gráfica (automática, baja, media, alta), invertir eje Y, mostrar FPS y mostrar consejos. Se guardan en el navegador.

## Técnica
- Three.js 0.160 desde jsDelivr. Necesita conexión a internet.
- Los modelos (edificios, coches y árboles Kenney CC0 con texturas, y las 8 armas) van incluidos dentro de `index.html`.
- Sin sombras reales y con escala de render automática para PCs de gama baja.
- Pruebas: `node tests/smoke.mjs` (Playwright). El workflow las ejecuta antes de publicar en GitHub Pages.
- El workflow todavía extrae `COMBAT_ZONE_6_6_RECONSTRUIDO.zip`, pero la versión 8.0 ya no necesita esos modelos.

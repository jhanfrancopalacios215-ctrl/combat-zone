# COMBAT ZONE 9.0
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

## Cooperativo online
- En el menú, **Cooperativo online**: crea una sala y comparte el código de 4 letras o el enlace de invitación (`?sala=ABCD`). De 2 a 4 jugadores.
- Se juega en la Arena: 10 oleadas y el Comandante. Cada baja la cobra quien la hace. Si caes, vuelves con 60 de salud al empezar la siguiente oleada; la partida termina si cae todo el equipo.
- El navegador del anfitrión simula enemigos y oleadas y envía instantáneas 10 veces por segundo; el servidor (`server/rooms.js`, WebSocket en `/ws`) solo reparte los mensajes. Si el anfitrión sale, la sala se cierra.

## Clasificación mundial y retos diarios
- Al terminar una partida puedes escribir tu nombre y publicar tu puntuación. En el menú, **Clasificación mundial** muestra la tabla de siempre y la de hoy.
- Cada día hay un **reto diario** distinto (tiros a la cabeza, granadas, oleadas…). Completarlo da +300 puntos y $300.
- El servidor está en `server/` (Node + Postgres) y se publica en Render con `render.yaml`. Pruebas del servidor: `node server/test.mjs`.
- **Importante:** la base Postgres gratuita de Render caduca a los 30 días de crearse (creada el 13/11/2026). Después hay 14 días para pasarla a un plan de pago; si no, se borra la tabla.

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

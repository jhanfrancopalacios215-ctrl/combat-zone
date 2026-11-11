# COMBAT ZONE
Prototipo FPS 3D para navegador.

## Controles
- WASD: movimiento
- Mouse: mirar
- Clic izquierdo: disparar
- R: recargar
- Shift: correr
- ESC: pausar

## Publicación
El sitio se publica con GitHub Pages mediante GitHub Actions.
Este prototipo requiere conexión a internet para cargar Three.js desde jsDelivr.

## Modelos 3D
Para que GitHub Pages muestre los edificios, vehículos, armas y personajes 3D, añade el archivo
`COMBAT_ZONE_6_6_REPARADO_2.zip` a la raíz del repositorio (botón **Add file → Upload files**).
No lo descomprimas. El workflow lo extrae automáticamente en cada publicación.
Si el ZIP no está presente, la publicación se detendrá con un error claro en Actions.

## Operación Arena
Segundo juego, independiente de Combat Zone: `arena.html` (en GitHub Pages, `/arena.html`).
Shooter por oleadas con radar y puntuación. Carga Three.js r128 desde cdnjs y trae sus modelos incluidos en el propio archivo, así que no depende del ZIP.

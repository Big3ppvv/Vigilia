# Verificación del combate frenético

Cambios sobre `main` (`8852735`): movimiento +22 %, cadencia de armas +39 %, esquiva con recarga base de 3,2 s, proyectiles +20 %, habilidades más frecuentes y hordas más densas. Se eliminan las pausas de críticos ordinarios; las de campana y acontecimientos especiales se conservan. El reloj de la noche y las ventanas de aviso no se aceleran.

## Comprobaciones de este cambio

- `npm run build` y `npm run check`: sintaxis de 43 archivos y HTML autónomo de 29 módulos actualizado.
- `npm test`: objetos, habilidades, faroles, colisiones, interfaz, teclado, sonido, límites visuales, movimiento reducido y noches completas.
- `npm run test:vfx` tras el último ajuste de críticos: daño doble sin detener la simulación, barrido de proyectiles rápidos a 50 ms, orden de perforación, equivalencia con destellos desactivados, caducidad y reinicio.
- Horda de 240 criaturas y todas las armas mejoradas: máximo de 96 efectos, 24 luces transitorias, 420 partículas y estelas de ocho puntos.
- Inspección real en Chromium a 1100 × 720 y 390 × 844: fogonazos, bajas, habilidades y esquivas; cirios, enemigos y controles legibles; sin errores de JavaScript.
- `designmd lint DESIGN.md`: cero errores. Se conservan los nueve avisos de tokens propios del diseño existente; el código sigue siendo su fuente canónica.
- Auditor estático premium en modo estricto: 44 avisos de botones sin acción, correspondientes a los mismos 22 botones en fuente y HTML generado. Son falsos positivos del detector de manejadores en línea: la instrumentación de Chromium confirmó un manejador `click` directo en los 22. `index.html`, `app.js` e `interface.js` coinciden con la base y no se alteran para silenciar el auditor.
- `git diff --check` y búsqueda de diálogos nativos o controles no semánticos en los módulos modificados: sin incidencias.

Las noches de la suite usan piloto automático e invulnerabilidad para comprobar continuidad y desenlace. Como diagnóstico adicional, una simulación con semilla fija y uso automático de habilidades, sin invulnerabilidad, alcanzó las 06:00 con los tres personajes tanto en la base como en la versión nueva. Esto no sustituye una evaluación humana de dificultad.

La dirección de efectos más intensos aprobada para este cambio se recoge en `DESIGN.md`; se conservan la paleta, el arte de píxel y los ajustes de accesibilidad.

---

# Verificación de la integración de ramas

Se combina `main` (`2ad22af`) con `feat/vigilia-gameplay-overhaul` (`dc82e8c`) y `codex/500-objetos-sinergias` (`683b895`). Las otras seis ramas ya eran antecesoras de `main`.

Se conserva la implementación reciente del velatorio, arrullo, rincones, élites y motor de audio. Se añaden habilidades con R, faroles, efectos de escena, 500 objetos y 20 sinergias. El HTML autónomo se regenera desde los módulos.

## Validación

- Sintaxis de 43 archivos y HTML generado de 29 módulos al día.
- 500 objetos, 20 colecciones, bonus, huecos y 550 elecciones.
- Habilidades de los tres personajes, faroles, recargas, interrupciones, recompensas únicas, reinicios y colisiones.
- Teclado, ratón, pausa, ajustes persistentes y controles táctiles a 390 × 844.
- Reglas del velatorio: cirios, procesión, alma, levantarse, arrullo, rincones, difuntos, marea y Guía.
- Combate, daño, horda, límites de efectos y movimiento reducido.
- Sonidos de habilidades y faroles audibles, distintos, finitos y sin saturación.
- Noche completa: Lucía, Julián y Matilde alcanzan las 06:00, muestran «Amanece.» y terminan sin errores de JavaScript.
- Noche sonora resumida: 41 efectos, ocho escenas, sin errores ni saturación.

En este entorno Chromium bloquea `file://`, por lo que las pruebas locales usan el HTML generado mediante un servidor local y `VIGILIA_TEST_URL`. La ejecución por defecto conserva las pruebas del archivo autónomo sin conexión. La fuente remota opcional se sustituye por una hoja vacía en las pruebas que comprueban errores de consola.

Las noches completas con cada personaje usan piloto automático e invulnerabilidad: validan continuidad, progresión y desenlace, sin medir dificultad para jugadores humanos.

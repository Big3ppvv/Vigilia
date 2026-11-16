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
- Noche sonora resumida: 41 efectos, ocho escenas, sin errores ni saturación.

En este entorno Chromium bloquea `file://`, por lo que las pruebas locales usan el HTML generado mediante un servidor local y `VIGILIA_TEST_URL`. La ejecución por defecto conserva las pruebas del archivo autónomo sin conexión. La fuente remota opcional se sustituye por una hoja vacía en las pruebas que comprueban errores de consola.

Las noches completas con cada personaje usan piloto automático e invulnerabilidad: validan continuidad, progresión y desenlace, sin medir dificultad para jugadores humanos.

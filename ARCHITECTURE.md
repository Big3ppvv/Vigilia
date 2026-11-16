# Arquitectura de La última vigilia

El juego usa módulos JavaScript, Canvas 2D y Web Audio. No necesita un framework ni un servidor para jugar. `build.mjs` recorre las importaciones de `app.js` y empaqueta los módulos, los estilos y el icono en `la-ultima-vigilia.html`.

Las rutas siguientes son relativas a `la-ultima-vigilia/`, salvo que se indique lo contrario.

## Flujo del juego

```text
index.html + style.css
        ↓
app.js ──→ interface.js (ajustes y persistencia en app.js)
        ↓ acciones y hooks
VigilGame (game.js)
        ├── entrada: input.js / bot.js
        ├── simulación: director / vigil / enemies / boss / weapons / memories / objects / ritual
        ├── dibujo: render / world / art / sprites / combat-fx / scene-fx
        └── sonido: audio / sfx / music / audio-cues
```

`VigilGame` posee el estado de la partida, el reloj y el ciclo de vida. Los sistemas de reglas aportan métodos a su prototipo; la composición ocurre al final de `game.js`. El bucle avanza la simulación, dibuja y entrega un estado resumido al motor de audio.

La interfaz recibe `getSnapshot()` mediante `onStats` y eventos como `onState`, `onLevelUp`, `onEnd`, `onSubtitle` y `onBanner`. Los botones llaman a acciones públicas —`start`, `pause`, `resume`, `dash`, `ability`, `chooseUpgrade`— en vez de reproducir reglas en el DOM.

## Responsabilidades

| Sistema | Archivos | Responsabilidad |
|---|---|---|
| Contenido | `story.js` | Historia, personajes, recuerdos, criaturas, habilidades, faroles, ayuda y finales |
| Equilibrio | `balance.js` | Duración, población, estadísticas, recargas, alcances y posición de los faroles |
| Ciclo de vida | `game.js` | Inicio, reinicio, actualización, transiciones, amanecer, derrota y snapshots |
| Entrada | `input.js`, `bot.js` | Teclado, gesto táctil, esquiva y piloto de pruebas |
| Noche | `director.js` | Horas, población, procesiones y enjambres |
| Amenazas | `enemies.js`, `boss.js` | Movimiento, daño, colisiones, ataques especiales y la Guía |
| Combate y progreso | `weapons.js`, `memories.js` | Armas automáticas, proyectiles, recogida de luz, estadísticas y mejoras |
| Decisiones activas | `ritual.js` | Habilidades, círculos de sal, canalización, interrupción y recompensas de los faroles |
| Mundo y dibujo | `world.js`, `art.js`, `sprites.js`, `render.js` | Terreno, obstáculos, sprites, luz, cámara y orden de dibujo |
| Efectos | `fx.js`, `combat-fx.js`, `scene-fx.js` | Caducidad de partículas, señales de combate, faroles, huellas, reflejos y minimapa |
| Sonido | `audio.js` | Ciclo de vida, mezcla, ambiente y respuesta al estado del juego |
| Síntesis | `audio.js` | Fuentes, envolventes, cuerda pulsada y reverberación |
| Música | `audio-score.js` | Nana, motivos de recuerdo y frases que responden al peligro |
| Señales sonoras | `audio-cues.js` | Armas, habilidades, pasos, campanas y eventos |
| Interfaz | `app.js`, `index.html`, `style.css` | Arranque, selección, HUD, cartas, álbum y recordatorio final |
| Preferencias y capas | `storage.js`, `settings.js`, `interface.js` | Guardado seguro, adaptación de ajustes, aislamiento de capas y foco de teclado |

## Contratos que conviene conservar

- **Reglas y dibujo:** el renderizador lee el estado; no concede recompensas ni decide impactos. Un farol cambia en `ritual.js` y se representa en `scene-fx.js`.
- **Reloj y pausa:** las recargas, la canalización y los efectos de reglas avanzan con la simulación. La pausa no permite completar un farol ni recargar una habilidad.
- **Reinicio:** `reset()` limpia entidades, proyectiles, efectos de combate, índice espacial, estado del bot, habilidades y faroles. Los efectos de escena reconocen el nuevo jugador y descartan sus huellas anteriores.
- **Interfaz:** `getSnapshot()` publica `ability` y `ritual`. Los estados de disponibilidad y progreso proceden de ese snapshot; los textos de las habilidades pertenecen a `story.js`.
- **Sonido:** `setVolume()` controla el nivel general; `setMix({music, amb, sfx})` usa valores entre 0 y 1. La integración conserva el mezclador reciente de main y su limitador de salida.
- **Persistencia:** se conserva el prefijo `vigilia2.` para mantener las noches anteriores. `app.js` tolera almacenamiento inaccesible y conserva los ajustes y registros existentes.
- **Accesibilidad:** los controles son botones nativos; las capas de partida aíslan el fondo y contienen el foco. Las opciones de destellos y temblor reducen efectos sin cambiar daño ni colisiones.

La paleta de interfaz reside en `style.css`, la de ataques en `ATTACK_PALETTE` de `art.js` y la ambiental en `SCENE_PALETTE` de `scene-fx.js`. [DESIGN.md](DESIGN.md) documenta esa identidad y su correspondencia con el código.

## Límites de efectos

Los límites controlan acumulación y limpieza; no son una promesa de rendimiento para cualquier dispositivo.

| Recurso | Límite actual | Propietario |
|---|---|---|
| Criaturas | 240 | `MAX_ENEMIES`, `balance.js` |
| Efectos de combate | 96 | `combat-fx.js` |
| Luces añadidas por combate | 24 | `combat-fx.js` |
| Partículas | 420 | `fx.js` |
| Huellas | 48, con caducidad | `scene-fx.js` |
| Hojas dibujadas | 36 por fotograma | `scene-fx.js` |
| Reflejos de charcos | 28 por fotograma | `scene-fx.js` |

Los gradientes de combate se reutilizan. El escenario obtiene hojas y charcos a partir de coordenadas y semillas, y omite elementos fuera de vista. Las fuentes sonoras terminadas se desconectan.

## Ampliar sin concentrar todo en un archivo

**Otra criatura:** añade sus números a `ENEMIES` en `balance.js`, su texto a `CREATURES` en `story.js` y su silueta en `sprites.js`. Implementa su comportamiento en `enemies.js`; cualquier ataque nuevo debe tener un aviso visible previo y respetar los límites de población. Si necesita sonido, añade su receta a `sfx.js`.

**Una habilidad o un farol:** separa texto (`story.js`), números y posiciones (`balance.js`), reglas (`ritual.js`) y dibujo (`scene-fx.js`). La interfaz consume el snapshot existente. Comprueba estados inválidos, recarga, reinicio y que una recompensa no pueda concederse dos veces.

**Un efecto:** usa `combat-fx.js` para salida, recorrido o contacto de armas; usa `scene-fx.js` para elementos del escenario y señales de objetivos. Dale una caducidad o un límite explícito. Suprimir destellos debe conservar la información necesaria para jugar.

**Un sonido:** añade la señal en `sfx.js` y reutiliza las primitivas de `audio.js`. Las recetas de habilidades y faroles se resuelven en `audio-cues.js`. Elige el bus por su función: música, ambiente o efectos. Evita crear nodos continuos por fotograma y comprueba mezcla, amplitud y limpieza con `tools/audio.mjs`.

El empaquetador admite importaciones nombradas locales en una línea y exportaciones de `const`, `let`, `function` o `class`; no resuelve importaciones circulares, paquetes externos ni alias. Conserva ese formato al añadir módulos o amplía el empaquetador con una comprobación equivalente.

## Verificación y distribución

`npm run build` actualiza el HTML autónomo. `npm run check` valida sintaxis y compara el resultado esperado con el archivo distribuido, sin modificarlo. `npm test` añade pruebas de habilidades y faroles, mezcla sonora, efectos de combate y noches completas con los tres personajes.

Las pruebas de gameplay, audio y efectos usan el HTML distribuido en Chromium sin conexión. La prueba de noche completa omite la fuente web opcional para que no dependa de Google Fonts. El piloto automático comprueba continuidad y final de partida; para ajustar dificultad y legibilidad también hace falta jugar a velocidad normal. El servidor modular facilita investigar errores mediante `?debug` y `window.vigilia`.

## Prioridad al integrar

Se conserva el motor de audio reciente de `main` (`audio.js`, `sfx.js`, `music.js`) y se añaden las recetas exclusivas de habilidades y faroles desde `audio-cues.js`. `audio-synth.js` aporta las funciones auxiliares de esas recetas. Las versiones alternativas de ajustes y almacenamiento permanecen en el historial; `app.js` mantiene la persistencia reciente, incluidos rincones, élites y tiempo atmosférico. Arrullar usa E/Q y la habilidad adicional usa R.

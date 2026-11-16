# Arquitectura de La última vigilia

El juego usa módulos JavaScript, Canvas 2D y Web Audio. No necesita un framework ni un servidor para jugar. `build.mjs` recorre las importaciones de `app.js` y empaqueta los módulos, los estilos y el icono en `la-ultima-vigilia.html` (unos 500 KB).

Las rutas siguientes son relativas a `la-ultima-vigilia/`, salvo que se indique lo contrario.

## Flujo del juego

```text
index.html + style.css
        ↓
app.js ──→ interface.js · storage.js
        ↓ acciones y hooks
VigilGame (game.js)  — estados: ready → running ⇄ paused → roundEnd → levelup → crate → shop → running … → dawn | dying → ended
        ├── entrada: input.js / bot.js
        ├── rondas: waves.js (marcas, procesiones, hordas, difuntos, la Guía)
        ├── combate: weapons.js (armas en corro, proyectiles, daño, cera, construcciones) · enemies.js · abilities.js
        ├── entre rondas: shop.js (recuerdos, ofrendas, el puesto de Remedios)
        ├── dibujo: render.js · arena.js · props.js · art.js · sprites.js · sprites-extra.js · combat-fx.js · fx.js · ambient.js
        └── sonido: audio.js · sfx.js · sfx-rondas.js · music.js · audio-cues.js · audio-synth.js
```

`VigilGame` posee el estado de la partida (`run`), el reloj de la ronda y el ciclo de vida. Los sistemas aportan métodos a su prototipo; la composición ocurre al final de `game.js`. El bucle avanza la simulación, dibuja y entrega un estado resumido al motor de audio.

La interfaz recibe snapshots por hooks: `onStats` (HUD), `onLevelUp`, `onCrate`, `onShop`, `onEnd`, `onState`, `onBanner`, `onSubtitle`, `onDiscover`, `onSave`. Los botones llaman a acciones públicas —`start`, `continueRun`, `dash`, `ability`, `chooseUpgrade`, `rerollUpgrades`, `takeCrate`, `sellCrate`, `buy`, `rerollShop`, `toggleLock`, `sellWeapon`, `combineWeapon`, `nextRound`, `pause`, `resume`— en vez de reproducir reglas en el DOM.

## Responsabilidades

| Sistema | Archivos | Responsabilidad |
|---|---|---|
| Contenido | `story.js` | Personajes, habilidades, criaturas, difuntos, la Guía, Amparo, Remedios, voces, ayuda y finales |
| Equilibrio | `balance.js` | Rondas, atrio, criaturas y su escalado, población, economía, rarezas, dificultad y habilidades |
| Estadísticas | `stats.js` | Las 16 estadísticas, sus topes, la armadura y lo que usa la simulación (`derived`) |
| Armas | `arsenal.js` | 20 armas con cuatro niveles, formas de atacar, escalados y las seis clases con sus premios |
| Objetos y recuerdos | `items.js` | 69 objetos con contrapartidas y reglas especiales; los 16 recuerdos de subir de nivel |
| Ciclo de vida | `game.js` | Partida, rondas, final de ronda, cosecha e intereses, experiencia, muerte, alba, guardado y snapshots |
| Rondas | `waves.js` | Qué viene, por dónde y cuándo: marcas de aparición, procesiones, hordas, difuntos con nombre y la Guía |
| Combate | `weapons.js` | Armas en corro, estocadas y barridos, proyectiles, zonas, daño con críticos, quemaduras, cera, construcciones |
| Amenazas | `enemies.js` | Movimiento y ataques de cada criatura, avisos, proyectiles enemigos, peligros y la Guía |
| Entre rondas | `shop.js` | Rarezas, precios, recuerdos y su tirada, ofrendas, ofertas, comprar, candado, vender y juntar |
| Habilidades | `abilities.js` | Lumbre, Cerco de sal, Responso, Alborada, Rede y Exorcismo |
| Entrada | `input.js`, `bot.js` | Teclado, dedo y mando; el piloto automático de las pruebas |
| Mundo y dibujo | `arena.js`, `props.js`, `art.js`, `sprites*.js`, `render.js` | Atrio pintado una vez, piezas del camposanto, sprites, luz y orden de dibujo |
| Efectos | `fx.js`, `combat-fx.js`, `ambient.js` | Partículas, números, fogonazos, estelas, golpes, orballo y huellas |
| Sonido | `audio.js`, `sfx.js`, `sfx-rondas.js`, `music.js` | Mezcla, ambiente, efectos por nombre y la nana convertida en muiñeira durante las rondas |
| Interfaz | `app.js`, `index.html`, `style.css`, `interface.js`, `storage.js` | Título, HUD, recuerdos, ofrendas, tienda, pausa, final, álbum, ajustes y progreso guardado |

## Contratos que conviene conservar

- **Reglas y dibujo:** `render.js` lee el estado; no concede recompensas ni decide impactos. El daño solo pasa por `hurt()` y `damagePlayer()`.
- **Una ronda limpia:** `startRound()` vacía criaturas, proyectiles, zonas y marcas, llena la vida, coloca las construcciones y conserva las ofrendas del suelo. `endRound()` funde la cera que queda y recoge las ofrendas.
- **Entre rondas, en orden:** `nextScreen()` decide: recuerdos pendientes → ofrendas → tienda (o alba tras la última ronda). Cada pantalla vuelve a llamarla al cerrarse.
- **Estadísticas en un solo sitio:** `computeStats()` suma base, personaje, recuerdos, objetos y premios de clase, y deja `st` (valores), `d` (derivados) y `sp` (reglas especiales). Subir la vida máxima cura lo que sube.
- **Pausa:** cooldowns, rondas y efectos de reglas solo avanzan en `running` (y en las transiciones `roundEnd`, `dying`, `dawn`).
- **Guardado:** la partida se guarda solo en la tienda (`saveData()`, versión 3) y se borra al terminar. El progreso entre noches y los ajustes usan el prefijo `vigilia3.`; los ajustes de la versión anterior se leen si no hay nuevos.
- **Accesibilidad:** controles nativos, capas con foco contenido (`interface.js`), atajos de teclado en todas las pantallas, movimiento reducido apaga temblor y destellos sin cambiar el daño.

## Límites

| Recurso | Límite | Propietario |
|---|---|---|
| Criaturas | 260 | `MAX_ENEMIES`, `balance.js` |
| Partículas | 520 | `fx.js` |
| Números y rótulos | 90 | `fx.js` |
| Fogonazos de luz | 48 | `fx.js` |
| Efectos de combate | 140, 24 con luz | `combat-fx.js` |
| Proyectiles propios | 220 | `weapons.js` |
| Proyectiles enemigos | 220 | `enemies.js` |
| Gotas de cera en el suelo | 320 (después se suman a las que hay) | `weapons.js` |
| Luces de criaturas por fotograma | 70, las más cercanas al centro | `render.js` |

## Ampliar sin concentrar todo en un archivo

**Otra arma:** añádela a `WEAPONS` en `arsenal.js` con sus cuatro niveles y una forma de atacar existente (`act`); dibújala en `WEAPON_SPRITES` de `sprites-extra.js` mirando a la derecha y, si tiene sonido propio, añade una receta con su `id` en `sfx-rondas.js`. `tools/data-check.mjs` comprueba que todo cuadra.

**Otro objeto:** añádelo a `ITEMS` en `items.js` con `stats` y, si cambia una regla, un `special` que ya exista (lo suma `computeStats()`); para una regla nueva, añade su lectura donde ocurra (`weapons.js`, `shop.js`…) y su nombre a la lista de `data-check.mjs`. Su icono va en `EXTRA_ICONS`.

**Otra criatura:** números en `ENEMIES` (`balance.js`), texto en `CREATURES` (`story.js`), dibujo en `EXTRA_SPRITES`, comportamiento en `behave()` de `enemies.js`. Todo ataque necesita un aviso visible antes de herir.

**Otro personaje:** ficha en `CHARACTERS` y `ABILITIES`, voces en `BARKS`, números en `ABILITY_BALANCE`, la habilidad en `abilities.js` y su dibujo con fotogramas de andar.

El empaquetador admite importaciones nombradas locales y exportaciones de `const`, `let`, `function` o `class`; no resuelve importaciones circulares, paquetes externos ni alias.

## Verificación y distribución

`npm run build` actualiza el HTML autónomo. `npm run check` valida sintaxis y que el archivo distribuido esté al día. `npm test` añade los datos, las reglas, el combate y sus efectos, el sonido, la interfaz con teclado, ratón y móvil, y una noche entera con cada personaje. Ver [VERIFICATION.md](VERIFICATION.md).

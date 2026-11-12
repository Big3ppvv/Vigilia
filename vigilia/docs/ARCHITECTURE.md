# Arquitectura técnica — VIGILIA (v0.2 «Una noche»)

Godot **4.6.3** (verificado) · GDScript con tipado estático · renderer *GL Compatibility* (2D, máxima compatibilidad).

## Novedades de la v0.2 (resumen)
| Sistema | Archivo | Qué hace |
|---|---|---|
| Velas votivas | `src/entities/votive_candle.gd` | Objetivo de sala: se encienden por proximidad (`kindle_speed`), debilitan sombras (`CombatWorld.in_votive_light`), deshacen disparos cercanos (`votive_sanctuary`), emiten `kindle`; las polillas las apagan (`snuff`). Las coloca `DungeonGenerator._place_votives` (después de las demás tiradas de la sala: no altera el determinismo previo). |
| Despertar de sala | `src/game/room_director.gd` | Por la luz (`_awaken_by_light`: `Enemy.dissolve()`, sin `kill`) o por la fuerza; emite `EventBus.room_awakened`. |
| Luz = vida | `src/fx/candle_lighting.gd` | Penumbra de salas dormidas y fundido al despertar; luz del jugador según `Player.flame_ratio()`; presupuesto de 8 luces. |
| Velo del sueño | `src/fx/dream_veil.gd` | Post-proceso de pantalla (viñeta, somnolencia, pulso al recibir daño). |
| Director del sueño | `src/game/dream_director.gd` | Susurros del Arrullo, voz de fuera, latido, líneas de jefes y mezcla de la música. RNG cosmético propio. |
| Narrativa | `src/ui/story_overlay.gd`, `data/lore.json` | Texto sobre negro/blanco: intro de cada noche, interludio, cuenta atrás, despertar. `StoryOverlay.fast` para pruebas. |
| Música | `src/audio/lullaby.gd` | La nana: partitura en código, síntesis aditiva en hilos, bucle perfecto; capas `nana:pad/box/pulse`, `menu`, `boss`. |
| Interfaz | `src/ui/menu_background.gd`, `end_screen.gd`, `hud.gd` | La habitación (menú), la hoja de enfermería, el HUD de llamas y velas. |

Eliminado: monedas, llaves, bombas (`bomb.gd`), tienda y puertas cerradas. La acción `add_resource` y el filtro `coins_min` ya no existen en el vocabulario.

## Principios
1. **Contenido = datos.** Objetos, sinergias, enemigos, campeones, personajes, plantillas de sala, pisos, estados, reacciones, botín y lore viven en `data/*.json`. Añadir contenido no requiere tocar sistemas.
2. **Validación al arrancar.** `ContentDB` valida referencias cruzadas, vocabulario de efectos, estadísticas, plantillas (tamaño, caracteres, accesos de puerta libres, conectividad). Las pruebas exigen 0 errores.
3. **Simulación separada de la presentación.** El generador de mazmorras es lógica pura; los proyectiles son datos; la UI solo escucha eventos.
4. **Sin dependencias circulares de diseño.** Los sistemas se comunican por `CombatWorld` (fachada de servicios), `SynergyEngine` (eventos de combate) y `EventBus` (notificaciones a UI/audio/guardado).
5. **Determinismo por flujos etiquetados.** Ningún sistema de simulación usa el RNG global.

## Autoloads
| Nombre | Responsabilidad |
|---|---|
| `EventBus` | Señales de baja frecuencia (salud, recursos, carteles, jefe, sala, partida). |
| `ContentDB` | Carga, indexa y valida `data/*.json`. |
| `Settings` | Opciones persistentes, acciones de entrada registradas en código, remapeo con intercambio de conflictos, validación de valores. |
| `SaveManager` | Perfil versionado (`user://profile.json`): totales, historial, descubrimientos; escritura atómica con `.bak`, recuperación y migraciones. |
| `Audio` | SFX sintetizados + la nana por capas (Lullaby) mezclada en vivo (`set_music_param`: somnolencia, combate); no sintetiza música en headless; cierre ordenado. |
| `GameManager` | Flujo de escenas y `RunState` (incluye el número de noche); cierre idempotente de partida. |

## Escena de juego (construida en código)
```
Game (ALWAYS)
├─ World (PAUSABLE)
│  ├─ RoomLayer → RoomView (colisión de muros/obstáculos, puertas, dibujo estático) + _RoomFx (velas)
│  ├─ FxDecals, HazardField (fuego/cera), EntityLayer (y-sort: jugador, enemigos, aliados, pedestales…)
│  ├─ ProjectileSystem (todos los proyectiles en 1 nodo), FxSystem, CameraRig
├─ CombatWorld · SynergyEngine · RoomDirector · DreamDirector (PAUSABLE)
├─ Velo del sueño (CanvasLayer 1) · HUD (10) · Overlays: inventario, pausa, hoja de la noche, depuración, fundido, StoryOverlay (20)
```

## Flujo de un disparo (ejemplo completo)
1. `Player._fire()` toma un `Projectile` del pool, lo configura con estadísticas y propiedades agregadas por `ItemSystem`, y emite `projectile_spawn` (p. ej. Pacto de Sebo lo potencia).
2. `ProjectileSystem._step()` lo mueve; choca con la rejilla de la sala de forma analítica (rebota o emite `impact`).
3. Al tocar un enemigo: `CombatWorld.projectile_hit()` → `DamageInfo` (con etiquetas) → crítico → `deal_damage()`.
4. `Enemy.apply_damage()` → `DamageSystem.mitigate()` (tolerancias, alergias, inmunidades, armadura) → modificador propio (armadura direccional) → escudos → vida.
5. `deal_damage()` emite `hit` al `SynergyEngine` y registra la exposición para la **Tolerancia del Sueño**. Si muere: `kill`.
6. Los efectos de reliquias reaccionan (`split`, `explode`, `apply_status`…) y generan nuevos eventos con profundidad +1.

## Estadísticas — orden de operaciones (canónico)
```
valor = clamp( ((base + Σflat) × max(0, 1 + Σpct) × Πmult) + Σfinal , min, max )   (+ redondeo si es entera)
```
- `pct` se suma entre sí (dos +50 % = +100 %); `mult` multiplica (dos ×1,5 = ×2,25).
- Modificadores **temporales** (expiran en `tick`), **condicionales** (`condition`) y **escalables** (`per` + `cap`), evaluados contra el contexto del jugador (`Player.stat_context`).
- NaN/INF se sanean; estadísticas desconocidas se rechazan. Prueba: `test_stats.gd`.

## Daño
`DamageSystem.mitigate`: `importe × Π(1 − tolerancia + alergia | inmunidad = 0) × 20/(20 + armadura)`; las autolesiones ignoran toda mitigación y los escudos de cera. El jugador recibe daño en "cuentas" (1, o 2 si el golpe es `heavy`).

## Motor de sinergias (`SynergyEngine` + `EffectActions` + `EffectVocab`)
- **Gramática**: 20 disparadores, 17 filtros, 21 acciones (ver `effect_vocab.gd`). `ContentDB` rechaza cualquier nombre fuera del vocabulario.
- **Cola FIFO sin recursión de pila**: los eventos emitidos durante el procesamiento se encolan.
- **Profundidad**: cada acción derivada suma 1; eventos con profundidad > `MAX_DEPTH` (4) se descartan (contador `depth_capped`).
- **Presupuesto**: `EVENT_BUDGET` = 400 eventos por frame de física; el excedente se difiere (no se pierde). `MAX_QUEUE` = 4000.
- **proc_coef**: atenúa las *probabilidades* en cadenas (fragmentos ×0,7, explosiones ×0,6, ticks de estados = 0 → no emiten `hit`).
- **Regla de muertes**: los eventos `kill` usan siempre `proc_coef = 1` (son discretos, uno por enemigo). *Esta regla la descubrió una prueba: sin ella, una muerte por veneno nunca activaba efectos "al matar".*
- **Orden**: prioridad descendente y orden de adquisición.
- **Modificadores de mecánicas** (`mechanics`): objetos que alteran a otros objetos (radio de explosión, fragmentos extra, aliados…).
- **Sinergias de conjunto** (`synergies.json`): transformaciones por etiquetas, combos por objetos y sinergias negativas; se activan/desactivan recalculando requisitos.

## Generación procedural (`DungeonGenerator`, lógica pura)
1. Crecimiento en rejilla desde el origen; una celda nueva solo se acepta con un único vecino ocupado.
2. Bucles entre salas normales (atajos) antes de colocar especiales.
3. Jefe, tesoros y cabecera como **hojas nuevas** (una sola puerta); el jefe en la hoja más lejana con distancia mínima.
4. Sala secreta adyacente a ≥ 2 salas normales, unida por **puertas ocultas**.
5. Validación estructural; si falla, reintento con sub-semilla derivada del número de intento.
6. Población por sala con RNG derivado de la coordenada (independiente del orden de visita): plantilla ponderada por dificultad/profundidad, espejado, enemigos por nivel, campeones, pedestales.

Verificado sobre **600 pisos** (300 semillas × 2 pisos): 0 inválidos, 0 respaldos, 1 intento máximo.

## Determinismo
- `SeedUtil`: hash FNV-1a de 32 bits propio (fijado contra valores de referencia calculados fuera de Godot).
- `RngStream`: todo sobre `randi()` de PCG32; métodos con nombres que no sombrean funciones globales.
- Flujos independientes: `gen:v1:f<n>:a<intento>`, `room:…`, `f<n>:loot`, `f<n>:drops`, `combat`, `synergy`, `ai:…`, `boss_reward`.
- **Verificado**: misma semilla → mismo piso y mismos objetos (pruebas); y la partida completa del bot con la misma semilla y paso fijo produjo resultados idénticos en 3 ejecuciones.
- **No verificado**: determinismo entre plataformas/versiones del motor (coma flotante), y no hay grabación de entradas todavía (repeticiones = Fase 2+).

## Persistencia
- `user://settings.cfg` (ConfigFile) y `user://profile.json` (JSON con `version`).
- Escritura atómica: `.tmp` → verificación → copia `.bak` → sustitución.
- Recuperación: archivo dañado → `.bak`; ambos dañados → copia `.corrupt` + perfil nuevo. Migración v1→v2 probada.
- Las rutas son inyectables (`active_path`) para que las pruebas no toquen los archivos del jugador.

## Rendimiento (medido)
Técnicas: pool de proyectiles, colisión analítica contra rejilla, rejilla espacial de enemigos, objetivos cacheados por frame, textura horneada por color para proyectiles enemigos, presupuesto de partículas (normal 1400 / reducido 320), límite de proyectiles (2500, descartes contados), música sintetizada en hilos.

Prueba de estrés (`tests/stress`), CPU Intel Xeon 2,1 GHz, headless (sin coste de GPU), **tiempo real de pared por frame completo**:

| Escenario | Media | p95 | Máx. |
|---|---|---|---|
| Horda: 40–48 enemigos activos + build explosiva completa (776 explosiones, 304 bajas en 20 s) | 5,4 ms | 8,3 ms | 37 ms (pico de arranque) |
| Lluvia: ~2000 proyectiles enemigos simultáneos | 10,3 ms | 14,3 ms | 21,8 ms |

> Nota metodológica: el monitor `Performance.TIME_PHYSICS_PROCESS` reportó ~30 ms en la horda, incompatible con el tiempo de pared medido (5,4 ms por frame completo) y con la suma de secciones instrumentadas. Se usa el tiempo de pared como referencia. El coste de GPU real **no está medido** (el entorno solo dispone de render por software).

Herramientas: overlay F3 (FPS, tiempos, entidades, contadores del motor), perfilador por secciones F4 (`Prof`), piloto automático F8.

## Estructura de carpetas
```
project.godot · export_presets.cfg · icon.svg
data/            contenido (JSON validado)
scenes/          main_menu.tscn, game.tscn (raíces mínimas; el árbol se construye en código)
src/autoload/    EventBus, ContentDB, Settings, SaveManager, Audio, GameManager
src/core/        SeedUtil, RngStream, StatDefs, StatBlock, DamageInfo, Team, Palette, GlyphPainter, FileUtil
src/world/       DungeonGenerator, FloorLayout, RoomData, RoomGrid, RoomView, HazardField
src/combat/      CombatWorld, ProjectileSystem, Projectile, DamageSystem, StatusComponent
src/systems/     SynergyEngine, EffectActions, EffectVocab, ItemSystem, LootManager, ToleranceSystem, RunState, FloorParams
src/entities/    player/ (Player, InputSource, HumanInput), enemies/ (base + 7 + jefe), allies/, pickups/, votive_candle, exit_portal
src/game/        Game (controlador de escena y de la noche), RoomDirector, DreamDirector
src/fx/          FxSystem, CameraRig, CandleLighting (luz = vida), DreamVeil (somnolencia)
src/ui/          UIKit (tema), ScaledRoot (escala de UI), Hud, Minimap, InventoryPanel, PauseMenu, SettingsPanel, EndScreen (hoja de enfermería), MainMenu, MenuBackground (la habitación), StoryOverlay
src/audio/       SfxSynth (efectos), Lullaby (la nana)
src/debug/       DebugOverlay, BotInput (piloto automático), Prof (perfilador)
tests/           test_runner + 9 suites unitarias/integración, smoke/ (noches completas), stress/
tools/           screenshot_tour (capturas reales con render)
docs/            diseño, arquitectura, sinergias, guía de contenido, hoja de ruta, problemas conocidos, informe de pruebas, capturas
```

## Advertencia operativa importante
Al añadir un script con `class_name` nuevo hay que regenerar la caché de clases (`godot --headless --path . --import`, o abrir el proyecto en el editor) antes de ejecutar desde la línea de comandos; si no, los demás scripts no compilan ("Identifier not declared").

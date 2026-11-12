# Guía de contenido

Todo el contenido vive en `data/*.json`. Al arrancar, `ContentDB` lo valida; cualquier error aparece en consola como `[ContentDB] …` y la prueba `test_content_has_no_errors` falla.

## Recuerdo (`items.json`)
Los objetos son **recuerdos**: cosas del mundo real filtradas por el sueño. Escribe el `flavor` desde la habitación (quién lo dejó en la mesita, qué significa) y el `desc` en lenguaje llano.
```json
{
  "id": "mi_objeto", "name": "Nombre", "desc": "Qué hace (visible)", "flavor": "Texto de lore",
  "type": "passive",                 // o "active" (requiere "charge": N salas)
  "rarity": "uncommon",              // common | uncommon | rare | cursed | legendary
  "tags": ["projectile", "fire"],    // las etiquetas alimentan sinergias de conjunto
  "pools": {"treasure": 1.0, "altar": 0.5, "boss": 0.3, "secret": 0.2},
  "stats": [{"stat": "damage", "op": "pct", "value": 0.2},
            {"stat": "damage", "op": "pct", "value": 0.05, "per": "wax", "cap": 0.3},
            {"stat": "fire_rate", "op": "flat", "value": 1.0, "condition": "hp_le_1"}],
  "projectile": {"spectral": true},  // spectral | bounce_damage_mult | wave_amp | wave_freq | color | falloff | statuses
  "mechanics": {"explosion_radius_mult": 1.2},
  "effects": [
    {"trigger": ["hit", "impact"], "filter": {"tags_all": ["projectile"]}, "chance": 0.25, "icd": 0.5, "every": 3,
     "action": "explode", "params": {"radius": 50, "damage_mult": 0.5, "base": "source", "tags": ["explosion", "fire"]}},
    {"trigger": "acquire", "action": "heal", "params": {"amount": 1}}
  ],
  "icon": {"glyph": "ember", "c1": "#ff8c3a", "c2": "#fff1c1"}
}
```
- **Operaciones de estadística**: `flat`, `pct`, `mult`, `final` (orden en ARCHITECTURE.md). Estadísticas: `StatDefs.DEFS`.
- **Disparadores, filtros y acciones**: `src/systems/effect_vocab.gd` (con descripción). `acquire` y `use` se ejecutan una vez (al obtener / al usar el activo).
- **Pools**: `treasure` (elegir 1 de 2), `altar` (la Cabecera: cuesta llama máxima según `loot.json` → `altar_costs`), `boss`, `secret`.
- **Glifos disponibles**: splinter, powder, flask, chalice, eye, wing, dust, bead, lens, pact, wound, tooth, ember, frost, crown, bell, candle, coin, map, hand, bellows, tangerine, watch, drawing, radio (y heart = ascua, wax para consumibles).
- **Disparador propio de esta versión**: `kindle` (el jugador enciende una vela; `ctx.position` es la vela). Úsalo con `"origin": "event"` para que el efecto nazca en la vela. Estadística `kindle_speed` (multiplica la velocidad de encendido).

## Sinergia de conjunto (`synergies.json`)
`requires` admite `tags` (`{"fire": 3}`), `items_all` e `items_any_count`; `grants` admite `stats`, `effects`, `mechanics`, `projectile` y `familiars`. Los efectos `acquire`/`use` no se ejecutan dentro de una sinergia.
- `"secret": false` + requisito por **etiquetas** ⇒ el juego muestra el progreso (pedestal, aviso al recoger, inventario). Las secretas no se anuncian hasta descubrirse.
- Si introduces una etiqueta nueva como requisito, añade su nombre visible en `ItemSystem.TAG_LABELS`.
- Antes de añadir una, comprueba que no se active con las combinaciones de objetos de `tests/unit/test_synergy.gd`: varias pruebas afirman valores exactos (número de explosiones, cadencia, radio).
- Condiciones válidas en `stats[].condition` / `per`: `hp`, `missing_hp`, `hp_le_1`, `full_hp`, `items`, `moving`, `wax` (`Player.stat_context`). Cualquier otra nunca se cumple y **no** se valida al arrancar.

## Enemigo (`enemies.json`)
`id, name, script, tier (1–3), hp, radius, speed, contact_damage, tags, params{…}`; opcionales `flying, knockback_resist, armor, drop_chance, boss, title, lore, inventory_reactions`.
Un mismo `script` con distintos `params` produce variantes reales (ej.: Campanero y Campanero Mayor). Para un comportamiento nuevo: crea un script que extienda `Enemy` e implemente `behave(dt)` y `draw_enemy(a)`. En `draw_enemy`, registra con `add_glow(pos, radio, color)` lo que deba brillar en la penumbra (ojos, llamas); `draw_eyes` ya lo hace. Las sombras se debilitan en la luz de una vela encendida (`Enemy.LIGHT_VULNERABILITY`, `LIGHT_SLOW`) y se disipan si la sala despierta por la luz.

## Campeón (`champions.json`)
`behavior`: `fire_trail` | `split_on_death` | `veil` | `retaliate` | `""`, más multiplicadores (`hp_mult`, `scale`, `speed_mult`…) e inmunidades.

## Plantilla de sala (`rooms.json`)
Rejilla de **15 × 9**. Leyenda:

| Carácter | Significado |
|---|---|
| `.` | suelo |
| `#` | cera endurecida (bloquea; se rompe con explosiones) |
| `X` | pilar (indestructible, con vela) |
| `~` | charco de cera (ralentiza) |
| `1` `2` `3` | aparición de enemigo de ese nivel |
| `B` | jefe |
| `I` | pedestal de objeto (pool según el tipo de sala) |
| `S` | recuerdo en la Cabecera (cuesta llama máxima) |
| `P` | consumible suelto |
| `L` | inscripción de lore |

Las **velas votivas** no se dibujan en la plantilla: el generador coloca 2 (dificultad 1) o 3 (dificultad 2-3) en cada sala de combate, en suelo libre, lejos de puertas y apariciones, repartidas por muestreo del punto más lejano. Deja huecos de suelo `.` suficientes.

Varias `I` en una misma sala forman un **grupo de elección**: al tomar una, las demás se desvanecen (el pedestal lo avisa antes de decidir). Las salas del tesoro ofrecen así *elegir 1 de 2*.

Reglas validadas: tamaño exacto, caracteres válidos, accesos de puerta libres en (7,0)(7,1) (14,4)(13,4) (7,8)(7,7) (0,4)(1,4), y **toda casilla transitable alcanzable sin romper rocas**. Recomendado (no validado por el juego): no poner apariciones a menos de 3 casillas de una puerta. `mirror: true` permite espejado horizontal/vertical (×4 variantes). `difficulty` 1–3 y `weight` controlan la selección.

## Piso (`floors.json`)
`rooms [min,max]`, `treasure`, `altar`, `secret`, `branch_chance`, `loop_chance`, `max_loops`, `min_boss_distance`, `boss`, `boss_reward (single|choice2)`, `style` (`chapel` | `ward`), `palette` (colores del suelo y los muros), `music`, `enemy_hp_mult`, `enemy_speed_mult`, `champion_chance`, `difficulty_weights`, `enemy_pool`, **`enemy_overrides`** (cambia parámetros de comportamiento por piso: así escala la dificultad sin inflar la vida).

## Estados y reacciones (`status_effects.json`)
Estado: `stacking (stack|refresh)`, `max_stacks`, `tick`, `dps_per_stack`, `speed_mult`, `action_speed_mult`, `moving_bonus`, `tags`, `resist_stat`. Reacción: `a`, `b`, `consume`, `damage`, `radius`, `tags`.

## Textos de la noche (`lore.json`)
Toda referencia a la Espina debe ser **neutra en género**.
- `first_night`, `night_intros` (una lista de líneas por noche, a partir de la 2), `night_generic`: la voz de quien vela al empezar.
- `interludes`: entre pisos. `awaken_outside`: frases sueltas de la voz de fuera al despertar una sala.
- `lullaby`: susurros del Arrullo con poca llama. `lullaby_learned`: lo que dice cuando la Tolerancia del Sueño se adapta a una etiqueta.
- `countdown`, `after_death`, `epitaphs` (observaciones de la hoja de enfermería), `victory`, `victory_chart`, `credits`.
- `bosses.<id>`: `intro`, `phase2`, `phase3`, `death`.

## Personaje (`characters.json`)
`stats` base, `start_hp`, `start_items`, `start_active`, `mechanic`, `weakness`, `projectile` (propiedades propias), `graze_crits`, `colors` (`flame`, `core`, `eye`).

## Después de añadir scripts
Si creas un script con `class_name`, regenera la caché: `godot --headless --path . --import` (o abre el proyecto en el editor).

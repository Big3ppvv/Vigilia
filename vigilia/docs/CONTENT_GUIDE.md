# Guía de contenido

Todo el contenido vive en `data/*.json`. Al arrancar, `ContentDB` lo valida; cualquier error aparece en consola como `[ContentDB] …` y la prueba `test_content_has_no_errors` falla.

## Objeto (`items.json`)
```json
{
  "id": "mi_objeto", "name": "Nombre", "desc": "Qué hace (visible)", "flavor": "Texto de lore",
  "type": "passive",                 // o "active" (requiere "charge": N salas)
  "rarity": "uncommon",              // common | uncommon | rare | cursed | legendary
  "tags": ["projectile", "fire"],    // las etiquetas alimentan sinergias de conjunto
  "pools": {"treasure": 1.0, "shop": 0.5, "boss": 0.3, "secret": 0.2},
  "stats": [{"stat": "damage", "op": "pct", "value": 0.2},
            {"stat": "damage", "op": "pct", "value": 0.03, "per": "coins", "cap": 0.45},
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
- **Glifos disponibles**: splinter, powder, flask, chalice, eye, wing, dust, bead, lens, pact, wound, tooth, ember, frost, crown, bell, candle, coin, map, hand, bellows (y heart, wax, key, bomb para consumibles).

## Enemigo (`enemies.json`)
`id, name, script, tier (1–3), hp, radius, speed, contact_damage, tags, params{…}`; opcionales `flying, knockback_resist, armor, drop_chance, boss, title, lore, inventory_reactions`.
Un mismo `script` con distintos `params` produce variantes reales (ej.: Campanero y Campanero Mayor). Para un comportamiento nuevo: crea un script que extienda `Enemy` e implemente `behave(dt)` y `draw_enemy(a)`.

## Campeón (`champions.json`)
`behavior`: `fire_trail` | `split_on_death` | `veil` | `retaliate` | `""`, más multiplicadores (`hp_mult`, `scale`, `speed_mult`…) e inmunidades.

## Plantilla de sala (`rooms.json`)
Rejilla de **15 × 9**. Leyenda:

| Carácter | Significado |
|---|---|
| `.` | suelo |
| `#` | roca (bloquea; se rompe con explosiones) |
| `X` | pilar (indestructible, con vela) |
| `~` | charco de cera (ralentiza) |
| `1` `2` `3` | aparición de enemigo de ese nivel |
| `B` | jefe |
| `I` | pedestal de objeto (pool según el tipo de sala) |
| `S` / `H` | objeto / consumible en venta |
| `P` | consumible suelto |
| `L` | inscripción de lore |

Reglas validadas: tamaño exacto, caracteres válidos, accesos de puerta libres en (7,0)(7,1) (14,4)(13,4) (7,8)(7,7) (0,4)(1,4), y **toda casilla transitable alcanzable sin romper rocas**. Recomendado (no validado por el juego): no poner apariciones a menos de 3 casillas de una puerta. `mirror: true` permite espejado horizontal/vertical (×4 variantes). `difficulty` 1–3 y `weight` controlan la selección.

## Piso (`floors.json`)
`rooms [min,max]`, `treasure`, `shop`, `secret`, `branch_chance`, `loop_chance`, `max_loops`, `min_boss_distance`, `boss`, `boss_reward (single|choice2)`, `treasure_locked`, `enemy_hp_mult`, `enemy_speed_mult`, `champion_chance`, `difficulty_weights`, `enemy_pool`, **`enemy_overrides`** (cambia parámetros de comportamiento por piso: así escala la dificultad sin inflar la vida).

## Estados y reacciones (`status_effects.json`)
Estado: `stacking (stack|refresh)`, `max_stacks`, `tick`, `dps_per_stack`, `speed_mult`, `action_speed_mult`, `moving_bonus`, `tags`, `resist_stat`. Reacción: `a`, `b`, `consume`, `damage`, `radius`, `tags`.

## Personaje (`characters.json`)
`stats` base, `start_hp`, `start_items`, `start_active`, `start_resources`, `mechanic`, `weakness`, `projectile` (propiedades propias), `graze_crits`, `colors`.

## Después de añadir scripts
Si creas un script con `class_name`, regenera la caché: `godot --headless --path . --import` (o abre el proyecto en el editor).

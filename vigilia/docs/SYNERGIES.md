# Sinergias — catálogo y verificación

Hay dos clases de sinergia y ambas existen en la Fase 1:

1. **Emergentes**: nadie las programa. Surgen porque un efecto **produce** eventos con etiquetas que otro efecto **escucha**. Añadir una reliquia nueva crea automáticamente combinaciones con todas las existentes que compartan etiquetas.
2. **De conjunto** (`data/synergies.json`): reglas explícitas por etiquetas u objetos (transformaciones, combos, negativas). Sirven para recompensas temáticas y para el registro de descubrimientos.

## Emergentes verificadas por pruebas automáticas
Todas se prueban sobre la **escena real** del juego (`tests/unit/test_synergy.gd`, `test_combat.gd`).

| # | Objetos | Cadena de eventos | Prueba |
|---|---|---|---|
| E1 | Astilla Bífida + Pólvora de Cirio | `hit` → `split` (3 fragmentos, gen. 1) + `explode`; cada fragmento `hit` → `explode`, pero el filtro `max_generation: 0` impide re-dividir | `test_split_plus_explode` |
| E2 | Pólvora + Hiel Votiva + Comunión Rancia | `hit` → `explode` → `hit[explosion]` → `apply_status(poison)` → tick de veneno mata → `kill{target_status: poison}` → `spawn_ally` | `test_explosion_poison_communion_chain` |
| E3 | Pacto de Sebo + Herida que Canta | 8.º `projectile_spawn` → `self_damage` → `hurt` → anillo de 10 astillas + cadencia +30 % | `test_pact_triggers_singing_wound` (+ `test_pact_respects_min_hp`) |
| E4 | Escarcha de Vela + Brasa Viva | `chill` y `burn` coexisten → reacción de datos *Choque térmico* | `test_thermal_shock_reaction`, `test_frost_and_ember_items_produce_reactions` |
| E5 | Brasa Viva + Hiel Votiva | muerte ardiendo → `explode[fire]` → `hit[explosion]` → veneno en vecinos | `test_burning_death_explosion_poisons` |
| E6 | Eco del Campanario + Ojo de Polilla | rebote limpia `hit_ids` → la teledirección re-adquiere objetivo y acierta | `test_bounce_then_homing_hits` |
| E7 | Cualquier explosión + salas secretas | `explode` → `RoomView.on_explosion` revela muros agrietados (bombas **o** astillas explosivas) | `test_explosion_reveals_secret_door` |

Otras emergentes presentes (observadas en partidas, sin prueba dedicada):
- **Brasa Viva + Polilla (enemigo)**: los enemigos ardiendo atraen y distraen a las Polillas.
- **Bomba propia + Herida que Canta**: tu bomba te hiere (fuego amigo) → disparas el anillo a propósito.
- **Corona de Mecha + Pacto de Sebo**: con 2 astillas por disparo el pacto se cobra cada 4 ráfagas.
- **Herida que Canta + Ojo de Polilla / Eco**: el anillo de represalia hereda teledirección y rebotes.
- **Críticos + Pólvora**: la explosión escala con el golpe que la provoca (crítico incluido).
- **Escarcha + jefes**: la escarcha ralentiza también los temporizadores de ataque de Madre Cirio.

## De conjunto (`synergies.json`)
| Id | Tipo | Requisito | Efecto | Prueba |
|---|---|---|---|---|
| `moth_swarm` *Enjambre* | Transformación | 3 objetos con etiqueta `moth` | 2 polillas lunares (bloquean disparos), astillas ondulantes, +10 % cadencia | `test_moth_swarm_transformation` |
| `transfusion` *Transfusión* | Transformación | 2 objetos con etiqueta `blood` | +2 de vida por minuto | — (activación cubierta por el mismo mecanismo) |
| `drowned_wick` *Mecha Ahogada* | **Negativa** (secreta) | Escarcha de Vela + Pólvora de Cirio | **Un objeto modifica a otro**: −30 % radio de explosión, pero las explosiones escarchan | `test_drowned_wick_negative_synergy` |
| `resonant_belfry` *Campanario Resonante* | Combo (secreta) | Eco del Campanario + Campana Rota | cada rebote libera una onda expansiva | — |

## Protecciones (verificadas)
| Riesgo | Protección | Prueba |
|---|---|---|
| Bucle infinito (efecto que se dispara a sí mismo) | Profundidad máxima 4 | `test_recursion_guard_terminates` (efecto patológico "explosión → explosión") |
| Avalancha de eventos en un frame | Presupuesto de 400 eventos/frame; el resto se difiere | `test_event_budget_defers_overflow` |
| Cascadas por probabilidad | `proc_coef` decreciente en fragmentos/explosiones; los ticks de estados no emiten `hit` | implícito en E1–E5 |
| Pactos letales | Filtro `player_hp_min` | `test_pact_respects_min_hp` |

## Cómo diseñar una sinergia nueva sin programar
1. Elige un **disparador** que exista (`EffectVocab.TRIGGERS`) y filtra por **etiquetas** (`tags_any`/`tags_all`/`tags_none`), estado del objetivo, generación, crítico, vida del jugador…
2. Encadena **acciones** del vocabulario (`EffectVocab.ACTIONS`). Si emiten daño, pon etiquetas significativas: son las que otras reliquias escucharán.
3. Si necesitas que un objeto altere a otro, usa `mechanics` (p. ej. `explosion_radius_mult`, `split_count_add`).
4. Arranca el juego: `ContentDB` valida todo y rechaza nombres desconocidos.

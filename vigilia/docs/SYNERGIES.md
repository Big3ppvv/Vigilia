# Sinergias — catálogo y verificación

Hay dos clases de sinergia:

1. **Emergentes**: nadie las programa. Surgen porque un efecto **produce** eventos con etiquetas que otro efecto **escucha**. Añadir un recuerdo nuevo crea automáticamente combinaciones con todas las existentes que compartan etiquetas.
2. **De conjunto** (`data/synergies.json`): reglas explícitas por etiquetas u objetos (transformaciones, combos, negativas). Sirven para recompensas temáticas y para el registro de descubrimientos.

## Emergentes verificadas por pruebas automáticas
Todas se prueban sobre la **escena real** del juego (`tests/unit/test_synergy.gd`, `test_combat.gd`).

| # | Objetos | Cadena de eventos | Prueba |
|---|---|---|---|
| E1 | Cerilla partida + Vela de broma | `hit` → `split` (3 fragmentos, gen. 1) + `explode`; cada fragmento `hit` → `explode`, pero el filtro `max_generation: 0` impide re-dividir | `test_split_plus_explode` |
| E2 | Vela de broma + Jarabe amargo + Recordatorio de difuntos | `hit` → `explode` → `hit[explosion]` → `apply_status(poison)` → tick de veneno mata → `kill{target_status: poison}` → `spawn_ally` | `test_explosion_poison_communion_chain` |
| E3 | Aguja de suero + Herida que canta | 8.º `projectile_spawn` → `self_damage` → `hurt` → anillo de 10 brasas + cadencia +30 % | `test_pact_triggers_singing_wound` (+ `test_pact_respects_min_hp`) |
| E4 | Bolsa de hielo + Brasa viva | `chill` y `burn` coexisten → reacción de datos *Choque térmico* | `test_thermal_shock_reaction`, `test_frost_and_ember_items_produce_reactions` |
| E5 | Brasa viva + Jarabe amargo | muerte ardiendo → `explode[fire]` → `hit[explosion]` → veneno en vecinos | `test_burning_death_explosion_poisons` |
| E6 | Timbre de llamada + Ojo de polilla | rebote limpia `hit_ids` → la teledirección re-adquiere objetivo y acierta | `test_bounce_then_homing_hits` |
| E7 | Cualquier explosión + salas secretas | `explode` → `RoomView.on_explosion` revela muros agrietados de golpe (también ceden a 4 brasas sueltas) | `test_explosion_reveals_secret_door`, `test_embers_crack_open_secret_wall` |
| E8 | La radio de la sala + velas votivas | `kindle` (encender una vela) → anillo de 10 notas desde la vela | `test_lighting_all_votives_awakens_room_and_dissolves_shadows` (cubre `kindle`) |

Otras emergentes presentes (observadas en partidas, sin prueba dedicada):
- **Brasa viva + Polilla (enemigo)**: los enemigos ardiendo atraen y distraen a las Polillas.
- **Polilla (enemigo) + velas votivas**: las polillas se posan en las velas encendidas y las apagan; distraídas, atacan menos a la Espina.
- **Corona de mecha + Aguja de suero**: con 2 brasas por disparo el pacto se cobra cada 4 ráfagas.
- **Herida que canta + Ojo de polilla / Eco**: el anillo de represalia hereda teledirección y rebotes.
- **Críticos + Vela de broma**: la explosión escala con el golpe que la provoca (crítico incluido).
- **Escarcha + jefes**: la escarcha ralentiza también los temporizadores de ataque de Madre Cirio.

## De conjunto (`synergies.json`)
| Id | Tipo | Requisito | Efecto | Prueba |
|---|---|---|---|---|
| `moth_swarm` *Enjambre* | Transformación | 3 objetos con etiqueta `moth` | 2 polillas lunares (bloquean disparos), brasas ondulantes, +10 % cadencia | `test_moth_swarm_transformation` |
| `transfusion` *Transfusión* | Transformación | 2 objetos con etiqueta `blood` | +2 de vida por minuto | — (activación cubierta por el mismo mecanismo) |
| `drowned_wick` *Mecha Ahogada* | **Negativa** (secreta) | Bolsa de hielo + Vela de broma | **Un objeto modifica a otro**: −30 % radio de explosión, pero las explosiones escarchan | `test_drowned_wick_negative_synergy` |
| `resonant_belfry` *Campanario Resonante* | Combo (secreta) | Timbre de llamada + Campana rota | cada rebote libera una onda expansiva | — |

### Añadidas en la Fase 1.5 (diseñadas y validadas estáticamente; **sin verificar aún en el motor**)
Las sinergias por etiquetas no son secretas: el pedestal, el aviso al recoger y el inventario muestran su progreso. Ninguna se activa con las combinaciones de objetos que usan las pruebas, salvo *Miasma* en E2, revisada aserción por aserción (más cargas de veneno solo refuerzan «7 envenenados» y «todos mueren»; no toca el tope de 4 aliados ni hiere al jugador).

| Id | Tipo | Requisito | Efecto |
|---|---|---|---|
| `pyre` *Pira* | Transformación | 3 × `fire` | todas tus brasas Queman y se tiñen de naranja; +25 % daño de estados |
| `powder_saint` *Santo de la Vela de broma* | Transformación | 3 × `explosion` | explosiones +30 % radio y +20 % daño |
| `clairvoyance` *Clarividencia* | Transformación | 3 × `crit` | +0,75 al multiplicador crítico; brasas doradas |
| `miasma` *Miasma* | Combo | 2 × `poison` | Veneno y Sangrado aplican +1 carga; +15 % daño de estados |
| `frostbite` *Congelación* | Combo | 2 × `ice` | golpear a un escarchado puede aturdirlo 0,8 s (no jefes; 1 por segundo) |
| `hemophilia` *Hemofilia* | Combo | 2 × `bleed` | los críticos encadenan sangre a 2 enemigos |
| `wax_carapace` *Coraza de Cera* | Combo | 2 × `wax` | al recibir un golpe estallas en cera (no te hiere); 50 % de +1 cera al despertar una sala |
| `funeral_procession` *Cortejo Fúnebre* | Combo | 2 × `undead` | Ánimas +50 % de duración y +2 de tope |
| `cilice` *Cilicio* | Combo | 2 × `sacrifice` | cada autolesión: +0,15 de daño permanente |
| `lucid_dance` *Danza Lúcida* | Combo | 2 × `dodge` | cada esquiva concede 1 crítico garantizado (tope común: 9) |
| `shared_flame` *Lumbre compartida* | Combo (v0.2) | 2 × `light` | cada vela que enciendes estalla en una llamarada (150 % de tu daño) |
| `visiting_hours` *Horario de visitas* | Transformación (v0.2) | 3 × `visit` | +1 llama máxima; recuperas 1 de llama al despertar cada sala |

Cadenas emergentes nuevas que el diseño busca (sin prueba dedicada todavía): *Corazón de pira* + *Brasa viva* (muerte ardiendo → explosión + anillo de brasas → más muertes ardiendo, acotado por la profundidad 4); *Velo de plañidera* + *Recordatorio de difuntos* (el veneno se contagia y cada muerte envenenada puede alzar un Ánima); *Cordón del flagelante* + *Herida que canta* + *Cilicio* (la autolesión dispara el anillo y suma daño permanente); *Lágrima helada* + *Bolsa de hielo* (rayos helados encadenados desde enemigos escarchados).

## Protecciones (verificadas)
| Riesgo | Protección | Prueba |
|---|---|---|
| Bucle infinito (efecto que se dispara a sí mismo) | Profundidad máxima 4 | `test_recursion_guard_terminates` (efecto patológico "explosión → explosión") |
| Avalancha de eventos en un frame | Presupuesto de 400 eventos/frame; el resto se difiere | `test_event_budget_defers_overflow` |
| Cascadas por probabilidad | `proc_coef` decreciente en fragmentos/explosiones; los ticks de estados no emiten `hit` | implícito en E1–E5 |
| Pactos letales | Filtro `player_hp_min` | `test_pact_respects_min_hp` |

## Cómo diseñar una sinergia nueva sin programar
1. Elige un **disparador** que exista (`EffectVocab.TRIGGERS`) y filtra por **etiquetas** (`tags_any`/`tags_all`/`tags_none`), estado del objetivo, generación, crítico, vida del jugador…
2. Encadena **acciones** del vocabulario (`EffectVocab.ACTIONS`). Si emiten daño, pon etiquetas significativas: son las que otros recuerdos escucharán.
3. Si necesitas que un objeto altere a otro, usa `mechanics` (p. ej. `explosion_radius_mult`, `split_count_add`).
4. Arranca el juego: `ContentDB` valida todo y rechaza nombres desconocidos.

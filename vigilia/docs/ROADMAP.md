# Hoja de ruta

## Fase 1 — Núcleo jugable ✅ (completada y verificada)
| Requisito | Estado | Evidencia |
|---|---|---|
| Personaje controlable, movimiento fluido, disparos, colisiones | ✅ | partidas con bot, capturas |
| Sistema de daño y vida | ✅ | `test_combat` |
| 6 enemigos distintos | ✅ 6 + guardián | 6 IA distintas, campeones con comportamiento |
| 1 jefe con varias fases | ✅ | 3 fases, 8 patrones, `test_boss_phases_and_arena_transform` |
| Generación de habitaciones y transiciones | ✅ | 600 pisos validados; fundidos y persistencia de estado |
| 20 objetos funcionales | ✅ 23 (20 pasivos + 3 activos) | `test_content`, `test_synergy` |
| 5 sinergias comprobables | ✅ 9 con prueba (7 emergentes + 2 de conjunto) | `docs/SYNERGIES.md` |
| Menú, HUD, pantalla de muerte, reinicio | ✅ | capturas |
| Guardado de configuración | ✅ | `test_save` |

**Adelantado de fases posteriores**: tienda, sala secreta, llaves/bombas, estados + reacción elemental, Tolerancia del Sueño, campeones, historial y perfil versionado, inventario con mapa, accesibilidad completa, piloto automático, estrés y perfilador.

## Fase 2 — Arquitectura de contenido (siguiente)
Criterio de salida: añadir 10 objetos, 3 enemigos y 15 salas **solo con datos** y sin regresiones en la suite.
1. Guardado seguro entre pisos (instantánea de `RunState` + inventario) y continuar partida.
2. Grabación de entradas por frame → repeticiones deterministas (la simulación ya lo permite).
3. Estados: mojado + electricidad (propagación), miedo, confusión, maleficio, corrupción, luz/oscuridad; 4–6 reacciones nuevas.
4. Armas alternativas como "perfiles de ataque": cuerpo a cuerpo, carga, láser, orbitales.
5. Salas especiales: sacrificio, altar, apuesta, desafío, maldición, mercader oculto.
6. Sistema de desbloqueos con condiciones (`unlocks.json`) y registro.
7. Localización (claves + CSV).

## Fase 3 — Vertical slice
3 personajes, 3 biomas, 60 objetos, 20 enemigos, 4 jefes, 30+ sinergias, progresión persistente, ruta completa con final. **Prueba de juego con humanos obligatoria** antes de seguir escalando.

## Fase 4 — Expansión sistémica
Medidor de **Vigilia** (despertar del Durmiente) que altera pisos, rutas alternativas, finales múltiples, transformaciones adicionales, secretos encadenados, salas que evolucionan.

## Fase 5 — Expansión de contenido
Escalar hacia los objetivos (16 personajes, 10 biomas, 500 pasivos, 120 enemigos, 30 jefes, 300 salas) con herramientas: editor de salas, editor de objetos, simulador de builds (el piloto automático es la base).

## Fase 6 — Pulido y balance
Telemetría de partidas, análisis de builds dominantes, rendimiento en GPU real, arte definitivo, audio, accesibilidad ampliada.

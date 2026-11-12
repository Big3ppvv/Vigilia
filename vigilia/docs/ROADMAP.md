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

## Fase 1.5 — Que el juego cumpla su promesa (en curso)

### Diagnóstico
La Fase 1 verificó con rigor lo que es fácil de medir (corrección, determinismo, rendimiento) y nada de lo que decide si el juego es bueno: **ninguna partida la ha jugado una persona**. Y el pilar central —construir una build con sinergias— casi no aparece en una partida real:

| Medida (simulación de 20 000 partidas con el modelo de botín real, 2 pisos) | Fase 1 | Fase 1.5 |
|---|---|---|
| Objetos por partida | 3,45 | 6,6 |
| Óbolos por sala (precio de un objeto: 8–25 → 6–20) | 0,50 | 1,17 |
| Partidas con alguna sinergia antes del jefe final (jugador que elige al azar) | 15 % | 60 % |
| Ídem, jugador que elige pensando en su build | 19 % | 84 % |
| Ídem al terminar el piso 1 (jugador que construye) | 10 % | 48 % |

El modelo (sala secreta encontrada el 50 % de las veces, llave para el tesoro del piso 2 el 85 %, ~6,5 bajas con botín por sala) es una aproximación: sirve para comparar antes y después, no sustituye a partidas reales.

Con la economía de la Fase 1 la tienda era decorativa (≈10 óbolos por partida) y en 4 de cada 5 partidas la fantasía del juego no se manifestaba nunca. Además, el cartel de activación de una sinergia quedaba tapado **en el mismo frame** por el del objeto recogido: el momento clave del juego no se veía.

### Hecho (verificado estáticamente, pendiente de verificar en el motor)
1. **Economía y elecciones**: el tesoro ofrece *elegir 1 de 2* (el pedestal avisa: «las demás se desvanecen»); piso 1 con 2 tesoros (generador portado a Python: 0 respaldos en 20 000 semillas); toda sala secreta tiene objeto; más óbolos y precios más bajos.
2. **Contenido solo con datos**: 19 objetos nuevos (23 → 42, primer legendario) organizados en familias de etiquetas, y 11 sinergias de conjunto nuevas (4 → 15). Valida el criterio de la Fase 2 («añadir contenido solo con datos»).
3. **Legibilidad de la build**: el pedestal muestra qué sinergias haría avanzar el objeto («Pira 2/3, ¡completa Miasma!»); aviso de progreso al recogerlo; sección «En progreso» en el inventario; cola de carteles (el de la sinergia ya no se pisa) y efecto visual al activarla.
4. **Sensación de juego**: estallido visible al abatir enemigos, micro-pausa en bajas de campeón/jefe y en la Lucidez, fogonazo y retroceso visual del disparo, chispa en los críticos, pulso de sala despejada.
5. **Correcciones del motor**: los estados que transporta un proyectil ignoraban «daño/duración de estados» y las cargas extra; la Lucidez *reducía* los críticos acumulados si superaban 6.

### Criterio de salida
1. Suite completa en verde (63 pruebas), 6 partidas de humo y estrés re-medido con el código nuevo; capturas nuevas.
2. **Prueba de juego con 3–5 personas** (no el bot): ¿se forma una build?, ¿se entiende la elección?, ¿dónde mueren? Ajustar precios, botín y vida de jefes con esos datos.
3. **Identidad visual**: oscuridad real y luz de vela dinámica (el juego se llama *Vigilia* y hoy la sala está iluminada de forma plana). No se implementa a ciegas: requiere poder ver el resultado.

> Recomendación: no empezar la Fase 2 (repeticiones, localización, guardado a mitad de partida) hasta cumplir este criterio. Es infraestructura para un núcleo cuya diversión aún no se ha medido con personas.

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

# Informe de pruebas — revisión 0.1.1, Fase 1.5

Verificación del 11 de noviembre de 2026 (America/Buenos_Aires). Godot **4.6.3.stable.official**, Linux x86_64. Capturas con OpenGL Compatibility, Mesa llvmpipe y Xorg con pantalla virtual. Los datos del jugador se aislaron mediante `XDG_DATA_HOME`, `XDG_CONFIG_HOME` y `XDG_CACHE_HOME`.

El [informe de la Fase 1](TEST_REPORT_PHASE1.md) se conserva como histórico; sus cifras de rendimiento y exportación no describen esta revisión.

## Pruebas automáticas: 73/73

`tools/run_tests.sh` termina con código 0. [Informe JSON completo](verification/unit_report.json).

| Suite | Pruebas | Cobertura |
|---|---|---|
| rng | 8 | Semillas, flujos independientes, rangos y distribución |
| stats | 8 | Orden de modificadores, límites, temporales y valores inválidos |
| dungeon | 9 | 600 pisos, determinismo, conectividad, secretos y tesoros |
| content | 4 | Contenido sin errores ni avisos, vocabulario y compilación de scripts |
| save | 12 | Configuración, migraciones, validación anidada, fecha de creación y recuperación que conserva la copia válida |
| synergy | 14 | Reacciones, transformaciones, recursión, etiquetas de activos y previsión de reemplazos |
| combat | 15 | Daño, jefes, botín, secretos y carga del activo conservada al reconstruir pedestales |
| lighting | 3 | Límite de luces, cambio de sala, accesibilidad, seguimiento y RNG intacto |

El caso de configuración deliberadamente corrupta emite `ERROR: ConfigFile parse error`: es parte de la prueba de recuperación. No hay `SCRIPT ERROR:`. El wrapper rechaza errores de GDScript incluso si el motor devuelve 0. Se comprobó con un script inválido en ejecución; también se comprobó la importación fallida y que un filtro sin pruebas devuelve 2.

## Seis partidas con el piloto automático

`tools/run_smoke.sh SEMILLA`, sin invulnerabilidad. Todas llegan al segundo piso y terminan sin timeout ni errores de script: cuatro victorias y dos muertes durante el combate final. [Informes JSON](verification/smoke_report.json).

| Semilla | Resultado | Piso | Tiempo simulado | Bajas | Reliquias distintas recogidas |
|---|---|---|---|---|---|
| FINAL001 | Victoria | 2 | 260.2 s | 111 | 4 |
| FINAL002 | Muerte ante Madre Cirio | 2 | 308.0 s | 107 | 2 |
| FINAL003 | Victoria | 2 | 276.3 s | 119 | 7 |
| FINAL004 | Victoria | 2 | 284.2 s | 136 | 5 |
| FINAL005 | Muerte ante Madre Cirio | 2 | 417.4 s | 138 | 2 |
| FINAL006 | Victoria | 2 | 332.2 s | 152 | 8 |

El piloto no sustituye a pruebas con personas. Estos resultados verifican transiciones, jefes y finalización; no demuestran que el balance sea adecuado para jugadores humanos. La CI usa además una semilla fija con `--god` y exige victoria.

## Estrés

`tools/run_stress.sh`, 1200 frames por escenario. Tiempo de pared del frame completo, usando las muestras `frame_ms_*` del [informe JSON](verification/stress_report.json).

| Escenario | Media | p50 | p95 | Máximo |
|---|---|---|---|---|
| Horda (47 enemigos) | 4.60 ms | 4.46 ms | 6.05 ms | 34.76 ms |
| Lluvia (2047 proyectiles) | 7.85 ms | 7.71 ms | 8.73 ms | 31.24 ms |

Cero proyectiles descartados. La horda produjo 775 explosiones y 295 bajas. Los picos de arranque siguen superando el presupuesto de 16,67 ms; estas cifras no garantizan 60 FPS. Los campos `physics_ms_*` del monitor de Godot no se usan para estas conclusiones porque `--fixed-fps` los distorsiona. El estrés es headless: no mide el coste de GPU de la iluminación.

## Capturas y luz de vela

Se regeneraron las 14 [capturas del recorrido](screenshots/) con render real: menú, selección, sala inicial, combate, inventario, pausa, ajustes, tienda, tres fases del jefe y muerte. Se inspeccionaron la sala inicial y los láseres del jefe para comprobar ambiente, jugador, HUD y peligros legibles.

La iluminación usa una textura compartida y hasta ocho luces por objeto. La intensidad se ajusta en Vídeo, el alto contraste suaviza la penumbra y desactivar destellos detiene la oscilación de las luces. Los proyectiles, efectos y zonas de peligro son emisivos. No hay sombras de oclusión.

## GitHub Actions y límites pendientes

El workflow `verify.yml` instala Godot 4.6.3 con SHA512 verificado, importa el proyecto, ejecuta la suite, comprueba el filtro sin coincidencias, exige victoria del bot invulnerable y ejecuta estrés. Publica logs y JSON como artifacts durante 14 días.

No se generaron ejecutables de lanzamiento nuevos. Quedan pendientes las pruebas con 3–5 personas, una GPU física, Windows real y otras versiones del motor.

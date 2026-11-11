# Informe de pruebas — Fase 1

Entorno: Godot **4.7.2.stable.official** (binario oficial, SHA-512 verificado) · Linux x86_64 · Intel Xeon 2,1 GHz (4 núcleos) · render por software (Mesa llvmpipe) bajo Xvfb para capturas.
Todas las cifras de este documento proceden de ejecuciones reales; nada está estimado.

## 1. Pruebas automáticas — 63/63 ✅
`tools/run_tests.sh` (código de salida 0).

| Suite | Pruebas | Qué cubre |
|---|---|---|
| `test_rng` | 8 | hash FNV-1a contra valores de referencia externos, determinismo, independencia de flujos, rangos, distribución ponderada, barajado |
| `test_stats` | 8 | orden de operaciones, acotado y enteros, NaN/INF, temporales, condicionales/escalables, retirada por fuente |
| `test_dungeon` | 9 | **600 pisos** (300 semillas × 2): validez estructural, determinismo, variedad (≥97 % distintos), jefe lejano y hoja, secreta solo por puertas ocultas, tesoro extra por objeto, cerraduras |
| `test_content` | 4 | 0 errores/avisos de contenido, objetivos de la fase, vocabulario implementado, **todos los scripts compilan** |
| `test_save` | 8 | ajustes ida y vuelta, validación, archivo corrupto, remapeo con intercambio, perfil + `.bak`, recuperación, pérdida total, migración v1→v2 |
| `test_synergy` | 12 | 7 sinergias emergentes y 2 de conjunto sobre la escena real; protección de recursión; presupuesto de eventos |
| `test_combat` | 14 | mitigación, críticos deterministas, Tolerancia del Sueño, armadura direccional, reglas de daño del jugador, Lucidez, **fases y transformación de arena del jefe**, reacción al inventario, botín determinista, **salas secretas por explosión**, consumibles fuera de obstáculos, intercambio de activos |

## 2. Partidas completas con piloto automático (escena real)
`tools/run_smoke.sh SEMILLA` · el bot apunta perfecto y esquiva proyectiles a <110 px, pero no usa bombas, no busca secretos y a veces "corre" al jefe sin explorar.

Batería final (código definitivo):

| Semilla | Modo | Resultado | Piso | Tiempo de juego | Bajas | Salas | Objetos | Daño recibido |
|---|---|---|---|---|---|---|---|---|
| FINAL001 | normal | **Victoria** | 2 | 305 s | 121 | 16 | 3 | 7 |
| FINAL002 | normal | Muerte (Campanero Mayor) | 1 | 146 s | 46 | 3 | 0 | 7 |
| FINAL003 | normal | Muerte (Campanero Mayor) | 1 | 107 s | 46 | 7 | 1 | 7 |
| FINAL004 | normal | **Victoria** | 2 | 299 s | 144 | 17 | 3 | 3 |
| FINAL005 | normal | **Victoria** | 2 | 354 s | 132 | 15 | 2 | 10 |
| FINAL006 | normal | **Victoria** | 2 | 426 s | 146 | 18 | 3 | 9 |
| FINALGOD | invulnerable | **Victoria** | 2 | 584 s | 197 | 11 | 2 | 0 |

- **0 errores de script y 0 fugas de objetos** en las 7 partidas.
- Duelo aislado contra Madre Cirio (`--boss-only`, 3 objetos): 4/4 victorias en 53–64 s recibiendo **5–7 de 8** de daño (combate exigente incluso con puntería perfecta).
- Determinismo de simulación: la semilla `HONEST01` produjo resultados **idénticos** (frames, daño, bajas) en 3 ejecuciones con paso fijo.

## 3. Estrés (`tools/run_stress.sh`) — tiempo real de pared por frame completo
| Escenario | Media | p95 | Máx. |
|---|---|---|---|
| Horda: 40–48 enemigos activos + build explosiva completa (776 explosiones, 304 bajas, 36 ánimas en 20 s) | 5,16 ms | 7,90 ms | 35,9 ms |
| Lluvia: ~2000 proyectiles enemigos simultáneos | 9,01 ms | 11,67 ms | 31,0 ms |

Presupuesto a 60 FPS: 16,6 ms. Sin coste de GPU (no medible en este entorno). Optimización aplicada durante la fase gracias a esta prueba: dibujo de proyectiles 7,2 → 3,0 ms (texturas horneadas) y simulación −16 % (objetivos cacheados por frame).

## 4. Exportación (plantillas oficiales 4.7.2, SHA-512 verificado)
- Ejecutables de un solo archivo (datos embebidos): `VIGILIA.exe` (Windows x86_64, 110 MB) y `VIGILIA.x86_64` (Linux, 74 MB). Incluyen `data/*.json` (no son recursos importados: requieren `include_filter`) y excluyen `tests/`, `tools/`, `docs/`.
- **Linux verificado de punta a punta**: el binario exportado, en modo demostración con la semilla FINAL004, jugó la partida completa y obtuvo **exactamente** el mismo resultado que en el editor (victoria, piso 2, 299 s, 144 bajas) → determinismo confirmado también entre editor y build de lanzamiento.
- **Windows: exportado, no verificado en ejecución.** Bajo Wine 9.0 (único medio disponible aquí) el `.exe` aborta al arrancar con un fallo de página dentro de las DLL de Wine; la **plantilla oficial de Godot 4.7.2 sin el juego** falla exactamente igual (misma dirección) incluso con `--version`, así que es una incompatibilidad del entorno, no del proyecto. El `.exe` se genera con la misma canalización oficial que el binario Linux verificado, pero falta probarlo en un Windows real.

## 5. Capturas reales (`tools/screenshots.sh`)
14 capturas en `docs/screenshots/`: menú, selección, sala inicial, combate con sinergias, cadena de veneno con ánimas, inventario, pausa (y al 130 % de escala), ajustes, tienda, jefe en sus 3 fases (incluidos láseres y arena transformada), pantalla de muerte.

## 6. Defectos encontrados por la verificación (y corregidos)
| # | Defecto | Cómo se detectó | Corrección |
|---|---|---|---|
| 1 | Inferencias `:=` desde `Variant` (error en 4.7) | compilación | tipado explícito |
| 2 | Las pruebas escribían en el archivo de ajustes **real** del jugador | prueba que fallaba solo en la 2.ª ejecución | ruta de persistencia inyectable |
| 3 | Borrado de proyectiles durante la iteración (índice fuera de rango) | partida con bot | borrado diferido |
| 4 | Tirón de 114 ms al sintetizar música | métrica de la partida | síntesis en hilos de trabajo |
| 5 | Reproducciones de audio retenidas al salir | `--verbose` | cierre ordenado + petición de cierre de ventana |
| 6 | Menús sin centrar y fondo del menú invisible | capturas | `set_anchors_and_offsets_preset` |
| 7 | Llamas invisibles (z-index relativo) | capturas | z relativo correcto |
| 8 | **Muertes por veneno nunca activaban efectos "al matar"** | prueba de la cadena E2 | regla: `kill` sin atenuación |
| 9 | Láseres del jefe atravesaban muros (dibujo y daño) | capturas | recorte contra el interior |
| 10 | Bot atascado 25 min (caché de rutas entre salas) | partida con traza | clave de caché por sala |
| 11 | Coste de dibujo/simulación en lluvias densas | estrés + perfilador | texturas horneadas, caché |
| 12 | Consumibles podían quedar dentro de rocas/pilares | revisión + prueba | recolocación en suelo transitable |
| 13 | Menús superpuestos ignoraban la escala de interfaz | revisión + captura | raíz escalable |
| 14 | Consumibles de tienda repetidos | captura | reparto sin reemplazo |
| 15 | Intercambios de activo duplicaban el historial de la partida (y el bot entraba en bucle de intercambio) | partida con traza | historial sin duplicados + regla del bot |

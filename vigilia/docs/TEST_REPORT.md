# Informe de pruebas — v0.2.0 «Una noche»

Verificación del 12 de noviembre de 2026. Godot **4.6.3.stable.official**, Linux x86_64. Capturas con OpenGL Compatibility (Mesa llvmpipe) en una pantalla virtual (Xvfb). Datos del jugador aislados con `XDG_DATA_HOME`, `XDG_CONFIG_HOME` y `XDG_CACHE_HOME`.

Los informes anteriores ([Fase 1](TEST_REPORT_PHASE1.md)) se conservan como histórico: sus cifras corresponden a otra versión y a otra máquina.

## Pruebas automáticas: 86/86

`tools/run_tests.sh` termina con código 0 en ~7 s. [Informe JSON](verification/unit_report.json).

| Suite | Pruebas | Novedades de esta versión |
|---|---|---|
| audio | 2 | La partitura de la nana es coherente (16 compases completos, un acorde por compás); la pista dura exactamente 16 compases, hace bucle y suena |
| combat | 22 | Encender todas las velas despierta la sala y disipa las sombras sin contar bajas; abatirlas enciende las velas solas; la luz debilita; las polillas apagan velas; la Cabecera cobra llama máxima y nunca deja menos de 2; las brasas abren muros agrietados; las ovejas se numeran y su sopor frena |
| content | 4 | Contenido sin errores ni avisos con los recuerdos, sinergias, sombras y textos nuevos |
| dungeon | 10 | 2-3 velas por sala de combate, en suelo libre, sin pisar apariciones y repartidas; sin puertas cerradas |
| lighting | 6 | Salas dormidas en penumbra que despiertan; la luz del jugador encoge con la llama y con el sopor; límite de 8 luces en el peor caso; accesibilidad; RNG intacto |
| rng, save, stats, synergy | 42 | Sin cambios de comportamiento |

## Partidas con el piloto automático

`tools/run_smoke.sh SEMILLA`, sin invulnerabilidad, mismas seis semillas de referencia que la versión anterior. [Informes JSON](verification/smoke_report.json).

| Semilla | Resultado | Piso | Tiempo | Bajas | Disipadas | Velas encendidas | Salas despertadas con luz |
|---|---|---|---|---|---|---|---|
| FINAL001 | Despierta | 2 | 282.9 s | 120 | 4 | 22 | 2 / 18 |
| FINAL002 | Despierta | 2 | 285.9 s | 92 | 21 | 24 | 7 / 14 |
| FINAL003 | Despierta | 2 | 279.5 s | 83 | 15 | 23 | 5 / 14 |
| FINAL004 | Despierta | 2 | 298.1 s | 97 | 18 | 27 | 8 / 14 |
| FINAL005 | Se duerme ante el Campanero | 1 | 88.6 s | 43 | 0 | 5 | 0 / 2 |
| FINAL006 | Despierta | 2 | 395.8 s | 143 | 21 | 38 | 5 / 21 |

Además: la CI juega `CI-SMOKE` con invulnerabilidad y exige despertar (lo cumple).

### Equilibrio de la mecánica central (comparación de estrategias del bot)

| Estrategia del bot, 6 semillas | Gana |
|---|---|
| Versión anterior (0.1, solo combate) | 4/6 |
| 0.2, solo combate (`--no-kindle`) | 3/6 |
| 0.2, primera versión de las velas (encender sin mirar) | 1/6 |
| 0.2, velas ajustadas, encender cuando no tiene una sombra encima | **5/6** |

La primera versión de las velas era una trampa: encender exponía demasiado. Se corrigió con tres cambios (encender en 0,85 s, la luz deshace los disparos junto a la llama y despertar con luz siempre deja recompensa). **Advertencia:** el bot apunta perfecto y la penumbra no le afecta; estas cifras comparan estrategias entre sí, no miden la dificultad para una persona.

## Estrés

`tools/run_stress.sh`, 1200 frames por escenario, tiempo de pared del frame completo. [Informe JSON](verification/stress_report.json). Para comparar con rigor se ejecutó también la versión anterior **en esta misma máquina**:

| Escenario | v0.1 (misma máquina, 2 ejecuciones) | v0.2 |
|---|---|---|
| Horda (48 sombras, 781 explosiones) | media 6.0–6.2 ms | media 6.5 ms, p95 9.1 ms |
| Lluvia (2047 proyectiles) | media 10.2–10.4 ms | media 10.5 ms, p95 14.2 ms |

Sin proyectiles descartados. Sin regresión relevante: el coste nuevo (capa luminosa de ojos por sombra, consultas de luz de velas) cabe en el margen de ruido. Los picos de arranque siguen por encima de 16,67 ms. El estrés es headless: no mide el coste de GPU de la iluminación ni del velo del sueño.

## Música (verificación objetiva)

No se puede escuchar desde el entorno de pruebas, así que se renderizaron las pistas a WAV y se analizaron:
- Sin recorte en ninguna pista; picos entre 0,40 y 0,90.
- Empalme del bucle sin clic: el salto entre la última y la primera muestra es menor que el percentil 99 de los saltos entre muestras consecutivas.
- La melodía suena con las alturas de la partitura (FFT al inicio de cada nota: La5, Fa5, Sol5, Fa5, Mi5, Fa5, Re5, Mi5… Do#5, Re5; error ≤ 7 cents).
- Coste de síntesis en hilos de trabajo: 0,2–3,9 s por pista; en modo headless no se sintetiza.

## Capturas

Las 19 [capturas del recorrido](screenshots/) se generaron con render real (`tools/screenshots.sh`) y se revisaron a ojo: la habitación, la voz de fuera, sala dormida, encender una vela, la sala despierta, la carta de un recuerdo, la Cabecera, inventario, pausa, ovejas de la cuenta, el Arrullo con poca llama, Madre Cirio (fases 1 y 3), la cuenta atrás, la hoja de la noche, el despertar y la hoja del despertar.

## Lo que no se ha verificado
- **Nadie ha jugado esta versión.** Es la prueba que falta y la única que importa ahora (ver [`ROADMAP.md`](ROADMAP.md)).
- La legibilidad de la penumbra con personas y en pantallas reales.
- El coste de GPU real del velo del sueño y de la iluminación.
- Que la música suene bien a oídos humanos (solo se verificó que es correcta).
- Windows real y otras versiones del motor.

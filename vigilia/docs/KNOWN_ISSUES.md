# Problemas conocidos y limitaciones (Fase 1)

Ordenados por impacto. Lo que no se ha podido verificar se indica como tal.

## Sin verificar
- **Balance con jugadores humanos.** Todo el balance se ha calibrado con un bot de puntería perfecta (gana ~2/3 de las partidas). Un humano apunta peor pero explora más. Requiere pruebas de juego reales.
- **Rendimiento en GPU real.** Solo se midió CPU (headless) y render por software. Los 60 FPS en hardware medio son el objetivo, no una medición.
- **Ejecutable de Windows**: exportado con las plantillas oficiales pero sin ejecutar en un Windows real (Wine 9.0 no puede ejecutar ni siquiera la plantilla oficial de Godot 4.7.2). Sin firma digital: SmartScreen puede avisar. El ejecutable Linux sí está verificado con una partida completa.
- **Versiones de Godot anteriores a 4.7.2.** El código evita APIs recientes (no usa diccionarios tipados ni anotaciones 4.4+), pero no se ha probado en 4.3–4.6.
- **Determinismo entre plataformas/versiones.** Verificado en la misma máquina y build; no entre sistemas (coma flotante).

## Alcance de la fase (no son defectos, pero conviene tenerlos presentes)
- 1 personaje, 1 bioma, 2 pisos, 23 objetos, 6 enemigos + guardián + jefe, 27 plantillas de sala (objetivo final: 16 / 10 / ~12 / 500+ / 120 / 30 / 300).
- Arte procedural provisional (sin sprites ni animación por fotogramas); audio sintetizado sencillo.
- Solo español (sin sistema de traducción).
- Sin guardado a mitad de partida ni repeticiones (la simulación ya es determinista con entradas idénticas, falta grabarlas).
- Mando con asignaciones fijas (solo teclado/ratón es remapeable).
- Estados pendientes del diseño: electricidad/mojado, miedo, confusión, maleficio, corrupción, luz/oscuridad.

## Defectos menores conocidos
- Pico de hasta ~36 ms en el primer segundo de la prueba de estrés (creación masiva de enemigos coincidiendo con la síntesis de música en segundo plano).
- El *hitstop* usa `Engine.time_scale` global (desactivable en Accesibilidad); afecta también a temporizadores cosméticos durante 50 ms.
- El HUD muestra solo las últimas 12 reliquias (el inventario completo está en Tab).
- El monitor `Performance.TIME_PHYSICS_PROCESS` da valores no fiables con `--fixed-fps` en headless; las pruebas usan tiempo de pared.
- Al añadir un `class_name` nuevo hay que reimportar (`godot --headless --path . --import`) antes de ejecutar desde consola.
- El bot de pruebas no usa bombas ni busca secretos (herramienta de verificación, no IA de compañero).

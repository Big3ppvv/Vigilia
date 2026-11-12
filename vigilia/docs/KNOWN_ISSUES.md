# Problemas conocidos y limitaciones (Fase 1)

Ordenados por impacto. Lo que no se ha podido verificar se indica como tal.

## Fase 1.5: cambios aún sin ejecutar en el motor
Los cambios de la Fase 1.5 (ver `ROADMAP.md`) se escribieron en un entorno donde no se pudo ejecutar Godot. Se verificaron **estáticamente**:
- Sintaxis de los 81 scripts con un analizador de GDScript (`gdparse` de gdtoolkit 4.5, calibrado: acepta todo el código previo y rechaza errores inyectados).
- Contenido con una réplica de las reglas de `ContentDB` (0 errores, 0 avisos), más comprobaciones que el juego no hace: glifos y colores válidos, y qué sinergias se activarían con las combinaciones de objetos de cada prueba.
- Generador: port estructural a Python; con los parámetros de la Fase 1 reproduce lo documentado (0 respaldos, 1 intento) y con los nuevos da 0 respaldos en 20 000 semillas.

**Pendiente de verificar**: la suite de 63 pruebas (incluida la compilación con tipos estrictos), partidas de humo, estrés (su build activa ahora *Miasma*, así que sus cifras cambiarán) y capturas. `TEST_REPORT.md` describe el estado de la Fase 1, no el actual.

Efectos secundarios conocidos de la Fase 1.5:
- **Las semillas ya no reproducen las partidas anteriores**: hay 42 objetos en los pools y el piso 1 tiene otro tesoro, así que cambian el mapa del piso 1 y los objetos de ambos pisos (el mapa del piso 2 conserva su estructura). Las semillas guardadas en el historial no son comparables con las nuevas.
- **El balance se ha movido a favor del jugador** (≈6,6 objetos por partida frente a 3,45, ~24 % más curación por sala). La Tolerancia del Sueño compensa en parte (castiga las builds monotemáticas en el piso 2), pero hace falta probar con personas antes de ajustar la vida de los jefes.

## Sin verificar
- **Balance con jugadores humanos.** Todo el balance se ha calibrado con un bot de puntería perfecta (gana ~2/3 de las partidas). Un humano apunta peor pero explora más. Requiere pruebas de juego reales.
- **Rendimiento en GPU real.** Solo se midió CPU (headless) y render por software. Los 60 FPS en hardware medio son el objetivo, no una medición.
- **Ejecutable de Windows**: exportado con las plantillas oficiales pero sin ejecutar en un Windows real (Wine 9.0 no puede ejecutar ni siquiera la plantilla oficial de Godot 4.7.2). Sin firma digital: SmartScreen puede avisar. El ejecutable Linux sí está verificado con una partida completa.
- **Versiones de Godot anteriores a 4.7.2.** El código evita APIs recientes (no usa diccionarios tipados ni anotaciones 4.4+), pero no se ha probado en 4.3–4.6.
- **Determinismo entre plataformas/versiones.** Verificado en la misma máquina y build; no entre sistemas (coma flotante).

## Alcance de la fase (no son defectos, pero conviene tenerlos presentes)
- 1 personaje, 1 bioma, 2 pisos, 42 objetos (23 en la Fase 1), 6 enemigos + guardián + jefe, 27 plantillas de sala (objetivo final: 16 / 10 / ~12 / 500+ / 120 / 30 / 300).
- Iluminación plana: no hay oscuridad ni luz dinámica, pese a que la vela es el motivo central del juego. Es la mejora visual de mayor impacto pendiente.
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

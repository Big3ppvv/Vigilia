# Problemas conocidos y limitaciones (Fase 1.5)

Ordenados por impacto. Lo que no se ha podido verificar se indica como tal.

## Fase 1.5: verificación actual
La revisión actual se ejecutó con Godot 4.6.3: **73 pruebas pasan**, seis partidas de humo llegan al segundo piso, el estrés no descarta proyectiles y se regeneraron las 14 capturas con OpenGL por software. La CI repite las comprobaciones en GitHub. Ver resultados y límites de la medición en `TEST_REPORT.md`.

Efectos secundarios conocidos de la Fase 1.5:
- **Las semillas ya no reproducen las partidas anteriores**: hay 42 objetos en los pools y el piso 1 tiene otro tesoro, así que cambian el mapa del piso 1 y los objetos de ambos pisos (el mapa del piso 2 conserva su estructura). Las semillas guardadas en el historial no son comparables con las nuevas.
- **El balance se ha movido a favor del jugador** (≈6,6 objetos por partida frente a 3,45, ~24 % más curación por sala). La Tolerancia del Sueño compensa en parte (castiga las builds monotemáticas en el piso 2), pero hace falta probar con personas antes de ajustar la vida de los jefes.

## Sin verificar
- **Balance con jugadores humanos.** Todo el balance se ha calibrado con un bot de puntería perfecta (gana ~2/3 de las partidas). Un humano apunta peor pero explora más. Requiere pruebas de juego reales.
- **Rendimiento en GPU real.** Solo se midió CPU (headless) y render por software. Los 60 FPS en hardware medio son el objetivo, no una medición.
- **Ejecutable de Windows**: exportado con las plantillas oficiales pero sin ejecutar en un Windows real (Wine 9.0 no puede ejecutar ni siquiera la plantilla oficial de Godot 4.7.2). Sin firma digital: SmartScreen puede avisar. El ejecutable Linux sí está verificado con una partida completa.
- **Otras versiones de Godot.** Esta revisión usa 4.6.3; las cifras anteriores de 4.7.2 corresponden al informe histórico. No se verificaron las demás versiones.
- **Determinismo entre plataformas/versiones.** Verificado en la misma máquina y build; no entre sistemas (coma flotante).

## Alcance de la fase (no son defectos, pero conviene tenerlos presentes)
- 1 personaje, 1 bioma, 2 pisos, 42 objetos (23 en la Fase 1), 6 enemigos + guardián + jefe, 27 plantillas de sala (objetivo final: 16 / 10 / ~12 / 500+ / 120 / 30 / 300).
- La luz de vela es dinámica, sin sombras de oclusión. Hay hasta ocho luces por sala (incluida la del jugador); las velas de los pilares comparten un presupuesto limitado. Intensidad regulable en Ajustes → Vídeo.
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

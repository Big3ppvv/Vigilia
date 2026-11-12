# Problemas conocidos y limitaciones (v0.2 «Una noche»)

Ordenados por impacto. Lo que no se ha podido verificar se indica como tal.

## Sin verificar (lo más importante)
- **Ninguna persona ha jugado esta versión.** La reestructuración es una apuesta de diseño argumentada (ver `DESIGN.md`), no un resultado. El siguiente paso obligatorio es la prueba con personas de `ROADMAP.md`.
- **Equilibrio medido solo con el bot.** El bot apunta perfecto y la penumbra no le afecta: gana 5/6 noches encendiendo velas con criterio. Una persona lo tendrá más difícil; no se sabe cuánto.
- **Legibilidad de la penumbra** en pantallas reales y para personas con baja visión. Mitigación disponible: Ajustes → Vídeo → «Penumbra y somnolencia» (0 la desactiva) y alto contraste.
- **La música**: se verificó que es correcta (alturas, bucle sin clics, sin recortes), no que suene bien a un oído humano.
- **Rendimiento en GPU real**: el velo del sueño lee la pantalla y la iluminación usa hasta 8 luces; solo se midió CPU (headless) y render por software.
- **Windows real y otras versiones de Godot**: no probados en esta versión.

## Efectos secundarios de la reestructuración
- **Las semillas de la v0.1 no reproducen las noches de la v0.2**: el generador pasó a la versión 2 (cabecera, velas, sin cerraduras). El historial antiguo se conserva pero sus semillas no son comparables.
- **Los perfiles antiguos se leen sin problema**; las noches se cuentan a partir de las partidas ya registradas.
- **Ajustes guardados**: la acción «bomba» desaparece; si existía en `settings.cfg`, se ignora. La intensidad de la penumbra guardada se respeta (el valor por defecto nuevo, 0,9, solo afecta a perfiles nuevos).

## Alcance (no son defectos)
- 1 personaje, 2 pisos, 43 recuerdos, 7 sombras + 2 jefes, 27 plantillas de sala.
- Arte procedural (sin sprites ni animación por fotogramas); voces solo en texto.
- Solo español.
- Sin guardado a mitad de noche ni repeticiones.
- Mando con asignaciones fijas (solo teclado/ratón es remapeable).

## Defectos menores conocidos
- Pico de hasta ~47 ms en el primer segundo de la prueba de estrés (creación masiva de sombras).
- El *hitstop* usa `Engine.time_scale` global (desactivable en Accesibilidad).
- El HUD muestra solo los últimos 12 recuerdos (el inventario completo está en Tab).
- El inventario (Tab) aún muestra estadísticas con números: es la única pantalla que conserva la vista de hoja de cálculo, a propósito, para quien quiera optimizar.
- La carta de un recuerdo recién tomado puede quedar visible unos segundos detrás de la pausa.
- El bot no busca secretos ni enciende velas con una sombra encima (herramienta de verificación, no IA de compañero).
- Al añadir un `class_name` nuevo hay que reimportar (`godot --headless --path . --import`) antes de ejecutar desde consola.

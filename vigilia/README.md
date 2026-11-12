# VIGILIA — La Espina del Durmiente

Roguelite 2D top-down de acción y construcción de builds, en **Godot 4** (GDScript).
Eres una espina de lucidez clavada en el sueño de un dios; el sueño intenta arrullarte hasta disolverte… y **aprende de cómo luchas**.

**Estado: Fase 1.5 verificada en el motor** — 73 pruebas automáticas, seis partidas con piloto automático, estrés y capturas reales. Incluye 42 objetos, 15 sinergias y luz de vela dinámica regulable. Ver [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

Esta revisión corrige las sinergias falsas y las recargas gratis al intercambiar activos, refuerza la recuperación del perfil y añade verificaciones en GitHub Actions. El balance con personas sigue pendiente: ver [`docs/ROADMAP.md`](docs/ROADMAP.md) y [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md).

![Jefe final, fase 3](docs/screenshots/12_jefe_fase3_laseres.png)

## Requisitos
- **Godot 4.6.3** (verificado en esta revisión y utilizado en CI). Otras versiones no forman parte de esta verificación.
- Sin dependencias, addons ni assets externos: arte y audio se generan por código.

## Jugar sin instalar nada
Descarga `VIGILIA_Windows.zip` o `VIGILIA_Linux.zip`, descomprime y ejecuta `VIGILIA.exe` / `VIGILIA.x86_64` (un único archivo con todo el juego). Modo exhibición: `VIGILIA -- --demo [--seed=XXXX]` juega solo con el piloto automático.

Los ejecutables publicados anteriormente corresponden a la Fase 1. Para regenerarlos con esta revisión, instala las plantillas de exportación de la misma versión de Godot que uses y ejecuta:
```bash
godot --headless --path . --export-release "Windows" dist/windows/VIGILIA.exe
godot --headless --path . --export-release "Linux" dist/linux/VIGILIA.x86_64
```

## Ejecutar desde el código fuente
1. Abre la carpeta en el editor de Godot (Importar → `project.godot`) y pulsa **F5**.
2. O desde consola:
   ```bash
   godot --headless --path . --import   # primera vez: genera la caché de clases
   godot --path .
   ```

## Controles (remapeables en Ajustes → Controles)
| Acción | Teclado/ratón | Mando |
|---|---|---|
| Moverse | WASD | stick izquierdo |
| Apuntar y disparar | flechas, o ratón + clic izquierdo | stick derecho |
| Esquivar | Espacio | RB / A |
| Interactuar (tomar/comprar) | E | X |
| Objeto activo | Q | Y |
| Bomba | F | B |
| Inventario y mapa | Tab | Back |
| Pausa | Esc | Start |
| Depuración / perfilador / piloto automático | F3 / F4 / F8 | — |

## Pruebas y herramientas
```bash
tools/run_tests.sh            # 73 pruebas (headless)
tools/run_smoke.sh SEMILLA    # partida completa con piloto automático (--god, --trace, --boss-only)
tools/run_stress.sh           # estrés: 40+ enemigos / 2000 proyectiles
tools/screenshots.sh          # capturas reales (usa Xvfb si no hay pantalla)
```

La CI ejecuta las pruebas, una partida con el bot y el estrés en cada push o pull request. La importación y los errores de GDScript hacen fallar la ejecución; un filtro de pruebas sin coincidencias devuelve código 2.

La intensidad de luz y penumbra se regula en **Ajustes → Vídeo** (0 desactiva el efecto). El alto contraste suaviza la oscuridad y desactivar destellos elimina la oscilación de las luces. Proyectiles, peligros, números de daño y HUD conservan su legibilidad.

## Documentación
- [`docs/DESIGN.md`](docs/DESIGN.md) — identidad, concepto diferencial, bucles, mecánicas.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — sistemas, orden de operaciones, motor de sinergias, determinismo, rendimiento, carpetas.
- [`docs/SYNERGIES.md`](docs/SYNERGIES.md) — sinergias emergentes y de conjunto, con su prueba.
- [`docs/CONTENT_GUIDE.md`](docs/CONTENT_GUIDE.md) — cómo añadir objetos, enemigos, salas y pisos solo con datos.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) · [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) · [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md)

## Datos del jugador
Se guardan en `user://` (Linux: `~/.local/share/vigilia/`, Windows: `%APPDATA%\vigilia\`): `settings.cfg`, `profile.json` y sus copias `.bak`.

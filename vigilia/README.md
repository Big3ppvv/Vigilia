# VIGILIA — La Espina del Durmiente

Roguelite 2D top-down de acción y construcción de builds, en **Godot 4** (GDScript).
Eres una espina de lucidez clavada en el sueño de un dios; el sueño intenta arrullarte hasta disolverte… y **aprende de cómo luchas**.

**Estado: Fase 1 (núcleo jugable) completa y verificada** — 63 pruebas automáticas, partidas completas jugadas por un piloto automático, prueba de estrés y capturas reales. Ver [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

![Jefe final, fase 3](docs/screenshots/12_jefe_fase3_laseres.png)

## Requisitos
- **Godot 4.7.2** (verificado). Escrito evitando APIs posteriores a 4.3, pero **no probado** en versiones anteriores.
- Sin dependencias, addons ni assets externos: arte y audio se generan por código.

## Jugar sin instalar nada
Descarga `VIGILIA_Windows.zip` o `VIGILIA_Linux.zip`, descomprime y ejecuta `VIGILIA.exe` / `VIGILIA.x86_64` (un único archivo con todo el juego). Modo exhibición: `VIGILIA -- --demo [--seed=XXXX]` juega solo con el piloto automático.

Para regenerar los ejecutables: plantillas de exportación de Godot 4.7.2 instaladas y
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
tools/run_tests.sh            # 63 pruebas (headless)
tools/run_smoke.sh SEMILLA    # partida completa con piloto automático (--god, --trace, --boss-only)
tools/run_stress.sh           # estrés: 40+ enemigos / 2000 proyectiles
tools/screenshots.sh          # capturas reales (usa Xvfb si no hay pantalla)
```

## Documentación
- [`docs/DESIGN.md`](docs/DESIGN.md) — identidad, concepto diferencial, bucles, mecánicas.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — sistemas, orden de operaciones, motor de sinergias, determinismo, rendimiento, carpetas.
- [`docs/SYNERGIES.md`](docs/SYNERGIES.md) — sinergias emergentes y de conjunto, con su prueba.
- [`docs/CONTENT_GUIDE.md`](docs/CONTENT_GUIDE.md) — cómo añadir objetos, enemigos, salas y pisos solo con datos.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) · [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) · [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md)

## Datos del jugador
Se guardan en `user://` (Linux: `~/.local/share/vigilia/`, Windows: `%APPDATA%\vigilia\`): `settings.cfg`, `profile.json` y sus copias `.bak`.

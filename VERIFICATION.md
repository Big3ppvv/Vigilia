# Verificación de la revisión 2.1

Base: `c85888fb8847763b88311a14f1b62f0a5b6116de`. Verificación ejecutada en Chromium de Playwright 1.58.2, sobre el HTML autónomo generado; también se inspeccionaron capturas a 1280×800 y 390×844.

## Comandos ejecutados

| Comando | Resultado |
|---|---|
| `npm run build` | HTML autónomo de 27 módulos, aproximadamente 309 KB |
| `npm run check` | Sintaxis de 34 archivos y comparación exacta del HTML generado |
| `npm run test:gameplay` | Habilidades, alcances, recargas, estados, faroles, recompensas únicas, reinicios, colisiones, foco, mezcla persistente y móvil aprobados |
| `npm run test:audio` | PCM finito sin saturación, habilidades diferenciadas, canales y reverberación aislados, limpieza y límite de 128 grupos aprobados |
| `npm run test:vfx` | Daño y cadencia iniciales conservados; horda de 240 criaturas, límites de efectos y movimiento reducido aprobados |
| `npm run test:night` | Lucía, Julián y Matilde alcanzan las 06:00 y muestran «Amanece.» |
| `git diff --check` | Sin errores de espacios |
| `designmd lint DESIGN.md` | 0 errores; advertencias de tokens descriptivos sin referencias de componentes en frontmatter |

La suite completa se ejecutó con `PLAYWRIGHT_BROWSERS_PATH` apuntando al Chromium instalado en el entorno. En una instalación normal basta con `npx playwright install chromium` y `npm test`.

## Cobertura y límites

- Gameplay, audio y efectos se comprueban sin conexión, sobre el archivo que recibe el jugador. La prueba de noche completa sustituye la hoja opcional de Google Fonts para evitar dependencia de red/certificados.
- Las noches completas usan piloto automático e invulnerabilidad: comprueban continuidad, progresión y final, y no equivalen a validar la dificultad con jugadores humanos.
- El render conserva las reglas durante el dibujo. Se comprueban caducidad y limpieza de huellas, máximos de partículas/luces y restablecimiento de estado gráfico.
- Se revisó el móvil con la Guía: su barra, objetivos y botones quedan separados. Se comprobaron teclado, contención/restauración del foco, ajustes y movimiento reducido. No se realizó una auditoría completa de lectores de pantalla ni una matriz de dispositivos físicos.
- El auditor estático genérico de interfaces se ejecutó en modo estricto. Señala 42 supuestos botones sin acción en el HTML fuente y el empaquetado porque solo reconoce manejadores inline: este proyecto conecta eventos con `addEventListener` en módulos. Se revisaron esos manejadores y se verificaron las interacciones con Chromium; ese informe estático no se presenta como aprobado.

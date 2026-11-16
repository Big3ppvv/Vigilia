# Verificación de la versión 3: la vigilia por rondas

La versión 3 sustituye la noche continua (cirios, faroles y 500 objetos generados por plantilla) por un bucle de rondas con tienda: 18 rondas, 20 armas de cuatro niveles que se juntan, 6 clases, 69 objetos con contrapartidas, 16 recuerdos, 6 personajes y 12 criaturas, más cinco difuntos con nombre y la Guía.

## Cómo se verifica

| Orden | Qué comprueba |
|---|---|
| `npm run check` | Sintaxis de todos los módulos y herramientas; el HTML autónomo está al día |
| `npm run test:data` | Armas, clases, objetos, recuerdos, personajes, criaturas y textos apuntan a lo que existe; cuatro valores por nivel; dibujos dentro de la paleta; el escalado crece |
| `npm run test:gameplay` | 13 reglas paso a paso: inicio de cada personaje, estadísticas y escalado de daño, ataque automático y recogida, niveles, fin de ronda con cera fundida, recuerdos y ofrendas, tienda (comprar, juntar al comprar, sin hueco, vender, juntar, candado, tiradas), medalla, guardar y continuar, dificultad, difunto con nombre y horda, la Guía y el alba |
| `npm run test:vfx` | Las 20 armas hieren a su alcance; un crítico destella, aplasta, numera, ilumina y congela; una horda de 240 con seis armas IV respeta todos los límites; movimiento reducido |
| `npm run test:audio` | Seis habilidades con texturas distintas; 74 efectos en una noche resumida (título, rondas, tienda, la Guía, alba) sin errores ni saturación |
| `npm run test:ui` | Teclado y ratón reales: título, ronda, recuerdos con 1-4, ofrenda, tienda, pausa y ajustes; móvil a 390 × 844 con el dedo y sin desbordes |
| `npm run test:night` | El piloto automático vela las 18 rondas con los seis personajes y amanece sin errores |

En este entorno Chromium bloquea `file://`, así que las pruebas locales usan un servidor y `VIGILIA_TEST_URL`. En CI se usa el archivo autónomo sin conexión. La fuente remota opcional se sustituye por una hoja vacía.

## Equilibrio medido con el piloto automático (dificultad 0, sin invulnerabilidad)

- Piloto «experto» (`bot=1`, esquiva y elige con criterio): amanece en torno a una de cada tres noches; cuando cae, lo hace entre las rondas 10 y 14.
- Piloto «novato» (`bot=2`): cae entre las rondas 5 y 12 en la mayoría de noches.
- Las noches completas con invulnerabilidad (`god=1`) llegan al nivel 22-26 con seis armas y 50-60 objetos; la Guía cae en 14-45 s.
- Se corrigió un bucle que inflaba la economía: la cera que suelta el trasno ya no puede volver a robarse (antes, una noche podía terminar en nivel 86).

El piloto valida continuidad y desenlace; no sustituye jugar a velocidad normal para afinar la dificultad humana.

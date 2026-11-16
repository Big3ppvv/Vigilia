# La última vigilia

Ha muerto Amparo. Según la costumbre, alguien tiene que velarla hasta que amanezca para que la Santa Compaña no se la lleve. Esta noche te toca a ti.

Juego de supervivencia para navegador, con ataques automáticos, hordas y mejoras, ambientado en la Noche de Difuntos en un camposanto junto al mar. Una partida dura diez minutos, de medianoche a las seis.

## Jugar

- **Sin instalar nada:** abre `la-ultima-vigilia.html` con doble clic. Funciona sin conexión; con conexión carga además la tipografía Alegreya.
- **Versión modular:** desde esta carpeta, `python3 -m http.server 8000` y abre <http://localhost:8000>.

## Controles

| Acción | Teclado | Táctil | Mando |
|---|---|---|---|
| Moverse | WASD o flechas | arrastra el dedo sobre la pantalla | palanca izquierda o cruceta |
| Esquivar | Espacio | botón «Esquivar» | A |
| Arrullar | E o Q | botón de la nota | X o B |
| Elegir recuerdo | 1, 2, 3 | toca la carta | — |
| Pausa | P o Esc | botón de pausa | Start |
| Ayuda | ? | «Cómo se vela» | — |

Las armas atacan solas a lo que tengas más cerca.

## Qué pasa durante la noche

- **Los cuatro cirios.** Arden alrededor del ataúd y son lo que protege a Amparo. La Compaña entra en procesión por la ermita, la cancela, el portillo y la escalera del mar para apagarlos: cada hermano apaga uno y se va con la llama. Para encender un cirio basta con quedarse a su lado un momento. Si se apagan los cuatro, empiezan a llevársela.
- **Caer.** Si tu vela se apaga y queda algún cirio encendido, su luz te levanta. A cambio, ese cirio se apaga.
- **El arrullo.** Quien vela tararea la nana de Amparo: lo que le rodea se amansa y recibe más daño, las lágrimas se deshacen y los cirios cercanos prenden. Tarda en volver.
- **Quién la vela.** Lucía (la nieta), Julián (el sepulturero) y Matilde (la rezadora). Cada uno empieza con otra arma y vela a su manera: la luz y el arrullo de Lucía llegan más lejos, a Julián los cirios le duran el doble y Matilde los enciende en la mitad de tiempo. Hablan de Amparo cada uno a su modo. A veces se contradicen.
- **Los recuerdos son las mejoras.** Catorce recuerdos clásicos y 500 objetos repartidos en veinte colecciones: el pan de los jueves, el rosario al que le faltaba una cuenta, el farol del faro… En una noche caben cuatro armas y cinco recuerdos. Cada recuerdo toca el siguiente trozo de su nana.
- **Sus rincones.** Algunos recuerdos van juntos: su cocina, su alcoba, su banco en la iglesia, el faro de su padre. Al reunir los de un rincón cambia una regla: el haz del faro quema lo que barre, la campana suelta una corona de chispas, la esquiva atraviesa y hiere…
- **Las horas.** Cada hora es distinta. A la una salen las procesiones. A las dos sube la marea: charcos que frenan y de los que salen ahogados. A las tres, la hora de las ánimas, una racha de viento apaga cirios. A las cuatro la luz alcanza menos. A las cinco aparece la Guía.
- **Los difuntos con nombre.** Cada hora viene uno, con más aguante y su propia manía. Al irse deja su recordatorio: un recuerdo que se elige sin gastar luz.
- **La Guía.** Va directa al ataúd y apaga los cirios uno a uno; solo a oscuras puede llevarse a Amparo. Cada golpe fuerte la aparta y da tiempo a encenderlos.
- **La luz.** Solo se ve lo que alumbra una vela. Tu luz se encoge cuando estás herido. Junto al ataúd te recuperas, más cuantos más cirios ardan.
- **El amanecer** se escribe con los recuerdos que más elegiste. Si la vela se apaga o se llevan a Amparo, el final dice a qué hora.
- **Entre partidas** se guardan en el navegador las noches veladas, los recuerdos, los rincones, las criaturas y los difuntos descubiertos (*Recuerdos* y *Las noches*).

El lugar es siempre el mismo: el Camposanto del Carmen, un recinto con muro. La ermita con su espadaña al norte, la cancela y el peto de ánimas al oeste, la escalera del mar y el faro al este, el cruceiro en el paseo y cuatro cuarteles con carácter propio.

Todo el arte y el sonido se generan con código: pixel art animado, iluminación, orballo, viento, mar, grillos, la campana, la música de cada hora y la nana tocada con una cuerda pulsada.

## Archivos

| Archivo | Contenido |
|---|---|
| `story.js` | **Todo el texto**: Amparo, quién la vela, los recuerdos y sus rincones, lo que dice cada uno, las criaturas, los difuntos con nombre, los letreros y los finales. Es el archivo que hay que reescribir para que el juego cuente tu historia. |
| `balance.js` | **Todos los números**: criaturas, lo que pasa a cada hora, procesiones, difuntos, huecos, el velatorio y el tamaño del camposanto. Es el archivo que hay que tocar para cambiar el equilibrio. |
| `game.js` | El compás de la noche: la arranca, la hace avanzar y la termina. Cada sistema vive en su módulo y se suma aquí. |
| `director.js` | Qué pasa a cada hora: cuánta Compaña viene, procesiones, difuntos con nombre, la racha de viento y la marea. |
| `vigil.js` | El velatorio: los cirios, el alma de Amparo, levantarse y el arrullo. |
| `weapons.js`, `memories.js` | Armas y daño; recuerdos, huecos y rincones. |
| `enemies.js`, `boss.js` | Cómo se mueve y ataca cada criatura; la Guía. |
| `input.js`, `bot.js` | Teclado, dedo y mando; el piloto automático de las pruebas. |
| `world.js` | El camposanto: suelo pintado por trozos, piezas con altura, hitos, mar y niebla. |
| `sprites.js`, `art.js` | El pixel art y sus fotogramas; la oscuridad y las luces. |
| `render.js` | El dibujo de cada fotograma, ordenado de arriba abajo. |
| `combat-fx.js`, `fx.js`, `ambient.js` | Efectos de las armas; partículas y la manera de deshacerse de cada criatura; orballo, hojas, polillas y huellas en el suelo. |
| `audio.js`, `sfx.js`, `music.js` | El motor de sonido y el ambiente; los efectos, uno por nombre; la música, que se escribe compás a compás sobre la nana. |
| `app.js`, `index.html`, `style.css` | Interfaz: título, HUD, cartas de recuerdo, recordatorio final, álbum y ajustes. |
| `build.mjs` | Genera `la-ultima-vigilia.html` (`node build.mjs`). Descubre los módulos a partir de `app.js`. Hay que ejecutarlo tras cada cambio. |

Los módulos solo usan `import { a, b } from './archivo.js';` y `export const|function|class`: es lo que `build.mjs` sabe empaquetar.

## Herramientas de prueba

Todas trabajan sobre `la-ultima-vigilia.html` y requieren Playwright y Chromium.

| Herramienta | Qué comprueba |
|---|---|
| `tools/smoke.mjs` | El piloto automático vela una noche entera con cada personaje. |
| `tools/vigil-check.mjs` | Las reglas del velatorio, una por una: recinto, cirios, procesión, alma, levantarse, arrullo, huecos, rincones, difuntos, marea y la Guía. |
| `tools/combat-vfx.mjs` | El combate sin conexión: daño, impactos, límites de efectos en hordas y movimiento reducido. |
| `tools/ui-check.mjs` | La interfaz con teclado y ratón de verdad: diálogos y ajustes, moverse, esquivar, arrullar, los cirios en el HUD, las cartas, la pausa y el final. |
| `tools/audio-check.mjs` | El sonido sin altavoces: toca una noche resumida, comprueba que ninguna receta falla y que la mezcla no satura. Con una ruta, además guarda el WAV: `node tools/audio-check.mjs noche.wav`. |

Parámetros de la URL:

- `?debug`: expone el juego como `window.vigilia`.
- `&autostart=1&char=julian`: empieza directamente con un personaje (`lucia`, `julian`, `matilde`).
- `&bot=1` juega solo con buenos reflejos y cuida los cirios; `&bot=2` imita a alguien que juega por primera vez.
- `&god=1`: no recibe daño. A Amparo se la pueden llevar igual.
- `&speed=8`: acelera la simulación.
- `&t=495`: salta a un momento de la noche, en segundos (100 = una hora).

Por ejemplo, `la-ultima-vigilia.html?debug&autostart=1&bot=2&speed=8&char=matilde` juega una noche entera en poco más de un minuto. Al acabar, `vigilia.debugStats()` resume cuántos cirios se apagaron y encendieron, las veces que se levantó, los rincones reunidos y cuándo cayó la Guía.

## Ajustes y accesibilidad

Volumen general y por grupos (música, efectos, ambiente); temblor de pantalla; destellos; orballo y hojas; penumbra suave y números de daño. Con «reducir movimiento» activado en el sistema, el temblor, los destellos y el orballo empiezan apagados.

Los ataques iluminan el terreno próximo: fuego ámbar para las chispas, sal fría y nácar dorado para el rosario de Matilde. La campana dibuja varios ecos y el farol marca el alcance de su calor. Al apagar «Destellos» se conservan los proyectiles y las formas de los golpes, se atenúan las estelas y se suprimen las ráfagas de luz y los flashes de pantalla. «Temblor de pantalla» también controla el retroceso visual al disparar. Nada de lo que es solo adorno cambia el daño ni las reglas.

## Los 500 objetos

`objects.js` contiene 20 colecciones de 25 objetos con nombres e identificadores únicos.
Cada pieza ocupa un hueco de recuerdo, admite los mismos niveles que los recuerdos clásicos
y mejora vida, regeneración, daño, recogida de luz o probabilidad de golpe certero.
Dos objetos **distintos** de una colección activan su sinergia una sola vez: daño, cadencia,
regeneración, vida, recogida, protección, luz, experiencia, velocidad o recarga del arrullo.
Cualquier pareja de una colección sirve (6.000 parejas posibles en total).
El nivel de un objeto no cuenta como una segunda pieza. Se mantienen cuatro armas y cinco recuerdos.

Las cartas siguen ofreciendo recuerdos clásicos para poder conseguir armas. Cuando falta
una pieza para activar una sinergia, hay un 45 % de probabilidad de priorizar una compañera.
El álbum, el HUD y el final usan los mismos objetos; sus descubrimientos se guardan como los recuerdos clásicos.
Los iconos reutilizan los símbolos existentes de sus efectos.

Prueba sin dependencias: `node tools/objects-check.mjs`.

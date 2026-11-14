# La última vigilia

Ha muerto Amparo. Según la costumbre, alguien tiene que velarla hasta que amanezca para que la Santa Compaña no se la lleve. Esta noche te toca a ti.

Juego de supervivencia para navegador, con ataques automáticos, hordas y mejoras, ambientado en la Noche de Difuntos en un camposanto junto al mar. Una partida dura diez minutos, de medianoche a las seis.

## Jugar

- **Sin instalar nada:** abre `la-ultima-vigilia.html` con doble clic. Funciona sin conexión; con conexión carga además la tipografía Alegreya.
- **Versión modular:** desde esta carpeta, `python3 -m http.server 8000` y abre <http://localhost:8000>.

## Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Moverse | WASD o flechas | arrastra el dedo sobre la pantalla |
| Esquivar | Espacio | botón «Esquivar» |
| Elegir recuerdo | 1, 2, 3 | toca la carta |
| Pausa | P o Esc | botón de pausa |
| Ayuda | ? | «Cómo se vela» |

Las armas atacan solas a lo que tengas más cerca.

## Qué pasa durante la noche

- **Quién la vela.** Lucía (la nieta), Julián (el sepulturero) y Matilde (la rezadora). Cada uno empieza con otra arma, juega distinto y habla de Amparo a su manera. A veces se contradicen.
- **Los recuerdos son las mejoras.** Catorce cosas concretas de Amparo: el pan de los jueves, el rosario al que le faltaba una cuenta, el farol del faro… Cada recuerdo toca el siguiente trozo de su nana.
- **Las horas.** La campana da cada hora. La oscuridad y la niebla cambian con la noche. A las tres llega la hora de las ánimas. A las cinco aparece la Guía, que va directa al ataúd: si se queda junto a él, se lleva a Amparo.
- **La luz.** Solo se ve lo que alumbra una vela. Tu luz se encoge cuando estás herido. Junto al ataúd te recuperas.
- **El amanecer** se escribe con los recuerdos que más elegiste. Si la vela se apaga, el final dice a qué hora.
- **Entre partidas** se guardan en el navegador las noches veladas, los recuerdos y las criaturas descubiertas (*Recuerdos* y *Las noches*).

Todo el arte y el sonido se generan con código: pixel art, iluminación, viento, mar, grillos, la campana y la nana tocada con una cuerda pulsada.

## Archivos

| Archivo | Contenido |
|---|---|
| `story.js` | **Todo el texto**: Amparo, quién la vela, los recuerdos, lo que dice cada uno, las criaturas y los finales. Es el archivo que hay que reescribir para que el juego cuente tu historia. |
| `game.js` | Reglas: horas, criaturas, procesiones, la Guía, armas, luz y alba. |
| `art.js`, `sprites.js` | Pixel art, camposanto, velatorio, niebla y oscuridad. |
| `audio.js` | Sonido procedural con Web Audio. |
| `app.js`, `index.html`, `style.css` | Interfaz: título, HUD, cartas de recuerdo, recordatorio final, álbum y ajustes. |
| `build.mjs` | Genera `la-ultima-vigilia.html` (`node build.mjs`). Hay que ejecutarlo tras cada cambio. |
| `tools/smoke.mjs` | Prueba de humo: el piloto automático vela una noche entera con cada personaje. Es lo que ejecuta la verificación de GitHub en cada subida. |

## Herramientas de prueba

Parámetros de la URL (versión modular):

- `?debug`: expone el juego como `window.vigilia`.
- `&autostart=1&char=julian`: empieza directamente con un personaje (`lucia`, `julian`, `matilde`).
- `&bot=1` juega solo con buenos reflejos; `&bot=2` imita a alguien que juega por primera vez.
- `&god=1`: no recibe daño.
- `&speed=8`: acelera la simulación.
- `&t=495`: salta a un momento de la noche, en segundos (100 = una hora).

Por ejemplo, `index.html?debug&autostart=1&bot=2&speed=8&char=matilde` juega una noche entera en poco más de un minuto.

Ajustes de accesibilidad: temblor de pantalla, destellos, penumbra suave y números de daño. Con «reducir movimiento» activado en el sistema, el temblor y los destellos empiezan apagados.

# La última vigilia

Ha muerto Amparo. Alguien tiene que velarla hasta que amanezca, porque esta noche la Santa Compaña hace la ronda.

Supervivencia por rondas para navegador: dieciocho rondas de medianoche a las seis, armas que atacan solas alrededor de quien vela, recuerdos que mejoran tus estadísticas y la tienda de Remedios entre ronda y ronda.

## Jugar

- Abre `la-ultima-vigilia.html` con doble clic. Funciona sin conexión; la tipografía Alegreya se carga cuando hay conexión y tiene alternativas del sistema.
- Para trabajar con los módulos, ejecuta `npm run dev` desde la raíz del repositorio y abre <http://localhost:8000>.

## Controles

| Acción | Teclado | Táctil | Mando |
|---|---|---|---|
| Moverse | WASD o flechas | arrastra el dedo sobre la pantalla | palanca izquierda o cruceta |
| Esquivar | Espacio o Mayús | botón «Esquivar» | A |
| Habilidad | R (también E o Q) | botón de habilidad | X o B |
| Elegir recuerdo | 1, 2, 3, 4 · R piensa otra cosa | toca la carta | — |
| Ofrenda | 1 quedártela · 2 dejarla | botones | — |
| Tienda | 1-4 compra · R vuelve a tirar | botones | — |
| Pausa | P o Esc | botón de pausa | Start |

## Cómo se vela

- **Rondas.** La noche son 18 rondas, tres por hora. Duran 20, 25, 30… hasta 60 segundos; la última, 90. Cada una empieza con la vida llena. Todo lo que aparece avisa antes con una marca en el suelo.
- **La cera.** La deja la Compaña al deshacerse: es experiencia y moneda a la vez. Acércate para que vuele hacia ti. La que quede en el suelo al acabar la ronda se funde y, en la siguiente, cada gota que recojas trae una más hasta que se agote.
- **Recordar.** Cada nivel da +1 de vida máxima. Al acabar la ronda, por cada nivel ganado eliges uno de cuatro recuerdos de Amparo; cada uno mejora una estadística. La rareza (I a IV) se ve por el color.
- **Estadísticas.** Vida máxima, regeneración, robo de vida, daño, cuerpo a cuerpo, a distancia, elemental, velocidad de ataque, crítico, ingenio, alcance, armadura, evasión, velocidad, suerte y cosecha.
- **El puesto de Remedios.** Cuatro ofertas. Comprar, volver a tirar (cada tirada cuesta más), guardar con candado para la próxima visita, vender armas y juntar dos armas iguales del mismo nivel en una del siguiente. Con seis armas, comprar una igual a otra que ya tienes la junta sola.
- **Clases de armas.** Labranza (armadura y cuerpo a cuerpo), Caza (crítico), Fuego (daño), Sagrado (elemental y regeneración), Mar (alcance y cosecha), Romería (velocidad de ataque y de movimiento). Dos o más armas de la misma clase dan su premio, que crece hasta seis.
- **Ofrendas.** A veces una criatura deja una cesta: al acabar la ronda decides si te quedas lo que trae o la dejas por cera.
- **Difuntos con nombre.** Al final de cada hora (rondas 3, 6, 9, 12 y 15) viene uno, con su barra de vida y sus ataques propios. Si lo vences, deja una ofrenda rara. Si acaba la ronda, se marcha.
- **Hordas.** En las rondas 5, 8, 11, 14 y 17 las ánimas te rodean de golpe.
- **La Guía.** En la última ronda llega Carmela Souto con la cruz: golpes en círculo, coronas de velas, procesiones y cargas. Si se acaba la cuenta atrás y sigue en pie, el reloj de la torre se para hasta que la liberes.
- **Entre noches** se guardan la partida a medias (al entrar en la tienda), el récord de ronda, los amaneceres, el álbum y los desbloqueos: Toño en la ronda 6, Sabela en la 12, don Anselmo al primer amanecer, y cada dificultad al vencer la anterior.

## Las criaturas

| Criatura | Desde | Qué hace |
|---|---|---|
| Ánima en pena | ronda 1 | Va a por ti culebreando |
| Hermano de la Compaña | ronda 2 | Persigue despacio; en procesión cruza el atrio en fila |
| El Urco | ronda 4 | Se para, gruñe y embiste en línea recta |
| La curuxa | ronda 5 | Vuela en círculos y cae en picado |
| Plañidera | ronda 6 | Llora desde lejos: tres lágrimas en abanico |
| Ahogado | ronda 7 | Lento y duro; deja charcos que frenan |
| El trasno | ronda 8 | Se come la cera del suelo; si lo atrapas, la suelta toda |
| Lavandeira | ronda 10 | Llama a las ánimas desde lejos |
| El espantajo | ronda 11 | Enorme; barre en círculo |
| Nubeiro | ronda 12 | Señala un círculo y ahí cae el rayo |
| Lobishome | ronda 14 | Embiste dos veces |

## Ajustes y accesibilidad

Volumen general y por grupos (música, efectos, ambiente); temblor de pantalla; destellos; números de daño; orballo y niebla; penumbra suave. Con «reducir movimiento» activado en el sistema, el temblor y los destellos empiezan apagados. Nada de lo que es solo adorno cambia el daño ni las reglas. Las capas aíslan el fondo y contienen el foco de teclado.

## Archivos

| Archivo | Qué contiene |
|---|---|
| `story.js` | **Todo el texto**: Amparo, quién la vela, las criaturas, los difuntos, Remedios, las voces, la ayuda y los finales |
| `balance.js` | **Todos los números**: rondas, atrio, criaturas y su escalado, población, precios, rarezas, dificultad y habilidades |
| `arsenal.js` | Las 20 armas con sus cuatro niveles y las seis clases |
| `items.js` | Los 69 objetos y los 16 recuerdos |
| `stats.js` | Las estadísticas y cómo se convierten en números de juego |
| `game.js` | El compás de la partida: rondas, entre rondas, experiencia, alba y guardado |
| `waves.js`, `enemies.js` | Quién viene y por dónde; cómo se mueve y ataca cada criatura y la Guía |
| `weapons.js`, `abilities.js` | Armas en corro, proyectiles, daño, cera y construcciones; las seis habilidades |
| `shop.js` | Recuerdos, ofrendas y el puesto de Remedios |
| `arena.js`, `props.js` | El atrio y las piezas del camposanto |
| `render.js`, `art.js`, `sprites.js`, `sprites-extra.js` | Dibujo, luz y pixel art |
| `fx.js`, `combat-fx.js`, `ambient.js` | Partículas, números, golpes, orballo y huellas |
| `audio.js`, `sfx.js`, `sfx-rondas.js`, `music.js` | Motor de sonido, efectos y la música |
| `app.js`, `index.html`, `style.css`, `interface.js`, `storage.js` | Interfaz y lo que se guarda |
| `build.mjs` | Genera `la-ultima-vigilia.html` (`node build.mjs`); descubre los módulos a partir de `app.js` |

## Herramientas de prueba

Todas trabajan sobre `la-ultima-vigilia.html` (o `VIGILIA_TEST_URL`) y, salvo la de datos, requieren Playwright y Chromium.

| Herramienta | Qué comprueba |
|---|---|
| `tools/data-check.mjs` | Que los datos apuntan a lo que existe y crecen como deben |
| `tools/gameplay.mjs` | Las reglas paso a paso: rondas, recuerdos, ofrendas, tienda, guardado, difuntos y la Guía |
| `tools/combat-vfx.mjs` | Que cada arma hiere, que los golpes se notan y que los efectos respetan sus límites |
| `tools/audio.mjs`, `tools/audio-check.mjs` | El sonido sin altavoces: recetas, mezcla y saturación. `node tools/audio-check.mjs noche.wav` guarda el resultado |
| `tools/ui-check.mjs` | La interfaz con teclado, ratón y dedo, en escritorio y móvil |
| `tools/smoke.mjs` | El piloto automático vela una noche entera con cada personaje |

Parámetros de la URL:

- `?debug`: expone el juego como `window.vigilia` (`vigilia.debugStats()` resume la partida).
- `&autostart=1&char=julian&weapon=pala&danger=0`: empieza directamente.
- `&bot=1` juega solo con buenos reflejos; `&bot=2` imita a alguien que juega por primera vez.
- `&god=1`: no recibe daño.
- `&speed=12`: acelera la simulación.
- `&round=9`: empieza en esa ronda.

Por ejemplo, `la-ultima-vigilia.html?debug&autostart=1&bot=1&god=1&speed=12&char=matilde` vela una noche entera en poco más de un minuto.

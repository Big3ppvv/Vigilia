# La última vigilia

Ha muerto Amparo. Alguien tiene que velarla hasta que amanezca para que la Santa Compaña no se la lleve.

Juego de supervivencia para navegador con ataques automáticos, hordas y recuerdos que mejoran tus armas. La noche va de medianoche a las seis: cien segundos de juego por hora. A las cinco llega la Guía; si el reloj se detiene, tendrás que resolver su amenaza para ver amanecer.

## Jugar

- Abre `la-ultima-vigilia.html` con doble clic. Funciona sin conexión; la tipografía Alegreya se carga cuando hay conexión y tiene alternativas del sistema.
- Para trabajar con los módulos, ejecuta `npm run dev` desde la raíz del repositorio y abre <http://localhost:8000>. También puedes ejecutar `python3 -m http.server 8000` desde esta carpeta.

## Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Moverse | WASD o flechas | Arrastra el dedo sobre el camposanto |
| Esquivar | Espacio | Botón «Esquivar» |
| Usar habilidad | E | Botón con el nombre de la habilidad |
| Elegir recuerdo | 1, 2, 3 | Toca la carta |
| Pausa | P o Esc | Botón de pausa |
| Ayuda | ? | «Cómo se vela» |

Las armas buscan solas la amenaza más cercana. La esquiva protege durante el salto; ambas acciones muestran su recarga y están disponibles también con botones.

## Cómo afrontar la noche

**Elige quién vela.** Lucía empieza con chispas, obtiene más luz para recordar y ve más lejos. Julián dispara sal y aguanta más. Matilde empieza con chispas y rosario. Sus recuerdos y sus palabras sobre Amparo también cambian.

**Reserva tu habilidad para abrir espacio.** Lucía usa *Lumbre*, una ráfaga que aparta criaturas y atrae luz cercana. Julián traza un *Cerco de sal* que frena y hiere durante unos segundos. El *Responso* de Matilde cura, aparta criaturas y retrasa a la Guía si está cerca. Todas disipan proyectiles y amenazas próximas al activarse.

**Decide cuándo encender un farol.** Hay tres: en la cancela, el cruceiro y el camino del mar. Son opcionales. Permanece quieto a su lado durante 3,6 segundos; moverte o alejarte hace decaer el progreso y recibir daño lo interrumpe. Cada farol se recompensa una sola vez: cura, entrega luz para recordar y reduce la recarga de la habilidad. Su zona iluminada frena criaturas, pero no impide que te alcancen.

**Usa el mapa.** Señala tu posición, el ataúd de Amparo, los faroles y la Guía. Las flechas del borde ayudan a encontrar los objetivos que quedan fuera de la pantalla. Las señales direccionales anuncian embestidas y otros ataques antes de que lleguen.

**Recoge recuerdos y protege a Amparo.** La luz que dejan las criaturas permite elegir una mejora entre tres. Junto al ataúd recuperas vida; cuando estás herido, tu luz se encoge. A las tres llegan más ánimas y a las cinco la Guía busca el ataúd. El final recoge lo que más recordaste de Amparo.

Las noches, los recuerdos descubiertos, las criaturas y los ajustes se guardan en este navegador. El juego también puede ejecutarse si el almacenamiento está desactivado; en ese caso no conservará esos datos al cerrar.

## Sonido y accesibilidad

En Ajustes puedes regular volumen general, música, ambiente y efectos por separado. Cada canal controla también su reverberación. El sonido comienza después de un gesto del jugador, según las reglas del navegador.

La nana de Amparo cambia con el peligro y la proximidad del refugio. El mar queda hacia el este, los pasos acompañan al movimiento y las armas, los faroles y las tres habilidades tienen señales distintas.

Puedes desactivar temblor de pantalla y destellos, suavizar la oscuridad o mostrar números de daño. La preferencia de movimiento reducido del sistema inicializa temblor y destellos apagados. Al reducir efectos se mantienen las formas que identifican proyectiles, círculos de sal y avisos de peligro. La pausa y la selección de recuerdos mantienen el foco de teclado dentro de su panel.

## Desarrollar y verificar

Desde la raíz del repositorio, con Node.js 22 o posterior:

```sh
npm ci
npx playwright install chromium
npm run build
npm test
```

| Comando | Comprobación |
|---|---|
| `npm run dev` | Sirve la versión modular en el puerto 8000; requiere Python 3 |
| `npm run build` | Genera el HTML autónomo desde `app.js` y sus importaciones |
| `npm run check` | Sintaxis de los módulos y coincidencia del HTML con sus fuentes |
| `npm run test:gameplay` | Habilidades, faroles, interfaz, controles, guardado y móvil |
| `npm run test:audio` | Sonido renderizado con `OfflineAudioContext`, mezcla y límite de voces |
| `npm run test:vfx` | Daño, colisiones, efectos, horda de 240 criaturas y movimiento reducido |
| `npm run test:night` | Una noche completa con cada personaje y piloto automático |

Las pruebas de navegador usan el HTML autónomo sin conexión. Si ya tienes un Chromium compatible, puedes indicar su ruta con `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; en caso contrario se usa el instalado por Playwright.

No edites `la-ultima-vigilia.html` directamente: cualquier cambio se perderá al reconstruir. La organización del código y los puntos de extensión están en [ARCHITECTURE.md](../ARCHITECTURE.md).

## Herramientas de diagnóstico

Parámetros de URL disponibles en la versión modular y en el HTML autónomo:

- `?debug`: expone el juego como `window.vigilia`.
- `&autostart=1&char=julian`: inicia con `lucia`, `julian` o `matilde`.
- `&bot=1`: piloto con buenos reflejos; `&bot=2`: comportamiento de principiante.
- `&god=1`: evita recibir daño.
- `&speed=8`: acelera la simulación.
- `&t=495`: salta a un momento de la noche, en segundos.

Por ejemplo: `index.html?debug&autostart=1&bot=2&speed=8&char=matilde`. El reloj y la simulación se aceleran; las pruebas de noches completas no sustituyen probar el equilibrio jugando a velocidad normal.

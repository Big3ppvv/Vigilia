# La última vigilia

[![Verificar La última vigilia](https://github.com/Big3ppvv/Vigilia/actions/workflows/verify.yml/badge.svg)](https://github.com/Big3ppvv/Vigilia/actions/workflows/verify.yml)

Ha muerto Amparo. Según la costumbre, alguien tiene que velarla hasta que amanezca para que la Santa Compaña no se la lleve. Esta noche te toca a ti.

Supervivencia para navegador durante una Noche de Difuntos: diez minutos, de medianoche a las seis. El arte y el sonido se generan con código; el juego funciona sin conexión y sin dependencias en ejecución.

![El velatorio de Amparo en la pantalla de título](la-ultima-vigilia/docs/titulo.jpg)

## Jugar

Descarga [`la-ultima-vigilia/la-ultima-vigilia.html`](la-ultima-vigilia/la-ultima-vigilia.html) y ábrelo con doble clic en un navegador moderno.

Muévete con **WASD o las flechas**, esquiva con **Espacio** y usa tu habilidad con **E**. Las armas atacan solas. En móvil, arrastra el dedo para moverte y usa los botones de acción.

## Una luz distinta para cada persona

| Personaje | Habilidad activa |
|---|---|
| Lucía · la nieta | **Lumbre:** aparta criaturas con fuego y atrae la luz que dejan atrás. |
| Julián · el sepulturero | **Cerco de sal:** deja un círculo que frena y hiere a las criaturas. |
| Matilde · la rezadora | **Responso:** recupera vida, aparta amenazas y retrasa a la Guía cercana. |

Tres faroles opcionales abren otra forma de afrontar la noche. Detente junto a uno durante **3,6 segundos** para encenderlo: recuperas vida y luz para recordar, creas un refugio que frena criaturas y tu habilidad se recarga antes. El minimapa y las flechas te orientan entre el ataúd, los faroles y la Guía.

Las señales de ataque, los reflejos del suelo mojado, las huellas y las luces conservan el dibujo de píxel del camposanto. La mezcla permite ajustar por separado música, ambiente y efectos; la nana responde al peligro y cada habilidad tiene su propio sonido.

![Cerco de sal, faroles y minimapa durante la vigilia](la-ultima-vigilia/docs/rituales.jpg)

## Desarrollar

Requiere Node.js 22 o posterior; el servidor de desarrollo usa Python 3. Desde la raíz:

```sh
npm ci
npm run dev
```

Abre <http://localhost:8000>. Después de cambiar los módulos, `npm run build` regenera el HTML que se distribuye. `npm run check` comprueba sintaxis y que ese archivo esté actualizado.

Para ejecutar las pruebas de navegador:

```sh
npx playwright install chromium
npm test
```

La instalación de Playwright solo se usa para verificar el juego. Controles, accesibilidad y pruebas individuales: [guía del juego](la-ultima-vigilia/README.md). Responsabilidades de cada sistema y cómo ampliarlo: [arquitectura](ARCHITECTURE.md).

## Cambiar la historia

El texto vive en [`story.js`](la-ultima-vigilia/story.js): Amparo, sus recuerdos, los tres personajes, las habilidades y los finales. Los números de equilibrio pertenecen a [`balance.js`](la-ultima-vigilia/balance.js). Ejecuta `npm run build` después de editarlos.

![El recordatorio del amanecer](la-ultima-vigilia/docs/amanece.jpg)

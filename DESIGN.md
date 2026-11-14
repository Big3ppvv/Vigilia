---
version: alpha
name: "La última vigilia"
description: "Un camposanto de píxeles: la luz del cirio revela la noche y cada arma deja una huella reconocible."
colors:
  background: "#07080c"
  paper: "#efe6d4"
  flame: "#ffb04a"
  ember: "#ff742e"
  salt: "#bee0f2"
  sacred: "#eecd81"
typography:
  display:
    fontFamily: "Alegreya, Georgia, 'Times New Roman', serif"
  body:
    fontFamily: "'Alegreya Sans', system-ui, sans-serif"
omitted:
  - section: spacing
    reason: "La geometría del mundo pertenece a game.js y art.js; la interfaz existente conserva style.css."
  - section: rounded
    reason: "Este cambio se limita al combate de Canvas y conserva los controles existentes."
components:
  weaponEffects: {}
  lighting: {}
---

# La última vigilia

## Overview

### Creative North Star

Una vela en un camposanto junto al mar durante la Noche de Difuntos. El fuego, la sal gruesa, el nácar del rosario y el bronce de la campana son materiales concretos; la magia nace de ellos. Los protagonistas y las criaturas conservan su silueta de pixel art.

### Product context and register

Juego de supervivencia de diez minutos para navegador, sin dependencias ni recursos externos necesarios para jugar. El contenido y los controles están en español; la ambientación no implica un mercado exclusivo. La fuente de producto es `README.md`, `la-ultima-vigilia/README.md` y `la-ultima-vigilia/story.js`.

El encargo mejora la lectura y el impacto de los ataques. Conserva reglas, daño, progresión, armas iniciales y la interfaz. Lucía lanza chispas, Julián dispara sal y Matilde empieza con chispas y rosario; la campana sigue siendo una mejora que todos pueden conseguir.

**Propiedad de los valores:** el código es la fuente canónica. `la-ultima-vigilia/style.css` contiene los tokens de interfaz y sus tipografías; `la-ultima-vigilia/sprites.js` contiene la paleta de sprites. `ATTACK_PALETTE` en `la-ultima-vigilia/art.js` es la única fuente de la nueva paleta de combate: sus valores pasan a `Lighting.glows` y al renderizador de armas. Este documento refleja esas fuentes, no genera tokens. `node build.mjs` regenera el HTML autónomo desde los módulos.

## Colors

La noche mantiene su fondo casi negro, el papel marfil y el fuego ámbar existentes. Las chispas usan `ember` con núcleo `#fff2bc`; la sal usa `salt` con núcleo `#f4fbff`; el rosario y la campana usan `sacred` con núcleo `#fff4d8`. El color acompaña a formas distintas para reconocer las armas sin depender solo del tono.

Las luces de ataque iluminan el terreno próximo. Sus halos se atenúan con el efecto y no sustituyen la vela como principal referencia del jugador. Las luces ambientales existentes mantienen su paleta.

## Typography

Alegreya para títulos y texto narrativo; Alegreya Sans para controles y datos. Se mantienen las alternativas de sistema y el contenido español. Los efectos de combate no incorporan rótulos nuevos.

## Layout

El mundo se dibuja en Canvas con la cámara y la escala existentes. Las posiciones de los efectos están en coordenadas del mundo y se proyectan con la misma cámara. Se conservan HUD, controles de teclado, controles táctiles y sus zonas seguras.

## Elevation & Depth

El mundo y las entidades preceden a la máscara de oscuridad; los núcleos emisivos se dibujan por encima para que el ataque siga legible. La luz abre localmente esa máscara y agrega color al suelo con sprites de gradiente cacheados. Los fogonazos pueden tener dirección: `a` orienta y `stretch` alarga su huella entre 1 y 3 veces el radio menor.

## Shapes

Los núcleos y las partículas mantienen bordes de píxel. Las chispas dejan una estela dirigida, la sal ocupa un abanico, el rosario dibuja órbitas y la campana se expande en ondas. El halo puede ser suave; la forma principal debe seguir siendo nítida.

## Components

### Weapon effects

Un ataque comunica salida, recorrido y contacto con su propia forma y una duración breve. Las luces y partículas tienen límites de cantidad y se eliminan al terminar. Los efectos visuales no crean daño ni alteran colisiones.

### Lighting

`Lighting` comparte perfil y transformación entre la apertura en la oscuridad y el halo aditivo. Los perfiles de color se construyen una vez; los fotogramas reutilizan esos lienzos. Las luces fuera de cámara se omiten.

### Motion and accessibility

Se respetan los ajustes existentes de temblor y destellos y la preferencia de movimiento reducido que los inicializa desactivados. El combate conserva núcleos y recorridos legibles cuando se reduce su énfasis luminoso. Evitar grandes blancos de pantalla o halos persistentes que oculten criaturas.

## Do's and Don'ts

- **Mantener:** la atmósfera fúnebre, las siluetas y los materiales propios de cada arma.
- **Reutilizar:** una paleta y un renderizador de efectos compartidos para todas las armas y protagonistas.
- **Evitar:** destellos de pantalla añadidos a cada golpe, gradientes nuevos por partícula o efectos sin caducidad.
- **Evitar:** cambiar el equilibrio o las armas de un personaje para conseguir una diferencia visual.

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
    reason: "La geometría del mundo pertenece a balance.js; style.css conserva el ritmo de la interfaz existente."
rounded:
  control: "4px"
  panel: "6px"
components:
  weaponEffects: {}
  lighting: {}
  ritual: {}
  ability: {}
  minimap: {}
---

# La última vigilia

## Overview

### Creative North Star

Una vela en un camposanto junto al mar durante la Noche de Difuntos. El fuego, la sal gruesa, el nácar del rosario y el bronce de la campana son materiales concretos; la magia nace de ellos. Los protagonistas y las criaturas conservan su silueta de pixel art.

### Product context and register

Juego de supervivencia de diez minutos para navegador, sin dependencias ni recursos externos necesarios para jugar. El contenido y los controles están en español; la ambientación no implica un mercado exclusivo. La fuente de producto es `README.md`, `la-ultima-vigilia/README.md` y `la-ultima-vigilia/story.js`.

Esta revisión amplía el gameplay, el sonido y el dibujo manteniendo la historia y la noche de diez minutos. Las armas automáticas iniciales se conservan: Lucía lanza chispas, Julián dispara sal y Matilde empieza con chispas y rosario. Cada personaje dispone además de una habilidad activa y hay tres faroles opcionales que invitan a explorar. El minimapa representa el velatorio, los faroles, quien vela y la Guía; sus marcas no dependen solo del color.

**Propiedad de los valores:** el código es la fuente canónica. `la-ultima-vigilia/style.css` contiene los tokens de interfaz y sus tipografías; `la-ultima-vigilia/sprites.js` contiene la paleta de sprites. `ATTACK_PALETTE` en `la-ultima-vigilia/art.js` es la única fuente de la nueva paleta de combate: sus valores pasan a `Lighting.glows` y al renderizador de armas. `SCENE_PALETTE` en `scene-fx.js` es la fuente de los nuevos faroles, cerco, mapa y efectos ambientales. Este documento refleja esas fuentes, no genera tokens. `node build.mjs` regenera el HTML autónomo desde los módulos.

## Colors

La noche mantiene su fondo casi negro, el papel marfil y el fuego ámbar existentes. Las chispas usan `ember` con núcleo `#fff2bc`; la sal usa `salt` con núcleo `#f4fbff`; el rosario y la campana usan `sacred` con núcleo `#fff4d8`. El color acompaña a formas distintas para reconocer las armas sin depender solo del tono.

Las luces de ataque iluminan el terreno próximo. Sus halos se atenúan con el efecto y no sustituyen la vela como principal referencia del jugador. Las luces ambientales existentes mantienen su paleta.

## Typography

Alegreya para títulos y texto narrativo; Alegreya Sans para controles y datos. Se mantienen las alternativas de sistema y el contenido español. Los efectos de combate no incorporan rótulos nuevos.

## Layout

El mundo se dibuja en Canvas con la cámara y la escala existentes. Las posiciones de los efectos están en coordenadas del mundo y se proyectan con la misma cámara. El HUD incorpora progreso de faroles y habilidad activa. En escritorio, el minimapa ocupa el lateral inferior derecho por encima de los botones; en móvil se sitúa bajo el contador y se retira durante el combate contra la Guía. Los botones táctiles de habilidad y esquiva se apilan y respetan el área segura inferior. El resto de la escena queda libre para moverse.

## Elevation & Depth

El mundo y las entidades preceden a la máscara de oscuridad; los núcleos emisivos se dibujan por encima para que el ataque siga legible. La luz abre localmente esa máscara y agrega color al suelo con sprites de gradiente cacheados. Los fogonazos pueden tener dirección: `a` orienta y `stretch` alarga su huella entre 1 y 3 veces el radio menor.

## Shapes

Los núcleos y las partículas mantienen bordes de píxel. Las chispas dejan una estela dirigida, la sal ocupa un abanico, el rosario dibuja órbitas y la campana se expande en ondas. El halo puede ser suave; la forma principal debe seguir siendo nítida.

## Components

### Weapon effects

Un ataque comunica salida, recorrido y contacto con su propia forma y una duración breve. Las luces y partículas tienen límites de cantidad y se eliminan al terminar. Los efectos visuales no crean daño ni alteran colisiones. `ritual.js` es el único responsable del daño de las habilidades y del progreso de los faroles; `scene-fx.js` solo los representa.

### Lighting

`Lighting` comparte perfil y transformación entre la apertura en la oscuridad y el halo aditivo. Los perfiles de color se construyen una vez; los fotogramas reutilizan esos lienzos. Las luces fuera de cámara se omiten.

### Rituals and abilities

Los faroles apagados tienen una silueta de hierro y cristal. Al canalizar se dibuja el avance alrededor del pie; al encenderlos aparece una llama estable y el límite de protección. Lumbre usa rayos cálidos, el Cerco de sal un círculo granulado frío y el Responso anillos de nácar. El nombre y la recarga se mantienen visibles en el botón de habilidad.

### Controls and overlays

`style.css` es el propietario de los controles y de la línea base de barras de desplazamiento (`--scroll-*`). Se reutilizan las clases de botón, tarjeta y panel existentes. Las selecciones de personaje tienen semántica de radio y foco itinerante. `interface.js` aísla el fondo y retiene el foco en pausa, elecciones y final; los ajustes y el álbum usan diálogos nativos. `settings.js` conecta una sola vez los controles con preferencias y mezcla de sonido.

### Motion and accessibility

Se respetan los ajustes existentes de temblor y destellos y la preferencia de movimiento reducido que los inicializa desactivados. El combate conserva núcleos y recorridos legibles cuando se reduce su énfasis luminoso. Evitar grandes blancos de pantalla o halos persistentes que oculten criaturas.

## Do's and Don'ts

- **Mantener:** la atmósfera fúnebre, las siluetas y los materiales propios de cada arma.
- **Reutilizar:** una paleta y un renderizador de efectos compartidos para todas las armas y protagonistas.
- **Evitar:** destellos de pantalla añadidos a cada golpe, gradientes nuevos por partícula o efectos sin caducidad.
- **Separar:** reglas de combate en los sistemas de gameplay; el render no avanza ni resuelve la simulación.
- **Respetar:** faroles opcionales, progresión de diez minutos y las identidades de los tres personajes.


## Registro de reconciliación · revisión 2.1

| Regla anterior | Evidencia y decisión | Resultado |
|---|---|---|
| Alcance limitado a efectos, sin cambios de reglas | El nuevo encargo solicita gameplay, sonidos, dibujo y reestructuración; se añaden habilidades y objetivos opcionales. | Alcance actualizado expresamente; las armas iniciales conservan daño y cadencia. |
| HUD sin cambios | Habilidad y canalización necesitan controles y progreso visibles. | Se extienden los controles existentes; no se sustituye la identidad visual. |
| Solo paleta de ataques | La escena añade faroles, sal, huellas y orientación. | `SCENE_PALETTE` concentra sus valores; `ATTACK_PALETTE` sigue siendo propietaria de las armas. |

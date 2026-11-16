---
version: alpha
name: "La última vigilia"
description: "Un camposanto de píxeles junto al mar: la luz de los cirios revela la noche y cada cosa que importa se reconoce por su forma."
colors:
  background: "#07080c"
  paper: "#efe6d4"
  flame: "#ffb04a"
  ember: "#ff742e"
  salt: "#bee0f2"
  sacred: "#eecd81"
  lull: "#f3e3c0"
  soul: "#bcdcff"
  tide: "#081422"
typography:
  display:
    fontFamily: "Alegreya, Georgia, 'Times New Roman', serif"
  body:
    fontFamily: "'Alegreya Sans', system-ui, sans-serif"
omitted:
  - section: spacing
    reason: "La geometría del mundo pertenece a balance.js y world.js; la interfaz conserva style.css."
  - section: rounded
    reason: "El mundo es de píxel recto; la interfaz usa los radios de style.css."
components:
  weaponEffects: {}
  lighting: {}
  cemetery: {}
  wake: {}
  ambient: {}
---

# La última vigilia

## Overview

### Creative North Star

Una vela en un camposanto junto al mar durante la Noche de Difuntos. El fuego, la sal gruesa, el nácar del rosario y el bronce de la campana son materiales concretos; la magia nace de ellos. Los protagonistas y las criaturas conservan su silueta de pixel art.

El combate tiene un pulso frenético: ráfagas de fuego y sal, estrellas de contacto, ondas concéntricas y estelas de esquiva. Los fogonazos se concentran donde ocurre la acción y caducan deprisa para poder leer la siguiente amenaza.

### Product context and register

Juego de supervivencia de diez minutos para navegador, sin dependencias ni recursos externos necesarios para jugar. El contenido y los controles están en español; la ambientación no implica un mercado exclusivo. La fuente de producto es `README.md`, `la-ultima-vigilia/README.md` y `la-ultima-vigilia/story.js`.

La noche gira alrededor del velatorio: cuatro cirios que la Compaña viene a apagar y que quien vela vuelve a encender. Todo lo que el jugador tiene que leer deprisa (un cirio apagado, una procesión que llega, un charco, un difunto con nombre) se distingue por su forma y por su luz, no solo por su color. Lo que es adorno —orballo, hojas, polillas, huellas— nunca cambia las reglas.

**Propiedad de los valores:** el código es la fuente canónica. `la-ultima-vigilia/style.css` contiene los tokens de interfaz y sus tipografías; `la-ultima-vigilia/sprites.js`, la paleta de sprites y sus fotogramas; `ATTACK_PALETTE` en `la-ultima-vigilia/art.js`, la paleta de combate, que pasa a `Lighting.glows` y al renderizador de armas; `la-ultima-vigilia/world.js`, la piedra, la hierba y el mar del camposanto; `la-ultima-vigilia/balance.js`, todas las medidas y los números. Este documento refleja esas fuentes, no genera tokens. `node build.mjs` regenera el HTML autónomo desde los módulos.

## Colors

La noche mantiene su fondo casi negro, el papel marfil y el fuego ámbar. Las chispas usan `ember` con núcleo `#fff2bc`; la sal usa `salt` con núcleo `#f4fbff`; el rosario y la campana usan `sacred` con núcleo `#fff4d8`. El color acompaña a formas distintas para reconocer las armas sin depender solo del tono.

El velatorio tiene su propio lenguaje. Un cirio encendido es ámbar; uno apagado se señala con un aro frío que late y una brasa. Encender dibuja un arco cálido; apagar, uno azulado. El arrullo usa `lull`, un nácar cálido. El alma de Amparo y lo que tira de ella usan `soul`. Los charcos de la marea usan `tide`, con el borde claro para que se adivinen fuera de la luz. Los avisos del velatorio y los nombres de los difuntos usan tonos carne y coral, nunca el rojo puro de la herida.

Las luces de ataque iluminan el terreno próximo. Sus halos se atenúan con el efecto y no sustituyen la vela como principal referencia del jugador. Las lamparillas rojas de las tumbas, los faroles de la cancela y de la escalera y el faro orientan en la oscuridad.

## Typography

Alegreya para títulos y texto narrativo; Alegreya Sans para controles y datos. Se mantienen las alternativas de sistema y el contenido español. Sobre el lienzo solo hay rótulos donde orientan: las flechas hacia lo que queda fuera de la vista y el nombre de los difuntos. Los efectos de combate no llevan texto.

## Layout

El mundo es el Camposanto del Carmen: un recinto con muro del que la cámara no sale, salvo para dejar ver lo que hay al otro lado (al este, el mar y el faro). El velatorio está en el cruce de los dos paseos principales; la ermita, la cancela, el portillo y la escalera del mar cierran cada paseo. Los cuatro cuarteles tienen carácter propio para orientarse sin mapa.

La cámara muestra siempre una porción parecida de mundo: se aleja un 25 % en pantallas pequeñas y se acerca en las grandes a saltos de medio punto, para que el píxel de arte quede entero. Las posiciones de los efectos están en coordenadas del mundo y se proyectan con la misma cámara.

En el HUD, los cirios se muestran bajo el reloj porque son la medida de la noche; la barra del alma solo aparece cuando hace falta. Esquivar y arrullar comparten la esquina inferior derecha. Se conservan los controles de teclado y táctiles y sus zonas seguras.

## Elevation & Depth

De abajo arriba: el suelo, pintado una vez por trozos; el mar; los charcos y las huellas; las losas y lo que va a ras de suelo; después, ordenado por donde pisa, todo lo que tiene altura —cabeceras, cipreses, el ataúd, las criaturas y quien vela—, de modo que se pasa por detrás de un ciprés y por delante de una losa. Encima van el orballo y la niebla, que se dibujan antes que la oscuridad y por eso solo se ven donde hay luz.

La máscara de oscuridad cubre todo lo anterior; las luces la abren y añaden color al suelo con sprites de gradiente cacheados. Los fogonazos pueden tener dirección: `a` orienta y `stretch` alarga su huella entre 1 y 3 veces el radio menor. Por encima de la oscuridad quedan las llamas, lo emisivo de cada sprite, los proyectiles, los avisos de ataque y los rótulos.

## Shapes

Los sprites, las partículas, las huellas y el suelo mantienen bordes de píxel. Las chispas dejan una estela dirigida, la sal ocupa un abanico, el rosario dibuja órbitas y la campana se expande en ondas. Los círculos y las elipses de trazo fino quedan reservados a lo que avisa o mide: el alcance de un ataque, un charco, el corro del arrullo, la cuenta de un cirio. El halo puede ser suave; la forma principal debe seguir siendo nítida.

## Components

### Weapon effects

Un ataque comunica salida, recorrido y contacto con su propia forma y una duración breve. Las luces y partículas tienen límites de cantidad y se eliminan al terminar. Los efectos visuales no crean daño ni alteran colisiones. `ritual.js` es el único responsable del daño de las habilidades y del progreso de los faroles; `scene-fx.js` solo los representa.

`combat-fx.js` comparte los fogonazos de armas, bajas, esquivas y habilidades: como máximo 96 efectos y 24 luces transitorias. Usa la misma `ATTACK_PALETTE` y halos preparados una vez. El modo sin destellos suprime las ráfagas decorativas nuevas y conserva las señales necesarias para jugar. `PACE` en `balance.js` gobierna velocidad, cadencia, recarga de esquiva, proyectiles y reposición de hordas; `memories.js`, `weapons.js` y `director.js` consumen esos valores. El reloj sigue durando diez minutos y los avisos de ataques mantienen su tiempo de reacción.

### Lighting

`Lighting` comparte perfil y transformación entre la apertura en la oscuridad y el halo aditivo. Los perfiles de color se construyen una vez; los fotogramas reutilizan esos lienzos. Las luces fuera de cámara se omiten.

### Cemetery

`Cemetery` pinta el suelo una vez por trozos a resolución de píxel de arte y prepara cada pieza —cabeceras, cruces, cipreses, la ermita, el cruceiro, el faro— como un lienzo pequeño que se reutiliza. Las piezas se colocan con azar fijo: el camposanto es siempre el mismo. Lo plano se dibuja con el suelo; lo que tiene altura se ordena con las criaturas.

### The wake

Los cirios son a la vez decorado, vida y marcador. Su estado se lee en tres sitios que deben coincidir siempre: la llama sobre el cirio, su icono bajo el reloj y la flecha hacia Amparo cuando queda fuera de la vista, que se enciende y parpadea si está a oscuras.

### Ambient

El orballo, las hojas, las polillas de los cirios y las huellas del suelo (sal, cera, ceniza, plumas, paja) dan tiempo y lugar. Tienen un máximo fijo, caducan solos y se pueden apagar en los ajustes.

### Motion and accessibility

Se respetan los ajustes de temblor, destellos y orballo, y la preferencia de movimiento reducido que los inicializa desactivados. El combate conserva núcleos y recorridos legibles cuando se reduce su énfasis luminoso; las siluetas múltiples de esquiva solo aparecen con destellos activados. Las criaturas se animan con pocos fotogramas y sin parpadeos de pantalla. Las ráfagas de combate son locales: evitar grandes blancos de pantalla o halos persistentes que oculten criaturas.

## Do's and Don'ts

- **Mantener:** la atmósfera fúnebre, las siluetas y los materiales propios de cada arma.
- **Mantener:** que el estado de los cirios se lea igual en el mundo, en el HUD y en la flecha.
- **Reutilizar:** una paleta y un renderizador de efectos compartidos para todas las armas y protagonistas; piezas del camposanto preparadas una vez.
- **Evitar:** destellos de pantalla añadidos a cada golpe, gradientes nuevos por partícula o efectos sin caducidad ni máximo.
- **Evitar:** que un adorno cambie el daño, las colisiones o lo que se alcanza a ver de una amenaza.
- **Evitar:** texto sobre el lienzo que no oriente; lo narrativo va en los subtítulos y en los letreros.

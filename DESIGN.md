---
version: alpha
name: "La última vigilia"
description: "Un atrio de piedra de noche: la luz de los cirios y de cada golpe revela la ronda, y cada cosa que importa se reconoce por su forma y su color de rareza."
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
  hp: "#e0483a"
  xp: "#7fd28a"
  wax: "#ffc46a"
  tier1: "#c9c2b8"
  tier2: "#6fa7ff"
  tier3: "#c27bff"
  tier4: "#ff6b5a"
typography:
  display:
    fontFamily: "Alegreya, Georgia, 'Times New Roman', serif"
  body:
    fontFamily: "'Alegreya Sans', system-ui, sans-serif"
omitted:
  - section: spacing
    reason: "La geometría del mundo pertenece a balance.js y arena.js; la interfaz conserva style.css."
  - section: rounded
    reason: "El mundo es de píxel recto; la interfaz usa los radios de style.css."
components:
  weaponRing: {}
  lighting: {}
  arena: {}
  wake: {}
  ambient: {}
---

# La última vigilia

## Overview

### Creative North Star

Una vela en el atrio de una ermita gallega durante la Noche de Difuntos, ronda tras ronda. El fuego, la sal gruesa, el nácar del rosario, el bronce de la campana, la paja del espantajo y el agua bendita son materiales concretos; la magia nace de ellos. Quien vela y lo que viene conservan su silueta de pixel art.

### Product context and register

Supervivencia por rondas para navegador, en la familia de los juegos de arena con armas automáticas y tienda entre oleadas, con identidad propia: el velatorio de Amparo, la Santa Compaña, el folclore gallego y la curandera Remedios. Sin dependencias ni recursos externos necesarios para jugar. El contenido y los controles están en español.

**Propiedad de los valores:** el código es la fuente canónica. `style.css` contiene los tokens de interfaz (incluidos los colores de rareza); `sprites.js` y `sprites-extra.js`, la paleta de sprites y sus fotogramas; `ATTACK_PALETTE` en `art.js`, la paleta de combate; `arena.js`, la piedra y la hierba del atrio; `balance.js`, todas las medidas y los números. Este documento refleja esas fuentes.

## Principios de juego

- **Leer en una fracción de segundo.** Todo lo que hiere avisa antes: marca roja en el suelo antes de aparecer, banda roja de embestida, círculo que se llena antes del rayo, aro dorado de la cruz de la Guía, flechas en el borde por donde entra una procesión.
- **Cada golpe se siente.** Destello blanco y aplastamiento de la criatura, número de daño (dorado y más grande si es crítico), luz en el punto de contacto, una pausa de impacto mínima en los críticos y al recibir daño, temblor en explosiones y golpes fuertes. Todo se puede reducir en Ajustes.
- **Agilidad.** Quien vela arranca y frena con una inercia muy corta, se inclina al moverse y deja estela al esquivar; la cámara se adelanta un poco hacia donde vas.
- **La luz es información.** La oscuridad envuelve el atrio, pero los faroles, los cirios, cada proyectil, cada explosión y la propia vela abren la noche. Lo que brilla es lo que importa.
- **La progresión se ve.** La barra de experiencia se llena gota a gota y destella al subir de nivel; los recuerdos pendientes y las ofrendas se acumulan como insignias junto a la cera; la barra de ronda y la de la noche avanzan a la vez.

## Colors

Fondo casi negro, papel marfil y fuego ámbar. Vida en rojo con un fantasma claro que se vacía con retraso; experiencia en verde con brillo; la cera, en ámbar cálido. Las rarezas tienen un color fijo que se repite en cartas, ofertas, huecos de arma, objetos y el álbum: gris (I), azul (II), violeta (III), rojo (IV). Los ataques usan `ember`, `salt` y `sacred` con núcleo claro; las criaturas del agua y las ánimas, azules; los avisos de peligro, rojo coral.

## Typography

Alegreya para títulos y texto narrativo; Alegreya Sans para controles y datos; Alegreya Sans SC para etiquetas. Los números de daño usan una monoespaciada gruesa con contorno oscuro para leerse sobre cualquier fondo.

## Layout

El atrio es un rectángulo enlosado (1520 × 1000 unidades) con muro bajo, faroles en las esquinas y los lados, y una rosa de piedra en el centro. Al norte, el pórtico con el ataúd de Amparo y sus cuatro cirios; fuera del muro, cipreses, sepulturas con lamparillas y el pinar. La cámara sigue a quien vela con un pequeño adelanto y no sale del recinto más que para enseñar el pórtico.

El HUD deja el centro libre: arriba a la izquierda, vida, experiencia y cera; arriba en el centro, ronda, cuenta atrás, reloj y las barras de ronda y de noche; arriba a la derecha, bajas y pausa; abajo a la izquierda, las armas con su color de rareza; abajo a la derecha, habilidad y esquiva. Entre rondas, las capas (recuerdos, ofrenda, tienda) ocupan la pantalla.

## Elevation & Depth

De abajo arriba: el suelo, pintado una vez; zonas (agua bendita, sal, red, charcos); huellas y marcas de aparición; la cera en el suelo; después, ordenado por donde pisa, todo lo que tiene altura —piezas del camposanto, criaturas, quien vela y sus armas, construcciones—. Encima van el orballo y la niebla, luego la máscara de oscuridad con sus luces, y por encima de ella las llamas, lo emisivo, los proyectiles, los efectos, los avisos, los anillos y los números.

## Components

### Armas en corro

Hasta seis armas se reparten alrededor de quien vela. Las que apuntan giran hacia su objetivo y retroceden al disparar; las de cuerpo a cuerpo salen hacia la criatura (estocada) o barren un arco con un abanico claro; las que no apuntan (vela, campanilla, botafumeiro) se quedan derechas y se mecen. El nivel del arma se ve en su color.

### Lighting

`Lighting` comparte perfil y transformación entre la apertura en la oscuridad y el halo aditivo. Los perfiles de color se construyen una vez; cada fotograma reutiliza esos lienzos. Las luces fuera de cámara se omiten y las de criaturas se limitan a las más cercanas.

### The wake

El ataúd y los cirios están en el pórtico: dan luz y lugar, no reglas. La Guía llega en la última ronda y, mientras no se la libere, el reloj de la torre se detiene.

### Motion and accessibility

Se respetan los ajustes de temblor, destellos, números, orballo y penumbra, y la preferencia de movimiento reducido, que inicializa temblor y destellos apagados. Reducir efectos conserva el daño, las colisiones y todos los avisos.

## Do's and Don'ts

- **Mantener:** la atmósfera fúnebre y gallega, las siluetas y los materiales propios de cada arma.
- **Mantener:** que cada ataque enemigo tenga un aviso visible antes de herir.
- **Mantener:** un color por rareza en toda la interfaz.
- **Evitar:** efectos sin caducidad ni máximo; gradientes nuevos por partícula.
- **Evitar:** que un adorno cambie el daño, las colisiones o lo que se alcanza a ver de una amenaza.
- **Evitar:** contenido de relleno: cada arma y cada objeto tiene que hacer algo reconocible.

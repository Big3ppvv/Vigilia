# La última vigilia

Juego de supervivencia con ataques automáticos y pixel art de horror cósmico. Resiste diez minutos en el cementerio de Arkham, recoge experiencia y combina ocho mejoras. Incluye tres investigadores y nueve tipos de enemigos, incluido el jefe final.

## Jugar

Abre `la-ultima-vigilia.html` directamente en un navegador moderno. Es la versión independiente del juego; las fuentes web son opcionales y usan fuentes alternativas sin conexión.

Para ejecutar la versión modular, desde esta carpeta:

```sh
python3 -m http.server 8000
```

Abre <http://localhost:8000>. No requiere instalar dependencias ni compilar.

## Controles

- **WASD o flechas:** moverse.
- **Espacio:** esquivar.
- **P o Esc:** pausar o continuar.
- **Pantalla táctil:** arrastra sobre el campo de juego y usa el botón de esquivar.

Los ataques son automáticos. Recoge los fragmentos verdes para subir de nivel y elegir mejoras.

## Archivos

- `index.html`, `style.css` y `app.js`: interfaz, grimorio y crónicas locales.
- `game.js`: combate, oleadas, experiencia y mejoras.
- `art.js`: sprites y escenario dibujados por código.
- `icon.svg`: icono del juego.
- `la-ultima-vigilia.html`: versión independiente en un único archivo.

Las crónicas y las preferencias se guardan en el navegador mediante `localStorage`.

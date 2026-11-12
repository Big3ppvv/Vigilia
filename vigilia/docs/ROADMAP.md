# Hoja de ruta

## Lección de la versión 0.1

La 0.1 se verificó con rigor en todo lo fácil de medir (corrección, determinismo, rendimiento) y en nada de lo que decide si un juego es bueno. Su hoja de ruta apuntaba a 16 personajes, 10 biomas, 500 objetos, 120 enemigos y 30 jefes. La primera persona que la jugó dijo que no le gustó nada.

Conclusiones que gobiernan esta hoja de ruta:
1. **Ninguna fase avanza sin jugarla con personas.** El bot sirve para detectar roturas y comparar estrategias, no para medir si algo emociona.
2. **El alma no escala con la cantidad.** Antes que más contenido: que lo que hay diga algo.
3. **La infraestructura ya basta** (pruebas, CI, determinismo, estrés). No se amplía hasta que el juego lo pida.

## 0.2 «Una noche» — hecho (esta versión)
Reestructura completa de identidad y bucle. Detalle en [`DESIGN.md`](DESIGN.md).
- Cada partida es una noche: voz de quien vela, Arrullo, cuenta atrás, despertar.
- La luz es la vida; somnolencia, latido, susurros.
- Velas votivas como objetivo de sala; polillas que las apagan; refugio de luz.
- Sin monedas, llaves, bombas ni tienda; la Cabecera cobra llama máxima.
- Recuerdos en lugar de reliquias; dos estilos de piso; ovejas de la cuenta.
- La nana por capas; menú-habitación; hoja de enfermería.
- 86 pruebas en verde, partidas con bot, estrés sin regresión. Ver [`TEST_REPORT.md`](TEST_REPORT.md).

## 0.3 — Prueba con personas (siguiente; bloquea todo lo demás)
**Objetivo:** saber si la reestructuración funciona, con datos, no con intuición.

Protocolo (5 personas, al menos 3 que no conozcan el proyecto; 20-30 min cada una, sin ayuda):
1. Grabar pantalla y voz pensando en alto. No explicar nada.
2. Medir: ¿entienden las velas sin la pista?, ¿cuántas salas despiertan con luz?, ¿dónde mueren?, ¿leen la intro o la saltan?, ¿la penumbra frustra o atrae?, ¿vuelven a jugar una segunda noche sin que se lo pidan?
3. Preguntar al final solo tres cosas: qué recuerdan, qué les molestó, qué esperaban que pasara al despertar.

Criterio de salida: al menos 3 de 5 juegan una segunda noche por su cuenta, y la mayoría enciende velas a propósito. Si no se cumple, se corrige el bucle antes de añadir nada.

Ajustes previstos según resultados (no antes): tiempo de encendido, radio de luz por llama, intensidad por defecto de la penumbra, frecuencia de los susurros, curación por sala.

## 0.4 — Profundizar lo que funcione
Solo lo que la prueba con personas respalde. Candidatos:
- **Más velas con carácter**: velas que se apagan solas, velas que hay que proteger hasta el final, salas donde la luz es el único modo de ganar.
- **La voz de fuera reacciona**: frases según lo que pasó la noche anterior (dónde moriste, qué recordaste).
- **Tercer piso, el Párpado**: el umbral del despertar, donde la habitación real se filtra del todo.
- **Final alternativo** si te quedas dormido a propósito ante Madre Cirio.

## Fuera de alcance por ahora
Multijugador, editores, localización, guardado a mitad de partida, repeticiones, más personajes. Se reconsideran cuando haya un núcleo que la gente quiera repetir.

## Riesgos conocidos
- **La penumbra puede frustrar** a quien no la busque. Mitigación: intensidad regulable en Ajustes → Vídeo; alto contraste la suaviza; ojos y disparos siempre luminosos.
- **El texto puede saltarse.** La narrativa no debe depender de leer: por eso la luz, la música y el latido cuentan lo mismo sin palabras.
- **Equilibrio medido solo con bot.** Ver la advertencia de [`TEST_REPORT.md`](TEST_REPORT.md).

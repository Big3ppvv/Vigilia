# Interacción de La última vigilia

La identidad visual se mantiene en [DESIGN.md](DESIGN.md). Las reglas y recompensas pertenecen a `story.js`, `balance.js`, `arsenal.js`, `items.js` y a los sistemas descritos en [ARCHITECTURE.md](ARCHITECTURE.md).

## Estados y acciones

| Estado | Acciones | Resultado |
|---|---|---|
| Título | Elegir persona, arma inicial y dificultad; velar; continuar; álbum, noches, ajustes, ayuda | Empieza una partida limpia o se recupera la guardada en la tienda |
| Ronda (`running`) | Moverse, esquivar, habilidad, pausa | La cuenta atrás avanza; las armas atacan solas |
| Fin de ronda (`roundEnd`) | Esperar 1,7 s | Las criaturas se deshacen, la cera del suelo se funde, cosecha e intereses |
| Recordar (`levelup`) | Elegir una de cuatro cartas (1-4 o clic); pensar otra cosa (R) | Suma la estadística; se repite por cada nivel ganado |
| Ofrenda (`crate`) | Quedársela (1) o dejarla por cera (2) | Añade el objeto o la cera |
| Puesto de Remedios (`shop`) | Comprar (1-4 o clic), volver a tirar (R), candado, vender, juntar, seguir | La partida se guarda al entrar; «Seguir velando» abre la ronda siguiente |
| Pausa | Seguir velando, ajustes, ayuda, dejar la vigilia | Congela reglas y recargas; muestra armas, objetos y estadísticas |
| Alba / caída | Esperar el desenlace | Muestra el resultado y lo guarda una sola vez |
| Final (`ended`) | Volver a velar, otra persona, álbum | Reinicia todo lo de la partida; avisa de lo desbloqueado |

La disponibilidad de habilidad y esquiva se comunica con relleno de recarga y botones desactivados. Las ofertas que no se pueden comprar dicen por qué («Falta cera», «Sin hueco»). Las armas que se pueden juntar llevan un «+».

## Foco y teclado

- La selección de persona usa un grupo de radios con una sola parada de Tab, flechas y Home/End. Las personas bloqueadas muestran cómo se desbloquean.
- Recuerdos, ofrenda, tienda, pausa y final aíslan el fondo y contienen Tab y Mayús+Tab. Los diálogos usan `<dialog>` y restauran el foco al cerrarse.
- Abrir un diálogo mientras se juega pausa la partida.
- Los atajos respetan campos, composición de texto y combinaciones del navegador. Los botones táctiles devuelven el foco al lienzo.
- Perder el foco o cambiar de pestaña pausa una partida manual.

## Sonido, persistencia y movimiento

La mezcla conserva volumen general, música, ambiente y efectos. El juego continúa sin Web Audio, sin red o sin almacenamiento. Los datos usan el prefijo `vigilia3.`; los ajustes de `vigilia2.` se leen si no hay nuevos.

La preferencia de movimiento reducido desactiva por defecto temblor y destellos. Reducir efectos conserva daño, colisiones, avisos de ataque, controles y progreso. Las capas se desplazan cuando no caben y respetan las áreas seguras del dispositivo.

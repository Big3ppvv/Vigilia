# Interacción de La última vigilia

La identidad visual se mantiene en [DESIGN.md](DESIGN.md). Las reglas y recompensas pertenecen a `story.js`, `balance.js` y a los sistemas descritos en [ARCHITECTURE.md](ARCHITECTURE.md).

## Estados y acciones

| Estado | Acciones | Resultado |
|---|---|---|
| Título | Elegir personaje, velar, consultar álbum/ayuda/ajustes | Comienza una noche limpia; las noches guardadas se conservan |
| Jugando | Moverse, esquivar, habilidad, detenerse en faroles, pausa | Las recargas y el progreso proceden de la simulación |
| Recuerdo | Elegir una de tres cartas con botón o 1/2/3 | Aplica la mejora y devuelve foco al juego |
| Pausa | Seguir velando, ajustes, ayuda, dejar la vigilia | Congela reglas y recargas; seguir devuelve foco al juego |
| Amanecer / derrota | Esperar el desenlace | Muestra resultado y guarda la noche una sola vez |
| Resultado | Volver a velar o elegir otra persona | Reinicia habilidades, faroles, entidades y efectos |

La disponibilidad de habilidad y esquiva se comunica con texto de recarga y botones desactivados. Un farol es opcional y nunca bloquea el amanecer. El progreso se muestra tanto en el escenario como en el HUD. Los límites dibujados de protección coinciden con el alcance de las reglas.

## Foco y teclado

- La selección de personaje usa un grupo de radios con un solo punto de tabulación, flechas y Home/End.
- Pausa, elección y resultado aíslan el fondo y contienen Tab y Mayús+Tab. Los diálogos del álbum, registros, ayuda y ajustes usan `<dialog>` y restauran el foco al cerrarse.
- Abrir ajustes mientras se juega pausa la partida. Cerrarlos mantiene la pausa para que se reanude expresamente.
- Los atajos respetan campos, composición de texto, controles nativos y combinaciones del navegador. Los botones táctiles devuelven foco al Canvas para continuar con teclado.
- Perder foco o cambiar de pestaña pausa una partida manual. Los bots de prueba pueden continuar.

## Propietarios compartidos

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Scrollbar | `style.css`, reglas globales y `--scroll-*` | `DESIGN.md` | Paneles y pantalla de título; colores del sistema en contraste forzado | Inspección móvil y escritorio |
| Toast | `toast()` en `app.js`, región `role=status` | `index.html` y `style.css` | Información de sonido/pantalla completa | Pruebas de interfaz |

`interface.js` posee el aislamiento de capas y el ciclo de Tab; `app.js` conserva los ajustes y la persistencia más recientes, incluidos rincones y élites. Arrullar usa E/Q y la habilidad de personaje usa R. No se duplican reglas de habilidad o progreso en la interfaz.

## Sonido, persistencia y movimiento

La mezcla conserva volumen general, música, ambiente y efectos en el navegador. La integración mantiene el mezclador y el limitador de audio recientes de main. El juego continúa sin Web Audio, sin red o sin almacenamiento disponible. Los datos `vigilia2.` siguen siendo compatibles.

La preferencia de movimiento reducido desactiva por defecto temblor y destellos. Reducir efectos conserva daño, colisiones, información de ataques, controles y progreso. Los paneles pueden desplazarse y los controles respetan las áreas seguras del dispositivo.

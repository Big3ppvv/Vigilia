# VIGILIA — documento de diseño (v0.2, «Una noche»)

> **Vigilia** significa dos cosas: estar despierto y *velar* a alguien. El juego trata de las dos.

## 1. Por qué se reestructuró

La versión 0.1 funcionaba (73 pruebas, CI, determinismo) pero **no decía nada**. Su estructura era la de un clon reconocible del género: rejilla de salas, contador de monedas, llaves y bombas, tienda, sala secreta que se abre con bombas, corazones, objeto activo con cargas por sala. El tema —un sueño, una vela, alguien que no despierta— vivía en los textos de sabor y en ningún verbo. La primera persona que lo jugó dijo que no le gustó nada.

Diagnóstico: el problema no era técnico ni de pulido. Era de **identidad**: las mecánicas no expresaban el tema, la presentación era una hoja de cálculo (porcentajes en pantalla, números de daño, jerga de rareza) y no había ningún momento escrito.

## 2. Premisa

Hace mucho que no despiertas. Cada noche alguien se sienta junto a tu cama, te habla y deja **una vela encendida en la mesita**. Dentro del sueño, tú eres esa llama: lo único que sigue despierto. El sueño —**el Arrullo**— no es malvado: quiere que descanses, que dejes de luchar, que te duermas para siempre.

- **Cada partida es una noche.** Empieza con la voz de quien vela, sobre negro, con el pitido del monitor. Se numera («Noche 7»).
- **Apagarse es dormirse.** El Arrullo cuenta hacia atrás («Diez. Nueve. Ocho…») y la voz de fuera se despide: «Mañana vuelvo». La siguiente partida es, literalmente, la noche siguiente.
- **Ganar es despertar.** Fundido a blanco: la habitación real, la vela en la mesita, alguien dormido en la silla con una mandarina a medio pelar.

La relación es deliberadamente ambigua (la voz menciona a «mamá», así que probablemente es un hermano o hermana) y **la Espina no tiene género**: todos los textos usan construcciones neutras.

## 3. Pilares (mecánica = tema)

| Pilar | Qué es | Por qué tiene alma |
|---|---|---|
| **La luz es la vida** | La vida es una llama: su tamaño, su luz y lo que alcanzas a ver dependen de cuánta te queda. Con poca llama se enfría hacia el azul, tiembla, la imagen se desatura y se cierra como unos párpados, suena el latido y el Arrullo susurra («Aquí no duele.»). | Perder vida se *siente* como dormirse, no como bajar un contador. |
| **Las velas votivas** | Cada sala de combate está dormida (penumbra real) y esconde 2-3 velas apagadas. Quedarse junto a una la enciende. Su luz debilita a las sombras y deshace los disparos que pasan junto a la llama. Si todas arden, **la sala despierta**: las sombras se disipan, vuelve la luz, se encienden los apliques. | Ganar una sala es traer luz, no solo matar. Es una elección real (ver §4). |
| **Recordar cuesta luz** | No hay monedas, llaves ni bombas. Los objetos son **recuerdos** del mundo real filtrados por el sueño (mandarinas, unas gafas de leer, una radiografía, el reloj de la enfermera). En la **Cabecera**, la enfermera de noche te deja recordar a cambio de **llama máxima**. | La economía y la ficción son la misma cosa. |
| **El Sueño aprende** | Al bajar de piso, las sombras resisten el tipo de daño que más usaste. Ya no se muestra con porcentajes: el Arrullo lo dice («Ya conozco tu fuego.»). | El sistema sigue siendo el diferencial, pero contado desde dentro. |
| **Dos voces** | La **voz de fuera** (blanco cálido) se cuela al despertar una sala («…aprieta mi mano si me oyes…»). El **Arrullo** (lila) habla cuando te apagas y por boca de los jefes. Madre Cirio, la jefa final, es el amor que asfixia: «Quédate. Te hago una cama de cera, para que no tengas frío.» | El juego tiene alguien a quien volver y algo que te retiene. |

## 4. La decisión de cada sala

Una sala despierta de dos maneras:

- **Por la luz** (encender todas las velas): las sombras restantes se **disipan**. No cuentan como bajas: no activan efectos «al matar» ni sueltan botín propio. A cambio, la luz **siempre deja algo** (ascua o cera) y cada vela encendida es un refugio.
- **Por la fuerza** (no queda ninguna sombra): las velas se encienden solas. Activa todos los efectos de muerte y el botín de cada sombra.

Las **polillas** buscan la luz: si se posan en una vela encendida, la apagan. Proteger una vela es una situación de combate nueva.

**Medición (bot de pruebas, 6 semillas fijas):** sin encender velas gana 3/6; encendiéndolas cuando no tiene una sombra encima, 5/6. La primera versión de la mecánica era una trampa (1/6) y se corrigió: encender tarda 0,85 s (antes 1,15 s), la luz deshace disparos cercanos y despertar con luz garantiza recompensa. El bot apunta mejor que una persona y no le afecta la penumbra: estas cifras comparan estrategias, no miden la dificultad humana.

## 5. Bucles

| Escala | Bucle |
|---|---|
| Segundos | Leer telegrafiados en la penumbra (ojos que brillan, disparos luminosos) → esquivar (rozar un disparo = Lucidez, 3 críticos) → disparar brasas → decidir si te acercas a una vela. |
| Sala (30-60 s) | Entras en una sala dormida → luchas y/o enciendes velas → la sala despierta (luz, acorde en re mayor, a veces la voz de fuera) → recompensa. |
| Piso (5-8 min) | Explorar el grafo → tesoros (elegir 1 de 2 recuerdos) → la Cabecera (recordar a cambio de llama) → muros agrietados que dejan escapar luz (ceden a tus brasas) → jefe. |
| Noche (~10-15 min) | La capilla de cera → interludio con la voz → la sala (el hospital soñado) → Madre Cirio → despertar. |
| Entre noches | La habitación (menú) cuenta las noches. La hoja de enfermería resume cada una. El historial guarda las noches anteriores. |

## 6. Contenido

- **Pisos**: *La capilla de cera* (losas, ladrillo, velas; jefe: el Campanero Mayor, «Las doce. Aquí siempre son las doce.») y *La sala* (baldosas, taquillas, cortinas, luz de luna, puertas batientes; jefa: Madre Cirio, «La que arropa»).
- **Sombras**: Mecha, Plañidera, Gotera, Campanero, Relicario, Polilla (apaga velas) y **Oveja de la cuenta**: las ovejas que cuentas para dormirte, numeradas a lo largo de la noche; saltan como una valla y sueltan «z» que dan *sopor* (te frenan y encogen tu luz).
- **Recuerdos**: 43 (39 heredados con nombre y texto nuevos, 4 nuevos que enganchan con las velas: Mandarinas, Reloj de la enfermera, Dibujo con ceras, La radio de la sala). 16 sinergias de conjunto (nuevas: *Lumbre compartida* y *Horario de visitas*).
- **Interfaz**: la habitación del hospital de noche como menú (ventana con luna y lluvia, monitor que late a 66 pulsaciones, una silla con una rebeca, la vela en la mesita con mandarinas y un vaso de agua); hoja de enfermería al terminar; HUD de llamas en lugar de corazones.
- **Música**: una nana original en re menor, 3/4, a 66 pulsos (el ritmo del monitor), sintetizada por código en capas: pad, caja de música y latido. Con poca llama la caja de música sube: el sueño te canta. Al morir, la nana se ralentiza y baja de tono hasta el silencio.

## 7. Lo que se descartó y por qué

| Descartado | Motivo |
|---|---|
| Monedas, llaves, bombas, tienda | Firma de otro juego; no expresaban nada del tema. |
| Porcentajes de Tolerancia en el HUD | Convertían el sistema más original en una hoja de cálculo. |
| Destello rojo al recibir daño | La llama no sangra: titila. Ahora la imagen se oscurece y se enfría. |
| Hoja de ruta hacia 500 objetos, 120 enemigos, 30 jefes | El alma no sale de la cantidad. Ver ROADMAP. |

## 8. Arquitectura
Sin cambios de fondo: contenido en JSON validado al arrancar, motor de efectos por etiquetas, simulación determinista por flujos de RNG, presentación separada. Detalle en [`ARCHITECTURE.md`](ARCHITECTURE.md).

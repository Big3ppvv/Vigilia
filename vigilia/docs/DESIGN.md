# VIGILIA — La Espina del Durmiente
## Documento de diseño (Fase 1)

> Este documento distingue explícitamente entre lo **implementado y verificado** (marcado ✅) y lo **diseñado pero pendiente** (marcado 🔜). Nada de lo marcado 🔜 existe todavía en el juego.

---

## 1. Nombre e identidad

**VIGILIA** — *La Espina del Durmiente*. Roguelite 2D top-down de acción, exploración y construcción de builds.

### Premisa
Algo inmenso duerme, y su sueño es un mundo: **el Somnario**, una catedral-organismo de cera, carne y memoria estratificada en capas. Tú eres **la Espina**: una astilla de lucidez clavada en ese sueño, la única cosa despierta en él. El sueño intenta **arrullarte** hasta disolverte; sus defensas son criaturas hechas de nanas, duelo y cera.

### Interpretaciones (deliberadamente ambiguas)
1. **La infección**: eres un cuerpo extraño; matar al Durmiente es tu naturaleza.
2. **La última lucidez**: eres el pensamiento que intenta despertar a alguien en coma (pistas: una ventana, una silla junto a la cama, una voz que cuenta hasta diez, un latido que marca el ritmo de los jefes).
3. **El duelo**: el Durmiente sueña con alguien que perdió; tú eres el recuerdo que se niega a ser olvidado.

La historia se reconstruye con fragmentos: textos de reliquias, inscripciones de salas secretas, epitafios de la pantalla de muerte, lore de enemigos y el texto del final. ✅ (fragmentos presentes en `data/lore.json`, `items.json`, `enemies.json`)

### Estética
Oscura, surrealista y grotesca, pero legible: cera derretida, penumbra violácea, latón, luz de vela. Todo el arte de la Fase 1 es **procedural y original** (dibujado por código), sustituible por sprites sin tocar la lógica. ✅

### Finales
- ✅ **El Párpado se abre** (final funcional de la Fase 1, tras Madre Cirio).
- 🔜 *Despertar* (el mundo termina), *Arrullo* (te disuelves y desbloqueas un personaje), *Vigilia eterna* (te conviertes en el nuevo Durmiente) y finales secretos ligados a la ruta y a la Tolerancia acumulada.

---

## 2. Concepto central y diferencial

La complejidad debe surgir de **interacciones reales**, no de una lista de rasgos aislados. Cuatro pilares lo concretan:

| Pilar | Qué es | Estado |
|---|---|---|
| **Motor de efectos por etiquetas** | Cada reliquia es *disparador → filtro → acciones* en datos. Las acciones generan eventos con etiquetas que otras reliquias escuchan. Ninguna combinación está programada a mano. | ✅ verificado con 12 pruebas |
| **Tolerancia del Sueño** | El mundo *aprende* de ti: al bajar de piso, los enemigos resisten las etiquetas que dominaron tu daño y se vuelven vulnerables a las que nunca usaste. Ninguna build monotemática es óptima para siempre; pivotar se recompensa sistémicamente. | ✅ verificado (pruebas + HUD) |
| **Lucidez** (mecánica de personaje) | Rozar un proyectil enemigo durante la esquiva carga críticos garantizados: la habilidad del jugador se convierte en daño. | ✅ verificado |
| **Decisiones irreversibles legibles** | Las reliquias se toman con *Interactuar* tras leerlas; algunos pedestales son "elige una" y el resto se desvanece. Pactos que cuestan vida. Objetos activos que se intercambian. | ✅ |

**Diferencia frente a los referentes**: Isaac apila efectos con reglas ad hoc por combinación; aquí las combinaciones son consecuencia de una gramática común (etiquetas + eventos + profundidad), y el mundo reacciona a la build (Tolerancia), algo que ninguno de los referentes hace de forma sistémica.

---

## 3. Bucle principal

| Escala | Bucle | Estado |
|---|---|---|
| **Micro** (segundos) | Leer telegrafiados → posicionarse/esquivar (rozar para Lucidez) → disparar → explotar sinergias | ✅ |
| **Sala** (30–60 s) | Entrar → puertas se sellan → aparición telegrafiada → combate → sala despejada → recompensa, carga del activo | ✅ |
| **Piso** (5–8 min) | Explorar grafo no lineal → tesoros/tienda/secretos → decisiones de recursos (llaves, óbolos, bombas) → guardián → Párpado | ✅ |
| **Partida** (Fase 1: 2 pisos, ~10–15 min humano) | Construir build → el Sueño se adapta → pivotar → jefe final → final | ✅ |
| **Meta** | Historial, totales, descubrimientos (reliquias, sinergias, enemigos) | ✅ parcial; 🔜 desbloqueos, enciclopedia, desafíos |

---

## 4. Mecánicas fundamentales

### Control ✅
WASD moverse · Ratón (clic izq.) o flechas apuntar/disparar · Espacio esquivar · E interactuar · Q objeto activo · F bomba · Tab inventario/mapa · Esc pausa. Todo remapeable y persistente; mando con asignaciones fijas.

### Estadísticas ✅
27 estadísticas con límites, enteras o continuas. Orden de operaciones canónico: `((base + Σplano) × (1 + Σ%) × Π mult) + Σfinal`, luego acotado. Modificadores permanentes, temporales, condicionales y escalables (p. ej. "+3 % de daño por óbolo, máx. 45 %").

### Combate ✅
Proyectiles con perforación, rebote, teledirección, división, ondulación, caída de daño, estados al impactar; explosiones con fuego amigo opcional; críticos; empuje; armadura (plana y direccional); escudos; invulnerabilidad; *hitstop* y sacudida configurables.

### Estados y reacciones ✅
Veneno (acumula), Quemadura, Sangrado (más daño si el objetivo se mueve), Escarcha (ralentiza movimiento **y** acciones, incluidos temporizadores de jefes), Aturdimiento, Encerado. Reacción por datos: **Escarcha + Quemadura = Choque térmico**.

### Enemigos (6 arquetipos con IA distinta) ✅
| Enemigo | Arquetipo | Rasgo sistémico |
|---|---|---|
| Mecha | Perseguidor | Navega por campo de flujo; embestida telegrafiada que fija dirección |
| Plañidera | Francotiradora | Mantiene banda de distancia; línea de apuntado que se fija antes del disparo |
| Gotera | Saltadora divisible | Se parte al morir; en el piso 2 salpica al aterrizar |
| Campanero | Invocador/apoyo | Endurece con cera a aliados cercanos (escudo); invoca Mechas |
| Relicario | Tanque | Armadura **direccional**: el frente absorbe 75 %, la espalda recibe +35 % |
| Polilla | Voladora | Orbita y se lanza en picado; **se distrae con cualquier cosa que arda** |

Variantes campeonas (5) que cambian el **comportamiento**: estela de fuego, división al morir, velo de invisibilidad, represalia radial, colosal.

### Jefes ✅
- **Campanero Mayor** (guardián del piso 1): mismo script que el Campanero con datos distintos (anillo doble, ráfaga dirigida, furia al 40 %).
- **Madre Cirio** (jefe final): 3 fases, 8 patrones, transformación de arena por fase, reacción al posicionamiento, vulnerabilidad explotable (embestida contra muro = aturdida, ×1,5 daño), reacción al inventario (si llevas una *mecha*, no invoca a sus hijas).

### Economía ✅
Óbolos, llaves (tesoros cerrados en el piso 2), bombas (rompen rocas y revelan muros agrietados), cuentas de vida y de cera (escudos). Tienda con precios por rareza y consumibles sin repetición.

### Secretos ✅
Sala secreta por piso, accesible solo por muros agrietados (pista visual) que se abren con **cualquier** explosión: bombas, o astillas explosivas — interacción emergente entre una reliquia de combate y la exploración.

---

## 5. Arquitectura técnica (resumen)
Godot 4.x · GDScript tipado · contenido 100 % en JSON validado al arrancar · sistemas desacoplados por un bus de eventos (UI) y un motor de efectos con presupuesto (combate) · generación procedural pura y determinista · simulación separada de la presentación · RNG por flujos etiquetados. Detalle completo en [`ARCHITECTURE.md`](ARCHITECTURE.md).

## 6. Estructura de carpetas
Ver [`ARCHITECTURE.md` §Estructura](ARCHITECTURE.md#estructura-de-carpetas).

## 7. Plan de implementación
Ver [`ROADMAP.md`](ROADMAP.md): Fase 1 completada y verificada; fases 2–6 con alcance concreto y criterios de salida.

### Biomas previstos (🔜, solo el primero existe)
1. ✅ Umbral de Cera · 2. Jardín de Pelo · 3. Coro de Pulmones · 4. Biblioteca de Piel · 5. Mercado de Dientes · 6. Claustro de Médula · 7. Mar de Leche Negra · 8. Relojería sin Horas · 9. Corteza Soñante · 10. El Párpado (final).

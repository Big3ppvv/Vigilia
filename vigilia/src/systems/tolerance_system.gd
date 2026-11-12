class_name ToleranceSystem
extends RefCounted
## TOLERANCIA DEL SUEÑO — mecánica diferencial de VIGILIA.
##
## El Durmiente "aprende" de la Espina: se registra cuánto daño haces con cada
## etiqueta mecánica (fuego, veneno, explosión...). Al bajar de piso:
##   - Las etiquetas que superan THRESHOLD de tu daño total generan TOLERANCIA:
##     los enemigos del piso nuevo resisten esa etiqueta (hasta MAX_RES).
##   - Si el sueño se adaptó a algo, las etiquetas que NUNCA usaste se vuelven
##     ALERGIAS: los enemigos reciben +ALLERGY de daño de ellas.
##   - La exposición acumulada decae (DECAY) para que cambiar de estrategia
##     tenga efecto real en pocos pisos.
## Efecto de diseño: ninguna build monotemática es óptima para siempre; pivotar
## (recoger un elemento nuevo) se recompensa de forma sistémica, no por guion.

const TRACKED := ["fire", "poison", "explosion", "ice", "bleed", "summon", "sonic", "blood", "reaction"]
const THRESHOLD := 0.30
const MAX_RES := 0.35
const ALLERGY := 0.15
const DECAY := 0.5
const MIN_SAMPLE := 60.0

const PROSE := {
	"fire": "el fuego", "poison": "el veneno", "explosion": "las explosiones", "ice": "el hielo",
	"bleed": "las heridas", "summon": "a tus muertos", "sonic": "el sonido", "blood": "la sangre",
	"reaction": "las mezclas",
}

const LABELS := {
	"fire": "Fuego", "poison": "Veneno", "explosion": "Explosión", "ice": "Hielo",
	"bleed": "Sangrado", "summon": "Invocación", "sonic": "Sonido", "blood": "Sangre",
	"reaction": "Reacción",
}


## Registra daño infligido por el jugador.
static func record(run: RunState, tags: PackedStringArray, amount: float) -> void:
	if run == null or amount <= 0.0:
		return
	run.exposure["_total"] = float(run.exposure.get("_total", 0.0)) + amount
	for t in tags:
		if t in TRACKED:
			run.exposure[t] = float(run.exposure.get(t, 0.0)) + amount


## Recalcula tolerancias y alergias al entrar en un piso nuevo.
static func recompute_for_new_floor(run: RunState) -> void:
	run.tolerance.clear()
	run.allergies.clear()
	var total := float(run.exposure.get("_total", 0.0))
	if total >= MIN_SAMPLE:
		for t in TRACKED:
			var share := float(run.exposure.get(t, 0.0)) / total
			if share > THRESHOLD:
				run.tolerance[t] = snappedf(minf(MAX_RES, 0.1 + (share - THRESHOLD) * 0.9), 0.01)
		if not run.tolerance.is_empty():
			for t in TRACKED:
				if float(run.exposure.get(t, 0.0)) <= 0.0:
					run.allergies[t] = ALLERGY
	for k in run.exposure.keys():
		run.exposure[k] = float(run.exposure[k]) * DECAY


## Lo que el Sueño aprendió, dicho sin números (pausa y hoja de la noche).
static func prose(tol: Dictionary) -> String:
	if tol.is_empty():
		return ""
	var names: Array = []
	for t in tol:
		names.append(str(PROSE.get(t, LABELS.get(t, t))))
	return "resiste " + ", ".join(names)


static func describe(run: RunState) -> String:
	if run == null or (run.tolerance.is_empty() and run.allergies.is_empty()):
		return ""
	var parts: Array = []
	for t in run.tolerance:
		parts.append("%s −%d%%" % [LABELS.get(t, t), int(round(float(run.tolerance[t]) * 100.0))])
	var txt := "El Sueño tolera: " + ", ".join(parts) if not parts.is_empty() else ""
	if not run.allergies.is_empty():
		var al: Array = []
		for t in run.allergies:
			al.append(LABELS.get(t, t))
		txt += ("  ·  " if txt != "" else "") + "Le duele: " + ", ".join(al)
	return txt

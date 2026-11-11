class_name RunState
extends RefCounted
## Estado completo de una partida (progresión DURANTE la partida).
## Es datos puros: no conoce nodos. Serializable para el historial y para el
## futuro guardado seguro entre pisos.

var seed_string := ""
var seed_int := 0
var generator_version := 0
var character_id := "espina"
var mode := "normal"
var floor_index := 0
var elapsed := 0.0
var kills := 0
var damage_dealt := 0.0
var damage_taken := 0
var rooms_cleared := 0
var items_taken: Array = []
var killed_by := ""
var result := ""
## Decisiones y hechos de la partida (p. ej. "shop_robbed", "spared_x").
var flags := {}
## Objetos ya generados en pedestales: agota los pools sin duplicados.
var seen_items := {}
## Tolerancia del Sueño: daño acumulado por etiqueta y resistencias vigentes.
var exposure := {}
var tolerance := {}
var allergies := {}
## Modificadores para pisos futuros (objetos que alteran la generación).
var floor_modifiers := {}
## Último estado de jugador al cambiar de piso (para continuidad).
var player_snapshot := {}


func setup(seed_text: String, character: String, config: Dictionary = {}) -> void:
	seed_string = SeedUtil.normalize(seed_text)
	seed_int = SeedUtil.seed_to_int(seed_string)
	character_id = character
	mode = str(config.get("mode", "normal"))
	generator_version = DungeonGenerator.VERSION


## Flujo aleatorio de la partida con etiqueta (independiente de los demás).
func stream(label: String) -> RngStream:
	return RngStream.derived(seed_int, label)


## Flujo específico del piso actual.
func floor_stream(label: String) -> RngStream:
	return RngStream.derived(seed_int, "f%d:%s" % [floor_index, label])


func add_floor_modifier(key: String, value: Variant) -> void:
	if typeof(value) == TYPE_INT or typeof(value) == TYPE_FLOAT:
		floor_modifiers[key] = float(floor_modifiers.get(key, 0.0)) + float(value)
	else:
		floor_modifiers[key] = value


func consume_floor_modifier(key: String) -> float:
	var v := float(floor_modifiers.get(key, 0.0))
	floor_modifiers.erase(key)
	return v


func build_summary(res: String, extra: Dictionary = {}) -> Dictionary:
	result = res
	var s := {
		"result": res,
		"seed": seed_string,
		"generator_version": generator_version,
		"character": character_id,
		"floor": floor_index + 1,
		"time": snappedf(elapsed, 0.1),
		"kills": kills,
		"damage_dealt": int(damage_dealt),
		"damage_taken": damage_taken,
		"rooms_cleared": rooms_cleared,
		"items": items_taken.duplicate(),
		"killed_by": killed_by,
		"date": Time.get_datetime_string_from_system(false, true),
		"tolerance": tolerance.duplicate(),
	}
	for k in extra:
		s[k] = extra[k]
	return s

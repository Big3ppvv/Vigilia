extends Node
## SaveManager: perfil persistente versionado (user://profile.json).
##
## Contiene: totales históricos, historial de partidas, descubrimientos
## (objetos, sinergias, enemigos) y desbloqueos.
##
## Robustez:
##   - Escritura atómica con copia .bak (FileUtil.atomic_write_text).
##   - Al cargar: si el archivo principal está dañado se recupera desde .bak;
##     si ambos fallan, se preserva una copia .corrupt y se crea un perfil nuevo.
##   - Migraciones encadenadas por versión (migrate()).

const PROFILE_PATH := "user://profile.json"
const CURRENT_VERSION := 2
const MAX_HISTORY := 100

var profile: Dictionary = {}
## "new" | "ok" | "recovered_from_backup" | "reset_corrupt"
var load_report := ""
var active_path := PROFILE_PATH


func _ready() -> void:
	load_profile()


static func default_profile() -> Dictionary:
	return {
		"version": CURRENT_VERSION,
		"created_unix": int(Time.get_unix_time_from_system()),
		"totals": {
			"runs": 0, "victories": 0, "deaths": 0, "abandoned": 0,
			"kills": 0, "play_time": 0.0, "best_floor": 0, "items_taken": 0,
		},
		"history": [],
		"discovered": {"items": {}, "synergies": {}, "enemies": {}},
		"unlocks": {},
	}


func load_profile(path: String = PROFILE_PATH) -> void:
	active_path = path
	var persist_recovery := false
	var data: Variant = FileUtil.read_json(path)
	if typeof(data) == TYPE_DICTIONARY:
		profile = migrate(data)
		load_report = "ok"
	else:
		var bak: Variant = FileUtil.read_json(path + ".bak")
		if typeof(bak) == TYPE_DICTIONARY:
			profile = migrate(bak)
			load_report = "recovered_from_backup"
			push_warning("SaveManager: perfil dañado; recuperado desde copia de seguridad")
			persist_recovery = true
		elif FileAccess.file_exists(path):
			profile = default_profile()
			load_report = "reset_corrupt"
			push_warning("SaveManager: perfil irrecuperable; se conserva copia .corrupt y se crea uno nuevo")
			persist_recovery = true
		else:
			profile = default_profile()
			load_report = "new"
	_ensure_shape()
	if persist_recovery:
		# No copiar el principal dañado sobre la única copia válida al restaurar.
		if FileAccess.file_exists(path):
			var dir := DirAccess.open(path.get_base_dir())
			if dir != null:
				dir.copy(path, path + ".corrupt")
		save_profile(false)


func save_profile(keep_backup: bool = true) -> bool:
	profile["version"] = CURRENT_VERSION
	return FileUtil.atomic_write_text(active_path, JSON.stringify(profile, "\t"), keep_backup)


## Aplica migraciones encadenadas hasta CURRENT_VERSION.
static func migrate(data: Dictionary) -> Dictionary:
	var v := _nonnegative_int(data.get("version", 1), 1)
	while v < CURRENT_VERSION:
		match v:
			1:
				data = _migrate_v1_to_v2(data)
		v += 1
		data["version"] = v
	return data


## v1 (prototipo): "runs" y "stats". v2: "history" y "totals" + "discovered".
static func _migrate_v1_to_v2(d: Dictionary) -> Dictionary:
	if d.has("runs") and not d.has("history"):
		d["history"] = d["runs"]
		d.erase("runs")
	if d.has("stats") and not d.has("totals"):
		d["totals"] = d["stats"]
		d.erase("stats")
	if not d.has("discovered"):
		d["discovered"] = {"items": {}, "synergies": {}, "enemies": {}}
	return d


## Repara datos anidados antes de que el historial y las estadísticas los usen.
## JSON representa todos los números como float: no comparar sus tipos con int.
func _ensure_shape() -> void:
	var def := default_profile()
	profile["version"] = CURRENT_VERSION
	profile["created_unix"] = _nonnegative_int(profile.get("created_unix"), def["created_unix"])
	for k in ["totals", "discovered", "unlocks"]:
		if typeof(profile.get(k)) != TYPE_DICTIONARY:
			profile[k] = def[k]
	for k in def["totals"]:
		var value: Variant = profile["totals"].get(k)
		profile["totals"][k] = _nonnegative_float(value) if k == "play_time" else _nonnegative_int(value)
	for category in def["discovered"]:
		var entries: Variant = profile["discovered"].get(category)
		var valid := {}
		if typeof(entries) == TYPE_DICTIONARY:
			for id in entries:
				var count := _nonnegative_int(entries[id])
				if typeof(id) == TYPE_STRING and id != "" and count > 0:
					valid[id] = count
		profile["discovered"][category] = valid
	var history: Array = []
	if typeof(profile.get("history")) == TYPE_ARRAY:
		for entry in profile["history"]:
			if typeof(entry) == TYPE_DICTIONARY:
				history.append(_normalized_summary(entry))
				if history.size() == MAX_HISTORY:
					break
	profile["history"] = history


static func _nonnegative_float(value: Variant, fallback: float = 0.0) -> float:
	if typeof(value) != TYPE_INT and typeof(value) != TYPE_FLOAT:
		return fallback
	var number := float(value)
	return maxf(0.0, number) if is_finite(number) else fallback


static func _nonnegative_int(value: Variant, fallback: int = 0) -> int:
	# Convertir solo números finitos; los demás tipos pueden provocar errores.
	return maxi(0, int(_nonnegative_float(value, float(fallback))))


static func _normalized_summary(data: Dictionary) -> Dictionary:
	var summary := data.duplicate()
	for key in ["floor", "kills", "generator_version", "damage_dealt", "damage_taken", "rooms_cleared"]:
		summary[key] = _nonnegative_int(data.get(key))
	summary["time"] = _nonnegative_float(data.get("time"))
	for key in ["result", "seed", "character", "killed_by", "date", "epitaph"]:
		if typeof(data.get(key)) != TYPE_STRING:
			summary[key] = ""
	var items: Array = []
	if typeof(data.get("items")) == TYPE_ARRAY:
		for id in data["items"]:
			if typeof(id) == TYPE_STRING:
				items.append(id)
	summary["items"] = items
	if typeof(data.get("tolerance")) != TYPE_DICTIONARY:
		summary["tolerance"] = {}
	return summary


func record_run(summary: Dictionary) -> void:
	summary = _normalized_summary(summary)
	var totals: Dictionary = profile["totals"]
	totals["runs"] = int(totals["runs"]) + 1
	match str(summary.get("result", "")):
		"victory":
			totals["victories"] = int(totals["victories"]) + 1
		"death":
			totals["deaths"] = int(totals["deaths"]) + 1
		_:
			totals["abandoned"] = int(totals["abandoned"]) + 1
	totals["kills"] = int(totals["kills"]) + int(summary.get("kills", 0))
	totals["play_time"] = float(totals["play_time"]) + float(summary.get("time", 0.0))
	totals["best_floor"] = maxi(int(totals["best_floor"]), int(summary.get("floor", 0)))
	totals["items_taken"] = int(totals["items_taken"]) + summary.get("items", []).size()
	var hist: Array = profile["history"]
	hist.push_front(summary)
	while hist.size() > MAX_HISTORY:
		hist.pop_back()
	save_profile()


func mark_discovered(category: String, id: String) -> bool:
	var d: Dictionary = profile["discovered"].get(category, {})
	if d.has(id):
		d[id] = int(d[id]) + 1
		return false
	d[id] = 1
	profile["discovered"][category] = d
	return true


func is_discovered(category: String, id: String) -> bool:
	return profile["discovered"].get(category, {}).has(id)

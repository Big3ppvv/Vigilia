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
			save_profile()
		elif FileAccess.file_exists(path):
			var dir := DirAccess.open(path.get_base_dir())
			if dir != null:
				dir.copy(path, path + ".corrupt")
			profile = default_profile()
			load_report = "reset_corrupt"
			push_warning("SaveManager: perfil irrecuperable; se conserva copia .corrupt y se crea uno nuevo")
			save_profile()
		else:
			profile = default_profile()
			load_report = "new"
	_ensure_shape()


func save_profile() -> bool:
	profile["version"] = CURRENT_VERSION
	return FileUtil.atomic_write_text(active_path, JSON.stringify(profile, "\t"))


## Aplica migraciones encadenadas hasta CURRENT_VERSION.
static func migrate(data: Dictionary) -> Dictionary:
	var v := int(data.get("version", 1))
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


## Garantiza que todas las claves esperadas existen con el tipo correcto.
func _ensure_shape() -> void:
	var def := default_profile()
	for k in def:
		if not profile.has(k) or typeof(profile[k]) != typeof(def[k]):
			profile[k] = def[k]
	for k in def["totals"]:
		if not profile["totals"].has(k):
			profile["totals"][k] = def["totals"][k]
	for k in def["discovered"]:
		if typeof(profile["discovered"].get(k)) != TYPE_DICTIONARY:
			profile["discovered"][k] = {}


func record_run(summary: Dictionary) -> void:
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

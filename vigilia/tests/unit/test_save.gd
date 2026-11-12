extends TestCase
## Persistencia: ajustes, perfil versionado, recuperación ante corrupción y migraciones.
## Usa rutas de prueba propias para no tocar los archivos reales del jugador.

const SETTINGS_TEST := "user://test_settings.cfg"
const PROFILE_TEST := "user://test_profile.json"

var _saved_values := {}
var _saved_bindings := {}


func before_each() -> void:
	_saved_values = Settings.values.duplicate()
	_saved_bindings = Settings.bindings.duplicate()
	# Aislamiento: nada de lo que hagan estas pruebas toca los archivos reales.
	Settings.active_path = SETTINGS_TEST
	Settings._reset_bindings_to_defaults()
	for suffix in ["", ".bak", ".tmp", ".corrupt"]:
		FileUtil.remove_file(SETTINGS_TEST + suffix)
		FileUtil.remove_file(PROFILE_TEST + suffix)


func after_each() -> void:
	Settings.active_path = Settings.PATH
	Settings.values = _saved_values
	Settings.bindings = _saved_bindings
	Settings.apply_input_map()
	SaveManager.load_profile(SaveManager.PROFILE_PATH)


func test_settings_roundtrip() -> void:
	Settings.values["access/screen_shake"] = 0.25
	Settings.values["access/flashes"] = false
	Settings.values["access/ui_scale"] = 1.25
	Settings.bindings["dodge"] = "key:%d" % KEY_SHIFT
	assert_true(Settings.save_settings(SETTINGS_TEST), "guardado")
	Settings.values = Settings.DEFAULTS.duplicate()
	assert_eq(Settings.load_settings(SETTINGS_TEST), "ok")
	assert_near(float(Settings.values["access/screen_shake"]), 0.25)
	assert_eq(Settings.values["access/flashes"], false)
	assert_near(float(Settings.values["access/ui_scale"]), 1.25)
	assert_eq(Settings.bindings["dodge"], "key:%d" % KEY_SHIFT)


func test_settings_values_are_validated() -> void:
	var f := FileAccess.open(SETTINGS_TEST, FileAccess.WRITE)
	f.store_string("[access]\nui_scale=99.0\nscreen_shake=\"mucho\"\nflashes=0\n[controls]\ndodge=\"basura\"\n")
	f.close()
	assert_eq(Settings.load_settings(SETTINGS_TEST), "ok")
	assert_near(float(Settings.values["access/ui_scale"]), 1.5, 0.0001, "acotado")
	assert_near(float(Settings.values["access/screen_shake"]), 1.0, 0.0001, "tipo inválido => defecto")
	assert_eq(Settings.values["access/flashes"], false, "0 => false")
	assert_eq(Settings.bindings["dodge"], "key:%d" % KEY_SPACE, "asignación inválida => defecto")


func test_settings_corrupt_file_resets() -> void:
	var f := FileAccess.open(SETTINGS_TEST, FileAccess.WRITE)
	f.store_string("[[[ esto no es un ini \u0000 ===")
	f.close()
	assert_eq(Settings.load_settings(SETTINGS_TEST), "reset_corrupt")
	assert_true(FileAccess.file_exists(SETTINGS_TEST + ".corrupt"), "se conserva copia del archivo dañado")
	assert_eq(Settings.values["access/ui_scale"], Settings.DEFAULTS["access/ui_scale"])


func test_rebind_swaps_conflicts() -> void:
	var ev := InputEventKey.new()
	ev.physical_keycode = KEY_E
	var swapped := Settings.rebind("dodge", ev)
	assert_eq(swapped, "interact", "E estaba en interactuar")
	assert_eq(Settings.bindings["dodge"], "key:%d" % KEY_E)
	assert_eq(Settings.bindings["interact"], "key:%d" % KEY_SPACE, "interactuar recibe la tecla antigua")
	assert_true(InputMap.action_has_event("dodge", ev), "InputMap actualizado")


func test_profile_roundtrip_and_backup() -> void:
	SaveManager.load_profile(PROFILE_TEST)
	assert_eq(SaveManager.load_report, "new")
	SaveManager.record_run({"result": "death", "kills": 7, "time": 30.0, "floor": 1, "items": ["a"]})
	SaveManager.record_run({"result": "victory", "kills": 3, "time": 60.0, "floor": 2, "items": []})
	assert_true(FileAccess.file_exists(PROFILE_TEST + ".bak"), "copia de seguridad creada al reescribir")
	SaveManager.load_profile(PROFILE_TEST)
	assert_eq(SaveManager.load_report, "ok")
	var t: Dictionary = SaveManager.profile["totals"]
	assert_eq(int(t["runs"]), 2)
	assert_eq(int(t["kills"]), 10)
	assert_eq(int(t["best_floor"]), 2)
	assert_eq(SaveManager.profile["history"][0]["result"], "victory", "más reciente primero")


func test_profile_corruption_recovers_from_backup() -> void:
	SaveManager.load_profile(PROFILE_TEST)
	SaveManager.record_run({"result": "death", "kills": 5, "time": 10.0, "floor": 1, "items": []})
	SaveManager.record_run({"result": "death", "kills": 5, "time": 10.0, "floor": 1, "items": []})
	var f := FileAccess.open(PROFILE_TEST, FileAccess.WRITE)
	f.store_string("{ \"version\": 2, \"totals\": { roto")
	f.close()
	SaveManager.load_profile(PROFILE_TEST)
	assert_eq(SaveManager.load_report, "recovered_from_backup")
	assert_ge(int(SaveManager.profile["totals"]["runs"]), 1, "datos recuperados")


func test_profile_total_loss_resets_safely() -> void:
	var f := FileAccess.open(PROFILE_TEST, FileAccess.WRITE)
	f.store_string("basura")
	f.close()
	SaveManager.load_profile(PROFILE_TEST)
	assert_eq(SaveManager.load_report, "reset_corrupt")
	assert_true(FileAccess.file_exists(PROFILE_TEST + ".corrupt"))
	assert_eq(int(SaveManager.profile["totals"]["runs"]), 0)


func test_migration_v1_to_v2() -> void:
	var v1 := {"version": 1, "runs": [{"result": "death"}], "stats": {"runs": 1, "kills": 4}}
	var v2 := SaveManager.migrate(v1)
	assert_eq(int(v2["version"]), SaveManager.CURRENT_VERSION)
	assert_true(v2.has("history") and not v2.has("runs"))
	assert_true(v2.has("totals") and not v2.has("stats"))
	assert_true(v2.has("discovered"))
	var f := FileAccess.open(PROFILE_TEST, FileAccess.WRITE)
	f.store_string(JSON.stringify({"version": 1, "runs": [], "stats": {"runs": 3}}))
	f.close()
	SaveManager.load_profile(PROFILE_TEST)
	assert_eq(int(SaveManager.profile["totals"]["runs"]), 3, "migrado al cargar")
	assert_eq(int(SaveManager.profile["totals"]["kills"]), 0, "claves nuevas completadas")


func test_profile_creation_date_survives_json_roundtrip() -> void:
	SaveManager.load_profile(PROFILE_TEST)
	SaveManager.profile["created_unix"] = 1700000000
	SaveManager.save_profile()
	SaveManager.load_profile(PROFILE_TEST)
	assert_eq(SaveManager.profile["created_unix"], 1700000000, "JSON float conserva la fecha original")
	SaveManager.save_profile()
	SaveManager.load_profile(PROFILE_TEST)
	assert_eq(SaveManager.profile["created_unix"], 1700000000, "estable en cargas sucesivas")


func test_profile_repairs_nested_types_before_use() -> void:
	var malformed := {
		"version": [], "created_unix": {},
		"totals": {"runs": [], "kills": "muchos", "play_time": null, "best_floor": -5},
		"history": [null, 4, "roto", {"result": [], "floor": {}, "kills": null, "time": [], "items": {}, "seed": null}],
		"discovered": {"items": {"wax": 2.0, "broken": [], "negative": -1}, "enemies": []},
	}
	assert_true(FileUtil.atomic_write_text(PROFILE_TEST, JSON.stringify(malformed)))
	SaveManager.load_profile(PROFILE_TEST)
	assert_eq(SaveManager.profile["history"].size(), 1, "se descartan entradas ajenas a un resumen")
	var entry: Dictionary = SaveManager.profile["history"][0]
	assert_eq(entry["floor"], 0)
	assert_eq(entry["seed"], "")
	assert_eq(entry["items"], [])
	assert_eq(SaveManager.profile["discovered"]["items"], {"wax": 2})
	assert_eq(SaveManager.profile["discovered"]["enemies"], {})
	SaveManager.record_run({"result": "death", "kills": 3, "time": 5.0, "floor": 1, "items": []})
	assert_eq(SaveManager.profile["totals"]["runs"], 1, "el perfil reparado permite terminar una partida")
	assert_eq(SaveManager.profile["totals"]["kills"], 3)
	assert_near(SaveManager.profile["totals"]["play_time"], 5.0)
	assert_true(SaveManager.mark_discovered("items", "wax") == false)
	assert_eq(SaveManager.profile["discovered"]["items"]["wax"], 3)


func test_profile_recovery_preserves_valid_backup() -> void:
	SaveManager.load_profile(PROFILE_TEST)
	SaveManager.record_run({"result": "death", "kills": 5, "time": 10.0, "floor": 1, "items": []})
	SaveManager.record_run({"result": "victory", "kills": 7, "time": 20.0, "floor": 2, "items": []})
	var backup := FileUtil.read_text(PROFILE_TEST + ".bak")
	var corrupt := "{ perfil truncado"
	for attempt in 2:
		var f := FileAccess.open(PROFILE_TEST, FileAccess.WRITE)
		f.store_string(corrupt)
		f.close()
		SaveManager.load_profile(PROFILE_TEST)
		assert_eq(SaveManager.load_report, "recovered_from_backup", "recuperación %d" % attempt)
		assert_eq(FileUtil.read_text(PROFILE_TEST + ".bak"), backup, "la copia válida permanece intacta")
		assert_eq(FileUtil.read_text(PROFILE_TEST + ".corrupt"), corrupt, "se conserva el principal dañado")
		assert_eq(SaveManager.profile["totals"]["runs"], 1)


func test_profile_limits_history_and_accepts_json_numbers() -> void:
	var history: Array = []
	for i in SaveManager.MAX_HISTORY + 8:
		history.append({"kills": i, "floor": 2, "time": 3.5, "items": ["wax", null, 4]})
	assert_true(FileUtil.atomic_write_text(PROFILE_TEST, JSON.stringify({"history": history, "totals": {"runs": 108, "play_time": 25.5}})))
	SaveManager.load_profile(PROFILE_TEST)
	assert_eq(SaveManager.profile["history"].size(), SaveManager.MAX_HISTORY)
	assert_eq(SaveManager.profile["history"][0]["kills"], 0, "se conserva el orden del historial")
	assert_eq(SaveManager.profile["history"][0]["items"], ["wax"])
	assert_eq(SaveManager.profile["totals"]["runs"], 108, "no se borran enteros deserializados como float")
	assert_near(SaveManager.profile["totals"]["play_time"], 25.5)

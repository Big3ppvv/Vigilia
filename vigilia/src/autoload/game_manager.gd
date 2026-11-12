extends Node
## GameManager: flujo de escenas y ciclo de vida de la partida.
## Mantiene el RunState vigente entre cambios de escena.

const MAIN_MENU_SCENE := "res://scenes/main_menu.tscn"
const GAME_SCENE := "res://scenes/game.tscn"

var current_run: RunState = null
var last_summary: Dictionary = {}
## Configuración de la última partida (para "repetir semilla").
var last_config: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


## Crea un RunState nuevo. config: {character, seed, mode}.
func create_run(config: Dictionary = {}) -> RunState:
	var seed_text := str(config.get("seed", "")).strip_edges()
	if seed_text == "":
		seed_text = SeedUtil.random_seed_string()
	var run := RunState.new()
	var character := str(config.get("character", "espina"))
	if not ContentDB.characters.has(character) and not ContentDB.character_ids.is_empty():
		character = str(ContentDB.character_ids[0])
	run.setup(seed_text, character, config)
	# Cada partida es una noche más de vigilia.
	run.night = int(SaveManager.profile.get("totals", {}).get("runs", 0)) + 1
	last_config = config.duplicate()
	last_config["seed"] = run.seed_string
	return run


func start_new_run(config: Dictionary = {}) -> void:
	current_run = create_run(config)
	_reset_engine_state()
	EventBus.run_started.emit(current_run)
	get_tree().change_scene_to_file(GAME_SCENE)


func restart_same_seed() -> void:
	start_new_run(last_config)


func restart_new_seed() -> void:
	var cfg := last_config.duplicate()
	cfg["seed"] = ""
	start_new_run(cfg)


## Cierra la partida: registra el resumen en el perfil. Idempotente.
func end_run(result: String, extra: Dictionary = {}) -> Dictionary:
	if current_run == null:
		return {}
	if current_run.result != "":
		return last_summary
	last_summary = current_run.build_summary(result, extra)
	print("[VIGILIA] partida terminada: %s · piso %d · %.0f s · %d bajas · semilla %s" % [
		result, int(last_summary.get("floor", 0)), float(last_summary.get("time", 0.0)),
		int(last_summary.get("kills", 0)), SeedUtil.format_seed(current_run.seed_string)])
	SaveManager.record_run(last_summary)
	EventBus.run_ended.emit(last_summary)
	return last_summary


func goto_main_menu() -> void:
	_reset_engine_state()
	get_tree().change_scene_to_file(MAIN_MENU_SCENE)


func _reset_engine_state() -> void:
	get_tree().paused = false
	Engine.time_scale = 1.0

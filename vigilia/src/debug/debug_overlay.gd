class_name DebugOverlay
extends Label
## Overlay de depuración (F3): rendimiento y contadores internos verificables
## (frames, tiempos de proceso/física, entidades, proyectiles, partículas y
## contadores del motor de sinergias: eventos diferidos, descartados y podados
## por profundidad).

var game: Node
var _t := 0.0
var _prof_frames := 0


func setup(p_game: Node) -> void:
	game = p_game
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	position = Vector2(14, 168)
	add_theme_font_size_override("font_size", 13)
	add_theme_color_override("font_color", Color(0.75, 1.0, 0.8))
	add_theme_constant_override("outline_size", 3)
	add_theme_color_override("font_outline_color", Color.BLACK)
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func toggle_profiler() -> void:
	Prof.enabled = not Prof.enabled
	Prof.reset()
	_prof_frames = 0
	visible = true


func _process(delta: float) -> void:
	_t -= delta
	if not visible or _t > 0.0 or game == null:
		return
	_t = 0.25
	var w: CombatWorld = game.world
	var e: SynergyEngine = game.engine
	var c: Dictionary = e.counters
	text = "\n".join([
		"FPS %d   proceso %.2f ms   física %.2f ms" % [Engine.get_frames_per_second(), Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0, Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0],
		"objetos %d   nodos %d" % [Performance.get_monitor(Performance.OBJECT_COUNT), Performance.get_monitor(Performance.OBJECT_NODE_COUNT)],
		"enemigos %d   aliados %d   proyectiles %d (pico %d, descartados %d)" % [w.live_enemy_count(), w.ally_count(), w.projectiles.count(), w.projectiles.peak, w.projectiles.dropped],
		"partículas %d   explosiones %d   reacciones %d   ánimas %d   rebotes %d   roces %d" % [w.fx.particle_count(), w.counters["explosions"], w.counters["reactions"], w.counters["allies_spawned"], w.counters["bounces"], w.counters["grazes"]],
		"sinergias: eventos %d  procesados %d  acciones %d  pico/frame %d  diferidos %d  podados %d  descartados %d" % [c["events"], c["processed"], c["actions"], c["frame_peak"], c["deferred"], c["depth_capped"], c["dropped"]],
		"semilla %s   piso %d   sala %s   [F4] perfilador  [F8] piloto automático" % [SeedUtil.format_seed(game.run.seed_string), game.run.floor_index + 1, str(game.director.current.coord) if game.director.current != null else "-"],
	])
	if Prof.enabled:
		_prof_frames += 1
		if _prof_frames >= 4:
			text += "\n--- perfil (ms acumulados desde F4) ---\n" + Prof.report(int(_prof_frames * 15))

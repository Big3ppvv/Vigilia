extends Node
## PRUEBA DE HUMO: juega una partida completa con el piloto automático (BotInput)
## sobre la escena REAL del juego y reporta métricas.
##
## Uso:
##   godot --headless --fixed-fps 60 --path . res://tests/smoke/smoke_run.tscn -- --seed=ABCD1234 --minutes=20 [--god] [--items=a,b,c]
## Con render (capturas): xvfb-run godot --fixed-fps 60 --path . res://tests/smoke/smoke_run.tscn -- --shots=res://docs/screenshots
## Código de salida: 0 si la partida termina (victoria o muerte) sin bloquearse;
## 1 si se agota el tiempo o la escena no avanza.

var game: Node
var seed_text := "SMOKE001"
var max_minutes := 20.0
var god := false
var give_items: Array = []
var shots_dir := ""
var _frames := 0
var _proc_max := 0.0
var _phys_max := 0.0
var _phys_sum := 0.0
var _rooms_seen := {}
var _done := false
var _shot_t := 0.0
var _shot_n := 0
var _last_floor := -1
var _boss_seen := false
var trace := false
var boss_only := false
var no_kindle := false
var _trace_t := 0.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--seed="):
			seed_text = a.substr(7)
		elif a.begins_with("--minutes="):
			max_minutes = float(a.substr(10))
		elif a == "--god":
			god = true
		elif a.begins_with("--items="):
			give_items = Array(a.substr(8).split(","))
		elif a.begins_with("--shots="):
			shots_dir = a.substr(8)
		elif a == "--trace":
			trace = true
		elif a == "--boss-only":
			boss_only = true
		elif a == "--no-kindle":
			no_kindle = true
	SaveManager.load_profile("user://smoke_profile.json")
	# Las secuencias narrativas (cuenta atrás, despertar) se reproducen al instante.
	StoryOverlay.fast = true
	GameManager.current_run = GameManager.create_run({"seed": seed_text})
	game = load("res://scenes/game.tscn").instantiate()
	add_child(game)
	await get_tree().process_frame
	game.bot_mode = true
	game.set_autopilot(true)
	(game.player.input as BotInput).kindle = not no_kindle
	game.player.god_mode = god
	for id in give_items:
		if str(id) != "":
			game.player.inventory.add_item(str(id))
	if boss_only:
		# Duelo aislado contra el jefe final (balance): piso final, sala del jefe.
		game.start_floor(ContentDB.floor_count() - 1)
		await get_tree().process_frame
		var b: RoomData = game.layout.get_room(game.layout.boss)
		var into := 0
		for d in b.doors:
			into = d
		game.director.enter_room(game.layout.boss, into)
	print("[smoke] semilla=%s god=%s objetos=%s" % [seed_text, god, give_items])


func _physics_process(_delta: float) -> void:
	if _done or game == null:
		return
	_frames += 1
	var pt := Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0
	_phys_max = maxf(_phys_max, pt)
	_phys_sum += pt
	_proc_max = maxf(_proc_max, Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0)
	if game.director.current != null:
		_rooms_seen["%d:%s" % [game.run.floor_index, game.director.current.coord]] = true
	if game.run.floor_index != _last_floor:
		_last_floor = game.run.floor_index
		print("[smoke] piso %d en t=%.1fs" % [_last_floor + 1, game.run.elapsed])
	if game.director.current != null and game.director.current.type == "boss" and not _boss_seen and game.world.live_enemy_count() > 0:
		_boss_seen = true
		print("[smoke] combate de jefe iniciado en piso %d (t=%.1fs)" % [game.run.floor_index + 1, game.run.elapsed])
		_shoot("boss")
	if trace:
		_trace_t += 1.0 / 60.0
		if _trace_t >= 30.0:
			_trace_t = 0.0
			_dump_state()
	if shots_dir != "":
		_shot_t += 1.0 / 60.0
		if _shot_t >= 20.0:
			_shot_t = 0.0
			_shoot("t%03d" % int(game.run.elapsed))
	if game.ending and game.end_screen.visible:
		_finish(str(game.run.result))
	elif _frames > int(max_minutes * 60.0 * 60.0):
		_finish("timeout")


func _dump_state() -> void:
	var rd: RoomData = game.director.current
	var es: Array = []
	for e in game.world.enemies:
		if is_instance_valid(e):
			es.append("%s@%s st=%s sp=%.1f hp=%.0f" % [e.enemy_id, Vector2i(e.global_position), e.state, e.spawn_t, e.hp])
	var pks: Array = []
	for n in game.entity_layer.get_children():
		if n is Pickup:
			var tile := RoomGrid.world_to_tile(n.global_position)
			pks.append("%s@%s tile=%s transitable=%s" % [n.kind, Vector2i(n.global_position), tile, game.world.room.grid.is_walkable(tile)])
	if game.player.input is BotInput:
		var bi: BotInput = game.player.input
		print("[trace]   plantilla=%s move=%s vel=%s" % [rd.template_id, bi._move, game.player.velocity])
		for row in rd.layout:
			print("[trace]     " + row)
	print("[trace]   consumibles: %s  objetivo_bot: %s  puertas: %s" % [pks, (game.player.input as BotInput).last_goal if game.player.input is BotInput else "-", rd.doors])
	print("[trace] t=%.0f piso=%d sala=%s tipo=%s despejada=%s combate=%s jugador=%s llama=%d velas=%d/%d enemigos=%s" % [
		game.run.elapsed, game.run.floor_index + 1, rd.coord, rd.type, rd.cleared, game.director.combat_active,
		Vector2i(game.player.global_position), game.player.hp, game.director.lit_votives(), game.director.votives.size(), es])


func _shoot(tag: String) -> void:
	if shots_dir == "" or DisplayServer.get_name() == "headless":
		return
	_shot_n += 1
	var img := get_viewport().get_texture().get_image()
	img.save_png("%s/smoke_%s_%02d_%s.png" % [shots_dir, seed_text, _shot_n, tag])


func _finish(result: String) -> void:
	_done = true
	_shoot("final_" + result)
	var w: CombatWorld = game.world
	var total_rooms := 0
	if game.layout != null:
		total_rooms = game.layout.rooms.size()
	var report := {
		"seed": seed_text, "god": god, "result": result,
		"floor_reached": game.run.floor_index + 1, "game_time_s": snappedf(game.run.elapsed, 0.1),
		"frames": _frames, "kills": game.run.kills, "rooms_cleared": game.run.rooms_cleared,
		"rooms_visited_all_floors": _rooms_seen.size(), "rooms_on_last_floor": total_rooms,
		"items": game.run.items_taken, "damage_dealt": int(game.run.damage_dealt), "damage_taken": game.run.damage_taken,
		"rooms_by_light": game.run.rooms_by_light, "candles_lit": game.run.candles_lit, "dissolved": game.run.dissolved,
		"killed_by": game.run.killed_by, "boss_fight_seen": _boss_seen,
		"physics_ms_avg": snappedf(_phys_sum / maxf(1.0, _frames), 0.01), "physics_ms_max": snappedf(_phys_max, 0.01),
		"process_ms_max": snappedf(_proc_max, 0.01),
		"projectiles_peak": w.projectiles.peak, "projectiles_dropped": w.projectiles.dropped,
		"engine": w.engine.counters, "bot": (game.player.input as BotInput).stats if game.player.input is BotInput else {},
		"tolerance": game.run.tolerance,
	}
	print("[smoke] RESULTADO " + JSON.stringify(report))
	var f := FileAccess.open("user://smoke_%s.json" % seed_text, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify(report, "\t"))
		f.close()
	SaveManager.load_profile(SaveManager.PROFILE_PATH)
	game.queue_free()
	Audio.quit_game(0 if result in ["victory", "death"] else 1)

extends Node
## PRUEBA DE ESTRÉS de la simulación (CPU). Escenarios:
##   horda:  40 enemigos activos (repuestos al morir) + build explosiva completa
##           (multidisparo, división, pólvora, veneno, ánimas, rebotes, teledirección).
##   lluvia: ~2000 proyectiles enemigos simultáneos (anillos repuestos) + jugador.
## Mide por frame TIME_PHYSICS_PROCESS y TIME_PROCESS (media, p95, máximo).
##
##   godot --headless --fixed-fps 60 --path . res://tests/stress/stress_test.tscn
##
## Nota: en headless no hay coste de GPU; esto mide la simulación y la
## preparación de comandos de dibujo, que es el cuello de botella en CPU.

const SECONDS := 20.0

var game: Node
var w: CombatWorld
var results := {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	SaveManager.load_profile("user://stress_profile.json")
	_run.call_deferred()


func _new_game(seed_text: String) -> void:
	if is_instance_valid(game):
		game.queue_free()
		await get_tree().process_frame
	GameManager.current_run = GameManager.create_run({"seed": seed_text})
	game = load("res://scenes/game.tscn").instantiate()
	add_child(game)
	await get_tree().process_frame
	w = game.world
	game.bot_mode = true
	game.player.god_mode = true


func _run() -> void:
	await _new_game("STRESS01")
	for id in ["wick_crown", "split_splinter", "candle_powder", "votive_bile", "rancid_communion", "belfry_echo", "moth_eye", "amber_lens"]:
		game.player.inventory.add_item(id)
	game.player.stats.add_modifier("fire_rate", "mult", 2.0, "stress")
	game.set_autopilot(true)
	results["horda"] = await _measure("horda", _keep_horde)
	await _new_game("STRESS02")
	game.player.input = InputSource.new()
	results["lluvia"] = await _measure("lluvia", _keep_rain)
	print("[stress] RESULTADO " + JSON.stringify(results))
	var f := FileAccess.open("user://stress_report.json", FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify(results, "\t"))
		f.close()
	game.queue_free()
	SaveManager.load_profile(SaveManager.PROFILE_PATH)
	Audio.quit_game(0)


func _keep_horde() -> void:
	var ids := ["wick", "drip", "mourner", "moth", "bellringer", "reliquary"]
	var i := 0
	while w.live_enemy_count() < 40 and i < 6:
		var pos := Vector2(120 + (i * 137 + Engine.get_physics_frames() * 31) % 720, 90 + (i * 53 + Engine.get_physics_frames() * 17) % 400)
		w.spawn_enemy(ids[(Engine.get_physics_frames() + i) % ids.size()], pos, {"spawn_time": 0.2})
		i += 1


func _keep_rain() -> void:
	var need := 2000 - w.projectiles.count(Team.ENEMY)
	var origin := Vector2(480, 288)
	var k := 0
	while need > 0 and k < 6:
		var off := float(Engine.get_physics_frames() % 360) * 0.0174533
		for j in 48:
			var dir := Vector2.RIGHT.rotated(off + TAU * j / 48.0)
			w.projectiles.spawn_enemy_shot(origin + dir * 20.0, dir, 60.0 + 10.0 * (k % 4), {"range": 2000.0, "lifetime": 12.0})
		need -= 48
		k += 1


func _measure(label: String, keeper: Callable) -> Dictionary:
	var frames := int(SECONDS * 60.0)
	var phys: Array = []
	var proc: Array = []
	var ev0 := int(w.engine.counters["processed"])
	Prof.enabled = true
	Prof.reset()
	var peak_enemies := 0
	var real: Array = []
	var last := Time.get_ticks_usec()
	for i in frames:
		var __pk := Prof.t0()
		keeper.call()
		Prof.add("stress.keeper", __pk)
		await get_tree().physics_frame
		var now := Time.get_ticks_usec()
		real.append((now - last) / 1000.0)
		last = now
		phys.append(Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0)
		proc.append(Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0)
		peak_enemies = maxi(peak_enemies, w.live_enemy_count())
	print("[stress] perfil %s (por secciones):\n%s" % [label, Prof.report(frames)])
	Prof.enabled = false
	real.sort()
	print("[stress] frame REAL %s: media %.2f ms  p50 %.2f  p95 %.2f  max %.2f" % [label, _avg(real), real[real.size() / 2], real[int(real.size() * 0.95)], real[real.size() - 1]])
	var worst := 0
	for k in phys.size():
		if float(phys[k]) > float(phys[worst]):
			worst = k
	print("[stress] peor frame #%d = %.1f ms" % [worst, float(phys[worst])])
	phys.sort()
	proc.sort()
	var r := {
		"frames": frames,
		"frame_ms_avg": snappedf(_avg(real), 0.01),
		"frame_ms_p50": snappedf(real[real.size() / 2], 0.01),
		"frame_ms_p95": snappedf(real[int(real.size() * 0.95)], 0.01),
		"frame_ms_max": snappedf(real[real.size() - 1], 0.01),
		"physics_ms_avg": snappedf(_avg(phys), 0.01),
		"physics_ms_p95": snappedf(phys[int(phys.size() * 0.95)], 0.01),
		"physics_ms_max": snappedf(phys[phys.size() - 1], 0.01),
		"process_ms_avg": snappedf(_avg(proc), 0.01),
		"process_ms_p95": snappedf(proc[int(proc.size() * 0.95)], 0.01),
		"enemies_peak": peak_enemies,
		"projectiles_peak": w.projectiles.peak,
		"projectiles_dropped": w.projectiles.dropped,
		"explosions": w.counters["explosions"],
		"kills": w.counters["kills"],
		"allies_spawned": w.counters["allies_spawned"],
		"synergy_events_processed": int(w.engine.counters["processed"]) - ev0,
		"synergy_frame_peak": w.engine.counters["frame_peak"],
		"synergy_deferred": w.engine.counters["deferred"],
		"synergy_depth_capped": w.engine.counters["depth_capped"],
		"particles_end": w.fx.particle_count(),
	}
	print("[stress] %s %s" % [label, JSON.stringify(r)])
	return r


func _avg(arr: Array) -> float:
	var s := 0.0
	for v in arr:
		s += float(v)
	return s / maxf(1.0, arr.size())

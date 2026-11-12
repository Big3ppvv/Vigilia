extends TestCase
## Sinergias verificables sobre la escena REAL de juego (sin simulacros).
## Ninguna de estas combinaciones está programada explícitamente: emergen de
## etiquetas compartidas entre efectos independientes (salvo las de conjunto,
## que se declaran en synergies.json y también se verifican aquí).

var game: Node
var w: CombatWorld


func before_each() -> void:
	SaveManager.load_profile("user://test_syn_profile.json")
	GameManager.current_run = GameManager.create_run({"seed": "SYNERGY1"})
	game = load("res://scenes/game.tscn").instantiate()
	add_child(game)
	await get_tree().process_frame
	w = game.world
	game.bot_mode = true
	game.player.input = InputSource.new()
	game.player.god_mode = true


func after_each() -> void:
	if is_instance_valid(game):
		game.queue_free()
	await get_tree().process_frame
	get_tree().paused = false
	Engine.time_scale = 1.0
	SaveManager.load_profile(SaveManager.PROFILE_PATH)


## Enemigo pasivo (en fase de aparición): recibe daño y estados, pero no actúa.
func dummy(id: String, pos: Vector2, hp_mult: float = 1.0) -> Enemy:
	return w.spawn_enemy(id, pos, {"spawn_time": 9999.0, "hp_mult": hp_mult})


## Blanco estático ACTIVO: alcanzable por proyectiles y teledirección, pero inmóvil
## y sin atacar (estado desconocido para su máquina de estados).
func static_target(id: String, pos: Vector2, hp_mult: float = 50.0) -> Enemy:
	var e := w.spawn_enemy(id, pos, {"spawn_time": 0.0, "hp_mult": hp_mult})
	e.base_speed = 0.0
	e.contact_damage = 0
	e.change_state("frozen")
	return e


func player_shot(at: Vector2, dir: Vector2 = Vector2.RIGHT) -> Projectile:
	var p := w.projectiles.spawn()
	game.player._configure_shot(p, dir, false)
	p.pos = at
	return p


func give(ids: Array) -> void:
	for id in ids:
		game.player.inventory.add_item(str(id))


# ---------------------------------------------------------------------------

## 1) Astilla Bífida + Pólvora de Cirio: el impacto se parte en 3 fragmentos y
##    estalla; los fragmentos también estallan pero no vuelven a partirse.
func test_split_plus_explode() -> void:
	give(["split_splinter", "candle_powder"])
	var a := dummy("bellringer", Vector2(480, 288), 50.0)
	var b := dummy("bellringer", Vector2(700, 288), 50.0)
	var p := player_shot(Vector2(470, 288))
	var proj_before := w.projectiles.count(Team.PLAYER)
	var expl_before := int(w.counters["explosions"])
	w.projectile_hit(p, a)
	assert_eq(int(w.counters["explosions"]) - expl_before, 1, "el impacto original estalla")
	var frags: Array = []
	for q in w.projectiles.active_list():
		if q.active and q.kind == "fragment":
			frags.append(q)
	assert_eq(w.projectiles.count(Team.PLAYER) - proj_before, 3, "3 fragmentos")
	assert_eq(frags.size(), 3)
	for f in frags:
		assert_eq(f.generation, 1, "generación de fragmento")
		assert_true(f.hit_ids.has(a.get_instance_id()), "no repite objetivo inmediato")
	var proj_mid := w.projectiles.count(Team.PLAYER)
	w.projectile_hit(frags[0], b)
	assert_eq(int(w.counters["explosions"]) - expl_before, 2, "el fragmento también estalla")
	assert_eq(w.projectiles.count(Team.PLAYER), proj_mid, "los fragmentos no se dividen otra vez")


## 2) Pólvora + Hiel Votiva + Comunión Rancia: explosión -> veneno ->
##    muerte envenenada -> Ánima aliada. (El ejemplo del documento de diseño.)
func test_explosion_poison_communion_chain() -> void:
	give(["candle_powder", "votive_bile", "rancid_communion"])
	var victims: Array = []
	for i in 8:
		victims.append(dummy("wick", Vector2(480, 288) + Vector2.RIGHT.rotated(i * TAU / 8.0) * 22.0))
	var p := player_shot(Vector2(470, 288))
	w.projectile_hit(p, victims[0])
	# El objetivo directo puede morir en el acto (crítico + su propia explosión,
	# que escala con el golpe); los 7 vecinos deben quedar envenenados.
	var poisoned := 0
	for i in range(1, victims.size()):
		var v: Enemy = victims[i]
		if is_instance_valid(v) and v.alive and v.status.has("poison"):
			poisoned += 1
	assert_eq(poisoned, 7, "la explosión envenena a todos los vecinos (%d)" % poisoned)
	var v0: Enemy = victims[0]
	assert_true(not v0.alive or v0.status.has("poison"), "el objetivo directo: envenenado o muerto")
	await physics_frames(330)
	var alive := 0
	for v in victims:
		if is_instance_valid(v) and v.alive:
			alive += 1
	assert_eq(alive, 0, "el veneno remata a todos")
	assert_ge(int(w.counters["allies_spawned"]), 1, "al menos un Ánima aliada")
	assert_le(float(w.ally_count()), 4.0, "tope de 4 aliados respetado")
	assert_eq(game.player.hp, game.player.max_hp(), "las explosiones propias no hieren al jugador")


## 3) Pacto de Sebo + Herida que Canta: la autolesión del pacto dispara la
##    herida (anillo de 10 astillas y cadencia +30 %).
func test_pact_triggers_singing_wound() -> void:
	give(["tallow_pact", "singing_wound"])
	var pl: Player = game.player
	pl.god_mode = false
	var hp0 := pl.hp
	var fr0 := pl.stats.get_stat("fire_rate")
	for i in 7:
		pl._fire(Vector2.RIGHT)
	assert_eq(pl.hp, hp0, "los 7 primeros disparos no cuestan vida")
	var before_ring := _count_kind("ring")
	pl._fire(Vector2.RIGHT)
	assert_eq(pl.hp, hp0 - 1, "el 8.º disparo sangra 1")
	var blood := 0
	for q in w.projectiles.active_list():
		if q.active and q.has_tag("blood"):
			blood += 1
			assert_near(q.damage, pl.stats.get_stat("damage") * 4.0, 0.01, "astilla de sangre x4")
			assert_ge(q.pierce, 5, "perfora 5")
	assert_eq(blood, 1, "una astilla de sangre")
	assert_eq(_count_kind("ring") - before_ring, 10, "la herida libera 10 astillas")
	assert_near(pl.stats.get_stat("fire_rate"), fr0 * 1.3, 0.001, "cadencia +30%")


## 3b) El pacto no se activa con 1 de vida (no puede matarte).
func test_pact_respects_min_hp() -> void:
	give(["tallow_pact"])
	var pl: Player = game.player
	pl.god_mode = false
	pl.hp = 1
	for i in 16:
		pl._fire(Vector2.RIGHT)
	assert_eq(pl.hp, 1, "con 1 de vida el pacto no se cobra")
	assert_true(pl.alive)


## 4) Reacción elemental: Escarcha + Quemadura = Choque térmico (regla de datos).
func test_thermal_shock_reaction() -> void:
	var d := dummy("bellringer", Vector2(480, 288), 50.0)
	var hp0 := d.hp
	assert_true(w.apply_status(d, "chill", 1, 3.0))
	assert_eq(int(w.counters["reactions"]), 0)
	w.apply_status(d, "burn", 1, 3.0)
	assert_eq(int(w.counters["reactions"]), 1, "reacción disparada")
	assert_false(d.status.has("chill") or d.status.has("burn"), "consume ambos estados")
	assert_ge(hp0 - d.hp, 10.0, "daño de la reacción")


## 4b) La misma reacción surge en combate real con los objetos.
func test_frost_and_ember_items_produce_reactions() -> void:
	give(["candle_frost", "live_ember"])
	var d := dummy("bellringer", Vector2(480, 288), 200.0)
	for i in 60:
		w.projectile_hit(player_shot(Vector2(470, 288)), d)
		await get_tree().physics_frame
	assert_ge(int(w.counters["reactions"]), 1, "reacciones en combate (%d)" % int(w.counters["reactions"]))


## 5) Brasa Viva + Hiel Votiva: el enemigo que muere ardiendo estalla, y esa
##    explosión envenena a su vecino. Dos objetos que no se conocen.
func test_burning_death_explosion_poisons() -> void:
	give(["live_ember", "votive_bile"])
	var a := dummy("wick", Vector2(480, 288))
	var b := dummy("bellringer", Vector2(520, 288), 50.0)
	w.apply_status(a, "burn", 1, 3.0)
	var info := DamageInfo.create(100.0, Team.PLAYER, ["projectile"])
	w.deal_damage(a, info)
	assert_false(a.alive, "A muere")
	assert_eq(int(w.counters["explosions"]), 1, "muerte ardiendo -> explosión")
	assert_true(b.status.has("poison"), "la explosión envenena a B")


## 6) Transformación "Enjambre" (sinergia de conjunto por etiquetas).
func test_moth_swarm_transformation() -> void:
	var fr0: float = game.player.stats.get_stat("fire_rate")
	give(["moth_eye", "moth_wing"])
	assert_false(game.player.inventory.active_synergies.has("moth_swarm"), "con 2 no se activa")
	give(["wing_dust"])
	var inv: ItemSystem = game.player.inventory
	assert_true(inv.active_synergies.has("moth_swarm"), "3 recuerdos de polilla")
	assert_eq(w.familiars.size(), 2, "dos polillas lunares")
	assert_gt_zero(float(inv.projectile_props.get("wave_amp", 0.0)), "astillas que aletean")
	assert_near(game.player.stats.get_stat("fire_rate"), fr0 * 1.1, 0.001, "+10% cadencia")


## Una ranura activa aporta sus etiquetas una sola vez, aunque recojamos copias.
func test_duplicate_active_does_not_create_synergies() -> void:
	var inv: ItemSystem = game.player.inventory
	give(["ember_bellows", "ember_bellows", "ember_bellows"])
	assert_eq(int(inv.tag_counts.get("fire", 0)), 1, "un solo recuerdo de fuego equipado")
	assert_false(inv.active_synergies.has("pyre"), "las copias del activo no crean Pira")
	give(["live_ember", "ash_rosary"])
	assert_true(inv.active_synergies.has("pyre"), "dos pasivos y el activo sí completan Pira")
	give(["broken_bell"])
	assert_eq(int(inv.tag_counts.get("fire", 0)), 2, "al soltar el activo desaparece su etiqueta")
	assert_false(inv.active_synergies.has("pyre"), "Pira se desactiva al perder su tercer objeto")
	give(["ember_bellows"])
	assert_eq(int(inv.tag_counts.get("fire", 0)), 3)
	assert_true(inv.active_synergies.has("pyre"), "recuperar el activo restaura la sinergia")


## La vista previa no puede contar un segundo ejemplar de la misma ranura activa.
func test_preview_active_replacement_matches_equipped_build() -> void:
	var inv: ItemSystem = game.player.inventory
	give(["live_ember", "ember_bellows"])
	assert_eq(inv.preview_progress("ember_bellows"), "", "el mismo activo no hace avanzar Pira")
	assert_true(inv.preview_progress("ash_rosary").contains("¡completa Pira!"), "un pasivo nuevo sí la completaría")
	assert_eq(int(inv.tag_counts.get("fire", 0)), 2, "consultar el pedestal no modifica la build")
	assert_false(inv.active_synergies.has("pyre"))
	give(["tallow_pact"])
	var preview := inv.preview_progress("sacrifice_candle")
	assert_true(preview.contains("¡completa Transfusión!"), "el activo nuevo completa sangre")
	assert_true(preview.contains("¡completa Cilicio!"), "el activo nuevo completa sacrificio")
	give(["sacrifice_candle"])
	assert_true(inv.active_synergies.has("transfusion"))
	assert_true(inv.active_synergies.has("cilice"))
	assert_eq(int(inv.tag_counts.get("fire", 0)), 1, "la etiqueta de fuego del activo anterior se retira")
	assert_eq(inv.preview_progress("sacrifice_candle"), "", "consultar otra copia no aporta progreso")


## 7) Sinergia negativa "Mecha Ahogada": un objeto modifica a otro.
func test_drowned_wick_negative_synergy() -> void:
	give(["candle_frost", "candle_powder"])
	var inv: ItemSystem = game.player.inventory
	assert_true(inv.active_synergies.has("drowned_wick"))
	assert_near(w.mech("explosion_radius_mult"), 0.7, 0.0001, "radio de explosión -30%")
	var d := dummy("bellringer", Vector2(480, 288), 50.0)
	var info := DamageInfo.create(5.0, Team.PLAYER, ["explosion"])
	w.explode(Vector2(470, 288), 60.0, info)
	assert_true(d.status.has("chill"), "las explosiones escarchan")


## 8) Rebote + teledirección: tras rebotar en la pared, la astilla busca un
##    objetivo nuevo y lo alcanza.
func test_bounce_then_homing_hits() -> void:
	give(["belfry_echo", "moth_eye"])
	var d := static_target("bellringer", Vector2(260, 200))
	var hp0 := d.hp
	var p := player_shot(Vector2(40, 300), Vector2.LEFT)
	await physics_frames(90)
	assert_ge(int(w.counters["bounces"]), 1, "rebotó")
	assert_true(d.hp < hp0, "alcanzó al objetivo tras rebotar")


## 9) Protección de recursión: un efecto patológico "cada explosión provoca otra
##    explosión" termina por profundidad máxima en lugar de colgar el juego.
func test_recursion_guard_terminates() -> void:
	var e: SynergyEngine = game.engine
	e.register({"trigger": "explosion", "action": "explode", "params": {"radius": 10, "damage_mult": 0.0, "base": "player"}}, "test:loop")
	var info := DamageInfo.create(0.0, Team.PLAYER, ["explosion"])
	w.explode(Vector2(480, 288), 10.0, info)
	var n := int(w.counters["explosions"])
	assert_le(float(n), float(SynergyEngine.MAX_DEPTH + 2), "explosiones acotadas (%d)" % n)
	assert_ge(int(e.counters["depth_capped"]), 1, "poda por profundidad registrada")
	e.unregister_source("test:loop")


## 10) Presupuesto por frame: el exceso de eventos se difiere, no se pierde.
func test_event_budget_defers_overflow() -> void:
	var e: SynergyEngine = game.engine
	var hits := [0]
	e.register({"trigger": "tick", "action": "message", "params": {"text": ""}}, "test:budget")
	var base_processed := int(e.counters["processed"])
	e._flushing = true
	for i in SynergyEngine.EVENT_BUDGET + 150:
		e.emit("tick", {"depth": 0})
	e._flushing = false
	e._frame_events = 0
	e.flush()
	var first := int(e.counters["processed"]) - base_processed
	assert_eq(first, SynergyEngine.EVENT_BUDGET, "primer frame limitado al presupuesto")
	assert_eq(e.pending(), 150, "el resto queda en cola")
	await physics_frames(2)
	assert_eq(e.pending(), 0, "procesado en el frame siguiente")
	e.unregister_source("test:budget")
	hits[0] = 0


func _count_kind(kind: String) -> int:
	var n := 0
	for q in w.projectiles.active_list():
		if q.active and q.kind == kind:
			n += 1
	return n


func assert_gt_zero(v: float, msg: String) -> void:
	assert_true(v > 0.0, msg)

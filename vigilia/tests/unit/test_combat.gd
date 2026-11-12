extends TestCase
## Pipeline de daño, Tolerancia del Sueño, armadura direccional, jefe, botín,
## velas votivas (despertar por la luz), Cabecera y muros agrietados.

var game: Node
var w: CombatWorld


func before_each() -> void:
	SaveManager.load_profile("user://test_combat_profile.json")
	GameManager.current_run = GameManager.create_run({"seed": "COMBAT01"})
	game = load("res://scenes/game.tscn").instantiate()
	add_child(game)
	await get_tree().process_frame
	w = game.world
	game.bot_mode = true
	game.player.input = InputSource.new()


func after_each() -> void:
	if is_instance_valid(game):
		game.queue_free()
	await get_tree().process_frame
	get_tree().paused = false
	Engine.time_scale = 1.0
	SaveManager.load_profile(SaveManager.PROFILE_PATH)


func test_mitigation_math() -> void:
	var info := DamageInfo.create(10.0, Team.PLAYER, ["fire", "projectile"])
	assert_near(DamageSystem.mitigate(info, {}, {}, {}, 0.0), 10.0)
	assert_near(DamageSystem.mitigate(info, {"fire": 0.3}, {}, {}, 0.0), 7.0, 0.001, "tolerancia")
	assert_near(DamageSystem.mitigate(info, {}, {"fire": 0.15}, {}, 0.0), 11.5, 0.001, "alergia")
	assert_near(DamageSystem.mitigate(info, {}, {}, {}, 20.0), 5.0, 0.001, "armadura 20/(20+20)")
	assert_near(DamageSystem.mitigate(info, {}, {}, {"fire": true}, 0.0), 0.0, 0.001, "inmunidad")
	info.is_self = true
	assert_near(DamageSystem.mitigate(info, {"fire": 0.9}, {}, {}, 50.0), 10.0, 0.001, "autolesión sin mitigar")


func test_crit_roll_is_deterministic() -> void:
	var a := DamageInfo.create(4.0, Team.PLAYER)
	DamageSystem.roll_crit(a, 0.0, 3.0, RngStream.new(1), true)
	assert_true(a.crit)
	assert_near(a.amount, 12.0)
	var results: Array = []
	for k in 2:
		var r := RngStream.new(77)
		var seq: Array = []
		for i in 50:
			var d := DamageInfo.create(1.0, Team.PLAYER)
			DamageSystem.roll_crit(d, 0.3, 2.0, r)
			seq.append(d.crit)
		results.append(seq)
	assert_eq(results[0], results[1], "misma semilla, mismos críticos")


func test_tolerance_adapts_to_dominant_tag() -> void:
	var run := RunState.new()
	ToleranceSystem.record(run, PackedStringArray(["fire", "projectile"]), 80.0)
	ToleranceSystem.record(run, PackedStringArray(["projectile"]), 40.0)
	ToleranceSystem.recompute_for_new_floor(run)
	assert_true(run.tolerance.has("fire"), "tolera el fuego dominante")
	assert_near(float(run.tolerance["fire"]), ToleranceSystem.MAX_RES, 0.001, "cuota 67% => tope")
	assert_true(run.allergies.has("poison"), "alergia a lo nunca usado")
	assert_false(run.allergies.has("fire"))
	assert_near(float(run.exposure["fire"]), 40.0, 0.001, "la exposición decae a la mitad")


func test_tolerance_needs_meaningful_sample() -> void:
	var run := RunState.new()
	ToleranceSystem.record(run, PackedStringArray(["fire"]), 10.0)
	ToleranceSystem.recompute_for_new_floor(run)
	assert_true(run.tolerance.is_empty(), "sin datos suficientes no se adapta")


func test_enemies_of_next_floor_inherit_tolerance() -> void:
	w.run.tolerance = {"explosion": 0.3}
	var e := w.spawn_enemy("bellringer", Vector2(480, 288), {"spawn_time": 9999.0, "hp_mult": 10.0})
	var hp0 := e.hp
	w.deal_damage(e, DamageInfo.create(10.0, Team.PLAYER, ["explosion"]))
	assert_near(hp0 - e.hp, 7.0, 0.001, "el enemigo resiste la explosión")


func test_reliquary_directional_armor() -> void:
	var e := w.spawn_enemy("reliquary", Vector2(480, 288), {"spawn_time": 9999.0, "hp_mult": 10.0})
	e.set("_face", Vector2.RIGHT)
	var front := DamageInfo.create(10.0, Team.PLAYER, ["projectile"])
	front.direction = Vector2.LEFT
	var hp0 := e.hp
	w.deal_damage(e, front)
	assert_near(hp0 - e.hp, 2.5, 0.01, "frente: -75%")
	var back := DamageInfo.create(10.0, Team.PLAYER, ["projectile"])
	back.direction = Vector2.RIGHT
	hp0 = e.hp
	w.deal_damage(e, back)
	assert_near(hp0 - e.hp, 13.5, 0.01, "espalda: +35%")


func test_player_damage_rules() -> void:
	var pl: Player = game.player
	pl.add_wax(2)
	var hit := DamageInfo.create(1.0, Team.ENEMY, ["contact"])
	pl.apply_damage(hit)
	assert_eq(pl.wax, 1, "la cera absorbe primero")
	assert_eq(pl.hp, pl.max_hp())
	pl.apply_damage(DamageInfo.create(1.0, Team.ENEMY, ["contact"]))
	assert_eq(pl.wax, 1, "invulnerable tras el golpe")
	pl._hurt_iframes = 0.0
	pl.self_damage(1)
	assert_eq(pl.hp, pl.max_hp() - 1, "la autolesión ignora la cera")
	assert_eq(pl.wax, 1)
	var own := DamageInfo.create(50.0, Team.PLAYER, ["explosion"])
	pl._hurt_iframes = 0.0
	pl.apply_damage(own)
	assert_eq(pl.hp, pl.max_hp() - 1, "las explosiones propias sin fuego amigo no hieren")


func test_graze_grants_lucidity() -> void:
	var pl: Player = game.player
	pl._dodge_iframes = 0.3
	var p := w.projectiles.spawn_enemy_shot(pl.global_position + Vector2(30, 0), Vector2.LEFT, 300.0)
	await physics_frames(8)
	assert_ge(int(w.counters["grazes"]), 1, "roce registrado")
	assert_ge(pl.crit_charges, 3, "cargas de Lucidez")
	assert_eq(pl.hp, pl.max_hp(), "sin daño durante la esquiva")


func test_boss_phases_and_arena_transform() -> void:
	var e := w.spawn_enemy("mother_candle", Vector2(480, 200), {"spawn_time": 0.0})
	game.player.god_mode = true
	game.player.global_position = Vector2(480, 480)
	await physics_frames(110)
	assert_eq(e.get_phase(), 1)
	e.hp = e.max_hp * 0.6
	await physics_frames(130)
	assert_eq(e.get_phase(), 2, "fase 2 al 66%")
	var wax := 0
	for z in w.hazards.zones:
		if z[2] == "wax":
			wax += 1
	assert_ge(wax, 4, "charcos de cera de la transformación")
	e.hp = e.max_hp * 0.3
	await physics_frames(130)
	assert_eq(e.get_phase(), 3, "fase 3 al 33%")
	var fire := 0
	for z in w.hazards.zones:
		if z[2] == "fire":
			fire += 1
	assert_ge(fire, 4, "hogueras en las esquinas")


func test_boss_reacts_to_wick_inventory() -> void:
	game.player.inventory.add_item("wick_crown")
	var e := w.spawn_enemy("mother_candle", Vector2(480, 200), {"spawn_time": 0.0})
	assert_true(bool(e.get("_no_summon")), "con mecha en el inventario no invoca a sus hijas")


func test_loot_fill_is_deterministic() -> void:
	var params := FloorParams.build(0)
	var seq: Array = []
	for k in 2:
		var run := GameManager.create_run({"seed": "LOOTSEED"})
		var layout := DungeonGenerator.generate(run.seed_int, params)
		LootManager.new(run).fill_floor(layout, 0.0)
		var ids: Array = []
		for rd in layout.sorted_rooms():
			for p in rd.pedestals:
				ids.append(str(p.get("item_id", p.get("kind", ""))))
		seq.append(ids)
	assert_eq(seq[0], seq[1], "misma semilla, mismos objetos")
	assert_false(seq[0].is_empty())
	var uniq := {}
	for id in seq[0]:
		if id != "" and ContentDB.items.has(id):
			assert_false(uniq.has(id), "sin duplicados en el piso: " + id)
			uniq[id] = true


## Salas secretas: una explosión junto al muro agrietado revela la puerta oculta,
## que pasa a ser transitable y marca la sala secreta como conocida.
func test_explosion_reveals_secret_door() -> void:
	var layout: FloorLayout = game.layout
	var target_room: RoomData = null
	var dir := -1
	for rd in layout.sorted_rooms():
		for d in rd.doors:
			if bool(rd.doors[d]["hidden"]):
				target_room = rd
				dir = d
				break
		if target_room != null:
			break
	assert_true(target_room != null, "el piso tiene un acceso oculto")
	game.director.enter_room(target_room.coord, -1)
	await get_tree().process_frame
	var view: RoomView = w.room
	assert_false(view.door_is_passable(dir), "oculta: no transitable")
	var secret: RoomData = layout.get_room(target_room.doors[dir]["to"])
	assert_false(secret.known, "la secreta aún no está en el mapa")
	var info := DamageInfo.create(1.0, Team.PLAYER, ["explosion", "bomb"])
	w.explode(RoomView.door_edge_center(dir) + Vector2(FloorLayout.DIRS[dir]) * -40.0, 60.0, info, Palette.FLAME, false)
	assert_false(bool(target_room.doors[dir]["hidden"]), "la explosión abre el muro agrietado")
	assert_true(secret.known, "la sala secreta aparece en el mapa")
	if not game.director.combat_active:
		await physics_frames(2)
		assert_true(view.door_is_passable(dir), "la puerta revelada es transitable")


## Un consumible lanzado contra una roca o pilar se recoloca en suelo transitable.
func test_pickups_never_rest_inside_obstacles() -> void:
	var grid: RoomGrid = w.room.grid
	var solid := Vector2i(-1, -1)
	for y in RoomGrid.ROWS:
		for x in RoomGrid.COLS:
			if not grid.is_walkable(Vector2i(x, y)):
				solid = Vector2i(x, y)
	if solid == Vector2i(-1, -1):
		grid.set_cell(Vector2i(3, 3), RoomGrid.PILLAR)
		solid = Vector2i(3, 3)
	w.spawn_pickup("heart", RoomGrid.tile_center(solid))
	await physics_frames(40)
	for n in game.entity_layer.get_children():
		if n is Pickup:
			assert_true(grid.is_walkable(RoomGrid.world_to_tile(n.global_position)), "el ascua queda en suelo transitable")


## Intercambiar activos suelta el anterior en un pedestal y no duplica el historial.
func test_active_swap_drops_pedestal_without_duplicating_history() -> void:
	var pl: Player = game.player
	var start_active: String = pl.inventory.active_id
	assert_ne(start_active, "", "el personaje empieza con un activo")
	pl.inventory.add_item("ember_bellows")
	assert_eq(pl.inventory.active_id, "ember_bellows")
	var dropped := 0
	for n in get_tree().get_nodes_in_group("pedestals"):
		if n is ItemPedestal and n.item_id == start_active and not n.taken:
			dropped += 1
	assert_eq(dropped, 1, "el activo anterior queda en un pedestal")
	pl.inventory.add_item(start_active)
	pl.inventory.add_item("ember_bellows")
	assert_eq(w.run.items_taken.count("ember_bellows"), 1, "historial sin duplicados")


## Cambiar de ranura no sustituye las salas necesarias para recargar un activo.
func test_active_pedestal_round_trip_preserves_charge() -> void:
	var pl: Player = game.player
	var inv := pl.inventory
	var start_active := inv.active_id
	inv.set_active_charged(false)
	inv.add_charge(1)
	var partial_charge := inv.active_charge
	game.drop_item_pedestal("ember_bellows", pl.global_position)
	var offered := _find_active_pedestal("ember_bellows")
	assert_true(offered != null, "hay un activo nuevo para elegir")
	if offered == null:
		return
	assert_true(offered.interact(pl))
	assert_eq(inv.active_charge, inv.active_max, "un activo nuevo sí llega cargado")
	inv.set_active_charged(false)
	# Volver a cargar la sala reconstruye los pedestales desde su estado guardado.
	game.director.enter_room(game.director.current.coord, -1)
	await get_tree().process_frame
	var previous := _find_active_pedestal(start_active)
	assert_true(previous != null, "el activo anterior sigue en la sala")
	if previous == null:
		return
	assert_true(previous.interact(pl))
	assert_eq(inv.active_charge, partial_charge, "recupera la carga parcial que tenía al soltarlo")
	await get_tree().process_frame
	var empty := _find_active_pedestal("ember_bellows")
	assert_true(empty != null)
	if empty == null:
		return
	assert_true(empty.interact(pl))
	assert_eq(inv.active_charge, 0, "el activo agotado sigue agotado tras el intercambio")
	assert_false(inv.use_active(), "intercambiar no concede otro uso gratis")
	inv.add_item("ember_bellows")
	assert_eq(inv.active_charge, 0, "registrar de nuevo el activo equipado tampoco recarga")


func _find_active_pedestal(item_id: String) -> ItemPedestal:
	for n in get_tree().get_nodes_in_group("pedestals"):
		if n is ItemPedestal and n.item_id == item_id and not n.taken and not n.is_queued_for_deletion():
			return n
	return null


func _enter_combat_room() -> RoomData:
	for rd in game.layout.sorted_rooms():
		if rd.type == "combat":
			game.director.enter_room(rd.coord, -1)
			return rd
	return null


## Quedarse junto a cada vela la enciende; con todas encendidas la sala despierta
## y las sombras restantes se disipan sin contar como bajas.
func test_lighting_all_votives_awakens_room_and_dissolves_shadows() -> void:
	var rd := _enter_combat_room()
	await physics_frames(2)
	var pl: Player = game.player
	pl.god_mode = true
	var kills0 := w.run.kills
	assert_true(game.director.combat_active, "la sala empieza dormida")
	var candles: Array = game.director.votives.duplicate()
	assert_ge(candles.size(), 2, "velas en la sala")
	var alive_before := w.live_enemy_count()
	assert_ge(alive_before, 1, "hay sombras")
	for c in candles:
		var guard := 0
		while not c.lit and guard < 300:
			pl.global_position = c.global_position
			await get_tree().physics_frame
			guard += 1
		assert_true(c.lit, "la vela se enciende al quedarse junto a ella")
	await physics_frames(2)
	assert_false(game.director.combat_active, "la sala despierta")
	assert_true(rd.cleared)
	assert_eq(w.live_enemy_count(), 0, "las sombras se disipan")
	assert_eq(w.run.kills, kills0, "disiparse no es una baja")
	assert_ge(w.run.dissolved, alive_before)
	assert_eq(w.run.rooms_by_light, 1)
	assert_eq(w.run.candles_lit, candles.size(), "cada vela encendida a mano cuenta")
	assert_true(game.world.room.door_is_passable(rd.doors.keys()[0]), "las puertas se abren")


## Abatir todas las sombras también despierta la sala: sus velas se encienden
## solas (sin contar como encendidas por el jugador).
func test_killing_all_shadows_lights_votives() -> void:
	_enter_combat_room()
	await physics_frames(2)
	game.player.god_mode = true
	# Algunas sombras se dividen o invocan al morir: abatir hasta que no quede ninguna.
	for round in 6:
		for e in w.enemies.duplicate():
			if is_instance_valid(e) and e.alive:
				e.die(DamageInfo.create(999.0, Team.PLAYER))
		await physics_frames(2)
		if not game.director.combat_active:
			break
	assert_false(game.director.combat_active, "sin sombras, la sala despierta")
	for c in game.director.votives:
		assert_true(c.lit, "las velas arden al despertar")
	assert_eq(w.run.candles_lit, 0, "no las encendió el jugador")
	assert_eq(w.run.rooms_by_light, 0)


## Una vela encendida debilita a las sombras dentro de su luz.
func test_votive_light_weakens_shadows() -> void:
	_enter_combat_room()
	await physics_frames(2)
	var c: VotiveCandle = game.director.votives[0]
	var e := w.spawn_enemy("bellringer", c.global_position + Vector2(40, 0), {"spawn_time": 9999.0, "hp_mult": 10.0})
	var hp0 := e.hp
	w.deal_damage(e, DamageInfo.create(10.0, Team.PLAYER, ["projectile"]))
	assert_near(hp0 - e.hp, 10.0, 0.01, "vela apagada: daño normal")
	c.ignite(true)
	hp0 = e.hp
	w.deal_damage(e, DamageInfo.create(10.0, Team.PLAYER, ["projectile"]))
	assert_near(hp0 - e.hp, 10.0 * Enemy.LIGHT_VULNERABILITY, 0.01, "en la luz: más daño")


## Las polillas buscan la luz: si se posan en una vela encendida, la apagan.
func test_moth_snuffs_lit_votive() -> void:
	_enter_combat_room()
	await physics_frames(2)
	game.player.god_mode = true
	var c: VotiveCandle = game.director.votives[0]
	c.ignite(true)
	var moth := w.spawn_enemy("moth", c.global_position + Vector2(60, -40), {"spawn_time": 0.0})
	moth.set("_candle", c)
	moth.set("_distract_t", 3.0)
	var guard := 0
	while c.lit and guard < 600:
		await get_tree().physics_frame
		guard += 1
	assert_false(c.lit, "la polilla apaga la vela")
	assert_true(game.director.combat_active, "la sala sigue dormida")


## Recordar en la Cabecera acorta la llama máxima para siempre; nunca por debajo de 2.
func test_altar_costs_max_flame() -> void:
	var pl: Player = game.player
	var max0 := pl.max_hp()
	var entry := {"pos": pl.global_position, "pool": "altar", "price": 1, "item_id": "moth_wing", "taken": false, "group": -1}
	var ped := ItemPedestal.new()
	ped.position = pl.global_position
	ped.setup(w, entry)
	game.entity_layer.add_child(ped)
	assert_true(ped.interact(pl), "recordar")
	assert_eq(pl.max_hp(), max0 - 1, "la llama se acorta")
	assert_true(pl.inventory.has_item("moth_wing"))
	var entry2 := {"pos": pl.global_position, "pool": "altar", "price": pl.max_hp() - 1, "item_id": "amber_lens", "taken": false, "group": -1}
	var ped2 := ItemPedestal.new()
	ped2.setup(w, entry2)
	game.entity_layer.add_child(ped2)
	assert_false(ped2.interact(pl), "llama demasiado corta para pagar")
	assert_false(pl.inventory.has_item("amber_lens"))
	assert_eq(pl.max_hp(), max0 - 1)


## Sin bombas: las brasas que chocan contra un muro agrietado acaban abriéndolo.
func test_embers_crack_open_secret_wall() -> void:
	var layout: FloorLayout = game.layout
	var target_room: RoomData = null
	var dir := -1
	for rd in layout.sorted_rooms():
		for d in rd.doors:
			if bool(rd.doors[d]["hidden"]):
				target_room = rd
				dir = d
				break
		if target_room != null:
			break
	assert_true(target_room != null, "el piso tiene un acceso oculto")
	game.director.enter_room(target_room.coord, -1)
	await get_tree().process_frame
	var secret: RoomData = layout.get_room(target_room.doors[dir]["to"])
	var at := RoomView.door_edge_center(dir) - Vector2(FloorLayout.DIRS[dir]) * 4.0
	for i in RoomView.CRACK_HITS - 1:
		var p := w.projectiles.spawn()
		p.team = Team.PLAYER
		p.pos = at - Vector2(FloorLayout.DIRS[dir]) * 30.0
		p.vel = Vector2(FloorLayout.DIRS[dir]) * 600.0
		p.radius = 5.0
		p.range_total = 400.0
		p.range_left = 400.0
		p.tags = PackedStringArray(["projectile", "player_shot"])
		await physics_frames(8)
	assert_true(bool(target_room.doors[dir]["hidden"]), "aún resiste")
	assert_true(w.room.on_wall_struck(at), "el último golpe")
	assert_false(bool(target_room.doors[dir]["hidden"]), "el muro cede")
	assert_true(secret.known, "la sala secreta aparece en el mapa")

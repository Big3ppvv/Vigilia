class_name RoomDirector
extends Node
## Gestiona la sala actual dentro del piso: carga/descarga, persistencia del
## estado (consumibles en el suelo, pedestales, cera rota, velas), cierre de
## puertas en combate, transiciones y el DESPERTAR de la sala.
##
## Una sala de combate despierta de dos maneras:
##   - por la luz: el jugador enciende todas sus velas votivas y las sombras que
##     quedan se disipan (sin bajas ni botín de ellas);
##   - por la fuerza: no queda ninguna sombra y las velas se encienden solas.
## En ambos casos la luz vuelve a la sala, se abren las puertas y llega la
## recompensa. CandleLighting y el HUD escuchan EventBus.room_awakened.

signal room_changed(rd: RoomData)
signal room_cleared(rd: RoomData)

var game: Node
var world: CombatWorld
var layout: FloorLayout
var current: RoomData
var view: RoomView
var floor_index := 0
var combat_active := false
var transitioning := false
var fade: ColorRect
var votives: Array[VotiveCandle] = []


func load_floor(l: FloorLayout, fi: int) -> void:
	layout = l
	floor_index = fi
	current = null
	layout.get_room(layout.start).known = true
	enter_room(layout.start, -1)


## entry_dir: puerta de la sala NUEVA por la que entra el jugador (-1 = centro).
func enter_room(coord: Vector2i, entry_dir: int) -> void:
	_save_room_state()
	_clear_room_entities()
	if view != null:
		view.queue_free()
		view = null
	current = layout.get_room(coord)
	view = RoomView.new()
	view.setup(current, floor_index, _lore_for(current), game.floor_def)
	view.secret_revealed.connect(_on_secret_revealed)
	game.room_layer.add_child(view)
	world.room = view
	var pos := RoomView.entry_position(entry_dir) if entry_dir >= 0 else RoomView.center() + Vector2(0, 60)
	var pl := world.player
	pl.global_position = pos
	pl.velocity = Vector2.ZERO
	pl.kindling_target = null
	for f in world.familiars:
		if is_instance_valid(f):
			f.global_position = pos
	game.camera.focus(RoomView.center())
	current.visited = true
	current.known = true
	for d in current.doors:
		var door: Dictionary = current.doors[d]
		if not bool(door["hidden"]):
			layout.get_room(door["to"]).known = true
	_spawn_room_contents()
	_spawn_votives()
	if current.is_combat() and not current.cleared:
		view.set_doors_open(false)
		combat_active = true
		_spawn_enemies()
	else:
		view.set_doors_open(true)
		combat_active = false
	world.engine.emit("room_enter", {"depth": 0, "room_type": current.type, "tags": PackedStringArray(["room_enter"])})
	EventBus.room_entered.emit(current)
	_emit_votives()
	room_changed.emit(current)


func _lore_for(rd: RoomData) -> String:
	if rd.type == "start" and floor_index == 0:
		return str(ContentDB.lore.get("tutorial", ""))
	if rd.lore_tile != Vector2i(-1, -1):
		var idx := absi(rd.coord.x * 7 + rd.coord.y * 13 + floor_index * 3)
		return ContentDB.lore_line("secret_inscriptions", idx)
	return ""


func _save_room_state() -> void:
	if current == null:
		return
	var kept: Array = []
	for n in game.entity_layer.get_children():
		if n is Pickup and not n.is_queued_for_deletion():
			kept.append({"kind": (n as Pickup).kind, "pos": (n as Pickup).position})
	current.pickups = kept


func _clear_room_entities() -> void:
	for n in game.entity_layer.get_children():
		if n == world.player or n.is_in_group("familiars"):
			continue
		n.queue_free()
	votives.clear()
	world.votives.clear()
	world.enemies.clear()
	world.allies.clear()
	world.projectiles.clear_all()
	world.fx.clear()
	world.hazards.clear()


func _spawn_room_contents() -> void:
	var pending := current.pickups.duplicate()
	current.pickups.clear()
	for pk in pending:
		var kind := str(pk.get("kind", ""))
		if kind == "":
			continue
		var pos: Vector2 = pk["pos"] if pk.has("pos") else RoomGrid.tile_center(pk["tile"])
		world.spawn_pickup(kind, pos)
	for ped in current.pedestals:
		if bool(ped.get("taken", false)):
			continue
		if str(ped.get("item_id", "")) == "":
			continue
		var node := ItemPedestal.new()
		node.position = ped["pos"] if ped.has("pos") else RoomGrid.tile_center(ped["tile"]) + Vector2(0, 14)
		node.setup(world, ped)
		game.entity_layer.add_child(node)
	if current.type == "boss" and current.cleared and bool(current.flags.get("exit_open", false)):
		game.spawn_exit_portal()


func _spawn_votives() -> void:
	for v in current.votives:
		if current.cleared:
			v["lit"] = true
		var node := VotiveCandle.new()
		node.position = RoomGrid.tile_center(v["tile"]) + Vector2(0, 12)
		node.setup(world, v)
		node.lit_changed.connect(_on_votive_changed)
		game.entity_layer.add_child(node)
		votives.append(node)
		world.votives.append(node)


func _spawn_enemies() -> void:
	var i := 0
	for s in current.spawns:
		var opts := {"champion": str(s.get("champion", "")), "spawn_time": Enemy.SPAWN_TIME + i * 0.06}
		if bool(s.get("boss", false)):
			opts["spawn_time"] = 0.9
		var e := world.spawn_enemy(str(s["id"]), RoomGrid.tile_center(s["tile"]), opts)
		if e != null and e.is_boss:
			game.on_boss_spawned(e)
		i += 1
	Audio.play("spawn", -6.0)


func lit_votives() -> int:
	var n := 0
	for v in votives:
		if is_instance_valid(v) and v.lit:
			n += 1
	return n


func _emit_votives() -> void:
	EventBus.votives_changed.emit(lit_votives(), votives.size())


func _on_votive_changed(_candle: VotiveCandle, _lit: bool) -> void:
	_emit_votives()


func _physics_process(_delta: float) -> void:
	if layout == null or view == null or transitioning or world.player == null or not world.player.alive:
		return
	if combat_active:
		if world.live_enemy_count() == 0:
			_on_room_cleared(false)
		elif not votives.is_empty() and lit_votives() == votives.size():
			_awaken_by_light()
	_check_doors()


## Todas las velas arden: las sombras no soportan la luz y se deshacen.
func _awaken_by_light() -> void:
	for e in world.enemies.duplicate():
		if is_instance_valid(e) and e.alive and not e.is_boss:
			e.dissolve()
	world.projectiles.clear_team(Team.ENEMY, true)
	world.run.rooms_by_light += 1
	_on_room_cleared(true)


func _on_room_cleared(by_light: bool) -> void:
	combat_active = false
	current.cleared = true
	view.set_doors_open(true)
	for v in votives:
		if is_instance_valid(v) and not v.lit:
			v.ignite(false)
	world.run.rooms_cleared += 1
	world.player.inventory.add_charge(1)
	if current.type == "boss":
		game.on_boss_room_cleared()
	else:
		# Despertar con luz siempre deja algo: compensa renunciar a las bajas.
		var kind: String = game.loot.roll_pickup("room_clear", world.drop_rng, world.player_luck(), by_light)
		if kind != "":
			world.spawn_pickup(kind, view.grid.nearest_walkable_pos(RoomView.center()))
	world.engine.emit("room_clear", {"depth": 0, "room_type": current.type, "by_light": by_light, "tags": PackedStringArray(["room_clear"])})
	Audio.play("awaken" if by_light else "door")
	EventBus.room_awakened.emit(current, by_light)
	EventBus.room_cleared.emit(current)
	_emit_votives()
	room_cleared.emit(current)


func _check_doors() -> void:
	var pl := world.player
	var pp := pl.global_position
	for d in current.doors:
		var door: Dictionary = current.doors[d]
		if bool(door["hidden"]) or not view.door_is_passable(d):
			continue
		var beyond := false
		match d:
			0:
				beyond = pp.y < -10.0
			1:
				beyond = pp.x > RoomView.W + 10.0
			2:
				beyond = pp.y > RoomView.H + 10.0
			3:
				beyond = pp.x < -10.0
		if beyond:
			transition(d)
			return


func doors_open() -> bool:
	return view != null and view.doors_open


func transition(d: int) -> void:
	if transitioning:
		return
	transitioning = true
	world.player.controllable = false
	var target_coord: Vector2i = current.doors[d]["to"]
	await fade_to(1.0, 0.14)
	enter_room(target_coord, FloorLayout.opposite(d))
	await fade_to(0.0, 0.18)
	if world.player != null and world.player.alive:
		world.player.controllable = true
	transitioning = false


func fade_to(alpha: float, time: float) -> void:
	if fade == null:
		return
	var tw := create_tween()
	tw.tween_property(fade, "color:a", alpha, time)
	await tw.finished


func _on_secret_revealed(dir: int) -> void:
	var door: Dictionary = current.doors[dir]
	var sec := layout.get_room(door["to"])
	if sec != null:
		sec.known = true
	Audio.play("secret")
	EventBus.toast.emit("La cera se abre: había un pasaje", Palette.UI_ACCENT)
	room_changed.emit(current)

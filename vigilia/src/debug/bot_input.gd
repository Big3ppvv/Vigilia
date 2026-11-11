class_name BotInput
extends InputSource
## Piloto automático: juega partidas completas para pruebas de humo, de estrés y
## para depurar (F8). Política simple pero completa:
##   evitar proyectiles -> combatir (mantener distancia, ametrallar lateralmente)
##   -> recoger consumibles -> tomar objetos asequibles -> salida del piso ->
##   explorar la sala no visitada más cercana (BFS sobre el grafo del piso).
## Usa su propio RNG con semilla fija: no altera los flujos de la partida.

var game: Node
var stats := {"items_taken": 0, "dodges": 0}
## Último objetivo de exploración (diagnóstico).
var last_goal := ""
var _move := Vector2.ZERO
var _aim := Vector2.ZERO
var _shoot := false
var _pressed := {}
var _rng := RandomNumberGenerator.new()
var _strafe := 1.0
var _strafe_t := 0.0
var _dodge_cd := 0.0
var _interact_cd := 0.0
var _stuck_t := 0.0
var _unstick_t := 0.0
var _unstick_dir := Vector2.ZERO
var _last_pos := Vector2.ZERO
var _map_target := Vector2i(-99, -99)
## Rejilla para la que se calculó _map: la caché DEBE depender de la sala
## (antes solo dependía de la casilla destino y reutilizaba mapas de otra sala).
var _map_grid: RoomGrid = null
var _map := PackedInt32Array()


func _init(p_game: Node) -> void:
	game = p_game
	_rng.seed = 4242


func get_move() -> Vector2:
	return _move


func get_aim(_player: Node2D) -> Vector2:
	return _aim


func is_shooting() -> bool:
	return _shoot


func just_pressed(action: String) -> bool:
	return _pressed.has(action)


func update(player: Node2D, delta: float) -> void:
	_pressed.clear()
	_shoot = false
	_move = Vector2.ZERO
	var pl := player as Player
	var w: CombatWorld = game.world
	if pl == null or not pl.alive or w.room == null or game.director.transitioning:
		return
	_dodge_cd -= delta
	_interact_cd -= delta
	_strafe_t -= delta
	if _strafe_t <= 0.0:
		_strafe_t = _rng.randf_range(0.8, 1.8)
		_strafe = -_strafe
	if _unstick_t > 0.0:
		_unstick_t -= delta
		_move = _unstick_dir
		_track_stuck(pl, delta)
		return
	var target := w.nearest_hostile(pl.global_position, Team.PLAYER, 3000.0)
	if target != null:
		_combat(pl, w, target)
	else:
		_explore(pl, w)
	_evade(pl, w)
	_track_stuck(pl, delta)


func _combat(pl: Player, w: CombatWorld, target: Node2D) -> void:
	var tv: Vector2 = target.get("velocity") if target.get("velocity") != null else Vector2.ZERO
	var lead := target.global_position + tv * 0.18
	_aim = (lead - pl.global_position).normalized()
	_shoot = true
	var d := pl.global_position.distance_to(target.global_position)
	var to := (target.global_position - pl.global_position).normalized()
	var mv := Vector2.ZERO
	if d < 170.0:
		mv = -to
	elif d > 300.0 or not w.room.grid.has_line_of_sight(pl.global_position, target.global_position):
		mv = _path_dir(pl, target.global_position)
	mv += to.orthogonal() * _strafe * 0.8
	var c := RoomView.center()
	var off := pl.global_position - c
	if absf(off.x) > 380.0 or absf(off.y) > 210.0:
		mv += (c - pl.global_position).normalized() * 0.9
	_move = mv.normalized()
	var inv := pl.inventory
	if inv.active_id != "" and inv.active_charge >= inv.active_max and (w.live_enemy_count() >= 3 or bool(target.get("is_boss"))):
		_pressed["use_active"] = true


func _explore(pl: Player, w: CombatWorld) -> void:
	for n in game.entity_layer.get_children():
		if n is Pickup and n._wanted(pl):
			last_goal = "consumible %s" % n.kind
			_move = _path_dir(pl, n.global_position)
			return
	for n in game.get_tree().get_nodes_in_group("pedestals"):
		var ped := n as ItemPedestal
		if ped == null or ped.taken or ped.price > pl.coins:
			continue
		if ped.is_consumable() and ped.consumable_kind == "heart" and pl.hp >= pl.max_hp():
			continue
		# No intercambiar activos: el juego suelta el anterior y el bot entraría
		# en un bucle de intercambio infinito.
		if not ped.is_consumable() and pl.inventory.active_id != "" and str(ContentDB.get_item(ped.item_id).get("type", "")) == "active":
			continue
		last_goal = "pedestal %s %s" % [ped.item_id, Vector2i(ped.global_position)]
		if pl.global_position.distance_to(ped.global_position) < 44.0:
			if _interact_cd <= 0.0:
				_pressed["interact"] = true
				_interact_cd = 0.5
				stats["items_taken"] += 1
		else:
			_move = _path_dir(pl, ped.global_position)
		return
	for n in game.get_tree().get_nodes_in_group("interactables"):
		if n is ExitPortal:
			if pl.global_position.distance_to(n.global_position) < 44.0:
				if _interact_cd <= 0.0:
					_pressed["interact"] = true
					_interact_cd = 1.0
			else:
				_move = _path_dir(pl, n.global_position)
			return
	var door := _choose_door(pl)
	last_goal = "puerta %d" % door
	if door >= 0:
		var outward := Vector2(FloorLayout.DIRS[door])
		var gap := RoomView.door_edge_center(door)
		var inside := gap - outward * 34.0
		if pl.global_position.distance_to(inside) < 26.0 or (pl.global_position - gap).dot(outward) > -40.0:
			_move = outward
		else:
			_move = _path_dir(pl, inside)


## Elige la puerta hacia la sala objetivo: la no visitada conocida más cercana;
## si no queda ninguna, la sala del jefe.
func _choose_door(pl: Player) -> int:
	var layout: FloorLayout = game.layout
	var cur: RoomData = game.director.current
	if layout == null or cur == null:
		return -1
	var prev := {}
	var dist := {cur.coord: 0}
	var q: Array = [cur.coord]
	var goal := Vector2i(9999, 9999)
	while not q.is_empty():
		var c: Vector2i = q.pop_front()
		var rd: RoomData = layout.get_room(c)
		if c != cur.coord and not rd.visited and rd.known:
			goal = c
			break
		for d in rd.doors:
			var door: Dictionary = rd.doors[d]
			if bool(door["hidden"]):
				continue
			if bool(door.get("locked", false)) and pl.keys <= 0:
				continue
			var n: Vector2i = door["to"]
			if not dist.has(n):
				dist[n] = int(dist[c]) + 1
				prev[n] = c
				q.append(n)
	if goal == Vector2i(9999, 9999):
		var boss: RoomData = layout.get_room(layout.boss)
		if boss == null or cur.coord == layout.boss or not dist.has(layout.boss):
			return -1
		goal = layout.boss
	var step := goal
	while prev.has(step) and prev[step] != cur.coord:
		step = prev[step]
	return FloorLayout.dir_of(step - cur.coord)


func _path_dir(pl: Player, target_pos: Vector2) -> Vector2:
	var grid: RoomGrid = game.world.room.grid
	if grid.has_line_of_sight(pl.global_position, target_pos):
		return (target_pos - pl.global_position).normalized()
	var t := RoomGrid.world_to_tile(target_pos)
	if t != _map_target or grid != _map_grid:
		_map_target = t
		_map_grid = grid
		_map = grid.build_distance_map(t)
	var d := grid.step_direction(_map, pl.global_position)
	return d if d != Vector2.ZERO else (target_pos - pl.global_position).normalized()


func _evade(pl: Player, w: CombatWorld) -> void:
	for p in w.projectiles.active_list():
		if p.team != Team.ENEMY:
			continue
		var rel := pl.global_position - p.pos
		var dist := rel.length()
		if dist > 110.0 or p.vel.length() < 1.0:
			continue
		var vdir := p.vel.normalized()
		if rel.dot(vdir) <= 0.0:
			continue
		var perp := absf(rel.cross(vdir))
		if perp < pl.radius + p.radius + 12.0:
			var side := vdir.orthogonal()
			if side.dot(rel) < 0.0:
				side = -side
			_move = (side + _move * 0.3).normalized()
			if _dodge_cd <= 0.0 and dist < 70.0:
				_pressed["dodge"] = true
				_dodge_cd = 0.9
				stats["dodges"] += 1
			return


func _track_stuck(pl: Player, delta: float) -> void:
	if _move.length() > 0.5 and pl.global_position.distance_to(_last_pos) < 1.0:
		_stuck_t += delta
		if _stuck_t > 1.2:
			_stuck_t = 0.0
			_map_grid = null
			_unstick_t = 0.45
			_unstick_dir = Vector2.RIGHT.rotated(_rng.randf() * TAU)
	else:
		_stuck_t = 0.0
	_last_pos = pl.global_position

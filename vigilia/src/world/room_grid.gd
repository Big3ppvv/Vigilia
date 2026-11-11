class_name RoomGrid
extends RefCounted
## Rejilla lógica de una sala: solidez por casilla, terreno y navegación.
##
## La usan: proyectiles (colisión analítica O(1) sin consultas de física),
## enemigos terrestres (campo de flujo BFS hacia el jugador), el bot de pruebas
## y la validación. Fuera de la rejilla todo es pared.

const COLS := 15
const ROWS := 9
const TILE := 64.0

const FLOOR := 0
const ROCK := 1
const PILLAR := 2
const WAX := 3

var cells := PackedByteArray()
## Campo de flujo hacia el jugador (distancias BFS). Se recalcula al cambiar de casilla.
var player_flow := PackedInt32Array()
var player_flow_target := Vector2i(-1, -1)


func build_from_layout(layout: PackedStringArray) -> void:
	cells.resize(COLS * ROWS)
	cells.fill(FLOOR)
	for y in mini(ROWS, layout.size()):
		var row: String = layout[y]
		for x in mini(COLS, row.length()):
			match row[x]:
				"#":
					cells[y * COLS + x] = ROCK
				"X":
					cells[y * COLS + x] = PILLAR
				"~":
					cells[y * COLS + x] = WAX


func in_bounds(t: Vector2i) -> bool:
	return t.x >= 0 and t.y >= 0 and t.x < COLS and t.y < ROWS


func get_cell(t: Vector2i) -> int:
	if not in_bounds(t):
		return PILLAR
	return cells[t.y * COLS + t.x]


func set_cell(t: Vector2i, v: int) -> void:
	if in_bounds(t):
		cells[t.y * COLS + t.x] = v


func is_walkable(t: Vector2i) -> bool:
	if not in_bounds(t):
		return false
	var c := cells[t.y * COLS + t.x]
	return c == FLOOR or c == WAX


static func world_to_tile(p: Vector2) -> Vector2i:
	return Vector2i(floori(p.x / TILE), floori(p.y / TILE))


static func tile_center(t: Vector2i) -> Vector2:
	return Vector2((t.x + 0.5) * TILE, (t.y + 0.5) * TILE)


## ¿Bloquea un proyectil en esta posición? Los espectrales atraviesan obstáculos
## pero no las paredes de la sala.
func blocks_projectile_at(p: Vector2, spectral: bool = false) -> bool:
	if p.x < 0.0 or p.y < 0.0 or p.x >= COLS * TILE or p.y >= ROWS * TILE:
		return true
	if spectral:
		return false
	var c := cells[int(p.y / TILE) * COLS + int(p.x / TILE)]
	return c == ROCK or c == PILLAR


func is_wax_at(p: Vector2) -> bool:
	var t := world_to_tile(p)
	return in_bounds(t) and cells[t.y * COLS + t.x] == WAX


## Línea de visión muestreada cada 16 px.
func has_line_of_sight(a: Vector2, b: Vector2) -> bool:
	var d := a.distance_to(b)
	var steps := int(d / 16.0)
	for i in range(1, steps):
		var p := a.lerp(b, float(i) / float(steps))
		if blocks_projectile_at(p):
			return false
	return true


## Mapa de distancias BFS (4 direcciones) desde `target`. -1 = inalcanzable.
func build_distance_map(target: Vector2i) -> PackedInt32Array:
	var dist := PackedInt32Array()
	dist.resize(COLS * ROWS)
	dist.fill(-1)
	if not is_walkable(target):
		target = nearest_walkable_tile(target)
		if not is_walkable(target):
			return dist
	dist[target.y * COLS + target.x] = 0
	var q: Array[Vector2i] = [target]
	var head := 0
	while head < q.size():
		var c: Vector2i = q[head]
		head += 1
		var dc := dist[c.y * COLS + c.x]
		for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var n: Vector2i = c + d
			if is_walkable(n) and dist[n.y * COLS + n.x] < 0:
				dist[n.y * COLS + n.x] = dc + 1
				q.append(n)
	return dist


## Dirección de descenso por el mapa de distancias desde una posición del mundo.
## Considera 8 vecinos sin cortar esquinas. Devuelve ZERO si no hay camino.
func step_direction(dist: PackedInt32Array, from: Vector2) -> Vector2:
	if dist.is_empty():
		return Vector2.ZERO
	var t := world_to_tile(from)
	if not in_bounds(t):
		return (tile_center(Vector2i(clampi(t.x, 0, COLS - 1), clampi(t.y, 0, ROWS - 1))) - from).normalized()
	var here := dist[t.y * COLS + t.x]
	var best := here if here >= 0 else 1 << 30
	var best_t := t
	for dy in [-1, 0, 1]:
		for dx in [-1, 0, 1]:
			if dx == 0 and dy == 0:
				continue
			var n := t + Vector2i(dx, dy)
			if not is_walkable(n):
				continue
			if dx != 0 and dy != 0:
				if not is_walkable(t + Vector2i(dx, 0)) or not is_walkable(t + Vector2i(0, dy)):
					continue
			var dn := dist[n.y * COLS + n.x]
			if dn >= 0 and dn < best:
				best = dn
				best_t = n
	if best_t == t:
		if here == 0:
			return Vector2.ZERO
		return (tile_center(t) - from).normalized() if from.distance_to(tile_center(t)) > 4.0 else Vector2.ZERO
	return (tile_center(best_t) - from).normalized()


func update_player_flow(player_pos: Vector2) -> void:
	var t := world_to_tile(player_pos)
	if t == player_flow_target and not player_flow.is_empty():
		return
	player_flow_target = t
	player_flow = build_distance_map(t)


func nearest_walkable_tile(t: Vector2i) -> Vector2i:
	if is_walkable(t):
		return t
	for r in range(1, 8):
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				var n := t + Vector2i(dx, dy)
				if is_walkable(n):
					return n
	return Vector2i(7, 4)


func nearest_walkable_pos(p: Vector2) -> Vector2:
	return tile_center(nearest_walkable_tile(world_to_tile(p)))


func walkable_tiles() -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	for y in ROWS:
		for x in COLS:
			if is_walkable(Vector2i(x, y)):
				out.append(Vector2i(x, y))
	return out

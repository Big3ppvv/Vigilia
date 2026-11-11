class_name FloorLayout
extends RefCounted
## Grafo de habitaciones de un piso. Datos puros producidos por DungeonGenerator.

## Direcciones: 0=N, 1=E, 2=S, 3=O.
const DIRS := [Vector2i(0, -1), Vector2i(1, 0), Vector2i(0, 1), Vector2i(-1, 0)]

var seed_int := 0
var floor_index := 0
var attempts := 0
var rooms := {}
var start := Vector2i.ZERO
var boss := Vector2i.ZERO
var secret := Vector2i(9999, 9999)
var has_secret := false


static func dir_of(delta: Vector2i) -> int:
	for i in 4:
		if DIRS[i] == delta:
			return i
	return -1


static func opposite(d: int) -> int:
	return (d + 2) % 4


func get_room(c: Vector2i) -> RoomData:
	return rooms.get(c)


func rooms_of_type(t: String) -> Array:
	var out: Array = []
	for c in rooms:
		if rooms[c].type == t:
			out.append(rooms[c])
	return out


## Habitaciones ordenadas por coordenada (orden estable e independiente de la
## historia de inserción: base de todo procesamiento determinista posterior).
func sorted_rooms() -> Array:
	var keys := rooms.keys()
	keys.sort_custom(func(a: Vector2i, b: Vector2i) -> bool: return a.y < b.y or (a.y == b.y and a.x < b.x))
	var out: Array = []
	for k in keys:
		out.append(rooms[k])
	return out


## Distancias BFS desde `from`. Con include_hidden=false no cruza puertas ocultas.
func distances_from(from: Vector2i, include_hidden: bool = false) -> Dictionary:
	var dist := {from: 0}
	var queue: Array = [from]
	while not queue.is_empty():
		var c: Vector2i = queue.pop_front()
		var rd: RoomData = rooms.get(c)
		if rd == null:
			continue
		for d in rd.doors:
			var door: Dictionary = rd.doors[d]
			if bool(door["hidden"]) and not include_hidden:
				continue
			var n: Vector2i = door["to"]
			if not dist.has(n) and rooms.has(n):
				dist[n] = int(dist[c]) + 1
				queue.append(n)
	return dist


func bounds() -> Rect2i:
	var r := Rect2i()
	var first := true
	for c in rooms:
		if first:
			r = Rect2i(c, Vector2i.ONE)
			first = false
		else:
			r = r.expand(c).expand(c + Vector2i.ONE)
	return r


func serialize() -> Dictionary:
	var out: Array = []
	for rd in sorted_rooms():
		out.append(rd.serialize())
	return {
		"floor": floor_index, "start": [start.x, start.y], "boss": [boss.x, boss.y],
		"secret": [secret.x, secret.y] if has_secret else [], "rooms": out,
	}

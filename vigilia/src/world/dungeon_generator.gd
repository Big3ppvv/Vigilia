class_name DungeonGenerator
extends RefCounted
## Generador de pisos DETERMINISTA y PURO: no crea nodos ni toca la presentación.
## Misma semilla + misma VERSION + mismos parámetros => mismo FloorLayout
## (verificado por tests/unit/test_dungeon.gd).
##
## Algoritmo:
##   1. Crecimiento en rejilla desde el origen (sala inicial). Una celda nueva solo
##      se acepta si tiene un único vecino ocupado: produce ramas y no bloques.
##   2. Bucles: se conectan algunos pares de salas normales adyacentes (atajos).
##   3. Salas especiales (jefe, tesoro, cabecera) como HOJAS nuevas con una sola
##      puerta. El jefe va en la hoja más lejana del inicio (BFS), con distancia
##      mínima configurable.
##   4. Sala secreta en una celda vacía adyacente a >= 2 salas normales, unida por
##      puertas OCULTAS (muros agrietados que se abren con explosiones).
##   5. Validación estructural; si falla, se reintenta con una sub-semilla derivada
##      del número de intento (sigue siendo determinista).
##   6. Población: plantilla, espejado, enemigos, pedestales y VELAS VOTIVAS por sala
##      con un RNG derivado de la coordenada => el contenido no depende del orden
##      de visita. Las velas se eligen DESPUÉS de las demás tiradas de la sala.

## v2: cabecera (altar) en lugar de tienda, sin puertas cerradas, velas votivas.
const VERSION := 2
const MAX_ATTEMPTS := 60
## Límites del mapa (|x| <= BOUND_X, |y| <= BOUND_Y) para que el minimapa sea compacto.
const BOUND_X := 5
const BOUND_Y := 4


static func generate(seed_int: int, params: Dictionary) -> FloorLayout:
	var fi := int(params.get("floor_index", 0))
	for attempt in MAX_ATTEMPTS:
		var rng := RngStream.derived(seed_int, "gen:v%d:f%d:a%d" % [VERSION, fi, attempt])
		var layout := _try_generate(rng, params)
		if layout == null:
			continue
		if not validate(layout, params).is_empty():
			continue
		layout.seed_int = seed_int
		layout.attempts = attempt + 1
		_populate(layout, seed_int, params)
		return layout
	push_error("DungeonGenerator: %d intentos fallidos; se usa el piso de respaldo" % MAX_ATTEMPTS)
	var fb := _fallback(params)
	fb.seed_int = seed_int
	fb.attempts = MAX_ATTEMPTS + 1
	_populate(fb, seed_int, params)
	return fb


# ---------------------------------------------------------------------------
# Estructura
# ---------------------------------------------------------------------------

static func _try_generate(rng: RngStream, params: Dictionary) -> FloorLayout:
	var rr: Array = params.get("rooms", [8, 10])
	var target := rng.int_range(int(rr[0]), int(rr[1]))
	var branch := float(params.get("branch_chance", 0.5))
	var cells := {}
	var adj := {}
	var origin := Vector2i.ZERO
	cells[origin] = "start"
	adj[origin] = []
	var queue: Array = [origin]
	var guard := 0
	while cells.size() < target and guard < 500:
		guard += 1
		if queue.is_empty():
			queue.append(rng.pick(cells.keys()))
		var cell: Vector2i = queue.pop_front()
		var dirs: Array = FloorLayout.DIRS.duplicate()
		rng.shuffle(dirs)
		for d in dirs:
			if cells.size() >= target:
				break
			var n: Vector2i = cell + d
			if cells.has(n) or not _in_bounds(n):
				continue
			if _occupied_neighbors(cells, n) > 1:
				continue
			if not rng.chance(branch):
				continue
			cells[n] = "combat"
			adj[n] = []
			_link(adj, cell, n)
			queue.append(n)
	if cells.size() < target:
		return null

	# Bucles entre salas normales (antes de colocar especiales: las distancias
	# del jefe se calculan sobre el grafo definitivo).
	var pairs: Array = []
	for c in cells:
		for d in [Vector2i(1, 0), Vector2i(0, 1)]:
			var n: Vector2i = c + d
			if cells.has(n) and not adj[c].has(n):
				pairs.append([c, n])
	rng.shuffle(pairs)
	var loops := 0
	for pr in pairs:
		if loops >= int(params.get("max_loops", 2)):
			break
		if rng.chance(float(params.get("loop_chance", 0.2))):
			_link(adj, pr[0], pr[1])
			loops += 1

	# Salas especiales como hojas.
	var specials: Array = ["boss"]
	for i in int(params.get("treasure", 1)) + int(params.get("extra_treasure", 0)):
		specials.append("treasure")
	for i in int(params.get("altar", 1)):
		specials.append("altar")
	var boss_cell := Vector2i.ZERO
	for kind in specials:
		var dist := _bfs(adj, origin)
		var cands := _leaf_candidates(cells, dist)
		if kind == "boss":
			var min_d := int(params.get("min_boss_distance", 3))
			var best: Array = []
			var best_d := -1
			for cand in cands:
				var parent: Vector2i = cand[1]
				if parent == origin:
					continue
				var dd := int(dist[parent]) + 1
				if dd < min_d:
					continue
				if dd > best_d:
					best_d = dd
					best = [cand]
				elif dd == best_d:
					best.append(cand)
			if best.is_empty():
				return null
			var pick: Array = rng.pick(best)
			boss_cell = pick[0]
			cells[boss_cell] = "boss"
			adj[boss_cell] = []
			_link(adj, pick[1], boss_cell)
		else:
			if cands.is_empty():
				return null
			var pick2: Array = rng.pick(cands)
			cells[pick2[0]] = kind
			adj[pick2[0]] = []
			_link(adj, pick2[1], pick2[0])

	# Sala secreta.
	var secret_cell := Vector2i(9999, 9999)
	var hidden_links: Array = []
	if bool(params.get("secret", true)):
		var best_s: Array = []
		var best_n := 1
		var seen := {}
		for c in cells:
			for d in FloorLayout.DIRS:
				var e: Vector2i = c + d
				if cells.has(e) or seen.has(e) or not _in_bounds(e):
					continue
				seen[e] = true
				var normals := 0
				var near_boss := false
				for d2 in FloorLayout.DIRS:
					var nb: Vector2i = e + d2
					if cells.has(nb):
						if cells[nb] == "boss":
							near_boss = true
						elif cells[nb] in ["start", "combat"]:
							normals += 1
				if near_boss or normals < 2:
					continue
				if normals > best_n:
					best_n = normals
					best_s = [e]
				elif normals == best_n:
					best_s.append(e)
		if best_s.is_empty():
			return null
		secret_cell = rng.pick(best_s)
		cells[secret_cell] = "secret"
		adj[secret_cell] = []
		for d in FloorLayout.DIRS:
			var nb2: Vector2i = secret_cell + d
			if cells.has(nb2) and cells[nb2] in ["start", "combat"]:
				hidden_links.append(nb2)

	# Construcción del FloorLayout.
	var layout := FloorLayout.new()
	layout.floor_index = int(params.get("floor_index", 0))
	layout.start = origin
	layout.boss = boss_cell
	for c in cells:
		var rd := RoomData.new()
		rd.coord = c
		rd.type = cells[c]
		layout.rooms[c] = rd
	for c in adj:
		for n in adj[c]:
			var d := FloorLayout.dir_of(n - c)
			var kind := _door_kind(cells[c], cells[n])
			layout.rooms[c].doors[d] = {"to": n, "kind": kind, "hidden": false, "locked": false}
	if secret_cell != Vector2i(9999, 9999):
		layout.secret = secret_cell
		layout.has_secret = true
		for p in hidden_links:
			var d_in := FloorLayout.dir_of(secret_cell - p)
			layout.rooms[p].doors[d_in] = {"to": secret_cell, "kind": "secret", "hidden": true, "locked": false}
			layout.rooms[secret_cell].doors[FloorLayout.opposite(d_in)] = {"to": p, "kind": "secret", "hidden": false, "locked": false}
	var depth := layout.distances_from(origin, true)
	for c in layout.rooms:
		layout.rooms[c].depth = int(depth.get(c, 0))
	return layout


static func _door_kind(a: String, b: String) -> String:
	for t in ["boss", "treasure", "altar"]:
		if a == t or b == t:
			return t
	return "normal"


static func _in_bounds(c: Vector2i) -> bool:
	return absi(c.x) <= BOUND_X and absi(c.y) <= BOUND_Y


static func _occupied_neighbors(cells: Dictionary, c: Vector2i) -> int:
	var n := 0
	for d in FloorLayout.DIRS:
		if cells.has(c + d):
			n += 1
	return n


static func _link(adj: Dictionary, a: Vector2i, b: Vector2i) -> void:
	if not adj[a].has(b):
		adj[a].append(b)
	if not adj[b].has(a):
		adj[b].append(a)


static func _bfs(adj: Dictionary, from: Vector2i) -> Dictionary:
	var dist := {from: 0}
	var q: Array = [from]
	while not q.is_empty():
		var c: Vector2i = q.pop_front()
		for n in adj[c]:
			if not dist.has(n):
				dist[n] = int(dist[c]) + 1
				q.append(n)
	return dist


## Celdas vacías con exactamente un vecino ocupado y que sea sala normal.
## Devuelve [[celda_nueva, padre], ...] en orden determinista.
static func _leaf_candidates(cells: Dictionary, dist: Dictionary) -> Array:
	var out: Array = []
	var seen := {}
	for c in cells:
		if not cells[c] in ["start", "combat"]:
			continue
		for d in FloorLayout.DIRS:
			var e: Vector2i = c + d
			if cells.has(e) or seen.has(e) or not _in_bounds(e):
				continue
			if _occupied_neighbors(cells, e) != 1:
				continue
			seen[e] = true
			if dist.has(c):
				out.append([e, c])
	return out


## Validación estructural. Devuelve la lista de problemas (vacía = válido).
static func validate(layout: FloorLayout, params: Dictionary) -> PackedStringArray:
	var errs := PackedStringArray()
	var start_room := layout.get_room(layout.start)
	if start_room == null or start_room.type != "start":
		errs.append("sin sala inicial")
		return errs
	var counts := {}
	for c in layout.rooms:
		var t: String = layout.rooms[c].type
		counts[t] = int(counts.get(t, 0)) + 1
	if int(counts.get("boss", 0)) != 1:
		errs.append("debe haber exactamente 1 jefe")
	var want_treasure := int(params.get("treasure", 1)) + int(params.get("extra_treasure", 0))
	if int(counts.get("treasure", 0)) != want_treasure:
		errs.append("tesoros: %d (se esperan %d)" % [counts.get("treasure", 0), want_treasure])
	if int(counts.get("altar", 0)) != int(params.get("altar", 1)):
		errs.append("cabeceras incorrectas")
	var normal := int(counts.get("start", 0)) + int(counts.get("combat", 0))
	var rr: Array = params.get("rooms", [8, 10])
	if normal < int(rr[0]) or normal > int(rr[1]):
		errs.append("salas normales fuera de rango: %d" % normal)
	# Simetría de puertas.
	for c in layout.rooms:
		var rd: RoomData = layout.rooms[c]
		for d in rd.doors:
			var door: Dictionary = rd.doors[d]
			var n: Vector2i = door["to"]
			if n - c != FloorLayout.DIRS[d]:
				errs.append("puerta %s->%s no adyacente" % [c, n])
				continue
			var other: RoomData = layout.get_room(n)
			if other == null or not other.doors.has(FloorLayout.opposite(d)):
				errs.append("puerta asimétrica %s->%s" % [c, n])
	# Alcanzabilidad sin puertas ocultas: todo excepto la secreta.
	var vis := layout.distances_from(layout.start, false)
	for c in layout.rooms:
		var rd2: RoomData = layout.rooms[c]
		if rd2.type == "secret":
			if vis.has(c):
				errs.append("la sala secreta es visible sin explosiones")
		elif not vis.has(c):
			errs.append("sala inalcanzable %s (%s)" % [c, rd2.type])
	var all_d := layout.distances_from(layout.start, true)
	if layout.has_secret and not all_d.has(layout.secret):
		errs.append("sala secreta inalcanzable")
	# Especiales: una sola puerta visible.
	for c in layout.rooms:
		var rd3: RoomData = layout.rooms[c]
		if rd3.type in ["boss", "treasure", "altar"] and rd3.door_count(true) != 1:
			errs.append("sala especial %s con %d puertas" % [rd3.type, rd3.door_count(true)])
	if vis.has(layout.boss) and int(vis[layout.boss]) < int(params.get("min_boss_distance", 3)):
		errs.append("jefe demasiado cerca del inicio")
	return errs


## Piso lineal garantizado (solo si se agotan los intentos).
static func _fallback(params: Dictionary) -> FloorLayout:
	var layout := FloorLayout.new()
	layout.floor_index = int(params.get("floor_index", 0))
	var spec := {
		Vector2i(0, 0): "start", Vector2i(1, 0): "combat", Vector2i(2, 0): "combat",
		Vector2i(3, 0): "boss", Vector2i(1, -1): "treasure", Vector2i(2, 1): "altar",
	}
	for c in spec:
		var rd := RoomData.new()
		rd.coord = c
		rd.type = spec[c]
		layout.rooms[c] = rd
	var links := [[Vector2i(0, 0), Vector2i(1, 0)], [Vector2i(1, 0), Vector2i(2, 0)], [Vector2i(2, 0), Vector2i(3, 0)],
		[Vector2i(1, 0), Vector2i(1, -1)], [Vector2i(2, 0), Vector2i(2, 1)]]
	for l in links:
		var a: Vector2i = l[0]
		var b: Vector2i = l[1]
		var d := FloorLayout.dir_of(b - a)
		var kind := _door_kind(spec[a], spec[b])
		layout.rooms[a].doors[d] = {"to": b, "kind": kind, "hidden": false, "locked": false}
		layout.rooms[b].doors[FloorLayout.opposite(d)] = {"to": a, "kind": kind, "hidden": false, "locked": false}
	layout.start = Vector2i(0, 0)
	layout.boss = Vector2i(3, 0)
	var depth := layout.distances_from(layout.start, true)
	for c in layout.rooms:
		layout.rooms[c].depth = int(depth.get(c, 0))
	return layout


# ---------------------------------------------------------------------------
# Población
# ---------------------------------------------------------------------------

static func _populate(layout: FloorLayout, seed_int: int, params: Dictionary) -> void:
	var templates: Dictionary = params.get("templates", {})
	var max_depth := 1
	for c in layout.rooms:
		max_depth = maxi(max_depth, layout.rooms[c].depth)
	for rd in layout.sorted_rooms():
		var rng := RngStream.derived(seed_int, "room:v%d:f%d:%d,%d" % [VERSION, layout.floor_index, rd.coord.x, rd.coord.y])
		var tpl := _pick_template(rd, templates, rng, params, float(rd.depth) / float(max_depth))
		if tpl.is_empty():
			push_error("DungeonGenerator: no hay plantilla para '%s'" % rd.type)
			continue
		rd.template_id = str(tpl.get("id", ""))
		rd.template_name = str(tpl.get("name", ""))
		rd.difficulty = int(tpl.get("difficulty", 0))
		var mx := false
		var my := false
		if bool(tpl.get("mirror", false)):
			mx = rng.chance(0.5)
			my = rng.chance(0.5)
		rd.layout = _mirrored(tpl.get("layout", []), mx, my)
		_fill_room(rd, rng, params)


static func _pick_template(rd: RoomData, templates: Dictionary, rng: RngStream, params: Dictionary, depth_ratio: float) -> Dictionary:
	var list: Array = templates.get(rd.type, [])
	if list.is_empty():
		return {}
	if rd.type != "combat":
		return rng.pick_weighted(_weighted(list), "w")["tpl"]
	# Dificultad según profundidad: cuanto más lejos del inicio, más peso a lo difícil.
	var dw: Array = params.get("difficulty_weights", [[1, 1.0]])
	var opts: Array = []
	for e in dw:
		var d := int(e[0])
		var w := float(e[1]) * lerpf(1.0, float(d), clampf(depth_ratio, 0.0, 1.0))
		opts.append({"d": d, "weight": w})
	var chosen: Dictionary = rng.pick_weighted(opts, "weight")
	var diff := int(chosen.get("d", 1))
	var filtered: Array = []
	for t in list:
		if int(t.get("difficulty", 1)) == diff:
			filtered.append(t)
	if filtered.is_empty():
		filtered = list
	return rng.pick_weighted(_weighted(filtered), "w")["tpl"]


static func _weighted(list: Array) -> Array:
	var out: Array = []
	for t in list:
		out.append({"tpl": t, "w": float(t.get("weight", 1.0))})
	return out


static func _mirrored(rows: Array, mx: bool, my: bool) -> PackedStringArray:
	var out := PackedStringArray()
	var src: Array = rows.duplicate()
	if my:
		src.reverse()
	for r in src:
		var s := str(r)
		if mx:
			s = s.reverse()
		out.append(s)
	return out


static func _fill_room(rd: RoomData, rng: RngStream, params: Dictionary) -> void:
	var pool: Array = params.get("enemy_pool", [])
	var champs: Array = params.get("champions", [])
	var champ_chance := float(params.get("champion_chance", 0.0))
	var item_pool: String = {"treasure": "treasure", "secret": "secret", "boss": "boss", "altar": "altar"}.get(rd.type, "treasure")
	var group := 0
	for y in rd.layout.size():
		var row: String = rd.layout[y]
		for x in row.length():
			var ch := row[x]
			var tile := Vector2i(x, y)
			match ch:
				"1", "2", "3":
					var id := _pick_enemy(pool, int(ch), rng)
					if id == "":
						continue
					var champion := ""
					if not champs.is_empty() and rng.chance(champ_chance):
						var cpick: Variant = rng.pick_weighted(champs, "weight")
						if cpick != null:
							champion = str(cpick.get("id", ""))
					rd.spawns.append({"id": id, "tile": tile, "champion": champion, "boss": false})
				"B":
					rd.boss_id = str(params.get("boss", ""))
					rd.boss_reward = str(params.get("boss_reward", "single"))
					rd.spawns.append({"id": rd.boss_id, "tile": tile, "champion": "", "boss": true})
				"I":
					rd.pedestals.append({"tile": tile, "pool": item_pool, "price": 0, "item_id": "", "taken": false, "group": group, "consumable": false})
				"S":
					rd.pedestals.append({"tile": tile, "pool": "altar", "price": -1, "item_id": "", "taken": false, "group": -1, "consumable": false})
				"P":
					rd.pickups.append({"tile": tile, "table": "secret_pickup"})
				"L":
					rd.lore_tile = tile
	rd.cleared = not rd.is_combat()
	if rd.type == "combat":
		_place_votives(rd, rng, 2 if rd.difficulty <= 1 else 3)


## Velas votivas: el objetivo alternativo de la sala (encenderlas todas la despierta).
## Muestreo del punto más lejano: quedan repartidas y obligan a moverse. Nunca en
## accesos de puerta, apariciones ni junto a ellas.
static func _place_votives(rd: RoomData, rng: RngStream, count: int) -> void:
	var blocked := {}
	for s in rd.spawns:
		var st: Vector2i = s["tile"]
		for dy in range(-1, 2):
			for dx in range(-1, 2):
				blocked[st + Vector2i(dx, dy)] = true
	var cands: Array = []
	for y in range(1, rd.layout.size() - 1):
		var row: String = rd.layout[y]
		for x in range(1, row.length() - 1):
			var t := Vector2i(x, y)
			if row[x] != "." or blocked.has(t):
				continue
			# Lejos de las puertas (filas/columnas centrales junto al muro).
			if (absi(x - 7) <= 1 and (y <= 1 or y >= 7)) or (absi(y - 4) <= 1 and (x <= 1 or x >= 13)):
				continue
			cands.append(t)
	if cands.is_empty():
		return
	var chosen: Array = [rng.pick(cands)]
	while chosen.size() < count and chosen.size() < cands.size():
		var best: Array = []
		var best_d := -1
		for c in cands:
			if chosen.has(c):
				continue
			var md := 9999
			for o in chosen:
				md = mini(md, absi(c.x - o.x) + absi(c.y - o.y))
			if md > best_d:
				best_d = md
				best = [c]
			elif md == best_d:
				best.append(c)
		chosen.append(rng.pick(best))
	for c in chosen:
		rd.votives.append({"tile": c, "lit": false})


## Elige un enemigo del pool con nivel == tier; si no hay, baja de nivel.
static func _pick_enemy(pool: Array, tier: int, rng: RngStream) -> String:
	for t in range(tier, 0, -1):
		var opts: Array = []
		for e in pool:
			if int(e.get("tier", 1)) == t:
				opts.append(e)
		if not opts.is_empty():
			var pick: Variant = rng.pick_weighted(opts, "weight")
			if pick != null:
				return str(pick.get("id", ""))
	return ""

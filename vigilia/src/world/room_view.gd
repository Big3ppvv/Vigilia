class_name RoomView
extends Node2D
## Presentación y colisión de la sala actual, construida a partir de RoomData.
##
## Espacio local: el interior va de (0,0) a (960,576); los muros ocupan 64 px
## alrededor. Puertas en el centro de cada muro (casilla 7 del eje horizontal,
## fila 4 del vertical). El dibujo estático se hace una sola vez (y al romper
## cera o cambiar puertas); lo luminoso (velas, luna, grietas) vive en el hijo
## _fx, que no se oscurece con la penumbra.
##
## Dos estilos (floors.json "style"):
##   chapel — la capilla de cera: losas, ladrillo, goteo de cera, velas.
##   ward   — la sala: el hospital soñado. Baldosas, pared pintada, cortinas,
##            luz de luna por una ventana, puertas batientes con ojo de buey.

signal secret_revealed(dir: int)

const TILE := 64.0
const COLS := 15
const ROWS := 9
const W := 960.0
const H := 576.0
const WALL := 64.0
## Impactos de brasa que abren un muro agrietado (las explosiones lo abren de golpe).
const CRACK_HITS := 4

var data: RoomData
var grid := RoomGrid.new()
var floor_index := 0
var style := "chapel"
var doors_open := true
## La sala despierta (luz cálida, apliques encendidos). Las de combate empiezan dormidas.
var awake := true
var crack_hits := {}
var _wall_body: StaticBody2D
var _obstacle_body: StaticBody2D
var _obstacle_shapes := {}
var _door_blockers := {}
var _fx: _RoomFx
var _decor_stains: Array = []
var _decor_cracks: Array = []
var _decor_drips: Array = []
var _tile_shade := PackedFloat32Array()
var candles: Array = []
var lore_text := ""
var pal := {}


func setup(rd: RoomData, p_floor_index: int, lore: String = "", floor_def: Dictionary = {}) -> void:
	data = rd
	floor_index = p_floor_index
	lore_text = lore
	style = str(floor_def.get("style", "chapel"))
	_build_palette(floor_def.get("palette", {}))
	grid.build_from_layout(rd.layout)
	var broken: Dictionary = rd.flags.get("broken", {})
	for t in broken:
		grid.set_cell(t, RoomGrid.FLOOR)
	awake = rd.cleared or not rd.is_combat()
	z_index = -10
	_build_walls()
	_build_obstacles()
	_generate_decor()
	_fx = _RoomFx.new()
	_fx.room = self
	_fx.z_index = 1  # relativo al padre (-10): queda en -9, encima del suelo
	var emissive := CanvasItemMaterial.new()
	emissive.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
	_fx.material = emissive
	_fx.lit_sconces = candles.size() if awake else 0
	add_child(_fx)
	queue_redraw()


func _build_palette(src: Dictionary) -> void:
	pal = {
		"floor_a": Palette.parse(src.get("floor_a", ""), Palette.FLOOR_A),
		"floor_b": Palette.parse(src.get("floor_b", ""), Palette.FLOOR_B),
		"floor_line": Palette.parse(src.get("floor_line", ""), Palette.FLOOR_LINE),
		"wall": Palette.parse(src.get("wall", ""), Palette.WALL),
		"wall_top": Palette.parse(src.get("wall_top", ""), Palette.WALL_TOP),
		"wall_dark": Palette.parse(src.get("wall_dark", ""), Palette.WALL_DARK),
		"accent": Palette.parse(src.get("accent", ""), Palette.FLAME),
	}


## La sala despierta: los apliques se encienden uno a uno (cosmético).
func awaken() -> void:
	if awake:
		return
	awake = true
	_fx.igniting = true


# ---------------------------------------------------------------------------
# Geometría
# ---------------------------------------------------------------------------

static func gap_rect(dir: int) -> Rect2:
	match dir:
		0:
			return Rect2(448, -64, 64, 64)
		1:
			return Rect2(960, 256, 64, 64)
		2:
			return Rect2(448, 576, 64, 64)
		_:
			return Rect2(-64, 256, 64, 64)


## Centro de la abertura de la puerta en el borde interior.
static func door_edge_center(dir: int) -> Vector2:
	match dir:
		0:
			return Vector2(480, 0)
		1:
			return Vector2(960, 288)
		2:
			return Vector2(480, 576)
		_:
			return Vector2(0, 288)


## Posición donde aparece el jugador al entrar por la puerta `dir` de esta sala.
static func entry_position(dir: int) -> Vector2:
	match dir:
		0:
			return Vector2(480, 60)
		1:
			return Vector2(900, 288)
		2:
			return Vector2(480, 516)
		3:
			return Vector2(60, 288)
		_:
			return Vector2(480, 288)


static func interior_rect() -> Rect2:
	return Rect2(0, 0, W, H)


static func center() -> Vector2:
	return Vector2(W * 0.5, H * 0.5)


func _build_walls() -> void:
	_wall_body = StaticBody2D.new()
	_wall_body.collision_layer = 1
	_wall_body.collision_mask = 0
	add_child(_wall_body)
	for dir in 4:
		var has_door := data.doors.has(dir)
		for r in _wall_rects(dir, has_door):
			_add_rect(_wall_body, r)
		if has_door:
			_door_blockers[dir] = _add_rect(_wall_body, gap_rect(dir))
			# Tope exterior: aunque la transición falle, nadie sale del mapa.
			var g := gap_rect(dir)
			var outward: Vector2 = FloorLayout.DIRS[dir] * 64.0
			_add_rect(_wall_body, Rect2(g.position + outward, g.size))


func _wall_rects(dir: int, has_door: bool) -> Array:
	match dir:
		0:
			return [Rect2(-64, -64, 512, 64), Rect2(512, -64, 512, 64)] if has_door else [Rect2(-64, -64, 1088, 64)]
		2:
			return [Rect2(-64, 576, 512, 64), Rect2(512, 576, 512, 64)] if has_door else [Rect2(-64, 576, 1088, 64)]
		1:
			return [Rect2(960, 0, 64, 256), Rect2(960, 320, 64, 256)] if has_door else [Rect2(960, 0, 64, 576)]
		_:
			return [Rect2(-64, 0, 64, 256), Rect2(-64, 320, 64, 256)] if has_door else [Rect2(-64, 0, 64, 576)]


func _add_rect(body: StaticBody2D, r: Rect2) -> CollisionShape2D:
	var cs := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = r.size
	cs.shape = shape
	cs.position = r.position + r.size * 0.5
	body.add_child(cs)
	return cs


func _build_obstacles() -> void:
	_obstacle_body = StaticBody2D.new()
	_obstacle_body.collision_layer = 2
	_obstacle_body.collision_mask = 0
	add_child(_obstacle_body)
	for y in ROWS:
		for x in COLS:
			var t := Vector2i(x, y)
			var c := grid.get_cell(t)
			if c == RoomGrid.ROCK or c == RoomGrid.PILLAR:
				var cs := _add_rect(_obstacle_body, Rect2(Vector2(x, y) * TILE + Vector2(4, 4), Vector2(56, 56)))
				_obstacle_shapes[t] = cs


# ---------------------------------------------------------------------------
# Puertas y secretos
# ---------------------------------------------------------------------------

func door_is_passable(dir: int) -> bool:
	if not data.doors.has(dir):
		return false
	var door: Dictionary = data.doors[dir]
	return doors_open and not bool(door["hidden"])


func set_doors_open(open: bool) -> void:
	doors_open = open
	_refresh_blockers()
	queue_redraw()


func _refresh_blockers() -> void:
	for dir in _door_blockers:
		var cs: CollisionShape2D = _door_blockers[dir]
		cs.set_deferred("disabled", door_is_passable(dir))


## Rompe cera endurecida y revela puertas ocultas dentro del radio.
## Devuelve true si cambió algo.
func on_explosion(pos: Vector2, radius: float) -> bool:
	var changed := false
	for y in ROWS:
		for x in COLS:
			var t := Vector2i(x, y)
			if grid.get_cell(t) == RoomGrid.ROCK and RoomGrid.tile_center(t).distance_to(pos) <= radius + 30.0:
				_break_rock(t)
				changed = true
	for dir in data.doors:
		var door: Dictionary = data.doors[dir]
		if bool(door["hidden"]) and door_edge_center(dir).distance_to(pos) <= radius + 44.0:
			_reveal(dir)
			changed = true
	if changed:
		queue_redraw()
	return changed


## Una brasa choca contra el muro: si hay grietas, cede un poco. Devuelve true
## si golpeó un muro agrietado.
func on_wall_struck(pos: Vector2) -> bool:
	for dir in data.doors:
		var door: Dictionary = data.doors[dir]
		if not bool(door["hidden"]) or door_edge_center(dir).distance_to(pos) > 72.0:
			continue
		crack_hits[dir] = int(crack_hits.get(dir, 0)) + 1
		if int(crack_hits[dir]) >= CRACK_HITS:
			_reveal(dir)
			queue_redraw()
		return true
	return false


func _reveal(dir: int) -> void:
	data.doors[dir]["hidden"] = false
	crack_hits.erase(dir)
	_refresh_blockers()
	secret_revealed.emit(dir)


func _break_rock(t: Vector2i) -> void:
	grid.set_cell(t, RoomGrid.FLOOR)
	if not data.flags.has("broken"):
		data.flags["broken"] = {}
	data.flags["broken"][t] = true
	if _obstacle_shapes.has(t):
		var cs: CollisionShape2D = _obstacle_shapes[t]
		cs.queue_free()
		_obstacle_shapes.erase(t)
	grid.player_flow_target = Vector2i(-1, -1)


# ---------------------------------------------------------------------------
# Dibujo estático
# ---------------------------------------------------------------------------

func _generate_decor() -> void:
	# Aleatoriedad COSMÉTICA, sembrada por coordenada: la misma sala se ve igual
	# al volver, sin consumir los flujos de la simulación.
	var rng := RngStream.derived(SeedUtil.fnv1a32(data.template_id), "decor:%d,%d:%d" % [data.coord.x, data.coord.y, floor_index])
	_tile_shade.resize(COLS * ROWS * 4)
	for i in _tile_shade.size():
		_tile_shade[i] = rng.float_range(-0.03, 0.03)
	for i in rng.int_range(8, 14):
		_decor_stains.append([Vector2(rng.float_range(30, W - 30), rng.float_range(30, H - 30)), rng.float_range(14, 46), rng.float_range(0.05, 0.12)])
	for i in rng.int_range(4, 8):
		var p := Vector2(rng.float_range(40, W - 40), rng.float_range(40, H - 40))
		var pts := PackedVector2Array([p])
		var a := rng.float_range(0, TAU)
		for k in rng.int_range(3, 6):
			a += rng.float_range(-0.9, 0.9)
			p += Vector2.RIGHT.rotated(a) * rng.float_range(10, 26)
			pts.append(p)
		_decor_cracks.append(pts)
	for i in rng.int_range(6, 12):
		_decor_drips.append([rng.float_range(20, W - 20), rng.float_range(10, 34), rng.float_range(5, 10)])
	for x in [96.0, 288.0, 672.0, 864.0]:
		candles.append(Vector2(x, -30))
	for y in [128.0, 448.0]:
		candles.append(Vector2(-30, y))
		candles.append(Vector2(W + 30, y))


func _draw() -> void:
	draw_rect(Rect2(-400, -400, W + 800, H + 800), Palette.VOID)
	draw_rect(Rect2(-64, -64, W + 128, H + 128), pal["wall"])
	if style == "ward":
		_draw_ward_walls()
		_draw_ward_floor()
	else:
		_draw_bricks()
		_draw_chapel_floor()
	_draw_floor_details()
	_draw_wall_edges()
	_draw_obstacles()
	for dir in data.doors:
		_draw_door(dir)
	match data.type:
		"boss":
			_draw_ritual_circle()
		"altar":
			_draw_night_nurse()


func _draw_chapel_floor() -> void:
	# Losas irregulares: hiladas de 64 px con juntas desplazadas.
	for y in ROWS:
		var off := 0.0 if y % 2 == 0 else 32.0
		var x := -off
		var k := 0
		while x < W:
			var w := 64.0 if (k + y) % 3 != 0 else 96.0
			var r := Rect2(maxf(0.0, x), y * TILE, minf(x + w, W) - maxf(0.0, x), TILE)
			var sh := _tile_shade[(y * COLS + k) % _tile_shade.size()]
			var base: Color = pal["floor_a"] if (k + y) % 2 == 0 else pal["floor_b"]
			draw_rect(r, base.lightened(sh) if sh > 0 else base.darkened(-sh))
			draw_rect(r, pal["floor_line"], false, 1.0)
			x += w
			k += 1


func _draw_ward_floor() -> void:
	# Baldosas de 32 px con lechada: el suelo de una planta de hospital.
	var t := 32.0
	for y in int(H / t):
		for x in int(W / t):
			var sh := _tile_shade[(y * 30 + x) % _tile_shade.size()] * 0.7
			var base: Color = pal["floor_a"] if (x + y) % 2 == 0 else pal["floor_b"]
			draw_rect(Rect2(x * t, y * t, t, t), base.lightened(sh) if sh > 0 else base.darkened(-sh))
	for x in range(1, int(W / t)):
		draw_line(Vector2(x * t, 0), Vector2(x * t, H), pal["floor_line"], 1.0)
	for y in range(1, int(H / t)):
		draw_line(Vector2(0, y * t), Vector2(W, y * t), pal["floor_line"], 1.0)


func _draw_floor_details() -> void:
	for s in _decor_stains:
		draw_circle(s[0], s[1], Color(0, 0, 0, s[2]))
	for c in _decor_cracks:
		draw_polyline(c, Color(0, 0, 0, 0.35), 1.5)
	# Charcos de cera.
	for y in ROWS:
		for x in COLS:
			if grid.get_cell(Vector2i(x, y)) == RoomGrid.WAX:
				var cc := RoomGrid.tile_center(Vector2i(x, y))
				draw_circle(cc, 38.0, Color(Palette.WAX, 0.16))
				draw_circle(cc + Vector2(-6, -4), 24.0, Color(Palette.WAX, 0.12))
	# Goteo de cera al pie del muro superior (también en la sala: el sueño la invade).
	for d in _decor_drips:
		var a := 0.5 if style == "chapel" else 0.3
		draw_rect(Rect2(d[0] - d[2] * 0.5, 0, d[2], d[1]), Color(Palette.WAX, a))
		draw_circle(Vector2(d[0], d[1]), d[2] * 0.6, Color(Palette.WAX, a + 0.05))
	if data.type == "start" and floor_index == 0:
		_draw_floor_text(lore_text, Vector2(W * 0.5, 150), Color(Palette.BONE, 0.3), 14)
	elif data.lore_tile != Vector2i(-1, -1) and lore_text != "":
		_draw_floor_text(lore_text, RoomGrid.tile_center(data.lore_tile) + Vector2(0, 40), Color(Palette.WAX, 0.55), 14)


func _draw_floor_text(text: String, at: Vector2, col: Color, size: int) -> void:
	var font := ThemeDB.fallback_font
	var lines := text.split(" · ") if text.find(" · ") >= 0 else PackedStringArray([text])
	var y := at.y - (lines.size() - 1) * (size + 6) * 0.5
	for line in lines:
		var w := font.get_string_size(line, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
		draw_string(font, Vector2(at.x - w * 0.5, y), line, HORIZONTAL_ALIGNMENT_LEFT, -1, size, col)
		y += size + 6


func _draw_bricks() -> void:
	# Hiladas del muro (el suelo se dibuja después y las tapa en el interior).
	for y in range(-64, int(H) + 64, 16):
		var row_off := 24.0 if (y / 16) % 2 == 0 else 0.0
		draw_line(Vector2(-64, y), Vector2(W + 64, y), pal["wall_dark"], 1.0)
		for x in range(-64, int(W) + 64, 48):
			draw_line(Vector2(x + row_off, y), Vector2(x + row_off, y + 16), pal["wall_dark"], 1.0)


func _draw_ward_walls() -> void:
	# Pared pintada a dos tonos con zócalo y pasamanos.
	var wall: Color = pal["wall"]
	draw_rect(Rect2(-64, -64, W + 128, 30), wall.lightened(0.06))
	draw_rect(Rect2(-64, -34, W + 128, 4), pal["wall_top"])
	draw_rect(Rect2(-64, H + 30, W + 128, 34), wall.darkened(0.15))
	# Cortinas en los muros laterales (pliegues verticales).
	for side in [-1.0, 1.0]:
		var x0 := -60.0 if side < 0 else W + 8.0
		for i in 9:
			var y := 20.0 + i * 60.0
			if absf(y + 20.0 - 288.0) < 50.0:
				continue
			for k in 4:
				var fx := x0 + k * 13.0
				draw_rect(Rect2(fx, y, 10, 44), Color(0.36, 0.48, 0.45, 0.85).darkened(0.12 * (k % 2)))


func _draw_wall_edges() -> void:
	draw_rect(Rect2(-6, -6, W + 12, 6), pal["wall_top"])
	draw_rect(Rect2(-6, H, W + 12, 6), pal["wall_dark"])
	draw_rect(Rect2(-6, 0, 6, H), pal["wall_top"].darkened(0.15))
	draw_rect(Rect2(W, 0, 6, H), pal["wall_top"].darkened(0.15))
	draw_rect(Rect2(-64, -64, W + 128, H + 128), Color(0, 0, 0, 0.6), false, 4.0)
	for c in candles:
		var base: Vector2 = c
		draw_rect(Rect2(base.x - 7, base.y - 2, 14, 18), pal["wall_dark"])
		draw_rect(Rect2(base.x - 4, base.y - 12, 8, 14), Palette.WAX if style == "chapel" else Color(0.9, 0.92, 0.9))


func _draw_obstacles() -> void:
	for y in ROWS:
		for x in COLS:
			var t := Vector2i(x, y)
			var c := grid.get_cell(t)
			var o := Vector2(x, y) * TILE
			if c == RoomGrid.ROCK:
				# Cera endurecida: grumos que una explosión puede romper.
				var cc := o + Vector2(32, 34)
				var pts := PackedVector2Array()
				for i in 9:
					var a := float(i) / 9.0 * TAU
					var r := 25.0 + 4.0 * sin(a * 3.0 + x * 1.7 + y)
					pts.append(cc + Vector2(cos(a) * r, sin(a) * r * 0.86))
				draw_colored_polygon(pts, Palette.WAX_SHADOW)
				draw_circle(cc + Vector2(-6, -7), 13.0, Palette.WAX_DARK.darkened(0.15))
				draw_circle(cc + Vector2(-9, -10), 5.0, Color(Palette.WAX, 0.5))
				draw_line(cc + Vector2(4, -6), cc + Vector2(10, 8), Color(0, 0, 0, 0.4), 1.5)
			elif c == RoomGrid.PILLAR:
				if style == "ward":
					_draw_locker(o)
				else:
					draw_rect(Rect2(o + Vector2(6, 10), Vector2(52, 52)), Color(0, 0, 0, 0.35))
					draw_rect(Rect2(o + Vector2(6, 4), Vector2(52, 52)), pal["wall_top"])
					draw_rect(Rect2(o + Vector2(12, 10), Vector2(40, 40)), pal["wall"])
					draw_rect(Rect2(o + Vector2(6, 4), Vector2(52, 52)), pal["wall_dark"], false, 2.0)
					draw_rect(Rect2(o + Vector2(27, 14), Vector2(10, 18)), Palette.WAX)


## Taquilla metálica (pilar de la sala): sólida y legible como obstáculo.
func _draw_locker(o: Vector2) -> void:
	draw_rect(Rect2(o + Vector2(8, 12), Vector2(50, 50)), Color(0, 0, 0, 0.35))
	var body := Color(0.42, 0.52, 0.5)
	draw_rect(Rect2(o + Vector2(6, 2), Vector2(52, 56)), body)
	draw_rect(Rect2(o + Vector2(6, 2), Vector2(52, 56)), body.darkened(0.45), false, 2.0)
	draw_line(o + Vector2(32, 4), o + Vector2(32, 56), body.darkened(0.35), 1.5)
	for k in 3:
		draw_line(o + Vector2(12, 10 + k * 4), o + Vector2(26, 10 + k * 4), body.darkened(0.3), 1.0)
		draw_line(o + Vector2(38, 10 + k * 4), o + Vector2(52, 10 + k * 4), body.darkened(0.3), 1.0)
	draw_rect(Rect2(o + Vector2(27, 28), Vector2(3, 8)), Color(0.75, 0.72, 0.6))
	draw_rect(Rect2(o + Vector2(34, 28), Vector2(3, 8)), Color(0.75, 0.72, 0.6))


func _draw_door(dir: int) -> void:
	var door: Dictionary = data.doors[dir]
	var c := door_edge_center(dir)
	var rot: float = [0.0, PI * 0.5, PI, -PI * 0.5][dir]
	draw_set_transform(c, rot, Vector2.ONE)
	if bool(door["hidden"]):
		# Muro agrietado: la pista del secreto (la luz que se filtra vive en _fx).
		var k := float(crack_hits.get(dir, 0)) / float(CRACK_HITS)
		var wcrack := 2.0 + 2.0 * k
		draw_polyline(PackedVector2Array([Vector2(-18, -8), Vector2(-6, -22), Vector2(2, -14), Vector2(12, -34), Vector2(20, -26)]), Color(0, 0, 0, 0.6), wcrack)
		draw_polyline(PackedVector2Array([Vector2(-4, -30), Vector2(4, -44), Vector2(-2, -52)]), Color(0, 0, 0, 0.5), wcrack * 0.75)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
		return
	var kind := str(door["kind"])
	var frame: Color = pal["wall_top"]
	match kind:
		"treasure":
			frame = Palette.GOLD
		"altar":
			frame = Color("8fb8b0")
		"boss":
			frame = Palette.BLOOD
		"secret":
			frame = Palette.WAX_SHADOW
	var passable := door_is_passable(dir)
	draw_rect(Rect2(-40, -66, 80, 66), frame.darkened(0.35))
	draw_rect(Rect2(-34, -64, 68, 64), frame)
	if kind == "secret":
		draw_colored_polygon(PackedVector2Array([Vector2(-30, 0), Vector2(-26, -40), Vector2(-10, -58), Vector2(12, -54), Vector2(28, -36), Vector2(30, 0)]), Palette.VOID)
	elif style == "ward":
		draw_rect(Rect2(-28, -64, 56, 64), Palette.VOID)
	else:
		draw_rect(Rect2(-28, -64, 56, 64), Palette.VOID)
		draw_circle(Vector2(0, -60), 28.0, Palette.VOID)
	if not passable:
		if style == "ward":
			# Puertas batientes con ojo de buey.
			for sx in [-1.0, 1.0]:
				draw_rect(Rect2(sx * 14.0 - 13.0, -60, 26, 60), Color(0.55, 0.62, 0.6))
				draw_rect(Rect2(sx * 14.0 - 13.0, -60, 26, 60), Color(0.3, 0.36, 0.35), false, 1.5)
				draw_circle(Vector2(sx * 14.0, -38), 6.0, Color(0.15, 0.2, 0.25))
		else:
			draw_rect(Rect2(-28, -58, 56, 58), Color(Palette.WAX_DARK, 0.92))
			for i in 4:
				draw_line(Vector2(-21 + i * 14, -58), Vector2(-21 + i * 14, 0), Palette.WAX_SHADOW, 3.0)
	if kind == "boss":
		for sx in [-1.0, 1.0]:
			draw_colored_polygon(PackedVector2Array([Vector2(sx * 34, -50), Vector2(sx * 52, -74), Vector2(sx * 40, -40)]), Palette.BONE)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _draw_ritual_circle() -> void:
	var c := center()
	var col := Palette.BLOOD if style == "chapel" else Palette.WAX
	draw_arc(c, 190.0, 0, TAU, 64, Color(col, 0.22), 2.0)
	draw_arc(c, 150.0, 0, TAU, 64, Color(col, 0.16), 1.5)
	for i in 7:
		var a := i * TAU / 7.0
		draw_line(c + Vector2.RIGHT.rotated(a) * 150.0, c + Vector2.RIGHT.rotated(a + TAU * 3.0 / 7.0) * 150.0, Color(col, 0.14), 1.5)


## La enfermera de noche: guarda la Cabecera. Su lámpara vive en _fx.
func _draw_night_nurse() -> void:
	var c := Vector2(W * 0.5, 112)
	draw_circle(c + Vector2(0, 40), 34.0, Color(0, 0, 0, 0.3))
	# Uniforme y capa.
	draw_colored_polygon(PackedVector2Array([c + Vector2(-34, 40), c + Vector2(-20, -18), c + Vector2(20, -18), c + Vector2(34, 40)]), Color(0.78, 0.84, 0.82))
	draw_colored_polygon(PackedVector2Array([c + Vector2(-26, 40), c + Vector2(-22, -6), c + Vector2(-12, 40)]), Color(0.2, 0.26, 0.38))
	draw_colored_polygon(PackedVector2Array([c + Vector2(26, 40), c + Vector2(22, -6), c + Vector2(12, 40)]), Color(0.2, 0.26, 0.38))
	draw_circle(c + Vector2(0, -30), 14.0, Color(0.86, 0.78, 0.72))
	draw_rect(Rect2(c + Vector2(-14, -48), Vector2(28, 9)), Color(0.95, 0.96, 0.95))
	# Sin rostro: solo dos puntos de luz, como todo en el sueño.
	draw_circle(c + Vector2(-5, -30), 2.0, Color(0.15, 0.1, 0.12))
	draw_circle(c + Vector2(5, -30), 2.0, Color(0.15, 0.1, 0.12))
	draw_line(c + Vector2(20, -6), c + Vector2(40, 10), Color(0.78, 0.84, 0.82), 6.0)
	var font := ThemeDB.fallback_font
	var txt := "La enfermera de noche"
	var w := font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x
	draw_string(font, c + Vector2(-w * 0.5, 66), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(Palette.BONE, 0.45))
	var sub := "«Para recordar hay que gastar un poco de luz.»"
	var w2 := font.get_string_size(sub, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x
	draw_string(font, c + Vector2(-w2 * 0.5, 84), sub, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(Palette.WAX, 0.4))


## Capa luminosa: llamas de apliques y pilares, luz de luna, grietas que dejan
## pasar luz y el brillo de las puertas abiertas. No le afecta la penumbra.
class _RoomFx:
	extends Node2D
	var room: RoomView
	var t := 0.0
	var lit_sconces := 0
	var igniting := false
	var _ignite_t := 0.0

	func _process(delta: float) -> void:
		t += delta
		if igniting:
			_ignite_t += delta
			while _ignite_t >= 0.09 and lit_sconces < room.candles.size():
				_ignite_t -= 0.09
				lit_sconces += 1
			if lit_sconces >= room.candles.size():
				igniting = false
		queue_redraw()

	func _draw() -> void:
		if room == null:
			return
		if room.style == "ward":
			# Luz de luna que entra por la ventana del muro superior.
			var a := 0.05 + 0.015 * sin(t * 0.7)
			draw_colored_polygon(PackedVector2Array([Vector2(330, 0), Vector2(450, 0), Vector2(560, 300), Vector2(380, 300)]), Color(0.6, 0.75, 1.0, a))
			for k in 3:
				draw_line(Vector2(330 + k * 40, 0), Vector2(380 + k * 60, 300), Color(0.7, 0.85, 1.0, a * 0.8), 2.0)
		for i in room.candles.size():
			var base: Vector2 = room.candles[i]
			if i < lit_sconces:
				draw_circle(base + Vector2(0, -16), 22.0 + 2.0 * sin(t * 5.0 + i), Color(Palette.FLAME, 0.07))
				GlyphPainter.flame(self, base + Vector2(0, -12), 6.0, t + i * 0.7)
			else:
				draw_line(base + Vector2(0, -12), base + Vector2(0, -16), Color(0.1, 0.08, 0.08), 2.0)
		if room.style == "chapel":
			for y in RoomView.ROWS:
				for x in RoomView.COLS:
					if room.grid.get_cell(Vector2i(x, y)) == RoomGrid.PILLAR:
						var p := Vector2(x, y) * RoomView.TILE + Vector2(32, 14)
						if room.awake:
							draw_circle(p + Vector2(0, -4), 16.0, Color(Palette.FLAME, 0.07))
							GlyphPainter.flame(self, p, 5.0, t + x * 0.37 + y)
		for dir in room.data.doors:
			var door: Dictionary = room.data.doors[dir]
			var c := RoomView.door_edge_center(dir)
			if bool(door["hidden"]):
				# Luz que se filtra por las grietas: más viva cuanto más golpeadas.
				var k := float(room.crack_hits.get(dir, 0)) / float(RoomView.CRACK_HITS)
				var pulse := 0.25 + 0.2 * sin(t * 2.4 + dir) + 0.4 * k
				var rot: float = [0.0, PI * 0.5, PI, -PI * 0.5][dir]
				draw_set_transform(c, rot, Vector2.ONE)
				draw_polyline(PackedVector2Array([Vector2(-18, -8), Vector2(-6, -22), Vector2(2, -14), Vector2(12, -34), Vector2(20, -26)]), Color(Palette.FLAME_CORE, pulse), 1.2 + 1.5 * k)
				draw_polyline(PackedVector2Array([Vector2(-4, -30), Vector2(4, -44), Vector2(-2, -52)]), Color(Palette.FLAME_CORE, pulse * 0.8), 1.0 + k)
				draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
			elif room.door_is_passable(dir):
				var glow := 0.06 + 0.03 * sin(t * 2.0 + dir)
				draw_circle(c, 40.0, Color(Palette.FLAME, glow))
		if room.data.type == "altar":
			# Lámpara de la enfermera.
			var lamp := Vector2(RoomView.W * 0.5 + 42.0, 124.0)
			draw_circle(lamp, 26.0 + 2.0 * sin(t * 3.0), Color(Palette.FLAME, 0.1))
			draw_circle(lamp, 6.0, Color(Palette.FLAME_CORE, 0.95))

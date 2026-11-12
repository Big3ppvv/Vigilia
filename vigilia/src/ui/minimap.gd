class_name Minimap
extends Control
## Mapa del piso. Modo compacto (HUD, centrado en la sala actual) o completo
## (inventario). Muestra solo salas conocidas: visitadas, adyacentes a visitadas
## o reveladas por objetos.

var layout: FloorLayout
var current := Vector2i.ZERO
var cell := Vector2(22, 14)
var gap := 4.0
var compact := true


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _process(_d: float) -> void:
	queue_redraw()


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.04, 0.03, 0.05, 0.72))
	draw_rect(Rect2(Vector2.ZERO, size), Color(Palette.UI_BORDER, 0.8), false, 1.5)
	if layout == null:
		return
	var step := cell + Vector2(gap, gap)
	var origin := size * 0.5
	if not compact:
		var b := layout.bounds()
		var center_c := Vector2(b.position) + Vector2(b.size) * 0.5 - Vector2(0.5, 0.5)
		origin = size * 0.5 - center_c * step
	else:
		origin -= Vector2(current) * step
	# Conexiones.
	for c in layout.rooms:
		var rd: RoomData = layout.rooms[c]
		if not rd.known:
			continue
		for d in rd.doors:
			var door: Dictionary = rd.doors[d]
			if bool(door["hidden"]):
				continue
			var other: RoomData = layout.get_room(door["to"])
			if other == null or not other.known:
				continue
			var a := origin + Vector2(c) * step
			var bpos := origin + Vector2(door["to"]) * step
			draw_line(a, bpos, Color(Palette.UI_BORDER, 0.7), 2.0)
	for c in layout.rooms:
		var rd2: RoomData = layout.rooms[c]
		if not rd2.known:
			continue
		var center := origin + Vector2(c) * step
		var r := Rect2(center - cell * 0.5, cell)
		if compact and not Rect2(Vector2.ZERO, size).grow(-2).encloses(r):
			continue
		var col := Color(0.32, 0.27, 0.31, 0.95)
		if rd2.visited:
			col = Color(0.72, 0.64, 0.58, 0.95) if rd2.cleared else Color(0.55, 0.42, 0.42, 0.95)
		draw_rect(r, col)
		if c == current:
			draw_rect(r.grow(2), Palette.UI_ACCENT, false, 2.0)
		_draw_icon(rd2, center)


func _draw_icon(rd: RoomData, c: Vector2) -> void:
	var s := minf(cell.x, cell.y) * 0.32
	match rd.type:
		"boss":
			draw_circle(c, s, Palette.BLOOD)
			draw_circle(c + Vector2(-s * 0.35, -s * 0.1), s * 0.22, Color.BLACK)
			draw_circle(c + Vector2(s * 0.35, -s * 0.1), s * 0.22, Color.BLACK)
		"treasure":
			draw_colored_polygon(PackedVector2Array([c + Vector2(0, -s), c + Vector2(s, 0), c + Vector2(0, s), c + Vector2(-s, 0)]), Palette.GOLD)
		"altar":
			draw_rect(Rect2(c - Vector2(s * 0.25, s), Vector2(s * 0.5, s * 2.0)), Color("8fb8b0"))
			draw_rect(Rect2(c - Vector2(s, s * 0.25), Vector2(s * 2.0, s * 0.5)), Color("8fb8b0"))
		"secret":
			draw_circle(c, s, Color("8a5ab0"))
		"start":
			draw_circle(c, s * 0.5, Palette.UI_DIM)

class_name MenuBackground
extends Control
## La habitación, de noche. Es el mundo real del que el juego es el sueño:
## una ventana con luna, la cama con alguien dentro, el monitor que late al
## ritmo de la nana, una silla vacía con una rebeca y, en la mesita, la vela.
## Todo procedural. Aleatoriedad cosmética con semilla fija.

var light := 1.0
var _t := 0.0
var _motes: Array = []
var _drops: Array = []
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_rng.seed = 7
	for i in 46:
		_motes.append([Vector2(_rng.randf_range(-1, 1), _rng.randf_range(-1, 1)), _rng.randf_range(0.6, 1.8), _rng.randf() * TAU])
	for i in 26:
		_drops.append([_rng.randf(), _rng.randf(), _rng.randf_range(0.08, 0.2)])


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _draw() -> void:
	var s := size
	# Pared en penumbra azul.
	var bands := 18
	for i in bands:
		var k := float(i) / bands
		draw_rect(Rect2(0, s.y * k, s.x, s.y / bands + 1.0), Color("05060c").lerp(Color("0d1020"), k))
	draw_rect(Rect2(0, s.y * 0.74, s.x, s.y * 0.26), Color("0a0b12"))
	_draw_window(s)
	_draw_monitor(s)
	_draw_iv(s)
	_draw_bed(s)
	_draw_chair(s)
	_draw_table_and_candle(s)


func _draw_window(s: Vector2) -> void:
	var r := Rect2(s.x * 0.07, s.y * 0.1, s.x * 0.24, s.y * 0.42)
	# Haz de luna hacia la cama.
	draw_colored_polygon(PackedVector2Array([r.position + Vector2(r.size.x * 0.1, r.size.y), r.end, Vector2(s.x * 0.92, s.y * 0.95), Vector2(s.x * 0.5, s.y * 0.95)]), Color(0.55, 0.65, 1.0, 0.035 * light))
	draw_rect(r, Color("0e1530"))
	var moon := r.position + Vector2(r.size.x * 0.68, r.size.y * 0.3)
	for i in 4:
		draw_circle(moon, 46.0 - i * 9.0, Color(0.7, 0.8, 1.0, 0.04 + i * 0.02))
	draw_circle(moon, 16.0, Color(0.92, 0.94, 1.0, 0.95))
	draw_circle(moon + Vector2(5, -3), 13.0, Color("0e1530"))
	for d in _drops:
		var y := fmod(float(d[1]) + _t * float(d[2]), 1.0)
		var p := r.position + Vector2(float(d[0]) * r.size.x, y * r.size.y)
		draw_line(p, p + Vector2(0, 9), Color(0.6, 0.7, 1.0, 0.18), 1.0)
	# Persiana a medio bajar y marco.
	for i in 7:
		var y2 := r.position.y + 6.0 + i * 11.0
		draw_rect(Rect2(r.position.x, y2, r.size.x, 6), Color(0.16, 0.18, 0.26, 0.92))
	draw_rect(r, Color("1b1e2c"), false, 8.0)
	draw_line(Vector2(r.position.x + r.size.x * 0.5, r.position.y), Vector2(r.position.x + r.size.x * 0.5, r.end.y), Color("1b1e2c"), 6.0)
	draw_line(Vector2(r.position.x, r.position.y + r.size.y * 0.55), Vector2(r.end.x, r.position.y + r.size.y * 0.55), Color("1b1e2c"), 6.0)


func _draw_monitor(s: Vector2) -> void:
	var r := Rect2(s.x * 0.8, s.y * 0.2, s.x * 0.13, s.y * 0.15)
	draw_line(r.position + Vector2(r.size.x * 0.5, r.size.y), Vector2(r.position.x + r.size.x * 0.5, s.y * 0.48), Color("191b26"), 5.0)
	draw_rect(r.grow(6), Color("15171f"))
	draw_rect(r, Color("040806"))
	# Trazo del electrocardiograma, sincronizado con el pulso de la nana.
	var period := Lullaby.beat_len()
	var pts := PackedVector2Array()
	var n := 64
	for i in n:
		var k := float(i) / float(n - 1)
		var tt := _t - (1.0 - k) * period * 2.0
		var ph := fposmod(tt, period) / period
		var y := 0.0
		if ph < 0.06:
			y = -sin(ph / 0.06 * PI) * 0.15
		elif ph > 0.12 and ph < 0.16:
			y = sin((ph - 0.12) / 0.04 * PI) * 0.12
		elif ph > 0.16 and ph < 0.2:
			y = -sin((ph - 0.16) / 0.04 * PI) * 0.75
		elif ph > 0.2 and ph < 0.24:
			y = sin((ph - 0.2) / 0.04 * PI) * 0.3
		pts.append(r.position + Vector2(k * r.size.x, r.size.y * (0.58 + y * 0.45)))
	draw_polyline(pts, Color(0.35, 1.0, 0.55, 0.85), 2.0)
	var beat := fposmod(_t, period) / period
	draw_circle(r.position + Vector2(r.size.x - 10, 10), 3.0, Color(0.35, 1.0, 0.55, 0.9 if beat < 0.2 else 0.25))
	var font := ThemeDB.fallback_font
	draw_string(font, r.position + Vector2(8, 18), "%d" % int(round(Lullaby.BPM)), HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color(0.35, 1.0, 0.55, 0.8))


func _draw_iv(s: Vector2) -> void:
	var x := s.x * 0.74
	draw_line(Vector2(x, s.y * 0.18), Vector2(x, s.y * 0.92), Color("2a2d3a"), 3.0)
	draw_line(Vector2(x - 20, s.y * 0.92), Vector2(x + 20, s.y * 0.92), Color("2a2d3a"), 3.0)
	draw_rect(Rect2(x - 14, s.y * 0.2, 28, 44), Color(0.75, 0.82, 0.9, 0.22))
	draw_rect(Rect2(x - 14, s.y * 0.2 + 18, 28, 26), Color(0.75, 0.82, 0.9, 0.18))
	var drip := fmod(_t * 0.7, 1.0)
	draw_circle(Vector2(x, s.y * 0.2 + 52 + drip * 10.0), 2.0, Color(0.8, 0.9, 1.0, 0.5 * (1.0 - drip)))
	var tube := PackedVector2Array()
	for i in 12:
		var k := float(i) / 11.0
		tube.append(Vector2(lerpf(x, s.x * 0.86, k), s.y * 0.2 + 56 + sin(k * PI) * 120.0 + k * 230.0))
	draw_polyline(tube, Color(0.7, 0.8, 0.9, 0.18), 1.5)


func _draw_bed(s: Vector2) -> void:
	var top := s.y * 0.66
	draw_rect(Rect2(s.x * 0.6, top + 40, s.x * 0.42, s.y * 0.34), Color("12141d"))
	draw_rect(Rect2(s.x * 0.6, top, s.x * 0.42, 60), Color(0.62, 0.66, 0.76, 0.55 * light + 0.12))
	# Alguien bajo la sábana: respira despacio.
	var breathe := 1.0 + 0.04 * sin(_t * 1.1)
	draw_colored_polygon(PackedVector2Array([
		Vector2(s.x * 0.64, top + 8), Vector2(s.x * 0.7, top - 22 * breathe), Vector2(s.x * 0.8, top - 30 * breathe),
		Vector2(s.x * 0.9, top - 24), Vector2(s.x * 0.97, top - 10), Vector2(s.x * 0.99, top + 10)]), Color(0.66, 0.7, 0.8, 0.5 * light + 0.12))
	draw_rect(Rect2(s.x * 0.93, top - 46, s.x * 0.08, 40), Color(0.78, 0.8, 0.86, 0.45 * light + 0.12))
	draw_line(Vector2(s.x * 0.6, top + 40), Vector2(s.x * 1.02, top + 40), Color(0.2, 0.22, 0.3), 3.0)


func _draw_chair(s: Vector2) -> void:
	var x := s.x * 0.16
	var y := s.y * 0.7
	var c := Color("181a24")
	draw_rect(Rect2(x, y, 120, 14), c)
	draw_rect(Rect2(x + 8, y - 120, 12, 124), c)
	draw_rect(Rect2(x + 8, y - 120, 100, 12), c)
	draw_line(Vector2(x + 10, y + 14), Vector2(x + 4, y + 150), c, 6.0)
	draw_line(Vector2(x + 112, y + 14), Vector2(x + 118, y + 150), c, 6.0)
	# Una rebeca sobre el respaldo: alguien ha estado aquí toda la noche.
	draw_colored_polygon(PackedVector2Array([Vector2(x + 4, y - 116), Vector2(x + 70, y - 112), Vector2(x + 64, y - 54), Vector2(x + 30, y - 40), Vector2(x + 6, y - 60)]), Color(0.34, 0.2, 0.22, 0.55))


func _draw_table_and_candle(s: Vector2) -> void:
	var c := Vector2(s.x * 0.5, s.y * 0.8)
	var flick := 1.0 + 0.05 * sin(_t * 9.0) + 0.03 * sin(_t * 15.7)
	# Halo cálido: el único punto caliente de la habitación.
	for i in 6:
		draw_circle(c + Vector2(0, -60), (330.0 - i * 48.0) * flick, Color(1.0, 0.62, 0.3, 0.018 * light * (i + 1)))
	draw_rect(Rect2(c.x - 90, c.y - 20, 180, 16), Color("3a2a24"))
	draw_rect(Rect2(c.x - 80, c.y - 4, 160, s.y - c.y + 4), Color("241a17"))
	draw_line(Vector2(c.x - 60, c.y + 30), Vector2(c.x + 60, c.y + 30), Color("3a2a24"), 2.0)
	draw_circle(Vector2(c.x - 4, c.y + 30), 3.0, Color("6a5040"))
	# Mandarinas, un vaso de agua y la vela.
	draw_circle(Vector2(c.x - 58, c.y - 30), 12.0, Color(0.95, 0.5, 0.12))
	draw_circle(Vector2(c.x - 38, c.y - 27), 10.0, Color(0.9, 0.45, 0.1))
	draw_rect(Rect2(c.x + 38, c.y - 52, 18, 32), Color(0.8, 0.9, 1.0, 0.25))
	draw_rect(Rect2(c.x + 38, c.y - 40, 18, 20), Color(0.7, 0.85, 1.0, 0.18))
	draw_rect(Rect2(c.x - 9, c.y - 70, 18, 50), Color("efe2c0"))
	draw_rect(Rect2(c.x - 9, c.y - 70, 6, 50), Color(1, 1, 1, 0.25))
	draw_line(Vector2(c.x, c.y - 70), Vector2(c.x, c.y - 78), Color(0.1, 0.08, 0.08), 2.0)
	draw_circle(Vector2(c.x, c.y - 92), 22.0 * flick, Color(1.0, 0.7, 0.3, 0.25 * light))
	GlyphPainter.flame(self, Vector2(c.x, c.y - 76), 14.0 * flick * maxf(0.3, light), _t)
	for m in _motes:
		var p: Vector2 = m[0]
		var pos := c + Vector2(-60, -90) + Vector2(p.x * 170.0 + sin(_t * 0.3 + float(m[2])) * 20.0, p.y * 120.0 + cos(_t * 0.25 + float(m[2])) * 16.0)
		draw_circle(pos, float(m[1]), Color(1.0, 0.85, 0.6, (0.2 + 0.15 * sin(_t * 1.5 + float(m[2]))) * light))

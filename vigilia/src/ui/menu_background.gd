class_name MenuBackground
extends Control
## Fondo animado del menú: el párpado del Durmiente, velas y motas de ceniza.
## Aleatoriedad cosmética con semilla fija (no toca la simulación).

var _t := 0.0
var _motes: Array = []
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_rng.seed = 7
	for i in 70:
		_motes.append([Vector2(_rng.randf(), _rng.randf()), _rng.randf_range(0.01, 0.04), _rng.randf_range(1.0, 2.6), _rng.randf() * TAU])


func _process(delta: float) -> void:
	_t += delta
	for m in _motes:
		m[0].y -= m[1] * delta
		m[0].x += sin(_t * 0.6 + m[3]) * 0.0006
		if m[0].y < -0.02:
			m[0] = Vector2(_rng.randf(), 1.02)
	queue_redraw()


func _draw() -> void:
	var s := size
	var bands := 24
	for i in bands:
		var k := float(i) / float(bands)
		var col := Palette.VOID.lerp(Color("231622"), k * 0.9)
		draw_rect(Rect2(0, s.y * k, s.x, s.y / bands + 1.0), col)
	var c := Vector2(s.x * 0.5, s.y * 0.30)
	var open := 0.06 + 0.06 * maxf(0.0, sin(_t * 0.35)) + (0.25 if fmod(_t, 13.0) > 12.4 else 0.0)
	var w := minf(s.x * 0.36, 460.0)
	var h := w * open
	draw_circle(c, w * 0.9, Color(Palette.FLAME, 0.035))
	var lid := PackedVector2Array()
	for i in 33:
		var k2 := float(i) / 32.0
		lid.append(c + Vector2(lerpf(-w, w, k2), -h * sin(k2 * PI)))
	for i in range(31, 0, -1):
		var k3 := float(i) / 32.0
		lid.append(c + Vector2(lerpf(-w, w, k3), h * sin(k3 * PI)))
	draw_colored_polygon(lid, Color("0a050a"))
	if h > 6.0:
		draw_circle(c, h * 0.8, Color(Palette.FLAME, 0.7))
		draw_circle(c, h * 0.35, Color("0a050a"))
	var upper := PackedVector2Array()
	for i in 33:
		var k4 := float(i) / 32.0
		upper.append(c + Vector2(lerpf(-w, w, k4), -h * sin(k4 * PI)))
	draw_polyline(upper, Palette.WAX_DARK, 3.0)
	for i in 15:
		var k5 := float(i + 1) / 16.0
		var base := c + Vector2(lerpf(-w, w, k5), -h * sin(k5 * PI))
		var dir := Vector2(0, -1).rotated((k5 - 0.5) * 1.4)
		draw_line(base, base + dir * (18.0 + 10.0 * sin(i * 1.3)), Palette.WAX_SHADOW, 3.0)
	for m in _motes:
		var p: Vector2 = Vector2(m[0].x * s.x, m[0].y * s.y)
		draw_circle(p, m[2], Color(Palette.FLAME, 0.25 + 0.2 * sin(_t * 2.0 + m[3])))
	var n := 9
	for i in n:
		var x := s.x * (0.08 + 0.84 * float(i) / float(n - 1))
		var ch := 40.0 + 30.0 * sin(i * 2.3)
		var base_y := s.y - 20.0
		draw_rect(Rect2(x - 9, base_y - ch, 18, ch), Palette.WAX.darkened(0.15 + 0.1 * (i % 3)))
		draw_circle(Vector2(x, base_y - ch - 22.0), 40.0, Color(Palette.FLAME, 0.05))
		GlyphPainter.flame(self, Vector2(x, base_y - ch - 2.0), 10.0, _t + i)

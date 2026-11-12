class_name GlyphPainter
extends RefCounted
## Dibuja los iconos de objetos y consumibles de forma procedural (sin texturas).
## Cada objeto declara en JSON {"glyph", "c1", "c2"}; los pedestales, el HUD y el
## inventario reutilizan esta misma función. Arte 100 % original y sustituible.
##
## `s` es el semitamaño (el icono ocupa aprox. 2s x 2s); `t` anima detalles.


static func draw_item(ci: CanvasItem, item_def: Dictionary, c: Vector2, s: float, t: float = 0.0) -> void:
	var icon: Dictionary = item_def.get("icon", {})
	draw_glyph(ci, str(icon.get("glyph", "")), c, s,
		Palette.parse(icon.get("c1", ""), Palette.BONE), Palette.parse(icon.get("c2", ""), Palette.WALL_TOP), t)


static func draw_glyph(ci: CanvasItem, glyph: String, c: Vector2, s: float, c1: Color, c2: Color, t: float = 0.0) -> void:
	var dark := Color(0.04, 0.03, 0.06, 0.9)
	match glyph:
		"splinter":
			ci.draw_colored_polygon(_pts(c, s, [[-0.45, -0.9], [-0.05, -0.15], [-0.25, 0.9], [-0.6, 0.05]]), c1)
			ci.draw_colored_polygon(_pts(c, s, [[0.15, -0.85], [0.6, -0.05], [0.3, 0.85], [0.05, 0.1]]), c1.darkened(0.15))
			ci.draw_line(c + Vector2(-0.3, -0.5) * s, c + Vector2(-0.35, 0.5) * s, c2, maxf(1.0, s * 0.08))
		"powder":
			ci.draw_circle(c + Vector2(0, 0.25) * s, s * 0.6, c2)
			ci.draw_rect(Rect2(c + Vector2(-0.18, -0.55) * s, Vector2(0.36, 0.35) * s), c2.lightened(0.15))
			ci.draw_line(c + Vector2(0, -0.55) * s, c + Vector2(0.25, -0.85) * s, Palette.BONE, maxf(1.0, s * 0.08))
			for i in 4:
				var a := t * 3.0 + i * 1.7
				ci.draw_circle(c + Vector2(0.25 + 0.25 * cos(a), -0.85 + 0.2 * sin(a * 1.3)) * s, s * 0.08, c1)
		"flask":
			ci.draw_rect(Rect2(c + Vector2(-0.15, -0.9) * s, Vector2(0.3, 0.45) * s), c2.lightened(0.3))
			ci.draw_circle(c + Vector2(0, 0.2) * s, s * 0.6, c2)
			ci.draw_circle(c + Vector2(0, 0.3) * s, s * 0.48, c1)
			ci.draw_circle(c + Vector2(-0.2, 0.1) * s, s * 0.12, Color(1, 1, 1, 0.5))
		"chalice":
			ci.draw_colored_polygon(_pts(c, s, [[-0.65, -0.65], [0.65, -0.65], [0.35, 0.05], [-0.35, 0.05]]), c2)
			ci.draw_colored_polygon(_pts(c, s, [[-0.5, -0.6], [0.5, -0.6], [0.4, -0.4], [-0.4, -0.4]]), c1)
			ci.draw_rect(Rect2(c + Vector2(-0.09, 0.05) * s, Vector2(0.18, 0.5) * s), c2.lightened(0.2))
			ci.draw_rect(Rect2(c + Vector2(-0.45, 0.55) * s, Vector2(0.9, 0.18) * s), c2.lightened(0.2))
			ci.draw_circle(c + Vector2(0, -0.85 - 0.05 * sin(t * 3.0)) * s, s * 0.12, c1)
		"eye":
			var up: PackedVector2Array = []
			for i in 13:
				var k := float(i) / 12.0
				up.append(c + Vector2(lerpf(-0.9, 0.9, k), -0.55 * sin(k * PI)) * s)
			for i in range(11, 0, -1):
				var k2 := float(i) / 12.0
				up.append(c + Vector2(lerpf(-0.9, 0.9, k2), 0.55 * sin(k2 * PI)) * s)
			ci.draw_colored_polygon(up, Palette.BONE)
			ci.draw_circle(c, s * 0.4, c2)
			ci.draw_circle(c, s * 0.18, dark)
			ci.draw_circle(c + Vector2(0.12, -0.12) * s, s * 0.08, c1)
		"wing":
			var flap := 1.0 + 0.08 * sin(t * 6.0)
			ci.draw_circle(c + Vector2(-0.42 * flap, -0.2) * s, s * 0.48, c1)
			ci.draw_circle(c + Vector2(0.42 * flap, -0.2) * s, s * 0.48, c1)
			ci.draw_circle(c + Vector2(-0.32 * flap, 0.42) * s, s * 0.32, c2)
			ci.draw_circle(c + Vector2(0.32 * flap, 0.42) * s, s * 0.32, c2)
			ci.draw_circle(c + Vector2(-0.45, -0.25) * s, s * 0.14, dark)
			ci.draw_circle(c + Vector2(0.45, -0.25) * s, s * 0.14, dark)
			ci.draw_line(c + Vector2(0, -0.6) * s, c + Vector2(0, 0.7) * s, dark, maxf(1.5, s * 0.14))
		"dust":
			var offs := [[-0.6, -0.4], [0.1, -0.7], [0.55, -0.2], [-0.2, 0.1], [0.4, 0.5], [-0.5, 0.55], [0.0, 0.75], [0.7, 0.15]]
			for i in offs.size():
				var o: Array = offs[i]
				var tw := 0.6 + 0.4 * sin(t * 4.0 + i)
				ci.draw_circle(c + Vector2(o[0], o[1]) * s, s * (0.1 + 0.06 * (i % 3)) * tw, c1 if i % 2 == 0 else c2)
		"bead":
			ci.draw_line(c + Vector2(-0.9, -0.6) * s, c + Vector2(0.9, -0.6) * s, Palette.BONE.darkened(0.4), maxf(1.0, s * 0.06))
			ci.draw_circle(c + Vector2(0, 0.1) * s, s * 0.62, c2)
			ci.draw_circle(c + Vector2(0, 0.1) * s, s * 0.5, c1)
			ci.draw_circle(c + Vector2(-0.18, -0.1) * s, s * 0.14, Color(1, 1, 1, 0.45))
		"lens":
			ci.draw_circle(c, s * 0.75, c2)
			ci.draw_circle(c, s * 0.6, Color(c1, 0.85))
			ci.draw_arc(c, s * 0.45, PI * 1.1, PI * 1.6, 8, Color(1, 1, 1, 0.7), maxf(1.0, s * 0.1))
		"pact":
			ci.draw_rect(Rect2(c + Vector2(-0.3, -0.3) * s, Vector2(0.6, 1.1) * s), c1)
			_flame(ci, c + Vector2(0, -0.45) * s, s * 0.35, t)
			ci.draw_circle(c + Vector2(0.15, 0.2 + 0.1 * fmod(t, 1.0)) * s, s * 0.14, c2)
			ci.draw_circle(c + Vector2(-0.4, 0.75) * s, s * 0.18, c2)
		"wound":
			var pts: PackedVector2Array = []
			for i in 7:
				pts.append(c + Vector2(-0.8 + i * 0.27, -0.2 + (0.35 if i % 2 == 0 else -0.25)) * s)
			ci.draw_polyline(pts, c1, maxf(2.0, s * 0.2))
			ci.draw_circle(c + Vector2(-0.3, 0.45) * s, s * 0.13, c2)
			ci.draw_circle(c + Vector2(0.3, 0.6) * s, s * 0.1, c2)
		"tooth":
			ci.draw_colored_polygon(_pts(c, s, [[-0.6, -0.7], [0.6, -0.7], [0.55, 0.05], [0.35, 0.85], [0.1, 0.15], [-0.1, 0.15], [-0.35, 0.85], [-0.55, 0.05]]), c1)
			ci.draw_line(c + Vector2(-0.3, -0.45) * s, c + Vector2(-0.2, -0.15) * s, c2, maxf(1.0, s * 0.08))
		"ember":
			_flame(ci, c + Vector2(0, 0.3) * s, s * 0.95, t, c1, c2)
		"frost":
			for i in 6:
				var a := i * PI / 3.0
				var tip := c + Vector2.RIGHT.rotated(a) * s * 0.9
				ci.draw_line(c, tip, c1, maxf(1.5, s * 0.12))
				var mid := c + Vector2.RIGHT.rotated(a) * s * 0.55
				ci.draw_line(mid, mid + Vector2.RIGHT.rotated(a + 0.7) * s * 0.25, c1, maxf(1.0, s * 0.08))
				ci.draw_line(mid, mid + Vector2.RIGHT.rotated(a - 0.7) * s * 0.25, c1, maxf(1.0, s * 0.08))
			ci.draw_circle(c, s * 0.18, c2)
		"crown":
			ci.draw_colored_polygon(_pts(c, s, [[-0.8, 0.5], [-0.8, -0.3], [-0.45, 0.1], [-0.15, -0.5], [0.15, 0.1], [0.45, -0.5], [0.8, -0.3], [0.8, 0.5]]), c1)
			ci.draw_rect(Rect2(c + Vector2(-0.8, 0.35) * s, Vector2(1.6, 0.2) * s), c1.darkened(0.3))
			_flame(ci, c + Vector2(-0.15, -0.55) * s, s * 0.22, t, c2)
			_flame(ci, c + Vector2(0.45, -0.55) * s, s * 0.22, t + 0.5, c2)
		"bell":
			ci.draw_colored_polygon(_pts(c, s, [[-0.35, -0.7], [0.35, -0.7], [0.5, -0.1], [0.85, 0.55], [-0.85, 0.55], [-0.5, -0.1]]), c1)
			ci.draw_rect(Rect2(c + Vector2(-0.12, -0.9) * s, Vector2(0.24, 0.22) * s), c1.darkened(0.3))
			ci.draw_circle(c + Vector2(0.1 * sin(t * 4.0), 0.72) * s, s * 0.16, c2)
			ci.draw_line(c + Vector2(0.15, -0.6) * s, c + Vector2(-0.05, 0.0) * s, dark, maxf(1.0, s * 0.08))
		"candle":
			ci.draw_rect(Rect2(c + Vector2(-0.32, -0.35) * s, Vector2(0.64, 1.15) * s), c1)
			ci.draw_circle(c + Vector2(0.3, -0.1) * s, s * 0.12, c2)
			ci.draw_rect(Rect2(c + Vector2(0.22, -0.1) * s, Vector2(0.16, 0.45) * s), c2)
			_flame(ci, c + Vector2(0, -0.5) * s, s * 0.35, t)
		"coin":
			ci.draw_circle(c, s * 0.75, c1)
			ci.draw_arc(c, s * 0.55, 0, TAU, 20, c2, maxf(1.0, s * 0.1))
			ci.draw_circle(c, s * 0.14, c2)
			ci.draw_circle(c + Vector2(0.62, -0.42) * s, s * 0.28, dark)
		"map":
			ci.draw_rect(Rect2(c + Vector2(-0.8, -0.6) * s, Vector2(1.6, 1.2) * s), c1)
			ci.draw_line(c + Vector2(-0.27, -0.6) * s, c + Vector2(-0.27, 0.6) * s, c1.darkened(0.25), 1.0)
			ci.draw_line(c + Vector2(0.27, -0.6) * s, c + Vector2(0.27, 0.6) * s, c1.darkened(0.25), 1.0)
			ci.draw_polyline(PackedVector2Array([c + Vector2(-0.7, 0.4) * s, c + Vector2(-0.2, 0.0) * s, c + Vector2(0.1, 0.2) * s, c + Vector2(0.65, -0.45) * s]), c2, maxf(1.5, s * 0.1))
			ci.draw_line(c + Vector2(-0.2, 0.0) * s, c + Vector2(-0.4, -0.4) * s, c2, maxf(1.0, s * 0.07))
		"hand":
			ci.draw_rect(Rect2(c + Vector2(-0.75, -0.8) * s, Vector2(1.5, 1.6) * s), c2, false, maxf(1.5, s * 0.12))
			for i in 4:
				var x := -0.45 + i * 0.3
				ci.draw_rect(Rect2(c + Vector2(x - 0.08, -0.55 + 0.08 * (i % 2)) * s, Vector2(0.16, 0.9) * s), c1)
			ci.draw_rect(Rect2(c + Vector2(-0.55, 0.25) * s, Vector2(1.1, 0.4) * s), c1)
		"bellows":
			ci.draw_colored_polygon(_pts(c, s, [[-0.8, -0.6], [0.4, -0.25], [0.4, 0.25], [-0.8, 0.6]]), c2)
			for i in 3:
				var x2 := -0.5 + i * 0.3
				ci.draw_line(c + Vector2(x2, -0.5 + i * 0.09) * s, c + Vector2(x2, 0.5 - i * 0.09) * s, c1, maxf(1.0, s * 0.08))
			ci.draw_rect(Rect2(c + Vector2(0.4, -0.1) * s, Vector2(0.4, 0.2) * s), c1)
			_flame(ci, c + Vector2(0.95, 0.05) * s, s * 0.25, t)
		"heart":
			# Ascua: devuelve llama. Brasa redonda con corazón incandescente.
			var beat := 1.0 + 0.08 * sin(t * 6.0)
			ci.draw_circle(c, s * 0.62 * beat, Color(Palette.FLAME, 0.35))
			ci.draw_circle(c, s * 0.42 * beat, Palette.FLAME)
			ci.draw_circle(c + Vector2(-0.08, -0.1) * s, s * 0.2, Palette.FLAME_CORE)
		"wax":
			ci.draw_circle(c + Vector2(0, 0.15) * s, s * 0.55, Palette.WAX_SHADOW)
			ci.draw_circle(c + Vector2(0, 0.05) * s, s * 0.5, Palette.WAX)
			ci.draw_colored_polygon(_pts(c, s, [[-0.25, -0.2], [0.0, -0.95], [0.25, -0.2]]), Palette.WAX)
			ci.draw_circle(c + Vector2(-0.18, -0.05) * s, s * 0.12, Color(1, 1, 1, 0.5))
		"tangerine":
			ci.draw_circle(c + Vector2(0, 0.1) * s, s * 0.68, c1.darkened(0.25))
			ci.draw_circle(c + Vector2(-0.05, 0.05) * s, s * 0.6, c1)
			for i in 5:
				var a := -PI * 0.5 + i * TAU / 5.0
				ci.draw_line(c + Vector2(0, 0.05) * s, c + Vector2(cos(a), sin(a) + 0.08) * s * 0.55, c1.darkened(0.15), maxf(1.0, s * 0.05))
			ci.draw_colored_polygon(_pts(c, s, [[0.0, -0.55], [0.35, -0.95], [0.5, -0.7], [0.1, -0.5]]), c2)
			ci.draw_circle(c + Vector2(-0.25, -0.15) * s, s * 0.1, Color(1, 1, 1, 0.45))
		"watch":
			ci.draw_line(c + Vector2(0, -0.95) * s, c + Vector2(0, -0.6) * s, c2, maxf(1.5, s * 0.12))
			ci.draw_circle(c + Vector2(0, -0.98) * s, s * 0.12, c2)
			ci.draw_circle(c + Vector2(0, 0.1) * s, s * 0.66, c2)
			ci.draw_circle(c + Vector2(0, 0.1) * s, s * 0.55, c1)
			# Esfera del revés: las agujas miran hacia arriba al leerla desde el pecho.
			ci.draw_line(c + Vector2(0, 0.1) * s, c + Vector2(0, 0.1) * s + Vector2.DOWN.rotated(t * 0.5) * s * 0.42, dark, maxf(1.0, s * 0.07))
			ci.draw_line(c + Vector2(0, 0.1) * s, c + Vector2(0, 0.1) * s + Vector2.DOWN.rotated(t * 0.05 + 1.2) * s * 0.3, dark, maxf(1.5, s * 0.1))
			ci.draw_circle(c + Vector2(0, 0.1) * s, s * 0.06, dark)
		"drawing":
			ci.draw_colored_polygon(_pts(c, s, [[-0.8, -0.7], [0.75, -0.8], [0.8, 0.75], [-0.75, 0.8]]), Color("efe6d8"))
			ci.draw_polyline(_pts(c, s, [[-0.5, 0.55], [-0.5, 0.0], [-0.1, -0.35], [0.3, 0.0], [0.3, 0.55], [-0.5, 0.55]]), c2, maxf(1.0, s * 0.08))
			ci.draw_circle(c + Vector2(0.5, -0.45) * s, s * 0.17, c1)
			for i in 3:
				ci.draw_line(c + Vector2(-0.6 + i * 0.25, 0.55) * s, c + Vector2(-0.6 + i * 0.25, 0.3) * s, Color("b3243b"), maxf(1.0, s * 0.06))
			_flame(ci, c + Vector2(0.55, 0.3) * s, s * 0.18, t)
		"radio":
			ci.draw_rect(Rect2(c + Vector2(-0.8, -0.35) * s, Vector2(1.6, 0.95) * s), c2)
			ci.draw_rect(Rect2(c + Vector2(-0.7, -0.25) * s, Vector2(0.75, 0.75) * s), c2.lightened(0.15))
			for i in 4:
				ci.draw_line(c + Vector2(-0.65, -0.15 + i * 0.17) * s, c + Vector2(-0.0, -0.15 + i * 0.17) * s, dark, maxf(1.0, s * 0.05))
			ci.draw_circle(c + Vector2(0.4, 0.1) * s, s * 0.22, c1)
			ci.draw_line(c + Vector2(0.5, -0.35) * s, c + Vector2(0.85, -0.95) * s, c2.lightened(0.3), maxf(1.0, s * 0.06))
			for i in 3:
				var k := fmod(t * 0.8 + i * 0.33, 1.0)
				ci.draw_arc(c + Vector2(0.4, 0.1) * s, s * (0.3 + 0.5 * k), -0.6, 0.6, 6, Color(c1, 0.7 * (1.0 - k)), maxf(1.0, s * 0.06))
		_:
			ci.draw_circle(c, s * 0.7, c2)
			ci.draw_circle(c, s * 0.45, c1)


## Llama pequeña animada reutilizable (velas, mechas, iconos).
static func _flame(ci: CanvasItem, base: Vector2, h: float, t: float, col: Color = Palette.FLAME, core: Color = Palette.FLAME_CORE) -> void:
	var flick := 1.0 + 0.12 * sin(t * 11.0) + 0.06 * sin(t * 17.0 + 1.3)
	var hh := h * flick
	var outer := PackedVector2Array([
		base + Vector2(-0.45 * h, 0), base + Vector2(-0.3 * h, -0.6 * hh),
		base + Vector2(0.05 * h * sin(t * 7.0), -1.25 * hh), base + Vector2(0.3 * h, -0.6 * hh),
		base + Vector2(0.45 * h, 0), base + Vector2(0, 0.25 * h)])
	ci.draw_colored_polygon(outer, col)
	ci.draw_circle(base + Vector2(0, -0.3 * hh), h * 0.22, core)


static func flame(ci: CanvasItem, base: Vector2, h: float, t: float, col: Color = Palette.FLAME, core: Color = Palette.FLAME_CORE) -> void:
	_flame(ci, base, h, t, col, core)


static func _pts(c: Vector2, s: float, arr: Array) -> PackedVector2Array:
	var out := PackedVector2Array()
	for p in arr:
		out.append(c + Vector2(float(p[0]), float(p[1])) * s)
	return out

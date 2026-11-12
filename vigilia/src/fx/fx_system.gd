class_name FxSystem
extends Node2D
## Efectos visuales transitorios dibujados en un solo nodo (partículas, anillos,
## destellos, números de daño). Presupuesto configurable:
##   - Modo normal: hasta MAX_PARTICLES partículas.
##   - "Reducir partículas" (accesibilidad): tope y cantidades al ~30 %.
## Las manchas persistentes del suelo van en `decals` (nodo inferior, se redibuja
## solo al añadir).
##
## Aleatoriedad COSMÉTICA con RNG propio: no afecta a la simulación.

const MAX_PARTICLES := 1400
const MAX_PARTICLES_REDUCED := 320
const MAX_TEXTS := 60
const MAX_DECALS := 140
## Topes de seguridad: los anillos de impacto y los estallidos de muerte son
## frecuentes con builds de cadencia alta; por encima del tope se omiten.
const MAX_RINGS := 220
const MAX_POPS := 48

var decals: Node2D
var _parts: Array = []
var _rings: Array = []
var _pops: Array = []
var _texts: Array = []
var _beams: Array = []
var _decal_list: Array = []
var _rng := RandomNumberGenerator.new()
var _font: Font


func _ready() -> void:
	z_index = 10
	_rng.seed = 12345
	_font = ThemeDB.fallback_font
	decals = _Decals.new()
	decals.fx = self
	decals.z_index = -8


func particle_budget() -> int:
	return MAX_PARTICLES_REDUCED if Settings.reduced_particles else MAX_PARTICLES


func _scaled(n: int) -> int:
	return maxi(1, int(round(n * (0.3 if Settings.reduced_particles else 1.0))))


func clear() -> void:
	_parts.clear()
	_rings.clear()
	_pops.clear()
	_texts.clear()
	_beams.clear()
	_decal_list.clear()
	if decals != null:
		decals.queue_redraw()


func particle_count() -> int:
	return _parts.size()


## Partícula: [pos, vel, life, max_life, size, color, drag]
func burst(pos: Vector2, color: Color, count: int, speed: float = 160.0, size: float = 3.0, life: float = 0.45) -> void:
	var n := _scaled(count)
	var budget := particle_budget()
	for i in n:
		if _parts.size() >= budget:
			return
		var dir := Vector2.RIGHT.rotated(_rng.randf() * TAU)
		var v := dir * speed * _rng.randf_range(0.35, 1.0)
		var l := life * _rng.randf_range(0.6, 1.2)
		_parts.append([pos, v, l, l, size * _rng.randf_range(0.6, 1.3), color, 4.0])


func puff(pos: Vector2, color: Color, count: int = 5) -> void:
	burst(pos, color, count, 90.0, 2.5, 0.3)


func ring(pos: Vector2, radius: float, color: Color, life: float = 0.35, width: float = 3.0) -> void:
	if _rings.size() >= MAX_RINGS:
		return
	_rings.append([pos, radius, life, life, color, width])


## Estallido de muerte: un disco que se hincha y se apaga, con núcleo blanco.
## Da lectura inequívoca de "abatido" (antes el enemigo simplemente desaparecía).
## Estallido: [pos, radius, life, max_life, color]
func pop(pos: Vector2, radius: float, color: Color, life: float = 0.22) -> void:
	if _pops.size() >= MAX_POPS:
		_pops.pop_front()
	_pops.append([pos, radius, life, life, color])


func explosion(pos: Vector2, radius: float, color: Color) -> void:
	ring(pos, radius, color, 0.32, 4.0)
	ring(pos, radius * 0.6, Palette.FLAME_CORE, 0.18, 6.0)
	burst(pos, color, int(clampf(radius * 0.35, 8, 40)), radius * 3.2, 4.0, 0.5)
	burst(pos, Color(0.2, 0.15, 0.15), int(clampf(radius * 0.2, 4, 18)), radius * 1.6, 6.0, 0.8)
	decal(pos, radius * 0.38, Color(0, 0, 0, 0.11))


func damage_number(pos: Vector2, amount: float, crit: bool, color: Color = Color.WHITE) -> void:
	if not Settings.damage_numbers:
		return
	if _texts.size() >= MAX_TEXTS:
		_texts.pop_front()
	var txt := str(int(round(amount))) if amount >= 1.0 else "%.1f" % amount
	if crit:
		txt += "!"
		color = Palette.UI_ACCENT
	_texts.append([pos + Vector2(_rng.randf_range(-8, 8), -18), Vector2(_rng.randf_range(-20, 20), -70), 0.7, 0.7, txt, color, 18 if crit else 14])


func float_text(pos: Vector2, txt: String, color: Color, size: int = 16, life: float = 1.1) -> void:
	if _texts.size() >= MAX_TEXTS:
		_texts.pop_front()
	_texts.append([pos, Vector2(0, -40), life, life, txt, color, size])


## Rayo instantáneo (cadenas eléctricas, láseres de previsualización).
func beam(a: Vector2, b: Vector2, color: Color, width: float = 3.0, life: float = 0.18) -> void:
	_beams.append([a, b, life, life, color, width])


func decal(pos: Vector2, radius: float, color: Color) -> void:
	_decal_list.append([pos, radius, color])
	if _decal_list.size() > MAX_DECALS:
		_decal_list.pop_front()
	if decals != null:
		decals.queue_redraw()


func _process(delta: float) -> void:
	var __pt := Prof.t0()
	var i := 0
	while i < _parts.size():
		var p: Array = _parts[i]
		p[2] -= delta
		if p[2] <= 0.0:
			_parts[i] = _parts[_parts.size() - 1]
			_parts.pop_back()
			continue
		p[0] += p[1] * delta
		p[1] = p[1] * maxf(0.0, 1.0 - p[6] * delta)
		i += 1
	_tick_list(_rings, delta)
	_tick_list(_pops, delta)
	_tick_list(_beams, delta)
	var j := 0
	while j < _texts.size():
		var tx: Array = _texts[j]
		tx[2] -= delta
		if tx[2] <= 0.0:
			_texts.remove_at(j)
			continue
		tx[0] += tx[1] * delta
		tx[1] *= 0.92
		j += 1
	queue_redraw()
	Prof.add("efectos (fx)", __pt)


func _tick_list(arr: Array, delta: float) -> void:
	var i := 0
	while i < arr.size():
		arr[i][2] -= delta
		if arr[i][2] <= 0.0:
			arr.remove_at(i)
			continue
		i += 1


func _draw() -> void:
	for p in _parts:
		var k: float = p[2] / p[3]
		var c: Color = p[5]
		draw_circle(p[0], p[4] * (0.4 + 0.6 * k), Color(c, c.a * k))
	for r in _rings:
		var k2: float = 1.0 - r[2] / r[3]
		var c2: Color = r[4]
		draw_arc(r[0], r[1] * (0.35 + 0.65 * k2), 0, TAU, 32, Color(c2, (1.0 - k2) * 0.9), r[5])
	for q in _pops:
		var k5: float = 1.0 - q[2] / q[3]
		var c5: Color = q[4]
		var pr: float = q[1] * (0.75 + 0.85 * k5)
		draw_circle(q[0], pr, Color(c5, 0.5 * (1.0 - k5)))
		if Settings.flashes:
			draw_circle(q[0], pr * 0.55, Color(1.0, 1.0, 1.0, 0.75 * (1.0 - k5) * (1.0 - k5)))
	for b in _beams:
		var k3: float = b[2] / b[3]
		var c3: Color = b[4]
		draw_line(b[0], b[1], Color(c3, k3), b[5] * (0.5 + 0.5 * k3))
	for t in _texts:
		var k4: float = clampf(t[2] / t[3] * 2.0, 0.0, 1.0)
		var col: Color = t[5]
		var size: int = t[6]
		var w := _font.get_string_size(t[4], HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
		var pos: Vector2 = t[0] - Vector2(w * 0.5, 0)
		draw_string(_font, pos + Vector2(1, 1), t[4], HORIZONTAL_ALIGNMENT_LEFT, -1, size, Color(0, 0, 0, 0.8 * k4))
		draw_string(_font, pos, t[4], HORIZONTAL_ALIGNMENT_LEFT, -1, size, Color(col, k4))


class _Decals:
	extends Node2D
	var fx: FxSystem

	func _draw() -> void:
		if fx == null:
			return
		for d in fx._decal_list:
			draw_circle(d[0], d[1], d[2])

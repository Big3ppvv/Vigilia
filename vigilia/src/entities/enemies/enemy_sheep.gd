extends Enemy
## OVEJA DE LA CUENTA — las ovejas que cuentas para dormirte. El sueño las
## numera: cada una lleva su número en la lana (el contador es de la noche).
##
## Mantiene la distancia paciendo; cada cierto tiempo SALTA en arco, como si
## saltara una valla, y al aterrizar suelta un anillo lento de "z" que da SOPOR
## (status "drowsy": te frena y encoge tu luz unos segundos). El salto se
## telegrafía agachándose. No embiste: su peligro es que la noche se alargue.

var number := 1
var _hop_from := Vector2.ZERO
var _hop_to := Vector2.ZERO
var _height := 0.0
var _graze_t := 0.0
var _wander := Vector2.ZERO


func on_setup() -> void:
	accel = 700.0
	number = world.next_sheep_number()
	_graze_t = rng.float_range(float(p.get("hop_min", 2.6)), float(p.get("hop_max", 3.8)))
	_wander = rng.unit_vector()
	change_state("graze")


func behave(dt: float) -> void:
	match state:
		"graze":
			_height = 0.0
			var spd := current_speed()
			var keep := float(p.get("keep_distance", 230.0))
			var v := Vector2.ZERO
			if target != null:
				var d := dist_to_target()
				if d < keep * 0.8:
					v = flee(target.global_position, spd)
				elif d > keep * 1.4:
					v = path_to_target(spd * 0.7)
				else:
					v = orbit(target.global_position, keep, spd * 0.4, 1.0 if number % 2 == 0 else -1.0)
			_wander = _wander.rotated(rng.float_range(-1.5, 1.5) * dt)
			desired_velocity = v + _wander * 22.0 + separation(70.0)
			_graze_t -= dt
			if _graze_t <= 0.0:
				change_state("crouch")
		"crouch":
			desired_velocity = Vector2.ZERO
			if state_t >= float(p.get("crouch_time", 0.4)):
				_start_hop()
		"hop":
			var ht := float(p.get("hop_time", 0.62))
			var k := clampf(state_t / ht, 0.0, 1.0)
			global_position = _hop_from.lerp(_hop_to, k)
			velocity = Vector2.ZERO
			desired_velocity = Vector2.ZERO
			_height = sin(k * PI) * 46.0 * scale_factor
			if k >= 1.0:
				_land()


func _start_hop() -> void:
	_hop_from = global_position
	var dir := rng.unit_vector()
	if target != null:
		# Salta de lado respecto a la Espina: cruza su campo de visión, como una valla.
		dir = to_target().normalized().orthogonal() * (1.0 if rng.chance(0.5) else -1.0)
	var dist := float(p.get("hop_distance", 150.0))
	var to := global_position + dir * dist
	if world.room != null:
		to = world.room.grid.nearest_walkable_pos(to.clamp(Vector2(40, 40), Vector2(RoomView.W - 40, RoomView.H - 40)))
	_hop_to = to
	change_state("hop")


func _land() -> void:
	_height = 0.0
	_graze_t = rng.float_range(float(p.get("hop_min", 2.6)), float(p.get("hop_max", 3.8)))
	world.fx.puff(global_position, Palette.BONE, 6)
	var n := int(p.get("z_count", 5))
	shoot_ring(n, float(p.get("z_speed", 95.0)), rng.next_float() * TAU, {
		"radius": 8.0, "color": Palette.WHISPER, "range": float(p.get("z_range", 300.0)), "kind": "z",
		"statuses": [{"id": "drowsy", "stacks": 1, "duration": float(p.get("drowsy_time", 2.6))}],
	})
	Audio.play("whisper", -14.0, 1.4)
	change_state("graze")


func modify_incoming(amount: float, _info: DamageInfo) -> float:
	# En el aire es más difícil de alcanzar (la lana amortigua).
	return amount * (0.7 if state == "hop" else 1.0)


func draw_enemy(a: float) -> void:
	var r := radius
	var squash := 1.0
	if state == "crouch":
		squash = 1.0 - 0.18 * clampf(state_t / float(p.get("crouch_time", 0.4)), 0.0, 1.0)
	if _height > 0.5:
		draw_circle(Vector2(0, r * 0.7), r * 0.9 * (1.0 - _height / 120.0), Color(0, 0, 0, 0.25 * a))
	var c := Vector2(0, -_height)
	# Patas.
	var step := sin(anim_t * 9.0) * 2.0 if velocity.length() > 10.0 else 0.0
	for sx in [-0.45, -0.15, 0.2, 0.5]:
		draw_line(c + Vector2(sx * r, r * 0.4), c + Vector2(sx * r, r * 0.95 + step * sign(sx)), Color(0.12, 0.1, 0.12, a), 3.0)
	# Lana: nubes superpuestas.
	var wool := Color(0.86, 0.84, 0.88, a)
	for i in 7:
		var ang := float(i) / 7.0 * TAU + 0.3
		draw_circle(c + Vector2(cos(ang) * r * 0.55, sin(ang) * r * 0.4 * squash - r * 0.05), r * 0.5, wool)
	draw_circle(c + Vector2(0, -r * 0.05), r * 0.62, wool)
	# Cara negra con ojos de sueño (párpados a medio cerrar).
	var face := c + Vector2(r * 0.72, -r * 0.18)
	draw_circle(face, r * 0.36, Color(0.1, 0.08, 0.11, a))
	draw_circle(face + Vector2(-r * 0.12, -r * 0.3), r * 0.12, Color(0.1, 0.08, 0.11, a))
	for sy in [-1.0, 1.0]:
		var e := face + Vector2(r * 0.08, sy * r * 0.12)
		draw_line(e - Vector2(r * 0.07, 0), e + Vector2(r * 0.07, 0), Color(Palette.WHISPER, a), 2.0)
		add_glow(e, r * 0.05, Palette.WHISPER)
	# Su número, escrito en la lana.
	var font := ThemeDB.fallback_font
	var txt := str(number)
	var fs := int(r * 0.85)
	var w := font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	draw_string(font, c + Vector2(-w * 0.5 - r * 0.1, fs * 0.35), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(0.25, 0.2, 0.3, 0.85 * a))
	if state == "crouch":
		draw_arc(c, r + 6.0, 0, TAU, 20, Color(Palette.WHISPER, 0.5 * a), 2.0)

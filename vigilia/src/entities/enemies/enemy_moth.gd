extends Enemy
## POLILLA — voladora (ignora obstáculos). Orbita al objetivo con vuelo errático
## y periódicamente se lanza en PICADO telegrafiado. Reacciona al ENTORNO: si algo
## arde (enemigo quemado o fuego en el suelo) puede distraerse y orbitarlo.
## Interacción emergente con "Brasa Viva" sin una línea de código específica.

var _orbit_r := 160.0
var _sign := 1.0
var _dive_cd := 3.0
var _dive_dir := Vector2.RIGHT
var _distract_t := 0.0
var _light_pos := Vector2.ZERO


func on_setup() -> void:
	accel = 900.0
	_orbit_r = rng.float_range(float(p.get("orbit_min", 130.0)), float(p.get("orbit_max", 190.0)))
	_sign = float(rng.rand_sign())
	_dive_cd = rng.float_range(float(p.get("dive_min", 2.4)), float(p.get("dive_max", 3.6)))
	change_state("orbit")


func behave(dt: float) -> void:
	_dive_cd -= dt
	var center := target.global_position if target != null else RoomView.center()
	if _distract_t > 0.0:
		_distract_t -= dt
		center = _light_pos
	elif state == "orbit" and state_t > 1.0 and rng.chance(float(p.get("light_attraction", 0.35)) * dt):
		var lp := _find_light()
		if lp != Vector2.INF:
			_light_pos = lp
			_distract_t = 3.0
	var spd := current_speed()
	match state:
		"orbit":
			accel = 900.0
			var jitter := Vector2(sin(anim_t * 7.3), cos(anim_t * 5.1)) * 50.0
			desired_velocity = orbit(center, _orbit_r if _distract_t <= 0.0 else 50.0, spd, _sign) + jitter + separation(60.0)
			if _dive_cd <= 0.0 and _distract_t <= 0.0 and target != null:
				change_state("windup")
		"windup":
			desired_velocity = Vector2(sin(anim_t * 30.0), 0) * 30.0
			var wind := float(p.get("dive_windup", 0.5))
			if state_t < wind * 0.75 and target != null:
				_dive_dir = to_target().normalized()
			if state_t >= wind:
				change_state("dive")
		"dive":
			accel = 3200.0
			desired_velocity = _dive_dir * float(p.get("dive_speed", 430.0))
			if state_t >= float(p.get("dive_time", 0.45)):
				change_state("recover")
		"recover":
			accel = 700.0
			desired_velocity = Vector2.ZERO
			if state_t >= float(p.get("recover", 0.6)):
				_dive_cd = rng.float_range(float(p.get("dive_min", 2.4)), float(p.get("dive_max", 3.6)))
				_sign = float(rng.rand_sign())
				change_state("orbit")


## Fuente de luz más cercana: enemigo ardiendo o fuego en el suelo.
func _find_light() -> Vector2:
	var best := Vector2.INF
	var bd := 420.0 * 420.0
	for e in world.enemies:
		if e != self and is_instance_valid(e) and e.alive and e.status.has("burn"):
			var d := global_position.distance_squared_to(e.global_position)
			if d < bd:
				bd = d
				best = e.global_position
	for z in world.hazards.zones:
		if z[2] == "fire":
			var d2 := global_position.distance_squared_to(z[0])
			if d2 < bd:
				bd = d2
				best = z[0]
	return best


func draw_enemy(a: float) -> void:
	var r := radius
	var flap := absf(sin(anim_t * (26.0 if state == "windup" else 16.0)))
	var glow := state == "windup"
	var wing := Color("d8d0ff", 0.85 * a) if not glow else Color(Palette.FLAME_CORE, a)
	var ang := velocity.angle() if velocity.length() > 10.0 else 0.0
	draw_set_transform(Vector2.ZERO, ang, Vector2.ONE)
	for sy in [-1.0, 1.0]:
		_ellipse(Vector2(-r * 0.1, sy * r * (0.6 + 0.5 * flap)), r * 0.75, r * (0.35 + 0.45 * flap), wing)
		_ellipse(Vector2(-r * 0.7, sy * r * (0.45 + 0.3 * flap)), r * 0.45, r * (0.25 + 0.25 * flap), Color("8a7f9a", 0.85 * a))
		draw_circle(Vector2(-r * 0.05, sy * r * (0.65 + 0.5 * flap)), r * 0.16, Color(0.1, 0.05, 0.1, a))
	_ellipse(Vector2.ZERO, r * 0.75, r * 0.32, Color("6a5a6a", a))
	draw_circle(Vector2(r * 0.55, 0), r * 0.22, Color(Palette.FLAME_CORE if _distract_t > 0.0 else Palette.BONE, a))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if state == "windup":
		draw_line(Vector2.ZERO, _dive_dir * 90.0, Color(Palette.BLOOD, 0.45 * a), 2.0)


func _ellipse(c: Vector2, rx: float, ry: float, col: Color) -> void:
	var pts := PackedVector2Array()
	for i in 12:
		var t := float(i) / 12.0 * TAU
		pts.append(c + Vector2(cos(t) * rx, sin(t) * ry))
	draw_colored_polygon(pts, col)

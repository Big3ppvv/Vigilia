extends Enemy
## PLAÑIDERA — francotiradora. Mantiene una banda de distancia (huye si te
## acercas, se aproxima si te alejas o pierde visión, orbita en la banda). Apunta
## con una línea visible que se FIJA antes del disparo (lock_time): la lectura del
## telegrafiado es la habilidad que se exige al jugador.

var _aim_dir := Vector2.RIGHT
var _cooldown := 1.5
var _strafe := 1.0
var _flip_t := 2.0


func on_setup() -> void:
	accel = 700.0
	_strafe = float(rng.rand_sign())
	_cooldown = rng.float_range(1.0, 2.0)
	_flip_t = rng.float_range(1.5, 3.0)
	change_state("move")


func behave(dt: float) -> void:
	_cooldown -= dt
	_flip_t -= dt
	if _flip_t <= 0.0:
		_flip_t = rng.float_range(1.5, 3.0)
		_strafe = -_strafe
	if target == null:
		return
	var d := dist_to_target()
	var spd := current_speed()
	match state:
		"move":
			var v := Vector2.ZERO
			if d < float(p.get("min_range", 220.0)):
				v = flee(target.global_position, spd) + orbit(target.global_position, d, spd * 0.4, _strafe)
			elif d > float(p.get("max_range", 410.0)) or not has_los_to_target():
				v = path_to_target(spd)
			else:
				v = orbit(target.global_position, d, spd * 0.7, _strafe)
			desired_velocity = v.limit_length(spd) + separation()
			if _cooldown <= 0.0 and has_los_to_target() and d < float(p.get("max_range", 410.0)) + 80.0:
				_aim_dir = to_target().normalized()
				change_state("aim")
		"aim":
			desired_velocity = Vector2.ZERO
			var aim_time := float(p.get("aim_time", 0.8))
			if state_t < aim_time - float(p.get("lock_time", 0.22)):
				_aim_dir = to_target().normalized()
			if state_t >= aim_time:
				_fire()
				_cooldown = rng.float_range(float(p.get("cooldown_min", 2.2)), float(p.get("cooldown_max", 3.2)))
				change_state("move")


func _fire() -> void:
	var n := int(p.get("burst", 1))
	var spread := deg_to_rad(float(p.get("burst_spread", 14.0)))
	for i in n:
		var off := 0.0 if n == 1 else (float(i) / float(n - 1) - 0.5) * spread * 2.0
		shoot(_aim_dir.rotated(off), float(p.get("shot_speed", 400.0)), {"radius": 7.5, "color": Palette.ENEMY_SHOT})
	Audio.play("enemy_shoot", -4.0)


func draw_enemy(a: float) -> void:
	var r := radius
	if state == "aim":
		var locked := state_t >= float(p.get("aim_time", 0.8)) - float(p.get("lock_time", 0.22))
		var col := Color(1, 1, 1, 0.75 * a) if locked else Color(Palette.BLOOD, 0.35 + 0.3 * state_t)
		draw_line(Vector2.ZERO, _aim_dir * 640.0, col, 2.0 if locked else 1.2)
	var robe := PackedVector2Array([Vector2(-r * 1.1, r * 1.1), Vector2(-r * 0.55, -r * 0.7), Vector2(0, -r * 1.25), Vector2(r * 0.55, -r * 0.7), Vector2(r * 1.1, r * 1.1)])
	draw_colored_polygon(robe, Color("2e1f38", a))
	draw_polyline(robe, Color("4a3358", a), 1.5)
	draw_circle(Vector2(0, -r * 0.35), r * 0.5, Color(Palette.WAX, a))
	for sx in [-1.0, 1.0]:
		var e := Vector2(sx * r * 0.22, -r * 0.4)
		draw_line(e + Vector2(-r * 0.12, -2), e + Vector2(r * 0.12, 2), Color(0.05, 0.02, 0.04, a), 2.0)
		draw_line(e + Vector2(0, 2), e + Vector2(0, r * 0.45 + 2.0 * sin(anim_t * 2.0 + sx)), Color(0.12, 0.08, 0.1, 0.8 * a), 2.0)

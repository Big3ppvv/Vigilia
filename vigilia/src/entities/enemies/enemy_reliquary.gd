extends Enemy
## RELICARIO — tanque con ARMADURA DIRECCIONAL. Gira lentamente hacia el objetivo
## (turn_speed limitado): el frente absorbe la mayoría del daño, la espalda es un
## punto débil. Exige flanquear con la esquiva o usar rebotes/teledirección:
## crea decisiones de posicionamiento y valoriza ciertos objetos sin programarlo.

var _face := Vector2.DOWN
var _attack_cd := 2.0
var _attacks := 0
var _clang_cd := 0.0


func on_setup() -> void:
	accel = 400.0
	_face = Vector2.DOWN.rotated(rng.float_range(-PI, PI))
	_attack_cd = float(p.get("attack_interval", 2.8)) * rng.float_range(0.5, 1.0)
	change_state("walk")


func behave(dt: float) -> void:
	_clang_cd = maxf(0.0, _clang_cd - dt)
	if target != null:
		var cur := _face.angle()
		var diff := wrapf(to_target().angle() - cur, -PI, PI)
		var mx := float(p.get("turn_speed", 1.25)) * dt
		_face = Vector2.RIGHT.rotated(cur + clampf(diff, -mx, mx))
	_attack_cd -= dt
	match state:
		"walk":
			var close := target != null and dist_to_target() < 150.0
			desired_velocity = (Vector2.ZERO if close else path_to_target(current_speed())) + separation()
			if _attack_cd <= 0.0 and has_los_to_target():
				change_state("charge")
		"charge":
			desired_velocity = Vector2.ZERO
			if state_t >= 0.5:
				_attack()
				_attack_cd = float(p.get("attack_interval", 2.8))
				change_state("walk")


func _attack() -> void:
	_attacks += 1
	var spd := float(p.get("shot_speed", 230.0))
	if _attacks % 3 == 0:
		shoot_ring(int(p.get("radial_count", 8)), spd, _face.angle(), {"radius": 7.5})
	else:
		var n := int(p.get("fan_count", 3))
		var spread := deg_to_rad(float(p.get("fan_spread", 30.0)))
		for i in n:
			var off := 0.0 if n == 1 else (float(i) / float(n - 1) - 0.5) * spread
			shoot(_face.rotated(off), spd, {"radius": 7.5})
	Audio.play("enemy_shoot", -4.0, 0.8)


func modify_incoming(amount: float, info: DamageInfo) -> float:
	if info.direction == Vector2.ZERO:
		return amount
	var from_dir := -info.direction
	var ang := rad_to_deg(absf(wrapf(from_dir.angle() - _face.angle(), -PI, PI)))
	if ang <= float(p.get("front_arc_deg", 70.0)):
		if _clang_cd <= 0.0:
			_clang_cd = 0.15
			Audio.play("clang", -6.0)
			world.fx.burst(global_position + _face * radius, Palette.GOLD, 5, 160.0, 2.0, 0.25)
		return amount * float(p.get("front_mult", 0.25))
	if ang >= float(p.get("back_arc_deg", 140.0)):
		world.fx.puff(global_position - _face * radius, Palette.BLOOD, 3)
		return amount * float(p.get("back_mult", 1.35))
	return amount


func draw_enemy(a: float) -> void:
	var r := radius
	draw_set_transform(Vector2.ZERO, _face.angle() - PI * 0.5, Vector2.ONE)
	for sx in [-1.0, 1.0]:
		var leg := sin(anim_t * 6.0 + sx) * 3.0 if velocity.length() > 5.0 else 0.0
		draw_line(Vector2(sx * r * 0.6, -r * 0.3), Vector2(sx * r * 1.0, -r * 0.3 + leg), Color("3a2a22", a), 3.0)
		draw_line(Vector2(sx * r * 0.6, r * 0.3), Vector2(sx * r * 1.0, r * 0.3 - leg), Color("3a2a22", a), 3.0)
	draw_rect(Rect2(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5), Color(0.55, 0.65, 0.75, 0.22 * a))
	draw_rect(Rect2(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5), Color(Palette.GOLD, 0.7 * a), false, 2.0)
	var beat := 1.0 + 0.12 * sin(anim_t * 5.0)
	draw_circle(Vector2(0, 0), r * 0.32 * beat, Color(Palette.BLOOD, a))
	draw_circle(Vector2(0, -r * 0.6), r * 0.16, Color(Palette.BLOOD, 0.6 * a))
	draw_rect(Rect2(-r * 0.95, r * 0.62, r * 1.9, r * 0.32), Color(Palette.GOLD, a))
	draw_rect(Rect2(-r * 0.95, r * 0.62, r * 1.9, r * 0.32), Color(Palette.BRONZE, a), false, 2.0)
	draw_circle(Vector2(0, -r * 0.82), r * 0.14, Color(Palette.FLAME, (0.5 + 0.4 * sin(anim_t * 6.0)) * a))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	add_glow(Vector2.ZERO, r * 0.22 * beat, Palette.BLOOD.lightened(0.25))
	add_glow(Vector2(0, -r * 0.82).rotated(_face.angle() - PI * 0.5), r * 0.12, Palette.FLAME)
	if state == "charge":
		draw_arc(Vector2.ZERO, r + 10.0, _face.angle() - 0.5, _face.angle() + 0.5, 10, Color(Palette.BLOOD, 0.6 * a), 3.0)

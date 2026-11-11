extends Enemy
## GOTERA — saltadora que se divide. Salta hacia el objetivo con una desviación
## aleatoria; al morir se parte en gotas menores (generaciones limitadas por datos).
## En pisos profundos (override "land_ring") cada aterrizaje salpica proyectiles.

var _hop_vel := Vector2.ZERO
var _height := 0.0
var _wait := 0.5


func on_setup() -> void:
	accel = 2600.0
	_wait = rng.float_range(0.2, 0.8)
	change_state("idle")


func behave(_dt: float) -> void:
	match state:
		"idle":
			desired_velocity = separation() * 0.5
			_height = 0.0
			if state_t >= _wait:
				change_state("windup")
		"windup":
			desired_velocity = Vector2.ZERO
			if state_t >= float(p.get("hop_windup", 0.32)):
				var dir := to_target().normalized().rotated(rng.float_range(-0.45, 0.45)) if target != null else rng.unit_vector()
				var dist := float(p.get("hop_distance", 130.0)) * (1.0 - 0.15 * generation)
				_hop_vel = dir * dist / float(p.get("hop_time", 0.42))
				change_state("hop")
		"hop":
			var ht := float(p.get("hop_time", 0.42))
			desired_velocity = _hop_vel
			_height = sin(clampf(state_t / ht, 0.0, 1.0) * PI) * 24.0 * scale_factor
			if state_t >= ht:
				_land()


func _land() -> void:
	_height = 0.0
	velocity = Vector2.ZERO
	world.fx.puff(global_position, Palette.WAX_DARK, 5)
	var ring := int(p.get("land_ring", 0))
	if ring > 0:
		shoot_ring(ring, 150.0, rng.next_float() * TAU, {"radius": 6.0, "color": Palette.WAX_DARK.lightened(0.2), "range": 260.0})
	_wait = rng.float_range(0.25, 0.65)
	change_state("idle")


func on_death(_info: DamageInfo) -> void:
	if generation >= int(p.get("max_generation", 1)):
		return
	var n := int(p.get("split_count", 2))
	for i in n:
		var off := Vector2.RIGHT.rotated(TAU * float(i) / float(n) + rng.next_float()) * (radius * 0.8)
		world.spawn_enemy(enemy_id, global_position + off, {
			"hp_mult": float(p.get("child_hp_mult", 0.4)), "scale": float(p.get("child_scale", 0.66)) * scale_factor,
			"generation": generation + 1, "spawn_time": 0.2,
		})


func draw_enemy(a: float) -> void:
	var r := radius
	var sx := 1.0
	var sy := 1.0
	match state:
		"windup":
			var k := clampf(state_t / float(p.get("hop_windup", 0.32)), 0.0, 1.0)
			sx = 1.0 + 0.25 * k
			sy = 1.0 - 0.25 * k
		"hop":
			sx = 0.85
			sy = 1.2
	if _height > 0.5:
		draw_circle(Vector2(0, r * 0.6), r * 0.8, Color(0, 0, 0, 0.25 * a))
	var c := Vector2(0, -_height)
	var pts := PackedVector2Array()
	for i in 16:
		var ang := float(i) / 16.0 * TAU
		var wob := 1.0 + 0.07 * sin(ang * 3.0 + anim_t * 6.0)
		pts.append(c + Vector2(cos(ang) * r * sx, sin(ang) * r * sy) * wob)
	draw_colored_polygon(pts, Color("c98b3a", a))
	draw_circle(c + Vector2(-r * 0.3, -r * 0.35), r * 0.28, Color(Palette.WAX, 0.7 * a))
	for i in 3:
		var bp := c + Vector2(cos(anim_t * 2.0 + i * 2.1), sin(anim_t * 1.7 + i)) * r * 0.45
		draw_circle(bp, r * 0.1, Color(Palette.WAX, 0.5 * a))
	draw_eyes(c + Vector2(0, r * 0.05), r * 0.33, r * 0.2, a)

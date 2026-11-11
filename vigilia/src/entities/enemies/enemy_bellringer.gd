extends Enemy
## CAMPANERO — invocador y apoyo. Mantiene distancia; su toque de campana lanza
## un anillo lento de proyectiles y ENDURECE CON CERA a los aliados cercanos
## (escudo temporal): matarlo primero es una decisión táctica.
## Cada cierto tiempo invoca Mechas (con tope). Con datos distintos es también
## el miniboss "Campanero Mayor" (anillo doble, ráfaga dirigida, furia).

var _ring_cd := 2.0
var _summon_cd := 4.0
var _strafe := 1.0
var _second_ring_t := -1.0
var _summons: Array = []
var _enraged := false


func on_setup() -> void:
	accel = 600.0
	_strafe = float(rng.rand_sign())
	_ring_cd = float(p.get("ring_interval", 4.0)) * rng.float_range(0.4, 0.8)
	_summon_cd = float(p.get("summon_interval", 7.0)) * 0.6
	change_state("move")


func get_phase() -> int:
	return 2 if _enraged else 1


func behave(dt: float) -> void:
	_ring_cd -= dt
	_summon_cd -= dt
	if _second_ring_t >= 0.0:
		_second_ring_t -= dt
		if _second_ring_t < 0.0:
			var n := int(p.get("ring_count", 10))
			shoot_ring(n, float(p.get("ring_speed", 140.0)) * 1.15, PI / n + anim_t, {"radius": 7.0})
	if is_boss and not _enraged and hp / max_hp <= float(p.get("enrage_at", 0.0)):
		_enraged = true
		speed_mult *= 1.25
		world.toast("¡%s enloquece!" % display_name, Palette.UI_DANGER)
		Audio.play("roar", -2.0)
		world.shake(0.5)
	if target == null:
		return
	var spd := current_speed()
	match state:
		"move":
			var d := dist_to_target()
			var keep := float(p.get("keep_distance", 300.0))
			var v := Vector2.ZERO
			if d < keep * 0.8:
				v = flee(target.global_position, spd)
			elif d > keep * 1.3 or not has_los_to_target():
				v = path_to_target(spd)
			else:
				v = orbit(target.global_position, keep, spd * 0.6, _strafe)
			desired_velocity = v + separation()
			if _ring_cd <= 0.0:
				change_state("ring")
			elif _summon_cd <= 0.0 and _alive_summons() < int(p.get("summon_cap", 3)):
				change_state("summon")
		"ring":
			desired_velocity = Vector2.ZERO
			if state_t >= 0.6:
				_do_ring()
				_ring_cd = float(p.get("ring_interval", 4.0)) * (0.65 if _enraged else 1.0)
				change_state("move")
		"summon":
			desired_velocity = Vector2.ZERO
			if state_t >= 0.8:
				_do_summon()
				_summon_cd = float(p.get("summon_interval", 7.0))
				change_state("move")


func _do_ring() -> void:
	Audio.play("bell", -4.0)
	world.fx.ring(global_position, 90.0, Palette.GOLD, 0.5, 4.0)
	var n := int(p.get("ring_count", 10))
	shoot_ring(n, float(p.get("ring_speed", 140.0)), rng.next_float() * TAU, {"radius": 7.0})
	if bool(p.get("ring_double", false)):
		_second_ring_t = 0.3
	var volley := int(p.get("aimed_volley", 0))
	if volley > 0 and target != null:
		var base := to_target().normalized()
		for i in volley:
			shoot(base.rotated((float(i) - (volley - 1) * 0.5) * 0.18), 300.0, {"radius": 8.0})
	var sr := float(p.get("shield_radius", 0.0))
	if sr > 0.0:
		world.fx.ring(global_position, sr, Color(Palette.WAX, 0.8), 0.5, 3.0)
		for e in world.enemies:
			if e != self and is_instance_valid(e) and e.alive and global_position.distance_to(e.global_position) <= sr:
				e.shield_hp = maxf(e.shield_hp, float(p.get("shield_amount", 8.0)))
				e.shield_t = 5.0


func _do_summon() -> void:
	var id := str(p.get("summon_id", "wick"))
	for i in int(p.get("summon_count", 2)):
		if _alive_summons() >= int(p.get("summon_cap", 3)):
			break
		var pos := world.room.grid.nearest_walkable_pos(global_position + rng.unit_vector() * 60.0)
		var e := world.spawn_enemy(id, pos, {"summon": true, "spawn_time": 0.7})
		if e != null:
			_summons.append(e)
	Audio.play("bell", -6.0, 0.7)


func _alive_summons() -> int:
	var n := 0
	for e in _summons:
		if is_instance_valid(e) and e.alive:
			n += 1
	return n


func draw_enemy(a: float) -> void:
	var r := radius
	draw_colored_polygon(PackedVector2Array([Vector2(-r, r), Vector2(-r * 0.7, -r * 0.1), Vector2(r * 0.7, -r * 0.1), Vector2(r, r)]), Color("2a2026", a))
	var swing := 0.0
	if state == "ring":
		swing = sin(state_t * 22.0) * 0.35
	elif state == "summon":
		swing = sin(state_t * 10.0) * 0.2
	draw_set_transform(Vector2(0, -r * 0.35), swing, Vector2.ONE)
	var bell := PackedVector2Array([Vector2(-r * 0.4, -r * 0.9), Vector2(r * 0.4, -r * 0.9), Vector2(r * 0.55, -r * 0.2), Vector2(r * 0.9, r * 0.45), Vector2(-r * 0.9, r * 0.45), Vector2(-r * 0.55, -r * 0.2)])
	draw_colored_polygon(bell, Color(Palette.BRONZE if not _enraged else Palette.BLOOD, a))
	draw_polyline(bell, Color(Palette.GOLD, a), 1.5)
	draw_line(Vector2(r * 0.15, -r * 0.8), Vector2(-r * 0.05, r * 0.1), Color(0, 0, 0, 0.6 * a), 2.0)
	draw_circle(Vector2(-r * 0.2, -r * 0.2), r * 0.11, Color(Palette.FLAME, a))
	draw_circle(Vector2(r * 0.2, -r * 0.2), r * 0.11, Color(Palette.FLAME, a))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

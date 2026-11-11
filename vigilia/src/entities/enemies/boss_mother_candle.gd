extends Enemy
## MADRE CIRIO — jefe de tres fases.
##
## Fase 1 "Vigilia":        ráfaga radial, andanada dirigida, invocación de Mechas, pisotón.
## Fase 2 "Derretimiento":  + espiral, + embestida que deja estela de cera.
##                          Transformación: charcos de cera permanentes en la arena.
## Fase 3 "Llama desnuda":  + láseres giratorios; cuerpo menor y más rápido.
##                          Transformación: hogueras permanentes en las esquinas.
##
## Reacción al posicionamiento: cerca -> pisotón; lejos mucho tiempo -> embestida.
## Vulnerabilidad: si la embestida acaba contra un muro queda ATURDIDA y recibe
## x1.5 de daño (cebarla contra la pared es la estrategia que el diseño premia).
## Reacción al inventario (datos, enemies.json): si portas la etiqueta "wick"
## no invoca a sus hijas.
## Interacción sistémica: la Escarcha ralentiza TODOS sus temporizadores (la base
## escala behave() por la velocidad de acción); no hay código específico para ello.

var phase := 1
var _cd := 1.6
var _no_summon := false
var _reaction_text := ""
var _charge_dir := Vector2.RIGHT
var _spiral_angle := 0.0
var _spiral_t := 0.0
var _laser_angle := 0.0
var _far_t := 0.0
var _last_attack := ""
var _shrink := 1.0
var _trail_t := 0.0
var _summons: Array = []
var _burst_second := false
var _fired := false


func on_setup() -> void:
	accel = 500.0
	change_state("intro")
	if world.player != null:
		for r in def.get("inventory_reactions", []):
			if int(world.player.inventory.tag_counts.get(str(r.get("tag", "")), 0)) > 0:
				if str(r.get("effect", "")) == "no_summon":
					_no_summon = true
					_reaction_text = str(r.get("text", ""))


func get_phase() -> int:
	return phase


func _arr(key: String, default_value: float) -> float:
	var v: Variant = p.get(key, default_value)
	if typeof(v) == TYPE_ARRAY:
		var arr: Array = v
		return float(arr[clampi(phase - 1, 0, arr.size() - 1)])
	return float(v)


func behave(dt: float) -> void:
	if target != null:
		if dist_to_target() > 380.0:
			_far_t += dt
		else:
			_far_t = maxf(0.0, _far_t - dt * 2.0)
	_check_phase()
	contact_damage = 2 if state == "charge" else 1
	match state:
		"intro":
			desired_velocity = Vector2.ZERO
			if state_t >= 1.6:
				if _reaction_text != "":
					world.toast(_reaction_text, Palette.WAX)
				change_state("idle")
		"idle":
			accel = 500.0
			if target != null:
				var want := clampf(dist_to_target() - 220.0, -1.0, 1.0)
				desired_velocity = to_target().normalized() * _arr("move_speed", 60.0) * want + orbit(target.global_position, 240.0, _arr("move_speed", 60.0) * 0.5, 1.0) * 0.5
			_cd -= dt
			if _cd <= 0.0:
				_choose_attack()
		"burst":
			desired_velocity = Vector2.ZERO
			if state_t >= 0.45 and not _fired:
				_fired = true
				var n := int(_arr("burst_count", 12))
				shoot_ring(n, float(p.get("burst_speed", 165.0)), rng.next_float() * TAU, {"radius": 8.0, "color": Palette.WAX.darkened(0.1), "statuses": [{"id": "waxed", "stacks": 1, "duration": 1.5}]})
				Audio.play("enemy_shoot", -2.0, 0.6)
			if phase >= 2 and state_t >= 0.8 and not _burst_second:
				_burst_second = true
				var n2 := int(_arr("burst_count", 12))
				shoot_ring(n2, float(p.get("burst_speed", 165.0)) * 1.2, rng.next_float() * TAU, {"radius": 7.0})
			if state_t >= 1.0:
				_end_attack()
		"volley":
			desired_velocity = Vector2.ZERO
			if state_t >= 0.35 and not _fired and target != null:
				_fired = true
				var n3 := int(_arr("volley_count", 3))
				var base := to_target().normalized()
				for i in n3:
					shoot(base.rotated((float(i) - (n3 - 1) * 0.5) * 0.17), float(p.get("volley_speed", 285.0)), {"radius": 8.5})
				Audio.play("enemy_shoot", -2.0)
			if state_t >= 0.7:
				_end_attack()
		"summon":
			desired_velocity = Vector2.ZERO
			if state_t >= 0.7 and not _fired:
				_fired = true
				for i in int(p.get("summon_count", 2)):
					if _alive_summons() >= int(p.get("summon_cap", 4)):
						break
					var pos := world.room.grid.nearest_walkable_pos(global_position + rng.unit_vector() * 90.0)
					var e := world.spawn_enemy(str(p.get("summon_id", "wick")), pos, {"summon": true, "spawn_time": 0.7})
					if e != null:
						_summons.append(e)
			if state_t >= 1.1:
				_end_attack()
		"spiral":
			desired_velocity = Vector2.ZERO
			_spiral_t += dt
			var arms := 2 if phase == 2 else 3
			while _spiral_t >= float(p.get("spiral_rate", 0.075)):
				_spiral_t -= float(p.get("spiral_rate", 0.075))
				for k in arms:
					shoot(Vector2.RIGHT.rotated(_spiral_angle + TAU * k / arms), float(p.get("spiral_speed", 175.0)), {"radius": 7.0})
				_spiral_angle += 0.33
			if state_t >= float(p.get("spiral_time", 2.6)):
				_end_attack()
		"charge_windup":
			desired_velocity = Vector2.ZERO
			var wind := float(p.get("charge_windup", 0.75))
			if state_t < wind * 0.75 and target != null:
				_charge_dir = to_target().normalized()
			if state_t >= wind:
				change_state("charge")
				Audio.play("roar", -8.0, 1.4)
		"charge":
			accel = 5000.0
			desired_velocity = _charge_dir * float(p.get("charge_speed", 560.0))
			_trail_t += dt
			if phase >= 2 and _trail_t >= 0.08:
				_trail_t = 0.0
				world.hazards.add_zone(global_position, 26.0, "wax", 6.0)
			if state_t > 0.1 and get_slide_collision_count() > 0:
				change_state("stunned")
				velocity = -_charge_dir * 120.0
				world.shake(0.7)
				world.fx.burst(global_position + _charge_dir * radius, Palette.WAX_DARK, 20, 260.0, 4.0, 0.7)
				world.fx.float_text(global_position + Vector2(0, -radius - 20), "¡Aturdida!", Palette.UI_ACCENT, 16)
				Audio.play("clang", 0.0, 0.5)
			elif state_t >= float(p.get("charge_max_time", 1.3)):
				_end_attack()
		"stunned":
			accel = 900.0
			desired_velocity = Vector2.ZERO
			if state_t >= float(p.get("stun_time", 1.7)):
				_end_attack()
		"stomp":
			desired_velocity = Vector2.ZERO
			if state_t >= 0.5 and not _fired:
				_fired = true
				shoot_ring(int(p.get("stomp_count", 18)), 300.0, rng.next_float() * TAU, {"radius": 7.0, "range": 260.0})
				world.shake(0.4)
				world.fx.ring(global_position, 120.0, Palette.WAX, 0.4, 5.0)
			if state_t >= 0.85:
				_end_attack()
		"lasers":
			desired_velocity = Vector2.ZERO
			var lw := float(p.get("laser_windup", 0.9))
			var rot := float(p.get("laser_rot", 0.85))
			if state_t < lw:
				_laser_angle += rot * 0.25 * dt
			else:
				if not _fired:
					_fired = true
					Audio.play("laser", -2.0)
				_laser_angle += rot * dt
				_laser_damage()
			if state_t >= lw + float(p.get("laser_time", 3.6)):
				_end_attack()
		"transition":
			desired_velocity = Vector2.ZERO
			if state_t >= 1.6:
				_apply_phase_transform()
				_cd = 1.0
				change_state("idle")


func _choose_attack() -> void:
	var d := dist_to_target()
	var opts: Array = []
	if d < float(p.get("stomp_range", 165.0)):
		opts.append({"a": "stomp", "w": 3.0})
	if _far_t > 3.0:
		opts.append({"a": "charge_windup", "w": 4.0})
	opts.append({"a": "burst", "w": 2.0})
	opts.append({"a": "volley", "w": 2.0 if d > 250.0 else 1.0})
	if not _no_summon and _alive_summons() < int(p.get("summon_cap", 4)):
		opts.append({"a": "summon", "w": 1.0 if phase == 1 else 0.6})
	if phase >= 2:
		opts.append({"a": "spiral", "w": 2.0})
		opts.append({"a": "charge_windup", "w": 1.5})
	if phase >= 3:
		opts.append({"a": "lasers", "w": 2.6})
	for o in opts:
		if o["a"] == _last_attack:
			o["w"] = float(o["w"]) * 0.3
	var pick: Variant = rng.pick_weighted(opts, "w")
	var a := str(pick["a"]) if pick != null else "burst"
	_last_attack = a
	_fired = false
	_burst_second = false
	_spiral_t = 0.0
	if a == "lasers":
		_laser_angle = rng.next_float() * TAU
	change_state(a)


func _end_attack() -> void:
	_cd = _arr("cooldown", 1.2)
	change_state("idle")


func _check_phase() -> void:
	if state == "transition" or state == "intro":
		return
	var ratio := hp / max_hp
	if phase == 1 and ratio <= float(p.get("phase2_at", 0.66)):
		_begin_transition(2)
	elif phase == 2 and ratio <= float(p.get("phase3_at", 0.33)):
		_begin_transition(3)


func _begin_transition(np: int) -> void:
	phase = np
	change_state("transition")
	Audio.play("roar")
	world.shake(0.8)
	world.projectiles.clear_team(Team.ENEMY, true)
	world.toast("Madre Cirio se derrite..." if np == 2 else "¡La llama queda desnuda!", Palette.FLAME)
	EventBus.boss_health_changed.emit(hp, max_hp, phase)


## Transformación de la arena (permanente hasta salir de la sala).
func _apply_phase_transform() -> void:
	var c := RoomView.center()
	if phase == 2:
		for off in [Vector2(-300, -150), Vector2(300, -150), Vector2(-300, 150), Vector2(300, 150)]:
			world.hazards.add_zone(c + off, 58.0, "wax", -1.0)
		world.fx.burst(c, Palette.WAX, 30, 400.0, 5.0, 0.9)
	elif phase == 3:
		_shrink = 0.8
		radius = base_radius * scale_factor * _shrink
		speed_mult *= 1.35
		for t in [Vector2i(1, 1), Vector2i(13, 1), Vector2i(1, 7), Vector2i(13, 7)]:
			world.hazards.add_zone(RoomGrid.tile_center(t), 34.0, "fire", -1.0)


## Longitud del rayo desde el jefe hasta el muro interior en la dirección dada.
func _laser_len(dir: Vector2) -> float:
	var p := global_position
	var t := 1400.0
	if dir.x > 0.001:
		t = minf(t, (RoomView.W - p.x) / dir.x)
	elif dir.x < -0.001:
		t = minf(t, -p.x / dir.x)
	if dir.y > 0.001:
		t = minf(t, (RoomView.H - p.y) / dir.y)
	elif dir.y < -0.001:
		t = minf(t, -p.y / dir.y)
	return maxf(0.0, t)


## Daño de los láseres: distancia del jugador a cada rayo (recortado en los muros).
func _laser_damage() -> void:
	var pl := world.player
	if pl == null or not pl.alive:
		return
	var beams := 2 if phase < 3 else 3
	var width := float(p.get("laser_width", 14.0)) + pl.radius * 0.6
	var rel := pl.global_position - global_position
	for k in beams:
		var dir := Vector2.RIGHT.rotated(_laser_angle + TAU * k / beams)
		var proj := rel.dot(dir)
		if proj <= 0.0 or proj > _laser_len(dir):
			continue
		if absf(rel.cross(dir)) <= width:
			var info := DamageInfo.create(1.0, Team.ENEMY, ["laser", "fire"])
			info.source_name = display_name
			info.knockback = dir.orthogonal() * 200.0
			world.deal_damage(pl, info)
			return


func modify_incoming(amount: float, _info: DamageInfo) -> float:
	if state == "transition" or state == "intro":
		return 0.0
	if state == "stunned":
		return amount * float(p.get("stun_damage_mult", 1.5))
	return amount


func _alive_summons() -> int:
	var n := 0
	for e in _summons:
		if is_instance_valid(e) and e.alive:
			n += 1
	return n


func on_death(_info: DamageInfo) -> void:
	world.fx.burst(global_position, Palette.FLAME, 60, 420.0, 6.0, 1.4)
	world.fx.burst(global_position, Palette.WAX, 40, 300.0, 5.0, 1.2)


func blood_color() -> Color:
	return Palette.WAX


func draw_enemy(a: float) -> void:
	var r := radius
	var sq := 1.0
	if state == "stomp" and state_t < 0.5:
		sq = 1.0 - 0.15 * (state_t / 0.5)
	# Telegrafiados.
	if state == "charge_windup":
		draw_line(Vector2.ZERO, _charge_dir * 700.0, Color(Palette.BLOOD, 0.25 + 0.4 * state_t), 6.0)
	if state == "lasers":
		var lw := float(p.get("laser_windup", 0.9))
		var beams := 2 if phase < 3 else 3
		var col := Palette.FLAME_BLUE if phase >= 3 else Palette.FLAME
		for k in beams:
			var dir := Vector2.RIGHT.rotated(_laser_angle + TAU * k / beams)
			var end := dir * _laser_len(dir)
			if state_t < lw:
				draw_line(Vector2.ZERO, end, Color(col, 0.35), 2.0)
			else:
				draw_line(Vector2.ZERO, end, Color(col, 0.25), float(p.get("laser_width", 14.0)) * 2.4)
				draw_line(Vector2.ZERO, end, Color(Palette.FLAME_CORE, 0.9), float(p.get("laser_width", 14.0)) * 0.9)
				draw_circle(end, 10.0, Color(col, 0.6))
	var w := r * 1.05
	var h := r * 2.2 * sq
	var body := Rect2(-w, -h * 0.75, w * 2.0, h)
	draw_rect(body, Color(Palette.WAX, a))
	draw_circle(Vector2(0, -h * 0.75), w, Color(Palette.WAX, a))
	draw_rect(Rect2(-w, -h * 0.75, w * 0.35, h), Color(Palette.WAX_DARK, 0.35 * a))
	for i in 5:
		var x := -w + w * 0.4 * i + 6.0
		var len := 10.0 + 8.0 * sin(i * 1.7 + anim_t * 0.5)
		draw_rect(Rect2(x, h * 0.25 - 4.0, 7.0, len), Color(Palette.WAX, a))
		draw_circle(Vector2(x + 3.5, h * 0.25 - 4.0 + len), 5.0, Color(Palette.WAX, a))
	var face_y := -h * 0.45
	draw_circle(Vector2(0, face_y), r * 0.26, Color(0.08, 0.03, 0.05, a))
	var look := to_target().normalized() * 4.0 if target != null else Vector2.ZERO
	draw_circle(Vector2(0, face_y) + look, r * 0.11, Color(Palette.FLAME if phase < 3 else Palette.FLAME_BLUE, a))
	for sx in [-1.0, 1.0]:
		draw_circle(Vector2(sx * r * 0.5, face_y - r * 0.1), r * 0.12, Color(0.08, 0.03, 0.05, a))
		draw_line(Vector2(sx * r * 0.5, face_y), Vector2(sx * r * 0.55, face_y + r * 0.6), Color(Palette.WAX_SHADOW, 0.8 * a), 3.0)
	draw_arc(Vector2(0, face_y + r * 0.55), r * 0.25, 0.2, PI - 0.2, 10, Color(0.08, 0.03, 0.05, a), 3.0)
	for sx in [-1.0, 1.0]:
		var hand := Vector2(sx * (w + 22.0), -h * 0.1 + 6.0 * sin(anim_t * 2.0 + sx))
		draw_line(Vector2(sx * w * 0.8, -h * 0.35), hand, Color(Palette.WAX, a), 9.0)
		draw_rect(Rect2(hand + Vector2(-4, -18), Vector2(8, 16)), Color(Palette.BONE, a))
		GlyphPainter.flame(self, hand + Vector2(0, -18), 6.0, anim_t + sx)
	var fl := r * (0.8 + 0.25 * phase)
	var fcol := Palette.FLAME_BLUE if phase >= 3 else Palette.FLAME
	draw_line(Vector2(0, -h * 0.75 - w), Vector2(0, -h * 0.75 - w - 10.0), Color(0.1, 0.06, 0.05, a), 4.0)
	draw_circle(Vector2(0, -h * 0.75 - w - fl * 0.6), fl * 1.4, Color(fcol, 0.08))
	GlyphPainter.flame(self, Vector2(0, -h * 0.75 - w - 6.0), fl, anim_t, fcol, Palette.FLAME_CORE)
	if state == "stunned":
		for i in 3:
			var ang := anim_t * 4.0 + i * TAU / 3.0
			draw_circle(Vector2(cos(ang) * 30.0, -h * 0.75 - w - 20.0 + sin(ang) * 8.0), 4.0, Color(Palette.UI_ACCENT, a))
	if state == "transition":
		draw_arc(Vector2.ZERO, r * 1.8 + state_t * 40.0, 0, TAU, 32, Color(fcol, 0.6 * (1.0 - state_t / 1.6)), 4.0)

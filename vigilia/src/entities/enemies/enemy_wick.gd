extends Enemy
## MECHA — perseguidor. Navega con el campo de flujo; a corta distancia y con
## línea de visión carga una embestida TELEGRAFIADA (la llama crece y la dirección
## se fija en el último 30 % de la carga: esquivable por reflejos, no por suerte).

var _lunge_dir := Vector2.ZERO


func on_setup() -> void:
	accel = 1100.0
	change_state("chase")


func behave(_dt: float) -> void:
	match state:
		"chase":
			accel = 1100.0
			desired_velocity = path_to_target(current_speed()) + separation()
			if target != null and state_t > 0.6 and dist_to_target() < float(p.get("lunge_range", 170.0)) and has_los_to_target():
				change_state("windup")
		"windup":
			desired_velocity = separation() * 0.5
			var wind := float(p.get("lunge_windup", 0.42))
			if state_t < wind * 0.7 and target != null:
				_lunge_dir = to_target().normalized()
			if state_t >= wind:
				change_state("lunge")
		"lunge":
			accel = 4200.0
			desired_velocity = _lunge_dir * float(p.get("lunge_speed", 360.0))
			if state_t >= float(p.get("lunge_time", 0.28)):
				change_state("recover")
		"recover":
			accel = 900.0
			desired_velocity = Vector2.ZERO
			if state_t >= float(p.get("recover", 0.55)):
				change_state("chase")


func draw_enemy(a: float) -> void:
	var r := radius
	var wob := sin(anim_t * 9.0) * 0.06
	var body := PackedVector2Array()
	for i in 14:
		var ang := float(i) / 14.0 * TAU
		var rr := r * (1.0 + (0.12 if sin(ang) > 0.4 else 0.0) + wob * cos(ang * 2.0))
		body.append(Vector2(cos(ang) * rr, sin(ang) * rr * 1.05))
	draw_colored_polygon(body, Color(Palette.WAX, a))
	draw_circle(Vector2(r * 0.25, r * 0.35), r * 0.55, Color(Palette.WAX_DARK, 0.5 * a))
	draw_rect(Rect2(-r * 0.6, r * 0.6, r * 0.25, r * 0.6), Color(Palette.WAX, a))
	draw_line(Vector2(0, -r * 0.9), Vector2(0, -r * 1.35), Color(0.1, 0.07, 0.06, a), 2.5)
	var flame_h := r * (0.55 if state != "windup" else 0.55 + 0.9 * clampf(state_t / float(p.get("lunge_windup", 0.42)), 0.0, 1.0))
	if state == "lunge":
		flame_h = r * 1.3
	GlyphPainter.flame(self, Vector2(0, -r * 1.3), flame_h, anim_t)
	draw_eyes(Vector2(0, -r * 0.1), r * 0.36, r * 0.22, a)
	if state == "windup":
		draw_line(Vector2.ZERO, _lunge_dir * 60.0, Color(Palette.FLAME, 0.5 * a), 2.0)

class_name Enemy
extends CharacterBody2D
## Base de todos los enemigos y jefes.
##
## Ciclo por frame de física:
##   estados -> (aparición) -> objetivo -> behave() [subclase] -> campeón ->
##   movimiento con aceleración -> daño por contacto -> redibujado.
## behave(dt) recibe el tiempo ESCALADO por la velocidad de acción (escarcha y
## aturdimiento ralentizan también los temporizadores de ataque, jefes incluidos).
##
## Las subclases definen el comportamiento con una máquina de estados simple
## (state / state_t + change_state) y ayudas de steering (seek, flee, orbit,
## separation, path_to_target).

signal died(enemy: Enemy)

const SPAWN_TIME := 0.6
## Dentro de la luz de una vela votiva encendida, las sombras se debilitan.
const LIGHT_VULNERABILITY := 1.25
const LIGHT_SLOW := 0.82

var def: Dictionary = {}
var enemy_id := ""
var display_name := ""
var title := ""
var max_hp := 10.0
var hp := 10.0
var radius := 14.0
var base_radius := 14.0
var base_speed := 100.0
var speed_mult := 1.0
var contact_damage := 1
var team := Team.ENEMY
var tier := 1
var armor := 0.0
var knockback_resist := 0.0
var flying := false
var is_boss := false
var is_summon := false
var champion_id := ""
var champion: Dictionary = {}
var scale_factor := 1.0
var alive := true
var spawn_t := SPAWN_TIME
var status: StatusComponent
var world: CombatWorld
var rng: RngStream
var p: Dictionary = {}
var tolerance := {}
var allergies := {}
var immunities := {}
var shield_hp := 0.0
var shield_t := 0.0
var state := "idle"
var state_t := 0.0
var anim_t := 0.0
var flash_t := 0.0
var facing := Vector2.DOWN
var desired_velocity := Vector2.ZERO
var accel := 900.0
var target: Node2D = null
var generation := 0
var drop_chance := 0.0
var tags := PackedStringArray()
var visual_alpha := 1.0
var _veil_reveal_t := 0.0
var _champ_t := 0.0
var _retaliate_cd := 0.0
var _contact_cd := 0.0


func setup(definition: Dictionary, combat_world: CombatWorld, stream: RngStream, opts: Dictionary = {}) -> void:
	def = definition
	world = combat_world
	rng = stream
	enemy_id = str(def.get("id", ""))
	display_name = str(def.get("name", enemy_id))
	title = str(def.get("title", ""))
	is_boss = bool(def.get("boss", false))
	tier = int(def.get("tier", 1))
	flying = bool(def.get("flying", false))
	armor = float(def.get("armor", 0.0))
	knockback_resist = float(def.get("knockback_resist", 0.0))
	contact_damage = int(def.get("contact_damage", 1))
	drop_chance = float(def.get("drop_chance", 0.0))
	tags = PackedStringArray(def.get("tags", []))
	scale_factor = float(def.get("scale", 1.0)) * float(opts.get("scale", 1.0))
	base_radius = float(def.get("radius", 14.0))
	base_speed = float(def.get("speed", 100.0))
	speed_mult = float(opts.get("speed_mult", 1.0))
	generation = int(opts.get("generation", 0))
	is_summon = bool(opts.get("summon", false))
	p = def.get("params", {}).duplicate(true)
	var ov: Dictionary = opts.get("overrides", {})
	for k in ov:
		p[k] = ov[k]
	var hp_mult := float(opts.get("hp_mult", 1.0))
	champion_id = str(opts.get("champion", ""))
	if champion_id != "" and ContentDB.champions.has(champion_id):
		champion = ContentDB.champions[champion_id]
		hp_mult *= float(champion.get("hp_mult", 1.0))
		scale_factor *= float(champion.get("scale", 1.0))
		speed_mult *= float(champion.get("speed_mult", 1.0))
		knockback_resist = maxf(knockback_resist, float(champion.get("knockback_resist", 0.0)))
		contact_damage += int(champion.get("contact_damage_add", 0))
	radius = base_radius * scale_factor
	max_hp = float(def.get("hp", 10.0)) * hp_mult
	hp = max_hp
	if opts.has("spawn_time"):
		spawn_t = float(opts["spawn_time"])
	status = StatusComponent.new(self)
	for im in champion.get("immune", []):
		status.immunities[str(im)] = true
	if is_boss:
		status.immunities["fear"] = true
	collision_layer = 8
	collision_mask = 1 if flying else (1 | 2)
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	var cs := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = radius * 0.8
	cs.shape = shape
	add_child(cs)
	add_to_group("enemies")
	on_setup()


## Gancho de subclase tras la configuración.
func on_setup() -> void:
	pass


## Gancho de comportamiento (FSM). dt ya está escalado por la velocidad de acción.
func behave(_dt: float) -> void:
	pass


func change_state(s: String) -> void:
	state = s
	state_t = 0.0


func current_speed() -> float:
	return base_speed * speed_mult


func _physics_process(delta: float) -> void:
	if not alive:
		return
	var __ptot := Prof.t0()
	_physics_body(delta)
	Prof.add("enemigos", __ptot)


func _physics_body(delta: float) -> void:
	anim_t += delta
	flash_t = maxf(0.0, flash_t - delta)
	_retaliate_cd = maxf(0.0, _retaliate_cd - delta)
	_contact_cd = maxf(0.0, _contact_cd - delta)
	_veil_reveal_t = maxf(0.0, _veil_reveal_t - delta)
	if shield_t > 0.0:
		shield_t -= delta
		if shield_t <= 0.0:
			shield_hp = 0.0
	status.tick(delta)
	if not alive:
		return
	if spawn_t > 0.0:
		spawn_t -= delta
		velocity = Vector2.ZERO
		queue_redraw()
		return
	var adt := delta * status.action_speed_mult()
	state_t += adt
	target = world.get_enemy_target(self)
	desired_velocity = Vector2.ZERO
	if adt > 0.0:
		behave(adt)
	_champion_tick(delta)
	var mult := status.speed_mult() * world.terrain_speed_mult(self)
	if not is_boss and world.in_votive_light(global_position):
		mult *= LIGHT_SLOW
	velocity = velocity.move_toward(desired_velocity * mult, accel * delta)
	move_and_slide()
	_contact(delta)
	queue_redraw()


func _contact(_delta: float) -> void:
	if contact_damage <= 0 or _contact_cd > 0.0:
		return
	for t in world.player_side_targets():
		if not is_instance_valid(t) or t.has_method("blocks_projectiles"):
			continue
		var r: float = radius + float(t.radius) * 0.75
		if global_position.distance_squared_to(t.global_position) <= r * r:
			var info := DamageInfo.create(float(contact_damage), Team.ENEMY, ["contact"])
			if contact_damage >= 2:
				info.add_tag("heavy")
			info.source_name = display_name
			info.knockback = (t.global_position - global_position).normalized() * 320.0
			world.deal_damage(t, info)
			_contact_cd = 0.4
			return


# ---------------------------------------------------------------------------
# Daño
# ---------------------------------------------------------------------------

func apply_damage(info: DamageInfo) -> float:
	if not alive:
		return 0.0
	if not Team.can_damage(info.team, team, info.friendly_fire):
		return 0.0
	var amount := DamageSystem.mitigate(info, tolerance, allergies, immunities, armor)
	amount = modify_incoming(amount, info)
	if info.team == Team.PLAYER and not is_boss and world.in_votive_light(global_position):
		amount *= LIGHT_VULNERABILITY
	if amount <= 0.0:
		return 0.0
	if shield_hp > 0.0:
		var absorbed := minf(shield_hp, amount)
		shield_hp -= absorbed
		amount -= absorbed
		world.fx.puff(global_position, Palette.WAX, 3)
		if amount <= 0.0:
			return absorbed
	hp -= amount
	flash_t = 0.09
	if info.knockback != Vector2.ZERO:
		velocity += info.knockback * (1.0 - knockback_resist)
	_veil_reveal_t = 1.0
	world.fx.damage_number(global_position + Vector2(0, -radius), amount, info.crit)
	if info.crit:
		Audio.play("hit", -2.0, 1.3)
	else:
		Audio.play("hit", -8.0)
	on_damaged(info, amount)
	_champion_on_damaged(info)
	if is_boss:
		EventBus.boss_health_changed.emit(maxf(hp, 0.0), max_hp, get_phase())
	if hp <= 0.0:
		die(info)
	return amount


## Fase actual (jefes multifase la sobrescriben; la usa la barra de jefe).
func get_phase() -> int:
	return 1


## Gancho: modificar el daño entrante (armadura direccional, vulnerabilidades).
func modify_incoming(amount: float, _info: DamageInfo) -> float:
	return amount


func on_damaged(_info: DamageInfo, _amount: float) -> void:
	pass


func take_status_damage(status_id: String, amount: float, status_tags: Array, depth: int, source_team: int) -> void:
	var info := DamageInfo.create(amount, source_team, status_tags)
	info.add_tag("dot")
	info.depth = depth
	info.proc_coef = 0.0
	info.source_name = str(ContentDB.statuses.get(status_id, {}).get("name", status_id))
	world.deal_damage(self, info)


func status_resistance(status_id: String) -> float:
	var r := 0.0
	if is_boss:
		r += 0.3
	var def_s: Dictionary = ContentDB.statuses.get(status_id, {})
	for t in def_s.get("tags", []):
		r += float(tolerance.get(t, 0.0)) - float(allergies.get(t, 0.0))
	return clampf(r, -0.5, 0.9)


func on_reaction(r: Dictionary) -> void:
	world.on_reaction(self, r)


func die(info: DamageInfo) -> void:
	if not alive:
		return
	alive = false
	var statuses := status.active_ids()
	world.on_enemy_killed(self, info, statuses)
	on_death(info)
	_champion_on_death()
	died.emit(self)
	status.clear()
	queue_free()


## La luz despierta la sala: la sombra se deshace sin morir (no emite "kill").
func dissolve() -> void:
	if not alive:
		return
	alive = false
	world.on_enemy_dissolved(self)
	died.emit(self)
	status.clear()
	queue_free()


## Gancho de muerte (divisiones, explosiones propias...).
func on_death(_info: DamageInfo) -> void:
	pass


func blood_color() -> Color:
	return Palette.parse(def.get("blood", ""), Palette.WAX_DARK)


# ---------------------------------------------------------------------------
# Steering
# ---------------------------------------------------------------------------

func to_target() -> Vector2:
	return target.global_position - global_position if target != null else Vector2.ZERO


func dist_to_target() -> float:
	return to_target().length() if target != null else INF


func seek(point: Vector2, speed: float) -> Vector2:
	return (point - global_position).normalized() * speed


func flee(point: Vector2, speed: float) -> Vector2:
	return (global_position - point).normalized() * speed


## Movimiento tangencial alrededor de un centro manteniendo un radio.
func orbit(center: Vector2, orbit_radius: float, speed: float, dir_sign: float) -> Vector2:
	var off := global_position - center
	var d := off.length()
	if d < 0.01:
		return Vector2.RIGHT * speed
	var tangent := off.orthogonal().normalized() * dir_sign
	var radial := -off.normalized() * clampf((d - orbit_radius) / 60.0, -1.0, 1.0)
	return (tangent + radial).normalized() * speed


## Separación de otros enemigos (evita que se apilen).
func separation(strength: float = 90.0) -> Vector2:
	var push := Vector2.ZERO
	for e in world.enemies:
		if e == self or not is_instance_valid(e):
			continue
		var off: Vector2 = global_position - e.global_position
		var min_d: float = radius + float(e.radius) + 6.0
		var d := off.length()
		if d > 0.01 and d < min_d:
			push += off / d * (1.0 - d / min_d)
	return push * strength


## Hacia el objetivo esquivando obstáculos: directo con línea de visión;
## si no, desciende por el campo de flujo de la sala.
func path_to_target(speed: float) -> Vector2:
	if target == null or world.room == null:
		return Vector2.ZERO
	if flying or world.room.grid.has_line_of_sight(global_position, target.global_position):
		return seek(target.global_position, speed)
	var grid := world.room.grid
	if target == world.player:
		grid.update_player_flow(target.global_position)
		var dir := grid.step_direction(grid.player_flow, global_position)
		if dir != Vector2.ZERO:
			return dir * speed
	return seek(target.global_position, speed)


func has_los_to_target() -> bool:
	return target != null and world.room != null and world.room.grid.has_line_of_sight(global_position, target.global_position)


## Disparo enemigo genérico.
func shoot(dir: Vector2, speed: float, opts: Dictionary = {}) -> Projectile:
	var o := opts.duplicate()
	o["source_name"] = display_name
	return world.projectiles.spawn_enemy_shot(global_position + dir.normalized() * (radius + 4.0), dir, speed, o)


func shoot_ring(count: int, speed: float, offset_angle: float = 0.0, opts: Dictionary = {}) -> void:
	for i in count:
		shoot(Vector2.RIGHT.rotated(offset_angle + TAU * float(i) / float(count)), speed, opts)


# ---------------------------------------------------------------------------
# Campeones: modificadores de COMPORTAMIENTO (champions.json)
# ---------------------------------------------------------------------------

func _champion_tick(delta: float) -> void:
	if champion.is_empty():
		return
	var cp: Dictionary = champion.get("params", {})
	match str(champion.get("behavior", "")):
		"fire_trail":
			_champ_t += delta
			if _champ_t >= float(cp.get("interval", 0.5)) and velocity.length() > 15.0:
				_champ_t = 0.0
				world.hazards.add_zone(global_position, float(cp.get("radius", 20.0)), "fire", float(cp.get("ttl", 2.5)))
		"veil":
			var near := target != null and dist_to_target() < float(cp.get("reveal_range", 170.0))
			var goal := 1.0 if (near or _veil_reveal_t > 0.0) else float(cp.get("alpha", 0.12))
			visual_alpha = move_toward(visual_alpha, goal, delta * 3.0)


func _champion_on_damaged(_info: DamageInfo) -> void:
	if champion.is_empty():
		return
	if str(champion.get("behavior", "")) == "retaliate" and _retaliate_cd <= 0.0 and alive:
		var cp: Dictionary = champion.get("params", {})
		_retaliate_cd = float(cp.get("cooldown", 1.2))
		shoot_ring(int(cp.get("count", 4)), float(cp.get("speed", 220.0)), rng.next_float() * TAU)


func _champion_on_death() -> void:
	if champion.is_empty():
		return
	if str(champion.get("behavior", "")) == "split_on_death":
		var cp: Dictionary = champion.get("params", {})
		for i in int(cp.get("count", 2)):
			var off := Vector2.RIGHT.rotated(TAU * i / float(cp.get("count", 2)) + 0.3) * (radius + 8.0)
			world.spawn_enemy(enemy_id, global_position + off, {
				"hp_mult": float(cp.get("hp_mult", 0.45)), "scale": float(cp.get("scale", 0.72)),
				"spawn_time": 0.25, "summon": true, "generation": generation + 1,
			})


# ---------------------------------------------------------------------------
# Dibujo común
# ---------------------------------------------------------------------------

func _draw() -> void:
	var a := visual_alpha
	if spawn_t > 0.0:
		# Telegrafiado de aparición: círculo que se cierra; aún no es peligroso.
		var k := 1.0 - spawn_t / SPAWN_TIME
		draw_arc(Vector2.ZERO, radius * (2.2 - 1.2 * k), 0, TAU, 24, Color(Palette.BLOOD, 0.6), 2.0)
		draw_circle(Vector2.ZERO, radius * k, Color(blood_color(), 0.35 * k))
		return
	draw_circle(Vector2(0, radius * 0.7), radius * 0.9, Color(0, 0, 0, 0.3 * a))
	if not champion.is_empty():
		var cc := Palette.parse(champion.get("color", ""), Color.WHITE)
		draw_circle(Vector2.ZERO, radius + 8.0 + 2.0 * sin(anim_t * 5.0), Color(cc, 0.16 * a))
		draw_arc(Vector2.ZERO, radius + 6.0, 0, TAU, 24, Color(cc, 0.75 * a), 2.0)
	draw_enemy(a)
	if shield_hp > 0.0:
		draw_arc(Vector2.ZERO, radius + 4.0, 0, TAU, 24, Color(Palette.WAX, 0.8 * a), 3.0)
	if flash_t > 0.0 and Settings.flashes:
		draw_circle(Vector2.ZERO, radius, Color(1, 1, 1, 0.55 * a))
	var sts := status.active_ids()
	for i in sts.size():
		var col := Palette.parse(ContentDB.statuses.get(sts[i], {}).get("color", ""), Color.WHITE)
		draw_circle(Vector2(-6.0 * (sts.size() - 1) * 0.5 + i * 6.0, -radius - 8.0), 2.6, col)


## Gancho de dibujo específico. `a` = alfa (velo de campeón).
func draw_enemy(_a: float) -> void:
	draw_circle(Vector2.ZERO, radius, Palette.WAX_DARK)


## Ojos huecos reutilizables que miran al objetivo.
func draw_eyes(center: Vector2, spacing: float, size: float, a: float, col: Color = Color(0.05, 0.02, 0.04)) -> void:
	var look := to_target().normalized() * size * 0.35 if target != null else Vector2.ZERO
	for sx in [-1.0, 1.0]:
		draw_circle(center + Vector2(sx * spacing, 0), size, Color(col, a))
		draw_circle(center + Vector2(sx * spacing, 0) + look, size * 0.38, Color(Palette.FLAME, 0.85 * a))

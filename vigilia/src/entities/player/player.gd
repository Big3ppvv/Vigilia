class_name Player
extends CharacterBody2D
## La Espina. Movimiento con aceleración, esquiva con invulnerabilidad,
## disparo basado en estadísticas, escudos de cera, recursos y objeto activo.
##
## Mecánica propia — LUCIDEZ: si un proyectil enemigo te roza durante la
## esquiva, ganas cargas de crítico garantizado (graze_crits del personaje).
## Debilidad — ASTILLA QUEBRADIZA: caída de daño al final del alcance
## (propiedad de proyectil "falloff" definida en characters.json).

signal died

const ACCEL := 2600.0
const FRICTION := 3000.0
const DODGE_SPEED := 640.0
const DODGE_TIME := 0.17
const DODGE_IFRAMES := 0.26
const HURT_IFRAMES := 1.0
const MAX_WAX := 12
const MAX_COINS := 99

var world: CombatWorld
var character: Dictionary = {}
var display_name := "La Espina"
var stats: StatBlock
var inventory: ItemSystem
var status: StatusComponent
var input: InputSource
var radius := 13.0
var team := Team.PLAYER
var hp := 6
var wax := 0
var coins := 0
var keys := 0
var bombs := 0
var aim_dir := Vector2.RIGHT
var alive := true
var controllable := true
var crit_charges := 0
var god_mode := false
var killed_by := ""
var flying := false

var _fire_cd := 0.0
var _dodge_cd := 0.0
var _dodge_t := 0.0
var _dodge_dir := Vector2.RIGHT
var _dodge_iframes := 0.0
var _hurt_iframes := 0.0
var _regen_acc := 0.0
var _anim_t := 0.0
var _trail: Array = []
var _graze_cd := 0.0
var _body_color := Palette.PLAYER_BODY
var _edge_color := Palette.PLAYER_EDGE
var _eye_color := Palette.PLAYER_EYE


func setup(p_world: CombatWorld, char_def: Dictionary, engine: SynergyEngine) -> void:
	world = p_world
	character = char_def
	display_name = str(char_def.get("name", "La Espina"))
	stats = StatBlock.new(char_def.get("stats", {}))
	stats.context_provider = stat_context
	status = StatusComponent.new(self)
	inventory = ItemSystem.new(self, engine)
	input = HumanInput.new()
	var cols: Dictionary = char_def.get("colors", {})
	_body_color = Palette.parse(cols.get("body", ""), Palette.PLAYER_BODY)
	_edge_color = Palette.parse(cols.get("edge", ""), Palette.PLAYER_EDGE)
	_eye_color = Palette.parse(cols.get("eye", ""), Palette.PLAYER_EYE)
	hp = mini(int(char_def.get("start_hp", 6)), max_hp())
	wax = int(char_def.get("start_wax", 0))
	var res: Dictionary = char_def.get("start_resources", {})
	coins = int(res.get("coins", 0))
	keys = int(res.get("keys", 0))
	bombs = int(res.get("bombs", 0))
	collision_layer = 4
	collision_mask = 1 | 2
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	var cs := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = radius * 0.85
	cs.shape = shape
	add_child(cs)
	add_to_group("player")


## Concede objetos iniciales (tras entrar al árbol: los efectos pueden necesitarlo).
func grant_starting_items() -> void:
	for id in character.get("start_items", []):
		inventory.add_item(str(id))
	var act := str(character.get("start_active", ""))
	if act != "":
		inventory.add_item(act)
		inventory.set_active_charged(bool(character.get("start_active_charged", true)))
	world.run.items_taken.clear()
	_emit_all()


## Contexto para modificadores condicionales/escalables de StatBlock.
func stat_context(key: String) -> float:
	match key:
		"coins":
			return float(coins)
		"keys":
			return float(keys)
		"bombs":
			return float(bombs)
		"hp":
			return float(hp)
		"missing_hp":
			return float(max_hp() - hp)
		"hp_le_1":
			return 1.0 if hp <= 1 else 0.0
		"full_hp":
			return 1.0 if hp >= max_hp() else 0.0
		"items":
			return float(inventory.items.size()) if inventory != null else 0.0
		"moving":
			return 1.0 if velocity.length() > 30.0 else 0.0
	return 0.0


func max_hp() -> int:
	return stats.get_int("max_health") if stats != null else 6


func is_dodging() -> bool:
	return _dodge_iframes > 0.0


func is_invulnerable() -> bool:
	return god_mode or _dodge_iframes > 0.0 or _hurt_iframes > 0.0


func _physics_process(delta: float) -> void:
	var __ptot := Prof.t0()
	_player_body(delta)
	Prof.add("jugador", __ptot)


func _player_body(delta: float) -> void:
	_anim_t += delta
	if not alive:
		velocity = velocity.move_toward(Vector2.ZERO, FRICTION * delta)
		move_and_slide()
		queue_redraw()
		return
	stats.tick(delta)
	status.tick(delta)
	_fire_cd = maxf(0.0, _fire_cd - delta)
	_dodge_cd = maxf(0.0, _dodge_cd - delta)
	_dodge_iframes = maxf(0.0, _dodge_iframes - delta)
	_hurt_iframes = maxf(0.0, _hurt_iframes - delta)
	_graze_cd = maxf(0.0, _graze_cd - delta)
	_regen(delta)
	input.update(self, delta)
	if controllable:
		_movement(delta)
		_actions()
		_shooting()
	else:
		velocity = velocity.move_toward(Vector2.ZERO, FRICTION * delta)
	move_and_slide()
	_update_trail(delta)
	queue_redraw()


func _movement(delta: float) -> void:
	if _dodge_t > 0.0:
		_dodge_t -= delta
		velocity = _dodge_dir * DODGE_SPEED
		return
	var move := input.get_move()
	if move.length() > 1.0:
		move = move.normalized()
	var speed := stats.get_stat("move_speed") * status.speed_mult() * world.terrain_speed_mult(self)
	var target := move * speed
	var rate := ACCEL if move != Vector2.ZERO else FRICTION
	velocity = velocity.move_toward(target, rate * delta)


func _actions() -> void:
	if input.just_pressed("dodge") and _dodge_cd <= 0.0:
		var dir := input.get_move()
		if dir.length() < 0.2:
			dir = aim_dir
		_dodge_dir = dir.normalized()
		_dodge_t = DODGE_TIME
		_dodge_iframes = DODGE_IFRAMES
		_dodge_cd = stats.get_stat("dodge_cooldown")
		Audio.play("dodge")
		world.fx.puff(global_position, _edge_color, 6)
		world.engine.emit("dodge", {"direction": _dodge_dir, "position": global_position, "depth": 0, "tags": PackedStringArray(["dodge"])})
	if input.just_pressed("interact"):
		if world.game != null and world.game.has_method("try_interact"):
			world.game.try_interact(self)
	if input.just_pressed("use_active"):
		inventory.use_active()
	if input.just_pressed("bomb"):
		if bombs > 0:
			bombs -= 1
			world.place_bomb(global_position)
			_emit_resources()
		else:
			Audio.play("deny")


func _shooting() -> void:
	var aim := input.get_aim(self)
	if aim != Vector2.ZERO:
		aim_dir = aim
	if input.is_shooting() and _fire_cd <= 0.0 and _dodge_t <= 0.0:
		_fire(aim_dir)
		_fire_cd += 1.0 / stats.get_stat("fire_rate")


func _fire(dir: Vector2) -> void:
	var count := stats.get_int("projectile_count")
	var spread := deg_to_rad(stats.get_stat("spread"))
	var step := deg_to_rad(9.0)
	var crit_volley := crit_charges > 0
	if crit_volley:
		crit_charges -= 1
	for i in count:
		var off := (float(i) - float(count - 1) * 0.5) * step
		var jitter := world.rng.float_range(-spread, spread) * 0.5
		var d := dir.rotated(off + jitter)
		var p := world.projectiles.spawn()
		if p == null:
			break
		_configure_shot(p, d, crit_volley)
		world.engine.emit("projectile_spawn", {"projectile": p, "tags": p.tags, "depth": 0, "generation": 0, "position": p.pos})
	world.engine.emit("fire", {"direction": dir, "position": global_position, "depth": 0, "tags": PackedStringArray(["fire_event"])})
	Audio.play("shoot", -8.0)


func _configure_shot(p: Projectile, d: Vector2, force_crit: bool) -> void:
	var props := inventory.projectile_props
	p.team = Team.PLAYER
	p.pos = global_position + d * (radius + 4.0)
	p.vel = d * stats.get_stat("shot_speed")
	p.radius = 5.5 * stats.get_stat("shot_size")
	p.damage = stats.get_stat("damage")
	p.crit_chance = stats.get_stat("crit_chance")
	p.crit_mult = stats.get_stat("crit_mult")
	p.force_crit = force_crit
	p.knockback = 150.0 * stats.get_stat("knockback")
	p.range_total = stats.get_stat("range")
	p.range_left = p.range_total
	p.pierce = stats.get_int("pierce")
	p.bounces = stats.get_int("bounces")
	p.homing = stats.get_stat("homing")
	p.spectral = bool(props.get("spectral", false))
	p.bounce_damage_mult = float(props.get("bounce_damage_mult", 1.0))
	p.wave_amp = float(props.get("wave_amp", 0.0))
	p.wave_freq = float(props.get("wave_freq", 0.0))
	p.falloff = float(props.get("falloff", 0.0))
	p.statuses = props.get("statuses", []).duplicate()
	var col := str(props.get("color", ""))
	p.color = Palette.parse(col, Palette.PLAYER_SHOT) if col != "" else Palette.PLAYER_SHOT
	p.tags = PackedStringArray(["projectile", "player_shot"])
	p.kind = "shot"
	p.source_id = get_instance_id()
	p.source_name = display_name


func on_graze(_p: Projectile) -> void:
	if _graze_cd > 0.0:
		return
	_graze_cd = 0.25
	var n := int(character.get("graze_crits", 3))
	crit_charges = mini(crit_charges + n, n * 2)
	world.fx.float_text(global_position + Vector2(0, -30), "¡Lucidez!", _eye_color, 15, 0.9)
	world.fx.ring(global_position, 36.0, _eye_color, 0.3, 2.0)
	Audio.play("graze")


# ---------------------------------------------------------------------------
# Vida, escudos y recursos
# ---------------------------------------------------------------------------

func apply_damage(info: DamageInfo) -> float:
	if not alive:
		return 0.0
	if not Team.can_damage(info.team, team, info.friendly_fire) and not info.is_self:
		return 0.0
	if not info.is_self:
		if god_mode:
			return 0.0
		if is_invulnerable() and not info.ignore_iframes:
			return 0.0
		var ev := stats.get_stat("evasion")
		if ev > 0.0 and world.rng.chance(ev):
			world.fx.float_text(global_position + Vector2(0, -26), "esquivado", Palette.UI_DIM, 13, 0.7)
			_hurt_iframes = 0.25
			return 0.0
	var amount := maxi(1, int(round(info.amount)) if info.is_self else 1)
	if info.has_tag("heavy"):
		amount = 2
	if not info.is_self and wax > 0:
		var absorbed := mini(wax, amount)
		wax -= absorbed
		amount -= absorbed
		world.fx.burst(global_position, Palette.WAX, 10, 160.0, 3.0, 0.4)
	hp -= amount
	world.run.damage_taken += amount
	if info.is_self:
		Audio.play("pact")
		world.fx.burst(global_position, Palette.BLOOD, 8, 120.0, 3.0, 0.4)
	else:
		_hurt_iframes = HURT_IFRAMES
		velocity += info.knockback.limit_length(380.0)
		world.shake(0.45)
		world.hitstop(0.05)
		Audio.play("player_hurt")
		world.fx.burst(global_position, Palette.BLOOD, 12, 200.0, 3.0, 0.5)
		if world.game != null and world.game.has_method("flash_damage"):
			world.game.flash_damage()
	_emit_health()
	if hp <= 0:
		hp = 0
		killed_by = info.source_name if info.source_name != "" else "el Sueño"
		_die()
		return float(amount)
	world.engine.emit("hurt", {"info": info, "amount": amount, "position": global_position, "depth": info.depth + 1, "tags": info.tags, "self": info.is_self})
	return float(amount)


func self_damage(amount: int, depth: int = 1) -> void:
	var info := DamageInfo.create(float(amount), Team.PLAYER, ["self", "blood"])
	info.is_self = true
	info.ignore_iframes = true
	info.depth = depth
	info.source_name = "tu propio pacto"
	apply_damage(info)


func heal(amount: int) -> void:
	if not alive or amount <= 0:
		return
	var before := hp
	hp = mini(max_hp(), hp + amount)
	if hp > before:
		world.fx.float_text(global_position + Vector2(0, -28), "+%d" % (hp - before), Palette.BLOOD.lightened(0.3), 14, 0.8)
	_emit_health()


func add_wax(amount: int) -> void:
	wax = clampi(wax + amount, 0, MAX_WAX)
	_emit_health()


func add_resources(c: int, k: int, b: int) -> void:
	coins = clampi(coins + c, 0, MAX_COINS)
	keys = clampi(keys + k, 0, 99)
	bombs = clampi(bombs + b, 0, 99)
	_emit_resources()


func _regen(delta: float) -> void:
	var r := stats.get_stat("regen")
	if r <= 0.0 or hp >= max_hp():
		_regen_acc = 0.0
		return
	_regen_acc += delta * r / 60.0
	if _regen_acc >= 1.0:
		_regen_acc -= 1.0
		heal(1)


func _die() -> void:
	alive = false
	controllable = false
	world.run.killed_by = killed_by
	Audio.play("death")
	world.fx.burst(global_position, _eye_color, 30, 260.0, 4.0, 1.0)
	world.shake(0.8)
	died.emit()
	EventBus.player_died.emit(killed_by)


func on_inventory_changed() -> void:
	hp = mini(hp, max_hp())
	_emit_all()


func on_stats_changed() -> void:
	hp = mini(hp, max_hp())
	EventBus.player_stats_changed.emit()
	_emit_health()


func _emit_health() -> void:
	EventBus.player_health_changed.emit(hp, max_hp(), wax)


func _emit_resources() -> void:
	EventBus.player_resources_changed.emit(coins, keys, bombs)


func _emit_all() -> void:
	_emit_health()
	_emit_resources()
	EventBus.player_stats_changed.emit()


## Estado mínimo para continuidad entre pisos y para el resumen.
func snapshot() -> Dictionary:
	return {"hp": hp, "wax": wax, "coins": coins, "keys": keys, "bombs": bombs, "items": inventory.items.duplicate(), "active": inventory.active_id}


# ---------------------------------------------------------------------------
# Dibujo
# ---------------------------------------------------------------------------

func _update_trail(delta: float) -> void:
	if _dodge_t > 0.0 and Engine.get_physics_frames() % 2 == 0:
		_trail.append([global_position, 0.25])
	for i in range(_trail.size() - 1, -1, -1):
		_trail[i][1] -= delta
		if _trail[i][1] <= 0.0:
			_trail.remove_at(i)


func _draw() -> void:
	for tr in _trail:
		var lp: Vector2 = tr[0] - global_position
		_draw_body(lp, Color(_edge_color, tr[1] * 2.0), 0.0, true)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	draw_circle(Vector2(0, 12), 15.0, Palette.SHADOW)
	var pulse := 0.5 + 0.5 * sin(_anim_t * 3.0)
	draw_circle(Vector2.ZERO, 40.0 + 4.0 * pulse, Color(_eye_color, 0.06))
	draw_circle(Vector2.ZERO, 26.0, Color(_eye_color, 0.06))
	var alpha := 1.0
	if _hurt_iframes > 0.0 and alive:
		if Settings.flashes:
			alpha = 0.35 if int(_anim_t * 18.0) % 2 == 0 else 1.0
		else:
			alpha = 0.6
	if not alive:
		alpha = 0.5
	_draw_body(Vector2.ZERO, Color(1, 1, 1, alpha), _anim_t, false)
	if wax > 0:
		draw_arc(Vector2.ZERO, radius + 7.0, 0, TAU, 24, Color(Palette.WAX, 0.35 * alpha), 2.0)
	for i in crit_charges:
		var a := _anim_t * 4.0 + i * TAU / maxf(1.0, float(crit_charges))
		draw_circle(Vector2.RIGHT.rotated(a) * (radius + 12.0), 2.5, _eye_color)


func _draw_body(off: Vector2, tint: Color, t: float, ghost: bool) -> void:
	var sway := sin(t * 6.0) * 0.06 if velocity.length() > 20.0 else 0.0
	var pts := PackedVector2Array()
	var big := radius * 1.3
	for i in 8:
		var a := float(i) / 8.0 * TAU + sway - PI * 0.5
		var r := big * (1.6 if i % 2 == 0 else 0.72)
		pts.append(off + Vector2(cos(a), sin(a)) * r)
	if ghost:
		draw_colored_polygon(pts, tint)
		return
	draw_colored_polygon(pts, Color(_body_color, tint.a))
	var closed := pts.duplicate()
	closed.append(pts[0])
	draw_polyline(closed, Color(_edge_color.lightened(0.35), tint.a), 2.5)
	var eye_c := off + Vector2(0, -1)
	draw_circle(eye_c, 8.0, Color(Palette.BONE, tint.a))
	draw_circle(eye_c + aim_dir * 3.0, 4.4, Color(_eye_color, tint.a))
	draw_circle(eye_c + aim_dir * 4.0, 2.0, Color(0, 0, 0, tint.a))

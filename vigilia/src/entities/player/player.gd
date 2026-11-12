class_name Player
extends CharacterBody2D
## La Espina: la última llama de una conciencia que se niega a dormir.
##
## La vida ES la llama: su tamaño, su luz y lo que alcanzas a ver dependen de
## cuánta te queda (CandleLighting lee flame_ratio()). Movimiento con
## aceleración, esquiva con invulnerabilidad, disparo de brasas por estadísticas,
## escudos de cera y un recuerdo activo.
##
## Mecánica propia — LUCIDEZ: si un disparo enemigo te roza durante la esquiva,
## ganas críticos garantizados (graze_crits del personaje).
## Debilidad — LLAMA CORTA: las brasas pierden daño al final de su alcance
## (propiedad de proyectil "falloff" definida en characters.json).

signal died

const ACCEL := 2600.0
const FRICTION := 3000.0
const DODGE_SPEED := 640.0
const DODGE_TIME := 0.17
const DODGE_IFRAMES := 0.26
const HURT_IFRAMES := 1.0
const MAX_WAX := 12
## Tope de críticos garantizados acumulables (Lucidez y efectos de objetos).
const MAX_CRIT_CHARGES := 9
## Fogonazo y retroceso del disparo: SOLO visuales (no alteran la simulación).
const MUZZLE_TIME := 0.07
## La llama "titila" al recibir un golpe: se encoge y palidece un instante.
const GUTTER_TIME := 0.45

static var _emissive: CanvasItemMaterial

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
var aim_dir := Vector2.RIGHT
var alive := true
var controllable := true
var crit_charges := 0
var god_mode := false
var killed_by := ""
var flying := false
## Vela votiva que está encendiendo ahora mismo (solo presentación).
var kindling_target: Node2D = null

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
var _muzzle_t := 0.0
var _gutter_t := 0.0
var _shorten_seq := 0
var _flame_color := Palette.FLAME
var _core_color := Palette.FLAME_CORE
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
	_flame_color = Palette.parse(cols.get("flame", ""), Palette.FLAME)
	_core_color = Palette.parse(cols.get("core", ""), Palette.FLAME_CORE)
	_eye_color = Palette.parse(cols.get("eye", ""), Palette.PLAYER_EYE)
	hp = mini(int(char_def.get("start_hp", 6)), max_hp())
	wax = int(char_def.get("start_wax", 0))
	collision_layer = 4
	collision_mask = 1 | 2
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	var cs := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = radius * 0.85
	cs.shape = shape
	add_child(cs)
	add_to_group("player")
	# La llama es luz: no la oscurece la penumbra.
	if _emissive == null:
		_emissive = CanvasItemMaterial.new()
		_emissive.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
	material = _emissive


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
		"wax":
			return float(wax)
	return 0.0


func max_hp() -> int:
	return stats.get_int("max_health") if stats != null else 6


## Proporción de llama que queda (0 apagada, 1 completa). La usan la luz, el
## audio y el efecto de somnolencia.
func flame_ratio() -> float:
	if not alive:
		return 0.0
	return clampf(float(hp) / float(maxi(1, max_hp())), 0.0, 1.0)


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
	_gutter_t = maxf(0.0, _gutter_t - delta)
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
	_muzzle_t = maxf(0.0, _muzzle_t - delta)
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
		world.fx.burst(global_position, _flame_color, 8, 140.0, 2.5, 0.35)
		world.engine.emit("dodge", {"direction": _dodge_dir, "position": global_position, "depth": 0, "tags": PackedStringArray(["dodge"])})
	if input.just_pressed("interact"):
		if world.game != null and world.game.has_method("try_interact"):
			world.game.try_interact(self)
	if input.just_pressed("use_active"):
		inventory.use_active()


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
	Audio.play("shoot", -9.0)
	_muzzle_t = MUZZLE_TIME


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
	add_crit_charges(n)
	world.fx.float_text(global_position + Vector2(0, -34), "lucidez", _eye_color, 15, 0.9)
	world.hitstop(0.04)
	world.fx.ring(global_position, 36.0, _eye_color, 0.3, 2.0)
	Audio.play("graze")


## Suma críticos garantizados (Lucidez y efectos de objetos) con un tope común.
func add_crit_charges(amount: int) -> void:
	crit_charges = clampi(crit_charges + amount, 0, MAX_CRIT_CHARGES)


# ---------------------------------------------------------------------------
# Llama (vida), cera (escudo)
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
			world.fx.float_text(global_position + Vector2(0, -30), "esquivado", Palette.UI_DIM, 13, 0.7)
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
	if amount > 0:
		_gutter_t = GUTTER_TIME
	if info.is_self:
		Audio.play("pact")
		world.fx.burst(global_position, Palette.BLOOD, 8, 120.0, 3.0, 0.4)
	else:
		_hurt_iframes = HURT_IFRAMES
		velocity += info.knockback.limit_length(380.0)
		world.shake(0.45)
		world.hitstop(0.05)
		Audio.play("player_hurt")
		world.fx.burst(global_position, Color(0.55, 0.6, 0.8), 14, 220.0, 2.5, 0.5)
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
		world.fx.float_text(global_position + Vector2(0, -32), "+%d" % (hp - before), Palette.FLAME_CORE, 14, 0.8)
		world.fx.ring(global_position, 30.0, Palette.FLAME, 0.4, 2.0)
	_emit_health()


func add_wax(amount: int) -> void:
	wax = clampi(wax + amount, 0, MAX_WAX)
	_emit_health()


## Recordar en la Cabecera acorta la llama PARA SIEMPRE (fuente única por pago,
## para que dos pagos del mismo recuerdo no se pisen).
func shorten_flame(amount: int, source: String) -> void:
	if amount <= 0:
		return
	_shorten_seq += 1
	stats.add_modifier("max_health", "flat", -float(amount), "%s#%d" % [source, _shorten_seq])
	_gutter_t = GUTTER_TIME
	world.fx.burst(global_position, _flame_color, 18, 180.0, 3.0, 0.6)
	on_stats_changed()


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
	# La llama no estalla: se apaga y deja humo.
	world.fx.burst(global_position + Vector2(0, -10), Color(0.6, 0.58, 0.66, 0.8), 26, 90.0, 4.0, 1.6)
	world.fx.ring(global_position, 46.0, _flame_color, 0.8, 2.0)
	world.shake(0.5)
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


func _emit_all() -> void:
	_emit_health()
	EventBus.player_stats_changed.emit()


## Estado mínimo para continuidad entre pisos y para el resumen.
func snapshot() -> Dictionary:
	return {"hp": hp, "wax": wax, "items": inventory.items.duplicate(), "active": inventory.active_id}


# ---------------------------------------------------------------------------
# Dibujo: una llama que respira, se inclina al moverse y titila al recibir daño
# ---------------------------------------------------------------------------

func _update_trail(delta: float) -> void:
	if _dodge_t > 0.0 and Engine.get_physics_frames() % 2 == 0:
		_trail.append([global_position, 0.25])
	for i in range(_trail.size() - 1, -1, -1):
		_trail[i][1] -= delta
		if _trail[i][1] <= 0.0:
			_trail.remove_at(i)


func _draw() -> void:
	var ratio := flame_ratio()
	var t := _anim_t
	for tr in _trail:
		var lp: Vector2 = tr[0] - global_position
		_draw_flame(lp, 0.75, Color(_flame_color, float(tr[1]) * 2.2), Color(_core_color, float(tr[1]) * 2.0), 0.0, t)
	if not alive:
		# Mecha humeante.
		draw_line(Vector2(0, 8), Vector2(0, -2), Color(0.12, 0.1, 0.1), 3.0)
		draw_circle(Vector2(0, -4), 2.0, Color(0.9, 0.35, 0.15, 0.6 * absf(sin(t * 3.0))))
		return
	var gutter := _gutter_t / GUTTER_TIME
	var low := 1.0 - smoothstep(0.2, 0.55, ratio)
	# Con poca llama, el fuego se enfría hacia el azul y tiembla más.
	var outer := _flame_color.lerp(Palette.FLAME_BLUE, low * 0.65).lerp(Color(0.85, 0.9, 1.0), gutter * 0.7)
	var core := _core_color.lerp(Color(0.85, 0.95, 1.0), gutter * 0.6)
	var size := lerpf(0.62, 1.12, ratio) * (1.0 - 0.38 * gutter)
	var hurt_alpha := 1.0
	if _hurt_iframes > 0.0 and Settings.flashes:
		hurt_alpha = 0.55 + 0.45 * absf(sin(t * 18.0))
	var pulse := 0.5 + 0.5 * sin(t * 2.4)
	draw_circle(Vector2(0, -6), (40.0 + 6.0 * pulse) * size, Color(outer, 0.05))
	draw_circle(Vector2(0, -8), 24.0 * size, Color(outer, 0.08))
	# La mecha (la espina que sostiene la llama).
	draw_line(Vector2(0, 11), Vector2(0, 2), Color(0.1, 0.07, 0.07), 3.0)
	if wax > 0:
		draw_rect(Rect2(-8, 8, 16, 6), Color(Palette.WAX, 0.9))
		draw_rect(Rect2(-9, 7, 18, 2), Color(Palette.WAX.lightened(0.2), 0.9))
	var recoil: float = _muzzle_t / MUZZLE_TIME
	var lean := clampf(-velocity.x * 0.03, -9.0, 9.0) - aim_dir.x * 2.0 * recoil
	_draw_flame(Vector2(-aim_dir * 2.0 * recoil), size, Color(outer, hurt_alpha), Color(core, hurt_alpha), lean, t, low)
	if recoil > 0.0:
		var muzzle := aim_dir * (radius + 10.0) + Vector2(0, -8)
		draw_circle(muzzle, 6.0 + 5.0 * recoil, Color(outer, 0.25 * recoil))
		draw_circle(muzzle, 2.5 + 3.0 * recoil, Color(core, 0.85 * recoil))
	# Mota de puntería: una chispa que orbita hacia donde miras.
	var mote := aim_dir * (radius + 11.0) + Vector2(0, -8)
	draw_circle(mote, 2.2, Color(core, 0.7))
	for i in crit_charges:
		var a := t * 4.0 + i * TAU / maxf(1.0, float(crit_charges))
		draw_circle(Vector2.RIGHT.rotated(a) * (radius + 14.0) + Vector2(0, -8), 2.5, _eye_color)
	if kindling_target != null and is_instance_valid(kindling_target):
		# Hilo de chispas hacia la vela que se está encendiendo.
		var to := kindling_target.global_position + Vector2(0, -26) - global_position
		for i in 5:
			var k := fmod(t * 1.8 + i * 0.2, 1.0)
			var p := Vector2(0, -12).lerp(to, k) + Vector2(sin(t * 9.0 + i * 1.7), cos(t * 7.0 + i)) * 4.0
			draw_circle(p, 2.0 * (1.0 - k) + 0.6, Color(core, 0.85 * (1.0 - k * 0.6)))


## Lágrima de fuego en tres capas. `lean` inclina la punta (inercia del movimiento).
func _draw_flame(off: Vector2, size: float, outer: Color, core: Color, lean: float, t: float, low: float = 0.0) -> void:
	var flick := 1.0 + (0.06 + 0.1 * low) * sin(t * 13.0) + (0.04 + 0.06 * low) * sin(t * 21.0 + 1.7)
	var h := 30.0 * size * flick
	var w := 11.0 * size
	var base := off + Vector2(0, 2)
	for layer in 3:
		var k: float = [1.0, 0.68, 0.38][layer]
		var col: Color = [outer, outer.lerp(core, 0.55), core][layer]
		var hh := h * k
		var ww := w * k
		var tip := base + Vector2(lean * k + 1.5 * sin(t * 6.0 + layer), -hh * 1.15)
		var pts := PackedVector2Array([
			base + Vector2(-ww, -ww * 0.2),
			base + Vector2(-ww * 0.85, -hh * 0.45),
			base.lerp(tip, 0.72) + Vector2(-ww * 0.38, 0),
			tip,
			base.lerp(tip, 0.72) + Vector2(ww * 0.38, 0),
			base + Vector2(ww * 0.85, -hh * 0.45),
			base + Vector2(ww, -ww * 0.2),
			base + Vector2(ww * 0.55, ww * 0.55),
			base + Vector2(0, ww * 0.75),
			base + Vector2(-ww * 0.55, ww * 0.55),
		])
		draw_colored_polygon(pts, col)

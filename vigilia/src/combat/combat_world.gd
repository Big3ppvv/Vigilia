class_name CombatWorld
extends Node
## Fachada de servicios de combate.
##
## Los sistemas (objetos, enemigos, jefes, peligros) piden efectos al mundo
## ("explota aquí", "aplica veneno a X", "invoca un aliado") sin conocerse entre
## sí. Aquí se centraliza también la emisión de eventos de combate hacia el
## SynergyEngine, lo que garantiza que CUALQUIER fuente de daño participe en las
## sinergias de la misma forma.

signal enemy_registered(e: Enemy)
signal enemy_killed(e: Enemy)
signal boss_killed(e: Enemy)

static var current: CombatWorld = null

var run: RunState
var rng: RngStream
var drop_rng: RngStream
var projectiles: ProjectileSystem
var fx: FxSystem
var hazards: HazardField
var engine: SynergyEngine
var camera: CameraRig
var entity_layer: Node2D
var room: RoomView
var player: Player
var enemies: Array = []
var allies: Array = []
var familiars: Array = []
## Modificadores de mecánicas agregados por ItemSystem (objetos que alteran objetos).
var mechanic_mods := {}
var floor_params := {}
## Nodo Game (hitstop, mapa, pedestales). Tipado débil para evitar dependencias circulares.
var game: Node = null
## Instrumentación (pruebas automáticas y overlay de depuración).
var counters := {"explosions": 0, "reactions": 0, "allies_spawned": 0, "bounces": 0, "kills": 0, "grazes": 0}
var _enemy_seq := 0


func _enter_tree() -> void:
	current = self


func _exit_tree() -> void:
	if current == self:
		current = null


func mech(key: String, default_value: float = 1.0) -> float:
	return float(mechanic_mods.get(key, default_value))


# ---------------------------------------------------------------------------
# Objetivos
# ---------------------------------------------------------------------------

func player_side_targets() -> Array:
	var out: Array = []
	if player != null and player.alive:
		out.append(player)
	for a in allies:
		if is_instance_valid(a) and a.alive:
			out.append(a)
	for f in familiars:
		if is_instance_valid(f):
			out.append(f)
	return out


## Objetivo de un enemigo: el jugador, salvo que un aliado esté claramente más cerca.
func get_enemy_target(e: Node2D) -> Node2D:
	var best: Node2D = null
	var best_d := INF
	if player != null and player.alive:
		best = player
		best_d = e.global_position.distance_to(player.global_position)
	for a in allies:
		if is_instance_valid(a) and a.alive:
			var d := e.global_position.distance_to(a.global_position) * 1.6
			if d < best_d:
				best = a
				best_d = d
	return best


func nearest_hostile(pos: Vector2, team: int, max_dist: float, exclude: Dictionary = {}) -> Node2D:
	var list: Array = enemies if team == Team.PLAYER else player_side_targets()
	var best: Node2D = null
	var bd := max_dist * max_dist
	for t in list:
		if not is_instance_valid(t) or not t.alive:
			continue
		if exclude.has(t.get_instance_id()):
			continue
		if t is Enemy and (t as Enemy).spawn_t > 0.0:
			continue
		var d := pos.distance_squared_to(t.global_position)
		if d < bd:
			bd = d
			best = t
	return best


func live_enemy_count() -> int:
	var n := 0
	for e in enemies:
		if is_instance_valid(e) and e.alive:
			n += 1
	return n


func player_damage() -> float:
	return player.stats.get_stat("damage") if player != null else 3.5


func player_luck() -> float:
	return player.stats.get_stat("luck") if player != null else 0.0


func room_type() -> String:
	return room.data.type if room != null and room.data != null else ""


# ---------------------------------------------------------------------------
# Daño
# ---------------------------------------------------------------------------

func projectile_hit(p: Projectile, target: Node2D) -> void:
	var info := DamageInfo.create(p.damage * p.falloff_mult(), p.team, p.tags)
	info.projectile = p
	info.source_id = p.source_id
	info.source_name = p.source_name
	info.position = p.pos
	info.direction = p.vel.normalized()
	info.knockback = info.direction * p.knockback
	info.depth = p.depth
	info.proc_coef = p.proc_coef
	if p.team == Team.PLAYER:
		DamageSystem.roll_crit(info, p.crit_chance, p.crit_mult, rng, p.force_crit)
	deal_damage(target, info)
	for st in p.statuses:
		apply_status(target, str(st.get("id", "")), int(st.get("stacks", 1)), float(st.get("duration", 2.0)), 1.0, p.depth + 1, p.team)
	fx.puff(p.pos, p.color, 3)


## Punto único de daño. Emite "hit" para el daño del jugador contra enemigos
## (salvo ticks de estados, etiqueta "dot") y registra la Tolerancia del Sueño.
func deal_damage(target: Node2D, info: DamageInfo) -> float:
	if target == null or not is_instance_valid(target) or not target.has_method("apply_damage"):
		return 0.0
	var base_amount := info.amount
	var dealt: float = target.apply_damage(info)
	if dealt > 0.0 and info.team == Team.PLAYER and target is Enemy:
		run.damage_dealt += dealt
		ToleranceSystem.record(run, info.tags, dealt)
		if not info.has_tag("dot"):
			var gen := info.projectile.generation if info.projectile != null else 0
			engine.emit("hit", {
				"target": target, "info": info, "damage": dealt, "base_damage": base_amount,
				"position": target.global_position, "projectile": info.projectile,
				"tags": info.tags, "depth": info.depth, "crit": info.crit, "generation": gen,
				"proc_coef": info.proc_coef, "is_boss": (target as Enemy).is_boss,
			})
	return dealt


func on_projectile_impact(p: Projectile, pos: Vector2) -> void:
	fx.puff(pos, p.color, 4)
	if p.team == Team.PLAYER:
		engine.emit("impact", {"projectile": p, "position": pos, "base_damage": p.damage, "tags": p.tags,
			"depth": p.depth, "generation": p.generation, "proc_coef": p.proc_coef})


func on_projectile_bounce(p: Projectile, pos: Vector2) -> void:
	counters["bounces"] += 1
	fx.ring(pos, 10.0, p.color, 0.15, 2.0)
	engine.emit("bounce", {"projectile": p, "position": pos, "base_damage": p.damage, "tags": p.tags,
		"depth": p.depth, "generation": p.generation, "proc_coef": p.proc_coef})


func on_graze(pl: Player, p: Projectile) -> void:
	counters["grazes"] += 1
	pl.on_graze(p)
	engine.emit("graze", {"position": p.pos, "depth": 0, "tags": PackedStringArray(["graze"])})


## Explosión: daña en área, rompe rocas, revela secretos, detona bombas cercanas
## y emite "explosion". Las explosiones del jugador no le hieren salvo friendly_fire.
func explode(pos: Vector2, radius: float, info: DamageInfo, color: Color = Palette.FLAME, friendly_fire: bool = false) -> void:
	var __pt := Prof.t0()
	if info.team == Team.PLAYER and not friendly_fire:
		radius *= mech("explosion_radius_mult")
		info.amount *= mech("explosion_damage_mult")
	info.friendly_fire = friendly_fire
	info.add_tag("explosion")
	counters["explosions"] += 1
	fx.explosion(pos, radius, color)
	shake(clampf(radius / 240.0, 0.12, 0.55))
	Audio.play("explosion", -6.0 + minf(4.0, radius / 30.0))
	var victims: Array = []
	if info.team == Team.PLAYER:
		victims = enemies.duplicate()
		if friendly_fire:
			victims.append_array(player_side_targets())
	else:
		victims = player_side_targets()
		if friendly_fire:
			victims.append_array(enemies)
	for v in victims:
		if not is_instance_valid(v) or not v.alive:
			continue
		if v.has_method("blocks_projectiles"):
			continue
		if pos.distance_to(v.global_position) > radius + float(v.radius) * 0.7:
			continue
		var di := info.copy()
		di.position = pos
		di.direction = (v.global_position - pos).normalized()
		di.knockback = di.direction * 300.0
		deal_damage(v, di)
	if room != null and room.on_explosion(pos, radius):
		fx.burst(pos, Palette.WAX_DARK, 12, 200.0, 4.0, 0.6)
	for b in get_tree().get_nodes_in_group("bombs"):
		if is_instance_valid(b) and b.global_position.distance_to(pos) < radius and float(b.fuse) > 0.15:
			b.fuse = 0.1
	engine.emit("explosion", {"position": pos, "radius": radius, "info": info, "tags": info.tags, "depth": info.depth})
	Prof.add("explosiones (con cadena)", __pt)


func apply_status(target: Node2D, id: String, stacks: int, duration: float, power: float = 1.0, depth: int = 0, team: int = Team.PLAYER) -> bool:
	if target == null or not is_instance_valid(target) or not bool(target.get("alive")):
		return false
	var st: StatusComponent = target.get("status")
	if st == null:
		return false
	var ok := st.apply(id, stacks, duration, power, depth, team)
	if ok and team == Team.PLAYER and target is Enemy:
		fx.puff(target.global_position, Palette.parse(ContentDB.statuses.get(id, {}).get("color", ""), Color.WHITE), 4)
		engine.emit("status_applied", {"target": target, "status": id, "stacks": stacks, "depth": depth + 1, "tags": PackedStringArray([id])})
	return ok


## Reacción elemental (definida en datos). Daño en área sin etiqueta "explosion".
func on_reaction(target: Node2D, r: Dictionary) -> void:
	counters["reactions"] += 1
	var pos := target.global_position
	var radius := float(r.get("radius", 64.0))
	var power := player.stats.get_stat("status_damage") if player != null else 1.0
	var info := DamageInfo.create(float(r.get("damage", 10.0)) * power, Team.PLAYER, r.get("tags", ["reaction"]))
	info.depth = 2
	info.proc_coef = 0.3
	info.source_name = str(r.get("name", "reacción"))
	var col := Palette.parse(r.get("color", ""), Color.WHITE)
	fx.ring(pos, radius, col, 0.4, 5.0)
	fx.burst(pos, Palette.FROST, 14, 260.0, 3.0, 0.5)
	fx.burst(pos, Palette.FLAME, 10, 220.0, 3.0, 0.5)
	fx.float_text(pos + Vector2(0, -34), str(r.get("name", "")), Color.WHITE, 16)
	Audio.play("shock")
	shake(0.25)
	for e in enemies.duplicate():
		if is_instance_valid(e) and e.alive and pos.distance_to(e.global_position) <= radius + float(e.radius):
			deal_damage(e, info.copy())
	engine.emit("reaction", {"target": target, "reaction": str(r.get("id", "")), "position": pos, "tags": info.tags, "depth": 2})


func on_enemy_killed(e: Enemy, info: DamageInfo, statuses: PackedStringArray) -> void:
	enemies.erase(e)
	run.kills += 1
	counters["kills"] += 1
	SaveManager.mark_discovered("enemies", e.enemy_id)
	var pos := e.global_position
	fx.burst(pos, e.blood_color(), 16, 240.0, 4.0, 0.6)
	fx.decal(pos, e.radius * 0.75, Color(e.blood_color(), 0.16))
	Audio.play("enemy_die")
	shake(0.9 if e.is_boss else 0.12)
	if not e.is_boss and not e.is_summon:
		_roll_drop(e)
	var by_player := info != null and info.team == Team.PLAYER
	if by_player:
		# REGLA: las muertes NO se atenúan por proc_coef. Son eventos discretos (uno
		# por enemigo) y no pueden encadenarse sin límite; atenuarlas impediría que
		# una muerte por veneno (tick con proc_coef 0) active efectos "al matar".
		engine.emit("kill", {
			"target": e, "info": info, "position": pos, "target_statuses": statuses,
			"tags": info.tags, "depth": info.depth, "is_boss": e.is_boss, "enemy_id": e.enemy_id,
			"proc_coef": 1.0,
		})
	enemy_killed.emit(e)
	if e.is_boss:
		boss_killed.emit(e)


func _roll_drop(e: Enemy) -> void:
	var table := "champion_drop" if e.champion_id != "" else "enemy_drop"
	var t: Dictionary = ContentDB.loot.get(table, {})
	var chance := float(t.get("chance", 0.0)) + float(t.get("luck_bonus", 0.0)) * player_luck()
	chance = maxf(chance, float(e.drop_chance))
	if drop_rng.chance(chance):
		var pick: Variant = drop_rng.pick_weighted(t.get("table", []), "weight")
		if pick != null:
			spawn_pickup(str(pick["kind"]), e.global_position, drop_rng.unit_vector() * 120.0)


# ---------------------------------------------------------------------------
# Creación de entidades
# ---------------------------------------------------------------------------

func spawn_enemy(id: String, pos: Vector2, opts: Dictionary = {}) -> Enemy:
	var def := ContentDB.get_enemy(id)
	if def.is_empty() or room == null:
		return null
	var script: Script = load(str(def["script"]))
	if script == null:
		push_error("CombatWorld: script de enemigo inválido para '%s'" % id)
		return null
	var e: Enemy = script.new()
	_enemy_seq += 1
	var stream := RngStream.derived(run.seed_int, "ai:f%d:%d,%d:%d" % [run.floor_index, room.data.coord.x, room.data.coord.y, _enemy_seq])
	var o := opts.duplicate()
	o["hp_mult"] = float(o.get("hp_mult", 1.0)) * float(floor_params.get("enemy_hp_mult", 1.0))
	o["speed_mult"] = float(o.get("speed_mult", 1.0)) * float(floor_params.get("enemy_speed_mult", 1.0))
	o["overrides"] = floor_params.get("enemy_overrides", {}).get(id, {})
	e.position = pos
	e.setup(def, self, stream, o)
	e.tolerance = run.tolerance.duplicate()
	e.allergies = run.allergies.duplicate()
	entity_layer.add_child(e)
	enemies.append(e)
	enemy_registered.emit(e)
	return e


func spawn_ally(kind: String, pos: Vector2, duration: float) -> Node2D:
	counters["allies_spawned"] += 1
	var a := AllyHusk.new()
	a.position = pos
	a.setup(self, kind, duration * mech("ally_duration_mult"))
	entity_layer.add_child(a)
	allies.append(a)
	return a


func ally_count() -> int:
	var n := 0
	for a in allies:
		if is_instance_valid(a) and a.alive:
			n += 1
	return n


func spawn_familiar(kind: String, index: int, total: int) -> Node2D:
	var f := FamiliarMoth.new()
	f.setup(self, kind, index, total)
	if player != null:
		f.position = player.global_position
	entity_layer.add_child(f)
	familiars.append(f)
	return f


func spawn_pickup(kind: String, pos: Vector2, vel: Vector2 = Vector2.ZERO) -> void:
	if kind == "coin3":
		for i in 3:
			spawn_pickup("coin", pos, Vector2.RIGHT.rotated(i * TAU / 3.0 + 0.4) * 140.0)
		return
	var pk := Pickup.new()
	pk.position = pos
	pk.setup(self, kind, vel)
	entity_layer.add_child(pk)


func place_bomb(pos: Vector2) -> void:
	var b := Bomb.new()
	b.position = pos
	b.world = self
	entity_layer.add_child(b)


func terrain_speed_mult(ent: Node2D) -> float:
	if bool(ent.get("flying")):
		return 1.0
	var p := ent.global_position
	if (room != null and room.grid.is_wax_at(p)) or (hazards != null and hazards.wax_at(p)):
		return 0.72 if ent is Player else 0.62
	return 1.0


func shake(amount: float) -> void:
	if camera != null:
		camera.add_trauma(amount)


func hitstop(duration: float) -> void:
	if game != null and game.has_method("hitstop"):
		game.hitstop(duration)


func toast(text: String, color: Color = Palette.UI_TEXT) -> void:
	EventBus.toast.emit(text, color)


func reveal_map(secrets: bool) -> void:
	if game != null and game.has_method("reveal_map"):
		game.reveal_map(secrets)

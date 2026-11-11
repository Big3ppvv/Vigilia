class_name EffectActions
extends RefCounted
## Implementación del vocabulario de acciones (ver EffectVocab.ACTIONS).
## Cada acción recibe (params, ctx, inst, engine). `inst["stacks"]` permite que
## varias copias de un objeto potencien su efecto sin duplicar instancias.
## Toda acción que crea daño o proyectiles incrementa la profundidad (depth + 1).


static func execute(action_name: String, params: Dictionary, ctx: Dictionary, inst: Dictionary, engine: SynergyEngine) -> void:
	var w := engine.world
	if w == null:
		return
	match action_name:
		"explode":
			act_explode(params, ctx, inst, w)
		"split":
			act_split(params, ctx, inst, w)
		"apply_status":
			act_apply_status(params, ctx, inst, w)
		"spawn_projectiles":
			act_spawn_projectiles(params, ctx, inst, w)
		"temp_stat":
			act_temp_stat(params, ctx, inst, w)
		"permanent_stat":
			act_permanent_stat(params, ctx, inst, w)
		"heal":
			act_heal(params, ctx, inst, w)
		"add_wax":
			act_add_wax(params, ctx, inst, w)
		"add_resource":
			act_add_resource(params, ctx, inst, w)
		"spawn_ally":
			act_spawn_ally(params, ctx, inst, w)
		"self_damage":
			act_self_damage(params, ctx, inst, w)
		"empower_projectile":
			act_empower_projectile(params, ctx, inst, w)
		"charge_active":
			act_charge_active(params, ctx, inst, w)
		"damage_all":
			act_damage_all(params, ctx, inst, w)
		"stun_all":
			act_stun_all(params, ctx, inst, w)
		"clear_enemy_projectiles":
			act_clear_enemy_projectiles(params, ctx, inst, w)
		"reveal_map":
			act_reveal_map(params, ctx, inst, w)
		"floor_modifier":
			act_floor_modifier(params, ctx, inst, w)
		"message":
			act_message(params, ctx, inst, w)
		"chain":
			act_chain(params, ctx, inst, w)
		"crit_charges":
			act_crit_charges(params, ctx, inst, w)
		_:
			push_warning("EffectActions: acción desconocida '%s'" % action_name)


static func _depth(ctx: Dictionary) -> int:
	return int(ctx.get("depth", 0)) + 1


static func act_explode(params: Dictionary, ctx: Dictionary, inst: Dictionary, w: CombatWorld) -> void:
	var pos: Vector2 = ctx.get("position", w.player.global_position if w.player != null else Vector2.ZERO)
	var amount := w.player_damage()
	if str(params.get("base", "player")) == "source":
		amount = float(ctx.get("base_damage", amount))
	amount *= float(params.get("damage_mult", 1.0))
	var radius := float(params.get("radius", 48.0)) * (1.0 + 0.25 * (int(inst["stacks"]) - 1))
	var info := DamageInfo.create(amount, Team.PLAYER, params.get("tags", ["explosion"]))
	info.depth = _depth(ctx)
	info.proc_coef = float(ctx.get("proc_coef", 1.0)) * 0.6
	info.source_name = "explosión"
	w.explode(pos, radius, info, Palette.parse(params.get("color", ""), Palette.FLAME), bool(params.get("friendly_fire", false)))


static func act_split(params: Dictionary, ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	var p: Projectile = ctx.get("projectile")
	if p == null:
		return
	var count := int(params.get("count", 3)) + int(w.mech("split_count_add", 0.0))
	var spread := deg_to_rad(float(params.get("spread_deg", 90.0)))
	var base_dir := p.vel.normalized() if p.vel.length() > 0.01 else Vector2.RIGHT
	var origin: Vector2 = ctx.get("position", p.pos)
	var target: Variant = ctx.get("target")
	for i in count:
		var k := 0.0 if count == 1 else float(i) / float(count - 1) - 0.5
		var dir := base_dir.rotated(k * spread)
		var f := w.projectiles.spawn()
		if f == null:
			return
		f.team = p.team
		f.pos = origin + dir * (p.radius + 4.0)
		f.vel = dir * p.vel.length() * float(params.get("speed_mult", 1.0))
		f.radius = maxf(2.5, p.radius * float(params.get("size_mult", 0.7)))
		f.damage = p.damage * float(params.get("damage_mult", 0.5))
		f.crit_chance = p.crit_chance
		f.crit_mult = p.crit_mult
		f.knockback = p.knockback * 0.5
		f.range_total = p.range_total * 0.5
		f.range_left = f.range_total
		f.homing = p.homing
		f.spectral = p.spectral
		f.statuses = p.statuses.duplicate()
		f.color = p.color
		f.kind = "fragment"
		f.tags = PackedStringArray(["projectile", "fragment"])
		f.generation = p.generation + 1
		f.depth = _depth(ctx)
		f.proc_coef = p.proc_coef * 0.7
		f.source_id = p.source_id
		f.source_name = p.source_name
		if target != null and is_instance_valid(target):
			f.hit_ids[(target as Node).get_instance_id()] = true


static func act_apply_status(params: Dictionary, ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	var target: Variant = ctx.get("target")
	if target == null or not is_instance_valid(target):
		return
	var stacks := int(params.get("stacks", 1)) + int(w.mech("status_stacks_add", 0.0))
	var dur := float(params.get("duration", 3.0))
	var power := 1.0
	if w.player != null:
		dur *= w.player.stats.get_stat("status_duration")
		power = w.player.stats.get_stat("status_damage")
	w.apply_status(target, str(params.get("status", "")), stacks, dur, power, _depth(ctx), Team.PLAYER)


static func act_spawn_projectiles(params: Dictionary, ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	var pl := w.player
	if pl == null:
		return
	var origin: Vector2 = pl.global_position
	if str(params.get("origin", "player")) == "event":
		origin = ctx.get("position", origin)
	var count := maxi(1, int(params.get("count", 6)))
	var pattern := str(params.get("pattern", "ring"))
	var base_angle := pl.aim_dir.angle()
	var spread := deg_to_rad(float(params.get("spread_deg", 40.0)))
	if pattern == "ring":
		base_angle = w.rng.next_float() * TAU
	elif pattern == "aimed":
		var tgt := w.nearest_hostile(origin, Team.PLAYER, 900.0)
		if tgt != null:
			base_angle = (tgt.global_position - origin).angle()
	var tags: Array = params.get("tags", ["projectile"])
	for i in count:
		var a := base_angle
		if pattern == "ring":
			a += TAU * float(i) / float(count)
		elif count > 1:
			a += (float(i) / float(count - 1) - 0.5) * spread
		var dir := Vector2.RIGHT.rotated(a)
		var p := w.projectiles.spawn()
		if p == null:
			return
		p.team = Team.PLAYER
		p.pos = origin + dir * (pl.radius + 6.0)
		p.vel = dir * pl.stats.get_stat("shot_speed") * float(params.get("speed_mult", 1.0))
		p.radius = 5.5 * pl.stats.get_stat("shot_size") * float(params.get("size_mult", 1.0))
		p.damage = pl.stats.get_stat("damage") * float(params.get("damage_mult", 1.0))
		p.crit_chance = pl.stats.get_stat("crit_chance")
		p.crit_mult = pl.stats.get_stat("crit_mult")
		p.knockback = 120.0
		p.range_total = pl.stats.get_stat("range") * float(params.get("range_mult", 1.0))
		p.range_left = p.range_total
		p.homing = pl.stats.get_stat("homing")
		p.bounces = pl.stats.get_int("bounces")
		p.bounce_damage_mult = float(pl.inventory.projectile_props.get("bounce_damage_mult", 1.0))
		p.pierce = int(params.get("pierce", 0))
		p.statuses = params.get("statuses", []).duplicate()
		p.color = Palette.parse(params.get("color", ""), Palette.PLAYER_SHOT)
		p.kind = "ring"
		p.tags = PackedStringArray(tags)
		p.depth = _depth(ctx)
		p.proc_coef = 0.8
		p.source_id = pl.get_instance_id()
		p.source_name = pl.display_name


static func act_temp_stat(params: Dictionary, _ctx: Dictionary, inst: Dictionary, w: CombatWorld) -> void:
	if w.player == null:
		return
	var key := str(params.get("key", inst["source"]))
	var source := "temp:" + key
	var dur := float(params.get("duration", 3.0))
	var max_stacks := int(params.get("max_stacks", 1))
	var stats := w.player.stats
	if stats.count_modifiers_from(source) >= max_stacks:
		stats.refresh_duration(source, dur)
	else:
		stats.add_modifier(str(params.get("stat", "")), str(params.get("op", "pct")), float(params.get("value", 0.0)), source, {"duration": dur})
	w.player.on_stats_changed()


static func act_permanent_stat(params: Dictionary, _ctx: Dictionary, inst: Dictionary, w: CombatWorld) -> void:
	if w.player == null:
		return
	w.player.stats.add_modifier(str(params.get("stat", "")), str(params.get("op", "flat")), float(params.get("value", 0.0)), "perm:" + str(inst["source"]))
	w.player.on_stats_changed()


static func act_heal(params: Dictionary, _ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	if w.player != null:
		w.player.heal(int(params.get("amount", 1)))


static func act_add_wax(params: Dictionary, _ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	if w.player != null:
		w.player.add_wax(int(params.get("amount", 1)))


static func act_add_resource(params: Dictionary, _ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	if w.player == null:
		return
	w.player.add_resources(int(params.get("coins", 0)), int(params.get("keys", 0)), int(params.get("bombs", 0)))


static func act_spawn_ally(params: Dictionary, ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	var cap := int(params.get("max", 4)) + int(w.mech("ally_cap_add", 0.0))
	var pos: Vector2 = ctx.get("position", w.player.global_position if w.player != null else Vector2.ZERO)
	for i in maxi(1, int(params.get("count", 1))):
		if w.ally_count() >= cap:
			return
		w.spawn_ally(str(params.get("kind", "husk")), pos + Vector2(i * 10.0, 0), float(params.get("duration", 12.0)))


static func act_self_damage(params: Dictionary, ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	if w.player != null:
		w.player.self_damage(int(params.get("amount", 1)), _depth(ctx))


static func act_empower_projectile(params: Dictionary, ctx: Dictionary, _inst: Dictionary, _w: CombatWorld) -> void:
	var p: Projectile = ctx.get("projectile")
	if p == null:
		return
	p.damage *= float(params.get("damage_mult", 1.0))
	p.radius *= float(params.get("size_mult", 1.0))
	p.pierce += int(params.get("pierce_add", 0))
	p.vel *= float(params.get("speed_mult", 1.0))
	p.knockback *= float(params.get("knockback_mult", 1.0))
	if params.has("color"):
		p.color = Palette.parse(params["color"], p.color)
	for t in params.get("tags_add", []):
		if not p.tags.has(t):
			p.tags.append(t)
	if p.tags.has("blood"):
		p.kind = "blood"


static func act_charge_active(params: Dictionary, _ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	if w.player != null:
		w.player.inventory.add_charge(int(params.get("amount", 1)))


static func act_damage_all(params: Dictionary, ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	var amount := float(params.get("amount", 0.0))
	if params.has("damage_mult"):
		amount = w.player_damage() * float(params["damage_mult"])
	for e in w.enemies.duplicate():
		if is_instance_valid(e) and e.alive:
			var info := DamageInfo.create(amount, Team.PLAYER, params.get("tags", []))
			info.depth = _depth(ctx)
			info.proc_coef = 0.5
			info.source_name = "onda"
			w.deal_damage(e, info)
	w.fx.ring(w.player.global_position if w.player != null else Vector2(480, 288), 520.0, Palette.GOLD, 0.6, 6.0)


static func act_stun_all(params: Dictionary, ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	var dur := float(params.get("duration", 1.5))
	for e in w.enemies.duplicate():
		if is_instance_valid(e) and e.alive:
			w.apply_status(e, "stun", 1, dur * (0.4 if e.is_boss else 1.0), 1.0, _depth(ctx), Team.PLAYER)
	Audio.play("bell")


static func act_clear_enemy_projectiles(_params: Dictionary, _ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	w.projectiles.clear_team(Team.ENEMY, true)


static func act_reveal_map(params: Dictionary, _ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	w.reveal_map(bool(params.get("secrets", false)))


static func act_floor_modifier(params: Dictionary, _ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	w.run.add_floor_modifier(str(params.get("key", "")), params.get("value", 1))


static func act_message(params: Dictionary, _ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	w.toast(str(params.get("text", "")), Palette.parse(params.get("color", ""), Palette.UI_TEXT))


## Rayo encadenado: salta entre enemigos cercanos al objetivo del evento.
static func act_chain(params: Dictionary, ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	var from: Variant = ctx.get("target")
	if from == null or not is_instance_valid(from):
		return
	var hit := {(from as Node).get_instance_id(): true}
	var cur: Node2D = from
	var amount := float(ctx.get("base_damage", w.player_damage())) * float(params.get("damage_mult", 0.5))
	for j in int(params.get("jumps", 2)):
		var nxt := w.nearest_hostile(cur.global_position, Team.PLAYER, float(params.get("range", 160.0)), hit)
		if nxt == null:
			return
		hit[nxt.get_instance_id()] = true
		w.fx.beam(cur.global_position, nxt.global_position, Palette.parse(params.get("color", ""), Palette.FROST), 3.0)
		var info := DamageInfo.create(amount, Team.PLAYER, params.get("tags", ["chain"]))
		info.depth = _depth(ctx)
		info.proc_coef = 0.4
		w.deal_damage(nxt, info)
		cur = nxt


static func act_crit_charges(params: Dictionary, _ctx: Dictionary, _inst: Dictionary, w: CombatWorld) -> void:
	if w.player != null:
		w.player.crit_charges += int(params.get("amount", 1))

class_name AllyHusk
extends Node2D
## ÁNIMA — enemigo caído que se alza como aliado (Comunión Rancia).
## Persigue al enemigo más cercano y daña por contacto; atrae parte de la
## agresión enemiga (CombatWorld.get_enemy_target). Vida limitada en el tiempo.

var world: CombatWorld
var kind := "husk"
var alive := true
var radius := 12.0
var hp := 16.0
var life := 14.0
var max_life := 14.0
var team := Team.PLAYER
var status: StatusComponent
var speed := 210.0
var vel := Vector2.ZERO
var _hit_cd := 0.0
var _t := 0.0


func setup(w: CombatWorld, k: String, duration: float) -> void:
	world = w
	kind = k
	life = duration
	max_life = duration
	status = StatusComponent.new(self)
	add_to_group("allies")


func _physics_process(delta: float) -> void:
	if not alive:
		return
	_t += delta
	life -= delta
	_hit_cd -= delta
	if life <= 0.0:
		_expire()
		return
	var target := world.nearest_hostile(global_position, Team.PLAYER, 900.0)
	var desired := Vector2.ZERO
	if target != null:
		desired = (target.global_position - global_position).normalized() * speed
	elif world.player != null and global_position.distance_to(world.player.global_position) > 70.0:
		desired = (world.player.global_position - global_position).normalized() * speed * 0.7
	vel = vel.move_toward(desired, 900.0 * delta)
	position = (position + vel * delta).clamp(Vector2(14, 14), Vector2(946, 562))
	if target != null and _hit_cd <= 0.0 and global_position.distance_to(target.global_position) < radius + float(target.radius):
		var power := world.player.stats.get_stat("summon_power") if world.player != null else 1.0
		var info := DamageInfo.create((3.0 + world.player_damage() * 0.6) * power, Team.PLAYER, ["summon", "contact"])
		info.depth = 1
		info.proc_coef = 0.5
		info.source_name = "Ánima"
		info.direction = (target.global_position - global_position).normalized()
		info.knockback = info.direction * 120.0
		world.deal_damage(target, info)
		_hit_cd = 0.45
		vel = -vel * 0.5
	queue_redraw()


func apply_damage(info: DamageInfo) -> float:
	if not alive or not Team.can_damage(info.team, team, info.friendly_fire):
		return 0.0
	var amount := info.amount * (4.0 if info.team == Team.ENEMY else 1.0)
	hp -= amount
	world.fx.puff(global_position, Palette.ALLY, 4)
	if hp <= 0.0:
		_expire()
	return amount


func _expire() -> void:
	if not alive:
		return
	alive = false
	world.allies.erase(self)
	world.fx.burst(global_position, Palette.ALLY, 12, 140.0, 3.0, 0.5)
	queue_free()


func _draw() -> void:
	var a := 0.75
	if life < 2.0:
		a *= 0.4 + 0.6 * absf(sin(_t * 12.0))
	var pts := PackedVector2Array()
	for i in 13:
		var ang := PI + float(i) / 12.0 * PI
		pts.append(Vector2(cos(ang), sin(ang)) * radius)
	for i in 5:
		var x := radius - i * radius * 0.5
		pts.append(Vector2(x, radius * 0.9 + 3.0 * sin(_t * 8.0 + i)))
	draw_colored_polygon(pts, Color(Palette.ALLY, 0.45 * a))
	draw_circle(Vector2(-4, -3), 2.5, Color(0, 0, 0, a))
	draw_circle(Vector2(4, -3), 2.5, Color(0, 0, 0, a))
	draw_arc(Vector2.ZERO, radius + 2.0, 0, TAU, 16, Color(Palette.ALLY, 0.5 * a), 1.5)

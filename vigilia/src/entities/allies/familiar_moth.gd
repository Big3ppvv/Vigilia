class_name FamiliarMoth
extends Node2D
## POLILLA LUNAR — familiar de la transformación "Enjambre".
## Orbita al jugador, BLOQUEA proyectiles enemigos (invulnerable) y daña por contacto.

var world: CombatWorld
var kind := "moth"
var index := 0
var total := 1
var radius := 10.0
var alive := true
var team := Team.PLAYER
var _t := 0.0
var _hit_cd := 0.0


func setup(w: CombatWorld, k: String, i: int, n: int) -> void:
	world = w
	kind = k
	index = i
	total = maxi(1, n)
	add_to_group("familiars")


func blocks_projectiles() -> bool:
	return true


func apply_damage(_info: DamageInfo) -> float:
	return 0.0


func _physics_process(delta: float) -> void:
	_t += delta
	_hit_cd -= delta
	if world == null or world.player == null:
		return
	var a := _t * 2.4 + TAU * float(index) / float(total)
	var goal := world.player.global_position + Vector2(cos(a), sin(a)) * 46.0
	global_position = global_position.lerp(goal, clampf(delta * 12.0, 0.0, 1.0))
	if _hit_cd <= 0.0:
		for e in world.enemies:
			if is_instance_valid(e) and e.alive and e.spawn_t <= 0.0 and global_position.distance_to(e.global_position) < radius + float(e.radius):
				var info := DamageInfo.create(1.5 + world.player_damage() * 0.3, Team.PLAYER, ["summon", "contact", "moth"])
				info.depth = 1
				info.proc_coef = 0.4
				info.source_name = "Polilla lunar"
				world.deal_damage(e, info)
				_hit_cd = 0.3
				break
	queue_redraw()


func _draw() -> void:
	var flap := absf(sin(_t * 18.0))
	for sy in [-1.0, 1.0]:
		draw_circle(Vector2(0, sy * (4.0 + 4.0 * flap)), 6.0 + 2.0 * flap, Color(Palette.ALLY, 0.55))
	draw_circle(Vector2.ZERO, 4.0, Color(Palette.FLAME_CORE, 0.9))
	draw_circle(Vector2.ZERO, 14.0, Color(Palette.ALLY, 0.08))

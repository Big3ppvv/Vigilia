class_name Bomb
extends Node2D
## Bomba de sebo: explota tras la mecha (daña también al jugador), rompe rocas,
## revela muros agrietados y detona otras bombas. Se puede empujar caminando.
## Al ser una explosión, participa en las sinergias como cualquier otra.

const RADIUS := 95.0

var world: CombatWorld
var fuse := 1.6
var vel := Vector2.ZERO
var _t := 0.0


func _ready() -> void:
	add_to_group("bombs")
	Audio.play("pickup", -8.0, 0.6)


func _physics_process(delta: float) -> void:
	_t += delta
	fuse -= delta
	position = (position + vel * delta).clamp(Vector2(16, 16), Vector2(944, 560))
	vel = vel.move_toward(Vector2.ZERO, 420.0 * delta)
	if world.player != null and _t > 0.3 and global_position.distance_to(world.player.global_position) < 22.0:
		vel = (global_position - world.player.global_position).normalized() * 220.0
	if fuse <= 0.0:
		var info := DamageInfo.create(30.0 + world.player_damage() * 2.0, Team.PLAYER, ["explosion", "bomb"])
		info.source_name = "tu propia bomba"
		world.explode(global_position, RADIUS, info, Palette.FLAME, true)
		queue_free()
		return
	queue_redraw()


func _draw() -> void:
	draw_circle(Vector2(0, 10), 12.0, Palette.SHADOW)
	GlyphPainter.draw_glyph(self, "bomb", Vector2.ZERO, 16.0, Palette.BONE, Palette.WALL_TOP, _t)
	if fuse < 0.7 and int(_t * 14.0) % 2 == 0:
		draw_circle(Vector2(0, 2), 11.0, Color(1, 0.2, 0.1, 0.5))
	draw_arc(Vector2.ZERO, RADIUS, 0, TAU, 32, Color(Palette.BLOOD, 0.12 + 0.1 * (1.0 - clampf(fuse / 1.6, 0.0, 1.0))), 1.5)

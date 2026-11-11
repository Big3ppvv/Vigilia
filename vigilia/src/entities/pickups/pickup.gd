class_name Pickup
extends Node2D
## Consumible del suelo: óbolo, cuenta de vida, cera, llave o bomba.
## Imán corto; las cuentas de vida y la cera no se recogen si no se necesitan
## (quedan en la sala para volver a por ellas: el estado de la sala persiste).

const MAGNET := 70.0
const SETTLE := 0.3

var world: CombatWorld
var kind := "coin"
var vel := Vector2.ZERO
var radius := 9.0
var _t := 0.0


func setup(w: CombatWorld, k: String, v: Vector2) -> void:
	world = w
	kind = k
	vel = v
	add_to_group("pickups")


func _physics_process(delta: float) -> void:
	_t += delta
	position += vel * delta
	vel = vel.move_toward(Vector2.ZERO, 500.0 * delta)
	position = position.clamp(Vector2(20, 20), Vector2(940, 556))
	# Los consumibles no colisionan con obstáculos: si quedan sobre una roca o
	# un pilar, se recolocan en la casilla transitable más cercana (nunca quedan
	# inalcanzables).
	if vel.length() < 5.0 and world.room != null:
		var grid := world.room.grid
		if not grid.is_walkable(RoomGrid.world_to_tile(position)):
			position = grid.nearest_walkable_pos(position)
	var pl := world.player
	if pl != null and pl.alive and _t > SETTLE and _wanted(pl):
		var d := global_position.distance_to(pl.global_position)
		if d < MAGNET:
			position += (pl.global_position - global_position).normalized() * 260.0 * delta
		if d < pl.radius + radius + 2.0:
			_collect(pl)
			return
	queue_redraw()


func _wanted(pl: Player) -> bool:
	match kind:
		"heart":
			return pl.hp < pl.max_hp()
		"wax":
			return pl.wax < Player.MAX_WAX
	return true


func _collect(pl: Player) -> void:
	match kind:
		"coin":
			pl.add_resources(1, 0, 0)
			Audio.play("coin", -4.0)
		"key":
			pl.add_resources(0, 1, 0)
			Audio.play("pickup")
		"bomb":
			pl.add_resources(0, 0, 1)
			Audio.play("pickup")
		"heart":
			pl.heal(1)
			Audio.play("heart")
		"wax":
			pl.add_wax(1)
			Audio.play("pickup", 0.0, 0.8)
	world.fx.puff(global_position, Palette.FLAME_CORE, 5)
	world.engine.emit("pickup", {"kind": kind, "depth": 0, "tags": PackedStringArray(["pickup", kind]), "position": global_position})
	queue_free()


func _draw() -> void:
	var bob := sin(_t * 4.0) * 2.5
	draw_circle(Vector2(0, 9), 8.0, Palette.SHADOW)
	var glyph := {"coin": "coin_small", "heart": "heart", "wax": "wax", "key": "key", "bomb": "bomb"}.get(kind, "coin_small") as String
	GlyphPainter.draw_glyph(self, glyph, Vector2(0, bob - 2.0), 10.0, Palette.BONE, Palette.WALL_TOP, _t)

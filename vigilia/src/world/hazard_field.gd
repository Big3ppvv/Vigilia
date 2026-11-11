class_name HazardField
extends Node2D
## Zonas de peligro temporales en el suelo:
##   "fire": quema al jugador al pisarla (1 de daño, respeta invulnerabilidad).
##   "wax":  charco de cera; ralentiza a jugador y enemigos terrestres.
## Las crean campeones Ardientes, el jefe (transformación de arena) y objetos.

var world: CombatWorld
## [pos, radius, kind, ttl, max_ttl]
var zones: Array = []
var _t := 0.0


func _ready() -> void:
	z_index = -7


func add_zone(pos: Vector2, radius: float, kind: String, ttl: float) -> void:
	if zones.size() > 160:
		zones.pop_front()
	zones.append([pos, radius, kind, ttl, ttl])


func clear() -> void:
	zones.clear()
	queue_redraw()


func wax_at(p: Vector2) -> bool:
	for z in zones:
		if z[2] == "wax" and p.distance_to(z[0]) <= z[1]:
			return true
	return false


func _physics_process(delta: float) -> void:
	_t += delta
	var i := 0
	while i < zones.size():
		var z: Array = zones[i]
		if z[3] > 0.0:
			z[3] -= delta
			if z[3] <= 0.0:
				zones.remove_at(i)
				continue
		i += 1
	if world == null or world.player == null or not world.player.alive:
		return
	var pl := world.player
	for z in zones:
		if z[2] == "fire" and pl.global_position.distance_to(z[0]) <= z[1] + pl.radius * 0.6:
			var info := DamageInfo.create(1.0, Team.NEUTRAL, ["fire", "hazard"])
			info.source_name = "fuego"
			pl.apply_damage(info)
			break
	queue_redraw()


func _draw() -> void:
	for z in zones:
		var k: float = 1.0 if z[4] <= 0.0 else clampf(z[3] / z[4] * 3.0, 0.0, 1.0)
		var pos: Vector2 = z[0]
		var r: float = z[1]
		if z[2] == "fire":
			draw_circle(pos, r * 1.25, Color(Palette.FLAME, 0.10 * k))
			draw_circle(pos, r, Color(Palette.BLOOD, 0.35 * k))
			for j in 3:
				var a := _t * 3.0 + j * 2.1 + pos.x * 0.01
				GlyphPainter.flame(self, pos + Vector2(cos(a), sin(a) * 0.5) * r * 0.45, r * 0.45, _t + j)
		else:
			draw_circle(pos, r, Color(Palette.WAX, 0.28 * k))
			draw_circle(pos + Vector2(-r * 0.2, -r * 0.2), r * 0.55, Color(Palette.WAX, 0.18 * k))

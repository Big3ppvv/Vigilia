class_name ExitPortal
extends Node2D
## El Párpado: salida tras derrotar al guardián del piso.

var world: CombatWorld
var is_final := false
var _t := 0.0


func _ready() -> void:
	add_to_group("interactables")
	Audio.play("secret")


func prompt() -> Array:
	if is_final:
		return ["[E] Abrir el Párpado", "Despertar... o descubrir otra capa del sueño. Termina la vigilia."]
	return ["[E] Descender por el Párpado", "Continúa hacia el siguiente estrato del sueño."]


func interact(_pl: Player) -> bool:
	if world.game != null and world.game.has_method("request_next_floor"):
		world.game.request_next_floor()
		return true
	return false


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _draw() -> void:
	var open := clampf(_t / 1.2, 0.0, 1.0)
	var w := 54.0
	var h := 26.0 * open
	draw_circle(Vector2.ZERO, 70.0, Color(Palette.FLAME, 0.05 + 0.03 * sin(_t * 2.0)))
	var pts := PackedVector2Array()
	for i in 17:
		var k := float(i) / 16.0
		pts.append(Vector2(lerpf(-w, w, k), -h * sin(k * PI)))
	for i in range(15, 0, -1):
		var k2 := float(i) / 16.0
		pts.append(Vector2(lerpf(-w, w, k2), h * sin(k2 * PI)))
	draw_colored_polygon(pts, Color("120a12"))
	draw_polyline(pts, Palette.WAX, 2.0)
	if open > 0.3:
		draw_circle(Vector2.ZERO, 14.0 * open, Color(Palette.FLAME_BLUE if is_final else Palette.FLAME, 0.9))
		draw_circle(Vector2.ZERO, 6.0 * open, Color("120a12"))
	for i in 7:
		var k3 := float(i + 1) / 8.0
		var base := Vector2(lerpf(-w, w, k3), -h * sin(k3 * PI))
		draw_line(base, base + Vector2(0, -10).rotated((k3 - 0.5) * 1.2), Palette.WAX_DARK, 2.0)

class_name HumanInput
extends InputSource
## Entrada humana. Dos estilos de puntería conviven:
##   - Flechas / stick derecho: apuntan Y disparan (estilo twin-stick).
##   - Ratón: apunta hacia el cursor; clic izquierdo dispara.


func get_move() -> Vector2:
	return Input.get_vector("move_left", "move_right", "move_up", "move_down")


func _aim_keys() -> Vector2:
	return Input.get_vector("aim_left", "aim_right", "aim_up", "aim_down")


func get_aim(player: Node2D) -> Vector2:
	var k := _aim_keys()
	if k.length() > 0.25:
		return k.normalized()
	var to_mouse := player.get_global_mouse_position() - player.global_position
	if to_mouse.length() > 4.0:
		return to_mouse.normalized()
	return Vector2.ZERO


func is_shooting() -> bool:
	return _aim_keys().length() > 0.25 or Input.is_action_pressed("shoot")


func just_pressed(action: String) -> bool:
	return Input.is_action_just_pressed(action)

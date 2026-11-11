class_name InputSource
extends RefCounted
## Fuente de órdenes del jugador. Desacopla al Player del dispositivo:
## HumanInput (teclado/ratón/mando), BotInput (pruebas automáticas) y, en el
## futuro, repeticiones deterministas (reproducir órdenes grabadas por frame).


## Llamado una vez por frame de física antes de leer las órdenes.
func update(_player: Node2D, _delta: float) -> void:
	pass


func get_move() -> Vector2:
	return Vector2.ZERO


## Dirección de apuntado normalizada, o ZERO si no hay intención de apuntar.
func get_aim(_player: Node2D) -> Vector2:
	return Vector2.ZERO


func is_shooting() -> bool:
	return false


func just_pressed(_action: String) -> bool:
	return false

class_name CameraRig
extends Camera2D
## Cámara de sala con sacudida basada en "trauma" (amplitud ~ trauma^2).
## La intensidad se escala por el ajuste de accesibilidad "Sacudida de cámara"
## (0 = desactivada por completo).

const MAX_OFFSET := 14.0
const DECAY := 1.8

var trauma := 0.0
var _t := 0.0
var _base := Vector2.ZERO


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_PAUSABLE
	ignore_rotation = true


func focus(pos: Vector2) -> void:
	_base = pos
	global_position = pos
	offset = Vector2.ZERO


func add_trauma(amount: float) -> void:
	var scale_setting := Settings.screen_shake
	if scale_setting <= 0.0:
		return
	trauma = clampf(trauma + amount * scale_setting, 0.0, 1.0)


func _process(delta: float) -> void:
	_t += delta
	if trauma <= 0.0:
		offset = Vector2.ZERO
		return
	trauma = maxf(0.0, trauma - DECAY * delta)
	var amp := MAX_OFFSET * trauma * trauma
	offset = Vector2(sin(_t * 47.0) + 0.5 * sin(_t * 113.0), cos(_t * 41.0) + 0.5 * cos(_t * 97.0)) * amp

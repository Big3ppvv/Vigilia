class_name ScaledRoot
extends Control
## Raíz de interfaz escalable (accesibilidad: "Escala de interfaz").
## Se dimensiona a viewport/escala y se escala por `ui_scale`: los hijos anclados
## se maquetan en el espacio lógico y ocupan exactamente la pantalla.

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	get_viewport().size_changed.connect(_relayout)
	Settings.changed.connect(_relayout)
	_relayout()


func _relayout() -> void:
	var s := Settings.ui_scale
	var vp := get_viewport_rect().size
	scale = Vector2(s, s)
	position = Vector2.ZERO
	size = vp / s

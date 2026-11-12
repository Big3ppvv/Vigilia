class_name SettingsPanel
extends PanelContainer
## Ajustes: audio, vídeo, accesibilidad y remapeo de controles.
## Todo cambio se aplica y persiste al instante (Settings.set_value).

signal closed

var _waiting_action := ""
var _bind_buttons := {}
var _status_label: Label


func _ready() -> void:
	theme = UIKit.theme()
	process_mode = Node.PROCESS_MODE_ALWAYS
	custom_minimum_size = Vector2(760, 520)
	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 10)
	add_child(root)
	var title := UIKit.label("Ajustes", 28, Palette.UI_ACCENT)
	root.add_child(title)
	var tabs := TabContainer.new()
	tabs.custom_minimum_size = Vector2(720, 400)
	root.add_child(tabs)
	tabs.add_child(_audio_tab())
	tabs.add_child(_video_tab())
	tabs.add_child(_access_tab())
	tabs.add_child(_controls_tab())
	var bottom := HBoxContainer.new()
	_status_label = UIKit.label("", 14, Palette.UI_DIM)
	_status_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bottom.add_child(_status_label)
	bottom.add_child(UIKit.button("Volver", func() -> void: _close(), 180))
	root.add_child(bottom)


func _close() -> void:
	_waiting_action = ""
	visible = false
	closed.emit()


func _row(parent: Control, text: String, control: Control) -> void:
	var h := HBoxContainer.new()
	var l := UIKit.label(text, 16)
	l.custom_minimum_size = Vector2(300, 0)
	h.add_child(l)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(control)
	parent.add_child(h)


func _slider(key: String, min_v: float, max_v: float, step: float) -> HSlider:
	var s := HSlider.new()
	s.min_value = min_v
	s.max_value = max_v
	s.step = step
	s.value = float(Settings.get_value(key))
	s.custom_minimum_size = Vector2(320, 24)
	s.value_changed.connect(func(v: float) -> void: Settings.set_value(key, v))
	return s


func _check(key: String) -> CheckButton:
	var c := CheckButton.new()
	c.button_pressed = bool(Settings.get_value(key))
	c.toggled.connect(func(v: bool) -> void: Settings.set_value(key, v))
	return c


func _audio_tab() -> Control:
	var v := VBoxContainer.new()
	v.name = "Audio"
	v.add_theme_constant_override("separation", 14)
	_row(v, "Volumen general", _slider("audio/master", 0.0, 1.0, 0.05))
	_row(v, "Efectos", _slider("audio/sfx", 0.0, 1.0, 0.05))
	_row(v, "Música", _slider("audio/music", 0.0, 1.0, 0.05))
	return v


func _video_tab() -> Control:
	var v := VBoxContainer.new()
	v.name = "Vídeo"
	v.add_theme_constant_override("separation", 14)
	_row(v, "Pantalla completa", _check("video/fullscreen"))
	_row(v, "Sincronización vertical", _check("video/vsync"))
	_row(v, "Penumbra y somnolencia (0: desactivadas)", _slider("video/lighting_strength", 0.0, 1.0, 0.05))
	_row(v, "Mostrar FPS", _check("debug/show_fps"))
	return v


func _access_tab() -> Control:
	var v := VBoxContainer.new()
	v.name = "Accesibilidad"
	v.add_theme_constant_override("separation", 12)
	_row(v, "Sacudida de cámara", _slider("access/screen_shake", 0.0, 1.0, 0.05))
	_row(v, "Destellos e intermitencias", _check("access/flashes"))
	_row(v, "Reducir partículas", _check("access/reduced_particles"))
	_row(v, "Números de daño", _check("access/damage_numbers"))
	_row(v, "Congelación de impacto (hitstop)", _check("access/hitstop"))
	_row(v, "Proyectiles de alto contraste", _check("access/high_contrast"))
	_row(v, "Escala de interfaz", _slider("access/ui_scale", 0.75, 1.5, 0.05))
	return v


func _controls_tab() -> Control:
	var scroll := ScrollContainer.new()
	scroll.name = "Controles"
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 6)
	scroll.add_child(v)
	for id in Settings.action_ids():
		var b := Button.new()
		b.custom_minimum_size = Vector2(240, 34)
		b.pressed.connect(_begin_rebind.bind(id))
		_bind_buttons[id] = b
		_row(v, Settings.action_label(id), b)
	v.add_child(UIKit.button("Restablecer controles", func() -> void:
		Settings.reset_bindings()
		_refresh_bindings()
		_status_label.text = "Controles restablecidos", 260))
	v.add_child(UIKit.label("Los mandos usan asignaciones fijas (stick izq. mover, stick der. apuntar/disparar).", 13, Palette.UI_DIM))
	_refresh_bindings()
	return scroll


func _refresh_bindings() -> void:
	for id in _bind_buttons:
		var b: Button = _bind_buttons[id]
		b.text = "Pulsa una tecla..." if id == _waiting_action else Settings.binding_label(id)


func _begin_rebind(id: String) -> void:
	_waiting_action = id
	_status_label.text = "Esc para cancelar"
	_refresh_bindings()


func _input(event: InputEvent) -> void:
	if _waiting_action == "" or not visible:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		get_viewport().set_input_as_handled()
		if (event as InputEventKey).keycode == KEY_ESCAPE:
			_waiting_action = ""
			_status_label.text = "Cancelado"
		else:
			_apply_rebind(event)
	elif event is InputEventMouseButton and event.pressed:
		get_viewport().set_input_as_handled()
		_apply_rebind(event)


func _apply_rebind(event: InputEvent) -> void:
	var id := _waiting_action
	_waiting_action = ""
	var swapped := Settings.rebind(id, event)
	_status_label.text = "Intercambiado con «%s»" % Settings.action_label(swapped) if swapped != "" else "Asignado"
	_refresh_bindings()

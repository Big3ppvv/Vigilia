class_name EndScreen
extends Control
## Pantalla de muerte / victoria con resumen de la partida y reinicio.

var game: Node
var _title: Label
var _epitaph: Label
var _stats: Label
var _items: _ItemsStrip
var _seed: String = ""
var _first_button: Button


func setup(p_game: Node) -> void:
	game = p_game
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	theme = UIKit.theme()
	visible = false
	add_child(UIKit.dim_background(0.86))
	var cc := UIKit.center_box(self)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	v.custom_minimum_size = Vector2(760, 0)
	cc.add_child(v)
	_title = UIKit.label("", 46, Palette.UI_DANGER, 6)
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(_title)
	_epitaph = UIKit.label("", 18, Palette.WAX, 3)
	_epitaph.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_epitaph.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(_epitaph)
	var panel := PanelContainer.new()
	v.add_child(panel)
	var pv := VBoxContainer.new()
	panel.add_child(pv)
	_stats = UIKit.label("", 17)
	pv.add_child(_stats)
	_items = _ItemsStrip.new()
	_items.custom_minimum_size = Vector2(720, 44)
	pv.add_child(_items)
	var hb := HBoxContainer.new()
	hb.alignment = BoxContainer.ALIGNMENT_CENTER
	hb.add_theme_constant_override("separation", 10)
	v.add_child(hb)
	_first_button = UIKit.button("Nueva vigilia", func() -> void: GameManager.restart_new_seed(), 200)
	hb.add_child(_first_button)
	hb.add_child(UIKit.button("Repetir semilla", func() -> void: GameManager.restart_same_seed(), 200))
	hb.add_child(UIKit.button("Copiar semilla", func() -> void: DisplayServer.clipboard_set(_seed), 170))
	hb.add_child(UIKit.button("Menú principal", func() -> void: GameManager.goto_main_menu(), 190))


func show_summary(s: Dictionary, victory: bool) -> void:
	visible = true
	_seed = SeedUtil.format_seed(str(s.get("seed", "")))
	if victory:
		_title.text = "EL PÁRPADO SE ABRE"
		_title.add_theme_color_override("font_color", Palette.UI_ACCENT)
		_epitaph.text = str(s.get("ending", ""))
	else:
		_title.text = "LA ESPINA SE APAGÓ"
		_title.add_theme_color_override("font_color", Palette.UI_DANGER)
		_epitaph.text = str(s.get("epitaph", ""))
	var lines := [
		"Resultado: %s" % ("Victoria (final: El Párpado)" if victory else "Muerte — por %s" % str(s.get("killed_by", "?"))),
		"Tiempo: %s      Piso alcanzado: %d" % [UIKit.format_time(float(s.get("time", 0.0))), int(s.get("floor", 1))],
		"Enemigos abatidos: %d      Salas despejadas: %d" % [int(s.get("kills", 0)), int(s.get("rooms_cleared", 0))],
		"Daño infligido: %d      Daño recibido: %d" % [int(s.get("damage_dealt", 0)), int(s.get("damage_taken", 0))],
		"Semilla: %s   (generador v%d)" % [_seed, int(s.get("generator_version", 0))],
	]
	var tol: Dictionary = s.get("tolerance", {})
	if not tol.is_empty():
		var names: Array = []
		for k in tol:
			names.append("%s −%d%%" % [ToleranceSystem.LABELS.get(k, k), int(round(float(tol[k]) * 100.0))])
		lines.append("El Sueño llegó a tolerar: " + ", ".join(names))
	_stats.text = "\n".join(lines)
	_items.ids = s.get("items", [])
	_items.queue_redraw()
	_first_button.grab_focus()


class _ItemsStrip:
	extends Control
	var ids: Array = []

	func _draw() -> void:
		var x := 20.0
		for id in ids:
			var d := ContentDB.get_item(str(id))
			draw_circle(Vector2(x, 22), 17.0, Color(0, 0, 0, 0.4))
			GlyphPainter.draw_item(self, d, Vector2(x, 22), 12.0, 0.0)
			x += 38.0
			if x > size.x - 20.0:
				break
		if ids.is_empty():
			draw_string(ThemeDB.fallback_font, Vector2(10, 28), "Sin reliquias.", HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Palette.UI_DIM)

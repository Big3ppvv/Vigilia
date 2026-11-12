class_name InventoryPanel
extends Control
## Inventario (Tab): recuerdos con descripción, estadísticas, sinergias activas
## y mapa completo del piso. Pausa el juego mientras está abierto.

var game: Node
var _grid: GridContainer
var _desc_title: Label
var _desc_body: Label
var _stats_label: Label
var _syn_label: Label
var _map: Minimap


func setup(p_game: Node) -> void:
	game = p_game
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	theme = UIKit.theme()
	visible = false
	add_child(UIKit.dim_background(0.8))
	var cc := UIKit.center_box(self)
	var panel := PanelContainer.new()
	cc.add_child(panel)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 22)
	panel.add_child(h)

	var left := VBoxContainer.new()
	left.custom_minimum_size = Vector2(380, 520)
	left.add_child(UIKit.label("Recuerdos", 24, Palette.UI_ACCENT))
	_grid = GridContainer.new()
	_grid.columns = 7
	_grid.add_theme_constant_override("h_separation", 6)
	_grid.add_theme_constant_override("v_separation", 6)
	left.add_child(_grid)
	_desc_title = UIKit.label("Pasa el ratón sobre un recuerdo", 18, Palette.UI_TEXT)
	_desc_body = UIKit.label("", 14, Palette.UI_DIM)
	_desc_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_desc_body.custom_minimum_size = Vector2(370, 0)
	left.add_child(HSeparator.new())
	left.add_child(_desc_title)
	left.add_child(_desc_body)
	h.add_child(left)

	var mid := VBoxContainer.new()
	mid.custom_minimum_size = Vector2(250, 0)
	mid.add_child(UIKit.label("Estadísticas", 24, Palette.UI_ACCENT))
	_stats_label = UIKit.label("", 15)
	mid.add_child(_stats_label)
	h.add_child(mid)

	var right := VBoxContainer.new()
	right.custom_minimum_size = Vector2(320, 0)
	right.add_child(UIKit.label("Mapa del piso", 24, Palette.UI_ACCENT))
	_map = Minimap.new()
	_map.compact = false
	_map.cell = Vector2(28, 18)
	_map.custom_minimum_size = Vector2(320, 260)
	right.add_child(_map)
	right.add_child(UIKit.label("Sinergias activas", 20, Palette.UI_ACCENT))
	_syn_label = UIKit.label("", 14, Palette.UI_TEXT)
	_syn_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_syn_label.custom_minimum_size = Vector2(320, 0)
	right.add_child(_syn_label)
	right.add_child(UIKit.label("[Tab] cerrar", 13, Palette.UI_DIM))
	h.add_child(right)


func open() -> void:
	visible = true
	_refresh()


func close() -> void:
	visible = false


func _refresh() -> void:
	for c in _grid.get_children():
		c.queue_free()
	var pl: Player = game.player
	var inv := pl.inventory
	var shown := {}
	var ids: Array = inv.items.duplicate()
	if inv.active_id != "":
		ids.push_front(inv.active_id)
	for id in ids:
		if shown.has(id):
			continue
		shown[id] = true
		var icon := _ItemIcon.new()
		icon.item_id = str(id)
		icon.count = maxi(1, inv.count(str(id)))
		icon.is_active = str(id) == inv.active_id
		icon.custom_minimum_size = Vector2(48, 48)
		icon.mouse_entered.connect(_show_item.bind(str(id)))
		_grid.add_child(icon)
	if ids.is_empty():
		_desc_title.text = "Aún no llevas recuerdos"
		_desc_body.text = ""
	var lines: Array = []
	for sid in StatDefs.DISPLAY_ORDER:
		lines.append("%s:  %s" % [StatDefs.label(sid), StatDefs.format_value(sid, pl.stats.get_stat(sid))])
	lines.append("")
	lines.append("Llama: %d/%d   Cera: %d" % [pl.hp, pl.max_hp(), pl.wax])
	lines.append("Semilla: " + SeedUtil.format_seed(game.run.seed_string))
	_stats_label.text = "\n".join(lines)
	var syn: Array = []
	for sid in inv.active_synergies:
		var sy: Dictionary = ContentDB.synergies[sid]
		syn.append("• %s — %s" % [sy["name"], sy.get("desc", "")])
	_syn_label.text = "\n".join(syn) if not syn.is_empty() else "Ninguna. Combina recuerdos con etiquetas comunes."
	var prog: Array = []
	for pr in inv.synergy_progress():
		prog.append("• %s — %s %d/%d" % [str(pr["name"]), ItemSystem.tag_label(str(pr["tag"])), int(pr["have"]), int(pr["need"])])
	if not prog.is_empty():
		_syn_label.text += "\n\nEn progreso:\n" + "\n".join(prog)
	_map.layout = game.layout
	_map.current = game.director.current.coord if game.director.current != null else Vector2i.ZERO


func _show_item(id: String) -> void:
	var d := ContentDB.get_item(id)
	_desc_title.text = str(d.get("name", id))
	_desc_title.add_theme_color_override("font_color", Palette.rarity_color(str(d.get("rarity", "common"))))
	var tags: Array = d.get("tags", [])
	_desc_body.text = "%s\n\n«%s»\n\nEtiquetas: %s" % [str(d.get("desc", "")), str(d.get("flavor", "")), ", ".join(tags)]


class _ItemIcon:
	extends Control
	var item_id := ""
	var count := 1
	var is_active := false
	var _t := 0.0

	func _process(delta: float) -> void:
		_t += delta
		queue_redraw()

	func _draw() -> void:
		var d := ContentDB.get_item(item_id)
		var rc := Palette.rarity_color(str(d.get("rarity", "common")))
		draw_rect(Rect2(Vector2.ZERO, size), Color(0.06, 0.04, 0.07, 0.9))
		draw_rect(Rect2(Vector2.ZERO, size), Color(rc, 0.8), false, 2.0 if not is_active else 3.0)
		GlyphPainter.draw_item(self, d, size * 0.5, 15.0, _t)
		if count > 1:
			draw_string(ThemeDB.fallback_font, Vector2(size.x - 16, size.y - 4), "x%d" % count, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Palette.UI_TEXT)
		if is_active:
			draw_string(ThemeDB.fallback_font, Vector2(3, 12), "Q", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Palette.UI_ACCENT)

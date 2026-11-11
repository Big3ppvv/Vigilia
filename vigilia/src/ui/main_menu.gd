extends Control
## Menú principal: comenzar (selección de personaje + semilla), historial,
## ajustes y salir.

var _main_box: VBoxContainer
var _select_panel: PanelContainer
var _history_panel: PanelContainer
var _settings: SettingsPanel
var _seed_edit: LineEdit
var _selected_char := ""
var _char_info: Label


func _ready() -> void:
	theme = UIKit.theme()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	get_tree().paused = false
	Engine.time_scale = 1.0
	add_child(MenuBackground.new())
	var root := ScaledRoot.new()
	add_child(root)

	var title := UIKit.label(str(ContentDB.lore.get("title", "VIGILIA")), 92, Palette.WAX, 10)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.anchor_left = 0.0
	title.anchor_right = 1.0
	title.offset_top = 236
	root.add_child(title)
	var sub := UIKit.label(str(ContentDB.lore.get("subtitle", "")), 22, Palette.FLAME, 4)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.anchor_left = 0.0
	sub.anchor_right = 1.0
	sub.offset_top = 346
	root.add_child(sub)

	_main_box = VBoxContainer.new()
	_main_box.anchor_left = 0.5
	_main_box.anchor_right = 0.5
	_main_box.offset_left = -150
	_main_box.offset_right = 150
	_main_box.offset_top = 400
	_main_box.add_theme_constant_override("separation", 10)
	root.add_child(_main_box)
	var start := UIKit.button("Comenzar vigilia", _open_select, 300)
	_main_box.add_child(start)
	_main_box.add_child(UIKit.button("Historial", _open_history, 300))
	_main_box.add_child(UIKit.button("Ajustes", _open_settings, 300))
	_main_box.add_child(UIKit.button("Salir", func() -> void: Audio.quit_game(), 300))

	var footer := UIKit.label("v%s  ·  Fase 1 (build de desarrollo)  ·  Godot %s" % [ProjectSettings.get_setting("application/config/version", "?"), Engine.get_version_info()["string"]], 12, Palette.UI_DIM, 2)
	footer.anchor_top = 1.0
	footer.anchor_bottom = 1.0
	footer.offset_top = -24
	footer.offset_left = 12
	root.add_child(footer)
	if SaveManager.load_report in ["recovered_from_backup", "reset_corrupt"]:
		var warn := UIKit.label("Aviso: el perfil estaba dañado (%s)." % SaveManager.load_report, 13, Palette.UI_DANGER, 2)
		warn.anchor_top = 1.0
		warn.anchor_bottom = 1.0
		warn.offset_top = -44
		warn.offset_left = 12
		root.add_child(warn)

	var cc := CenterContainer.new()
	cc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	cc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(cc)
	_build_select(cc)
	_build_history(cc)
	_settings = SettingsPanel.new()
	_settings.visible = false
	_settings.closed.connect(_back_to_main)
	cc.add_child(_settings)
	start.grab_focus()
	Audio.play_music("menu")
	# Modo demostración: `VIGILIA -- --demo [--seed=XXXX]` juega solo con el
	# piloto automático (exhibición y verificación de ejecutables exportados).
	var args := OS.get_cmdline_user_args()
	if args.has("--demo"):
		var seed_text := ""
		for a in args:
			if a.begins_with("--seed="):
				seed_text = a.substr(7)
		GameManager.start_new_run.call_deferred({"character": _selected_char, "seed": seed_text, "demo": true})


func _build_select(parent: Control) -> void:
	_select_panel = PanelContainer.new()
	_select_panel.visible = false
	parent.add_child(_select_panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	v.custom_minimum_size = Vector2(640, 0)
	_select_panel.add_child(v)
	v.add_child(UIKit.label("Elige tu forma", 26, Palette.UI_ACCENT))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	v.add_child(row)
	for id in ContentDB.character_ids:
		var c: Dictionary = ContentDB.characters[id]
		var b := UIKit.button(str(c.get("name", id)), _pick_character.bind(str(id)), 180)
		row.add_child(b)
	_char_info = UIKit.label("", 15)
	_char_info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_char_info.custom_minimum_size = Vector2(620, 0)
	v.add_child(_char_info)
	v.add_child(UIKit.label("Semilla (déjala vacía para una aleatoria):", 15, Palette.UI_DIM))
	_seed_edit = LineEdit.new()
	_seed_edit.placeholder_text = "p. ej. ABCD-EFGH"
	_seed_edit.max_length = 24
	v.add_child(_seed_edit)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 10)
	hb.add_child(UIKit.button("Comenzar", _start_run, 220))
	hb.add_child(UIKit.button("Volver", _back_to_main, 160))
	v.add_child(hb)
	if not ContentDB.character_ids.is_empty():
		_pick_character(str(ContentDB.character_ids[0]))


func _pick_character(id: String) -> void:
	_selected_char = id
	var c: Dictionary = ContentDB.characters.get(id, {})
	var st: Dictionary = c.get("stats", {})
	var mech: Dictionary = c.get("mechanic", {})
	var weak: Dictionary = c.get("weakness", {})
	var act := ContentDB.get_item(str(c.get("start_active", "")))
	_char_info.text = "%s — %s\n%s\n\nMecánica: %s. %s\nDebilidad: %s. %s\nObjeto inicial: %s\nVida %d · Daño %.1f · Cadencia %.1f · Velocidad %d" % [
		str(c.get("name", "")), str(c.get("title", "")), str(c.get("desc", "")),
		str(mech.get("name", "")), str(mech.get("desc", "")),
		str(weak.get("name", "")), str(weak.get("desc", "")),
		str(act.get("name", "ninguno")),
		int(st.get("max_health", 6)), float(st.get("damage", 3.5)), float(st.get("fire_rate", 3.0)), int(st.get("move_speed", 250))]


func _build_history(parent: Control) -> void:
	_history_panel = PanelContainer.new()
	_history_panel.visible = false
	parent.add_child(_history_panel)


func _fill_history() -> void:
	for c in _history_panel.get_children():
		c.queue_free()
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	v.custom_minimum_size = Vector2(700, 0)
	_history_panel.add_child(v)
	v.add_child(UIKit.label("Historial", 26, Palette.UI_ACCENT))
	var t: Dictionary = SaveManager.profile.get("totals", {})
	v.add_child(UIKit.label("Partidas: %d   Victorias: %d   Muertes: %d   Abatidos: %d   Mejor piso: %d   Tiempo total: %s" % [
		int(t.get("runs", 0)), int(t.get("victories", 0)), int(t.get("deaths", 0)), int(t.get("kills", 0)),
		int(t.get("best_floor", 0)), UIKit.format_time(float(t.get("play_time", 0.0)))], 15))
	var disc: Dictionary = SaveManager.profile.get("discovered", {})
	v.add_child(UIKit.label("Descubierto: %d/%d reliquias · %d/%d sinergias de conjunto · %d enemigos" % [
		disc.get("items", {}).size(), ContentDB.items.size(), disc.get("synergies", {}).size(), ContentDB.synergies.size(), disc.get("enemies", {}).size()], 15, Palette.UI_DIM))
	v.add_child(HSeparator.new())
	var hist: Array = SaveManager.profile.get("history", [])
	if hist.is_empty():
		v.add_child(UIKit.label("Aún no hay vigilias registradas.", 15, Palette.UI_DIM))
	for i in mini(10, hist.size()):
		var h: Dictionary = hist[i]
		var res: String = {"victory": "Victoria", "death": "Muerte", "abandon": "Abandono"}.get(str(h.get("result", "")), str(h.get("result", "")))
		v.add_child(UIKit.label("%s  ·  %s  ·  piso %d  ·  %s  ·  %d abatidos  ·  semilla %s" % [
			str(h.get("date", "")).left(16), res, int(h.get("floor", 1)), UIKit.format_time(float(h.get("time", 0.0))),
			int(h.get("kills", 0)), SeedUtil.format_seed(str(h.get("seed", "")))], 14))
	v.add_child(UIKit.button("Volver", _back_to_main, 160))


func _open_select() -> void:
	_main_box.visible = false
	_select_panel.visible = true


func _open_history() -> void:
	_main_box.visible = false
	_fill_history()
	_history_panel.visible = true


func _open_settings() -> void:
	_main_box.visible = false
	_settings.visible = true


func _back_to_main() -> void:
	_select_panel.visible = false
	_history_panel.visible = false
	_settings.visible = false
	_main_box.visible = true
	(_main_box.get_child(0) as Button).grab_focus()


func _start_run() -> void:
	GameManager.start_new_run({"character": _selected_char, "seed": _seed_edit.text})

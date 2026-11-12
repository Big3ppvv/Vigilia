extends Control
## La habitación: menú principal. No es una pantalla de título, es el lugar
## real donde alguien vela. "Encender la vela" empieza otra noche.

var _bg: MenuBackground
var _main_box: VBoxContainer
var _seed_panel: PanelContainer
var _history_panel: PanelContainer
var _settings: SettingsPanel
var _seed_edit: LineEdit
var _fade: ColorRect
var _starting := false


func _ready() -> void:
	theme = UIKit.theme()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	get_tree().paused = false
	Engine.time_scale = 1.0
	_bg = MenuBackground.new()
	add_child(_bg)
	var root := ScaledRoot.new()
	add_child(root)

	var night := int(SaveManager.profile.get("totals", {}).get("runs", 0)) + 1
	var title := UIKit.label(str(ContentDB.lore.get("title", "VIGILIA")), 86, Palette.WAX, 8)
	title.add_theme_font_override("font", UIKit.spaced_font(22))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.anchor_left = 0.0
	title.anchor_right = 1.0
	title.offset_top = 70
	root.add_child(title)
	var sub := UIKit.label(str(ContentDB.lore.get("subtitle", "")), 18, Color(Palette.WAX, 0.55), 4)
	sub.add_theme_font_override("font", UIKit.spaced_font(3))
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.anchor_left = 0.0
	sub.anchor_right = 1.0
	sub.offset_top = 182
	root.add_child(sub)

	_main_box = VBoxContainer.new()
	_main_box.anchor_left = 0.5
	_main_box.anchor_right = 0.5
	_main_box.offset_left = -220
	_main_box.offset_right = 220
	_main_box.offset_top = 262
	_main_box.add_theme_constant_override("separation", 4)
	root.add_child(_main_box)
	var start := UIKit.menu_button("Encender la vela", _start_run, 26)
	_main_box.add_child(start)
	var night_label := UIKit.label("noche %d" % night, 14, Color(Palette.FLAME_CORE, 0.55), 3)
	night_label.add_theme_font_override("font", UIKit.spaced_font(4))
	night_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_main_box.add_child(night_label)
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 14)
	_main_box.add_child(spacer)
	_main_box.add_child(UIKit.menu_button("Noches anteriores", _open_history, 19))
	_main_box.add_child(UIKit.menu_button("Ajustes", _open_settings, 19))
	_main_box.add_child(UIKit.menu_button("Salir", func() -> void: Audio.quit_game(), 19))
	var seed_btn := UIKit.menu_button("Una noche concreta (semilla)", _open_seed, 14)
	_main_box.add_child(seed_btn)

	var footer := UIKit.label("v%s" % ProjectSettings.get_setting("application/config/version", "?"), 11, Color(Palette.UI_DIM, 0.5), 2)
	footer.anchor_top = 1.0
	footer.anchor_bottom = 1.0
	footer.offset_top = -22
	footer.offset_left = 12
	root.add_child(footer)
	if SaveManager.load_report in ["recovered_from_backup", "reset_corrupt"]:
		var warn := UIKit.label("Aviso: el perfil estaba dañado (%s)." % SaveManager.load_report, 13, Palette.UI_DANGER, 2)
		warn.anchor_top = 1.0
		warn.anchor_bottom = 1.0
		warn.offset_top = -42
		warn.offset_left = 12
		root.add_child(warn)

	var cc := CenterContainer.new()
	cc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	cc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(cc)
	_build_seed(cc)
	_history_panel = PanelContainer.new()
	_history_panel.visible = false
	cc.add_child(_history_panel)
	_settings = SettingsPanel.new()
	_settings.visible = false
	_settings.closed.connect(_back_to_main)
	cc.add_child(_settings)

	_fade = ColorRect.new()
	_fade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_fade.color = Color(0, 0, 0, 1)
	_fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_fade)
	var tw := create_tween()
	tw.tween_property(_fade, "color:a", 0.0, 1.2)
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
		GameManager.start_new_run.call_deferred({"seed": seed_text, "demo": true})


func _build_seed(parent: Control) -> void:
	_seed_panel = PanelContainer.new()
	_seed_panel.visible = false
	parent.add_child(_seed_panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	v.custom_minimum_size = Vector2(560, 0)
	_seed_panel.add_child(v)
	v.add_child(UIKit.label("Una noche concreta", 24, Palette.UI_ACCENT))
	var info := UIKit.label("Cada noche nace de una semilla. Con la misma semilla, el sueño se repite: sirve para compartir una noche o volver a intentarla.", 15, Palette.UI_DIM)
	info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	info.custom_minimum_size = Vector2(540, 0)
	v.add_child(info)
	_seed_edit = LineEdit.new()
	_seed_edit.placeholder_text = "p. ej. ABCD-EFGH (vacío = al azar)"
	_seed_edit.max_length = 24
	v.add_child(_seed_edit)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 10)
	hb.add_child(UIKit.button("Encender", _start_run, 200))
	hb.add_child(UIKit.button("Volver", _back_to_main, 160))
	v.add_child(hb)


func _fill_history() -> void:
	for c in _history_panel.get_children():
		c.queue_free()
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	v.custom_minimum_size = Vector2(760, 0)
	_history_panel.add_child(v)
	v.add_child(UIKit.label("Noches anteriores", 26, Palette.UI_ACCENT))
	var t: Dictionary = SaveManager.profile.get("totals", {})
	v.add_child(UIKit.label("Noches velando: %d   ·   Despertares: %d   ·   Veces que te dormiste: %d   ·   Tiempo: %s" % [
		int(t.get("runs", 0)), int(t.get("victories", 0)), int(t.get("deaths", 0)), UIKit.format_time(float(t.get("play_time", 0.0)))], 15))
	var disc: Dictionary = SaveManager.profile.get("discovered", {})
	v.add_child(UIKit.label("Recuerdos encontrados: %d/%d   ·   Sinergias: %d/%d   ·   Sombras conocidas: %d" % [
		disc.get("items", {}).size(), ContentDB.items.size(), disc.get("synergies", {}).size(), ContentDB.synergies.size(), disc.get("enemies", {}).size()], 15, Palette.UI_DIM))
	v.add_child(HSeparator.new())
	var hist: Array = SaveManager.profile.get("history", [])
	if hist.is_empty():
		v.add_child(UIKit.label("Aún no hay noches. La vela espera en la mesita.", 15, Palette.UI_DIM))
	for i in mini(10, hist.size()):
		var h: Dictionary = hist[i]
		var res := str(h.get("result", ""))
		var what := "despertó" if res == "victory" else ("se durmió ante %s" % str(h.get("killed_by", "el Sueño")) if res == "death" else "se interrumpió")
		var night := int(h.get("night", 0))
		var head := ("Noche %d" % night) if night > 0 else str(h.get("date", "")).left(10)
		v.add_child(UIKit.label("%s  ·  %s  ·  %d velas  ·  %s  ·  semilla %s" % [
			head, what, int(h.get("candles_lit", 0)), UIKit.format_time(float(h.get("time", 0.0))), SeedUtil.format_seed(str(h.get("seed", "")))], 14))
	v.add_child(UIKit.button("Volver", _back_to_main, 160))


func _open_seed() -> void:
	_main_box.visible = false
	_seed_panel.visible = true
	_seed_edit.grab_focus()


func _open_history() -> void:
	_main_box.visible = false
	_fill_history()
	_history_panel.visible = true


func _open_settings() -> void:
	_main_box.visible = false
	_settings.visible = true


func _back_to_main() -> void:
	_seed_panel.visible = false
	_history_panel.visible = false
	_settings.visible = false
	_main_box.visible = true
	(_main_box.get_child(0) as Button).grab_focus()


## La vela se aviva, la habitación se apaga y empieza la noche.
func _start_run() -> void:
	if _starting:
		return
	_starting = true
	var seed_text := _seed_edit.text if _seed_panel.visible else ""
	Audio.stop_music()
	Audio.play("kindle", 0.0, 0.8, 0.0)
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(_bg, "light", 1.6, 0.5)
	tw.tween_property(_main_box, "modulate:a", 0.0, 0.4)
	tw.chain().tween_property(_fade, "color:a", 1.0, 1.1)
	await tw.finished
	GameManager.start_new_run({"seed": seed_text, "intro": true})

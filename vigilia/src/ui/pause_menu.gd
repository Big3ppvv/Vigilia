class_name PauseMenu
extends Control
## Pausa (Escape): la vigilia espera. Muestra la noche, la semilla y lo que el
## Sueño ha aprendido de tu forma de luchar, sin números.

var game: Node
var _main: VBoxContainer
var _settings: SettingsPanel
var _seed_label: Label
var _learned: Label


func setup(p_game: Node) -> void:
	game = p_game
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	theme = UIKit.theme()
	visible = false
	add_child(UIKit.dim_background(0.8))
	var cc := UIKit.center_box(self)
	_main = VBoxContainer.new()
	_main.add_theme_constant_override("separation", 6)
	_main.alignment = BoxContainer.ALIGNMENT_CENTER
	_main.custom_minimum_size = Vector2(520, 0)
	cc.add_child(_main)
	var title := UIKit.label("La vigilia espera", 34, Palette.WAX, 6)
	title.add_theme_font_override("font", UIKit.spaced_font(4))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_main.add_child(title)
	_seed_label = UIKit.label("", 14, Palette.UI_DIM)
	_seed_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_main.add_child(_seed_label)
	_learned = UIKit.label("", 15, Palette.WHISPER)
	_learned.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_learned.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_main.add_child(_learned)
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 10)
	_main.add_child(spacer)
	_main.add_child(UIKit.menu_button("Seguir", func() -> void: game.toggle_pause(), 22))
	_main.add_child(UIKit.menu_button("Ajustes", _open_settings, 18))
	_main.add_child(UIKit.menu_button("Copiar semilla", func() -> void:
		DisplayServer.clipboard_set(SeedUtil.format_seed(game.run.seed_string))
		_seed_label.text = "Semilla copiada: " + SeedUtil.format_seed(game.run.seed_string), 16))
	_main.add_child(UIKit.menu_button("Repetir esta noche", func() -> void: game.restart_run(true), 16))
	_main.add_child(UIKit.menu_button("Empezar otra noche", func() -> void: game.restart_run(false), 16))
	_main.add_child(UIKit.menu_button("Volver a la habitación", func() -> void: game.abandon_run(), 16))
	_settings = SettingsPanel.new()
	_settings.visible = false
	cc.add_child(_settings)
	_settings.closed.connect(func() -> void: _main.visible = true)


func open() -> void:
	visible = true
	_settings.visible = false
	_main.visible = true
	_seed_label.text = "Noche %d   ·   %s   ·   %s   ·   semilla %s" % [game.run.night, str(game.floor_def.get("name", "")), UIKit.format_time(game.run.elapsed), SeedUtil.format_seed(game.run.seed_string)]
	var learned := ToleranceSystem.prose(game.run.tolerance)
	_learned.text = ("El sueño aprendió de ti: %s." % learned) if learned != "" else ""
	(_main.get_child(4) as Button).grab_focus()


func close() -> void:
	visible = false


func _open_settings() -> void:
	_main.visible = false
	_settings.visible = true

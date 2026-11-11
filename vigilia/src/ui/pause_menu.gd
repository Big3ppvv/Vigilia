class_name PauseMenu
extends Control
## Menú de pausa (Escape). Muestra la semilla para compartirla.

var game: Node
var _main: VBoxContainer
var _settings: SettingsPanel
var _seed_label: Label


func setup(p_game: Node) -> void:
	game = p_game
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	theme = UIKit.theme()
	visible = false
	add_child(UIKit.dim_background(0.75))
	var cc := UIKit.center_box(self)
	var panel := PanelContainer.new()
	cc.add_child(panel)
	_main = VBoxContainer.new()
	_main.add_theme_constant_override("separation", 12)
	_main.alignment = BoxContainer.ALIGNMENT_CENTER
	panel.add_child(_main)
	var title := UIKit.label("PAUSA", 34, Palette.UI_ACCENT)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_main.add_child(title)
	_seed_label = UIKit.label("", 15, Palette.UI_DIM)
	_seed_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_main.add_child(_seed_label)
	_main.add_child(UIKit.button("Continuar", func() -> void: game.toggle_pause()))
	_main.add_child(UIKit.button("Ajustes", _open_settings))
	_main.add_child(UIKit.button("Copiar semilla", func() -> void:
		DisplayServer.clipboard_set(SeedUtil.format_seed(game.run.seed_string))
		_seed_label.text = "Semilla copiada: " + SeedUtil.format_seed(game.run.seed_string)))
	_main.add_child(UIKit.button("Reiniciar (nueva semilla)", func() -> void: game.restart_run(false)))
	_main.add_child(UIKit.button("Reiniciar (misma semilla)", func() -> void: game.restart_run(true)))
	_main.add_child(UIKit.button("Abandonar al menú", func() -> void: game.abandon_run()))
	_settings = SettingsPanel.new()
	_settings.visible = false
	cc.add_child(_settings)
	_settings.closed.connect(func() -> void: _main.get_parent().visible = true)


func open() -> void:
	visible = true
	_settings.visible = false
	_main.get_parent().visible = true
	_seed_label.text = "Semilla: %s   ·   %s   ·   %s" % [SeedUtil.format_seed(game.run.seed_string), str(game.floor_def.get("name", "")), UIKit.format_time(game.run.elapsed)]
	(_main.get_child(2) as Button).grab_focus()


func close() -> void:
	visible = false


func _open_settings() -> void:
	_main.get_parent().visible = false
	_settings.visible = true

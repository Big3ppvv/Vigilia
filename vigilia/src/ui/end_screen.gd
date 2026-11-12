class_name EndScreen
extends Control
## Final de la noche: la HOJA DE ENFERMERÍA del turno. Los datos de la partida
## escritos como los anotaría quien te cuida (hora, constantes, velas, objetos
## personales) y una observación a mano. Desde aquí empieza otra noche.

const PAPER := Color("ece4d2")
const INK := Color("2b2730")
const INK_DIM := Color("6b6258")
const PEN := Color("2b4a8a")
## La noche empieza a las 23:40 y cada segundo de juego es medio minuto.
const START_MINUTE := 23 * 60 + 40
const MINUTES_PER_SECOND := 0.5

var game: Node
var _night: Label
var _lines: Label
var _obs: Label
var _items: _ItemsStrip
var _seed: String = ""
var _first_button: Button


func setup(p_game: Node) -> void:
	game = p_game
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	theme = UIKit.theme()
	visible = false
	add_child(UIKit.dim_background(0.9))
	var cc := UIKit.center_box(self)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 16)
	cc.add_child(v)
	var card := PanelContainer.new()
	var paper := StyleBoxFlat.new()
	paper.bg_color = PAPER
	paper.border_color = Color("c9bba0")
	paper.set_border_width_all(1)
	paper.set_corner_radius_all(2)
	paper.shadow_color = Color(0, 0, 0, 0.6)
	paper.shadow_size = 18
	paper.content_margin_left = 34
	paper.content_margin_right = 34
	paper.content_margin_top = 22
	paper.content_margin_bottom = 24
	card.add_theme_stylebox_override("panel", paper)
	card.custom_minimum_size = Vector2(700, 0)
	v.add_child(card)
	var pv := VBoxContainer.new()
	pv.add_theme_constant_override("separation", 8)
	card.add_child(pv)
	var head := HBoxContainer.new()
	pv.add_child(head)
	var h1 := _ink("HOJA DE ENFERMERÍA  ·  TURNO DE NOCHE", 12, INK_DIM)
	h1.add_theme_font_override("font", UIKit.spaced_font(2))
	h1.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(h1)
	head.add_child(_ink("Planta 3  ·  Hab. 12", 12, INK_DIM))
	var rule := ColorRect.new()
	rule.color = Color("b3243b", 0.5)
	rule.custom_minimum_size = Vector2(0, 2)
	pv.add_child(rule)
	_night = _ink("", 34, INK)
	pv.add_child(_night)
	_lines = _ink("", 16, INK)
	pv.add_child(_lines)
	pv.add_child(_ink("Objetos personales en la mesita:", 13, INK_DIM))
	_items = _ItemsStrip.new()
	_items.custom_minimum_size = Vector2(640, 40)
	pv.add_child(_items)
	pv.add_child(_ink("Observaciones:", 13, INK_DIM))
	_obs = _ink("", 19, PEN)
	_obs.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_obs.custom_minimum_size = Vector2(630, 0)
	pv.add_child(_obs)
	var hb := HBoxContainer.new()
	hb.alignment = BoxContainer.ALIGNMENT_CENTER
	hb.add_theme_constant_override("separation", 26)
	v.add_child(hb)
	_first_button = UIKit.menu_button("Otra noche", func() -> void: GameManager.restart_new_seed(), 22)
	hb.add_child(_first_button)
	hb.add_child(UIKit.menu_button("Repetir esta noche", func() -> void: GameManager.restart_same_seed(), 18))
	hb.add_child(UIKit.menu_button("Volver a la habitación", func() -> void: GameManager.goto_main_menu(), 18))
	var seed_btn := UIKit.menu_button("Copiar semilla", func() -> void: DisplayServer.clipboard_set(_seed), 13)
	v.add_child(seed_btn)


func _ink(text: String, size: int, col: Color) -> Label:
	var l := UIKit.label(text, size, col)
	return l


static func clock(seconds: float) -> String:
	var m := int(START_MINUTE + seconds * MINUTES_PER_SECOND) % (24 * 60)
	return "%02d:%02d" % [m / 60, m % 60]


static func vitals(damage_taken: int) -> String:
	if damage_taken <= 3:
		return "estables"
	if damage_taken <= 7:
		return "algo agitadas"
	return "muy agitadas"


func show_summary(s: Dictionary, victory: bool) -> void:
	visible = true
	_seed = SeedUtil.format_seed(str(s.get("seed", "")))
	var night := int(s.get("night", 1))
	_night.text = ("Noche %d  —  despierta" % night) if victory else ("Noche %d" % night)
	var floor_name := str(ContentDB.get_floor(maxi(0, int(s.get("floor", 1)) - 1)).get("name", ""))
	var lines := [
		"Hora: %s" % clock(float(s.get("time", 0.0))),
		"Constantes: %s" % vitals(int(s.get("damage_taken", 0))),
		"Velas encendidas: %d   ·   Salas despiertas: %d (%d con su luz)" % [int(s.get("candles_lit", 0)), int(s.get("rooms_cleared", 0)), int(s.get("rooms_by_light", 0))],
		"Sombras: %d abatidas, %d disipadas" % [int(s.get("kills", 0)), int(s.get("dissolved", 0))],
		"Llegó hasta: %s" % floor_name,
	]
	if not victory:
		lines.append("Se durmió ante: %s" % str(s.get("killed_by", "el Sueño")))
	var learned := ToleranceSystem.prose(s.get("tolerance", {}))
	if learned != "":
		lines.append("El sueño aprendió: %s" % learned)
	lines.append("Semilla: %s" % _seed)
	_lines.text = "\n".join(lines)
	_obs.text = str(s.get("ending", "")) if victory else str(s.get("epitaph", ""))
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
			draw_circle(Vector2(x, 20), 17.0, Color(0.16, 0.13, 0.12, 0.85))
			GlyphPainter.draw_item(self, d, Vector2(x, 20), 12.0, 0.0)
			x += 38.0
			if x > size.x - 20.0:
				break
		if ids.is_empty():
			draw_string(ThemeDB.fallback_font, Vector2(4, 26), "Ninguno.", HORIZONTAL_ALIGNMENT_LEFT, -1, 15, EndScreen.INK_DIM)

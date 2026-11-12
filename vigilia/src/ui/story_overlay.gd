class_name StoryOverlay
extends Control
## Texto sobre negro (o sobre blanco, al despertar): la voz de quien vela, la
## cuenta atrás del Arrullo, los títulos de cada noche.
##
## Uso (asíncrono):  await story.play(lines, {"voice": "outside", "beep": true})
## Cualquier tecla o clic completa la línea o pasa a la siguiente; Esc salta la
## secuencia entera. Con `fast` (bot, pruebas) todo dura un instante.
##
## Opciones:
##   voice     "outside" (voz de quien vela) | "lullaby" (el Arrullo) | "ink" (sobre blanco)
##   title     texto grande previo a las líneas (p. ej. "Noche 3")
##   subtitle  texto pequeño bajo el título
##   beep      pitido de monitor de fondo mientras dura
##   keep      no fundir a transparente al terminar (encadenar secuencias)
##   white     fondo blanco (el despertar)
##   pace      multiplicador de duración por línea (la cuenta atrás va más rápida)

signal finished

static var fast := false

const TYPE_CPS := 34.0
const BEEP_EVERY := 1.15

var playing := false
var _bg: ColorRect
var _title: Label
var _subtitle: Label
var _line: Label
var _skip_line := false
var _skip_all := false
var _beep := false
var _beep_t := 0.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_bg = ColorRect.new()
	_bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_bg.color = Color(0, 0, 0, 0)
	_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_bg)
	var box := VBoxContainer.new()
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_theme_constant_override("separation", 14)
	add_child(box)
	_title = UIKit.label("", 52, Palette.WAX)
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_subtitle = UIKit.label("", 17, Palette.UI_DIM)
	_subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_line = UIKit.label("", 26, Palette.OUTSIDE_VOICE)
	_line.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_line.custom_minimum_size = Vector2(820, 0)
	for l in [_title, _subtitle, _line]:
		l.modulate.a = 0.0
		var cc := CenterContainer.new()
		cc.mouse_filter = Control.MOUSE_FILTER_IGNORE
		cc.add_child(l)
		box.add_child(cc)
	visible = false


## Fundido a negro (o blanco) sin texto. Útil para enlazar escenas.
func cover(alpha: float = 1.0, time: float = 0.6, white: bool = false) -> void:
	visible = true
	_bg.color = Color(1, 1, 1, _bg.color.a) if white else Color(0, 0, 0, _bg.color.a)
	await _tween(_bg, "color:a", alpha, 0.01 if fast else time)


func uncover(time: float = 0.8) -> void:
	await _tween(_bg, "color:a", 0.0, 0.01 if fast else time)
	if _bg.color.a <= 0.01 and not playing:
		visible = false


func play(lines: Array, opts: Dictionary = {}) -> void:
	playing = true
	visible = true
	_skip_all = false
	_beep = bool(opts.get("beep", false))
	_beep_t = 0.0
	var white := bool(opts.get("white", false))
	var voice := str(opts.get("voice", "outside"))
	var col := Palette.OUTSIDE_VOICE
	match voice:
		"lullaby":
			col = Palette.WHISPER
		"ink":
			col = Color(0.16, 0.13, 0.16)
	_bg.color = Color(1, 1, 1, _bg.color.a) if white else Color(0, 0, 0, _bg.color.a)
	_line.add_theme_color_override("font_color", col)
	_title.add_theme_color_override("font_color", Color(0.2, 0.16, 0.18) if white else Palette.WAX)
	_subtitle.add_theme_color_override("font_color", Color(0.35, 0.3, 0.32) if white else Palette.UI_DIM)
	await _tween(_bg, "color:a", 1.0, 0.01 if fast else float(opts.get("fade_in", 0.9)))
	var pace := float(opts.get("pace", 1.0))
	var title := str(opts.get("title", ""))
	if title != "" and not _skip_all:
		_title.text = title
		_subtitle.text = str(opts.get("subtitle", ""))
		_title.modulate.a = 0.0
		_subtitle.modulate.a = 0.0
		await _tween(_title, "modulate:a", 1.0, 0.01 if fast else 1.0)
		await _tween(_subtitle, "modulate:a", 1.0, 0.01 if fast else 0.6)
		await _wait(0.02 if fast else 1.6 * pace)
		_tween(_subtitle, "modulate:a", 0.0, 0.01 if fast else 0.6)
		await _tween(_title, "modulate:a", 0.0, 0.01 if fast else 0.8)
	for raw in lines:
		if _skip_all:
			break
		await _show_line(str(raw), pace)
	_line.modulate.a = 0.0
	_title.modulate.a = 0.0
	_subtitle.modulate.a = 0.0
	_beep = false
	if not bool(opts.get("keep", false)):
		await _tween(_bg, "color:a", 0.0, 0.01 if fast else float(opts.get("fade_out", 1.0)))
		visible = false
	playing = false
	finished.emit()


func _show_line(text: String, pace: float) -> void:
	_line.text = text
	_line.visible_ratio = 0.0
	_line.modulate.a = 1.0
	_skip_line = false
	if fast:
		_line.visible_ratio = 1.0
		await _wait(0.02)
		_line.modulate.a = 0.0
		return
	var dur := maxf(0.25, text.length() / TYPE_CPS) * pace
	var t := 0.0
	while t < dur and not _skip_line and not _skip_all:
		await get_tree().process_frame
		t += get_process_delta_time()
		_line.visible_ratio = clampf(t / dur, 0.0, 1.0)
	_line.visible_ratio = 1.0
	_skip_line = false
	var hold := (1.1 + text.length() * 0.03) * pace
	var h := 0.0
	while h < hold and not _skip_line and not _skip_all:
		await get_tree().process_frame
		h += get_process_delta_time()
	_skip_line = false
	await _tween(_line, "modulate:a", 0.0, 0.35 * pace)


func _process(delta: float) -> void:
	if not _beep or fast:
		return
	_beep_t -= delta
	if _beep_t <= 0.0:
		_beep_t = BEEP_EVERY
		Audio.play("monitor", -10.0, 1.0, 0.0)


func _input(event: InputEvent) -> void:
	if not playing:
		return
	var pressed: bool = (event is InputEventKey and event.pressed and not event.echo) \
		or (event is InputEventMouseButton and event.pressed) \
		or (event is InputEventJoypadButton and event.pressed)
	if not pressed:
		return
	if event is InputEventKey and (event as InputEventKey).keycode == KEY_ESCAPE:
		_skip_all = true
	else:
		_skip_line = true
	get_viewport().set_input_as_handled()


func _wait(seconds: float) -> void:
	var t := 0.0
	while t < seconds and not _skip_all and not _skip_line:
		await get_tree().process_frame
		t += get_process_delta_time()
	_skip_line = false


func _tween(obj: Object, prop: String, value: Variant, time: float) -> void:
	var tw := create_tween()
	tw.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	tw.tween_property(obj, prop, value, maxf(0.01, time))
	await tw.finished

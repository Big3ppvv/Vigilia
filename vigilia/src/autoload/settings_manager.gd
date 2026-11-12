extends Node
## Settings: opciones persistentes en user://settings.cfg y controles remapeables.
##
## - Las acciones de entrada se registran aquí en tiempo de ejecución (no en
##   project.godot) para poder aplicar el remapeo guardado antes de cualquier escena.
## - Cada acción tiene UNA asignación principal de teclado/ratón (remapeable) y
##   asignaciones fijas de mando (JOY_DEFAULTS) en esta fase.
## - Valores cargados se validan por tipo y rango: un archivo manipulado o dañado
##   nunca deja el juego en un estado inválido.

signal changed

const PATH := "user://settings.cfg"
const VERSION := 1

## Acciones del juego y su asignación por defecto.
const ACTIONS := [
	{"id": "move_up", "label": "Mover arriba", "default": {"type": "key", "code": KEY_W}},
	{"id": "move_down", "label": "Mover abajo", "default": {"type": "key", "code": KEY_S}},
	{"id": "move_left", "label": "Mover izquierda", "default": {"type": "key", "code": KEY_A}},
	{"id": "move_right", "label": "Mover derecha", "default": {"type": "key", "code": KEY_D}},
	{"id": "aim_up", "label": "Apuntar arriba", "default": {"type": "key", "code": KEY_UP}},
	{"id": "aim_down", "label": "Apuntar abajo", "default": {"type": "key", "code": KEY_DOWN}},
	{"id": "aim_left", "label": "Apuntar izquierda", "default": {"type": "key", "code": KEY_LEFT}},
	{"id": "aim_right", "label": "Apuntar derecha", "default": {"type": "key", "code": KEY_RIGHT}},
	{"id": "shoot", "label": "Disparar (apuntar con ratón)", "default": {"type": "mouse", "code": MOUSE_BUTTON_LEFT}},
	{"id": "dodge", "label": "Esquivar", "default": {"type": "key", "code": KEY_SPACE}},
	{"id": "interact", "label": "Interactuar", "default": {"type": "key", "code": KEY_E}},
	{"id": "use_active", "label": "Usar recuerdo activo", "default": {"type": "key", "code": KEY_Q}},
	{"id": "inventory", "label": "Inventario y mapa", "default": {"type": "key", "code": KEY_TAB}},
	{"id": "pause", "label": "Pausa", "default": {"type": "key", "code": KEY_ESCAPE}},
]

## Valores por defecto. Clave "seccion/nombre".
const DEFAULTS := {
	"audio/master": 0.8,
	"audio/sfx": 0.8,
	"audio/music": 0.5,
	"video/fullscreen": false,
	"video/vsync": true,
	"video/lighting_strength": 0.9,
	"access/screen_shake": 1.0,
	"access/flashes": true,
	"access/reduced_particles": false,
	"access/damage_numbers": true,
	"access/hitstop": true,
	"access/ui_scale": 1.0,
	"access/high_contrast": false,
	"debug/show_fps": false,
}

const RANGES := {
	"audio/master": [0.0, 1.0],
	"audio/sfx": [0.0, 1.0],
	"audio/music": [0.0, 1.0],
	"video/lighting_strength": [0.0, 1.0],
	"access/screen_shake": [0.0, 1.0],
	"access/ui_scale": [0.75, 1.5],
}

var values := {}
var bindings := {}
var load_report := ""
## Ruta de persistencia activa (las pruebas la redirigen para no tocar la del jugador).
var active_path := PATH


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	values = DEFAULTS.duplicate()
	_reset_bindings_to_defaults()
	load_report = load_settings()
	ensure_audio_buses()
	apply_all()


# ---------------------------------------------------------------------------
# Acceso
# ---------------------------------------------------------------------------

func get_value(key: String) -> Variant:
	return values.get(key, DEFAULTS.get(key))


func set_value(key: String, v: Variant, persist: bool = true) -> void:
	if not DEFAULTS.has(key):
		push_warning("Settings: clave desconocida '%s'" % key)
		return
	values[key] = _validated(key, v)
	apply_all()
	if persist:
		save_settings()
	changed.emit()


var screen_shake: float:
	get:
		return float(get_value("access/screen_shake"))

var flashes: bool:
	get:
		return bool(get_value("access/flashes"))

var reduced_particles: bool:
	get:
		return bool(get_value("access/reduced_particles"))

var damage_numbers: bool:
	get:
		return bool(get_value("access/damage_numbers"))

var hitstop_enabled: bool:
	get:
		return bool(get_value("access/hitstop"))

var ui_scale: float:
	get:
		return float(get_value("access/ui_scale"))

var high_contrast: bool:
	get:
		return bool(get_value("access/high_contrast"))

var show_fps: bool:
	get:
		return bool(get_value("debug/show_fps"))


# ---------------------------------------------------------------------------
# Controles
# ---------------------------------------------------------------------------

func action_ids() -> Array:
	var out: Array = []
	for a in ACTIONS:
		out.append(a["id"])
	return out


func action_label(id: String) -> String:
	for a in ACTIONS:
		if a["id"] == id:
			return a["label"]
	return id


## Texto legible de la asignación actual de una acción.
func binding_label(id: String) -> String:
	var s := str(bindings.get(id, ""))
	return describe_binding(s)


static func describe_binding(s: String) -> String:
	if s.begins_with("key:"):
		var code := int(s.substr(4))
		var txt := OS.get_keycode_string(code)
		return txt if txt != "" else "Tecla %d" % code
	if s.begins_with("mouse:"):
		match int(s.substr(6)):
			MOUSE_BUTTON_LEFT:
				return "Clic izquierdo"
			MOUSE_BUTTON_RIGHT:
				return "Clic derecho"
			MOUSE_BUTTON_MIDDLE:
				return "Clic central"
			_:
				return "Botón ratón %s" % s.substr(6)
	return "—"


## Serializa un evento de teclado/ratón. Devuelve "" si no es asignable.
static func serialize_event(ev: InputEvent) -> String:
	if ev is InputEventKey:
		var k := ev as InputEventKey
		var code := k.physical_keycode if k.physical_keycode != KEY_NONE else k.keycode
		if code == KEY_NONE:
			return ""
		return "key:%d" % code
	if ev is InputEventMouseButton:
		return "mouse:%d" % (ev as InputEventMouseButton).button_index
	return ""


static func deserialize_event(s: String) -> InputEvent:
	if s.begins_with("key:"):
		var code := int(s.substr(4))
		if code <= 0:
			return null
		var k := InputEventKey.new()
		k.physical_keycode = code
		return k
	if s.begins_with("mouse:"):
		var b := int(s.substr(6))
		if b <= 0 or b > 9:
			return null
		var m := InputEventMouseButton.new()
		m.button_index = b
		return m
	return null


## Reasigna una acción. Si otra acción usaba esa tecla, se intercambian
## (evita conflictos silenciosos). Devuelve el id de la acción intercambiada o "".
func rebind(id: String, ev: InputEvent) -> String:
	var s := serialize_event(ev)
	if s == "" or not bindings.has(id):
		return ""
	var swapped := ""
	for other in bindings:
		if other != id and bindings[other] == s:
			bindings[other] = bindings[id]
			swapped = other
	bindings[id] = s
	apply_input_map()
	save_settings()
	changed.emit()
	return swapped


func reset_bindings() -> void:
	_reset_bindings_to_defaults()
	apply_input_map()
	save_settings()
	changed.emit()


func _reset_bindings_to_defaults() -> void:
	bindings.clear()
	for a in ACTIONS:
		var d: Dictionary = a["default"]
		bindings[a["id"]] = "%s:%d" % [d["type"], int(d["code"])]


func apply_input_map() -> void:
	for a in ACTIONS:
		var id: String = a["id"]
		if not InputMap.has_action(id):
			InputMap.add_action(id, 0.3)
		InputMap.action_erase_events(id)
		var ev := deserialize_event(str(bindings.get(id, "")))
		if ev != null:
			InputMap.action_add_event(id, ev)
		for jev in _joy_defaults(id):
			InputMap.action_add_event(id, jev)


func _joy_defaults(id: String) -> Array:
	var out: Array = []
	match id:
		"move_up":
			out.append(_joy_axis(JOY_AXIS_LEFT_Y, -1.0))
		"move_down":
			out.append(_joy_axis(JOY_AXIS_LEFT_Y, 1.0))
		"move_left":
			out.append(_joy_axis(JOY_AXIS_LEFT_X, -1.0))
		"move_right":
			out.append(_joy_axis(JOY_AXIS_LEFT_X, 1.0))
		"aim_up":
			out.append(_joy_axis(JOY_AXIS_RIGHT_Y, -1.0))
		"aim_down":
			out.append(_joy_axis(JOY_AXIS_RIGHT_Y, 1.0))
		"aim_left":
			out.append(_joy_axis(JOY_AXIS_RIGHT_X, -1.0))
		"aim_right":
			out.append(_joy_axis(JOY_AXIS_RIGHT_X, 1.0))
		"dodge":
			out.append(_joy_button(JOY_BUTTON_RIGHT_SHOULDER))
			out.append(_joy_button(JOY_BUTTON_A))
		"interact":
			out.append(_joy_button(JOY_BUTTON_X))
		"use_active":
			out.append(_joy_button(JOY_BUTTON_Y))
		"inventory":
			out.append(_joy_button(JOY_BUTTON_BACK))
		"pause":
			out.append(_joy_button(JOY_BUTTON_START))
	return out


static func _joy_axis(axis: JoyAxis, value: float) -> InputEventJoypadMotion:
	var e := InputEventJoypadMotion.new()
	e.axis = axis
	e.axis_value = value
	return e


static func _joy_button(button: JoyButton) -> InputEventJoypadButton:
	var e := InputEventJoypadButton.new()
	e.button_index = button
	return e


# ---------------------------------------------------------------------------
# Aplicación
# ---------------------------------------------------------------------------

func apply_all() -> void:
	apply_input_map()
	_apply_audio()
	_apply_video()
	if has_node("/root/EventBus"):
		EventBus.settings_applied.emit()


static func ensure_audio_buses() -> void:
	for bus_name in ["SFX", "Music"]:
		if AudioServer.get_bus_index(bus_name) == -1:
			AudioServer.add_bus()
			var idx := AudioServer.bus_count - 1
			AudioServer.set_bus_name(idx, bus_name)
			AudioServer.set_bus_send(idx, "Master")


func _apply_audio() -> void:
	ensure_audio_buses()
	var pairs := {"Master": "audio/master", "SFX": "audio/sfx", "Music": "audio/music"}
	for bus_name in pairs:
		var idx := AudioServer.get_bus_index(bus_name)
		if idx < 0:
			continue
		var v := float(get_value(pairs[bus_name]))
		AudioServer.set_bus_mute(idx, v <= 0.001)
		AudioServer.set_bus_volume_db(idx, linear_to_db(maxf(v, 0.0001)))


func _apply_video() -> void:
	if DisplayServer.get_name() == "headless":
		return
	var want_full := bool(get_value("video/fullscreen"))
	var mode := DisplayServer.window_get_mode()
	var is_full := mode == DisplayServer.WINDOW_MODE_FULLSCREEN or mode == DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN
	if want_full and not is_full:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
	elif not want_full and is_full:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED if bool(get_value("video/vsync")) else DisplayServer.VSYNC_DISABLED)


# ---------------------------------------------------------------------------
# Persistencia
# ---------------------------------------------------------------------------

## Carga ajustes. Devuelve "new", "ok" o "reset_corrupt".
func load_settings(path: String = "") -> String:
	if path == "":
		path = active_path
	values = DEFAULTS.duplicate()
	_reset_bindings_to_defaults()
	if not FileAccess.file_exists(path):
		return "new"
	var cfg := ConfigFile.new()
	var err := cfg.parse(FileUtil.read_text(path))
	if err != OK:
		push_warning("Settings: archivo dañado (%s); se restauran valores por defecto" % error_string(err))
		var dir := DirAccess.open(path.get_base_dir())
		if dir != null:
			dir.copy(path, path + ".corrupt")
		save_settings(path)
		return "reset_corrupt"
	for key in DEFAULTS:
		var parts: PackedStringArray = key.split("/")
		if cfg.has_section_key(parts[0], parts[1]):
			values[key] = _validated(key, cfg.get_value(parts[0], parts[1]))
	for a in ACTIONS:
		var id: String = a["id"]
		if cfg.has_section_key("controls", id):
			var s := str(cfg.get_value("controls", id))
			if deserialize_event(s) != null:
				bindings[id] = s
	return "ok"


func save_settings(path: String = "") -> bool:
	if path == "":
		path = active_path
	var cfg := ConfigFile.new()
	cfg.set_value("meta", "version", VERSION)
	for key in values:
		var parts: PackedStringArray = str(key).split("/")
		cfg.set_value(parts[0], parts[1], values[key])
	for id in bindings:
		cfg.set_value("controls", id, bindings[id])
	return FileUtil.atomic_write_text(path, cfg.encode_to_text())


func _validated(key: String, v: Variant) -> Variant:
	var def: Variant = DEFAULTS[key]
	if typeof(def) == TYPE_BOOL:
		if typeof(v) == TYPE_BOOL:
			return v
		if typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT:
			return v != 0
		return def
	if typeof(def) == TYPE_FLOAT:
		if typeof(v) != TYPE_FLOAT and typeof(v) != TYPE_INT:
			return def
		var f := float(v)
		if is_nan(f) or is_inf(f):
			return def
		if RANGES.has(key):
			f = clampf(f, float(RANGES[key][0]), float(RANGES[key][1]))
		return f
	return v

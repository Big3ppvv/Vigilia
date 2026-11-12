class_name CandleLighting
extends Node2D
## Luz de vela del mundo. El HUD vive en otro CanvasLayer y conserva sus colores.
## Una textura compartida y un número fijo de luces evitan costes por proyectil.

const MAX_PILLAR_LIGHTS := 1
const AMBIENT := Color(0.48, 0.46, 0.58)

static var _glow: GradientTexture2D

var world: CombatWorld
var ambient: CanvasModulate
var player_light: PointLight2D
var room_lights: Array[PointLight2D] = []
var _time := 0.0
var _strength := 0.0


func _ready() -> void:
	ambient = CanvasModulate.new()
	add_child(ambient)
	player_light = _make_light(Vector2.ZERO, 3.0)
	player_light.color = Color(1.0, 0.87, 0.68)
	Settings.changed.connect(_apply_settings)
	EventBus.room_entered.connect(_on_room_entered)
	_apply_settings()


static func glow_texture() -> GradientTexture2D:
	if _glow == null:
		var gradient := Gradient.new()
		gradient.offsets = PackedFloat32Array([0.0, 0.18, 0.55, 1.0])
		gradient.colors = PackedColorArray([Color.WHITE, Color(1, 1, 1, 0.85), Color(1, 1, 1, 0.28), Color(1, 1, 1, 0)])
		_glow = GradientTexture2D.new()
		_glow.width = 256
		_glow.height = 256
		_glow.gradient = gradient
		_glow.fill = GradientTexture2D.FILL_RADIAL
		_glow.fill_from = Vector2(0.5, 0.5)
		_glow.fill_to = Vector2(1.0, 0.5)
	return _glow


func _make_light(at: Vector2, size: float) -> PointLight2D:
	var light := PointLight2D.new()
	light.texture = glow_texture()
	light.texture_scale = size
	light.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	light.position = at
	light.color = Color(1.0, 0.72, 0.42)
	light.shadow_enabled = false
	add_child(light)
	return light


func _on_room_entered(_room: RoomData) -> void:
	for light in room_lights:
		remove_child(light)
		light.queue_free()
	room_lights.clear()
	if world == null or world.room == null:
		return
	var room := world.room
	# Dos parejas de velas superiores comparten luz: como máximo 7 luces de
	# sala + la del jugador, dentro del límite por objeto de OpenGL (8).
	var sources: Array = []
	if room.candles.size() >= 4:
		sources.append((room.candles[0] + room.candles[1]) * 0.5)
		sources.append((room.candles[2] + room.candles[3]) * 0.5)
	for i in range(4, room.candles.size()):
		sources.append(room.candles[i])
	for candle in sources:
		room_lights.append(_make_light(room.to_global(candle + Vector2(0, -16)), 2.0))
	var pillars := 0
	for y in RoomView.ROWS:
		for x in RoomView.COLS:
			if pillars < MAX_PILLAR_LIGHTS and room.grid.get_cell(Vector2i(x, y)) == RoomGrid.PILLAR:
				var at := Vector2(x, y) * RoomView.TILE + Vector2(32, 10)
				room_lights.append(_make_light(room.to_global(at), 1.25))
				pillars += 1
	_apply_settings()


func _apply_settings() -> void:
	_strength = float(Settings.get_value("video/lighting_strength"))
	# En alto contraste la penumbra se suaviza para leer enemigos y obstáculos.
	var darkness := _strength * (0.4 if Settings.high_contrast else 1.0)
	ambient.color = Color.WHITE.lerp(AMBIENT, darkness)
	player_light.enabled = _strength > 0.0
	player_light.energy = _strength * 0.75
	for light in room_lights:
		light.enabled = _strength > 0.0
		light.energy = _strength * 0.65


func _process(delta: float) -> void:
	_time += delta
	if world != null and is_instance_valid(world.player):
		player_light.global_position = world.player.global_position + Vector2(0, -18)
		player_light.visible = world.player.alive
	if _strength <= 0.0:
		return
	# Oscilación cosmética, sin consumir los flujos RNG de la partida.
	for i in room_lights.size():
		var flicker := 1.0
		if Settings.flashes:
			flicker += 0.035 * sin(_time * 3.1 + i * 1.7) + 0.02 * sin(_time * 7.3 + i)
		room_lights[i].energy = _strength * 0.65 * flicker

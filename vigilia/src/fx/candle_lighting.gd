class_name CandleLighting
extends Node2D
## La luz del mundo, que en VIGILIA es la vida.
##
## - Una sala de combate empieza DORMIDA: penumbra densa. Solo hay la luz de la
##   Espina (cuyo alcance depende de la llama que le queda), la de las velas
##   votivas que encienda y lo que brilla por sí mismo (ojos, disparos, peligros).
## - Al despertar (EventBus.room_awakened) la penumbra se retira con un fundido,
##   los apliques del muro se encienden y la sala queda en una luz cálida.
## - Con poca llama, la luz de la Espina se encoge, se enfría y tiembla.
##
## Presupuesto: 1 luz del jugador + hasta 3 velas votivas + 4 apliques = 8, el
## límite por objeto del renderizador de compatibilidad. Textura compartida.
## El HUD vive en otro CanvasLayer y conserva sus colores.

const DARK := Color(0.08, 0.075, 0.13)
const AWAKE := Color(0.6, 0.55, 0.56)
const AWAKE_WARD := Color(0.5, 0.56, 0.62)
const PLAYER_SCALE_MIN := 1.85
const PLAYER_SCALE_MAX := 3.3
const FADE_TIME := 1.4

static var _glow: GradientTexture2D

var world: CombatWorld
var ambient: CanvasModulate
var player_light: PointLight2D
var room_lights: Array[PointLight2D] = []
## 0 = sala dormida, 1 = despierta (interpolado durante el fundido).
var wake := 1.0
var _wake_target := 1.0
var _awake_color := AWAKE
var _time := 0.0
var _strength := 0.0


func _ready() -> void:
	ambient = CanvasModulate.new()
	add_child(ambient)
	player_light = _make_light(Vector2.ZERO, PLAYER_SCALE_MAX)
	player_light.color = Color(1.0, 0.84, 0.62)
	Settings.changed.connect(_apply_settings)
	EventBus.room_entered.connect(_on_room_entered)
	EventBus.room_awakened.connect(_on_room_awakened)
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


func _on_room_entered(room: RoomData) -> void:
	for light in room_lights:
		remove_child(light)
		light.queue_free()
	room_lights.clear()
	if world == null or world.room == null:
		return
	var view := world.room
	_awake_color = AWAKE_WARD if view.style == "ward" else AWAKE
	wake = 1.0 if view.awake else 0.0
	_wake_target = wake
	# Apliques agrupados por pared: 4 luces cubren los 8 apliques.
	var c: Array = view.candles
	if c.size() >= 8:
		var groups := [[c[0], c[1]], [c[2], c[3]], [c[4], c[6]], [c[5], c[7]]]
		for g in groups:
			var at: Vector2 = (g[0] + g[1]) * 0.5
			var light := _make_light(view.to_global(at + Vector2(0, -16)), 2.4)
			room_lights.append(light)
	_apply_settings()
	if room != null and not view.awake:
		_wake_target = 0.0


func _on_room_awakened(_room: RoomData, _by_light: bool) -> void:
	_wake_target = 1.0
	if world != null and world.room != null:
		world.room.awaken()


func _apply_settings() -> void:
	_strength = float(Settings.get_value("video/lighting_strength"))
	player_light.enabled = _strength > 0.0
	for light in room_lights:
		light.enabled = _strength > 0.0
	_update_ambient()


## La penumbra efectiva: interpolada entre dormida y despierta, escalada por el
## ajuste de intensidad. El alto contraste la suaviza para leer el combate.
func _update_ambient() -> void:
	var darkness := _strength * (0.45 if Settings.high_contrast else 1.0)
	var target := DARK.lerp(_awake_color, wake)
	ambient.color = Color.WHITE.lerp(target, darkness)


func _process(delta: float) -> void:
	_time += delta
	if wake != _wake_target:
		wake = move_toward(wake, _wake_target, delta / FADE_TIME)
		_update_ambient()
	var ratio := 1.0
	if world != null and is_instance_valid(world.player):
		var pl := world.player
		ratio = pl.flame_ratio()
		player_light.global_position = pl.global_position + Vector2(0, -14)
		player_light.visible = pl.alive
	if _strength <= 0.0:
		return
	var flick := 1.0
	if Settings.flashes:
		var low := 1.0 - smoothstep(0.2, 0.55, ratio)
		flick += (0.03 + 0.07 * low) * sin(_time * 7.1) + (0.02 + 0.05 * low) * sin(_time * 12.7 + 0.8)
	var sopor := 1.0
	if world != null and is_instance_valid(world.player) and world.player.status.has("drowsy"):
		sopor = 0.72
	player_light.texture_scale = lerpf(PLAYER_SCALE_MIN, PLAYER_SCALE_MAX, ratio) * flick * sopor
	player_light.energy = _strength * lerpf(0.75, 1.05, ratio)
	player_light.color = Color(0.72, 0.8, 1.0).lerp(Color(1.0, 0.84, 0.62), smoothstep(0.15, 0.5, ratio))
	for i in room_lights.size():
		var f := 1.0
		if Settings.flashes:
			f += 0.035 * sin(_time * 3.1 + i * 1.7) + 0.02 * sin(_time * 7.3 + i)
		room_lights[i].energy = _strength * 0.7 * f * wake

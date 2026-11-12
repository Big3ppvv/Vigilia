extends TestCase
## Integración: luces acotadas, cambios de sala, accesibilidad y RNG intacto.

var game: Node
var lighting: CandleLighting
var _settings: Dictionary


func before_each() -> void:
	_settings = Settings.values.duplicate()
	GameManager.current_run = GameManager.create_run({"seed": "LIGHT001"})
	game = load("res://scenes/game.tscn").instantiate()
	add_child(game)
	game.player.input = InputSource.new()
	lighting = game.world_root.get_node("CandleLighting")


func after_each() -> void:
	game.queue_free()
	await get_tree().process_frame
	Settings.values = _settings
	Settings.changed.emit()


func test_room_lights_are_bounded_and_replaced() -> void:
	var previous := lighting.room_lights.duplicate()
	assert_ge(previous.size(), 6, "velas del perímetro")
	var room: RoomData = game.layout.rooms_of_type("shop")[0]
	game.director.enter_room(room.coord, -1)
	assert_le(lighting.room_lights.size() + 1, 8, "límite de luces por objeto en OpenGL")
	for light in previous:
		assert_true(light.is_queued_for_deletion(), "luces anteriores retiradas")
	for light in lighting.room_lights:
		assert_eq(light.texture, lighting.player_light.texture, "textura compartida")


func test_lighting_can_be_disabled_and_respects_accessibility() -> void:
	Settings.set_value("video/lighting_strength", 1.0, false)
	var dark := lighting.ambient.color.r
	Settings.set_value("access/high_contrast", true, false)
	assert_true(lighting.ambient.color.r > dark, "alto contraste suaviza penumbra")
	Settings.set_value("access/flashes", false, false)
	lighting._process(0.1)
	var energy := lighting.room_lights[0].energy
	lighting._process(1.0)
	assert_near(lighting.room_lights[0].energy, energy, 0.0001, "sin parpadeo")
	Settings.set_value("video/lighting_strength", 0.0, false)
	assert_eq(lighting.ambient.color, Color.WHITE, "sin oscurecimiento")
	assert_false(lighting.player_light.enabled)
	for light in lighting.room_lights:
		assert_false(light.enabled)


func test_player_light_follows_without_consuming_combat_rng() -> void:
	var stream: RngStream = game.run.stream("combat")
	var state := stream.get_state()
	game.player.position = Vector2(300, 400)
	lighting._process(0.5)
	assert_eq(lighting.player_light.global_position, Vector2(300, 382))
	assert_eq(stream.get_state(), state, "la luz no altera la simulación")
	assert_eq((game.projectiles.material as CanvasItemMaterial).light_mode, CanvasItemMaterial.LIGHT_MODE_UNSHADED, "proyectiles legibles")

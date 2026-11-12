extends TestCase
## La luz es la vida: penumbra de salas dormidas, despertar, luz ligada a la
## llama, límite de luces, accesibilidad y RNG intacto.

var game: Node
var lighting: CandleLighting
var _settings: Dictionary


func before_each() -> void:
	_settings = Settings.values.duplicate()
	Settings.set_value("video/lighting_strength", 1.0, false)
	Settings.set_value("access/high_contrast", false, false)
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


func _combat_room() -> RoomData:
	for rd in game.layout.sorted_rooms():
		if rd.type == "combat":
			return rd
	return null


func _count_lights(n: Node) -> int:
	var c := 1 if n is PointLight2D and (n as PointLight2D).enabled else 0
	for ch in n.get_children():
		c += _count_lights(ch)
	return c


func test_room_lights_are_bounded_and_replaced() -> void:
	var previous := lighting.room_lights.duplicate()
	assert_eq(previous.size(), 4, "apliques agrupados en 4 luces")
	var room: RoomData = game.layout.rooms_of_type("altar")[0]
	game.director.enter_room(room.coord, -1)
	for light in previous:
		assert_true(light.is_queued_for_deletion(), "luces anteriores retiradas")
	for light in lighting.room_lights:
		assert_eq(light.texture, lighting.player_light.texture, "textura compartida")
	# Peor caso: sala de combate con todas sus velas encendidas.
	var rd := _combat_room()
	game.director.enter_room(rd.coord, -1)
	for v in game.director.votives:
		v.ignite(true)
	await get_tree().process_frame
	assert_le(_count_lights(game.world_root), 8, "límite de luces por objeto en OpenGL")


func test_sleeping_room_is_dark_and_awakens() -> void:
	var rd := _combat_room()
	game.director.enter_room(rd.coord, -1)
	await get_tree().process_frame
	assert_near(lighting.wake, 0.0, 0.001, "la sala de combate empieza dormida")
	var dark := lighting.ambient.color.v
	for v in game.director.votives:
		v.ignite(true)
	await physics_frames(3)
	assert_false(game.director.combat_active, "todas las velas encendidas: la sala despierta")
	for i in 120:
		lighting._process(1.0 / 60.0)
	assert_near(lighting.wake, 1.0, 0.001, "la luz vuelve")
	assert_true(lighting.ambient.color.v > dark + 0.2, "la penumbra se retira")
	assert_true(game.world.room.awake, "los apliques se encienden")


func test_player_light_shrinks_with_flame() -> void:
	var pl: Player = game.player
	lighting._process(0.016)
	var full := lighting.player_light.texture_scale
	pl.hp = 1
	lighting._process(0.016)
	var low := lighting.player_light.texture_scale
	assert_true(low < full * 0.7, "con poca llama ves menos (%.2f -> %.2f)" % [full, low])
	assert_true(lighting.player_light.color.b > lighting.player_light.color.r * 0.8, "la luz se enfría")


func test_lighting_can_be_disabled_and_respects_accessibility() -> void:
	var rd := _combat_room()
	game.director.enter_room(rd.coord, -1)
	await get_tree().process_frame
	var dark := lighting.ambient.color.r
	Settings.set_value("access/high_contrast", true, false)
	assert_true(lighting.ambient.color.r > dark, "alto contraste suaviza la penumbra")
	Settings.set_value("access/flashes", false, false)
	lighting._process(0.1)
	var scale := lighting.player_light.texture_scale
	lighting._process(1.0)
	assert_near(lighting.player_light.texture_scale, scale, 0.0001, "sin parpadeo")
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
	assert_eq(lighting.player_light.global_position, Vector2(300, 386))
	assert_eq(stream.get_state(), state, "la luz no altera la simulación")
	assert_eq((game.projectiles.material as CanvasItemMaterial).light_mode, CanvasItemMaterial.LIGHT_MODE_UNSHADED, "proyectiles legibles")
	assert_eq((game.player.material as CanvasItemMaterial).light_mode, CanvasItemMaterial.LIGHT_MODE_UNSHADED, "la llama brilla por sí misma")


func test_drowsiness_shrinks_light() -> void:
	lighting._process(0.016)
	var awake_scale := lighting.player_light.texture_scale
	game.world.apply_status(game.player, "drowsy", 1, 3.0, 1.0, 0, Team.ENEMY)
	lighting._process(0.016)
	assert_true(lighting.player_light.texture_scale < awake_scale * 0.8, "el sopor encoge la luz")

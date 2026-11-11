extends Node
## Recorrido de capturas REALES del juego (requiere render: usar xvfb-run en Linux
## sin pantalla). Guarda PNG en docs/screenshots/.
##
##   xvfb-run -a -s "-screen 0 1280x720x24" godot --path . --rendering-driver opengl3 \
##       res://tools/screenshot_tour.tscn
##
## No usa change_scene: instancia escenas como hijas para poder fotografiar cada paso.

const OUT := "res://docs/screenshots/"

var _game: Node


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT))
	SaveManager.load_profile("user://tour_profile.json")
	Settings.values["access/hitstop"] = false
	_run.call_deferred()


func _frames(n: int) -> void:
	for i in n:
		await get_tree().process_frame


func _shot(file_name: String) -> void:
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(OUT + file_name)
	print("[tour] ", file_name, " ", img.get_size())


func _sim(seconds: float) -> void:
	var frames := int(seconds * 60.0)
	for i in frames:
		await get_tree().physics_frame


func _run() -> void:
	# 1. Menú principal y selección.
	var menu: Control = load("res://scenes/main_menu.tscn").instantiate()
	add_child(menu)
	await _frames(40)
	await _shot("01_menu_principal.png")
	menu.call("_open_select")
	await _frames(10)
	await _shot("02_seleccion_personaje.png")
	menu.queue_free()
	await _frames(2)

	# 2. Partida con semilla fija.
	GameManager.current_run = GameManager.create_run({"seed": "VIGI-LIA1"})
	_game = load("res://scenes/game.tscn").instantiate()
	add_child(_game)
	await _frames(30)
	await _shot("03_sala_inicial.png")
	_game.bot_mode = true
	_game.set_autopilot(true)
	_game.player.god_mode = true
	for id in ["split_splinter", "candle_powder", "votive_bile", "rancid_communion"]:
		_game.player.inventory.add_item(id)
	# Avanza hasta encontrar combate.
	var guard := 0
	while _game.world.live_enemy_count() == 0 and guard < 3600:
		await get_tree().physics_frame
		guard += 1
	await _sim(1.6)
	await _shot("04_combate_sinergia_explosiva.png")
	await _sim(2.2)
	await _shot("05_combate_cadena_veneno_animas.png")

	# 3. Inventario y pausa.
	_game.toggle_inventory()
	await _frames(6)
	await _shot("06_inventario.png")
	_game.toggle_inventory()
	_game.toggle_pause()
	await _frames(6)
	await _shot("07_pausa.png")
	Settings.values["access/ui_scale"] = 1.3
	Settings.changed.emit()
	await _frames(6)
	await _shot("07b_pausa_escala_interfaz_130.png")
	Settings.values["access/ui_scale"] = 1.0
	Settings.changed.emit()
	await _frames(2)
	_game.pause_menu.call("_open_settings")
	await _frames(6)
	await _shot("08_ajustes.png")
	_game.toggle_pause()
	await _frames(2)

	# 4. Tienda del piso actual.
	var shop: Array = _game.layout.rooms_of_type("shop")
	if not shop.is_empty():
		_game.player.add_resources(20, 0, 0)
		_game.director.enter_room(shop[0].coord, FloorLayout.opposite(_dir_into(shop[0])))
		_game.set_autopilot(false)
		_game.player.input = InputSource.new()
		await _sim(1.0)
		_game.player.global_position = RoomGrid.tile_center(Vector2i(6, 4))
		await _sim(0.5)
		await _shot("09_tienda.png")

	# 5. Jefe final: piso 2, directo a su sala. Jugador inmóvil e invulnerable
	#    para fotografiar cada fase sin que el jefe muera antes de tiempo.
	_game.player.inventory.add_item("moth_eye")
	_game.player.inventory.add_item("moth_wing")
	_game.player.inventory.add_item("wing_dust")
	_game.start_floor(1)
	await _frames(4)
	_game.player.input = InputSource.new()
	_game.director.enter_room(_game.layout.boss, FloorLayout.opposite(_dir_into(_game.layout.get_room(_game.layout.boss))))
	_game.player.global_position = Vector2(480, 470)
	await _sim(3.5)
	await _shot("10_jefe_madre_cirio_fase1.png")
	var boss: Enemy = null
	for e in _game.world.enemies:
		if is_instance_valid(e) and e.is_boss:
			boss = e
	if boss != null:
		boss.hp = boss.max_hp * 0.6
		await _sim(4.0)
		await _shot("11_jefe_fase2_arena_transformada.png")
		boss.hp = boss.max_hp * 0.3
		var waited := 0
		while is_instance_valid(boss) and not (boss.state == "lasers" and boss.state_t > 1.6) and waited < 2400:
			await get_tree().physics_frame
			waited += 1
		await _shot("12_jefe_fase3_laseres.png")

	# 6. Pantalla de muerte.
	_game.player.god_mode = false
	_game.player.hp = 1
	var info := DamageInfo.create(1.0, Team.ENEMY, ["contact"])
	info.source_name = "Madre Cirio"
	_game.player.apply_damage(info)
	await get_tree().create_timer(2.0, true, false, true).timeout
	await _frames(10)
	await _shot("13_pantalla_muerte.png")
	SaveManager.load_profile(SaveManager.PROFILE_PATH)
	Audio.quit_game(0)


## Dirección de movimiento para entrar en una sala especial por su única puerta.
func _dir_into(rd: RoomData) -> int:
	for d in rd.doors:
		return FloorLayout.opposite(d)
	return 0

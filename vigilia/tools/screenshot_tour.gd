extends Node
## Recorrido de capturas REALES de una noche de VIGILIA (requiere render: usar
## xvfb-run en Linux sin pantalla). Guarda PNG en docs/screenshots/.
##
##   xvfb-run -a -s "-screen 0 1280x720x24" godot --path . --rendering-driver opengl3 \
##       res://tools/screenshot_tour.tscn
##
## No usa change_scene: instancia escenas como hijas para poder fotografiar cada paso.

const OUT := "res://docs/screenshots/"
const SEED := "VIGI-LIA1"

var _game: Node


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT))
	SaveManager.load_profile("user://tour_profile.json")
	Settings.values["access/hitstop"] = false
	_run.call_deferred()


func _shot(file_name: String) -> void:
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(OUT + file_name)
	print("[tour] ", file_name, " ", img.get_size())


func _wait(s: float) -> void:
	await get_tree().create_timer(s, true, false, true).timeout


func _first_room(type: String) -> RoomData:
	for rd in _game.layout.sorted_rooms():
		if rd.type == type:
			return rd
	return null


## Dirección de movimiento para entrar en una sala especial por su única puerta.
func _dir_into(rd: RoomData) -> int:
	for d in rd.doors:
		return FloorLayout.opposite(d)
	return 0


func _run() -> void:
	# 1. La habitación (menú) y la voz que abre la noche.
	var menu: Control = load("res://scenes/main_menu.tscn").instantiate()
	add_child(menu)
	await _wait(2.5)
	await _shot("01_la_habitacion.png")
	menu.queue_free()
	await _wait(0.2)
	GameManager.current_run = GameManager.create_run({"seed": SEED, "intro": true})
	_game = load("res://scenes/game.tscn").instantiate()
	add_child(_game)
	await _wait(4.2)
	await _shot("02_la_voz_de_fuera.png")
	while _game.story.playing:
		await get_tree().process_frame
	await _wait(2.0)
	await _shot("03_primera_sala.png")

	# 2. Una sala dormida: penumbra, ojos que brillan, velas por encender.
	var pl: Player = _game.player
	pl.god_mode = true
	pl.input = InputSource.new()
	var rd := _first_room("combat")
	_game.director.enter_room(rd.coord, 0)
	await _wait(1.6)
	await _shot("04_sala_dormida.png")
	var candles: Array = _game.director.votives
	pl.global_position = candles[0].global_position + Vector2(0, 26)
	await _wait(0.7)
	await _shot("05_encendiendo_una_vela.png")
	for c in candles:
		pl.global_position = c.global_position + Vector2(0, 26)
		while not c.lit:
			await get_tree().physics_frame
	await _wait(1.6)
	await _shot("06_la_sala_despierta.png")

	# 3. Recordar: la carta del recuerdo.
	_game.drop_item_pedestal("tangerines", pl.global_position + Vector2(60, 0))
	await _wait(0.3)
	for n in get_tree().get_nodes_in_group("pedestals"):
		if n is ItemPedestal and n.item_id == "tangerines":
			pl.global_position = n.global_position + Vector2(-40, 0)
			await _wait(0.5)
			await _shot("07_un_recuerdo.png")
			n.interact(pl)
	await _wait(0.8)
	await _shot("08_carta_del_recuerdo.png")

	# 4. La Cabecera: recordar cuesta llama.
	var altar := _first_room("altar")
	if altar != null:
		_game.director.enter_room(altar.coord, _dir_into(altar))
		await _wait(0.6)
		for n in get_tree().get_nodes_in_group("pedestals"):
			if n is ItemPedestal:
				pl.global_position = n.global_position + Vector2(0, 70)
				break
		await _wait(0.6)
		await _shot("09_la_cabecera.png")

	# 5. Inventario y pausa.
	_game.toggle_inventory()
	await _wait(0.2)
	await _shot("10_recuerdos.png")
	_game.toggle_inventory()
	_game.toggle_pause()
	await _wait(0.2)
	await _shot("11_la_vigilia_espera.png")
	_game.toggle_pause()

	# 6. La sala (piso 2): ovejas de la cuenta y poca llama.
	for id in ["candle_frost", "live_ember", "moth_eye"]:
		pl.inventory.add_item(id)
	_game.start_floor(1)
	await _wait(0.3)
	var rd2 := _first_room("combat")
	_game.director.enter_room(rd2.coord, 0)
	for i in 3:
		_game.world.spawn_enemy("sheep", RoomGrid.tile_center(Vector2i(4 + i * 3, 2)), {"spawn_time": 0.3})
	await _wait(1.2)
	_game.bot_mode = true
	_game.set_autopilot(true)
	await _wait(3.0)
	await _shot("12_ovejas_de_la_cuenta.png")
	_game.set_autopilot(false)
	pl.input = InputSource.new()
	_game.bot_mode = false
	pl.hp = 1
	await _wait(7.0)
	await _shot("13_el_arrullo.png")
	pl.hp = pl.max_hp()

	# 7. Madre Cirio.
	var boss_room: RoomData = _game.layout.get_room(_game.layout.boss)
	_game.director.enter_room(boss_room.coord, _dir_into(boss_room))
	pl.global_position = Vector2(480, 470)
	await _wait(3.2)
	await _shot("14_madre_cirio.png")
	var boss: Enemy = null
	for e in _game.world.enemies:
		if is_instance_valid(e) and e.is_boss:
			boss = e
	if boss != null:
		boss.hp = boss.max_hp * 0.3
		var waited := 0.0
		while is_instance_valid(boss) and not (boss.state == "lasers" and boss.state_t > 1.6) and waited < 40.0:
			await get_tree().process_frame
			waited += get_process_delta_time()
		await _shot("15_madre_cirio_fase3.png")

	# 8. Apagarse: la cuenta atrás y la hoja de la noche.
	pl.god_mode = false
	pl.hp = 1
	pl._hurt_iframes = 0.0
	pl._dodge_iframes = 0.0
	var info := DamageInfo.create(1.0, Team.ENEMY, ["contact"])
	info.source_name = "Madre Cirio"
	pl.apply_damage(info)
	await _wait(4.0)
	await _shot("16_el_arrullo_cuenta.png")
	while not _game.end_screen.visible:
		await get_tree().process_frame
	await _wait(1.6)
	await _shot("17_hoja_de_la_noche.png")
	_game.queue_free()
	await _wait(0.3)
	get_tree().paused = false

	# 9. Despertar.
	GameManager.current_run = GameManager.create_run({"seed": SEED})
	_game = load("res://scenes/game.tscn").instantiate()
	add_child(_game)
	await _wait(0.5)
	_game._victory()
	await _wait(5.5)
	await _shot("18_despertar.png")
	while not _game.end_screen.visible:
		await get_tree().process_frame
	await _wait(1.8)
	await _shot("19_despierta.png")
	SaveManager.load_profile(SaveManager.PROFILE_PATH)
	Audio.quit_game(0)

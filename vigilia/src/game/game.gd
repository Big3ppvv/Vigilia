extends Node2D
## Escena de juego: construye el mundo y orquesta la partida.
##
## Árbol (construido en código para mantener el contenido 100 % dirigido por datos):
##   Game (ALWAYS: recibe pausa/inventario aunque el árbol esté pausado)
##   ├─ World (PAUSABLE): RoomLayer, Decals, HazardField, EntityLayer (y-sort),
##   │                    ProjectileSystem, FxSystem, CameraRig, CandleLighting
##   ├─ CombatWorld, SynergyEngine, RoomDirector, DreamDirector (PAUSABLE)
##   ├─ Velo del sueño (CanvasLayer 1), HUD (10), Overlays y StoryOverlay (20)
##
## Cada partida es UNA NOCHE de vigilia: empieza con la voz de quien te vela,
## entre pisos la voz vuelve, si te apagas el Arrullo cuenta hacia atrás y, si
## llegas al final, despiertas.

var run: RunState
var world: CombatWorld
var engine: SynergyEngine
var projectiles: ProjectileSystem
var fx: FxSystem
var hazards: HazardField
var camera: CameraRig
var player: Player
var director: RoomDirector
var loot: LootManager
var layout: FloorLayout
var floor_def: Dictionary = {}
var world_root: Node2D
var room_layer: Node2D
var entity_layer: Node2D
var hud: Hud
var pause_menu: PauseMenu
var inventory_panel: InventoryPanel
var end_screen: EndScreen
var debug_overlay: DebugOverlay
var fade_rect: ColorRect
var veil: DreamVeil
var story: StoryOverlay
var dream: DreamDirector
var bot_mode := false
## La intro de la noche se reproduce al entrar desde el menú (no en pruebas).
var intro_pending := false
var ending := false
var _hitstop_active := false
var _prompt_target: Node = null
var _exit_portal: Node2D = null
var _boss: Enemy = null
var _human_input: InputSource = null


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	run = GameManager.current_run
	if run == null:
		run = GameManager.create_run({})
		GameManager.current_run = run
	intro_pending = bool(GameManager.last_config.get("intro", false))
	_build_world()
	_build_ui()
	_create_player()
	world.boss_killed.connect(_on_boss_killed)
	if intro_pending:
		story.cover(1.0, 0.01)
		player.controllable = false
	start_floor(0)
	if bool(GameManager.last_config.get("demo", false)):
		bot_mode = true
		set_autopilot(true)
	if intro_pending:
		_play_intro.call_deferred()


func _exit_tree() -> void:
	Engine.time_scale = 1.0


# ---------------------------------------------------------------------------
# Construcción
# ---------------------------------------------------------------------------

func _build_world() -> void:
	world_root = Node2D.new()
	world_root.name = "World"
	world_root.process_mode = Node.PROCESS_MODE_PAUSABLE
	add_child(world_root)
	room_layer = Node2D.new()
	room_layer.name = "RoomLayer"
	world_root.add_child(room_layer)
	hazards = HazardField.new()
	world_root.add_child(hazards)
	entity_layer = Node2D.new()
	entity_layer.name = "EntityLayer"
	entity_layer.y_sort_enabled = true
	world_root.add_child(entity_layer)
	projectiles = ProjectileSystem.new()
	world_root.add_child(projectiles)
	fx = FxSystem.new()
	world_root.add_child(fx)
	world_root.add_child(fx.decals)
	camera = CameraRig.new()
	world_root.add_child(camera)
	camera.make_current()

	world = CombatWorld.new()
	world.name = "CombatWorld"
	world.process_mode = Node.PROCESS_MODE_PAUSABLE
	add_child(world)
	engine = SynergyEngine.new()
	engine.name = "SynergyEngine"
	engine.process_mode = Node.PROCESS_MODE_PAUSABLE
	add_child(engine)
	director = RoomDirector.new()
	director.name = "RoomDirector"
	director.process_mode = Node.PROCESS_MODE_PAUSABLE
	add_child(director)
	dream = DreamDirector.new()
	dream.name = "DreamDirector"
	dream.process_mode = Node.PROCESS_MODE_PAUSABLE
	dream.game = self
	add_child(dream)

	world.run = run
	world.rng = run.stream("combat")
	world.drop_rng = run.floor_stream("drops")
	world.projectiles = projectiles
	world.fx = fx
	world.hazards = hazards
	world.engine = engine
	world.camera = camera
	world.entity_layer = entity_layer
	world.game = self
	var lighting := CandleLighting.new()
	lighting.name = "CandleLighting"
	lighting.world = world
	world_root.add_child(lighting)
	# Los avisos de peligro y los números de daño conservan su legibilidad.
	var emissive := CanvasItemMaterial.new()
	emissive.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
	projectiles.material = emissive
	hazards.material = emissive
	fx.material = emissive
	projectiles.world = world
	hazards.world = world
	engine.world = world
	engine.rng = run.stream("synergy")
	director.game = self
	director.world = world
	loot = LootManager.new(run)


func _build_ui() -> void:
	var vig_layer := CanvasLayer.new()
	vig_layer.layer = 1
	add_child(vig_layer)
	veil = DreamVeil.new()
	veil.game = self
	vig_layer.add_child(veil)

	var hud_layer := CanvasLayer.new()
	hud_layer.layer = 10
	add_child(hud_layer)
	hud = Hud.new()
	hud_layer.add_child(hud)
	hud.setup(self)

	var ov := CanvasLayer.new()
	ov.layer = 20
	add_child(ov)
	# Menús superpuestos bajo una raíz escalable: respetan "Escala de interfaz".
	var ov_root := ScaledRoot.new()
	ov_root.process_mode = Node.PROCESS_MODE_ALWAYS
	ov.add_child(ov_root)
	inventory_panel = InventoryPanel.new()
	ov_root.add_child(inventory_panel)
	inventory_panel.setup(self)
	pause_menu = PauseMenu.new()
	ov_root.add_child(pause_menu)
	pause_menu.setup(self)
	end_screen = EndScreen.new()
	ov_root.add_child(end_screen)
	end_screen.setup(self)
	debug_overlay = DebugOverlay.new()
	ov.add_child(debug_overlay)
	debug_overlay.setup(self)
	fade_rect = ColorRect.new()
	fade_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fade_rect.color = Color(0, 0, 0, 0)
	ov.add_child(fade_rect)
	director.fade = fade_rect
	story = StoryOverlay.new()
	ov.add_child(story)


func _create_player() -> void:
	player = Player.new()
	var cdef: Dictionary = ContentDB.characters.get(run.character_id, {})
	player.setup(world, cdef, engine)
	player.position = RoomView.center()
	entity_layer.add_child(player)
	world.player = player
	_human_input = player.input
	player.died.connect(_on_player_died)
	player.grant_starting_items()


# ---------------------------------------------------------------------------
# Pisos
# ---------------------------------------------------------------------------

func start_floor(index: int) -> void:
	run.floor_index = index
	floor_def = ContentDB.get_floor(index)
	if index > 0:
		ToleranceSystem.recompute_for_new_floor(run)
	var params := FloorParams.build(index, run)
	run.consume_floor_modifier("extra_treasure")
	world.floor_params = params
	world.drop_rng = run.floor_stream("drops")
	layout = DungeonGenerator.generate(run.seed_int, params)
	loot.fill_floor(layout, world.player_luck())
	_exit_portal = null
	_boss = null
	director.load_floor(layout, index)
	hud.set_layout(layout)
	EventBus.floor_entered.emit(index, str(floor_def.get("name", "")))
	if not intro_pending:
		announce_floor()
		Audio.play_music(str(floor_def.get("music", "nana")))


func announce_floor() -> void:
	EventBus.banner.emit(str(floor_def.get("name", "")), ContentDB.lore_line("floor_intros", run.floor_index), Palette.UI_ACCENT)


## La voz de quien vela abre la noche. Después, el título y la sala.
func _play_intro() -> void:
	Audio.stop_music()
	await story.play(night_lines(run.night), {"voice": "outside", "beep": true, "keep": true, "fade_in": 0.01})
	await story.play([], {"title": "Noche %d" % run.night, "subtitle": str(floor_def.get("name", "")), "keep": true})
	intro_pending = false
	Audio.play_music(str(floor_def.get("music", "nana")))
	await story.uncover(1.6)
	if player.alive and not ending:
		player.controllable = true
	announce_floor()


static func night_lines(night: int) -> Array:
	if night <= 1:
		return ContentDB.lore.get("first_night", [])
	var intros: Array = ContentDB.lore.get("night_intros", [])
	if night - 2 < intros.size():
		return intros[night - 2]
	return ContentDB.lore.get("night_generic", [])


func on_boss_spawned(e: Enemy) -> void:
	_boss = e
	var label := e.display_name + ("  ·  " + e.title if e.title != "" else "")
	EventBus.boss_started.emit(label, e.max_hp)
	EventBus.boss_health_changed.emit(e.hp, e.max_hp, e.get_phase())
	EventBus.banner.emit(e.display_name, e.title, Palette.WAX)
	dream.on_boss_started(e)
	Audio.play_music("boss")
	Audio.play("roar", -6.0)


func _on_boss_killed(e: Enemy) -> void:
	EventBus.boss_defeated.emit(e.enemy_id)
	for en in world.enemies.duplicate():
		if is_instance_valid(en) and en.alive and en != e:
			en.die(null)
	world.projectiles.clear_team(Team.ENEMY, true)
	Audio.play_music(str(floor_def.get("music", "nana")))


func on_boss_room_cleared() -> void:
	var rd := director.current
	rd.flags["exit_open"] = true
	if not rd.reward_given:
		rd.reward_given = true
		_spawn_boss_rewards(rd)
	spawn_exit_portal()


func _spawn_boss_rewards(rd: RoomData) -> void:
	var reward := str(floor_def.get("boss_reward", "single"))
	var rng := run.floor_stream("boss_reward")
	var tiles: Array = [Vector2i(7, 4)] if reward != "choice2" else [Vector2i(5, 4), Vector2i(9, 4)]
	for t in tiles:
		var id := loot.roll_item("boss", rng, world.player_luck())
		var entry := {"tile": t, "pool": "boss", "price": 0, "item_id": id, "taken": false,
			"group": 0 if tiles.size() > 1 else -1, "consumable": false}
		rd.pedestals.append(entry)
		var node := ItemPedestal.new()
		node.position = RoomGrid.tile_center(t) + Vector2(0, 14)
		node.setup(world, entry)
		entity_layer.add_child(node)
	world.spawn_pickup("heart", RoomGrid.tile_center(Vector2i(7, 2)))
	if tiles.size() > 1:
		EventBus.toast.emit("Dos recuerdos: solo puedes quedarte con uno", Palette.UI_ACCENT)


func spawn_exit_portal() -> void:
	if _exit_portal != null and is_instance_valid(_exit_portal):
		return
	var portal := ExitPortal.new()
	portal.world = world
	portal.is_final = run.floor_index + 1 >= ContentDB.floor_count()
	portal.position = RoomGrid.tile_center(Vector2i(7, 6)) + Vector2(0, 10)
	entity_layer.add_child(portal)
	_exit_portal = portal


func request_next_floor() -> void:
	if ending or director.transitioning:
		return
	if run.floor_index + 1 >= ContentDB.floor_count():
		_victory()
		return
	director.transitioning = true
	player.controllable = false
	run.player_snapshot = player.snapshot()
	# Entre pisos vuelve la voz de fuera.
	var interludes: Array = ContentDB.lore.get("interludes", [])
	var lines: Array = interludes[run.floor_index] if run.floor_index < interludes.size() else []
	await story.play(lines, {"voice": "outside", "beep": true, "keep": true})
	start_floor(run.floor_index + 1)
	await story.uncover(1.0)
	if player.alive:
		player.controllable = true
	director.transitioning = false


## Despertar: fundido a blanco, la habitación real y la hoja de la noche.
func _victory() -> void:
	ending = true
	player.controllable = false
	Audio.music_wake()
	var summary := GameManager.end_run("victory", {"ending": str(ContentDB.lore.get("victory_chart", ""))})
	await story.cover(1.0, 1.8, true)
	get_tree().paused = true
	await story.play(ContentDB.lore.get("victory", []), {"voice": "ink", "white": true, "keep": true, "fade_in": 0.01})
	await story.play([], {"title": str(ContentDB.lore.get("credits", "")), "white": true, "keep": true, "fade_in": 0.01})
	end_screen.show_summary(summary, true)
	await story.uncover(1.4)


## Apagarse: el Arrullo cuenta hacia atrás y la voz de fuera se despide hasta mañana.
func _on_player_died() -> void:
	if ending:
		return
	ending = true
	Engine.time_scale = 0.35
	Audio.music_fall_asleep()
	await get_tree().create_timer(1.1, true, false, true).timeout
	Engine.time_scale = 1.0
	var epitaph := ContentDB.lore_line("epitaphs", run.kills + run.floor_index * 3 + run.night)
	var summary := GameManager.end_run("death", {"epitaph": epitaph})
	get_tree().paused = true
	await story.play(ContentDB.lore.get("countdown", []), {"voice": "lullaby", "pace": 0.5, "keep": true, "fade_in": 1.4})
	var after: Array = ContentDB.lore.get("after_death", [])
	var lines: Array = after[posmod(run.night - 1, after.size())] if not after.is_empty() else []
	await story.play(lines, {"voice": "outside", "beep": true, "keep": true, "fade_in": 0.01})
	end_screen.show_summary(summary, false)
	await story.uncover(1.2)


# ---------------------------------------------------------------------------
# Interacción y servicios para otros sistemas
# ---------------------------------------------------------------------------

func try_interact(pl: Player) -> void:
	var best := _nearest_interactable(pl.global_position, 70.0)
	if best != null:
		best.interact(pl)


func _nearest_interactable(pos: Vector2, max_d: float) -> Node2D:
	var best: Node2D = null
	var bd := max_d
	for n in get_tree().get_nodes_in_group("interactables"):
		if not is_instance_valid(n) or n.is_queued_for_deletion():
			continue
		var d := pos.distance_to((n as Node2D).global_position)
		if d < bd:
			bd = d
			best = n
	return best


func on_pedestal_group_taken(ped: ItemPedestal) -> void:
	for n in get_tree().get_nodes_in_group("pedestals"):
		if n != ped and is_instance_valid(n) and not n.is_queued_for_deletion() and n.group == ped.group and not n.taken:
			n.vanish()


func drop_item_pedestal(item_id: String, pos: Vector2, active_charge: int = -1) -> void:
	if director.current == null:
		return
	var p := pos.clamp(Vector2(40, 40), Vector2(920, 536))
	if world.room != null and not world.room.grid.is_walkable(RoomGrid.world_to_tile(p)):
		p = world.room.grid.nearest_walkable_pos(p)
	var entry := {"pos": p, "pool": "", "price": 0, "item_id": item_id, "taken": false, "group": -1, "consumable": false}
	if active_charge >= 0:
		entry["active_charge"] = active_charge
	director.current.pedestals.append(entry)
	var node := ItemPedestal.new()
	node.position = p
	node.setup(world, entry)
	entity_layer.add_child(node)


func reveal_map(secrets: bool) -> void:
	if layout == null:
		return
	for c in layout.rooms:
		var rd: RoomData = layout.rooms[c]
		if rd.type == "secret" and not secrets:
			continue
		rd.known = true
	hud.refresh_minimap()
	EventBus.toast.emit("El mapa del piso se revela", Palette.UI_ACCENT)


func hitstop(duration: float) -> void:
	if bot_mode or not Settings.hitstop_enabled or _hitstop_active or ending:
		return
	_hitstop_active = true
	Engine.time_scale = 0.08
	await get_tree().create_timer(duration, true, false, true).timeout
	if not ending:
		Engine.time_scale = 1.0
	_hitstop_active = false


## Golpe recibido: la imagen se oscurece y se enfría un instante (no rojo).
func flash_damage() -> void:
	veil.hurt_pulse()


## Piloto automático (F8): usa BotInput para jugar solo. Herramienta de
## depuración y base de las pruebas de humo.
func set_autopilot(enabled: bool) -> void:
	if enabled:
		player.input = BotInput.new(self)
		EventBus.toast.emit("Piloto automático: ON (F8)", Palette.UI_DIM)
	else:
		player.input = _human_input if _human_input != null else HumanInput.new()
		EventBus.toast.emit("Piloto automático: OFF", Palette.UI_DIM)


# ---------------------------------------------------------------------------
# Bucle y entrada
# ---------------------------------------------------------------------------

func _physics_process(delta: float) -> void:
	if get_tree().paused or player == null:
		return
	if not ending and player.alive:
		run.elapsed += delta
	_update_prompt()


func _update_prompt() -> void:
	if _prompt_target != null and not is_instance_valid(_prompt_target):
		_prompt_target = null
	var best := _nearest_interactable(player.global_position, 70.0) if player.alive else null
	if best != _prompt_target:
		_prompt_target = best
		if best != null:
			var pr: Array = best.prompt()
			EventBus.interact_prompt.emit(str(pr[0]), str(pr[1]))
		else:
			EventBus.interact_prompt.emit("", "")


func _unhandled_input(event: InputEvent) -> void:
	if ending:
		return
	if story.playing:
		return
	if event.is_action_pressed("pause"):
		if inventory_panel.visible:
			toggle_inventory()
		else:
			toggle_pause()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("inventory"):
		if not pause_menu.visible:
			toggle_inventory()
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and event.pressed and not event.echo:
		var k := (event as InputEventKey).keycode
		if k == KEY_F3:
			debug_overlay.visible = not debug_overlay.visible
		elif k == KEY_F4:
			debug_overlay.toggle_profiler()
		elif k == KEY_F8 and not get_tree().paused:
			set_autopilot(not (player.input is BotInput))


func toggle_pause() -> void:
	if pause_menu.visible:
		pause_menu.close()
		get_tree().paused = false
	else:
		pause_menu.open()
		get_tree().paused = true


func toggle_inventory() -> void:
	if inventory_panel.visible:
		inventory_panel.close()
		get_tree().paused = false
	else:
		inventory_panel.open()
		get_tree().paused = true


func restart_run(same_seed: bool) -> void:
	if run.result == "":
		GameManager.end_run("abandon")
	if same_seed:
		GameManager.restart_same_seed()
	else:
		GameManager.restart_new_seed()


func abandon_run() -> void:
	if run.result == "":
		GameManager.end_run("abandon")
	GameManager.goto_main_menu()

extends TestCase
## Generación procedural: validez, determinismo y alcanzabilidad sobre cientos de semillas.

const SEEDS := 300


func _params(floor_index: int) -> Dictionary:
	return FloorParams.build(floor_index)


func test_many_seeds_are_valid() -> void:
	var fallbacks := 0
	var max_attempts := 0
	for fi in ContentDB.floor_count():
		var params := _params(fi)
		for s in SEEDS:
			var seed_int := SeedUtil.seed_to_int("T%05d" % s)
			var layout := DungeonGenerator.generate(seed_int, params)
			var errs := DungeonGenerator.validate(layout, params)
			if not errs.is_empty():
				fail("piso %d semilla %d: %s" % [fi, s, ", ".join(errs)])
				return
			if layout.attempts > DungeonGenerator.MAX_ATTEMPTS:
				fallbacks += 1
			max_attempts = maxi(max_attempts, layout.attempts)
			for c in layout.rooms:
				var rd: RoomData = layout.rooms[c]
				assert_eq(rd.layout.size(), 9, "plantilla asignada en %s" % c)
				if rd.type == "combat" and rd.spawns.is_empty():
					fail("sala de combate sin enemigos (semilla %d)" % s)
				if rd.type == "boss":
					assert_eq(rd.boss_id, str(params["boss"]), "jefe asignado")
				if rd.type == "treasure" and rd.pedestals.is_empty():
					fail("tesoro sin pedestal")
			assert_true(layout.has_secret, "sala secreta presente")
	assert_eq(fallbacks, 0, "ningún piso de respaldo")
	print("      (máximo de intentos de generación observado: %d)" % max_attempts)


func test_same_seed_produces_identical_floor() -> void:
	var params := _params(0)
	for s in 25:
		var seed_int := SeedUtil.seed_to_int("DET%03d" % s)
		var a := JSON.stringify(DungeonGenerator.generate(seed_int, params).serialize())
		var b := JSON.stringify(DungeonGenerator.generate(seed_int, params).serialize())
		assert_eq(a, b, "semilla %d" % s)


func test_different_seeds_produce_different_floors() -> void:
	var params := _params(0)
	var seen := {}
	var n := 100
	for s in n:
		var txt := JSON.stringify(DungeonGenerator.generate(SeedUtil.seed_to_int("V%03d" % s), params).serialize())
		seen[txt] = true
	assert_ge(seen.size(), int(n * 0.97), "variedad de pisos")


func test_floors_of_same_run_differ() -> void:
	var seed_int := SeedUtil.seed_to_int("RUNA")
	var a := DungeonGenerator.generate(seed_int, _params(0)).serialize()
	var b := DungeonGenerator.generate(seed_int, _params(1)).serialize()
	assert_ne(JSON.stringify(a), JSON.stringify(b))


func test_boss_is_far_leaf_and_specials_are_leaves() -> void:
	var params := _params(1)
	for s in 60:
		var layout := DungeonGenerator.generate(SeedUtil.seed_to_int("B%03d" % s), params)
		var dist := layout.distances_from(layout.start, false)
		assert_ge(int(dist[layout.boss]), int(params["min_boss_distance"]), "distancia del jefe")
		for c in layout.rooms:
			var rd: RoomData = layout.rooms[c]
			if rd.type in ["boss", "treasure", "altar"]:
				assert_eq(rd.door_count(true), 1, "%s es hoja" % rd.type)


func test_secret_room_only_reachable_through_hidden_doors() -> void:
	var params := _params(0)
	for s in 60:
		var layout := DungeonGenerator.generate(SeedUtil.seed_to_int("S%03d" % s), params)
		var vis := layout.distances_from(layout.start, false)
		assert_false(vis.has(layout.secret), "no visible")
		var hidden_in := 0
		for c in layout.rooms:
			for d in layout.rooms[c].doors:
				var door: Dictionary = layout.rooms[c].doors[d]
				if door["hidden"]:
					hidden_in += 1
					assert_eq(door["to"], layout.secret, "las puertas ocultas llevan a la secreta")
		assert_ge(hidden_in, 2, "al menos 2 accesos ocultos")


func test_extra_treasure_modifier_changes_generation() -> void:
	var params := _params(0)
	var expected := int(params.get("treasure", 1)) + 1
	params["extra_treasure"] = 1
	for s in 40:
		var layout := DungeonGenerator.generate(SeedUtil.seed_to_int("X%03d" % s), params)
		assert_eq(layout.rooms_of_type("treasure").size(), expected, "tesoro extra")


func test_no_locked_doors() -> void:
	for fi in ContentDB.floor_count():
		var layout := DungeonGenerator.generate(SeedUtil.seed_to_int("NOLOCK%d" % fi), _params(fi))
		for c in layout.rooms:
			for d in layout.rooms[c].doors:
				assert_false(bool(layout.rooms[c].doors[d].get("locked", false)), "sin cerraduras: no hay llaves")


## Cada sala de combate tiene 2-3 velas votivas en suelo libre, lejos de las
## apariciones y de los accesos de puerta, y repartidas (no amontonadas).
func test_votives_in_every_combat_room() -> void:
	for fi in ContentDB.floor_count():
		var params := _params(fi)
		for s in 80:
			var layout := DungeonGenerator.generate(SeedUtil.seed_to_int("VOT%03d" % s), params)
			for rd in layout.sorted_rooms():
				if rd.type != "combat":
					assert_true(rd.votives.is_empty(), "solo las salas de combate tienen velas")
					continue
				assert_true(rd.votives.size() >= 2 and rd.votives.size() <= 3, "2-3 velas (%d)" % rd.votives.size())
				var spawn_tiles := {}
				for sp in rd.spawns:
					spawn_tiles[sp["tile"]] = true
				var seen := {}
				for v in rd.votives:
					var t: Vector2i = v["tile"]
					assert_false(bool(v["lit"]), "empiezan apagadas")
					assert_eq(str(rd.layout[t.y])[t.x], ".", "sobre suelo libre")
					assert_false(spawn_tiles.has(t), "no sobre una aparición")
					assert_false(seen.has(t), "sin velas repetidas")
					seen[t] = true
				if rd.votives.size() >= 2:
					var a: Vector2i = rd.votives[0]["tile"]
					var b: Vector2i = rd.votives[1]["tile"]
					assert_ge(absi(a.x - b.x) + absi(a.y - b.y), 3, "repartidas por la sala")


func test_mirroring_keeps_templates_valid() -> void:
	var rows := ["ab.............", "...............", "...............", "...............", "...............", "...............", "...............", "...............", "..............c"]
	var m := DungeonGenerator._mirrored(rows, true, true)
	assert_eq(m[0][0], "c")
	assert_eq(m[8][13], "b")

extends TestCase
## Integridad del contenido de datos y de los scripts del proyecto.


func test_content_has_no_errors() -> void:
	ContentDB.reload()
	if not ContentDB.errors.is_empty():
		for e in ContentDB.errors:
			fail(e)
	assert_eq(ContentDB.errors.size(), 0)
	for w in ContentDB.warnings:
		print("      aviso: ", w)


func test_phase1_content_targets() -> void:
	var passives := 0
	var actives := 0
	for id in ContentDB.items:
		if ContentDB.items[id]["type"] == "active":
			actives += 1
		else:
			passives += 1
	assert_ge(passives + actives, 20, "al menos 20 objetos")
	assert_ge(actives, 1, "al menos un activo")
	var regular := 0
	var bosses := 0
	for id in ContentDB.enemies:
		if bool(ContentDB.enemies[id].get("boss", false)):
			bosses += 1
		else:
			regular += 1
	assert_ge(regular, 6, "6 enemigos distintos")
	assert_ge(bosses, 1, "al menos un jefe")
	assert_ge(ContentDB.rooms.size(), 20, "plantillas de habitación")
	assert_ge(ContentDB.floors.size(), 2, "pisos")
	print("      objetos=%d (activos %d) enemigos=%d jefes=%d plantillas=%d" % [passives + actives, actives, regular, bosses, ContentDB.rooms.size()])


func test_every_action_in_vocabulary_is_implemented() -> void:
	var methods := {}
	for m in (EffectActions as Script).get_script_method_list():
		methods[m["name"]] = true
	for a in EffectVocab.ACTIONS:
		assert_true(methods.has("act_" + a), "acción sin implementar: " + a)


func test_all_scripts_compile() -> void:
	var paths: Array = []
	_collect("res://src", paths)
	assert_ge(paths.size(), 30, "scripts encontrados")
	for p in paths:
		var s: Script = load(p)
		assert_true(s != null and s.can_instantiate(), "no compila: " + p)


func _collect(dir_path: String, out: Array) -> void:
	var dir := DirAccess.open(dir_path)
	if dir == null:
		return
	for f in dir.get_files():
		var fname := f.trim_suffix(".remap")
		if fname.ends_with(".gd"):
			out.append(dir_path + "/" + fname)
	for d in dir.get_directories():
		_collect(dir_path + "/" + d, out)

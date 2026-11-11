extends Node
## Ejecutor de pruebas automáticas.
##
## Uso (desde la raíz del proyecto):
##   godot --headless --path . res://tests/test_runner.tscn
##   godot --headless --path . res://tests/test_runner.tscn -- --filter=dungeon
##
## Descubre tests/unit/test_*.gd, ejecuta cada método test_* (admite corrutinas),
## imprime el resultado y sale con código 0 (todo OK) o 1 (algún fallo).
## Guarda además un informe JSON en user://test_report.json.

const UNIT_DIR := "res://tests/unit/"

var _results: Array = []


func _ready() -> void:
	_run.call_deferred()


func _run() -> void:
	var filter := ""
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--filter="):
			filter = a.substr(9)
	var files: Array = []
	var dir := DirAccess.open(UNIT_DIR)
	if dir == null:
		push_error("No se pudo abrir %s" % UNIT_DIR)
		get_tree().quit(2)
		return
	for f in dir.get_files():
		# En exportaciones los scripts pueden aparecer como .gd.remap / .gdc.
		var fname := f.trim_suffix(".remap")
		if fname.begins_with("test_") and fname.ends_with(".gd"):
			if filter == "" or fname.find(filter) >= 0:
				files.append(fname)
	files.sort()
	var t0 := Time.get_ticks_msec()
	var total := 0
	var failed := 0
	print("\n=== VIGILIA — pruebas automáticas (%d suites) ===" % files.size())
	for fname in files:
		var script: GDScript = load(UNIT_DIR + fname)
		if script == null or not script.can_instantiate():
			print("✗ %s: no se pudo cargar (error de análisis)" % fname)
			failed += 1
			total += 1
			_results.append({"suite": fname, "test": "<carga>", "ok": false, "errors": ["no compila"]})
			continue
		var suite: TestCase = script.new()
		add_child(suite)
		print("\n• %s" % fname.trim_suffix(".gd"))
		for m in suite.get_method_list():
			var mname: String = m["name"]
			if not mname.begins_with("test_"):
				continue
			total += 1
			suite._failures.clear()
			var ts := Time.get_ticks_msec()
			await suite.before_each()
			await suite.call(mname)
			await suite.after_each()
			var ms := Time.get_ticks_msec() - ts
			var ok: bool = suite._failures.is_empty()
			if not ok:
				failed += 1
				print("  ✗ %s (%d ms)" % [mname, ms])
				for e in suite._failures:
					print("      - %s" % e)
			else:
				print("  ✓ %s (%d ms)" % [mname, ms])
			_results.append({"suite": fname, "test": mname, "ok": ok, "ms": ms, "errors": suite._failures.duplicate()})
		suite.queue_free()
		await get_tree().process_frame
	var elapsed := Time.get_ticks_msec() - t0
	print("\n=== %d pruebas, %d fallidas, %d ms ===" % [total, failed, elapsed])
	var report := {"total": total, "failed": failed, "ms": elapsed, "engine": Engine.get_version_info()["string"], "results": _results}
	var f := FileAccess.open("user://test_report.json", FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify(report, "\t"))
		f.close()
	Audio.quit_game(1 if failed > 0 else 0)

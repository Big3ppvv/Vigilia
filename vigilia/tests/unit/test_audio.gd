extends TestCase
## La nana: partitura coherente y pistas que encajan en bucle.


func test_score_bars_are_complete() -> void:
	var beats := {}
	for n in Lullaby.MELODY:
		var bar := int(n[0])
		beats[bar] = float(beats.get(bar, 0.0)) + float(n[2])
		assert_true(float(n[1]) + float(n[2]) <= Lullaby.BEATS_PER_BAR + 0.001, "nota dentro de su compás")
	for bar in Lullaby.BARS:
		assert_near(float(beats.get(bar, 0.0)), float(Lullaby.BEATS_PER_BAR), 0.001, "compás %d completo" % (bar + 1))
	assert_eq(Lullaby.CHORDS.size(), Lullaby.BARS, "un acorde por compás")


func test_monitor_and_lullaby_share_tempo() -> void:
	# El pitido del monitor (menú) marca el pulso de la nana.
	assert_near(Lullaby.beat_len(), 60.0 / 66.0, 0.0001)
	var w := Lullaby.render("nana:pulse")
	var seconds := w.get_length()
	assert_near(seconds, Lullaby.loop_seconds(), 0.001, "el bucle dura 16 compases exactos")
	assert_eq(w.loop_mode, AudioStreamWAV.LOOP_FORWARD)
	# `data` devuelve una copia en cada acceso: leerla una sola vez.
	var data := w.data
	var peak := 0
	for i in range(0, data.size(), 64):
		peak = maxi(peak, absi(data.decode_s16(i)))
	assert_true(peak > 1000, "la pista suena")

extends TestCase
## Determinismo y calidad básica de los flujos aleatorios.


func test_fnv_reference_values() -> void:
	# Valores calculados de forma independiente (implementación de referencia en Python):
	# fijan el hash para que un cambio accidental rompa esta prueba y no las semillas de los jugadores.
	assert_eq(SeedUtil.fnv1a32(""), 2166136261)
	assert_eq(SeedUtil.fnv1a32("a"), 3826002220)
	assert_eq(SeedUtil.fnv1a32("vigilia:ABCDEFGH"), 286090188)
	assert_eq(SeedUtil.fnv1a32("vigilia:ÑANDÚ"), 70305040, "UTF-8 multibyte")


func test_seed_text_normalization() -> void:
	assert_eq(SeedUtil.normalize(" abcd-efgh "), "ABCDEFGH")
	assert_eq(SeedUtil.format_seed("abcdefgh"), "ABCD-EFGH")
	assert_eq(SeedUtil.seed_to_int("abcd-efgh"), SeedUtil.seed_to_int("ABCDEFGH"), "mismo entero con o sin formato")


func test_random_seed_uses_alphabet() -> void:
	for i in 50:
		var s := SeedUtil.random_seed_string()
		assert_eq(s.length(), SeedUtil.SEED_LENGTH)
		for c in s:
			assert_true(SeedUtil.ALPHABET.find(c) >= 0, "carácter fuera del alfabeto: " + c)


func test_same_seed_same_sequence() -> void:
	var a := RngStream.new(12345, "a")
	var b := RngStream.new(12345, "b")
	for i in 200:
		assert_eq(a.next_u32(), b.next_u32(), "paso %d" % i)


func test_derived_streams_are_independent() -> void:
	# Consumir números de un flujo no debe alterar otro flujo derivado de la misma semilla.
	var base := 777
	var loot_alone := RngStream.derived(base, "loot")
	var seq_alone: Array = []
	for i in 20:
		seq_alone.append(loot_alone.next_u32())
	var combat := RngStream.derived(base, "combat")
	var loot := RngStream.derived(base, "loot")
	var seq: Array = []
	for i in 20:
		combat.next_u32()
		combat.next_u32()
		seq.append(loot.next_u32())
	assert_eq(seq, seq_alone)
	assert_ne(RngStream.derived(base, "loot").next_u32(), RngStream.derived(base, "combat").next_u32())


func test_ranges_and_bounds() -> void:
	var r := RngStream.new(99)
	for i in 2000:
		var v := r.int_range(-3, 5)
		assert_true(v >= -3 and v <= 5, "int_range fuera de rango: %d" % v)
		var f := r.next_float()
		assert_true(f >= 0.0 and f < 1.0, "next_float fuera de rango")
	assert_eq(r.int_range(4, 4), 4)
	assert_eq(r.int_range(5, 2) >= 2, true, "acepta límites invertidos")
	assert_false(r.chance(0.0))
	assert_true(r.chance(1.0))


func test_weighted_pick_distribution() -> void:
	var r := RngStream.new(2024)
	var entries := [{"id": "a", "w": 1.0}, {"id": "b", "w": 3.0}, {"id": "zero", "w": 0.0}]
	var counts := {"a": 0, "b": 0, "zero": 0}
	var n := 20000
	for i in n:
		var e: Dictionary = r.pick_weighted(entries, "w")
		counts[e["id"]] += 1
	assert_eq(counts["zero"], 0, "peso 0 nunca sale")
	assert_near(float(counts["a"]) / n, 0.25, 0.02, "proporción de 'a'")
	assert_eq(r.pick_weighted([{"w": 0.0}], "w"), null, "total 0 => null")


func test_shuffle_is_permutation_and_deterministic() -> void:
	var a := [1, 2, 3, 4, 5, 6, 7, 8, 9]
	var b := a.duplicate()
	RngStream.new(5).shuffle(a)
	RngStream.new(5).shuffle(b)
	assert_eq(a, b)
	var s := a.duplicate()
	s.sort()
	assert_eq(s, [1, 2, 3, 4, 5, 6, 7, 8, 9])

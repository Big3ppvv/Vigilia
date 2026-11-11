extends TestCase
## Orden de operaciones y robustez del sistema de estadísticas.

var _ctx := {}


func _provider(key: String) -> float:
	return float(_ctx.get(key, 0.0))


func test_order_of_operations() -> void:
	var s := StatBlock.new({"damage": 10.0})
	s.add_modifier("damage", "flat", 2.0, "a")
	s.add_modifier("damage", "pct", 0.5, "b")
	s.add_modifier("damage", "pct", 0.5, "c")
	s.add_modifier("damage", "mult", 2.0, "d")
	s.add_modifier("damage", "final", 1.0, "e")
	# (10 + 2) * (1 + 0.5 + 0.5) * 2 + 1 = 49
	assert_near(s.get_stat("damage"), 49.0)


func test_negative_pct_floors_at_zero_multiplier() -> void:
	var s := StatBlock.new({"damage": 10.0})
	s.add_modifier("damage", "pct", -5.0, "x")
	# (1 + pct) se acota a 0 y el resultado al mínimo definido.
	assert_near(s.get_stat("damage"), StatDefs.DEFS["damage"]["min"])


func test_clamp_and_integer_rounding() -> void:
	var s := StatBlock.new()
	s.add_modifier("projectile_count", "flat", 100.0, "x")
	assert_eq(s.get_stat("projectile_count"), 16.0, "acotado al máximo")
	var t := StatBlock.new()
	t.add_modifier("projectile_count", "flat", 0.6, "y")
	assert_eq(t.get_stat("projectile_count"), 2.0, "entera redondeada")


func test_invalid_values_are_sanitized() -> void:
	var s := StatBlock.new()
	var before := s.get_stat("fire_rate")
	s.add_modifier("fire_rate", "flat", NAN, "nan")
	s.add_modifier("fire_rate", "mult", INF, "inf")
	assert_near(s.get_stat("fire_rate"), before, 0.0001, "NaN/INF no alteran la estadística")
	assert_true(s.add_modifier("no_existe", "flat", 1.0, "x").is_empty(), "estadística desconocida rechazada")
	assert_true(s.add_modifier("damage", "pow", 1.0, "x").is_empty(), "operación desconocida rechazada")


func test_temporary_modifiers_expire() -> void:
	var s := StatBlock.new({"fire_rate": 2.0})
	s.add_modifier("fire_rate", "pct", 0.5, "buff", {"duration": 1.0})
	assert_near(s.get_stat("fire_rate"), 3.0)
	s.tick(0.5)
	assert_near(s.get_stat("fire_rate"), 3.0, 0.0001, "aún activo")
	s.tick(0.6)
	assert_near(s.get_stat("fire_rate"), 2.0, 0.0001, "expirado")
	assert_eq(s.modifier_count(), 0)


func test_conditional_and_scaling_modifiers() -> void:
	_ctx = {"coins": 10.0, "hp_le_1": 0.0}
	var s := StatBlock.new({"damage": 10.0})
	s.context_provider = _provider
	s.add_modifier("damage", "pct", 0.03, "coin", {"per": "coins", "cap": 0.45})
	s.add_modifier("damage", "flat", 5.0, "desperate", {"condition": "hp_le_1"})
	assert_near(s.get_stat("damage"), 13.0, 0.0001, "+30% por 10 monedas")
	_ctx["coins"] = 100.0
	assert_near(s.get_stat("damage"), 14.5, 0.0001, "tope +45%")
	_ctx["hp_le_1"] = 1.0
	assert_near(s.get_stat("damage"), 21.75, 0.0001, "condicional activo: (10+5)*1.45")


func test_remove_by_source() -> void:
	var s := StatBlock.new({"damage": 3.0})
	s.add_modifier("damage", "flat", 1.0, "item:a")
	s.add_modifier("damage", "flat", 1.0, "item:a")
	s.add_modifier("damage", "flat", 1.0, "item:b")
	assert_eq(s.remove_modifiers_from("item:a"), 2)
	assert_near(s.get_stat("damage"), 4.0)


func test_snapshot_contains_all_stats() -> void:
	var snap := StatBlock.new().snapshot()
	for id in StatDefs.DEFS:
		assert_true(snap.has(id), id)

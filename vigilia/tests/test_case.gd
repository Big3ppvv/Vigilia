class_name TestCase
extends Node
## Base mínima de pruebas (sin dependencias externas).
## Cada método que empieza por "test_" es una prueba; puede ser una corrutina.
## Las aserciones registran fallos sin abortar el resto de la prueba.

var _failures: Array = []
var _asserts := 0


func before_each() -> void:
	pass


func after_each() -> void:
	pass


func assert_true(cond: bool, msg: String = "") -> void:
	_asserts += 1
	if not cond:
		_failures.append("se esperaba verdadero: " + msg)


func assert_false(cond: bool, msg: String = "") -> void:
	_asserts += 1
	if cond:
		_failures.append("se esperaba falso: " + msg)


func assert_eq(a: Variant, b: Variant, msg: String = "") -> void:
	_asserts += 1
	if typeof(a) != typeof(b) and not (_is_num(a) and _is_num(b)):
		_failures.append("tipos distintos (%s vs %s): %s" % [type_string(typeof(a)), type_string(typeof(b)), msg])
		return
	if a != b:
		_failures.append("%s != %s: %s" % [str(a).left(200), str(b).left(200), msg])


func assert_ne(a: Variant, b: Variant, msg: String = "") -> void:
	_asserts += 1
	if a == b:
		_failures.append("no debían ser iguales (%s): %s" % [str(a).left(200), msg])


func assert_near(a: float, b: float, eps: float = 0.0001, msg: String = "") -> void:
	_asserts += 1
	if absf(a - b) > eps:
		_failures.append("%f no ~= %f (eps %f): %s" % [a, b, eps, msg])


func assert_ge(a: float, b: float, msg: String = "") -> void:
	_asserts += 1
	if a < b:
		_failures.append("%s < %s: %s" % [str(a), str(b), msg])


func assert_le(a: float, b: float, msg: String = "") -> void:
	_asserts += 1
	if a > b:
		_failures.append("%s > %s: %s" % [str(a), str(b), msg])


func fail(msg: String) -> void:
	_asserts += 1
	_failures.append(msg)


## Avanza N frames de física (para pruebas que dependen de la simulación).
func physics_frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


func _is_num(v: Variant) -> bool:
	return typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT

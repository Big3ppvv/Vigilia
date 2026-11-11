class_name RngStream
extends RefCounted
## Flujo aleatorio determinista.
##
## Todos los métodos se construyen sobre randi() (PCG32 del motor) para que el
## resultado dependa únicamente del algoritmo base y no de helpers del motor que
## podrían cambiar entre versiones.
##
## REGLA DEL PROYECTO: la simulación nunca usa randf()/randi() globales; usa
## siempre un RngStream con etiqueta. Los nombres de los métodos evitan a propósito
## coincidir con funciones globales (randf, randi_range...) para que no exista
## ambigüedad de resolución que rompa el determinismo en silencio.

var label := ""
var seed_value := 0
var _rng := RandomNumberGenerator.new()


func _init(seed_int: int = 0, stream_label: String = "") -> void:
	seed_value = seed_int
	label = stream_label
	_rng.seed = seed_int


## Crea un flujo hijo independiente derivado de una semilla padre.
static func derived(parent_seed: int, stream_label: String) -> RngStream:
	return RngStream.new(SeedUtil.derive(parent_seed, stream_label), stream_label)


## Entero sin signo de 32 bits.
func next_u32() -> int:
	return _rng.randi()


## Flotante uniforme en [0, 1).
func next_float() -> float:
	return float(_rng.randi()) / 4294967296.0


func float_range(a: float, b: float) -> float:
	return a + (b - a) * next_float()


## Entero uniforme en [a, b] (ambos incluidos). El sesgo de módulo es despreciable
## para los rangos pequeños (< 2^16) que usa el juego.
func int_range(a: int, b: int) -> int:
	if b < a:
		var t := a
		a = b
		b = t
	var span := b - a + 1
	return a + int(_rng.randi() % span)


func chance(p: float) -> bool:
	if p <= 0.0:
		return false
	if p >= 1.0:
		return true
	return next_float() < p


## -1 o 1.
func rand_sign() -> int:
	return 1 if (_rng.randi() & 1) == 1 else -1


func pick(arr: Array) -> Variant:
	if arr.is_empty():
		return null
	return arr[_rng.randi() % arr.size()]


## Selección ponderada sobre un Array de Dictionary con una clave de peso.
## Pesos negativos o ausentes cuentan como 0. Devuelve null si el total es 0.
func pick_weighted(entries: Array, weight_key: String = "weight") -> Variant:
	var total := 0.0
	for e in entries:
		total += maxf(0.0, float(e.get(weight_key, 0.0)))
	if total <= 0.0:
		return null
	var r := next_float() * total
	for e in entries:
		r -= maxf(0.0, float(e.get(weight_key, 0.0)))
		if r < 0.0:
			return e
	return entries[entries.size() - 1]


## Barajado Fisher-Yates in situ.
func shuffle(arr: Array) -> void:
	for i in range(arr.size() - 1, 0, -1):
		var j := int(_rng.randi() % (i + 1))
		var tmp: Variant = arr[i]
		arr[i] = arr[j]
		arr[j] = tmp


## Dirección unitaria aleatoria.
func unit_vector() -> Vector2:
	return Vector2.RIGHT.rotated(next_float() * TAU)


func get_state() -> int:
	return _rng.state


func set_state(s: int) -> void:
	_rng.state = s

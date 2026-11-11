class_name SeedUtil
extends RefCounted
## Utilidades de semillas: texto legible <-> entero, y derivación de sub-semillas.
##
## Se usa un hash FNV-1a de 32 bits implementado aquí (y no String.hash()) porque
## la implementación interna del motor no está garantizada entre versiones: la
## reproducibilidad de una semilla no debe depender de detalles del motor.

## Alfabeto sin caracteres ambiguos (sin I, O, 0, 1) para semillas compartibles.
const ALPHABET := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const SEED_LENGTH := 8
const MASK32 := 0xFFFFFFFF


## Hash FNV-1a de 32 bits sobre los bytes UTF-8 del texto. Estable y sin desbordes:
## h < 2^32 y el primo < 2^25, así que el producto cabe en un int de 64 bits.
static func fnv1a32(text: String) -> int:
	var h := 2166136261
	for b in text.to_utf8_buffer():
		h = h ^ b
		h = (h * 16777619) & MASK32
	return h


## Deriva una sub-semilla independiente a partir de una semilla base y una etiqueta.
## Ejemplo: derive(run_seed, "f1:dungeon") y derive(run_seed, "f1:loot") producen
## flujos independientes: consumir números en uno no altera el otro.
static func derive(base_seed: int, label: String) -> int:
	return fnv1a32("%d/%s" % [base_seed, label])


## Normaliza el texto de una semilla introducida por el jugador.
static func normalize(text: String) -> String:
	return text.strip_edges().to_upper().replace(" ", "").replace("-", "")


## Formato legible "ABCD-EFGH" para semillas de 8 caracteres.
static func format_seed(s: String) -> String:
	var n := normalize(s)
	if n.length() == SEED_LENGTH:
		return n.substr(0, 4) + "-" + n.substr(4, 4)
	return n


## Convierte cualquier texto de semilla en el entero que alimenta los generadores.
static func seed_to_int(s: String) -> int:
	return fnv1a32("vigilia:" + normalize(s))


## Crea una semilla nueva. Es el ÚNICO punto que usa entropía no determinista.
static func random_seed_string() -> String:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var s := ""
	for i in SEED_LENGTH:
		s += ALPHABET[rng.randi() % ALPHABET.length()]
	return s

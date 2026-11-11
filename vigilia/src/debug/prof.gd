class_name Prof
extends RefCounted
## Perfilador ligero por secciones (microsegundos acumulados).
## Desactivado por defecto: el coste en producción es una comprobación booleana.
## Uso: var t := Prof.t0(); ...; Prof.add("seccion", t)

static var enabled := false
static var acc := {}
static var calls := {}


static func t0() -> int:
	return Time.get_ticks_usec() if enabled else 0


static func add(key: String, start_usec: int) -> void:
	if not enabled:
		return
	acc[key] = int(acc.get(key, 0)) + (Time.get_ticks_usec() - start_usec)
	calls[key] = int(calls.get(key, 0)) + 1


static func reset() -> void:
	acc.clear()
	calls.clear()


## Informe ordenado por coste total.
static func report(frames: int) -> String:
	var keys := acc.keys()
	keys.sort_custom(func(a: String, b: String) -> bool: return int(acc[a]) > int(acc[b]))
	var lines: Array = []
	for k in keys:
		lines.append("%-28s total %8.1f ms   por frame %6.3f ms   llamadas %d" % [k, acc[k] / 1000.0, acc[k] / 1000.0 / maxf(1.0, frames), calls[k]])
	return "\n".join(lines)

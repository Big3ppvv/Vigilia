class_name StatBlock
extends RefCounted
## Bloque de estadísticas con modificadores apilables.
##
## ORDEN DE OPERACIONES (canónico; ver docs/ARCHITECTURE.md §Estadísticas):
##   1. base                                 valor del personaje/enemigo
##   2. + Σ modificadores "flat"             aditivos sobre la base
##   3. × (1 + Σ modificadores "pct")        porcentajes; se suman entre sí
##   4. × Π modificadores "mult"             multiplicadores independientes
##   5. + Σ modificadores "final"            planos tras multiplicar
##   6. clamp(min, max) de StatDefs y redondeo si la estadística es entera
##
## Tipos de modificador según su vida:
##   permanentes (duration = -1), temporales (duration > 0, expiran en tick()),
##   condicionales ("condition": solo cuentan si el contexto la cumple) y
##   escalables ("per": el valor se multiplica por una magnitud del contexto,
##   p. ej. monedas; "cap" limita su aporte absoluto).
## Los valores NaN/INF se sanean y todo resultado queda acotado: ninguna
## combinación de objetos puede producir valores que rompan el motor.

const OPS := ["flat", "pct", "mult", "final"]

## Se incrementa en cada cambio estructural; la UI puede sondearlo barato.
var version := 0
## Callable(key: String) -> float. Condiciones: verdaderas si el valor > 0.5.
var context_provider: Callable = Callable()

var _base := {}
var _mods: Array = []
var _cache := {}
var _dirty := {}
var _volatile := {}


func _init(base_overrides: Dictionary = {}) -> void:
	for id in StatDefs.DEFS:
		_base[id] = StatDefs.default_value(id)
		_dirty[id] = true
	for id in base_overrides:
		set_base(str(id), float(base_overrides[id]))


func set_base(id: String, value: float) -> void:
	if not StatDefs.has(id):
		push_warning("StatBlock: estadística base desconocida '%s'" % id)
		return
	_base[id] = _sanitize(value, StatDefs.default_value(id))
	_touch(id)


func get_base(id: String) -> float:
	return float(_base.get(id, 0.0))


## Añade un modificador. `extra` admite: duration, condition, per, cap.
## Devuelve el diccionario del modificador (útil para retirarlo), o {} si es inválido.
func add_modifier(stat: String, op: String, value: float, source: String = "", extra: Dictionary = {}) -> Dictionary:
	if not StatDefs.has(stat):
		push_warning("StatBlock: estadística desconocida '%s' (fuente '%s')" % [stat, source])
		return {}
	if not op in OPS:
		push_warning("StatBlock: operación desconocida '%s' (fuente '%s')" % [op, source])
		return {}
	var neutral := 1.0 if op == "mult" else 0.0
	var v := _sanitize(value, neutral)
	if op == "mult":
		v = maxf(v, 0.0)
	var m := {
		"stat": stat,
		"op": op,
		"value": v,
		"source": source,
		"remaining": float(extra.get("duration", -1.0)),
		"condition": str(extra.get("condition", "")),
		"per": str(extra.get("per", "")),
		"cap": float(extra.get("cap", -1.0)),
	}
	if m["per"] != "" and op == "mult":
		push_warning("StatBlock: 'per' no se admite con 'mult' (fuente '%s'); se ignora 'per'" % source)
		m["per"] = ""
	if m["condition"] != "" or m["per"] != "":
		_volatile[stat] = int(_volatile.get(stat, 0)) + 1
	_mods.append(m)
	_touch(stat)
	return m


func remove_modifier(m: Dictionary) -> void:
	var idx := _mods.find(m)
	if idx >= 0:
		_remove_at(idx)


## Retira todos los modificadores de una fuente. Devuelve cuántos retiró.
func remove_modifiers_from(source: String) -> int:
	var removed := 0
	for i in range(_mods.size() - 1, -1, -1):
		if _mods[i]["source"] == source:
			_remove_at(i)
			removed += 1
	return removed


func count_modifiers_from(source: String) -> int:
	var n := 0
	for m in _mods:
		if m["source"] == source:
			n += 1
	return n


## Renueva la duración de los modificadores temporales de una fuente.
func refresh_duration(source: String, duration: float) -> void:
	for m in _mods:
		if m["source"] == source and float(m["remaining"]) > 0.0:
			m["remaining"] = maxf(float(m["remaining"]), duration)


## Avanza el tiempo: expira modificadores temporales.
func tick(delta: float) -> void:
	for i in range(_mods.size() - 1, -1, -1):
		var m: Dictionary = _mods[i]
		var rem: float = m["remaining"]
		if rem > 0.0:
			rem -= delta
			if rem <= 0.0:
				_remove_at(i)
			else:
				m["remaining"] = rem


func get_stat(id: String) -> float:
	if not StatDefs.has(id):
		return 0.0
	if _dirty.get(id, true) or int(_volatile.get(id, 0)) > 0:
		_cache[id] = _compute(id)
		_dirty[id] = false
	return float(_cache[id])


func get_int(id: String) -> int:
	return int(round(get_stat(id)))


## Instantánea de todas las estadísticas (para UI, resumen y pruebas).
func snapshot() -> Dictionary:
	var out := {}
	for id in StatDefs.DEFS:
		out[id] = get_stat(id)
	return out


func modifier_count() -> int:
	return _mods.size()


func _compute(id: String) -> float:
	var flat := 0.0
	var pct := 0.0
	var mult := 1.0
	var fin := 0.0
	for m in _mods:
		if m["stat"] != id:
			continue
		var cond: String = m["condition"]
		if cond != "" and _context(cond) <= 0.5:
			continue
		var v: float = m["value"]
		var per: String = m["per"]
		if per != "":
			v *= _context(per)
			var cap: float = m["cap"]
			if cap >= 0.0:
				v = clampf(v, -cap, cap)
		match m["op"]:
			"flat":
				flat += v
			"pct":
				pct += v
			"mult":
				mult *= v
			"final":
				fin += v
	var raw := (float(_base[id]) + flat) * maxf(0.0, 1.0 + pct) * mult + fin
	return _clamp_stat(id, raw)


func _clamp_stat(id: String, v: float) -> float:
	var def: Dictionary = StatDefs.DEFS[id]
	v = _sanitize(v, float(def["default"]))
	v = clampf(v, float(def["min"]), float(def["max"]))
	if bool(def.get("int", false)):
		v = roundf(v)
	return v


func _context(key: String) -> float:
	if context_provider.is_valid():
		var r: Variant = context_provider.call(key)
		if typeof(r) == TYPE_FLOAT or typeof(r) == TYPE_INT:
			return _sanitize(float(r), 0.0)
		if typeof(r) == TYPE_BOOL:
			return 1.0 if r else 0.0
	return 0.0


func _remove_at(idx: int) -> void:
	var m: Dictionary = _mods[idx]
	var stat: String = m["stat"]
	if m["condition"] != "" or m["per"] != "":
		_volatile[stat] = maxi(0, int(_volatile.get(stat, 0)) - 1)
	_mods.remove_at(idx)
	_touch(stat)


func _touch(stat: String) -> void:
	_dirty[stat] = true
	version += 1


static func _sanitize(v: float, fallback: float) -> float:
	if is_nan(v) or is_inf(v):
		return fallback
	return v

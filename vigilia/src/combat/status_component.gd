class_name StatusComponent
extends RefCounted
## Estados alterados de una entidad. Reglas (definidas en status_effects.json):
##   stacking "stack":   suma cargas hasta max_stacks; la duración se renueva al máximo.
##   stacking "refresh": una carga; la duración se renueva al máximo.
##   Resistencia: reduce la DURACIÓN proporcionalmente (owner.status_resistance()).
##   Inmunidad: el estado no se aplica.
##   Daño periódico: dps_per_stack * cargas * potencia, en ticks de `tick` segundos.
##     Los ticks NO emiten eventos "hit" (evita cadenas infinitas veneno->golpe->veneno);
##     sí cuentan para muertes ("kill").
##   Reacciones: si tras aplicar un estado coexisten los dos de una reacción,
##     se consumen y se dispara la reacción (p. ej. Escarcha + Quemadura).
## Orden de procesamiento por tick: duración -> daño periódico -> expiración.

var owner_ref: WeakRef
var active := {}
var immunities := {}


func _init(owner: Object) -> void:
	owner_ref = weakref(owner)


func apply(id: String, stacks: int, duration: float, power: float = 1.0, depth: int = 0, source_team: int = Team.PLAYER) -> bool:
	var def: Dictionary = ContentDB.statuses.get(id, {})
	if def.is_empty() or immunities.has(id):
		return false
	var owner: Object = owner_ref.get_ref()
	if owner == null:
		return false
	var res := 0.0
	if owner.has_method("status_resistance"):
		res = clampf(float(owner.status_resistance(id)), -1.0, 1.0)
	duration *= (1.0 - res)
	if duration <= 0.05:
		return false
	var max_st := int(def.get("max_stacks", 1))
	var cur: Dictionary = active.get(id, {})
	if cur.is_empty():
		cur = {"stacks": 0, "remaining": 0.0, "tick_t": 0.0, "power": power, "depth": depth, "team": source_team}
	if str(def.get("stacking", "refresh")) == "stack":
		cur["stacks"] = mini(max_st, int(cur["stacks"]) + maxi(1, stacks))
	else:
		cur["stacks"] = 1
	cur["remaining"] = maxf(float(cur["remaining"]), duration)
	cur["power"] = maxf(float(cur["power"]), power)
	cur["depth"] = mini(int(cur["depth"]), depth) if active.has(id) else depth
	active[id] = cur
	_check_reactions(id, owner)
	return true


func tick(delta: float) -> void:
	if active.is_empty():
		return
	var owner: Object = owner_ref.get_ref()
	if owner == null:
		return
	for id in active.keys():
		if not active.has(id):
			continue
		var st: Dictionary = active[id]
		var def: Dictionary = ContentDB.statuses.get(id, {})
		st["remaining"] = float(st["remaining"]) - delta
		var iv := float(def.get("tick", 0.0))
		if iv > 0.0 and def.has("dps_per_stack"):
			st["tick_t"] = float(st["tick_t"]) + delta
			while float(st["tick_t"]) >= iv:
				st["tick_t"] = float(st["tick_t"]) - iv
				var dmg := float(def["dps_per_stack"]) * int(st["stacks"]) * iv * float(st["power"])
				if def.has("moving_bonus") and owner.get("velocity") != null and (owner.get("velocity") as Vector2).length() > 25.0:
					dmg *= 1.0 + float(def["moving_bonus"])
				if owner.has_method("take_status_damage"):
					owner.take_status_damage(id, dmg, def.get("tags", []), int(st["depth"]), int(st["team"]))
				if not bool(owner.get("alive")):
					return
		if float(st["remaining"]) <= 0.0:
			active.erase(id)


func has(id: String) -> bool:
	return active.has(id)


func stacks(id: String) -> int:
	return int(active.get(id, {}).get("stacks", 0))


func active_ids() -> PackedStringArray:
	var out := PackedStringArray()
	for id in active:
		out.append(id)
	return out


func speed_mult() -> float:
	var m := 1.0
	for id in active:
		m *= float(ContentDB.statuses.get(id, {}).get("speed_mult", 1.0))
	return m


func action_speed_mult() -> float:
	var m := 1.0
	for id in active:
		m *= float(ContentDB.statuses.get(id, {}).get("action_speed_mult", 1.0))
	return m


func clear() -> void:
	active.clear()


func _check_reactions(new_id: String, owner: Object) -> void:
	for r in ContentDB.reactions:
		var a := str(r.get("a", ""))
		var b := str(r.get("b", ""))
		if (a == new_id or b == new_id) and active.has(a) and active.has(b):
			for c in r.get("consume", []):
				active.erase(str(c))
			if owner.has_method("on_reaction"):
				owner.on_reaction(r)
			return

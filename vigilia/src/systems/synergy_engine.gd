class_name SynergyEngine
extends Node
## Motor de sinergias emergentes basado en eventos.
##
## Modelo: los objetos declaran EFECTOS = disparador + filtro + acciones (JSON).
## Los sistemas emiten EVENTOS (hit, kill, explosion, hurt...). Las acciones
## producen nuevos eventos (una explosión genera "hit" con etiqueta "explosion",
## que otro objeto puede convertir en veneno, que otro convierte en aliados...).
## Ninguna combinación está programada: emergen de etiquetas compartidas.
##
## Protecciones (ver docs/SYNERGIES.md):
##   - Cola FIFO, sin recursión de pila: un evento emitido durante el
##     procesamiento se encola y se procesa después (orden predecible).
##   - MAX_DEPTH: cada acción derivada suma 1 de profundidad; por encima del
##     límite el evento se descarta (contador depth_capped).
##   - EVENT_BUDGET por frame de física: el excedente se difiere al frame siguiente.
##   - MAX_QUEUE: tope absoluto de la cola (contador dropped).
##   - proc_coef: las probabilidades se atenúan en cadenas (fragmentos, explosiones).
##   - "icd": enfriamiento interno por efecto.
## Orden de efectos dentro de un evento: prioridad (desc) y orden de adquisición.

const MAX_DEPTH := 4
const EVENT_BUDGET := 400
const MAX_QUEUE := 4000

var world: CombatWorld
var rng: RngStream
var counters := {"events": 0, "processed": 0, "actions": 0, "deferred": 0, "dropped": 0, "depth_capped": 0, "frame_peak": 0}
## Si true, guarda [disparador, profundidad] de cada evento procesado (pruebas).
var trace_enabled := false
var trace: Array = []

var _effects := {}
var _queue: Array = []
var _flushing := false
var _frame_events := 0
var _order := 0
var _time := 0.0
var _tick_t := 0.0


func _ready() -> void:
	process_physics_priority = 100


func register(def: Dictionary, source: String) -> Dictionary:
	var inst := make_instance(def, source)
	for t in triggers_of(def):
		if t == "acquire" or t == "use":
			continue
		if not _effects.has(t):
			_effects[t] = []
		var list: Array = _effects[t]
		list.append(inst)
		list.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
			return int(a["priority"]) > int(b["priority"]) or (int(a["priority"]) == int(b["priority"]) and int(a["order"]) < int(b["order"])))
	return inst


func make_instance(def: Dictionary, source: String) -> Dictionary:
	_order += 1
	return {"def": def, "source": source, "counter": 0, "icd_until": 0.0, "stacks": 1, "order": _order, "priority": int(def.get("priority", 0))}


func unregister_source(source: String) -> void:
	for t in _effects:
		var list: Array = _effects[t]
		for i in range(list.size() - 1, -1, -1):
			if list[i]["source"] == source:
				list.remove_at(i)


func listener_count(trigger: String) -> int:
	return _effects.get(trigger, []).size()


static func triggers_of(def: Dictionary) -> Array:
	var t: Variant = def.get("trigger", "")
	if typeof(t) == TYPE_ARRAY:
		return t
	return [t]


static func actions_of(def: Dictionary) -> Array:
	var out: Array = []
	if def.has("action"):
		out.append({"name": str(def["action"]), "params": def.get("params", {})})
	for a in def.get("actions", []):
		out.append({"name": str(a.get("action", "")), "params": a.get("params", {})})
	return out


func emit(trigger: String, ctx: Dictionary) -> void:
	counters["events"] += 1
	var list: Array = _effects.get(trigger, [])
	if list.is_empty():
		return
	if int(ctx.get("depth", 0)) > MAX_DEPTH:
		counters["depth_capped"] += 1
		return
	if _queue.size() >= MAX_QUEUE:
		counters["dropped"] += 1
		return
	_queue.append([trigger, ctx])
	if not _flushing:
		flush()


func flush() -> void:
	if _flushing:
		return
	_flushing = true
	var __pt := Prof.t0()
	while not _queue.is_empty():
		if _frame_events >= EVENT_BUDGET:
			counters["deferred"] += 1
			break
		var ev: Array = _queue.pop_front()
		_frame_events += 1
		counters["processed"] += 1
		if trace_enabled:
			trace.append([ev[0], int(ev[1].get("depth", 0))])
		var list: Array = _effects.get(ev[0], [])
		for inst in list.duplicate():
			run_effect(inst, ev[1])
	Prof.add("motor de sinergias", __pt)
	_flushing = false


func pending() -> int:
	return _queue.size()


func _physics_process(delta: float) -> void:
	_time += delta
	counters["frame_peak"] = maxi(int(counters["frame_peak"]), _frame_events)
	_frame_events = 0
	if not _queue.is_empty():
		flush()
	_tick_t += delta
	if _tick_t >= 1.0:
		_tick_t -= 1.0
		emit("tick", {"depth": 0})


## Evalúa y ejecuta un efecto. Devuelve true si se ejecutó.
func run_effect(inst: Dictionary, ctx: Dictionary) -> bool:
	var def: Dictionary = inst["def"]
	if not passes_filter(def.get("filter", {}), ctx):
		return false
	if def.has("every"):
		inst["counter"] = int(inst["counter"]) + 1
		if int(inst["counter"]) % maxi(1, int(def["every"])) != 0:
			return false
	var chance := float(def.get("chance", 1.0))
	if chance < 1.0:
		var luck := world.player_luck() if world != null else 0.0
		chance = clampf(chance * (1.0 + 0.05 * luck), 0.0, 1.0) * clampf(float(ctx.get("proc_coef", 1.0)), 0.0, 1.0)
		if not rng.chance(chance):
			return false
	if def.has("icd"):
		if _time < float(inst["icd_until"]):
			return false
		inst["icd_until"] = _time + float(def["icd"])
	for a in actions_of(def):
		EffectActions.execute(str(a["name"]), a["params"], ctx, inst, self)
		counters["actions"] += 1
	return true


func passes_filter(f: Dictionary, ctx: Dictionary) -> bool:
	if f.is_empty():
		return true
	var tags: PackedStringArray = ctx.get("tags", PackedStringArray())
	for key in f:
		var v: Variant = f[key]
		match key:
			"tags_any":
				var ok := false
				for t in v:
					if tags.has(t):
						ok = true
						break
				if not ok:
					return false
			"tags_all":
				for t in v:
					if not tags.has(t):
						return false
			"tags_none":
				for t in v:
					if tags.has(t):
						return false
			"target_status_any":
				var sts := _target_statuses(ctx)
				var ok2 := false
				for s in v:
					if sts.has(s):
						ok2 = true
						break
				if not ok2:
					return false
			"target_status_none":
				var sts2 := _target_statuses(ctx)
				for s in v:
					if sts2.has(s):
						return false
			"target_is_boss":
				if bool(ctx.get("is_boss", false)) != bool(v):
					return false
			"player_hp_min":
				if world == null or world.player == null or world.player.hp < int(v):
					return false
			"player_hp_max":
				if world == null or world.player == null or world.player.hp > int(v):
					return false
			"crit":
				if bool(ctx.get("crit", false)) != bool(v):
					return false
			"max_generation":
				if int(ctx.get("generation", 0)) > int(v):
					return false
			"min_depth":
				if int(ctx.get("depth", 0)) < int(v):
					return false
			"max_depth":
				if int(ctx.get("depth", 0)) > int(v):
					return false
			"room_type":
				if world == null or world.room_type() != str(v):
					return false
			"coins_min":
				if world == null or world.player == null or world.player.coins < int(v):
					return false
			"pickup_kind":
				if str(ctx.get("kind", "")) != str(v):
					return false
			"status":
				if str(ctx.get("status", "")) != str(v):
					return false
			"reaction":
				if str(ctx.get("reaction", "")) != str(v):
					return false
	return true


func _target_statuses(ctx: Dictionary) -> PackedStringArray:
	if ctx.has("target_statuses"):
		return ctx["target_statuses"]
	var t: Variant = ctx.get("target")
	if t != null and is_instance_valid(t) and t.get("status") != null:
		return (t.get("status") as StatusComponent).active_ids()
	return PackedStringArray()

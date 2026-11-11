class_name ItemSystem
extends RefCounted
## Inventario del jugador y aplicador de objetos.
##
## Al obtener un objeto:
##   1. Modificadores de estadística (fuente "item:<id>"; cada copia suma).
##   2. Efectos registrados en el SynergyEngine (una instancia por objeto; las
##      copias extra incrementan inst.stacks).
##   3. Propiedades de proyectil y modificadores de mecánica (recalculados).
##   4. Efectos inmediatos ("acquire").
##   5. Comprobación de sinergias de conjunto (transformaciones, combos, negativas).
## El objeto activo ocupa una ranura aparte; al recoger otro se suelta el anterior
## en un pedestal (decisión del jugador, no pérdida silenciosa).

var player: Player
var engine: SynergyEngine
var items: Array = []
var stacks := {}
var tag_counts := {}
var projectile_props := {}
var mechanic_mods := {}
var active_synergies := {}
var active_id := ""
var active_charge := 0
var active_max := 0

var _insts := {}
var _synergy_insts := {}
var _synergy_familiars := {}


func _init(p_player: Player, p_engine: SynergyEngine) -> void:
	player = p_player
	engine = p_engine
	_recompute_props()


func has_item(id: String) -> bool:
	return stacks.has(id) or active_id == id


func count(id: String) -> int:
	return int(stacks.get(id, 0))


func add_item(id: String) -> bool:
	var def := ContentDB.get_item(id)
	if def.is_empty():
		push_warning("ItemSystem: objeto desconocido '%s'" % id)
		return false
	if str(def["type"]) == "active":
		_set_active(id, def)
		_after_acquire(id, def)
		return true
	items.append(id)
	stacks[id] = int(stacks.get(id, 0)) + 1
	var source := "item:" + id
	for s in def.get("stats", []):
		player.stats.add_modifier(str(s["stat"]), str(s["op"]), float(s["value"]), source, s)
	if int(stacks[id]) == 1:
		var list: Array = []
		for e in def.get("effects", []):
			if SynergyEngine.triggers_of(e).has("acquire"):
				continue
			list.append(engine.register(e, source))
		_insts[source] = list
	else:
		for inst in _insts.get(source, []):
			inst["stacks"] = int(stacks[id])
	for t in def.get("tags", []):
		tag_counts[t] = int(tag_counts.get(t, 0)) + 1
	_after_acquire(id, def)
	return true


func _after_acquire(id: String, def: Dictionary) -> void:
	_recompute_props()
	for e in def.get("effects", []):
		if SynergyEngine.triggers_of(e).has("acquire"):
			engine.run_effect(engine.make_instance(e, "item:" + id), {"depth": 0, "item_id": id})
	# Un activo intercambiado varias veces cuenta una sola vez en el historial.
	if not (str(def.get("type", "")) == "active" and player.world.run.items_taken.has(id)):
		player.world.run.items_taken.append(id)
	SaveManager.mark_discovered("items", id)
	check_synergies()
	player.on_inventory_changed()
	engine.emit("item_acquired", {"item_id": id, "depth": 0, "tags": PackedStringArray(def.get("tags", []))})
	EventBus.item_acquired.emit(id, int(stacks.get(id, 1)))


func _set_active(id: String, def: Dictionary) -> void:
	if active_id != "" and active_id != id:
		var old_def := ContentDB.get_item(active_id)
		for t in old_def.get("tags", []):
			tag_counts[t] = maxi(0, int(tag_counts.get(t, 0)) - 1)
		if player.world.game != null and player.world.game.has_method("drop_item_pedestal"):
			player.world.game.drop_item_pedestal(active_id, player.global_position + Vector2(0, 40))
	active_id = id
	active_max = maxi(1, int(ceil(float(def.get("charge", 1)) * (1.0 - player.stats.get_stat("cooldown_reduction")))))
	active_charge = active_max
	for t in def.get("tags", []):
		tag_counts[t] = int(tag_counts.get(t, 0)) + 1
	_emit_active()


func set_active_charged(charged: bool) -> void:
	active_charge = active_max if charged else 0
	_emit_active()


func add_charge(n: int) -> void:
	if active_id == "":
		return
	var before := active_charge
	active_charge = mini(active_max, active_charge + n)
	if active_charge == active_max and before < active_max:
		Audio.play("pickup", -6.0, 1.4)
	_emit_active()


## Usa el objeto activo. Solo consume la carga si al menos un efecto se ejecutó.
func use_active() -> bool:
	if active_id == "":
		return false
	if active_charge < active_max:
		Audio.play("deny")
		return false
	var def := ContentDB.get_item(active_id)
	var used := false
	var ctx := {"depth": 0, "item_id": active_id, "position": player.global_position, "tags": PackedStringArray(def.get("tags", []))}
	for e in def.get("effects", []):
		if SynergyEngine.triggers_of(e).has("use"):
			if engine.run_effect(engine.make_instance(e, "item:" + active_id), ctx):
				used = true
	if not used:
		Audio.play("deny")
		EventBus.toast.emit("No puedes usar %s ahora" % str(def.get("name", "")), Palette.UI_DANGER)
		return false
	active_charge = 0
	engine.emit("active_used", {"item_id": active_id, "depth": 0, "tags": ctx["tags"]})
	_emit_active()
	return true


func _emit_active() -> void:
	EventBus.active_item_changed.emit(active_id, active_charge, active_max)


## Agrega propiedades de proyectil y modificadores de mecánica de objetos,
## sinergias activas y personaje.
func _recompute_props() -> void:
	var props := {"spectral": false, "bounce_damage_mult": 1.0, "wave_amp": 0.0, "wave_freq": 0.0, "color": "", "falloff": 0.0, "statuses": []}
	var mods := {"explosion_radius_mult": 1.0, "explosion_damage_mult": 1.0, "split_count_add": 0.0, "ally_duration_mult": 1.0, "ally_cap_add": 0.0, "status_stacks_add": 0.0}
	var sources: Array = []
	if player != null and not player.character.is_empty():
		sources.append({"projectile": player.character.get("projectile", {}), "mechanics": {}})
	for id in items:
		sources.append(ContentDB.get_item(id))
	for sid in active_synergies:
		sources.append(ContentDB.synergies[sid].get("grants", {}))
	for src in sources:
		var pr: Dictionary = src.get("projectile", {})
		for k in pr:
			_combine(props, k, pr[k], str(EffectVocab.PROJECTILE_PROPS.get(k, "last")))
		var mc: Dictionary = src.get("mechanics", {})
		for k in mc:
			_combine(mods, k, mc[k], str(EffectVocab.MECHANIC_MODS.get(k, "last")))
	projectile_props = props
	mechanic_mods = mods
	if player != null and player.world != null:
		player.world.mechanic_mods = mods


static func _combine(target: Dictionary, key: String, value: Variant, mode: String) -> void:
	match mode:
		"mult":
			target[key] = float(target.get(key, 1.0)) * float(value)
		"add":
			target[key] = float(target.get(key, 0.0)) + float(value)
		"flag":
			target[key] = bool(target.get(key, false)) or bool(value)
		"append":
			var arr: Array = target.get(key, []).duplicate()
			arr.append_array(value)
			target[key] = arr
		_:
			target[key] = value


# ---------------------------------------------------------------------------
# Sinergias de conjunto
# ---------------------------------------------------------------------------

func requirements_met(req: Dictionary) -> bool:
	var tags: Dictionary = req.get("tags", {})
	for t in tags:
		if int(tag_counts.get(t, 0)) < int(tags[t]):
			return false
	for id in req.get("items_all", []):
		if not has_item(str(id)):
			return false
	var anyc: Dictionary = req.get("items_any_count", {})
	if not anyc.is_empty():
		var n := 0
		for id in anyc.get("items", []):
			if has_item(str(id)):
				n += 1
		if n < int(anyc.get("count", 1)):
			return false
	return true


func check_synergies() -> void:
	for sid in ContentDB.synergy_ids:
		var sy: Dictionary = ContentDB.synergies[sid]
		var ok := requirements_met(sy.get("requires", {}))
		if ok and not active_synergies.has(sid):
			_activate_synergy(sid, sy)
		elif not ok and active_synergies.has(sid):
			_deactivate_synergy(sid)


func _activate_synergy(sid: String, sy: Dictionary) -> void:
	active_synergies[sid] = true
	var src := "syn:" + sid
	var grants: Dictionary = sy.get("grants", {})
	for s in grants.get("stats", []):
		player.stats.add_modifier(str(s["stat"]), str(s["op"]), float(s["value"]), src, s)
	var list: Array = []
	for e in grants.get("effects", []):
		list.append(engine.register(e, src))
	_synergy_insts[sid] = list
	var fam: Dictionary = grants.get("familiars", {})
	if not fam.is_empty():
		var made: Array = []
		var total := int(fam.get("count", 1))
		for i in total:
			made.append(player.world.spawn_familiar(str(fam.get("kind", "moth")), i, total))
		_synergy_familiars[sid] = made
	_recompute_props()
	player.on_stats_changed()
	var first := SaveManager.mark_discovered("synergies", sid)
	var kind_label: String = {"transformation": "Transformación", "negative": "Sinergia adversa", "combo": "Sinergia"}.get(str(sy.get("type", "")), "Sinergia")
	EventBus.banner.emit("%s: %s" % [kind_label, str(sy["name"])], str(sy.get("desc", "")) + ("  (¡nuevo descubrimiento!)" if first else ""), Palette.UI_ACCENT)
	EventBus.synergy_activated.emit(sid)
	Audio.play("synergy")


func _deactivate_synergy(sid: String) -> void:
	active_synergies.erase(sid)
	var src := "syn:" + sid
	player.stats.remove_modifiers_from(src)
	engine.unregister_source(src)
	for f in _synergy_familiars.get(sid, []):
		if is_instance_valid(f):
			player.world.familiars.erase(f)
			f.queue_free()
	_synergy_familiars.erase(sid)
	_recompute_props()
	player.on_stats_changed()


## Lista de familiares vivos (se recolocan al cambiar de sala).
func all_familiars() -> Array:
	var out: Array = []
	for sid in _synergy_familiars:
		for f in _synergy_familiars[sid]:
			if is_instance_valid(f):
				out.append(f)
	return out

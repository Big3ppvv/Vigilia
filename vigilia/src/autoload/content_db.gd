extends Node
## ContentDB: carga, indexa y VALIDA el contenido definido en res://data/*.json.
##
## Todo el contenido (objetos, sinergias, enemigos, campeones, personajes,
## plantillas de habitación, pisos, estados, botín, lore) vive en datos.
## Añadir contenido = editar JSON. Los errores de contenido se acumulan en
## `errors` (bloqueantes) y `warnings` (sospechosos) y los tests exigen errors vacío.
##
## Nota de exportación: los .json no son recursos importados; export_presets.cfg
## los incluye con include_filter="data/*.json".

const DATA_DIR := "res://data/"
const ROOM_COLS := 15
const ROOM_ROWS := 9
## Leyenda de plantillas de habitación (ver docs/CONTENT_GUIDE.md).
const ROOM_CHARS := ".#X~123BIPSHL"
const WALKABLE_CHARS := ".~123BIPSHL"
const ROOM_TYPES := ["start", "combat", "treasure", "shop", "boss", "secret"]
## Casillas que deben quedar libres junto a cada puerta (N, E, S, O).
const DOOR_APPROACH := [
	[Vector2i(7, 0), Vector2i(7, 1)],
	[Vector2i(14, 4), Vector2i(13, 4)],
	[Vector2i(7, 8), Vector2i(7, 7)],
	[Vector2i(0, 4), Vector2i(1, 4)],
]
const ITEM_TYPES := ["passive", "active"]
const RARITIES := ["common", "uncommon", "rare", "cursed", "legendary"]

var items := {}
var item_ids: Array = []
var synergies := {}
var synergy_ids: Array = []
var enemies := {}
var champions := {}
var champion_ids: Array = []
var characters := {}
var character_ids: Array = []
var rooms: Array = []
var rooms_by_type := {}
var floors: Array = []
var statuses := {}
var reactions: Array = []
var loot := {}
var lore := {}

var errors := PackedStringArray()
var warnings := PackedStringArray()


func _ready() -> void:
	reload()


func reload() -> void:
	items.clear()
	item_ids.clear()
	synergies.clear()
	synergy_ids.clear()
	enemies.clear()
	champions.clear()
	champion_ids.clear()
	characters.clear()
	character_ids.clear()
	rooms.clear()
	rooms_by_type.clear()
	floors.clear()
	statuses.clear()
	reactions.clear()
	loot.clear()
	lore.clear()
	errors.clear()
	warnings.clear()

	for it in _load_list("items.json", "items"):
		if _index_unique(items, it, "items.json"):
			item_ids.append(it["id"])
	for sy in _load_list("synergies.json", "synergies"):
		if _index_unique(synergies, sy, "synergies.json"):
			synergy_ids.append(sy["id"])
	for en in _load_list("enemies.json", "enemies"):
		_index_unique(enemies, en, "enemies.json")
	for ch in _load_list("champions.json", "champions"):
		if _index_unique(champions, ch, "champions.json"):
			champion_ids.append(ch["id"])
	for c in _load_list("characters.json", "characters"):
		if _index_unique(characters, c, "characters.json"):
			character_ids.append(c["id"])
	for r in _load_list("rooms.json", "rooms"):
		var tmp := {}
		for existing in rooms:
			tmp[existing["id"]] = existing
		if _index_unique(tmp, r, "rooms.json"):
			rooms.append(r)
			var t := str(r.get("type", ""))
			if not rooms_by_type.has(t):
				rooms_by_type[t] = []
			rooms_by_type[t].append(r)
	floors = _load_list("floors.json", "floors")
	var st := _load_json("status_effects.json")
	for s in st.get("statuses", []):
		_index_unique(statuses, s, "status_effects.json")
	reactions = st.get("reactions", [])
	loot = _load_json("loot.json")
	lore = _load_json("lore.json")

	_validate()
	for e in errors:
		push_error("[ContentDB] " + e)
	for w in warnings:
		push_warning("[ContentDB] " + w)
	print("[ContentDB] objetos=%d sinergias=%d enemigos=%d campeones=%d personajes=%d habitaciones=%d pisos=%d estados=%d | errores=%d avisos=%d" % [
		items.size(), synergies.size(), enemies.size(), champions.size(), characters.size(),
		rooms.size(), floors.size(), statuses.size(), errors.size(), warnings.size()])


# ---------------------------------------------------------------------------
# Consultas
# ---------------------------------------------------------------------------

func get_item(id: String) -> Dictionary:
	return items.get(id, {})


func get_enemy(id: String) -> Dictionary:
	return enemies.get(id, {})


func get_floor(index: int) -> Dictionary:
	if index >= 0 and index < floors.size():
		return floors[index]
	return {}


func floor_count() -> int:
	return floors.size()


func get_rooms(type: String, biome: String = "") -> Array:
	var out: Array = []
	for r in rooms_by_type.get(type, []):
		var b := str(r.get("biome", "any"))
		if biome == "" or b == "any" or b == biome:
			out.append(r)
	return out


## Objetos elegibles para un pool, excluyendo ids dados.
func items_for_pool(pool: String, exclude: Dictionary = {}) -> Array:
	var out: Array = []
	for id in item_ids:
		if exclude.has(id):
			continue
		var def: Dictionary = items[id]
		var pools: Dictionary = def.get("pools", {})
		if float(pools.get(pool, 0.0)) > 0.0:
			out.append(def)
	return out


func lore_line(key: String, index: int) -> String:
	var arr: Array = lore.get(key, [])
	if arr.is_empty():
		return ""
	return str(arr[posmod(index, arr.size())])


# ---------------------------------------------------------------------------
# Carga
# ---------------------------------------------------------------------------

func _load_json(file_name: String) -> Dictionary:
	var path := DATA_DIR + file_name
	if not FileAccess.file_exists(path):
		errors.append("%s: no existe" % path)
		return {}
	var text := FileAccess.get_file_as_string(path)
	var json := JSON.new()
	var err := json.parse(text)
	if err != OK:
		errors.append("%s:%d: JSON inválido: %s" % [path, json.get_error_line(), json.get_error_message()])
		return {}
	if typeof(json.data) != TYPE_DICTIONARY:
		errors.append("%s: la raíz debe ser un objeto" % path)
		return {}
	return json.data


func _load_list(file_name: String, key: String) -> Array:
	var d := _load_json(file_name)
	var arr: Variant = d.get(key, [])
	if typeof(arr) != TYPE_ARRAY:
		errors.append("%s: '%s' debe ser una lista" % [file_name, key])
		return []
	var out: Array = []
	for e in arr:
		if typeof(e) != TYPE_DICTIONARY:
			errors.append("%s: entrada no es un objeto: %s" % [file_name, str(e)])
			continue
		out.append(e)
	return out


func _index_unique(target: Dictionary, entry: Dictionary, file_name: String) -> bool:
	var id := str(entry.get("id", ""))
	if id.is_empty():
		errors.append("%s: entrada sin 'id': %s" % [file_name, str(entry).left(80)])
		return false
	if target.has(id):
		errors.append("%s: id duplicado '%s'" % [file_name, id])
		return false
	target[id] = entry
	return true


# ---------------------------------------------------------------------------
# Validación
# ---------------------------------------------------------------------------

func _validate() -> void:
	for id in items:
		_validate_item(items[id])
	for id in synergies:
		_validate_synergy(synergies[id])
	for id in enemies:
		_validate_enemy(enemies[id])
	for id in characters:
		_validate_character(characters[id])
	for r in rooms:
		_validate_room(r)
	for f in floors:
		_validate_floor(f)
	for r in reactions:
		for k in ["a", "b"]:
			if not statuses.has(str(r.get(k, ""))):
				errors.append("reacción '%s': estado desconocido '%s'" % [r.get("id", "?"), r.get(k, "")])
	for t in ["start", "combat", "treasure", "shop", "boss", "secret"]:
		if not rooms_by_type.has(t):
			errors.append("rooms.json: no hay plantillas de tipo '%s'" % t)


func _validate_item(it: Dictionary) -> void:
	var id := str(it["id"])
	for k in ["name", "desc", "type", "rarity", "tags", "pools", "icon"]:
		if not it.has(k):
			errors.append("objeto '%s': falta '%s'" % [id, k])
	if not str(it.get("type", "")) in ITEM_TYPES:
		errors.append("objeto '%s': tipo inválido '%s'" % [id, it.get("type", "")])
	if not str(it.get("rarity", "")) in RARITIES:
		errors.append("objeto '%s': rareza inválida '%s'" % [id, it.get("rarity", "")])
	if it.get("type", "") == "active" and int(it.get("charge", 0)) <= 0:
		errors.append("objeto activo '%s': requiere 'charge' > 0" % id)
	for s in it.get("stats", []):
		_validate_stat_mod(s, "objeto '%s'" % id)
	for e in it.get("effects", []):
		_validate_effect(e, "objeto '%s'" % id)
	var proj: Dictionary = it.get("projectile", {})
	for k in proj:
		if not EffectVocab.PROJECTILE_PROPS.has(k):
			errors.append("objeto '%s': propiedad de proyectil desconocida '%s'" % [id, k])
	var mech: Dictionary = it.get("mechanics", {})
	for k in mech:
		if not EffectVocab.MECHANIC_MODS.has(k):
			errors.append("objeto '%s': modificador de mecánica desconocido '%s'" % [id, k])


func _validate_stat_mod(s: Variant, ctx: String) -> void:
	if typeof(s) != TYPE_DICTIONARY:
		errors.append("%s: modificador de estadística inválido" % ctx)
		return
	if not StatDefs.has(str(s.get("stat", ""))):
		errors.append("%s: estadística desconocida '%s'" % [ctx, s.get("stat", "")])
	if not str(s.get("op", "")) in StatBlock.OPS:
		errors.append("%s: operación desconocida '%s'" % [ctx, s.get("op", "")])
	if not s.has("value"):
		errors.append("%s: modificador sin 'value'" % ctx)


func _validate_effect(e: Variant, ctx: String) -> void:
	if typeof(e) != TYPE_DICTIONARY:
		errors.append("%s: efecto inválido" % ctx)
		return
	var trig: Variant = e.get("trigger", "")
	var trig_list: Array = trig if typeof(trig) == TYPE_ARRAY else [trig]
	for t in trig_list:
		if not EffectVocab.is_trigger(str(t)):
			errors.append("%s: disparador desconocido '%s'" % [ctx, t])
	var filt: Dictionary = e.get("filter", {})
	for k in filt:
		if not k in EffectVocab.FILTERS:
			errors.append("%s: filtro desconocido '%s'" % [ctx, k])
	var actions: Array = []
	if e.has("action"):
		actions.append({"name": e["action"], "params": e.get("params", {})})
	for a in e.get("actions", []):
		actions.append({"name": a.get("action", ""), "params": a.get("params", {})})
	if actions.is_empty():
		errors.append("%s: efecto sin acciones" % ctx)
	for a in actions:
		var an := str(a["name"])
		if not EffectVocab.is_action(an):
			errors.append("%s: acción desconocida '%s'" % [ctx, an])
			continue
		var allowed: Array = EffectVocab.ACTIONS[an]
		for p in a["params"]:
			if not p in allowed:
				warnings.append("%s: parámetro '%s' no reconocido para '%s'" % [ctx, p, an])
		if an == "apply_status" and not statuses.has(str(a["params"].get("status", ""))):
			errors.append("%s: estado desconocido '%s'" % [ctx, a["params"].get("status", "")])
		if an in ["temp_stat", "permanent_stat"] and not StatDefs.has(str(a["params"].get("stat", ""))):
			errors.append("%s: estadística desconocida '%s'" % [ctx, a["params"].get("stat", "")])


func _validate_synergy(sy: Dictionary) -> void:
	var id := str(sy["id"])
	for k in ["name", "desc", "requires", "grants"]:
		if not sy.has(k):
			errors.append("sinergia '%s': falta '%s'" % [id, k])
	var req: Dictionary = sy.get("requires", {})
	for item_id in req.get("items_all", []):
		if not items.has(str(item_id)):
			errors.append("sinergia '%s': objeto requerido desconocido '%s'" % [id, item_id])
	var grants: Dictionary = sy.get("grants", {})
	for s in grants.get("stats", []):
		_validate_stat_mod(s, "sinergia '%s'" % id)
	for e in grants.get("effects", []):
		_validate_effect(e, "sinergia '%s'" % id)
	for k in grants.get("mechanics", {}):
		if not EffectVocab.MECHANIC_MODS.has(k):
			errors.append("sinergia '%s': modificador de mecánica desconocido '%s'" % [id, k])
	for k in grants.get("projectile", {}):
		if not EffectVocab.PROJECTILE_PROPS.has(k):
			errors.append("sinergia '%s': propiedad de proyectil desconocida '%s'" % [id, k])


func _validate_enemy(en: Dictionary) -> void:
	var id := str(en["id"])
	for k in ["name", "script", "hp", "radius", "speed", "tier"]:
		if not en.has(k):
			errors.append("enemigo '%s': falta '%s'" % [id, k])
	var script_path := str(en.get("script", ""))
	if not ResourceLoader.exists(script_path):
		errors.append("enemigo '%s': script inexistente '%s'" % [id, script_path])
	if float(en.get("hp", 0)) <= 0.0:
		errors.append("enemigo '%s': hp debe ser > 0" % id)
	var tier := int(en.get("tier", 0))
	if tier < 1 or tier > 3:
		if not bool(en.get("boss", false)):
			errors.append("enemigo '%s': tier debe estar entre 1 y 3" % id)


func _validate_character(c: Dictionary) -> void:
	var id := str(c["id"])
	for k in ["name", "desc", "stats"]:
		if not c.has(k):
			errors.append("personaje '%s': falta '%s'" % [id, k])
	for s in c.get("stats", {}):
		if not StatDefs.has(str(s)):
			errors.append("personaje '%s': estadística desconocida '%s'" % [id, s])
	for item_id in c.get("start_items", []):
		if not items.has(str(item_id)):
			errors.append("personaje '%s': objeto inicial desconocido '%s'" % [id, item_id])
	var act := str(c.get("start_active", ""))
	if act != "" and not items.has(act):
		errors.append("personaje '%s': activo inicial desconocido '%s'" % [id, act])


func _validate_floor(f: Dictionary) -> void:
	var fid := str(f.get("id", "?"))
	for k in ["id", "name", "biome", "rooms", "boss", "enemy_pool"]:
		if not f.has(k):
			errors.append("piso '%s': falta '%s'" % [fid, k])
	if not enemies.has(str(f.get("boss", ""))):
		errors.append("piso '%s': jefe desconocido '%s'" % [fid, f.get("boss", "")])
	for e in f.get("enemy_pool", []):
		if not enemies.has(str(e.get("id", ""))):
			errors.append("piso '%s': enemigo desconocido en pool '%s'" % [fid, e.get("id", "")])
	var rr: Array = f.get("rooms", [])
	if rr.size() != 2 or int(rr[0]) < 3 or int(rr[1]) < int(rr[0]):
		errors.append("piso '%s': 'rooms' debe ser [min, max] con min >= 3" % fid)


## Valida una plantilla de habitación: tamaño, caracteres, accesos libres junto a
## las puertas y conectividad (toda casilla transitable debe ser alcanzable sin
## romper rocas: nada obligatorio puede quedar encerrado).
func _validate_room(r: Dictionary) -> void:
	var id := str(r["id"])
	if not str(r.get("type", "")) in ROOM_TYPES:
		errors.append("habitación '%s': tipo inválido '%s'" % [id, r.get("type", "")])
	var layout: Array = r.get("layout", [])
	if layout.size() != ROOM_ROWS:
		errors.append("habitación '%s': %d filas (se esperan %d)" % [id, layout.size(), ROOM_ROWS])
		return
	for y in ROOM_ROWS:
		var row := str(layout[y])
		if row.length() != ROOM_COLS:
			errors.append("habitación '%s': fila %d con %d columnas (se esperan %d)" % [id, y, row.length(), ROOM_COLS])
			return
		for x in ROOM_COLS:
			if ROOM_CHARS.find(row[x]) < 0:
				errors.append("habitación '%s': carácter inválido '%s' en (%d,%d)" % [id, row[x], x, y])
	for pair in DOOR_APPROACH:
		for c in pair:
			var ch := str(layout[c.y])[c.x]
			if WALKABLE_CHARS.find(ch) < 0:
				errors.append("habitación '%s': acceso de puerta bloqueado en (%d,%d)" % [id, c.x, c.y])
	# Conectividad desde el acceso norte (todos los accesos son transitables).
	var seen := {}
	var stack: Array = [Vector2i(7, 0)]
	while not stack.is_empty():
		var c: Vector2i = stack.pop_back()
		if seen.has(c):
			continue
		if c.x < 0 or c.y < 0 or c.x >= ROOM_COLS or c.y >= ROOM_ROWS:
			continue
		if WALKABLE_CHARS.find(str(layout[c.y])[c.x]) < 0:
			continue
		seen[c] = true
		stack.append(c + Vector2i(1, 0))
		stack.append(c + Vector2i(-1, 0))
		stack.append(c + Vector2i(0, 1))
		stack.append(c + Vector2i(0, -1))
	var spawn_count := 0
	for y in ROOM_ROWS:
		for x in ROOM_COLS:
			var ch := str(layout[y])[x]
			if WALKABLE_CHARS.find(ch) >= 0 and not seen.has(Vector2i(x, y)):
				errors.append("habitación '%s': casilla transitable inalcanzable (%d,%d)" % [id, x, y])
			if "123B".find(ch) >= 0:
				spawn_count += 1
	var t := str(r.get("type", ""))
	if t == "combat" and spawn_count == 0:
		errors.append("habitación '%s': combate sin puntos de aparición" % id)
	if t == "boss" and str(r.get("layout", [])).find("B") < 0:
		errors.append("habitación '%s': jefe sin punto 'B'" % id)

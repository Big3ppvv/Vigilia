class_name FloorParams
extends RefCounted
## Construye los parámetros PUROS que consume DungeonGenerator a partir de los
## datos (floors.json, rooms.json, enemies.json, champions.json) y del estado de
## la partida (modificadores de piso que dejan algunos objetos).
## Mantiene al generador independiente de ContentDB y de la escena.


static func build(floor_index: int, run: RunState = null) -> Dictionary:
	var f: Dictionary = ContentDB.get_floor(floor_index)
	if f.is_empty():
		return {}
	var p: Dictionary = f.duplicate(true)
	p["floor_index"] = floor_index
	var biome := str(f.get("biome", "any"))
	var templates := {}
	for t in ContentDB.ROOM_TYPES:
		templates[t] = ContentDB.get_rooms(t, biome)
	p["templates"] = templates
	var pool: Array = []
	for e in f.get("enemy_pool", []):
		var def: Dictionary = ContentDB.get_enemy(str(e.get("id", "")))
		if def.is_empty():
			continue
		pool.append({"id": str(e["id"]), "weight": float(e.get("weight", 1.0)), "tier": int(def.get("tier", 1))})
	p["enemy_pool"] = pool
	var champs: Array = []
	for cid in ContentDB.champion_ids:
		var c: Dictionary = ContentDB.champions[cid]
		champs.append({"id": cid, "weight": float(c.get("weight", 1.0))})
	p["champions"] = champs
	p["extra_treasure"] = 0
	if run != null:
		p["extra_treasure"] = int(run.floor_modifiers.get("extra_treasure", 0.0))
	return p

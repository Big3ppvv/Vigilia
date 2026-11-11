class_name LootManager
extends RefCounted
## Reparto de objetos y consumibles.
##
## - Los pedestales de un piso se rellenan al generarlo, en orden de coordenada,
##   con el flujo "f<N>:loot": la misma semilla da los mismos objetos.
## - Pools sin duplicados: cada objeto generado se marca en run.seen_items.
##   Si un pool se agota, se usa el objeto de respaldo (loot.json).
## - La suerte desplaza el peso hacia rarezas altas (luck_rarity_bonus).

var run: RunState


func _init(p_run: RunState) -> void:
	run = p_run


func fill_floor(layout: FloorLayout, luck: float) -> void:
	var rng := run.floor_stream("loot")
	# Consumibles sin repetición dentro del piso (barajado determinista).
	var consumables: Array = ContentDB.loot.get("shop_consumables", []).duplicate()
	rng.shuffle(consumables)
	var cons_i := 0
	for rd in layout.sorted_rooms():
		for p in rd.pedestals:
			if bool(p.get("consumable", false)):
				if consumables.is_empty():
					continue
				var c: Dictionary = consumables[cons_i % consumables.size()]
				cons_i += 1
				p["kind"] = str(c["kind"])
				p["price"] = int(c["price"])
				continue
			var id := roll_item(str(p.get("pool", "treasure")), rng, luck)
			p["item_id"] = id
			if str(p.get("pool", "")) == "shop":
				p["price"] = price_for(id)
	# Consumibles sueltos de salas secretas.
	for rd in layout.sorted_rooms():
		for pk in rd.pickups:
			if pk.has("tile") and not pk.has("kind"):
				pk["kind"] = roll_pickup(str(pk.get("table", "secret_pickup")), rng, luck, true)


func roll_item(pool: String, rng: RngStream, luck: float) -> String:
	var candidates := ContentDB.items_for_pool(pool, run.seen_items)
	if candidates.is_empty():
		return str(ContentDB.loot.get("fallback_item", "black_bead"))
	var rw: Dictionary = ContentDB.loot.get("rarity_weights", {})
	var lb: Dictionary = ContentDB.loot.get("luck_rarity_bonus", {})
	var entries: Array = []
	for def in candidates:
		var r := str(def.get("rarity", "common"))
		var w := float(def.get("pools", {}).get(pool, 0.0)) * float(rw.get(r, 1.0))
		w *= maxf(0.1, 1.0 + float(lb.get(r, 0.0)) * luck)
		entries.append({"id": str(def["id"]), "w": w})
	var pick: Variant = rng.pick_weighted(entries, "w")
	var id := str(pick["id"]) if pick != null else str(ContentDB.loot.get("fallback_item", "black_bead"))
	run.seen_items[id] = true
	return id


func price_for(item_id: String) -> int:
	var def := ContentDB.get_item(item_id)
	var prices: Dictionary = ContentDB.loot.get("item_prices", {})
	return int(prices.get(str(def.get("rarity", "common")), 12))


## Devuelve el tipo de consumible o "" si la tirada falla.
func roll_pickup(table_name: String, rng: RngStream, luck: float, force: bool = false) -> String:
	var t: Dictionary = ContentDB.loot.get(table_name, {})
	if t.is_empty():
		return ""
	var chance := float(t.get("chance", 0.0)) + float(t.get("luck_bonus", 0.0)) * luck
	if not force and not rng.chance(chance):
		return ""
	var pick: Variant = rng.pick_weighted(t.get("table", []), "weight")
	return str(pick["kind"]) if pick != null else ""

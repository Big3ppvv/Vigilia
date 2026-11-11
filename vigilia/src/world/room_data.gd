class_name RoomData
extends RefCounted
## Modelo de datos de una habitación del piso (sin presentación).
## El estado persiste al salir y volver: enemigos despejados, objetos tomados,
## rocas rotas y consumibles en el suelo.

var coord := Vector2i.ZERO
## start | combat | treasure | shop | boss | secret
var type := "combat"
var depth := 0
var template_id := ""
var template_name := ""
var difficulty := 0
var layout := PackedStringArray()
## dir (0=N,1=E,2=S,3=O) -> {to: Vector2i, kind: String, hidden: bool, locked: bool}
var doors := {}
## [{id, tile: Vector2i, champion: String, boss: bool}]
var spawns: Array = []
## [{tile, pool, price, item_id, taken, group, consumable, kind}]
var pedestals: Array = []
## Consumibles sueltos: [{kind, pos: Vector2}] (al generar se usan tiles)
var pickups: Array = []
var lore_tile := Vector2i(-1, -1)
var boss_id := ""
var boss_reward := ""
var visited := false
var cleared := false
## Visible en el minimapa (adyacente a una sala visitada o revelada por objetos).
var known := false
var reward_given := false
## Estado variable: "broken" (rocas rotas), "exit_open", etc.
var flags := {}


func is_combat() -> bool:
	return type == "combat" or type == "boss"


func has_door(dir: int) -> bool:
	return doors.has(dir)


func door_count(include_hidden: bool = true) -> int:
	var n := 0
	for d in doors:
		if include_hidden or not bool(doors[d].get("hidden", false)):
			n += 1
	return n


func is_special() -> bool:
	return type in ["treasure", "shop", "boss", "secret"]


func serialize() -> Dictionary:
	var ds := {}
	for d in doors:
		var door: Dictionary = doors[d]
		ds[str(d)] = {"to": [door["to"].x, door["to"].y], "kind": door["kind"], "hidden": door["hidden"], "locked": door.get("locked", false)}
	var sp: Array = []
	for s in spawns:
		sp.append([s["id"], s["tile"].x, s["tile"].y, s.get("champion", "")])
	var pe: Array = []
	for p in pedestals:
		pe.append([p["tile"].x, p["tile"].y, p.get("pool", ""), p.get("item_id", ""), p.get("kind", "")])
	return {
		"coord": [coord.x, coord.y], "type": type, "depth": depth,
		"template": template_id, "layout": Array(layout), "doors": ds,
		"spawns": sp, "pedestals": pe, "boss": boss_id,
	}

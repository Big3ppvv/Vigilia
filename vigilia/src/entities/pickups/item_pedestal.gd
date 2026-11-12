class_name ItemPedestal
extends Node2D
## Pedestal de un RECUERDO (tesoro, jefe, sala secreta o la Cabecera).
## Se toma con INTERACTUAR (E) para que el jugador lea el recuerdo antes de
## decidir. Si pertenece a un grupo de elección, tomar uno hace DESAPARECER los
## demás: decisión irreversible y anunciada.
## En la Cabecera (`price` > 0) recordar cuesta llama MÁXIMA: la llama se acorta
## para siempre. Nunca puede dejarte por debajo de MIN_FLAME_AFTER.

const RANGE := 66.0
const MIN_FLAME_AFTER := 2

static var _emissive: CanvasItemMaterial

var world: CombatWorld
var entry: Dictionary = {}
var item_id := ""
var price := 0
var group := -1
var _t := 0.0
var taken := false


func setup(w: CombatWorld, e: Dictionary) -> void:
	world = w
	entry = e
	item_id = str(e.get("item_id", ""))
	price = maxi(0, int(e.get("price", 0)))
	group = int(e.get("group", -1))
	add_to_group("interactables")
	add_to_group("pedestals")
	# El recuerdo brilla con luz propia: se ve en la penumbra y llama a acercarse.
	if _emissive == null:
		_emissive = CanvasItemMaterial.new()
		_emissive.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
	material = _emissive


func is_altar() -> bool:
	return price > 0


func prompt() -> Array:
	var d := ContentDB.get_item(item_id)
	var item_name := str(d.get("name", item_id))
	var head := "[E] Recordar: " + item_name
	if is_altar():
		head = "[E] Recordar: %s  —  cuesta %d de llama para siempre" % [item_name, price]
	elif _has_rivals():
		head = "[E] Elegir: %s  (el otro recuerdo se desvanecerá)" % item_name
	var lines: Array = []
	var flavor := str(d.get("flavor", ""))
	if flavor != "":
		lines.append("«%s»" % flavor)
	lines.append(("Activo [Q] — " if str(d.get("type", "")) == "active" else "") + str(d.get("desc", "")))
	if world != null and world.player != null and world.player.inventory != null:
		var prog := world.player.inventory.preview_progress(item_id)
		if prog != "":
			lines.append("Sinergias: " + prog)
	return [head, "\n".join(lines)]


## true si hay otros pedestales sin tomar del mismo grupo de elección en la sala:
## tomar este los hará desaparecer, y el jugador debe saberlo ANTES de decidir.
func _has_rivals() -> bool:
	if group < 0 or not is_inside_tree():
		return false
	for n in get_tree().get_nodes_in_group("pedestals"):
		if n == self or not (n is ItemPedestal) or n.is_queued_for_deletion():
			continue
		var other := n as ItemPedestal
		if other.group == group and not other.taken:
			return true
	return false


func interact(pl: Player) -> bool:
	if taken:
		return false
	if is_altar() and pl.max_hp() - price < MIN_FLAME_AFTER:
		Audio.play("deny")
		world.toast("Tu llama es demasiado corta para recordar esto", Palette.UI_DANGER)
		return false
	taken = true
	entry["taken"] = true
	if is_altar():
		pl.shorten_flame(price, "altar:" + item_id)
	var d := ContentDB.get_item(item_id)
	pl.inventory.add_item(item_id, int(entry.get("active_charge", -1)))
	EventBus.memory_taken.emit(item_id)
	Audio.play("item")
	world.fx.burst(global_position + Vector2(0, -24), Palette.rarity_color(str(d.get("rarity", "common"))), 24, 220.0, 3.0, 0.7)
	world.fx.ring(global_position + Vector2(0, -24), 60.0, Palette.FLAME_CORE, 0.6, 2.0)
	if group >= 0 and world.game != null and world.game.has_method("on_pedestal_group_taken"):
		world.game.on_pedestal_group_taken(self)
	queue_free()
	return true


func vanish() -> void:
	if taken:
		return
	taken = true
	entry["taken"] = true
	entry["vanished"] = true
	world.fx.burst(global_position + Vector2(0, -20), Palette.UI_DIM, 16, 140.0, 3.0, 0.6)
	queue_free()


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _draw() -> void:
	var d := ContentDB.get_item(item_id)
	var rc := Palette.rarity_color(str(d.get("rarity", "common")))
	# Mesita (Cabecera) o pedestal de cera.
	draw_circle(Vector2(0, 16), 24.0, Color(0, 0, 0, 0.35))
	if is_altar():
		draw_rect(Rect2(-20, -4, 40, 22), Color(0.16, 0.13, 0.12))
		draw_rect(Rect2(-20, -6, 40, 4), Color(0.26, 0.21, 0.18))
		draw_line(Vector2(-14, 6), Vector2(14, 6), Color(0.3, 0.25, 0.2), 1.5)
	else:
		draw_colored_polygon(PackedVector2Array([Vector2(-20, 16), Vector2(-14, -2), Vector2(14, -2), Vector2(20, 16)]), Color(0.22, 0.17, 0.16))
		draw_rect(Rect2(-16, -6, 32, 5), Color(0.32, 0.25, 0.2))
	var bob := sin(_t * 2.2) * 4.0
	var c := Vector2(0, -30 + bob)
	var pulse := 0.5 + 0.5 * sin(_t * 2.6)
	draw_circle(c, 34.0, Color(Palette.FLAME_CORE, 0.05 + 0.03 * pulse))
	draw_circle(c, 22.0, Color(rc, 0.12 + 0.06 * pulse))
	GlyphPainter.draw_item(self, d, c, 15.0, _t)
	# Motas de luz que suben: el recuerdo "respira".
	for i in 4:
		var k := fmod(_t * 0.45 + i * 0.25, 1.0)
		var px := sin(_t * 1.3 + i * 2.1) * 14.0
		draw_circle(c + Vector2(px, 18.0 - k * 46.0), 1.6, Color(Palette.FLAME_CORE, 0.6 * (1.0 - k)))
	if is_altar():
		var total_w := price * 14.0
		for i in price:
			GlyphPainter.flame(self, Vector2(-total_w * 0.5 + 7.0 + i * 14.0, 34), 5.5, _t + i)

class_name ItemPedestal
extends Node2D
## Pedestal de objeto (tesoro, jefe, secreta) o de venta (tienda).
## Se toma con INTERACTUAR (E) para que el jugador lea la descripción antes de
## decidir. Si pertenece a un grupo de elección, tomar uno hace DESAPARECER los
## demás: decisión irreversible.

const RANGE := 66.0

var world: CombatWorld
var entry: Dictionary = {}
var item_id := ""
var consumable_kind := ""
var price := 0
var group := -1
var _t := 0.0
var taken := false


func setup(w: CombatWorld, e: Dictionary) -> void:
	world = w
	entry = e
	item_id = str(e.get("item_id", ""))
	consumable_kind = str(e.get("kind", "")) if bool(e.get("consumable", false)) else ""
	price = maxi(0, int(e.get("price", 0)))
	group = int(e.get("group", -1))
	add_to_group("interactables")
	add_to_group("pedestals")


func is_consumable() -> bool:
	return consumable_kind != ""


func prompt() -> Array:
	if is_consumable():
		var names := {"heart": "Cuenta de vida", "key": "Llave de hueso", "bomb": "Bomba de sebo", "wax": "Cuenta de cera"}
		return ["[E] Comprar %s — %d óbolos" % [names.get(consumable_kind, consumable_kind), price], ""]
	var d := ContentDB.get_item(item_id)
	var head := "[E] Tomar: " if price <= 0 else "[E] Comprar (%d óbolos): " % price
	if price <= 0 and _has_rivals():
		head = "[E] Elegir (las demás se desvanecen): "
	var rar := Palette.rarity_label(str(d.get("rarity", "common")))
	var tag_type := "Activo" if str(d.get("type", "")) == "active" else "Pasivo"
	var detail := "%s · %s — %s" % [tag_type, rar, str(d.get("desc", ""))]
	if world != null and world.player != null and world.player.inventory != null:
		var prog := world.player.inventory.preview_progress(item_id)
		if prog != "":
			detail += "\nSinergias: " + prog
	return [head + str(d.get("name", item_id)), detail]


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
	if price > pl.coins:
		Audio.play("deny")
		world.toast("Te faltan %d óbolos" % (price - pl.coins), Palette.UI_DANGER)
		return false
	if is_consumable():
		if consumable_kind == "heart" and pl.hp >= pl.max_hp():
			Audio.play("deny")
			world.toast("Ya tienes la vida completa", Palette.UI_DIM)
			return false
	if price > 0:
		pl.add_resources(-price, 0, 0)
	taken = true
	entry["taken"] = true
	if is_consumable():
		match consumable_kind:
			"heart":
				pl.heal(1)
			"key":
				pl.add_resources(0, 1, 0)
			"bomb":
				pl.add_resources(0, 0, 1)
			"wax":
				pl.add_wax(1)
		Audio.play("coin")
	else:
		var d := ContentDB.get_item(item_id)
		pl.inventory.add_item(item_id, int(entry.get("active_charge", -1)))
		EventBus.banner.emit(str(d.get("name", item_id)), str(d.get("desc", "")), Palette.rarity_color(str(d.get("rarity", "common"))))
		Audio.play("item")
		world.fx.burst(global_position + Vector2(0, -24), Palette.rarity_color(str(d.get("rarity", "common"))), 24, 220.0, 3.0, 0.7)
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
	draw_circle(Vector2(0, 14), 22.0, Palette.SHADOW)
	draw_colored_polygon(PackedVector2Array([Vector2(-22, 16), Vector2(-16, -2), Vector2(16, -2), Vector2(22, 16)]), Palette.WALL_TOP)
	draw_rect(Rect2(-18, -6, 36, 6), Palette.WALL_TOP.lightened(0.1))
	var bob := sin(_t * 2.5) * 4.0
	var c := Vector2(0, -30 + bob)
	if is_consumable():
		var glyph := {"heart": "heart", "key": "key", "bomb": "bomb", "wax": "wax"}.get(consumable_kind, "coin_small") as String
		GlyphPainter.draw_glyph(self, glyph, c, 12.0, Palette.BONE, Palette.WALL_TOP, _t)
	else:
		var d := ContentDB.get_item(item_id)
		var rc := Palette.rarity_color(str(d.get("rarity", "common")))
		draw_circle(c, 26.0, Color(rc, 0.12 + 0.05 * sin(_t * 3.0)))
		GlyphPainter.draw_item(self, d, c, 15.0, _t)
	if price > 0:
		var font := ThemeDB.fallback_font
		var txt := str(price)
		var w := font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x
		GlyphPainter.draw_glyph(self, "coin_small", Vector2(-w * 0.5 - 8, 32), 6.0, Palette.BONE, Palette.WALL_TOP)
		draw_string(font, Vector2(-w * 0.5 + 2, 37), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Palette.UI_ACCENT)

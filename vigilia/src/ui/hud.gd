class_name Hud
extends ScaledRoot
## HUD de partida. Escucha EventBus: la simulación nunca llama a la interfaz.
##
## Principio: lo mínimo para jugar, y que lo que se muestra pertenezca al sueño.
##   - Arriba a la izquierda, la LLAMA (vida) como pequeñas llamas, la cera y el
##     recuerdo activo.
##   - Arriba, en combate, las velas de la sala (encendidas / por encender).
##   - Al recordar algo, una carta con su nombre, su texto y lo que hace.
##   - Los susurros del Arrullo y la voz de quien vela, abajo y despacio.

var game: Node
var minimap: Minimap
var _status: _StatusPanel
var _votives: _VotiveBar
var _floor_label: Label
var _banner_box: VBoxContainer
var _banner_title: Label
var _banner_sub: Label
var _banner_t := 0.0
## Un cartel "retenido" (activación de sinergia o cola pendiente) no se pisa.
var _banner_sticky := false
var _banner_queue: Array = []
var _card: VBoxContainer
var _card_name: Label
var _card_flavor: Label
var _card_desc: Label
var _card_t := 0.0
var _toasts: VBoxContainer
var _prompt_panel: PanelContainer
var _prompt_title: Label
var _prompt_detail: Label
var _boss_bar: _BossBar
var _items_row: _ItemsRow
var _whisper: Label
var _whisper_t := 0.0
var _whisper_len := 0.0
var _hint: Label
var _fps_label: Label


func setup(p_game: Node) -> void:
	game = p_game
	theme = UIKit.theme()

	_status = _StatusPanel.new()
	_status.position = Vector2(18, 14)
	_status.size = Vector2(380, 130)
	add_child(_status)

	_votives = _VotiveBar.new()
	_votives.anchor_left = 0.5
	_votives.anchor_right = 0.5
	_votives.offset_left = -160
	_votives.offset_right = 160
	_votives.offset_top = 14
	_votives.offset_bottom = 58
	_votives.visible = false
	add_child(_votives)

	_hint = UIKit.label("", 15, Color(Palette.FLAME_CORE, 0.85), 4)
	_hint.anchor_left = 0.5
	_hint.anchor_right = 0.5
	_hint.offset_left = -360
	_hint.offset_right = 360
	_hint.offset_top = 60
	_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(_hint)

	minimap = Minimap.new()
	minimap.anchor_left = 1.0
	minimap.anchor_right = 1.0
	minimap.offset_left = -176
	minimap.offset_right = -14
	minimap.offset_top = 14
	minimap.offset_bottom = 120
	add_child(minimap)
	_floor_label = UIKit.label("", 13, Palette.UI_DIM, 3)
	_floor_label.anchor_left = 1.0
	_floor_label.anchor_right = 1.0
	_floor_label.offset_left = -300
	_floor_label.offset_right = -14
	_floor_label.offset_top = 124
	_floor_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	add_child(_floor_label)

	_banner_box = VBoxContainer.new()
	_banner_box.anchor_left = 0.5
	_banner_box.anchor_right = 0.5
	_banner_box.offset_left = -440
	_banner_box.offset_right = 440
	_banner_box.offset_top = 104
	_banner_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_banner_title = UIKit.label("", 34, Palette.UI_ACCENT, 6)
	_banner_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner_sub = UIKit.label("", 17, Palette.UI_TEXT, 4)
	_banner_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner_sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_banner_box.add_child(_banner_title)
	_banner_box.add_child(_banner_sub)
	_banner_box.modulate.a = 0.0
	add_child(_banner_box)

	_card = VBoxContainer.new()
	_card.anchor_left = 0.5
	_card.anchor_right = 0.5
	_card.offset_left = -360
	_card.offset_right = 360
	_card.offset_top = 150
	_card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_card.add_theme_constant_override("separation", 6)
	_card_name = UIKit.label("", 30, Palette.FLAME_CORE, 6)
	_card_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_card_flavor = UIKit.label("", 16, Color(Palette.WAX, 0.9), 4)
	_card_flavor.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_card_flavor.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_card_desc = UIKit.label("", 15, Palette.UI_TEXT, 4)
	_card_desc.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_card_desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_card.add_child(_card_name)
	_card.add_child(_card_flavor)
	_card.add_child(_card_desc)
	_card.modulate.a = 0.0
	add_child(_card)

	_toasts = VBoxContainer.new()
	_toasts.anchor_left = 0.5
	_toasts.anchor_right = 0.5
	_toasts.offset_left = -360
	_toasts.offset_right = 360
	_toasts.offset_top = 300
	_toasts.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_toasts)

	_whisper = UIKit.label("", 22, Palette.WHISPER, 5)
	_whisper.anchor_left = 0.5
	_whisper.anchor_right = 0.5
	_whisper.anchor_top = 1.0
	_whisper.anchor_bottom = 1.0
	_whisper.offset_left = -460
	_whisper.offset_right = 460
	_whisper.offset_top = -230
	_whisper.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_whisper.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_whisper.modulate.a = 0.0
	add_child(_whisper)

	_prompt_panel = PanelContainer.new()
	_prompt_panel.anchor_top = 1.0
	_prompt_panel.anchor_bottom = 1.0
	_prompt_panel.anchor_left = 0.5
	_prompt_panel.anchor_right = 0.5
	_prompt_panel.offset_left = -360
	_prompt_panel.offset_right = 360
	_prompt_panel.offset_top = -150
	_prompt_panel.offset_bottom = -78
	_prompt_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_prompt_panel.grow_vertical = Control.GROW_DIRECTION_BEGIN
	_prompt_panel.add_theme_stylebox_override("panel", UIKit.soft_panel())
	var pv := VBoxContainer.new()
	pv.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_prompt_title = UIKit.label("", 18, Palette.UI_ACCENT)
	_prompt_detail = UIKit.label("", 14, Palette.UI_TEXT)
	_prompt_detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_prompt_detail.custom_minimum_size = Vector2(680, 0)
	pv.add_child(_prompt_title)
	pv.add_child(_prompt_detail)
	_prompt_panel.add_child(pv)
	_prompt_panel.visible = false
	add_child(_prompt_panel)

	_boss_bar = _BossBar.new()
	_boss_bar.anchor_top = 1.0
	_boss_bar.anchor_bottom = 1.0
	_boss_bar.anchor_left = 0.5
	_boss_bar.anchor_right = 0.5
	_boss_bar.offset_left = -300
	_boss_bar.offset_right = 300
	_boss_bar.offset_top = -60
	_boss_bar.offset_bottom = -18
	_boss_bar.visible = false
	add_child(_boss_bar)

	_items_row = _ItemsRow.new()
	_items_row.anchor_top = 1.0
	_items_row.anchor_bottom = 1.0
	_items_row.offset_left = 14
	_items_row.offset_right = 420
	_items_row.offset_top = -46
	_items_row.offset_bottom = -10
	add_child(_items_row)

	_fps_label = UIKit.label("", 12, Palette.UI_DIM, 2)
	_fps_label.anchor_left = 1.0
	_fps_label.anchor_right = 1.0
	_fps_label.offset_left = -110
	_fps_label.offset_right = -14
	_fps_label.offset_top = 146
	_fps_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	add_child(_fps_label)

	EventBus.banner.connect(_on_banner)
	EventBus.toast.connect(_on_toast)
	EventBus.interact_prompt.connect(_on_prompt)
	EventBus.boss_started.connect(_on_boss_started)
	EventBus.boss_health_changed.connect(_on_boss_health)
	EventBus.boss_defeated.connect(func(_id: String) -> void: _boss_bar.visible = false)
	EventBus.item_acquired.connect(func(_id: String, _s: int) -> void: _items_row.refresh(game.player))
	EventBus.memory_taken.connect(_on_memory_taken)
	EventBus.room_entered.connect(_on_room_entered)
	EventBus.floor_entered.connect(_on_floor_entered)
	EventBus.synergy_activated.connect(_on_synergy_activated)
	EventBus.votives_changed.connect(_on_votives_changed)
	EventBus.whisper.connect(_on_whisper)


func set_layout(l: FloorLayout) -> void:
	minimap.layout = l


func refresh_minimap() -> void:
	minimap.queue_redraw()


func _on_room_entered(rd: RoomData) -> void:
	minimap.current = rd.coord
	if rd.type != "boss":
		_boss_bar.visible = false


func _on_floor_entered(_index: int, floor_name: String) -> void:
	_floor_label.text = floor_name


func _on_votives_changed(lit: int, total: int) -> void:
	_votives.lit = lit
	_votives.total = total
	var combat: bool = game.director != null and game.director.combat_active
	_votives.visible = total > 0 and combat
	# Pista solo en las primeras salas de las primeras noches.
	var run: RunState = game.run
	if combat and total > 0 and run.night <= 2 and run.floor_index == 0 and run.rooms_cleared < 2 and lit == 0:
		_hint.text = "Quédate junto a una vela apagada para encenderla. Si todas arden, la sala despierta."
	else:
		_hint.text = ""


func _on_banner(title: String, subtitle: String, color: Color) -> void:
	if _banner_sticky and _banner_t > 0.0:
		if _banner_queue.size() < 3:
			_banner_queue.append([title, subtitle, color])
		return
	_show_banner(title, subtitle, color)


## ItemSystem emite el cartel de la sinergia y DESPUÉS esta señal: lo retiene.
func _on_synergy_activated(_sid: String) -> void:
	_banner_sticky = true


func _show_banner(title: String, subtitle: String, color: Color) -> void:
	_banner_title.text = title
	_banner_title.add_theme_color_override("font_color", color)
	_banner_sub.text = subtitle
	_banner_t = 3.4
	_banner_sticky = false


func _on_memory_taken(item_id: String) -> void:
	var d := ContentDB.get_item(item_id)
	_card_name.text = str(d.get("name", item_id))
	_card_name.add_theme_color_override("font_color", Palette.FLAME_CORE.lerp(Palette.rarity_color(str(d.get("rarity", "common"))), 0.35))
	var flavor := str(d.get("flavor", ""))
	_card_flavor.text = "«%s»" % flavor if flavor != "" else ""
	_card_desc.text = str(d.get("desc", ""))
	_card_t = 5.0


func _on_toast(text: String, color: Color) -> void:
	if text == "":
		return
	var l := UIKit.label(text, 16, color, 4)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.set_meta("t", 3.0)
	_toasts.add_child(l)
	while _toasts.get_child_count() > 3:
		var old := _toasts.get_child(0)
		_toasts.remove_child(old)
		old.queue_free()


func _on_whisper(text: String, outside: bool) -> void:
	_whisper.text = text
	_whisper.add_theme_color_override("font_color", Palette.OUTSIDE_VOICE if outside else Palette.WHISPER)
	_whisper_len = clampf(2.6 + text.length() * 0.05, 3.0, 7.0)
	_whisper_t = _whisper_len


func _on_prompt(title: String, detail: String) -> void:
	_prompt_panel.visible = title != ""
	_prompt_title.text = title
	_prompt_detail.text = detail
	_prompt_detail.visible = detail != ""


func _on_boss_started(boss_name: String, max_hp: float) -> void:
	_boss_bar.boss_name = boss_name
	_boss_bar.max_hp = max_hp
	_boss_bar.hp = max_hp
	_boss_bar.visible = true


func _on_boss_health(hp: float, max_hp: float, phase: int) -> void:
	_boss_bar.hp = hp
	_boss_bar.max_hp = max_hp
	_boss_bar.phase = phase


func _process(delta: float) -> void:
	if game == null:
		return
	_status.player = game.player
	_status.queue_redraw()
	if _banner_t > 0.0:
		_banner_t -= delta
		_banner_box.modulate.a = clampf(_banner_t / 0.7, 0.0, 1.0) * clampf((3.4 - _banner_t) / 0.35, 0.0, 1.0)
	elif not _banner_queue.is_empty():
		var b: Array = _banner_queue.pop_front()
		var col: Color = b[2]
		_show_banner(str(b[0]), str(b[1]), col)
		_banner_sticky = not _banner_queue.is_empty()
	else:
		_banner_box.modulate.a = 0.0
	if _card_t > 0.0:
		_card_t -= delta
		_card.modulate.a = clampf(_card_t / 0.8, 0.0, 1.0) * clampf((5.0 - _card_t) / 0.3, 0.0, 1.0)
		# La carta del recuerdo manda: el cartel genérico espera.
		_banner_box.modulate.a = minf(_banner_box.modulate.a, 1.0 - _card.modulate.a)
	else:
		_card.modulate.a = 0.0
	if _whisper_t > 0.0:
		_whisper_t -= delta
		var since := _whisper_len - _whisper_t
		_whisper.modulate.a = clampf(since / 0.9, 0.0, 1.0) * clampf(_whisper_t / 1.2, 0.0, 1.0)
	else:
		_whisper.modulate.a = 0.0
	for l in _toasts.get_children():
		var t: float = float(l.get_meta("t", 0.0)) - delta
		l.set_meta("t", t)
		l.modulate.a = clampf(t / 0.6, 0.0, 1.0)
		if t <= 0.0:
			l.queue_free()
	_fps_label.visible = Settings.show_fps
	if _fps_label.visible:
		_fps_label.text = "%d FPS" % Engine.get_frames_per_second()


## La llama (vida) como llamas pequeñas, la cera y el recuerdo activo.
class _StatusPanel:
	extends Control
	var player: Player
	var _t := 0.0

	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		_t += get_process_delta_time()
		if player == null:
			return
		var font := ThemeDB.fallback_font
		var mh := player.max_hp()
		var low := player.hp <= 2 and player.alive
		var x := 12.0
		for i in mh:
			var base := Vector2(x, 34)
			draw_line(base + Vector2(0, 4), base + Vector2(0, -2), Color(0.25, 0.2, 0.2), 2.0)
			if i < player.hp:
				# La última llama tiembla y se enfría cuando queda poca.
				var col := Palette.FLAME
				var h := 11.0
				if low:
					col = Palette.FLAME.lerp(Palette.FLAME_BLUE, 0.5)
					h = 9.0 + 2.0 * absf(sin(_t * 6.0 + i))
				draw_circle(base + Vector2(0, -8), 11.0, Color(col, 0.12))
				GlyphPainter.flame(self, base, h, _t * 1.3 + i * 0.9, col, Palette.FLAME_CORE)
			else:
				draw_circle(base + Vector2(0, -3), 2.0, Color(0.5, 0.45, 0.45, 0.5))
			x += 22.0
		for i in player.wax:
			var c2 := Vector2(x + 4, 28)
			draw_circle(c2 + Vector2(0, 2), 7.0, Palette.WAX_SHADOW)
			draw_circle(c2, 6.0, Palette.WAX)
			x += 18.0
		var inv := player.inventory
		var box := Rect2(4, 56, 52, 52)
		draw_rect(box, Color(0.05, 0.03, 0.06, 0.55))
		draw_rect(box, Color(Palette.UI_BORDER, 0.7), false, 1.5)
		if inv != null and inv.active_id != "":
			var d := ContentDB.get_item(inv.active_id)
			var ready := inv.active_charge >= inv.active_max
			if ready:
				draw_rect(box.grow(2), Color(Palette.UI_ACCENT, 0.45 + 0.3 * sin(_t * 4.0)), false, 2.0)
			GlyphPainter.draw_item(self, d, box.get_center(), 16.0, _t)
			for i in inv.active_max:
				var pc := Vector2(66 + i * 12, 96)
				draw_circle(pc, 4.0, Palette.UI_ACCENT if i < inv.active_charge else Color(0.25, 0.2, 0.25, 0.9))
			draw_string(font, Vector2(64, 76), "Q  " + str(d.get("name", "")), HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Palette.UI_TEXT if ready else Palette.UI_DIM)
		if player.crit_charges > 0:
			draw_string(font, Vector2(64, 122), "lucidez ×%d" % player.crit_charges, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Palette.PLAYER_EYE)


## Velas de la sala: encendidas y por encender.
class _VotiveBar:
	extends Control
	var lit := 0
	var total := 0
	var _t := 0.0

	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _process(delta: float) -> void:
		_t += delta
		queue_redraw()

	func _draw() -> void:
		if total <= 0:
			return
		var gap := 34.0
		var x0 := size.x * 0.5 - (total - 1) * gap * 0.5
		for i in total:
			var c := Vector2(x0 + i * gap, 30)
			draw_rect(Rect2(c + Vector2(-5, -12), Vector2(10, 16)), Palette.WAX if i < lit else Palette.WAX.darkened(0.55))
			if i < lit:
				draw_circle(c + Vector2(0, -18), 12.0, Color(Palette.FLAME, 0.14))
				GlyphPainter.flame(self, c + Vector2(0, -12), 7.0, _t + i)
			else:
				draw_line(c + Vector2(0, -12), c + Vector2(0, -17), Color(0.2, 0.17, 0.17), 2.0)


## Barra de jefe fina con marcas de fase.
class _BossBar:
	extends Control
	var boss_name := ""
	var hp := 1.0
	var max_hp := 1.0
	var phase := 1
	var _shown := 1.0

	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _process(delta: float) -> void:
		_shown = move_toward(_shown, hp / maxf(1.0, max_hp), delta * 0.8)
		queue_redraw()

	func _draw() -> void:
		var font := ThemeDB.fallback_font
		var label := boss_name
		var tw := font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x
		draw_string(font, Vector2((size.x - tw) * 0.5 + 1, 15), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color.BLACK)
		draw_string(font, Vector2((size.x - tw) * 0.5, 14), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Palette.WAX)
		var bar := Rect2(0, 24, size.x, 7)
		draw_rect(bar, Color(0.05, 0.02, 0.04, 0.85))
		var ratio := clampf(hp / maxf(1.0, max_hp), 0.0, 1.0)
		draw_rect(Rect2(bar.position, Vector2(bar.size.x * _shown, bar.size.y)), Color(1, 0.85, 0.7, 0.45))
		draw_rect(Rect2(bar.position, Vector2(bar.size.x * ratio, bar.size.y)), Palette.WAX.lerp(Palette.BLOOD, 0.35))
		for m in [0.66, 0.33]:
			var x: float = bar.position.x + bar.size.x * m
			draw_line(Vector2(x, bar.position.y - 2), Vector2(x, bar.end.y + 2), Color(0, 0, 0, 0.8), 2.0)


## Fila de recuerdos recientes.
class _ItemsRow:
	extends Control
	var ids: Array = []
	var _t := 0.0

	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func refresh(pl: Player) -> void:
		ids = pl.inventory.items.duplicate() if pl != null else []
		queue_redraw()

	func _process(delta: float) -> void:
		_t += delta
		if not ids.is_empty():
			queue_redraw()

	func _draw() -> void:
		var start := maxi(0, ids.size() - 12)
		var x := 16.0
		for i in range(start, ids.size()):
			var d := ContentDB.get_item(str(ids[i]))
			draw_circle(Vector2(x, 18), 14.0, Color(0, 0, 0, 0.4))
			GlyphPainter.draw_item(self, d, Vector2(x, 18), 10.0, _t)
			x += 30.0

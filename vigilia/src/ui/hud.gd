class_name Hud
extends ScaledRoot
## HUD de partida. Escucha EventBus: la simulación nunca llama a la interfaz.

var game: Node
var minimap: Minimap
var _status: _StatusPanel
var _floor_label: Label
var _banner_box: VBoxContainer
var _banner_title: Label
var _banner_sub: Label
var _banner_t := 0.0
## Un cartel "retenido" (activación de sinergia o cola pendiente) no se pisa: los
## carteles que llegan mientras se muestra esperan su turno. Antes, el cartel de
## la sinergia quedaba tapado EN EL MISMO FRAME por el del objeto recogido.
var _banner_sticky := false
var _banner_queue: Array = []
var _toasts: VBoxContainer
var _prompt_panel: PanelContainer
var _prompt_title: Label
var _prompt_detail: Label
var _boss_bar: _BossBar
var _items_row: _ItemsRow
var _tolerance_label: Label
var _fps_label: Label


func setup(p_game: Node) -> void:
	game = p_game
	theme = UIKit.theme()

	_status = _StatusPanel.new()
	_status.position = Vector2(14, 10)
	_status.size = Vector2(380, 150)
	add_child(_status)

	minimap = Minimap.new()
	minimap.anchor_left = 1.0
	minimap.anchor_right = 1.0
	minimap.offset_left = -196
	minimap.offset_right = -12
	minimap.offset_top = 10
	minimap.offset_bottom = 138
	add_child(minimap)
	_floor_label = UIKit.label("", 14, Palette.UI_DIM, 3)
	_floor_label.anchor_left = 1.0
	_floor_label.anchor_right = 1.0
	_floor_label.offset_left = -300
	_floor_label.offset_right = -12
	_floor_label.offset_top = 142
	_floor_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	add_child(_floor_label)

	_banner_box = VBoxContainer.new()
	_banner_box.anchor_left = 0.5
	_banner_box.anchor_right = 0.5
	_banner_box.offset_left = -420
	_banner_box.offset_right = 420
	_banner_box.offset_top = 92
	_banner_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_banner_title = UIKit.label("", 30, Palette.UI_ACCENT, 6)
	_banner_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner_sub = UIKit.label("", 16, Palette.UI_TEXT, 4)
	_banner_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner_sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_banner_box.add_child(_banner_title)
	_banner_box.add_child(_banner_sub)
	_banner_box.modulate.a = 0.0
	add_child(_banner_box)

	_toasts = VBoxContainer.new()
	_toasts.anchor_left = 0.5
	_toasts.anchor_right = 0.5
	_toasts.offset_left = -360
	_toasts.offset_right = 360
	_toasts.offset_top = 196
	_toasts.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_toasts)

	_prompt_panel = PanelContainer.new()
	_prompt_panel.anchor_top = 1.0
	_prompt_panel.anchor_bottom = 1.0
	_prompt_panel.anchor_left = 0.5
	_prompt_panel.anchor_right = 0.5
	_prompt_panel.offset_left = -330
	_prompt_panel.offset_right = 330
	_prompt_panel.offset_top = -132
	_prompt_panel.offset_bottom = -76
	_prompt_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Crece hacia arriba si el detalle ocupa más líneas (no invade la barra de jefe).
	_prompt_panel.grow_vertical = Control.GROW_DIRECTION_BEGIN
	var pv := VBoxContainer.new()
	pv.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_prompt_title = UIKit.label("", 18, Palette.UI_ACCENT)
	_prompt_detail = UIKit.label("", 14, Palette.UI_TEXT)
	_prompt_detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_prompt_detail.custom_minimum_size = Vector2(620, 0)
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
	_boss_bar.offset_top = -64
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

	_tolerance_label = UIKit.label("", 13, Palette.FLAME, 3)
	_tolerance_label.anchor_left = 1.0
	_tolerance_label.anchor_right = 1.0
	_tolerance_label.offset_left = -300
	_tolerance_label.offset_right = -12
	_tolerance_label.offset_top = 162
	_tolerance_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_tolerance_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(_tolerance_label)

	_fps_label = UIKit.label("", 12, Palette.UI_DIM, 2)
	_fps_label.anchor_left = 1.0
	_fps_label.anchor_right = 1.0
	_fps_label.offset_left = -110
	_fps_label.offset_right = -12
	_fps_label.offset_top = 236
	_fps_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	add_child(_fps_label)

	EventBus.banner.connect(_on_banner)
	EventBus.toast.connect(_on_toast)
	EventBus.interact_prompt.connect(_on_prompt)
	EventBus.boss_started.connect(_on_boss_started)
	EventBus.boss_health_changed.connect(_on_boss_health)
	EventBus.boss_defeated.connect(func(_id: String) -> void: _boss_bar.visible = false)
	EventBus.item_acquired.connect(func(_id: String, _s: int) -> void: _items_row.refresh(game.player))
	EventBus.room_entered.connect(_on_room_entered)
	EventBus.floor_entered.connect(_on_floor_entered)
	EventBus.synergy_activated.connect(_on_synergy_activated)


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
	_tolerance_label.text = ToleranceSystem.describe(game.run)


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
	_banner_t = 3.2
	_banner_sticky = false


func _on_toast(text: String, color: Color) -> void:
	if text == "":
		return
	var l := UIKit.label(text, 16, color, 4)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.set_meta("t", 3.0)
	_toasts.add_child(l)
	while _toasts.get_child_count() > 4:
		var old := _toasts.get_child(0)
		_toasts.remove_child(old)
		old.queue_free()


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
		_banner_box.modulate.a = clampf(_banner_t / 0.6, 0.0, 1.0) * clampf((3.2 - _banner_t) / 0.25, 0.0, 1.0)
	elif not _banner_queue.is_empty():
		var b: Array = _banner_queue.pop_front()
		var col: Color = b[2]
		_show_banner(str(b[0]), str(b[1]), col)
		# La cola se vacía en orden: mientras quede algo, el cartel actual no se pisa.
		_banner_sticky = not _banner_queue.is_empty()
	else:
		_banner_box.modulate.a = 0.0
	for l in _toasts.get_children():
		var t: float = float(l.get_meta("t", 0.0)) - delta
		l.set_meta("t", t)
		l.modulate.a = clampf(t / 0.6, 0.0, 1.0)
		if t <= 0.0:
			l.queue_free()
	_fps_label.visible = Settings.show_fps
	if _fps_label.visible:
		_fps_label.text = "%d FPS" % Engine.get_frames_per_second()


## Panel superior izquierdo: vida (cuentas), cera, recursos y objeto activo.
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
		var x := 10.0
		for i in mh:
			var c := Vector2(x, 14)
			if i < player.hp:
				draw_circle(c, 8.0, Palette.BLOOD_DARK)
				draw_circle(c, 6.5, Palette.BLOOD)
				draw_circle(c + Vector2(-2, -2), 2.2, Color(1, 1, 1, 0.5))
			else:
				draw_circle(c, 8.0, Color(0, 0, 0, 0.6))
				draw_arc(c, 6.5, 0, TAU, 14, Color(Palette.BLOOD, 0.6), 1.5)
			x += 19.0
		for i in player.wax:
			var c2 := Vector2(x, 14)
			draw_circle(c2, 8.0, Palette.WAX_SHADOW)
			draw_circle(c2, 6.5, Palette.WAX)
			x += 19.0
		var y := 44.0
		var items := [["coin_small", player.coins], ["key", player.keys], ["bomb", player.bombs]]
		var rx := 6.0
		for it in items:
			GlyphPainter.draw_glyph(self, str(it[0]), Vector2(rx + 8, y), 9.0, Palette.BONE, Palette.WALL_TOP, _t)
			draw_string(font, Vector2(rx + 22, y + 6), "%02d" % int(it[1]), HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Palette.UI_TEXT)
			rx += 70.0
		var inv := player.inventory
		var box := Rect2(4, 66, 58, 58)
		draw_rect(box, Color(0.05, 0.03, 0.06, 0.8))
		draw_rect(box, Palette.UI_BORDER, false, 2.0)
		if inv != null and inv.active_id != "":
			var d := ContentDB.get_item(inv.active_id)
			var ready := inv.active_charge >= inv.active_max
			if ready:
				draw_rect(box.grow(2), Color(Palette.UI_ACCENT, 0.5 + 0.3 * sin(_t * 4.0)), false, 2.0)
			GlyphPainter.draw_item(self, d, box.get_center(), 18.0, _t)
			var seg_w := 40.0 / maxf(1.0, float(inv.active_max))
			for i in inv.active_max:
				var sr := Rect2(70 + i * (seg_w + 3), 84, seg_w, 12)
				draw_rect(sr, Palette.UI_ACCENT if i < inv.active_charge else Color(0.2, 0.15, 0.2, 0.9))
			draw_string(font, Vector2(70, 78), "[Q] " + str(d.get("name", "")), HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Palette.UI_TEXT if ready else Palette.UI_DIM)
		else:
			draw_string(font, Vector2(70, 100), "Sin objeto activo", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Palette.UI_DIM)
		if player.crit_charges > 0:
			draw_string(font, Vector2(70, 118), "Lucidez x%d" % player.crit_charges, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Palette.PLAYER_EYE)


## Barra de jefe con marcas de fase.
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
		var label := boss_name + ("   ·   Fase %s" % ["I", "II", "III", "IV"][clampi(phase - 1, 0, 3)] if phase > 1 else "")
		var tw := font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 16).x
		draw_string(font, Vector2((size.x - tw) * 0.5 + 1, 15), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color.BLACK)
		draw_string(font, Vector2((size.x - tw) * 0.5, 14), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Palette.UI_TEXT)
		var bar := Rect2(0, 22, size.x, 16)
		draw_rect(bar, Color(0.05, 0.02, 0.04, 0.9))
		var ratio := clampf(hp / maxf(1.0, max_hp), 0.0, 1.0)
		draw_rect(Rect2(bar.position, Vector2(bar.size.x * _shown, bar.size.y)), Color(1, 0.85, 0.7, 0.5))
		draw_rect(Rect2(bar.position, Vector2(bar.size.x * ratio, bar.size.y)), Palette.BLOOD)
		for m in [0.66, 0.33]:
			var x: float = bar.position.x + bar.size.x * m
			draw_line(Vector2(x, bar.position.y), Vector2(x, bar.end.y), Color(0, 0, 0, 0.8), 2.0)
		draw_rect(bar, Palette.UI_BORDER, false, 2.0)


## Fila de reliquias recientes.
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
			draw_circle(Vector2(x, 18), 15.0, Color(0, 0, 0, 0.45))
			GlyphPainter.draw_item(self, d, Vector2(x, 18), 11.0, _t)
			x += 32.0

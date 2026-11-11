class_name UIKit
extends RefCounted
## Tema visual y fábricas de controles. Mantiene la interfaz coherente sin
## recursos externos (estilo: cera, latón y penumbra).

static var _theme: Theme = null


static func theme() -> Theme:
	if _theme != null:
		return _theme
	var t := Theme.new()
	t.default_font_size = 17
	var panel := _box(Palette.UI_PANEL, Palette.UI_BORDER, 2, 6, 14)
	t.set_stylebox("panel", "PanelContainer", panel)
	t.set_stylebox("panel", "Panel", panel)
	t.set_stylebox("normal", "Button", _box(Color(0.16, 0.11, 0.17, 0.95), Palette.UI_BORDER, 1, 4, 8))
	t.set_stylebox("hover", "Button", _box(Color(0.24, 0.16, 0.22, 0.98), Palette.UI_ACCENT, 1, 4, 8))
	t.set_stylebox("pressed", "Button", _box(Color(0.10, 0.07, 0.11, 1.0), Palette.UI_ACCENT, 1, 4, 8))
	t.set_stylebox("disabled", "Button", _box(Color(0.12, 0.10, 0.12, 0.6), Color(Palette.UI_BORDER, 0.4), 1, 4, 8))
	var focus := _box(Color(0, 0, 0, 0), Palette.UI_ACCENT, 2, 4, 8)
	focus.draw_center = false
	t.set_stylebox("focus", "Button", focus)
	for c in ["Button", "CheckBox", "CheckButton"]:
		t.set_color("font_color", c, Palette.UI_TEXT)
		t.set_color("font_hover_color", c, Palette.UI_ACCENT)
		t.set_color("font_pressed_color", c, Palette.UI_ACCENT)
		t.set_color("font_focus_color", c, Palette.UI_ACCENT)
		t.set_color("font_disabled_color", c, Palette.UI_DIM)
	t.set_color("font_color", "Label", Palette.UI_TEXT)
	t.set_stylebox("normal", "LineEdit", _box(Color(0.08, 0.06, 0.09, 1.0), Palette.UI_BORDER, 1, 4, 8))
	t.set_stylebox("focus", "LineEdit", _box(Color(0.08, 0.06, 0.09, 1.0), Palette.UI_ACCENT, 1, 4, 8))
	t.set_color("font_color", "LineEdit", Palette.UI_TEXT)
	t.set_color("font_placeholder_color", "LineEdit", Palette.UI_DIM)
	var slider := _box(Color(0.10, 0.07, 0.11, 1.0), Palette.UI_BORDER, 1, 3, 0)
	slider.content_margin_top = 4
	slider.content_margin_bottom = 4
	t.set_stylebox("slider", "HSlider", slider)
	t.set_stylebox("grabber_area", "HSlider", _box(Palette.WAX_DARK, Palette.WAX_DARK, 0, 3, 0))
	t.set_stylebox("grabber_area_highlight", "HSlider", _box(Palette.UI_ACCENT, Palette.UI_ACCENT, 0, 3, 0))
	t.set_stylebox("panel", "TabContainer", _box(Color(0.09, 0.07, 0.10, 0.96), Palette.UI_BORDER, 1, 4, 12))
	t.set_stylebox("tab_selected", "TabBar", _box(Color(0.22, 0.15, 0.20, 1.0), Palette.UI_ACCENT, 1, 4, 8))
	t.set_stylebox("tab_unselected", "TabBar", _box(Color(0.12, 0.09, 0.13, 1.0), Palette.UI_BORDER, 1, 4, 8))
	t.set_stylebox("tab_hovered", "TabBar", _box(Color(0.18, 0.12, 0.17, 1.0), Palette.UI_ACCENT, 1, 4, 8))
	t.set_color("font_selected_color", "TabBar", Palette.UI_ACCENT)
	t.set_color("font_unselected_color", "TabBar", Palette.UI_DIM)
	t.set_color("font_hovered_color", "TabBar", Palette.UI_TEXT)
	var tip := _box(Color(0.06, 0.04, 0.07, 0.97), Palette.UI_ACCENT, 1, 4, 8)
	t.set_stylebox("panel", "TooltipPanel", tip)
	t.set_color("font_color", "TooltipLabel", Palette.UI_TEXT)
	_theme = t
	return t


static func _box(bg: Color, border: Color, border_w: int, radius: int, margin: int) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(border_w)
	s.set_corner_radius_all(radius)
	s.content_margin_left = margin
	s.content_margin_right = margin
	s.content_margin_top = margin * 0.6
	s.content_margin_bottom = margin * 0.6
	return s


static func label(text: String, size: int = 17, color: Color = Palette.UI_TEXT, outline: int = 0) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if outline > 0:
		l.add_theme_constant_override("outline_size", outline)
		l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


static func button(text: String, cb: Callable, min_w: float = 260.0) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(min_w, 40)
	b.pressed.connect(func() -> void:
		Audio.play("ui_select")
		cb.call())
	b.mouse_entered.connect(func() -> void: Audio.play("ui_move"))
	b.focus_entered.connect(func() -> void: Audio.play("ui_move"))
	return b


static func dim_background(alpha: float = 0.72) -> ColorRect:
	var c := ColorRect.new()
	c.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	c.color = Color(0.02, 0.01, 0.03, alpha)
	return c


static func center_box(parent: Control) -> CenterContainer:
	var cc := CenterContainer.new()
	cc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	parent.add_child(cc)
	return cc


static func format_time(seconds: float) -> String:
	var s := int(seconds)
	return "%d:%02d" % [s / 60, s % 60]

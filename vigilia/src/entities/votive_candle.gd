class_name VotiveCandle
extends Node2D
## Vela votiva: el corazón del bucle de sala.
##
## Cada sala de combate esconde 2-3 velas apagadas. Quedarse junto a una la
## enciende (la Espina le presta su fuego). Una vela encendida:
##   - ilumina su entorno y DEBILITA a las sombras dentro de su luz
##     (CombatWorld.in_votive_light: +25% de daño recibido y movimiento lento);
##   - emite el disparador "kindle" (los recuerdos de luz reaccionan).
## Si todas arden, la sala DESPIERTA: las sombras que queden se disipan.
## Las polillas, atraídas por la luz, pueden apagarlas (snuff()).
## Despertar la sala por la luz es más rápido pero renuncia a lo que dan las
## bajas (efectos "al matar", botín): es una decisión, no un atajo gratis.

signal lit_changed(candle: VotiveCandle, lit: bool)

const LIGHT_RANGE := 60.0
const LIGHT_TIME := 1.15
const DECAY := 0.55
const AURA := 150.0
const SNUFF_TIME := 1.4

static var _emissive: CanvasItemMaterial

var world: CombatWorld
var entry: Dictionary = {}
var lit := false
var progress := 0.0
var snuff_progress := 0.0
var _t := 0.0
var _light: PointLight2D
var _flare := 0.0


func setup(w: CombatWorld, e: Dictionary) -> void:
	world = w
	entry = e
	lit = bool(e.get("lit", false))
	progress = 1.0 if lit else 0.0
	add_to_group("votives")
	if _emissive == null:
		_emissive = CanvasItemMaterial.new()
		_emissive.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
	material = _emissive
	_t = float(int(e.get("tile", Vector2i.ZERO).x) * 7 + int(e.get("tile", Vector2i.ZERO).y) * 3)


func _ready() -> void:
	if lit:
		_make_light()


func _exit_tree() -> void:
	if world != null and world.player != null and world.player.kindling_target == self:
		world.player.kindling_target = null


func can_kindle() -> bool:
	return not lit and world != null and world.game != null and world.game.director.combat_active


func _physics_process(delta: float) -> void:
	_t += delta
	_flare = maxf(0.0, _flare - delta)
	if world == null:
		return
	var pl := world.player
	if pl == null:
		return
	if can_kindle():
		var near := pl.alive and pl.global_position.distance_to(global_position) <= LIGHT_RANGE + pl.radius
		if near:
			progress += delta * pl.stats.get_stat("kindle_speed") / LIGHT_TIME
			pl.kindling_target = self
			if progress >= 1.0:
				ignite(true)
		else:
			if pl.kindling_target == self:
				pl.kindling_target = null
			progress = maxf(0.0, progress - DECAY * delta)
	elif pl.kindling_target == self:
		pl.kindling_target = null
	if lit and snuff_progress > 0.0:
		snuff_progress = maxf(0.0, snuff_progress - delta * 0.5)
	queue_redraw()


## Enciende la vela. by_player = false cuando la sala despierta sin ella (todas
## las sombras abatidas): entonces no cuenta como "encender" para los recuerdos.
func ignite(by_player: bool) -> void:
	if lit:
		return
	lit = true
	progress = 1.0
	snuff_progress = 0.0
	entry["lit"] = true
	_flare = 0.6
	_make_light()
	if world.player != null and world.player.kindling_target == self:
		world.player.kindling_target = null
	world.fx.ring(global_position + Vector2(0, -24), 46.0, Palette.FLAME_CORE, 0.5, 3.0)
	world.fx.burst(global_position + Vector2(0, -24), Palette.FLAME, 14 if by_player else 6, 160.0, 2.5, 0.5)
	if by_player:
		Audio.play("kindle")
		world.fx.ring(global_position, AURA, Color(Palette.FLAME, 0.55), 0.8, 2.0)
		world.run.candles_lit += 1
		world.engine.emit("kindle", {"position": global_position, "depth": 0, "tags": PackedStringArray(["kindle", "light"])})
	lit_changed.emit(self, true)


## Una polilla se posa sobre la llama. Si aguanta lo bastante, la apaga.
func snuff(delta: float) -> void:
	if not lit or world == null or not world.game.director.combat_active:
		return
	snuff_progress += delta * 1.5
	if snuff_progress >= SNUFF_TIME:
		extinguish()


func extinguish() -> void:
	if not lit:
		return
	lit = false
	progress = 0.0
	snuff_progress = 0.0
	entry["lit"] = false
	if _light != null:
		_light.queue_free()
		_light = null
	world.fx.rise(global_position + Vector2(0, -26), Color(0.62, 0.6, 0.66, 0.7), 14, 6.0, 1.4)
	Audio.play("snuff")
	world.toast("Una polilla apagó una vela", Palette.UI_DIM)
	lit_changed.emit(self, false)


func _make_light() -> void:
	if _light != null:
		return
	_light = PointLight2D.new()
	_light.texture = CandleLighting.glow_texture()
	_light.texture_scale = 1.9
	_light.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_light.color = Color(1.0, 0.76, 0.46)
	_light.position = Vector2(0, -26)
	_light.energy = 0.0
	add_child(_light)


func _process(_delta: float) -> void:
	if _light == null:
		return
	var strength := float(Settings.get_value("video/lighting_strength"))
	_light.enabled = strength > 0.0
	var target := strength * (0.95 + (0.04 * sin(_t * 5.3) + 0.03 * sin(_t * 8.1) if Settings.flashes else 0.0))
	target += _flare * 0.8
	_light.energy = move_toward(_light.energy, target, get_process_delta_time() * 3.0)


func _draw() -> void:
	var top := Vector2(0, -20)
	# Halo en el suelo: cálido si arde; si no, un círculo tenue que invita a acercarse.
	if lit:
		draw_circle(Vector2.ZERO, AURA, Color(Palette.FLAME, 0.035))
		draw_arc(Vector2.ZERO, AURA, 0, TAU, 48, Color(Palette.FLAME, 0.1), 1.5)
	else:
		var invite := 0.5 + 0.5 * sin(_t * 2.2)
		draw_arc(Vector2.ZERO, LIGHT_RANGE * 0.75, 0, TAU, 32, Color(Palette.FLAME_CORE, 0.1 + 0.08 * invite), 1.5)
	# Portavelas de hierro y vela de cera.
	draw_circle(Vector2(0, 4), 13.0, Color(0, 0, 0, 0.35))
	draw_rect(Rect2(-11, -2, 22, 5), Color(0.2, 0.17, 0.16))
	draw_line(Vector2(0, -2), Vector2(0, 6), Color(0.2, 0.17, 0.16), 3.0)
	var wax := Palette.WAX if lit else Palette.WAX.darkened(0.45)
	draw_rect(Rect2(-6, -20, 12, 19), wax)
	draw_rect(Rect2(-6, -20, 4, 19), Color(1, 1, 1, 0.12 if lit else 0.04))
	draw_circle(Vector2(5, -6), 2.4, wax)
	draw_line(top, top + Vector2(0, -6), Color(0.08, 0.06, 0.06), 2.0)
	if lit:
		var h := 8.5 + 4.0 * _flare + (1.0 * sin(_t * 9.0) if Settings.flashes else 0.0)
		draw_circle(top + Vector2(0, -10), 18.0 + 6.0 * _flare, Color(Palette.FLAME, 0.12))
		GlyphPainter.flame(self, top + Vector2(0, -4), h, _t)
		if snuff_progress > 0.0:
			var k := snuff_progress / SNUFF_TIME
			draw_arc(top + Vector2(0, -10), 14.0, -PI * 0.5, -PI * 0.5 + TAU * k, 18, Color(0.7, 0.7, 0.8, 0.8), 2.0)
	elif progress > 0.0:
		# El fuego prestado llega a la mecha: anillo de progreso y chispa creciente.
		draw_arc(top + Vector2(0, -8), 16.0, -PI * 0.5, -PI * 0.5 + TAU * progress, 24, Color(Palette.FLAME_CORE, 0.9), 2.5)
		draw_circle(top + Vector2(0, -6), 1.5 + 3.5 * progress, Color(Palette.FLAME, 0.4 + 0.6 * progress))

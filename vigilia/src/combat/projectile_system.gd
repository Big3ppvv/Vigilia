class_name ProjectileSystem
extends Node2D
## Simula y dibuja TODOS los proyectiles en un único nodo.
##
## Rendimiento:
##   - Pool de objetos Projectile (sin crear/destruir en caliente).
##   - Colisión con paredes/obstáculos analítica contra RoomGrid (O(1), sin física).
##   - Colisión con enemigos mediante rejilla espacial reconstruida por frame.
##   - Un solo _draw() para todos los proyectiles.
## Límite duro MAX_ACTIVE: si se alcanza, los nuevos se descartan y se cuentan
## (visible en el overlay de depuración) en lugar de degradar el frame.

const MAX_ACTIVE := 2500
const CELL := 96.0

var world: CombatWorld
var dropped := 0
var peak := 0
var spawned_total := 0
var high_contrast := false

var _pool: Array[Projectile] = []
var _active: Array[Projectile] = []
var _grid := {}
## true mientras _physics_process recorre _active: los borrados que pidan otros
## sistemas en ese momento (eventos de muerte, Campana Rota...) se DIFIEREN
## marcando el proyectil como inactivo; el propio bucle lo retira.
var _iterating := false
## Objetivos del bando del jugador, calculados UNA vez por frame (antes se creaba
## un Array por proyectil y frame: 2000 asignaciones/frame en lluvias densas).
var _player_targets: Array = []


## Texturas horneadas del proyectil enemigo por color (1 llamada de dibujo por
## proyectil en lugar de 3 círculos: con 2000 proyectiles el dibujo bajó de
## ~7 ms a ~2-3 ms por frame en la prueba de estrés).
var _bullet_tex := {}
const BULLET_TEX_SIZE := 32
const BULLET_REF_RADIUS := 10.0


func _ready() -> void:
	z_index = 5
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	high_contrast = Settings.high_contrast
	Settings.changed.connect(func() -> void:
		high_contrast = Settings.high_contrast
		_bullet_tex.clear())


func spawn() -> Projectile:
	if _active.size() >= MAX_ACTIVE:
		dropped += 1
		return null
	var p: Projectile = _pool.pop_back() if not _pool.is_empty() else Projectile.new()
	p.reset()
	p.active = true
	_active.append(p)
	spawned_total += 1
	peak = maxi(peak, _active.size())
	return p


## Atajo para proyectiles enemigos.
func spawn_enemy_shot(pos: Vector2, dir: Vector2, speed: float, opts: Dictionary = {}) -> Projectile:
	var p := spawn()
	if p == null:
		return null
	p.team = Team.ENEMY
	p.pos = pos
	p.vel = dir.normalized() * speed
	p.radius = float(opts.get("radius", 7.0))
	p.damage = float(opts.get("damage", 1.0))
	p.range_total = float(opts.get("range", 900.0))
	p.range_left = p.range_total
	p.lifetime = float(opts.get("lifetime", -1.0))
	p.curve = float(opts.get("curve", 0.0))
	p.accel = float(opts.get("accel", 0.0))
	p.kind = str(opts.get("kind", "orb"))
	p.color = opts.get("color", Palette.ENEMY_SHOT)
	p.source_name = str(opts.get("source_name", ""))
	p.statuses = opts.get("statuses", [])
	p.tags = PackedStringArray(["projectile", "enemy"])
	return p


func count(team: int = -1) -> int:
	var n := 0
	for p in _active:
		if p.active and (team < 0 or p.team == team):
			n += 1
	return n


func active_list() -> Array[Projectile]:
	return _active


## Elimina los proyectiles de un equipo (p. ej. objeto "Campana Rota").
func clear_team(team: int, with_fx: bool = true) -> int:
	var n := 0
	var i := 0
	while i < _active.size():
		var p := _active[i]
		if p.active and p.team == team:
			if with_fx and world != null:
				world.fx.puff(p.pos, p.color, 3)
			n += 1
			if _iterating:
				p.active = false
			else:
				_remove_at(i)
				continue
		i += 1
	return n


func clear_all() -> void:
	if _iterating:
		for p in _active:
			p.active = false
		return
	while not _active.is_empty():
		_remove_at(_active.size() - 1)


func _physics_process(delta: float) -> void:
	if world == null or world.room == null:
		return
	var __pt := Prof.t0()
	_build_enemy_grid()
	_player_targets = world.player_side_targets()
	_iterating = true
	var i := 0
	while i < _active.size():
		var p := _active[i]
		if not p.active or not _step(p, delta) or not p.active:
			_remove_at(i)
			continue
		i += 1
	_iterating = false
	Prof.add("proyectiles", __pt)


func _process(_delta: float) -> void:
	queue_redraw()


func _remove_at(i: int) -> void:
	var p := _active[i]
	p.active = false
	var last := _active.size() - 1
	if i != last:
		_active[i] = _active[last]
	_active.pop_back()
	_pool.append(p)


func _build_enemy_grid() -> void:
	_grid.clear()
	for e in world.enemies:
		if not is_instance_valid(e) or not e.alive:
			continue
		var r: float = e.radius
		var p: Vector2 = e.global_position
		var c0 := Vector2i(floori((p.x - r) / CELL), floori((p.y - r) / CELL))
		var c1 := Vector2i(floori((p.x + r) / CELL), floori((p.y + r) / CELL))
		for cy in range(c0.y, c1.y + 1):
			for cx in range(c0.x, c1.x + 1):
				var key := Vector2i(cx, cy)
				if not _grid.has(key):
					_grid[key] = []
				_grid[key].append(e)


## Avanza un proyectil. Devuelve false si debe retirarse.
func _step(p: Projectile, delta: float) -> bool:
	p.age += delta
	if p.lifetime > 0.0 and p.age >= p.lifetime:
		return false
	if p.homing > 0.0:
		_apply_homing(p, delta)
	if p.curve != 0.0:
		p.vel = p.vel.rotated(p.curve * delta)
	if p.accel != 0.0:
		var sp := p.vel.length()
		var ns := clampf(sp + p.accel * delta, 30.0, 1600.0)
		if sp > 0.001:
			p.vel *= ns / sp
	var spd := p.vel.length()
	var dir := p.vel / spd if spd > 0.001 else Vector2.RIGHT
	var motion := p.vel * delta
	if p.wave_amp > 0.0 and p.wave_freq > 0.0:
		motion += dir.orthogonal() * cos(p.age * p.wave_freq) * p.wave_amp * p.wave_freq * delta
	var new_pos := p.pos + motion
	var grid := world.room.grid
	var lead := new_pos + dir * p.radius * 0.5
	# Comprobación de rejilla en línea (equivale a RoomGrid.blocks_projectile_at).
	var outside := lead.x < 0.0 or lead.y < 0.0 or lead.x >= RoomView.W or lead.y >= RoomView.H
	var blocked := outside
	if not blocked and not p.spectral:
		var cell := grid.cells[int(lead.y / RoomGrid.TILE) * RoomGrid.COLS + int(lead.x / RoomGrid.TILE)]
		blocked = cell == RoomGrid.ROCK or cell == RoomGrid.PILLAR
	if blocked:
		if outside and p.team == Team.PLAYER:
			world.on_projectile_wall(p, lead)
		if p.bounces > 0:
			var nrm := _bounce_normal(grid, p.pos, lead, p.spectral)
			p.vel = p.vel.bounce(nrm)
			p.bounces -= 1
			p.damage *= p.bounce_damage_mult
			p.hit_ids.clear()
			if p.team == Team.PLAYER:
				world.on_projectile_bounce(p, p.pos)
			return true
		world.on_projectile_impact(p, p.pos)
		return false
	p.pos = new_pos
	p.range_left -= spd * delta
	if p.range_left <= 0.0:
		world.on_projectile_impact(p, p.pos)
		return false
	if p.team == Team.PLAYER:
		return _collide_player_shot(p)
	return _collide_enemy_shot(p)


func _collide_player_shot(p: Projectile) -> bool:
	var c0 := Vector2i(floori((p.pos.x - p.radius) / CELL), floori((p.pos.y - p.radius) / CELL))
	var c1 := Vector2i(floori((p.pos.x + p.radius) / CELL), floori((p.pos.y + p.radius) / CELL))
	for cy in range(c0.y, c1.y + 1):
		for cx in range(c0.x, c1.x + 1):
			var bucket: Array = _grid.get(Vector2i(cx, cy), [])
			for e in bucket:
				if not is_instance_valid(e) or not e.alive or e.spawn_t > 0.0:
					continue
				var id: int = e.get_instance_id()
				if p.hit_ids.has(id):
					continue
				var r: float = p.radius + float(e.radius)
				if p.pos.distance_squared_to(e.global_position) > r * r:
					continue
				p.hit_ids[id] = true
				world.projectile_hit(p, e)
				if p.pierce > 0:
					p.pierce -= 1
				else:
					return false
	return true


func _collide_enemy_shot(p: Projectile) -> bool:
	for t in _player_targets:
		if not is_instance_valid(t):
			continue
		var r: float = p.radius + float(t.radius) * 0.8
		if p.pos.distance_squared_to(t.global_position) > r * r:
			continue
		var id: int = t.get_instance_id()
		if p.hit_ids.has(id):
			continue
		if t is Player:
			var pl := t as Player
			if pl.is_dodging():
				if not p.grazed:
					p.grazed = true
					world.on_graze(pl, p)
				continue
			if pl.is_invulnerable():
				return false
		if t.has_method("blocks_projectiles") and t.blocks_projectiles():
			world.fx.puff(p.pos, p.color, 4)
			return false
		p.hit_ids[id] = true
		world.projectile_hit(p, t)
		return false
	return true


func _apply_homing(p: Projectile, delta: float) -> void:
	p._retarget_t -= delta
	var target: Node2D = null
	if p._homing_target_id != 0:
		var obj := instance_from_id(p._homing_target_id)
		if obj != null and is_instance_valid(obj) and obj is Node2D and bool(obj.get("alive")):
			target = obj
	if target == null or p._retarget_t <= 0.0:
		p._retarget_t = 0.15
		target = world.nearest_hostile(p.pos, p.team, 460.0, p.hit_ids)
		p._homing_target_id = target.get_instance_id() if target != null else 0
	if target == null:
		return
	var desired := (target.global_position - p.pos).angle()
	var diff := wrapf(desired - p.vel.angle(), -PI, PI)
	var max_turn := p.homing * 7.0 * delta
	p.vel = p.vel.rotated(clampf(diff, -max_turn, max_turn))


static func _bounce_normal(grid: RoomGrid, from: Vector2, to: Vector2, spectral: bool) -> Vector2:
	var bx := grid.blocks_projectile_at(Vector2(to.x, from.y), spectral)
	var by := grid.blocks_projectile_at(Vector2(from.x, to.y), spectral)
	if bx and not by:
		return Vector2(-signf(to.x - from.x), 0.0)
	if by and not bx:
		return Vector2(0.0, -signf(to.y - from.y))
	return -(to - from).normalized()


func _draw() -> void:
	var __pt := Prof.t0()
	for p in _active:
		if not p.active:
			continue
		if p.team == Team.PLAYER:
			_draw_player_shot(p)
		else:
			_draw_enemy_shot(p)
	Prof.add("proyectiles (dibujo)", __pt)


func _draw_player_shot(p: Projectile) -> void:
	# Brasa: núcleo casi blanco, cuerpo del color y estela que se enfría hacia atrás.
	var d := p.vel.normalized() if p.vel.length() > 0.01 else Vector2.RIGHT
	var r := p.radius
	for i in 3:
		draw_circle(p.pos - d * r * 1.5 * float(i + 1), r * (0.8 - 0.18 * i), Color(p.color, 0.3 - 0.08 * i))
	draw_circle(p.pos, r * 2.1, Color(p.color, 0.12))
	draw_circle(p.pos, r * 1.05, p.color)
	draw_circle(p.pos + d * r * 0.25, r * 0.55, Color(1.0, 0.97, 0.88, 0.95))
	if p.force_crit:
		draw_arc(p.pos, r * 1.7, 0, TAU, 12, Palette.PLAYER_EYE, 1.5)


func _draw_enemy_shot(p: Projectile) -> void:
	var tex := _bullet_texture(p.color)
	var half := float(BULLET_TEX_SIZE) * 0.5 * (p.radius / BULLET_REF_RADIUS)
	draw_texture_rect(tex, Rect2(p.pos - Vector2(half, half), Vector2(half, half) * 2.0), false)


## Genera (una vez por color) la textura de un proyectil enemigo: contorno
## oscuro (o blanco+negro en alto contraste), cuerpo del color y núcleo claro.
func _bullet_texture(col: Color) -> Texture2D:
	var key := col.to_html() + ("_hc" if high_contrast else "")
	if _bullet_tex.has(key):
		return _bullet_tex[key]
	var n := BULLET_TEX_SIZE
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	var c := Vector2(n, n) * 0.5 - Vector2(0.5, 0.5)
	var r := BULLET_REF_RADIUS
	for y in n:
		for x in n:
			var d := Vector2(x, y).distance_to(c)
			var px := Color(0, 0, 0, 0)
			if high_contrast:
				if d <= r + 6.0:
					px = Color.BLACK
				if d <= r + 3.0:
					px = Color.WHITE
			elif d <= r + 2.5:
				px = Color(0.05, 0.0, 0.02, 0.85)
			if d <= r:
				px = col
			if d <= r * 0.5:
				px = Palette.ENEMY_SHOT_CORE
			# Borde suavizado.
			var edge := (r + (6.0 if high_contrast else 2.5)) - d
			if edge < 1.0 and edge > 0.0:
				px.a *= edge
			img.set_pixel(x, y, px)
	var tex := ImageTexture.create_from_image(img)
	_bullet_tex[key] = tex
	return tex

class_name Projectile
extends RefCounted
## Proyectil como DATOS (no es un nodo). ProjectileSystem simula y dibuja todos
## los proyectiles en un único bucle y los reutiliza desde un pool: así se
## soportan miles de proyectiles sin el coste de miles de nodos.

var active := false
var team := Team.PLAYER
var pos := Vector2.ZERO
var vel := Vector2.ZERO
var radius := 6.0
var damage := 3.5
var crit_chance := 0.0
var crit_mult := 2.0
## Crítico garantizado (mecánica de Lucidez).
var force_crit := false
var knockback := 140.0
var range_total := 460.0
var range_left := 460.0
var lifetime := -1.0
var age := 0.0
var pierce := 0
var bounces := 0
var bounce_damage_mult := 1.0
var homing := 0.0
var spectral := false
var curve := 0.0
var accel := 0.0
var wave_amp := 0.0
var wave_freq := 0.0
## Caída de daño al final del alcance (0 = sin caída). Debilidad de La Espina.
var falloff := 0.0
## Generación de división: 0 = disparo original; los fragmentos suman 1.
var generation := 0
var depth := 0
var proc_coef := 1.0
var tags := PackedStringArray()
## Estados que aplica al impactar: [{id, stacks, duration}]
var statuses: Array = []
## Ids de instancia ya golpeados (evita golpes múltiples al mismo objetivo).
var hit_ids := {}
var source_id := 0
var source_name := ""
var color := Color.WHITE
## shot | fragment | orb | drop | ring | blood
var kind := "shot"
var grazed := false
var _homing_target_id := 0
var _retarget_t := 0.0


func reset() -> void:
	active = false
	team = Team.PLAYER
	pos = Vector2.ZERO
	vel = Vector2.ZERO
	radius = 6.0
	damage = 3.5
	crit_chance = 0.0
	crit_mult = 2.0
	force_crit = false
	knockback = 140.0
	range_total = 460.0
	range_left = 460.0
	lifetime = -1.0
	age = 0.0
	pierce = 0
	bounces = 0
	bounce_damage_mult = 1.0
	homing = 0.0
	spectral = false
	curve = 0.0
	accel = 0.0
	wave_amp = 0.0
	wave_freq = 0.0
	falloff = 0.0
	generation = 0
	depth = 0
	proc_coef = 1.0
	tags = PackedStringArray()
	statuses = []
	hit_ids = {}
	source_id = 0
	source_name = ""
	color = Color.WHITE
	kind = "shot"
	grazed = false
	_homing_target_id = 0
	_retarget_t = 0.0


func has_tag(t: String) -> bool:
	return tags.has(t)


## Multiplicador de daño por caída al final del alcance.
func falloff_mult() -> float:
	if falloff <= 0.0 or range_total <= 0.0:
		return 1.0
	var traveled := 1.0 - range_left / range_total
	if traveled <= 0.66:
		return 1.0
	return 1.0 - falloff * clampf((traveled - 0.66) / 0.34, 0.0, 1.0)

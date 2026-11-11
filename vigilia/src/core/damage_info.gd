class_name DamageInfo
extends RefCounted
## Descripción completa de un golpe. Viaja por todo el pipeline de combate:
## origen -> DamageSystem (mitigación) -> entidad -> eventos del motor de sinergias.
##
## Las ETIQUETAS son la clave de las interacciones emergentes: un efecto que reacciona
## a "explosion" funciona con cualquier fuente de explosiones (bombas, objetos, jefes)
## sin conocerlas de antemano.

var amount := 0.0
var team := Team.PLAYER
var source_id := 0
var source_name := ""
var tags := PackedStringArray()
var crit := false
var knockback := Vector2.ZERO
var position := Vector2.ZERO
## Dirección del golpe (para armaduras direccionales). Cero si no aplica.
var direction := Vector2.ZERO
## Profundidad en la cadena de efectos: cada efecto derivado suma 1.
var depth := 0
## Coeficiente de activación: atenúa la probabilidad de efectos en cadenas.
var proc_coef := 1.0
## Si true, también daña a entidades del mismo equipo (bombas del jugador).
var friendly_fire := false
## Ignora la invulnerabilidad temporal (autolesiones de pactos).
var ignore_iframes := false
## Autolesión: no la absorben los escudos de cera ni concede invulnerabilidad.
var is_self := false
## Proyectil que causó el golpe, si lo hay.
var projectile: Projectile = null


static func create(amount_: float, team_: int, tags_: Array = []) -> DamageInfo:
	var d := DamageInfo.new()
	d.amount = amount_
	d.team = team_
	for t in tags_:
		d.tags.append(str(t))
	return d


func has_tag(t: String) -> bool:
	return tags.has(t)


func add_tag(t: String) -> void:
	if not tags.has(t):
		tags.append(t)


func copy() -> DamageInfo:
	var d := DamageInfo.new()
	d.amount = amount
	d.team = team
	d.source_id = source_id
	d.source_name = source_name
	d.tags = tags.duplicate()
	d.crit = crit
	d.knockback = knockback
	d.position = position
	d.direction = direction
	d.depth = depth
	d.proc_coef = proc_coef
	d.friendly_fire = friendly_fire
	d.ignore_iframes = ignore_iframes
	d.is_self = is_self
	d.projectile = projectile
	return d

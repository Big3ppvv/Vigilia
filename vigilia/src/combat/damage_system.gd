class_name DamageSystem
extends RefCounted
## Cálculo de daño PURO (sin efectos secundarios) para que sea comprobable.
##
## Pipeline (ver docs/ARCHITECTURE.md §Daño):
##   1. Origen construye DamageInfo (importe base, etiquetas, crítico ya tirado).
##   2. mitigate(): × multiplicador por etiqueta (tolerancias del Sueño, alergias,
##      resistencias e inmunidades) × reducción por armadura 20/(20+armadura).
##   3. La entidad aplica modificadores propios (armadura direccional, vulnerabilidad).
##   4. Escudos absorben antes que la vida.
## Las autolesiones (is_self) ignoran todas las mitigaciones.

const MIN_TAG_MULT := 0.05
const MAX_TAG_MULT := 3.0


static func roll_crit(info: DamageInfo, chance: float, mult: float, rng: RngStream, force: bool = false) -> void:
	if force or rng.chance(chance):
		info.crit = true
		info.amount *= maxf(1.0, mult)


## Multiplicador de una etiqueta para un objetivo.
static func tag_multiplier(tag: String, tolerance: Dictionary, allergies: Dictionary, immunities: Dictionary) -> float:
	if immunities.has(tag):
		return 0.0
	var m := 1.0 - float(tolerance.get(tag, 0.0)) + float(allergies.get(tag, 0.0))
	return clampf(m, MIN_TAG_MULT, MAX_TAG_MULT)


static func mitigate(info: DamageInfo, tolerance: Dictionary, allergies: Dictionary, immunities: Dictionary, armor: float) -> float:
	if info.is_self:
		return info.amount
	var m := 1.0
	for t in info.tags:
		m *= tag_multiplier(t, tolerance, allergies, immunities)
	if armor > 0.0:
		m *= 20.0 / (20.0 + armor)
	return maxf(0.0, info.amount * m)

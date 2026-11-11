class_name Team
extends RefCounted
## Equipos de combate. NEUTRAL representa el entorno (trampas, peligros): daña a todos.

const PLAYER := 0
const ENEMY := 1
const NEUTRAL := 2


## true si el atacante `attacker_team` puede dañar a una entidad de `target_team`.
static func can_damage(attacker_team: int, target_team: int, friendly_fire: bool = false) -> bool:
	if attacker_team == NEUTRAL:
		return true
	if attacker_team == target_team:
		return friendly_fire
	return true

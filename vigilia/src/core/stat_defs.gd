class_name StatDefs
extends RefCounted
## Definición canónica de estadísticas: valor por defecto, límites y si es entera.
## Cualquier estadística que no figure aquí es rechazada por StatBlock y por la
## validación de contenido: un error tipográfico en un JSON no pasa en silencio.

const DEFS := {
	"max_health": {"default": 6.0, "min": 1.0, "max": 24.0, "int": true, "label": "Vida máxima"},
	"damage": {"default": 3.5, "min": 0.25, "max": 999.0, "label": "Daño"},
	"fire_rate": {"default": 3.0, "min": 0.4, "max": 30.0, "label": "Cadencia (disp/s)"},
	"move_speed": {"default": 250.0, "min": 80.0, "max": 560.0, "label": "Velocidad"},
	"range": {"default": 460.0, "min": 90.0, "max": 1800.0, "label": "Alcance"},
	"shot_speed": {"default": 560.0, "min": 160.0, "max": 1400.0, "label": "Vel. de disparo"},
	"shot_size": {"default": 1.0, "min": 0.4, "max": 4.0, "label": "Tamaño de disparo"},
	"crit_chance": {"default": 0.05, "min": 0.0, "max": 1.0, "label": "Prob. de crítico"},
	"crit_mult": {"default": 2.0, "min": 1.0, "max": 10.0, "label": "Mult. crítico"},
	"luck": {"default": 0.0, "min": -10.0, "max": 20.0, "label": "Suerte"},
	"evasion": {"default": 0.0, "min": 0.0, "max": 0.6, "label": "Evasión"},
	"spread": {"default": 3.0, "min": 0.0, "max": 45.0, "label": "Dispersión (°)"},
	"armor": {"default": 0.0, "min": 0.0, "max": 100.0, "label": "Armadura"},
	"regen": {"default": 0.0, "min": 0.0, "max": 10.0, "label": "Regeneración (vida/min)"},
	"pierce": {"default": 0.0, "min": 0.0, "max": 20.0, "int": true, "label": "Perforación"},
	"bounces": {"default": 0.0, "min": 0.0, "max": 20.0, "int": true, "label": "Rebotes"},
	"projectile_count": {"default": 1.0, "min": 1.0, "max": 16.0, "int": true, "label": "Proyectiles"},
	"homing": {"default": 0.0, "min": 0.0, "max": 1.5, "label": "Teledirección"},
	"knockback": {"default": 1.0, "min": 0.0, "max": 5.0, "label": "Empuje"},
	"status_damage": {"default": 1.0, "min": 0.0, "max": 10.0, "label": "Daño de estados"},
	"status_duration": {"default": 1.0, "min": 0.1, "max": 5.0, "label": "Duración de estados"},
	"cooldown_reduction": {"default": 0.0, "min": 0.0, "max": 0.75, "label": "Reducción de recarga"},
	"summon_power": {"default": 1.0, "min": 0.1, "max": 10.0, "label": "Poder de invocación"},
	"dodge_cooldown": {"default": 0.85, "min": 0.2, "max": 3.0, "label": "Recarga de esquiva (s)"},
	"res_fire": {"default": 0.0, "min": -1.0, "max": 0.9, "label": "Resist. fuego"},
	"res_ice": {"default": 0.0, "min": -1.0, "max": 0.9, "label": "Resist. hielo"},
	"res_poison": {"default": 0.0, "min": -1.0, "max": 0.9, "label": "Resist. veneno"},
	"res_bleed": {"default": 0.0, "min": -1.0, "max": 0.9, "label": "Resist. sangrado"},
}

## Estadísticas mostradas en el inventario, en este orden.
const DISPLAY_ORDER := [
	"damage", "fire_rate", "move_speed", "range", "shot_speed", "shot_size",
	"crit_chance", "crit_mult", "luck", "projectile_count", "pierce", "bounces",
	"homing", "evasion", "dodge_cooldown", "status_damage", "status_duration",
]


static func has(id: String) -> bool:
	return DEFS.has(id)


static func default_value(id: String) -> float:
	return float(DEFS[id]["default"]) if DEFS.has(id) else 0.0


static func is_int(id: String) -> bool:
	return DEFS.has(id) and bool(DEFS[id].get("int", false))


static func label(id: String) -> String:
	return str(DEFS[id].get("label", id)) if DEFS.has(id) else id


## Formatea un valor para la interfaz.
static func format_value(id: String, v: float) -> String:
	if is_int(id):
		return str(int(round(v)))
	if id in ["crit_chance", "evasion", "cooldown_reduction"]:
		return "%d%%" % int(round(v * 100.0))
	if id in ["status_damage", "status_duration", "knockback", "summon_power", "shot_size", "crit_mult"]:
		return "x%.2f" % v
	if absf(v) >= 100.0:
		return str(int(round(v)))
	return "%.2f" % v

class_name EffectVocab
extends RefCounted
## Vocabulario del motor de sinergias: disparadores, filtros y acciones admitidos.
## Es la "gramática" que pueden usar los JSON de contenido. ContentDB valida contra
## esta tabla para que un error en los datos se detecte al arrancar, no en partida.
##
## Para añadir una acción nueva: implementarla en EffectActions y declararla aquí.

const TRIGGERS := {
	"fire": "El jugador dispara una ráfaga.",
	"projectile_spawn": "Se crea un proyectil del equipo del jugador.",
	"hit": "Daño del equipo del jugador impacta a un enemigo (no incluye ticks de estados).",
	"impact": "Un proyectil del jugador muere contra muro, obstáculo o fin de alcance.",
	"bounce": "Un proyectil del jugador rebota en una pared.",
	"kill": "Un enemigo muere.",
	"hurt": "El jugador recibe daño (incluye autolesiones).",
	"dodge": "El jugador inicia una esquiva.",
	"graze": "Esquiva perfecta: un proyectil enemigo roza al jugador durante la esquiva.",
	"room_enter": "El jugador entra en una habitación.",
	"room_clear": "La habitación queda despejada.",
	"explosion": "Ocurre una explosión (cualquier origen).",
	"status_applied": "Se aplica un estado alterado a un enemigo.",
	"reaction": "Se produce una reacción elemental.",
	"pickup": "El jugador recoge un consumible.",
	"item_acquired": "El jugador obtiene cualquier objeto.",
	"active_used": "El jugador usa un objeto activo.",
	"tick": "Una vez por segundo.",
	"acquire": "Una sola vez, al obtener ESTE objeto (no se registra).",
	"use": "Al usar ESTE objeto activo (no se registra).",
}

const FILTERS := [
	"tags_any", "tags_all", "tags_none",
	"target_status_any", "target_status_none", "target_is_boss",
	"player_hp_min", "player_hp_max", "crit", "max_generation",
	"min_depth", "max_depth", "room_type", "coins_min", "pickup_kind",
	"status", "reaction",
]

## Acción -> parámetros admitidos.
const ACTIONS := {
	"explode": ["radius", "damage_mult", "base", "tags", "color", "friendly_fire"],
	"split": ["count", "spread_deg", "damage_mult", "speed_mult", "size_mult"],
	"apply_status": ["status", "stacks", "duration"],
	"spawn_projectiles": ["pattern", "count", "damage_mult", "speed_mult", "size_mult", "tags", "statuses", "origin", "color", "spread_deg", "pierce", "range_mult"],
	"temp_stat": ["stat", "op", "value", "duration", "max_stacks", "key"],
	"permanent_stat": ["stat", "op", "value"],
	"heal": ["amount"],
	"add_wax": ["amount"],
	"add_resource": ["coins", "keys", "bombs"],
	"spawn_ally": ["kind", "duration", "max", "count"],
	"self_damage": ["amount"],
	"empower_projectile": ["damage_mult", "size_mult", "pierce_add", "speed_mult", "color", "tags_add", "knockback_mult"],
	"charge_active": ["amount"],
	"damage_all": ["amount", "damage_mult", "tags"],
	"stun_all": ["duration"],
	"clear_enemy_projectiles": [],
	"reveal_map": ["secrets"],
	"floor_modifier": ["key", "value"],
	"message": ["text", "color"],
	"chain": ["jumps", "range", "damage_mult", "tags", "color"],
	"crit_charges": ["amount"],
}

## Propiedades de proyectil que un objeto puede aportar (fuera de las estadísticas).
## Combinación: "mult" se multiplica, "add" se suma, "flag" es OR, "last" sobrescribe.
const PROJECTILE_PROPS := {
	"spectral": "flag",
	"bounce_damage_mult": "mult",
	"wave_amp": "add",
	"wave_freq": "last",
	"color": "last",
	"falloff": "last",
	"statuses": "append",
}

## Modificadores de mecánicas: objetos que alteran el funcionamiento de OTROS objetos.
const MECHANIC_MODS := {
	"explosion_radius_mult": "mult",
	"explosion_damage_mult": "mult",
	"split_count_add": "add",
	"ally_duration_mult": "mult",
	"ally_cap_add": "add",
	"status_stacks_add": "add",
}


static func is_trigger(t: String) -> bool:
	return TRIGGERS.has(t)


static func is_action(a: String) -> bool:
	return ACTIONS.has(a)

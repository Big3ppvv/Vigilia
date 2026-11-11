extends Node
## EventBus: señales globales para comunicación DESACOPLADA entre sistemas
## (principalmente simulación -> interfaz/audio/guardado).
##
## Los eventos de combate de alta frecuencia (hit, kill, fire...) NO pasan por aquí:
## los procesa el SynergyEngine con presupuesto por frame. Este bus es para
## notificaciones de baja frecuencia donde el desacoplamiento importa más que el coste.

# --- Partida / flujo ---
signal run_started(run: RunState)
signal run_ended(summary: Dictionary)
signal floor_entered(floor_index: int, floor_name: String)
signal room_entered(room: RoomData)
signal room_cleared(room: RoomData)

# --- Jugador ---
signal player_health_changed(hp: int, max_hp: int, wax: int)
signal player_resources_changed(coins: int, keys: int, bombs: int)
signal player_stats_changed()
signal player_died(killed_by: String)
signal active_item_changed(item_id: String, charge: int, max_charge: int)

# --- Objetos y sinergias ---
signal item_acquired(item_id: String, stack: int)
signal synergy_activated(synergy_id: String)

# --- Jefes ---
signal boss_started(boss_name: String, max_hp: float)
signal boss_health_changed(hp: float, max_hp: float, phase: int)
signal boss_defeated(boss_id: String)

# --- Presentación ---
## Mensaje tipo cartel: title grande, subtitle pequeño.
signal banner(title: String, subtitle: String, color: Color)
## Texto breve flotante en el HUD (avisos).
signal toast(text: String, color: Color)
signal interact_prompt(text: String, detail: String)

# --- Ajustes ---
signal settings_applied()


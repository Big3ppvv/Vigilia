class_name DreamDirector
extends Node
## Da voz al sueño durante la partida. Solo presentación: usa su propio RNG
## cosmético y nunca toca los flujos de la simulación.
##
## - El ARRULLO susurra cuando la llama se apaga ("Descansa.", "Aquí no duele."),
##   y el latido se oye cada vez más.
## - Al despertar una sala, a veces se cuela la VOZ DE FUERA ("…¿me oyes?…").
## - Al bajar de piso, si el Sueño aprendió de tu forma de luchar, lo dice
##   ("Ya conozco tu fuego."): la Tolerancia del Sueño, sin porcentajes.
## - Los jefes hablan al aparecer, al cambiar de fase y al caer.
## - Mezcla la música: más nana cuanto menos llama; pulso en combate.

const WHISPER_MIN := 7.0
const WHISPER_MAX := 11.0

var game: Node
var _rng := RandomNumberGenerator.new()
var _whisper_cd := 4.0
var _beat_cd := 0.0
var _rooms_since_voice := 2
var _boss_id := ""
var _boss_phase := 1
var _last_lullaby := -1


func _ready() -> void:
	_rng.seed = 90210
	EventBus.room_awakened.connect(_on_room_awakened)
	EventBus.floor_entered.connect(_on_floor_entered)
	EventBus.boss_health_changed.connect(_on_boss_health)
	EventBus.boss_defeated.connect(_on_boss_defeated)


func _process(delta: float) -> void:
	if game == null or game.player == null or game.ending:
		return
	var pl: Player = game.player
	var ratio := pl.flame_ratio()
	Audio.set_music_param("drowsy", DreamVeil.target_for(ratio, pl.hp, pl.alive))
	Audio.set_music_param("combat", 1.0 if game.director.combat_active else 0.0)
	if not pl.alive or game.bot_mode:
		return
	var low := pl.hp <= 2
	if low:
		_beat_cd -= delta
		if _beat_cd <= 0.0:
			_beat_cd = 0.72 if pl.hp <= 1 else 0.95
			Audio.play("heartbeat", -4.0 if pl.hp <= 1 else -8.0, 1.0, 0.0)
		_whisper_cd -= delta
		if _whisper_cd <= 0.0:
			_whisper_cd = _rng.randf_range(WHISPER_MIN, WHISPER_MAX)
			_lullaby_line()
	else:
		_whisper_cd = minf(_whisper_cd, 3.0)


func _lullaby_line() -> void:
	var lines: Array = ContentDB.lore.get("lullaby", [])
	if lines.is_empty():
		return
	var i := _rng.randi_range(0, lines.size() - 1)
	if i == _last_lullaby:
		i = (i + 1) % lines.size()
	_last_lullaby = i
	EventBus.whisper.emit(str(lines[i]), false)
	Audio.play("whisper", -10.0)


func _on_room_awakened(_room: RoomData, _by_light: bool) -> void:
	_rooms_since_voice += 1
	if game.bot_mode or _rooms_since_voice < 2 or _rng.randf() > 0.45:
		return
	_rooms_since_voice = 0
	var lines: Array = ContentDB.lore.get("awaken_outside", [])
	if not lines.is_empty():
		EventBus.whisper.emit(str(lines[_rng.randi_range(0, lines.size() - 1)]), true)


func _on_floor_entered(index: int, _floor_name: String) -> void:
	if index <= 0 or game.run.tolerance.is_empty():
		return
	var best := ""
	var best_v := 0.0
	for k in game.run.tolerance:
		if float(game.run.tolerance[k]) > best_v:
			best_v = float(game.run.tolerance[k])
			best = str(k)
	var learned: Dictionary = ContentDB.lore.get("lullaby_learned", {})
	if learned.has(best):
		EventBus.whisper.emit(str(learned[best]), false)


func on_boss_started(e: Enemy) -> void:
	_boss_id = e.enemy_id
	_boss_phase = 1
	_boss_line("intro")


func _on_boss_health(_hp: float, _max_hp: float, phase: int) -> void:
	if phase > _boss_phase:
		_boss_phase = phase
		_boss_line("phase%d" % phase)


func _on_boss_defeated(boss_id: String) -> void:
	_boss_id = boss_id
	_boss_line("death")


func _boss_line(key: String) -> void:
	var b: Variant = ContentDB.lore.get("bosses", {}).get(_boss_id, {})
	if typeof(b) == TYPE_DICTIONARY and (b as Dictionary).has(key):
		EventBus.whisper.emit(str(b[key]), false)

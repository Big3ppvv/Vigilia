extends Node
## AudioManager: reproduce efectos sintetizados y música ambiental.
##
## - Pool fijo de reproductores (round-robin): sin crear nodos en caliente.
## - Limitador por sonido (MIN_INTERVAL_MS): cientos de proyectiles no saturan
##   el mezclador ni el volumen.
## - Variación de tono cosmética con un RNG propio: NO afecta a la simulación.

const POOL_SIZE := 24
const MIN_INTERVAL_MS := 28

## Catálogo de efectos (especificaciones para SfxSynth).
const SFX := {
	"shoot": {"dur": 0.09, "wave": "square", "f0": 900.0, "f1": 380.0, "vol": 0.16, "attack": 0.002, "decay": 0.03, "lp": 0.35, "duty": 0.3},
	"enemy_shoot": {"dur": 0.12, "wave": "tri", "f0": 520.0, "f1": 260.0, "vol": 0.16, "attack": 0.002, "decay": 0.05, "lp": 0.5},
	"hit": {"dur": 0.07, "wave": "noise", "vol": 0.28, "attack": 0.001, "decay": 0.02, "lp": 0.25},
	"clang": {"dur": 0.22, "partials": [[1.0, 1.0], [3.1, 0.6], [5.7, 0.3]], "f0": 880.0, "vol": 0.2, "attack": 0.001, "decay": 0.06},
	"enemy_die": {"dur": 0.3, "wave": "saw", "f0": 420.0, "f1": 70.0, "vol": 0.26, "attack": 0.003, "decay": 0.1, "noise": 0.35, "lp": 0.3},
	"player_hurt": {"dur": 0.35, "wave": "square", "f0": 190.0, "f1": 60.0, "vol": 0.36, "attack": 0.002, "decay": 0.14, "noise": 0.2, "lp": 0.4, "vib_f": 30.0, "vib_d": 0.08},
	"explosion": {"dur": 0.55, "wave": "noise", "vol": 0.5, "attack": 0.002, "decay": 0.16, "lp": 0.12},
	"coin": {"dur": 0.16, "wave": "square", "vol": 0.14, "attack": 0.002, "decay": 0.05, "lp": 0.6, "notes": [[0.0, 1320.0], [0.06, 1760.0]]},
	"heart": {"dur": 0.3, "wave": "tri", "vol": 0.26, "attack": 0.004, "decay": 0.09, "notes": [[0.0, 440.0], [0.1, 660.0]]},
	"pickup": {"dur": 0.18, "wave": "tri", "vol": 0.22, "attack": 0.002, "decay": 0.06, "notes": [[0.0, 587.0], [0.07, 880.0]]},
	"item": {"dur": 0.8, "wave": "tri", "vol": 0.26, "attack": 0.004, "decay": 0.16, "notes": [[0.0, 392.0], [0.12, 523.25], [0.24, 659.25], [0.36, 783.99]]},
	"synergy": {"dur": 1.1, "partials": [[1.0, 1.0], [1.5, 0.6], [2.0, 0.4], [3.0, 0.2]], "f0": 523.25, "vol": 0.26, "attack": 0.01, "decay": 0.4},
	"door": {"dur": 0.35, "wave": "saw", "f0": 95.0, "f1": 60.0, "vol": 0.22, "lp": 0.08, "noise": 0.3, "decay": 0.12},
	"dodge": {"dur": 0.16, "wave": "noise", "vol": 0.2, "lp": 0.5, "attack": 0.03, "decay": 0.05},
	"graze": {"dur": 0.3, "partials": [[1.0, 1.0], [2.0, 0.5]], "f0": 1568.0, "f1": 2093.0, "vol": 0.16, "attack": 0.003, "decay": 0.1},
	"bell": {"dur": 1.2, "partials": [[1.0, 1.0], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]], "f0": 330.0, "vol": 0.26, "attack": 0.002, "decay": 0.45},
	"roar": {"dur": 1.1, "wave": "saw", "f0": 110.0, "f1": 55.0, "vol": 0.42, "noise": 0.45, "lp": 0.15, "vib_f": 7.0, "vib_d": 0.12, "attack": 0.08, "decay": 0.5},
	"laser": {"dur": 0.5, "wave": "square", "f0": 160.0, "f1": 175.0, "vib_f": 60.0, "vib_d": 0.05, "vol": 0.16, "attack": 0.02, "decay": 0.35, "lp": 0.3},
	"spawn": {"dur": 0.3, "wave": "sine", "f0": 200.0, "f1": 520.0, "vol": 0.12, "noise": 0.2, "lp": 0.3, "decay": 0.12},
	"shock": {"dur": 0.4, "wave": "noise", "vol": 0.35, "lp": 0.6, "attack": 0.001, "decay": 0.1, "notes": [[0.0, 2000.0]]},
	"secret": {"dur": 1.0, "wave": "tri", "vol": 0.24, "attack": 0.005, "decay": 0.2, "notes": [[0.0, 783.99], [0.15, 659.25], [0.3, 523.25], [0.45, 1046.5]]},
	"pact": {"dur": 0.45, "wave": "saw", "f0": 140.0, "f1": 70.0, "vol": 0.3, "lp": 0.2, "attack": 0.004, "decay": 0.16, "vib_f": 12.0, "vib_d": 0.1},
	"ui_move": {"dur": 0.04, "wave": "square", "f0": 660.0, "vol": 0.08, "decay": 0.015, "lp": 0.5},
	"ui_select": {"dur": 0.12, "wave": "tri", "f0": 523.0, "f1": 784.0, "vol": 0.16, "decay": 0.05},
	"deny": {"dur": 0.18, "wave": "square", "f0": 160.0, "f1": 120.0, "vol": 0.16, "decay": 0.07, "lp": 0.3},
	"death": {"dur": 1.6, "wave": "saw", "f0": 220.0, "f1": 40.0, "vol": 0.4, "noise": 0.25, "lp": 0.12, "attack": 0.01, "decay": 0.7, "vib_f": 5.0, "vib_d": 0.06},
	"victory": {"dur": 1.6, "partials": [[1.0, 1.0], [1.25, 0.6], [1.5, 0.5], [2.0, 0.3]], "f0": 392.0, "vol": 0.3, "attack": 0.02, "decay": 0.7},
}

var _players: Array[AudioStreamPlayer] = []
var _next := 0
var _streams := {}
var _last_play := {}
var _music_player: AudioStreamPlayer
var _music_cache := {}
var _current_track := ""
var _cosmetic_rng := RandomNumberGenerator.new()
var build_ms := 0
## La música se sintetiza en hilos de trabajo para no provocar tirones.
const MUSIC_TRACKS := ["menu", "floor", "boss"]
var _music_mutex := Mutex.new()
var _music_tasks := {}
var _pending_track := ""


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	# Cierre de ventana ordenado: detener el audio antes de salir (sin esto, las
	# reproducciones activas quedan retenidas durante el apagado del motor).
	get_tree().set_auto_accept_quit(false)
	Settings.ensure_audio_buses()
	_cosmetic_rng.randomize()
	for i in POOL_SIZE:
		var p := AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		_players.append(p)
	_music_player = AudioStreamPlayer.new()
	_music_player.bus = "Music"
	add_child(_music_player)
	var t0 := Time.get_ticks_msec()
	for sfx_name in SFX:
		_streams[sfx_name] = SfxSynth.render(SFX[sfx_name], sfx_name)
	build_ms = Time.get_ticks_msec() - t0
	for track in MUSIC_TRACKS:
		_music_tasks[track] = WorkerThreadPool.add_task(_render_music_task.bind(track), false, "music:" + track)


func _render_music_task(track: String) -> void:
	var stream := SfxSynth.render_music(track)
	_music_mutex.lock()
	_music_cache[track] = stream
	_music_mutex.unlock()


func _music_ready(track: String) -> AudioStreamWAV:
	_music_mutex.lock()
	var s: AudioStreamWAV = _music_cache.get(track)
	_music_mutex.unlock()
	return s


func _process(_delta: float) -> void:
	if _pending_track != "":
		var s := _music_ready(_pending_track)
		if s != null:
			var t := _pending_track
			_pending_track = ""
			_start_music(t, s)


func has_sound(sfx_name: String) -> bool:
	return _streams.has(sfx_name)


func play(sfx_name: String, volume_db: float = 0.0, pitch: float = 1.0, pitch_var: float = 0.06) -> void:
	if not _streams.has(sfx_name):
		return
	var now := Time.get_ticks_msec()
	if now - int(_last_play.get(sfx_name, -100000)) < MIN_INTERVAL_MS:
		return
	_last_play[sfx_name] = now
	var p := _players[_next]
	_next = (_next + 1) % POOL_SIZE
	p.stream = _streams[sfx_name]
	p.volume_db = volume_db
	p.pitch_scale = maxf(0.05, pitch * (1.0 + _cosmetic_rng.randf_range(-pitch_var, pitch_var)))
	p.play()


func play_music(track: String) -> void:
	if track == _current_track and _music_player.playing:
		return
	var s := _music_ready(track)
	if s == null:
		if not _music_tasks.has(track):
			_music_tasks[track] = WorkerThreadPool.add_task(_render_music_task.bind(track), false, "music:" + track)
		_pending_track = track
		return
	_start_music(track, s)


func _start_music(track: String, s: AudioStreamWAV) -> void:
	_current_track = track
	_music_player.stream = s
	_music_player.volume_db = -4.0
	_music_player.play()


func stop_music() -> void:
	_current_track = ""
	_pending_track = ""
	_music_player.stop()


## Detiene y suelta todas las reproducciones. Llamar antes de salir del juego:
## evita que el AudioServer retenga reproducciones activas durante el cierre.
func stop_all() -> void:
	for p in _players:
		p.stop()
		p.stream = null
	stop_music()
	_music_player.stream = null


## Cierre ordenado: detener audio, esperar un frame de mezcla y salir.
func quit_game(code: int = 0) -> void:
	stop_all()
	await get_tree().process_frame
	# Margen en tiempo REAL para que el hilo de mezcla retire las reproducciones
	# (con --fixed-fps los frames pueden durar microsegundos).
	OS.delay_msec(150)
	await get_tree().process_frame
	get_tree().quit(code)


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		quit_game(0)


func _exit_tree() -> void:
	stop_all()
	for track in _music_tasks:
		WorkerThreadPool.wait_for_task_completion(_music_tasks[track])

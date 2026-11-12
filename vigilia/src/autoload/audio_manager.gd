extends Node
## AudioManager: efectos sintetizados y la NANA (música por capas).
##
## - Pool fijo de reproductores (round-robin): sin crear nodos en caliente.
## - Limitador por sonido (MIN_INTERVAL_MS): cientos de disparos no saturan
##   el mezclador.
## - Variación de tono cosmética con un RNG propio: NO afecta a la simulación.
## - Música (Lullaby): pistas renderizadas en hilos. La pista "nana" son tres
##   capas sincronizadas (pad, caja de música, latido) cuyo volumen sigue a la
##   partida: con poca llama la caja de música sube (el sueño te canta) y el
##   latido solo suena en combate. Ver set_music_param().
## - En modo headless (pruebas, CI) no se renderiza música: nadie la oye.

const POOL_SIZE := 24
const MIN_INTERVAL_MS := 28

## Catálogo de efectos (especificaciones para SfxSynth).
const SFX := {
	"shoot": {"dur": 0.08, "wave": "noise", "vol": 0.13, "attack": 0.004, "decay": 0.028, "lp": 0.22},
	"enemy_shoot": {"dur": 0.12, "wave": "tri", "f0": 520.0, "f1": 260.0, "vol": 0.14, "attack": 0.002, "decay": 0.05, "lp": 0.5},
	"hit": {"dur": 0.06, "wave": "noise", "vol": 0.22, "attack": 0.001, "decay": 0.02, "lp": 0.3},
	"clang": {"dur": 0.22, "partials": [[1.0, 1.0], [3.1, 0.6], [5.7, 0.3]], "f0": 880.0, "vol": 0.18, "attack": 0.001, "decay": 0.06},
	"enemy_die": {"dur": 0.38, "wave": "tri", "f0": 520.0, "f1": 140.0, "vol": 0.2, "attack": 0.004, "decay": 0.13, "noise": 0.55, "lp": 0.22},
	"player_hurt": {"dur": 0.4, "wave": "sine", "f0": 220.0, "f1": 70.0, "vol": 0.4, "attack": 0.003, "decay": 0.15, "noise": 0.25, "lp": 0.3, "vib_f": 18.0, "vib_d": 0.1},
	"explosion": {"dur": 0.55, "wave": "noise", "vol": 0.45, "attack": 0.002, "decay": 0.16, "lp": 0.12},
	"heart": {"dur": 0.45, "partials": [[1.0, 1.0], [2.0, 0.3]], "vol": 0.2, "attack": 0.004, "decay": 0.16, "notes": [[0.0, 587.33], [0.12, 880.0]]},
	"pickup": {"dur": 0.3, "partials": [[1.0, 1.0], [2.0, 0.3]], "vol": 0.18, "attack": 0.003, "decay": 0.1, "notes": [[0.0, 698.46], [0.09, 1046.5]]},
	"item": {"dur": 1.5, "partials": [[1.0, 1.0], [2.0, 0.32], [3.01, 0.13]], "vol": 0.22, "attack": 0.003, "decay": 0.42, "notes": [[0.0, 587.33], [0.15, 698.46], [0.3, 880.0], [0.45, 1174.66]]},
	"synergy": {"dur": 1.6, "partials": [[1.0, 1.0], [1.5, 0.6], [2.0, 0.4], [3.0, 0.2]], "f0": 587.33, "vol": 0.24, "attack": 0.01, "decay": 0.5},
	"door": {"dur": 0.35, "wave": "saw", "f0": 95.0, "f1": 60.0, "vol": 0.18, "lp": 0.08, "noise": 0.3, "decay": 0.12},
	"dodge": {"dur": 0.16, "wave": "noise", "vol": 0.16, "lp": 0.45, "attack": 0.03, "decay": 0.05},
	"graze": {"dur": 0.3, "partials": [[1.0, 1.0], [2.0, 0.5]], "f0": 1568.0, "f1": 2093.0, "vol": 0.14, "attack": 0.003, "decay": 0.1},
	"bell": {"dur": 1.2, "partials": [[1.0, 1.0], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]], "f0": 330.0, "vol": 0.24, "attack": 0.002, "decay": 0.45},
	"roar": {"dur": 1.2, "wave": "saw", "f0": 98.0, "f1": 49.0, "vol": 0.34, "noise": 0.45, "lp": 0.12, "vib_f": 5.0, "vib_d": 0.12, "attack": 0.12, "decay": 0.6},
	"laser": {"dur": 0.5, "wave": "square", "f0": 160.0, "f1": 175.0, "vib_f": 60.0, "vib_d": 0.05, "vol": 0.14, "attack": 0.02, "decay": 0.35, "lp": 0.3},
	"spawn": {"dur": 0.4, "wave": "sine", "f0": 180.0, "f1": 420.0, "vol": 0.1, "noise": 0.3, "lp": 0.2, "attack": 0.05, "decay": 0.14},
	"shock": {"dur": 0.4, "wave": "noise", "vol": 0.3, "lp": 0.6, "attack": 0.001, "decay": 0.1, "notes": [[0.0, 2000.0]]},
	"secret": {"dur": 1.2, "partials": [[1.0, 1.0], [2.0, 0.3], [3.01, 0.12]], "vol": 0.22, "attack": 0.004, "decay": 0.3, "notes": [[0.0, 880.0], [0.16, 698.46], [0.32, 587.33], [0.48, 1174.66]]},
	"pact": {"dur": 0.45, "wave": "saw", "f0": 140.0, "f1": 70.0, "vol": 0.26, "lp": 0.2, "attack": 0.004, "decay": 0.16, "vib_f": 12.0, "vib_d": 0.1},
	"ui_move": {"dur": 0.05, "wave": "sine", "f0": 880.0, "vol": 0.06, "decay": 0.02},
	"ui_select": {"dur": 0.3, "partials": [[1.0, 1.0], [2.0, 0.3]], "f0": 587.33, "vol": 0.14, "attack": 0.003, "decay": 0.12},
	"deny": {"dur": 0.18, "wave": "sine", "f0": 180.0, "f1": 130.0, "vol": 0.16, "decay": 0.07},
	"death": {"dur": 2.2, "wave": "sine", "f0": 330.0, "f1": 55.0, "vol": 0.34, "noise": 0.35, "lp": 0.1, "attack": 0.02, "decay": 0.9, "vib_f": 4.0, "vib_d": 0.05},
	"victory": {"dur": 3.0, "partials": [[1.0, 1.0], [1.26, 0.7], [1.5, 0.6], [2.0, 0.4], [3.0, 0.15]], "f0": 293.66, "vol": 0.3, "attack": 0.4, "decay": 1.4},
	# --- Nuevos: la habitación, las velas, el sueño ---
	"monitor": {"dur": 0.09, "wave": "sine", "f0": 960.0, "vol": 0.12, "attack": 0.003, "decay": 0.05},
	"heartbeat": {"dur": 0.5, "wave": "sine", "vol": 0.55, "attack": 0.004, "decay": 0.06, "lp": 0.5, "notes": [[0.0, 56.0], [0.24, 48.0]]},
	"kindle": {"dur": 0.9, "partials": [[1.0, 1.0], [2.0, 0.3], [3.01, 0.12]], "vol": 0.18, "attack": 0.02, "decay": 0.3, "notes": [[0.0, 440.0], [0.1, 880.0]]},
	"awaken": {"dur": 2.4, "partials": [[1.0, 1.0], [1.26, 0.65], [1.5, 0.55], [2.0, 0.35], [2.52, 0.15]], "f0": 293.66, "vol": 0.22, "attack": 0.25, "decay": 0.9},
	"snuff": {"dur": 0.4, "wave": "noise", "vol": 0.22, "lp": 0.12, "attack": 0.002, "decay": 0.12},
	"dissolve": {"dur": 0.9, "wave": "noise", "vol": 0.16, "lp": 0.35, "attack": 0.05, "decay": 0.3, "vib_f": 9.0, "vib_d": 0.3},
	"whisper": {"dur": 1.1, "wave": "noise", "vol": 0.13, "lp": 0.5, "attack": 0.25, "decay": 0.4, "vib_f": 6.0, "vib_d": 0.4},
}

## Capas de la nana y su volumen (amplitud lineal) según el estado:
## [en calma, con somnolencia máxima]; el latido depende del combate.
const LAYERS := ["pad", "box", "pulse"]
const PAD_GAIN := [0.55, 0.32]
const BOX_GAIN := [0.24, 0.95]
const PULSE_GAIN := [0.0, 0.42]

var _players: Array[AudioStreamPlayer] = []
var _next := 0
var _streams := {}
var _last_play := {}
var _cosmetic_rng := RandomNumberGenerator.new()
var build_ms := 0
var music_enabled := true

var _music: Array[AudioStreamPlayer] = []
var _music_cache := {}
var _music_mutex := Mutex.new()
var _music_tasks := {}
var _current_track := ""
var _pending_track := ""
var _params := {"drowsy": 0.0, "combat": 0.0}
var _gains := [0.0, 0.0, 0.0]
var _fading := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	# Cierre de ventana ordenado: detener el audio antes de salir.
	get_tree().set_auto_accept_quit(false)
	Settings.ensure_audio_buses()
	_cosmetic_rng.randomize()
	music_enabled = DisplayServer.get_name() != "headless"
	for i in POOL_SIZE:
		var p := AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		_players.append(p)
	for i in LAYERS.size():
		var m := AudioStreamPlayer.new()
		m.bus = "Music"
		add_child(m)
		_music.append(m)
	var t0 := Time.get_ticks_msec()
	for sfx_name in SFX:
		_streams[sfx_name] = SfxSynth.render(SFX[sfx_name], sfx_name)
	build_ms = Time.get_ticks_msec() - t0
	if music_enabled:
		for track in ["menu", "nana:pad", "nana:box", "nana:pulse", "boss"]:
			_queue_render(track)


func _queue_render(track: String) -> void:
	if _music_tasks.has(track):
		return
	_music_tasks[track] = WorkerThreadPool.add_task(_render_task.bind(track), false, "music:" + track)


func _render_task(track: String) -> void:
	var stream := Lullaby.render(track)
	_music_mutex.lock()
	_music_cache[track] = stream
	_music_mutex.unlock()


func _cached(track: String) -> AudioStreamWAV:
	_music_mutex.lock()
	var s: AudioStreamWAV = _music_cache.get(track)
	_music_mutex.unlock()
	return s


static func _parts_of(track: String) -> Array:
	if track == "nana":
		return ["nana:pad", "nana:box", "nana:pulse"]
	return [track]


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


# ---------------------------------------------------------------------------
# Música
# ---------------------------------------------------------------------------

func play_music(track: String) -> void:
	if not music_enabled:
		_current_track = track
		return
	if track == _current_track and _music[0].playing and not _fading:
		return
	for part in _parts_of(track):
		_queue_render(part)
	_pending_track = track


## Parámetros de mezcla: "drowsy" (0..1, somnolencia) y "combat" (0/1).
func set_music_param(param: String, value: float) -> void:
	_params[param] = clampf(value, 0.0, 1.0)


func _start_music(track: String) -> void:
	_current_track = track
	_fading = false
	var parts := _parts_of(track)
	for i in _music.size():
		var m := _music[i]
		m.stop()
		m.pitch_scale = 1.0
		if i < parts.size():
			m.stream = _cached(parts[i])
			m.volume_db = -60.0
			_gains[i] = 0.0
		else:
			m.stream = null
	# Las capas arrancan en el mismo frame: quedan sincronizadas.
	for i in parts.size():
		_music[i].play()


func _process(delta: float) -> void:
	if _pending_track != "":
		var ready := true
		for part in _parts_of(_pending_track):
			if _cached(part) == null:
				ready = false
		if ready:
			var t := _pending_track
			_pending_track = ""
			_start_music(t)
	if _current_track == "" or _fading or not music_enabled:
		return
	var targets := [0.7, 0.0, 0.0]
	if _current_track == "nana":
		var dz: float = _params["drowsy"]
		targets = [lerpf(PAD_GAIN[0], PAD_GAIN[1], dz), lerpf(BOX_GAIN[0], BOX_GAIN[1], dz), lerpf(PULSE_GAIN[0], PULSE_GAIN[1], _params["combat"])]
	for i in _music.size():
		if _music[i].stream == null:
			continue
		_gains[i] = move_toward(_gains[i], targets[i], delta * 0.6)
		_music[i].volume_db = linear_to_db(maxf(0.0005, _gains[i]))


func stop_music() -> void:
	_current_track = ""
	_pending_track = ""
	_fading = false
	for m in _music:
		m.stop()


## Apagarse: la nana se ralentiza y baja de tono hasta el silencio.
func music_fall_asleep() -> void:
	if _current_track == "" or not music_enabled:
		return
	_fading = true
	var tw := create_tween()
	tw.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	tw.set_parallel(true)
	for m in _music:
		if m.playing:
			tw.tween_property(m, "pitch_scale", 0.5, 3.0)
			tw.tween_property(m, "volume_db", -50.0, 3.2)
	tw.chain().tween_callback(stop_music)


## Despertar: la nana se corta y suena el acorde mayor.
func music_wake() -> void:
	stop_music()
	play("victory", -2.0, 1.0, 0.0)


## Detiene y suelta todas las reproducciones. Llamar antes de salir del juego.
func stop_all() -> void:
	for p in _players:
		p.stop()
		p.stream = null
	stop_music()
	for m in _music:
		m.stream = null


## Cierre ordenado: detener audio, esperar un frame de mezcla y salir.
func quit_game(code: int = 0) -> void:
	stop_all()
	await get_tree().process_frame
	# Margen en tiempo REAL para que el hilo de mezcla retire las reproducciones.
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

class_name Lullaby
extends RefCounted
## LA NANA: la música de VIGILIA, compuesta y sintetizada por código.
##
## Una canción de cuna original en re menor, 3/4, 66 pulsos por minuto: el mismo
## ritmo que el monitor cardíaco de la habitación. 16 compases (A A' B A''),
## en bucle perfecto (las colas de las notas se pliegan al principio).
##
## Pistas:
##   nana  — en capas que el AudioManager mezcla en vivo:
##           pad    acordes cálidos, bajo y respiración (siempre)
##           box    la melodía en caja de música (más presente cuanto menos llama:
##                  el sueño te canta para que te duermas)
##           pulse  latido y pizzicato (solo en combate)
##   menu  — la habitación: pad suave, la melodía lenta y el pitido del monitor.
##   boss  — la nana deformada: grave, desafinada, con un latido que se acelera.

const RATE := 22050
const BPM := 66.0
const BEATS_PER_BAR := 3
const BARS := 16

## Melodía: [compás, pulso de inicio, duración en pulsos, nota MIDI].
const MELODY := [
	[0, 0, 2, 69], [0, 2, 1, 65],
	[1, 0, 1, 67], [1, 1, 1, 65], [1, 2, 1, 64],
	[2, 0, 2, 65], [2, 2, 1, 62],
	[3, 0, 3, 64],
	[4, 0, 2, 69], [4, 2, 1, 65],
	[5, 0, 1, 67], [5, 1, 1, 69], [5, 2, 1, 70],
	[6, 0, 2, 69], [6, 2, 1, 67],
	[7, 0, 3, 65],
	[8, 0, 2, 72], [8, 2, 1, 69],
	[9, 0, 1, 70], [9, 1, 1, 69], [9, 2, 1, 67],
	[10, 0, 2, 69], [10, 2, 1, 65],
	[11, 0, 3, 67],
	[12, 0, 2, 69], [12, 2, 1, 65],
	[13, 0, 1, 67], [13, 1, 1, 65], [13, 2, 1, 64],
	[14, 0, 1, 65], [14, 1, 1, 64], [14, 2, 1, 61],
	[15, 0, 3, 62],
]

## Acorde por compás: [bajo, voces del pad...] (MIDI).
const CHORDS := [
	[38, 50, 53, 57], [36, 52, 55, 60], [38, 53, 57, 62], [33, 52, 57, 61],
	[38, 53, 57, 62], [43, 50, 55, 58], [38, 50, 53, 57], [38, 50, 53, 57],
	[41, 53, 57, 60], [43, 50, 55, 58], [38, 53, 57, 62], [36, 52, 55, 60],
	[38, 53, 57, 62], [36, 52, 55, 60], [33, 52, 55, 61], [38, 50, 53, 57],
]


static func beat_len() -> float:
	return 60.0 / BPM


static func loop_seconds() -> float:
	return beat_len() * BEATS_PER_BAR * BARS


static func midi_hz(m: float) -> float:
	return 440.0 * pow(2.0, (m - 69.0) / 12.0)


## Renderiza una pista ("nana:pad", "nana:box", "nana:pulse", "menu", "boss").
static func render(track: String) -> AudioStreamWAV:
	var n := int(round(loop_seconds() * RATE))
	var buf := PackedFloat32Array()
	buf.resize(n)
	match track:
		"nana:pad":
			_pad(buf, 0.075, 0.0)
			_bass(buf, 0.2)
			_breath(buf, 0.035, "pad")
		"nana:box":
			_melody_box(buf, 12, 0.26, 0.0, 1.0)
		"nana:pulse":
			_heartbeat(buf, 0.5, false)
			_pizzicato(buf, 0.1)
		"menu":
			_pad(buf, 0.06, 0.0)
			_bass(buf, 0.12)
			_breath(buf, 0.03, "menu")
			_melody_box(buf, 12, 0.18, 0.0, 1.0, 8)
			_monitor(buf, 0.05)
		"boss":
			_pad(buf, 0.06, 1.0)
			_bass(buf, 0.24)
			_melody_box(buf, 0, 0.22, 0.012, 1.25)
			_heartbeat(buf, 0.62, true)
			_breath(buf, 0.05, "boss")
	return _to_wav(buf)


# ---------------------------------------------------------------------------
# Instrumentos (todo se suma en un búfer circular: las colas cruzan el final)
# ---------------------------------------------------------------------------

## Caja de música: parciales casi armónicos con caída rápida y una pizca de
## desafinación (en el jefe, una segunda voz que "bate" y lo vuelve inquietante).
static func _melody_box(buf: PackedFloat32Array, transpose: int, vol: float, detune: float, decay_mult: float, bars_limit: int = BARS) -> void:
	var b := beat_len()
	for note in MELODY:
		if int(note[0]) >= bars_limit:
			continue
		var start := (float(note[0]) * BEATS_PER_BAR + float(note[1])) * b
		var f := midi_hz(float(note[3]) + transpose)
		var dur := maxf(1.6, float(note[2]) * b * 1.4) * decay_mult
		_box_note(buf, start, f, dur, vol)
		if detune > 0.0:
			_box_note(buf, start, f * (1.0 + detune), dur, vol * 0.6)


static func _box_note(buf: PackedFloat32Array, start: float, f: float, dur: float, vol: float) -> void:
	var n := buf.size()
	var i0 := int(start * RATE)
	var len := int(dur * RATE)
	var tau := dur * 0.42 * RATE
	# Cuatro parciales casi armónicos; los agudos se apagan antes (caída por muestra).
	var a1 := 1.0
	var a2 := 0.32
	var a3 := 0.13
	var a4 := 0.06
	var d1 := exp(-1.0 / tau)
	var d2 := exp(-1.0 / (tau * 0.55))
	var d3 := exp(-1.0 / (tau * 0.35))
	var d4 := exp(-1.0 / (tau * 0.22))
	var w := TAU * f / RATE
	var attack := 0.004 * RATE
	var release := 0.05 * RATE
	for k in len:
		var ph := w * k
		var s := sin(ph) * a1 + sin(ph * 2.0) * a2 + sin(ph * 3.01) * a3 + sin(ph * 4.2) * a4
		a1 *= d1
		a2 *= d2
		a3 *= d3
		a4 *= d4
		var env := minf(1.0, k / attack)
		var tail := len - k
		if tail < release:
			env *= tail / release
		buf[(i0 + k) % n] += s * env * vol


## Pad: tres voces por compás con fundido cruzado. `sour` añade una segunda
## menor por encima de la fundamental (disonancia del jefe).
static func _pad(buf: PackedFloat32Array, vol: float, sour: float) -> void:
	var n := buf.size()
	var bar := beat_len() * BEATS_PER_BAR
	var fade := 0.55
	for bi in BARS:
		var chord: Array = CHORDS[bi]
		var voices: Array = chord.slice(1)
		if sour > 0.0:
			voices.append(int(chord[1]) + 1)
		var i0 := int((bi * bar - fade * 0.5) * RATE)
		var len := int((bar + fade) * RATE)
		for vi in voices.size():
			var f := midi_hz(float(voices[vi]))
			var v := vol * (0.55 if vi >= 3 else 1.0)
			var ph := float(bi * 7 + vi) * 0.37
			for k in len:
				var t := float(k) / RATE
				var env := 1.0
				if t < fade:
					env = t / fade
				elif t > bar:
					env = maxf(0.0, 1.0 - (t - bar) / fade)
				var lfo := 0.85 + 0.15 * sin(TAU * 0.21 * (t + bi * bar) + vi)
				var s := sin(TAU * f * t + ph) + 0.35 * sin(TAU * f * 2.003 * t) + 0.12 * sin(TAU * f * 2.997 * t + ph)
				var idx := posmod(i0 + k, n)
				buf[idx] += s * env * v * lfo


static func _bass(buf: PackedFloat32Array, vol: float) -> void:
	var n := buf.size()
	var bar := beat_len() * BEATS_PER_BAR
	for bi in BARS:
		var f := midi_hz(float(CHORDS[bi][0]))
		var i0 := int(bi * bar * RATE)
		var len := int(bar * 1.3 * RATE)
		for k in len:
			var t := float(k) / RATE
			var env := minf(1.0, t / 0.012) * exp(-t / 1.4)
			var s := sin(TAU * f * t) + 0.25 * sin(TAU * f * 2.0 * t)
			buf[(i0 + k) % n] += s * env * vol


## Latido: "lub-dub" en cada pulso, más fuerte en el primero del compás.
## `urgent` duplica el ritmo (el corazón se acelera ante el jefe).
static func _heartbeat(buf: PackedFloat32Array, vol: float, urgent: bool) -> void:
	var n := buf.size()
	var b := beat_len() * (0.5 if urgent else 1.0)
	var beats := int(round(loop_seconds() / b))
	for i in beats:
		var accent := 1.0 if i % (BEATS_PER_BAR * (2 if urgent else 1)) == 0 else 0.6
		for hit in [[0.0, 56.0, 1.0], [0.24, 48.0, 0.7]]:
			var i0 := int((i * b + float(hit[0])) * RATE)
			var len := int(0.16 * RATE)
			for k in len:
				var t := float(k) / RATE
				var env := minf(1.0, t / 0.004) * exp(-t / 0.05)
				buf[(i0 + k) % n] += sin(TAU * float(hit[1]) * t) * env * vol * accent * float(hit[2])


## Pizzicato suave: las notas del acorde en los pulsos 2 y 3, una octava arriba.
static func _pizzicato(buf: PackedFloat32Array, vol: float) -> void:
	var n := buf.size()
	var b := beat_len()
	for bi in BARS:
		var chord: Array = CHORDS[bi]
		for beat in [1, 2]:
			var f := midi_hz(float(chord[beat + 1]) + 12.0)
			var i0 := int((bi * BEATS_PER_BAR + beat) * b * RATE)
			var len := int(0.35 * RATE)
			for k in len:
				var t := float(k) / RATE
				var ph := fmod(f * t, 1.0)
				var tri := 4.0 * absf(ph - 0.5) - 1.0
				buf[(i0 + k) % n] += tri * minf(1.0, t / 0.003) * exp(-t / 0.09) * vol


## Respiración: ruido filtrado que crece y mengua muy despacio.
static func _breath(buf: PackedFloat32Array, vol: float, seed_text: String) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = SeedUtil.fnv1a32("breath:" + seed_text)
	var y := 0.0
	var n := buf.size()
	for i in n:
		y += 0.015 * ((rng.randf() * 2.0 - 1.0) - y)
		var t := float(i) / RATE
		var swell := 0.5 + 0.5 * sin(TAU * t / (beat_len() * BEATS_PER_BAR * 2.0))
		buf[i] += y * vol * 6.0 * swell


## El monitor de la habitación: un pitido por pulso.
static func _monitor(buf: PackedFloat32Array, vol: float) -> void:
	var n := buf.size()
	var b := beat_len()
	var beats := BARS * BEATS_PER_BAR
	for i in beats:
		var i0 := int(i * b * RATE)
		var len := int(0.08 * RATE)
		for k in len:
			var t := float(k) / RATE
			var env := minf(1.0, t / 0.003) * minf(1.0, (0.08 - t) / 0.01)
			buf[(i0 + k) % n] += sin(TAU * 960.0 * t) * env * vol


static func _to_wav(buf: PackedFloat32Array) -> AudioStreamWAV:
	var peak := 0.0001
	for v in buf:
		peak = maxf(peak, absf(v))
	var gain := minf(1.0, 0.9 / peak)
	var data := PackedByteArray()
	data.resize(buf.size() * 2)
	for i in buf.size():
		data.encode_s16(i * 2, int(clampf(buf[i] * gain, -1.0, 1.0) * 32767.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = RATE
	w.stereo = false
	w.data = data
	w.loop_mode = AudioStreamWAV.LOOP_FORWARD
	w.loop_begin = 0
	w.loop_end = buf.size()
	return w

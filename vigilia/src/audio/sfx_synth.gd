class_name SfxSynth
extends RefCounted
## Sintetizador procedural de efectos y música (PCM 16 bits mono).
##
## Los efectos se generan aquí a partir de especificaciones declarativas (la
## música vive en Lullaby): no hay archivos de audio externos ni licencias.
## La aleatoriedad (ruido) usa una semilla fija por sonido: el resultado es
## idéntico en cada arranque.
##
## Especificación de un efecto (todas las claves son opcionales salvo dur):
##   dur        duración en segundos
##   wave       "sine" | "square" | "saw" | "tri" | "noise"
##   f0, f1     frecuencia inicial/final (barrido exponencial)
##   vol        volumen 0..1
##   attack     segundos de ataque lineal
##   decay      constante de tiempo (s) de la caída exponencial
##   noise      mezcla de ruido 0..1
##   lp         coeficiente de filtro paso bajo de un polo (0..1; 1 = sin filtro)
##   duty       ciclo de trabajo de la onda cuadrada
##   vib_f/vib_d  vibrato (Hz / profundidad relativa)
##   partials   [[ratio, amp], ...] para sonidos de campana (inarmónicos)
##   notes      [[t_inicio, freq], ...] arpegio con reataque de envolvente

const RATE := 22050


static func render(spec: Dictionary, seed_text: String = "") -> AudioStreamWAV:
	var dur := maxf(0.01, float(spec.get("dur", 0.1)))
	var n := int(dur * RATE)
	var data := PackedByteArray()
	data.resize(n * 2)
	var wave := str(spec.get("wave", "sine"))
	var f0 := float(spec.get("f0", 440.0))
	var f1 := float(spec.get("f1", f0))
	var vol := float(spec.get("vol", 0.3))
	var attack := maxf(0.0005, float(spec.get("attack", 0.003)))
	var decay := maxf(0.001, float(spec.get("decay", dur * 0.4)))
	var noise_mix := clampf(float(spec.get("noise", 0.0)), 0.0, 1.0)
	var lp := clampf(float(spec.get("lp", 1.0)), 0.001, 1.0)
	var duty := clampf(float(spec.get("duty", 0.5)), 0.05, 0.95)
	var vib_f := float(spec.get("vib_f", 0.0))
	var vib_d := float(spec.get("vib_d", 0.0))
	var partials: Array = spec.get("partials", [])
	var notes: Array = spec.get("notes", [])
	var rng := RandomNumberGenerator.new()
	rng.seed = SeedUtil.fnv1a32("sfx:" + seed_text)
	var phase := 0.0
	var pphases: Array = []
	for _p in partials:
		pphases.append(0.0)
	var y := 0.0
	var sweep := f1 / f0 if f0 > 0.0 and f1 > 0.0 else 1.0
	var note_idx := 0
	for i in n:
		var t := float(i) / RATE
		var k := t / dur
		var f := f0 * pow(sweep, k)
		var env_t := t
		if not notes.is_empty():
			while note_idx + 1 < notes.size() and t >= float(notes[note_idx + 1][0]):
				note_idx += 1
			f = float(notes[note_idx][1])
			env_t = t - float(notes[note_idx][0])
		if vib_f > 0.0:
			f *= 1.0 + vib_d * sin(TAU * vib_f * t)
		var s := 0.0
		if partials.is_empty():
			phase += f / RATE
			phase -= floorf(phase)
			s = _osc(wave, phase, duty, rng)
		else:
			for j in partials.size():
				var pr: Array = partials[j]
				var ph: float = pphases[j] + f * float(pr[0]) / RATE
				ph -= floorf(ph)
				pphases[j] = ph
				s += sin(TAU * ph) * float(pr[1])
			s *= 0.6
		if noise_mix > 0.0:
			s = lerpf(s, rng.randf() * 2.0 - 1.0, noise_mix)
		y += lp * (s - y)
		var env := 1.0
		if env_t < attack:
			env = env_t / attack
		else:
			env = exp(-(env_t - attack) / decay)
		var tail := dur - t
		if tail < 0.006:
			env *= tail / 0.006
		var v := clampf(y * env * vol, -1.0, 1.0)
		data.encode_s16(i * 2, int(v * 32767.0))
	return _make_wav(data, RATE, false)


static func _osc(wave: String, phase: float, duty: float, rng: RandomNumberGenerator) -> float:
	match wave:
		"square":
			return 1.0 if phase < duty else -1.0
		"saw":
			return phase * 2.0 - 1.0
		"tri":
			return 4.0 * absf(phase - 0.5) - 1.0
		"noise":
			return rng.randf() * 2.0 - 1.0
		_:
			return sin(TAU * phase)


static func _make_wav(data: PackedByteArray, rate: int, loop: bool) -> AudioStreamWAV:
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = rate
	w.stereo = false
	w.data = data
	if loop:
		w.loop_mode = AudioStreamWAV.LOOP_FORWARD
		w.loop_begin = 0
		w.loop_end = data.size() / 2
	return w

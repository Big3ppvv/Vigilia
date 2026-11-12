class_name DreamVeil
extends ColorRect
## Velo del sueño: la viñeta de siempre y, cuando la llama se apaga, la
## SOMNOLENCIA: la imagen se desatura, se desenfoca, ondula y el borde se cierra
## como unos párpados. Un golpe la oscurece un instante (sustituye al destello
## rojo). Escalado por "Intensidad de luz y penumbra"; el alto contraste lo
## suaviza y sin destellos no ondula.

const SHADER := """
shader_type canvas_item;
uniform sampler2D screen_tex : hint_screen_texture, filter_linear;
uniform float drowsy = 0.0;
uniform float pulse = 0.0;
uniform float time_s = 0.0;
uniform float wobble = 1.0;
uniform float base_vignette = 0.5;

vec3 blurred(vec2 uv, float r) {
	vec3 c = texture(screen_tex, uv).rgb * 0.36;
	c += texture(screen_tex, uv + vec2(r, 0.0)).rgb * 0.16;
	c += texture(screen_tex, uv - vec2(r, 0.0)).rgb * 0.16;
	c += texture(screen_tex, uv + vec2(0.0, r * 1.6)).rgb * 0.16;
	c += texture(screen_tex, uv - vec2(0.0, r * 1.6)).rgb * 0.16;
	return c;
}

void fragment() {
	vec2 uv = SCREEN_UV;
	uv += vec2(sin(uv.y * 13.0 + time_s * 1.1), cos(uv.x * 9.0 + time_s * 0.9)) * 0.0022 * drowsy * wobble;
	vec3 col = blurred(uv, 0.0024 * drowsy);
	float gray = dot(col, vec3(0.3, 0.59, 0.11));
	col = mix(col, vec3(gray) * vec3(0.86, 0.86, 1.04), drowsy * 0.5);
	vec2 c = UV - vec2(0.5);
	c.x *= 1.45;
	float d = length(c);
	float inner = mix(0.36, 0.17, drowsy);
	float outer = mix(0.88, 0.7, drowsy);
	float v = smoothstep(inner, outer, d) * mix(base_vignette, 0.9, drowsy);
	col *= 1.0 - v;
	col = mix(col, col * vec3(0.5, 0.56, 0.78), pulse * 0.65);
	COLOR = vec4(col, 1.0);
}
"""

var game: Node
var drowsy := 0.0
var _pulse := 0.0
var _t := 0.0
var _mat: ShaderMaterial


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mat = ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = SHADER
	_mat.shader = sh
	material = _mat


## Golpe recibido: la imagen se oscurece y enfría un instante.
func hurt_pulse() -> void:
	if Settings.flashes:
		_pulse = 1.0
	else:
		_pulse = 0.5


## Somnolencia objetivo según la llama: nada por encima de la mitad; plena con 1.
static func target_for(ratio: float, hp: int, alive: bool) -> float:
	if not alive:
		return 1.0
	var t := clampf((0.55 - ratio) / 0.42, 0.0, 1.0)
	if hp <= 1:
		t = maxf(t, 0.85)
	return t


func _process(delta: float) -> void:
	_t += delta
	var target := 0.0
	if game != null and game.player != null:
		var pl: Player = game.player
		target = target_for(pl.flame_ratio(), pl.hp, pl.alive)
	drowsy = move_toward(drowsy, target, delta * 0.7)
	_pulse = maxf(0.0, _pulse - delta * 2.4)
	var strength := float(Settings.get_value("video/lighting_strength"))
	if Settings.high_contrast:
		strength *= 0.5
	_mat.set_shader_parameter("drowsy", drowsy * clampf(strength * 1.15, 0.0, 1.0))
	_mat.set_shader_parameter("pulse", _pulse * clampf(strength + 0.3, 0.0, 1.0))
	_mat.set_shader_parameter("time_s", _t)
	_mat.set_shader_parameter("wobble", 1.0 if Settings.flashes else 0.0)
	_mat.set_shader_parameter("base_vignette", 0.5 * clampf(strength + 0.2, 0.0, 1.0))

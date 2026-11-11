class_name Palette
extends RefCounted
## Paleta canónica de VIGILIA. Estética: cera, penumbra, carne y luz de vela.
## Centralizar los colores permite modos de accesibilidad (alto contraste) sin
## tocar cada entidad.

const VOID := Color("0b0710")
const FLOOR_A := Color("251a29")
const FLOOR_B := Color("2a1f2e")
const FLOOR_LINE := Color("34273b")
const WALL := Color("3a2830")
const WALL_TOP := Color("4f3740")
const WALL_DARK := Color("24171d")
const WAX := Color("e8d9a8")
const WAX_DARK := Color("b59e6a")
const WAX_SHADOW := Color("6e5c3a")
const FLAME := Color("ffb347")
const FLAME_CORE := Color("fff1c1")
const FLAME_BLUE := Color("9fd8ff")
const BLOOD := Color("b3243b")
const BLOOD_DARK := Color("6b1424")
const BILE := Color("8fbf3a")
const FROST := Color("8fd3ff")
const BONE := Color("efe6d8")
const GOLD := Color("d9a441")
const BRONZE := Color("a8743a")
const ALLY := Color("7fffd4")
const SHADOW := Color(0, 0, 0, 0.35)

const PLAYER_BODY := Color("15101a")
const PLAYER_EDGE := Color("6a4b58")
const PLAYER_EYE := Color("ffd27a")
const PLAYER_SHOT := Color("f2e3c6")
const ENEMY_SHOT := Color("ff5a3c")
const ENEMY_SHOT_CORE := Color("ffe0c0")

const UI_BG := Color(0.07, 0.05, 0.09, 0.94)
const UI_PANEL := Color(0.11, 0.08, 0.13, 0.96)
const UI_BORDER := Color("6e5466")
const UI_TEXT := Color("efe6d8")
const UI_DIM := Color("9c8d97")
const UI_ACCENT := Color("ffd27a")
const UI_DANGER := Color("ff5a5a")
const UI_GOOD := Color("8fd36b")

const RARITY := {
	"common": Color("c9c1b6"),
	"uncommon": Color("8fd36b"),
	"rare": Color("6fb6ff"),
	"cursed": Color("d26bff"),
	"legendary": Color("ffcc4d"),
}

const RARITY_LABEL := {
	"common": "Común",
	"uncommon": "Poco común",
	"rare": "Rara",
	"cursed": "Maldita",
	"legendary": "Legendaria",
}


static func rarity_color(r: String) -> Color:
	return RARITY.get(r, Color.WHITE)


static func rarity_label(r: String) -> String:
	return str(RARITY_LABEL.get(r, r))


## Convierte "#rrggbb" o "rrggbb" en Color con respaldo seguro.
static func parse(hex: Variant, fallback: Color = Color.WHITE) -> Color:
	if typeof(hex) != TYPE_STRING:
		return fallback
	var s := str(hex).strip_edges()
	if s.is_empty():
		return fallback
	if not Color.html_is_valid(s):
		return fallback
	return Color.html(s)

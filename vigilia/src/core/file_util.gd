class_name FileUtil
extends RefCounted
## Utilidades de E/S seguras.
##
## atomic_write_text(): escribe en "<ruta>.tmp", verifica releyendo, copia el
## archivo vigente a "<ruta>.bak" y solo entonces sustituye. Si el proceso muere a
## mitad, queda o el archivo anterior o su copia .bak: nunca un archivo truncado
## como única versión.


static func atomic_write_text(path: String, text: String, keep_backup: bool = true) -> bool:
	var tmp := path + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		push_error("FileUtil: no se pudo abrir '%s' (%s)" % [tmp, error_string(FileAccess.get_open_error())])
		return false
	f.store_string(text)
	f.close()
	if FileAccess.get_file_as_string(tmp) != text:
		push_error("FileUtil: verificación fallida al escribir '%s'" % tmp)
		return false
	var dir := DirAccess.open(path.get_base_dir())
	if dir == null:
		push_error("FileUtil: no se pudo abrir el directorio de '%s'" % path)
		return false
	if FileAccess.file_exists(path):
		if keep_backup:
			var cerr := dir.copy(path, path + ".bak")
			if cerr != OK:
				push_warning("FileUtil: no se pudo crear copia de seguridad de '%s' (%s)" % [path, error_string(cerr)])
		dir.remove(path)
	var err := dir.rename(tmp, path)
	if err != OK:
		push_error("FileUtil: no se pudo renombrar '%s' -> '%s' (%s)" % [tmp, path, error_string(err)])
		return false
	return true


static func read_text(path: String) -> String:
	if not FileAccess.file_exists(path):
		return ""
	return FileAccess.get_file_as_string(path)


## Lee y parsea JSON. Devuelve null si no existe o está dañado.
static func read_json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		return null
	var text := FileAccess.get_file_as_string(path)
	if text.strip_edges().is_empty():
		return null
	var json := JSON.new()
	if json.parse(text) != OK:
		return null
	return json.data


static func remove_file(path: String) -> void:
	if FileAccess.file_exists(path):
		var dir := DirAccess.open(path.get_base_dir())
		if dir != null:
			dir.remove(path)

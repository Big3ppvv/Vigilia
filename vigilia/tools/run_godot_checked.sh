#!/usr/bin/env bash
# Conserva la salida/código del motor y rechaza errores de script con salida 0.
# --check-import también rechaza ERROR: durante la importación del proyecto.
set -euo pipefail
GODOT="${GODOT:-godot}"
error_pattern='SCRIPT ERROR:'
if [[ "${1:-}" == "--check-import" ]]; then
  error_pattern='SCRIPT ERROR:|ERROR:'
  shift
fi
run_log="$(mktemp)"
trap 'rm -f "$run_log"' EXIT

set +e
"$GODOT" "$@" 2>&1 | tee "$run_log"
run_status=("${PIPESTATUS[@]}")
set -e
if [[ "${run_status[0]}" -ne 0 ]]; then
  exit "${run_status[0]}"
fi
if [[ "${run_status[1]}" -ne 0 ]]; then
  exit "${run_status[1]}"
fi
if grep -Eq "$error_pattern" "$run_log"; then
  echo "Godot registró errores durante la ejecución." >&2
  exit 1
fi

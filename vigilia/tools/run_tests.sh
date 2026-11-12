#!/usr/bin/env bash
# Ejecuta las pruebas automáticas (headless). Uso: tools/run_tests.sh [filtro]
# Variable GODOT para usar otro binario (por defecto: godot en el PATH).
set -euo pipefail
cd "$(dirname "$0")/.."
bash tools/import_project.sh
test_args=()
if [[ -n "${1:-}" ]]; then
  test_args+=("--filter=$1")
fi
bash tools/run_godot_checked.sh --headless --fixed-fps 60 --path . res://tests/test_runner.tscn -- "${test_args[@]}"

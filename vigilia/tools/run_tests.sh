#!/usr/bin/env bash
# Ejecuta las pruebas automáticas (headless). Uso: tools/run_tests.sh [filtro]
# Variable GODOT para usar otro binario (por defecto: godot en el PATH).
set -euo pipefail
cd "$(dirname "$0")/.."
GODOT="${GODOT:-godot}"
"$GODOT" --headless --path . --import >/dev/null 2>&1 || true
"$GODOT" --headless --fixed-fps 60 --path . res://tests/test_runner.tscn -- ${1:+--filter=$1}

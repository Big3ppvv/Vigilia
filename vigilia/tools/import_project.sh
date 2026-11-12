#!/usr/bin/env bash
# Genera la caché de clases y falla también si Godot registra errores con salida 0.
set -euo pipefail
cd "$(dirname "$0")/.."
bash tools/run_godot_checked.sh --check-import --headless --path . --import

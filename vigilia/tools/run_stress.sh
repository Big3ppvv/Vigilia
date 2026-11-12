#!/usr/bin/env bash
# Prueba de estrés de la simulación (horda + lluvia de proyectiles).
set -euo pipefail
cd "$(dirname "$0")/.."
bash tools/run_godot_checked.sh --headless --fixed-fps 60 --path . res://tests/stress/stress_test.tscn

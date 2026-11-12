#!/usr/bin/env bash
# Partida completa con piloto automático. Uso: tools/run_smoke.sh SEMILLA [--god] [--trace] [--boss-only]
set -euo pipefail
cd "$(dirname "$0")/.."
SEED="${1:-SMOKE001}"; shift || true
bash tools/run_godot_checked.sh --headless --fixed-fps 60 --path . res://tests/smoke/smoke_run.tscn -- --seed="$SEED" --minutes=25 "$@"

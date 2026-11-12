#!/usr/bin/env bash
# Capturas reales con render. En Linux sin pantalla usa Xvfb (xvfb-run).
set -euo pipefail
cd "$(dirname "$0")/.."
GODOT="${GODOT:-godot}"
if command -v xvfb-run >/dev/null && [ -z "${DISPLAY:-}" ]; then
  xvfb-run -a -s "-screen 0 1280x720x24" "$GODOT" --path . --rendering-driver opengl3 res://tools/screenshot_tour.tscn
else
  "$GODOT" --path . res://tools/screenshot_tour.tscn
fi

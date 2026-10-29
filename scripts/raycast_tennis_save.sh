#!/bin/bash

# Raycast Script Command Specification:
# @raycast.schemaVersion 1
# @raycast.title [Tennis] Сохранить из буфера (save)
# @raycast.mode silent
# @raycast.packageName Теннисный полигон
# @raycast.icon 🎾

BASE_DIR="$HOME/tennis-pro"
cd "$BASE_DIR" || exit 1

/usr/bin/python3 "$BASE_DIR/scripts/save_clip.py"